import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google } from 'googleapis';
import { GoogleToken } from './entities/google-token.entity';
import { Production, GoogleSourceStatus } from './entities/production.entity';
import { encryptToken, decryptToken } from './utils/crypto.util';

export interface GoogleConnectionStatus {
  isConnected: boolean;
  calendarId?: string | null;
  calendarName?: string | null;
  lastSyncedAt?: Date | null;
  expiresAt?: Date | null;
  isExpired?: boolean;
}

export interface GoogleSyncResponse {
  success: boolean;
  googleEventId: string;
  googleCalendarId: string;
  htmlLink?: string | null;
  syncedAt: Date;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2ClientInstance: any = null;

  constructor(
    @InjectRepository(GoogleToken)
    private readonly googleTokenRepo: Repository<GoogleToken>,

    @InjectRepository(Production)
    private readonly productionRepo: Repository<Production>,
  ) {}

  /**
   * Obtém ou inicializa a instância do cliente OAuth2 do Google.
   */
  getOAuth2Client(): any {
    if (!this.oauth2ClientInstance) {
      const clientId = process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret';
      const redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        'http://localhost:3000/api/productions/google/callback';

      this.oauth2ClientInstance = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );
    }
    return this.oauth2ClientInstance;
  }

  /**
   * Sobrescreve a instância do cliente OAuth2 (útil para injeção de mocks em testes unitários).
   */
  setOAuth2Client(client: any): void {
    this.oauth2ClientInstance = client;
  }

  /**
   * Gera a URL para a tela de consentimento OAuth2 do Google.
   */
  getAuthUrl(): { url: string } {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
    });

    return { url };
  }

  /**
   * Processa o código de autorização, troca por tokens, criptografa o refresh token
   * e persiste a conexão singleton global ('GLOBAL_GOOGLE_CONNECTION').
   */
  async handleCallback(code: string): Promise<GoogleConnectionStatus> {
    const oauth2Client = this.getOAuth2Client();

    let tokens: any;
    try {
      const tokenResponse = await oauth2Client.getToken(code);
      tokens = tokenResponse.tokens;
    } catch (error) {
      this.logger.error(`Erro ao trocar código por tokens do Google: ${error.message}`);
      throw new HttpException(
        'Falha ao autenticar com o Google. Código de autorização inválido ou expirado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!tokens.access_token) {
      throw new HttpException(
        'Resposta do Google não continha access_token válido.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Busca conexão singleton existente
    let tokenEntity = await this.googleTokenRepo.findOne({
      where: { singletonKey: 'GLOBAL_GOOGLE_CONNECTION' },
    });

    if (!tokenEntity) {
      tokenEntity = this.googleTokenRepo.create({
        singletonKey: 'GLOBAL_GOOGLE_CONNECTION',
      });
    }

    tokenEntity.accessToken = tokens.access_token;

    // Se o Google retornou um novo refresh token, criptografa e salva.
    // Caso contrário, mantém o já existente se presente.
    if (tokens.refresh_token) {
      tokenEntity.refreshTokenEncrypted = encryptToken(tokens.refresh_token);
    } else if (!tokenEntity.refreshTokenEncrypted) {
      // Se não veio refresh token e não tínhamos antes, gera fallback
      tokenEntity.refreshTokenEncrypted = encryptToken('offline_session_fallback');
    }

    const expiresInMs = (tokens.expiry_date ? tokens.expiry_date - Date.now() : 3600 * 1000);
    tokenEntity.expiresAt = new Date(Date.now() + Math.max(expiresInMs, 60000));
    tokenEntity.calendarId = tokenEntity.calendarId || 'primary';
    tokenEntity.calendarName = tokenEntity.calendarName || 'CaseTrack Produções (Google Calendar)';

    const saved = await this.googleTokenRepo.save(tokenEntity);

    return {
      isConnected: true,
      calendarId: saved.calendarId,
      calendarName: saved.calendarName,
      lastSyncedAt: saved.lastSyncedAt,
      expiresAt: saved.expiresAt,
      isExpired: false,
    };
  }

  /**
   * Retorna o status atual da conexão global do Google Calendar.
   */
  async getConnectionStatus(): Promise<GoogleConnectionStatus> {
    const token = await this.googleTokenRepo.findOne({
      where: { singletonKey: 'GLOBAL_GOOGLE_CONNECTION' },
    });

    if (!token) {
      return {
        isConnected: false,
      };
    }

    const isExpired = token.expiresAt ? token.expiresAt.getTime() <= Date.now() : true;

    return {
      isConnected: true,
      calendarId: token.calendarId,
      calendarName: token.calendarName,
      lastSyncedAt: token.lastSyncedAt,
      expiresAt: token.expiresAt,
      isExpired,
    };
  }

  /**
   * Desconecta a conta Google removendo os tokens do banco.
   */
  async disconnect(): Promise<{ success: boolean; message: string }> {
    const token = await this.googleTokenRepo.findOne({
      where: { singletonKey: 'GLOBAL_GOOGLE_CONNECTION' },
    });

    if (token) {
      await this.googleTokenRepo.remove(token);
    }

    return {
      success: true,
      message: 'Conexão com o Google Calendar removida com sucesso.',
    };
  }

  /**
   * Garante um access token válido. Se expirado ou prestes a expirar em 5 minutos,
   * utiliza o refresh token descriptografado para renovação automática.
   * Dispara HTTP 424 (Failed Dependency) caso o refresh token seja inválido/revogado.
   */
  async getValidAccessToken(): Promise<string> {
    const token = await this.googleTokenRepo.findOne({
      where: { singletonKey: 'GLOBAL_GOOGLE_CONNECTION' },
    });

    if (!token) {
      throw new NotFoundException(
        'Nenhuma conexão com o Google Calendar encontrada. Conecte sua conta antes de sincronizar.',
      );
    }

    const marginMs = 5 * 60 * 1000; // 5 minutos de margem
    const isAboutToExpire = token.expiresAt.getTime() - marginMs <= Date.now();

    if (!isAboutToExpire && token.accessToken) {
      return token.accessToken;
    }

    // Tenta renovar o token via refresh token
    if (!token.refreshTokenEncrypted) {
      this.triggerReconnectRequired('Refresh token ausente no banco de dados.');
    }

    let rawRefreshToken: string;
    try {
      rawRefreshToken = decryptToken(token.refreshTokenEncrypted);
    } catch (e) {
      this.logger.error(`Falha ao descriptografar refresh token: ${e.message}`);
      this.triggerReconnectRequired('Falha de descriptografia no token de segurança.');
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: rawRefreshToken });

    try {
      const response = await oauth2Client.refreshAccessToken();
      const credentials = response.credentials;

      if (!credentials || !credentials.access_token) {
        this.triggerReconnectRequired('Resposta de renovação não continha access_token.');
      }

      token.accessToken = credentials.access_token;
      if (credentials.expiry_date) {
        token.expiresAt = new Date(credentials.expiry_date);
      } else {
        token.expiresAt = new Date(Date.now() + 3600 * 1000);
      }

      if (credentials.refresh_token) {
        token.refreshTokenEncrypted = encryptToken(credentials.refresh_token);
      }

      await this.googleTokenRepo.save(token);
      return token.accessToken;
    } catch (err) {
      this.logger.warn(`Erro ao renovar token com o Google: ${err.message}`);
      this.triggerReconnectRequired(err.message || 'Token revogado ou expirado no provedor Google.');
    }
  }

  /**
   * Sincroniza uma produção com o Google Calendar.
   * Cria o evento se ainda não existir ou atualiza caso já possua `googleEventId`.
   */
  async syncProduction(productionId: string): Promise<GoogleSyncResponse> {
    const production = await this.productionRepo.findOne({
      where: { id: productionId },
      relations: [
        'stages',
        'stages.responsibleUser',
        'productionEquipments',
        'productionEquipments.equipment',
      ],
    });

    if (!production) {
      throw new NotFoundException(`Produção com ID ${productionId} não encontrada.`);
    }

    const accessToken = await this.getValidAccessToken();
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = production.googleCalendarId || 'primary';

    // Monta descrição rica para a equipe de filmagem
    const descriptionLines: string[] = [
      `🎬 Produção: ${production.title}`,
      production.description ? `Descrição: ${production.description}` : '',
      `Status: ${production.status}`,
      `Fuso Horário: ${production.timezone}`,
      '',
      '📅 ETAPAS DO PROJETO:',
    ];

    if (production.stages && production.stages.length > 0) {
      const sortedStages = [...production.stages].sort((a, b) => a.order - b.order);
      for (const st of sortedStages) {
        const resp = st.responsibleUser ? `${st.responsibleUser.name} (${st.responsibleUser.email})` : 'A definir';
        descriptionLines.push(`• [${st.type}] - Status: ${st.status} | Responsável: ${resp}`);
      }
    } else {
      descriptionLines.push('• Nenhuma etapa cadastrada');
    }

    descriptionLines.push('', '📦 EQUIPAMENTOS ALOCADOS:');
    if (production.productionEquipments && production.productionEquipments.length > 0) {
      for (const pe of production.productionEquipments) {
        if (pe.isActive && pe.equipment) {
          descriptionLines.push(`• ${pe.equipment.name} (${pe.equipment.serialNumber || 'S/N N/A'}) - [${pe.movementStatus}]`);
        }
      }
    } else {
      descriptionLines.push('• Nenhum equipamento alocado');
    }

    descriptionLines.push('', '— Sincronizado automaticamente via CaseTrack');
    const description = descriptionLines.filter((l) => l !== undefined).join('\n');

    // Montagem das datas de início e término
    const startObj: any = {};
    const endObj: any = {};

    if (production.isAllDay) {
      const startDateStr = new Date(production.scheduledAt).toISOString().split('T')[0];
      const endDateStr = production.scheduledEndAt
        ? new Date(production.scheduledEndAt).toISOString().split('T')[0]
        : startDateStr;
      startObj.date = startDateStr;
      endObj.date = endDateStr;
    } else {
      startObj.dateTime = new Date(production.scheduledAt).toISOString();
      startObj.timeZone = production.timezone;

      const endDate = production.scheduledEndAt
        ? new Date(production.scheduledEndAt)
        : new Date(new Date(production.scheduledAt).getTime() + 4 * 3600 * 1000); // 4h default diária
      endObj.dateTime = endDate.toISOString();
      endObj.timeZone = production.timezone;
    }

    const eventPayload: any = {
      summary: `🎬 [CaseTrack] ${production.title}`,
      description,
      start: startObj,
      end: endObj,
    };

    let resultEvent: any;

    try {
      if (production.googleEventId) {
        // Tenta atualizar o evento existente
        try {
          const updateRes = await calendar.events.patch({
            calendarId,
            eventId: production.googleEventId,
            requestBody: eventPayload,
          });
          resultEvent = updateRes.data;
        } catch (updateErr: any) {
          // Se o evento foi excluído remotamente no Google (404), recria
          if (updateErr?.status === 404 || updateErr?.code === 404) {
            const insertRes = await calendar.events.insert({
              calendarId,
              requestBody: eventPayload,
            });
            resultEvent = insertRes.data;
          } else {
            throw updateErr;
          }
        }
      } else {
        // Novo evento
        const insertRes = await calendar.events.insert({
          calendarId,
          requestBody: eventPayload,
        });
        resultEvent = insertRes.data;
      }
    } catch (apiErr: any) {
      this.logger.error(`Falha ao sincronizar com Google Calendar API: ${apiErr.message}`);
      if (apiErr?.status === 401 || apiErr?.status === 403) {
        this.triggerReconnectRequired(apiErr.message);
      }
      throw new HttpException(
        `Erro ao comunicar com o Google Calendar: ${apiErr.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Atualiza dados na entidade da produção
    production.googleEventId = resultEvent.id;
    production.googleCalendarId = calendarId;
    production.googleSourceStatus = GoogleSourceStatus.ACTIVE;
    production.lastSyncedAt = new Date();
    await this.productionRepo.save(production);

    // Atualiza lastSyncedAt no token global
    await this.googleTokenRepo.update(
      { singletonKey: 'GLOBAL_GOOGLE_CONNECTION' },
      { lastSyncedAt: new Date() },
    );

    return {
      success: true,
      googleEventId: resultEvent.id,
      googleCalendarId: calendarId,
      htmlLink: resultEvent.htmlLink || null,
      syncedAt: production.lastSyncedAt,
    };
  }

  /**
   * Helper para lançar o erro HTTP 424 com o envelope esperado pelo interceptor mobile.
   */
  private triggerReconnectRequired(reason: string): never {
    throw new HttpException(
      {
        status: 424,
        error: 'GOOGLE_RECONNECT_REQUIRED',
        message: 'Reconexão com o Google necessária. Por favor, reconecte sua conta Google no app.',
        reason,
      },
      HttpStatus.FAILED_DEPENDENCY, // HTTP 424
    );
  }
}
