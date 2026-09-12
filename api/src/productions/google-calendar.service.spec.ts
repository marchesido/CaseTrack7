import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleToken } from './entities/google-token.entity';
import { Production, ProductionStatus, GoogleSourceStatus } from './entities/production.entity';
import { encryptToken } from './utils/crypto.util';

// Mock googleapis
jest.mock('googleapis', () => {
  const mCalendar = {
    events: {
      insert: jest.fn(),
      patch: jest.fn(),
    },
  };
  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => ({
          generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?mock=true'),
          getToken: jest.fn(),
          setCredentials: jest.fn(),
          refreshAccessToken: jest.fn(),
        })),
      },
      calendar: jest.fn().mockReturnValue(mCalendar),
    },
  };
});

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let mockGoogleTokenRepo: any;
  let mockProductionRepo: any;
  let mockOAuth2Client: any;

  beforeEach(async () => {
    mockGoogleTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'token-uuid', ...entity })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn().mockResolvedValue(true),
    };

    mockProductionRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        {
          provide: getRepositoryToken(GoogleToken),
          useValue: mockGoogleTokenRepo,
        },
        {
          provide: getRepositoryToken(Production),
          useValue: mockProductionRepo,
        },
      ],
    }).compile();

    service = module.get<GoogleCalendarService>(GoogleCalendarService);

    mockOAuth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?scope=calendar'),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn(),
    };
    service.setOAuth2Client(mockOAuth2Client);
  });

  describe('getAuthUrl', () => {
    it('deve gerar a URL de autorização OAuth2 com os escopos corretos', () => {
      const result = service.getAuthUrl();
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('https://accounts.google.com');
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          prompt: 'consent',
          scope: expect.arrayContaining(['https://www.googleapis.com/auth/calendar']),
        }),
      );
    });
  });

  describe('handleCallback', () => {
    it('deve trocar código por tokens, criptografar o refresh token e persistir', async () => {
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'google-access-token-123',
          refresh_token: 'google-refresh-token-456',
          expiry_date: Date.now() + 3600000,
        },
      });
      mockGoogleTokenRepo.findOne.mockResolvedValue(null);

      const result = await service.handleCallback('valid-auth-code');

      expect(result.isConnected).toBe(true);
      expect(mockGoogleTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          singletonKey: 'GLOBAL_GOOGLE_CONNECTION',
          accessToken: 'google-access-token-123',
          refreshTokenEncrypted: expect.any(String),
        }),
      );
    });

    it('deve lançar BAD_REQUEST se a troca de código falhar no Google', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('invalid_grant'));

      await expect(service.handleCallback('invalid-code')).rejects.toThrow(HttpException);
    });
  });

  describe('getConnectionStatus', () => {
    it('deve retornar isConnected = false quando não houver registro no banco', async () => {
      mockGoogleTokenRepo.findOne.mockResolvedValue(null);

      const status = await service.getConnectionStatus();
      expect(status.isConnected).toBe(false);
    });

    it('deve retornar isConnected = true quando houver token cadastrado', async () => {
      mockGoogleTokenRepo.findOne.mockResolvedValue({
        singletonKey: 'GLOBAL_GOOGLE_CONNECTION',
        calendarId: 'primary',
        calendarName: 'Agenda Principal',
        expiresAt: new Date(Date.now() + 600000),
      });

      const status = await service.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.isExpired).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('deve remover o token global e retornar sucesso', async () => {
      const existingToken = { singletonKey: 'GLOBAL_GOOGLE_CONNECTION' };
      mockGoogleTokenRepo.findOne.mockResolvedValue(existingToken);

      const result = await service.disconnect();
      expect(result.success).toBe(true);
      expect(mockGoogleTokenRepo.remove).toHaveBeenCalledWith(existingToken);
    });
  });

  describe('getValidAccessToken', () => {
    it('deve retornar o accessToken imediatamente se ainda não expirou', async () => {
      mockGoogleTokenRepo.findOne.mockResolvedValue({
        accessToken: 'active-token',
        expiresAt: new Date(Date.now() + 20 * 60 * 1000), // expira em 20 min
      });

      const token = await service.getValidAccessToken();
      expect(token).toBe('active-token');
      expect(mockOAuth2Client.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('deve renovar o token expirado usando o refresh token descriptografado', async () => {
      const encryptedRefresh = encryptToken('my-secret-refresh-token');
      const tokenEntity = {
        accessToken: 'old-token',
        refreshTokenEncrypted: encryptedRefresh,
        expiresAt: new Date(Date.now() - 1000), // expirado
      };
      mockGoogleTokenRepo.findOne.mockResolvedValue(tokenEntity);

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: 'renewed-access-token',
          expiry_date: Date.now() + 3600000,
        },
      });

      const token = await service.getValidAccessToken();
      expect(token).toBe('renewed-access-token');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: 'my-secret-refresh-token',
      });
      expect(mockGoogleTokenRepo.save).toHaveBeenCalled();
    });

    it('deve disparar HTTP 424 (FAILED_DEPENDENCY) quando a renovação falha por revogação', async () => {
      const encryptedRefresh = encryptToken('revoked-refresh-token');
      mockGoogleTokenRepo.findOne.mockResolvedValue({
        accessToken: 'old-token',
        refreshTokenEncrypted: encryptedRefresh,
        expiresAt: new Date(Date.now() - 1000),
      });

      mockOAuth2Client.refreshAccessToken.mockRejectedValue(new Error('invalid_grant: Token has been expired or revoked.'));

      await expect(service.getValidAccessToken()).rejects.toMatchObject({
        status: HttpStatus.FAILED_DEPENDENCY,
        response: expect.objectContaining({
          error: 'GOOGLE_RECONNECT_REQUIRED',
        }),
      });
    });
  });

  describe('syncProduction', () => {
    it('deve lançar NotFoundException se a produção não existir', async () => {
      mockProductionRepo.findOne.mockResolvedValue(null);

      await expect(service.syncProduction('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('deve criar novo evento no Google Calendar e salvar o googleEventId na produção', async () => {
      const production = {
        id: 'prod-123',
        title: 'Comercial Tech',
        description: 'Gravação estúdio',
        status: ProductionStatus.SCHEDULED,
        timezone: 'America/Sao_Paulo',
        scheduledAt: new Date('2026-10-01T09:00:00.000Z'),
        scheduledEndAt: new Date('2026-10-01T18:00:00.000Z'),
        isAllDay: false,
        googleEventId: null,
        stages: [],
        productionEquipments: [],
      };
      mockProductionRepo.findOne.mockResolvedValue(production);

      // Access token ativo
      mockGoogleTokenRepo.findOne.mockResolvedValue({
        accessToken: 'active-token',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const { google } = require('googleapis');
      const calendarInstance = google.calendar();
      calendarInstance.events.insert.mockResolvedValue({
        data: {
          id: 'g-event-999',
          htmlLink: 'https://calendar.google.com/event?eid=g-event-999',
        },
      });

      const result = await service.syncProduction('prod-123');

      expect(result.success).toBe(true);
      expect(result.googleEventId).toBe('g-event-999');
      expect(calendarInstance.events.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'primary',
          requestBody: expect.objectContaining({
            summary: '🎬 [CaseTrack] Comercial Tech',
          }),
        }),
      );
      expect(mockProductionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          googleEventId: 'g-event-999',
          googleSourceStatus: GoogleSourceStatus.ACTIVE,
        }),
      );
    });
  });
});
