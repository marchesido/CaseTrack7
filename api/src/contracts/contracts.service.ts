import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Contract, ContractStatus } from './entities/contract.entity';
import { Production } from '../productions/entities/production.entity';
import { SignContractDto } from './dto/sign-contract.dto';

// Importação flexível do pdfkit compatível com CommonJS / ESM
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,

    @InjectRepository(Production)
    private readonly productionRepo: Repository<Production>,
  ) {}

  /**
   * Gera um novo contrato / termo de cessão em PDF para a produção indicada
   * e persiste o registro no banco de dados.
   */
  async generateProductionContract(productionId: string): Promise<Contract> {
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
      throw new NotFoundException(`Produção com ID "${productionId}" não encontrada.`);
    }

    // Garante que o diretório uploads/contracts/ exista
    const uploadDir = path.join(process.cwd(), 'uploads', 'contracts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileUuid = crypto.randomUUID();
    const fileName = `termo-responsabilidade-${fileUuid}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    const publicUrl = `/uploads/contracts/${fileName}`;

    // Renderização do PDF com PDFKit
    await this.renderContractPdf(filePath, production);

    // Salva a entidade de Contrato
    const contract = this.contractRepo.create({
      production,
      documento_url: publicUrl,
      status: ContractStatus.ISSUED,
      terms_summary: `Termo de Cessão e Responsabilidade emitido para a produção "${production.title}" contendo ${(production.productionEquipments || []).length} equipamento(s).`,
      emitido_em: new Date(),
    });

    return this.contractRepo.save(contract);
  }

  /**
   * Retorna o termo / contrato emitido mais recente vinculado a uma produção.
   */
  async getContractByProduction(productionId: string): Promise<Contract | null> {
    return this.contractRepo.findOne({
      where: { production: { id: productionId } },
      relations: ['production'],
      order: { emitido_em: 'DESC' },
    });
  }

  /**
   * Busca um contrato específico por ID.
   */
  async getContractById(contractId: number): Promise<Contract> {
    const contract = await this.contractRepo.findOne({
      where: { id: contractId },
      relations: [
        'production',
        'production.stages',
        'production.stages.responsibleUser',
        'production.productionEquipments',
        'production.productionEquipments.equipment',
      ],
    });

    if (!contract) {
      throw new NotFoundException(`Contrato com ID ${contractId} não encontrado.`);
    }

    return contract;
  }

  /**
   * Registra a assinatura digital / aceite do termo de responsabilidade.
   */
  async signContract(contractId: number, dto: SignContractDto): Promise<Contract> {
    const contract = await this.getContractById(contractId);

    if (contract.status === ContractStatus.CANCELLED) {
      throw new BadRequestException('Não é possível assinar um contrato cancelado.');
    }

    contract.signer_name = dto.signerName;
    contract.signer_document = dto.signerDocument;
    contract.signed_at = new Date();
    contract.status = ContractStatus.SIGNED;

    return this.contractRepo.save(contract);
  }

  /**
   * Retorna o caminho absoluto do arquivo PDF no disco para download direto.
   */
  async getPdfFilePath(contractId: number): Promise<string> {
    const contract = await this.getContractById(contractId);
    // Remove barra inicial se houver para resolver com path.join
    const relativeUrl = contract.documento_url.startsWith('/')
      ? contract.documento_url.substring(1)
      : contract.documento_url;

    const absolutePath = path.join(process.cwd(), relativeUrl);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Arquivo PDF do contrato não encontrado no servidor.');
    }

    return absolutePath;
  }

  /**
   * Renderiza programaticamente o documento PDF com layout profissional.
   */
  private renderContractPdf(filePath: string, production: Production): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 45,
          info: {
            Title: `Termo de Responsabilidade - ${production.title}`,
            Author: 'CaseTrack Gestão Audiovisual',
          },
        });

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // 1. Cabeçalho Oficial
        doc
          .fillColor('#0F172A')
          .fontSize(18)
          .text('CASETRACK — GESTÃO AUDIOVISUAL', { align: 'center', characterSpacing: 1 })
          .moveDown(0.2);

        doc
          .fillColor('#3B82F6')
          .fontSize(11)
          .text('TERMO DE CESSÃO, LOCAÇÃO E RESPONSABILIDADE CIVIL POR EQUIPAMENTOS', {
            align: 'center',
          })
          .moveDown(0.5);

        doc
          .strokeColor('#CBD5E1')
          .lineWidth(1)
          .moveTo(45, doc.y)
          .lineTo(550, doc.y)
          .stroke()
          .moveDown(1);

        // 2. Dados do Projeto e Identificação
        doc
          .fillColor('#1E293B')
          .fontSize(12)
          .text('1. DADOS DA PRODUÇÃO AUDIOVISUAL', { underline: true })
          .moveDown(0.4);

        doc
          .fontSize(10)
          .fillColor('#334155')
          .text(`Projeto: ${production.title}`)
          .text(`Identificador: ${production.id}`)
          .text(`Status Atual: ${production.status}`)
          .text(`Data de Início Prevista: ${new Date(production.scheduledAt).toLocaleDateString('pt-BR')}`)
          .text(
            `Data de Término Prevista: ${
              production.scheduledEndAt
                ? new Date(production.scheduledEndAt).toLocaleDateString('pt-BR')
                : 'Indeterminado'
            }`,
          );

        if (production.description) {
          doc.text(`Descrição / Objeto: ${production.description}`);
        }

        doc.moveDown(0.8);

        // 3. Etapas e Responsáveis
        doc
          .fillColor('#1E293B')
          .fontSize(12)
          .text('2. ETAPAS OPERACIONAIS E RESPONSÁVEIS', { underline: true })
          .moveDown(0.4);

        const stages = (production.stages || []).sort((a, b) => a.order - b.order);
        if (stages.length > 0) {
          stages.forEach((st) => {
            const resp = st.responsibleUser
              ? `${st.responsibleUser.name} (${st.responsibleUser.email})`
              : 'Não atribuído';
            doc.fontSize(9).fillColor('#475569').text(`• [${st.type}]: ${st.status} — Responsável: ${resp}`);
          });
        } else {
          doc.fontSize(9).fillColor('#94A3B8').text('• Nenhuma etapa operacional cadastrada.');
        }

        doc.moveDown(0.8);

        // 4. Relação Nominal dos Equipamentos Alocados
        doc
          .fillColor('#1E293B')
          .fontSize(12)
          .text('3. INVENTÁRIO DE EQUIPAMENTOS DISPONIBILIZADOS', { underline: true })
          .moveDown(0.4);

        const equipments = (production.productionEquipments || []).filter((pe) => pe.isActive);
        if (equipments.length > 0) {
          // Cabeçalho da Tabela
          const startY = doc.y;
          doc.rect(45, startY, 505, 18).fill('#F1F5F9');
          doc
            .fillColor('#0F172A')
            .fontSize(9)
            .text('Equipamento', 55, startY + 4, { width: 220 })
            .text('Número de Série', 280, startY + 4, { width: 120 })
            .text('Status de Saída', 410, startY + 4, { width: 130 });

          let currentY = startY + 20;
          equipments.forEach((pe) => {
            const eq = pe.equipment || {};
            doc
              .fillColor('#334155')
              .fontSize(9)
              .text(`${eq.name || 'Equipamento'}`, 55, currentY, { width: 220 })
              .text(`${eq.serialNumber || 'N/A'}`, 280, currentY, { width: 120 })
              .text(`${pe.movementStatus}`, 410, currentY, { width: 130 });
            currentY += 15;
          });

          doc.y = currentY + 5;
        } else {
          doc.fontSize(9).fillColor('#94A3B8').text('• Nenhum equipamento ativo alocado no momento da emissão.');
        }

        doc.moveDown(0.8);

        // 5. Cláusulas e Condições de Responsabilidade
        doc
          .fillColor('#1E293B')
          .fontSize(12)
          .text('4. CLÁUSULAS DE RESPONSABILIDADE CIVIL E OPERACIONAL', { underline: true })
          .moveDown(0.4);

        const clauses = [
          'CLÁUSULA 1ª (DO USO EXCLUSIVO): Os equipamentos listados destinam-se única e exclusivamente às atividades e diárias da produção audiovisual acima identificada, sendo estritamente vedada a cessão, sublocação ou empréstimo a terceiros não autorizados.',
          'CLÁUSULA 2ª (DO DEVER DE GUARDA): O responsável declara ter recebido os equipamentos em perfeito estado estético e pleno funcionamento operacional, assumindo a guarda, conservação e vigilância ininterrupta dos mesmos.',
          'CLÁUSULA 3ª (DO PROCEDIMENTO DE CHECK-IN/OUT): A saída (check-out) e a devolução (check-in) obrigam a conferência minuciosa com registro fotográfico e laudo em caso de qualquer avaria, desgaste anormal ou perda de componentes.',
          'CLÁUSULA 4ª (DAS AVARIAS E INDENIZAÇÃO): Em caso de sinistro, quebra por imperícia, negligência ou furto/roubo, o responsável compromete-se a indenizar a produtora pelos custos integrais de reparo em assistência autorizada ou reposição a valor de mercado do item novo equivalente.',
        ];

        clauses.forEach((c) => {
          doc.fontSize(8).fillColor('#475569').text(c, { align: 'justify' }).moveDown(0.3);
        });

        doc.moveDown(1);

        // 6. Bloco de Assinaturas
        const signDateStr = new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });

        doc
          .fontSize(9)
          .fillColor('#1E293B')
          .text(`Emitido em: ${signDateStr}`, { align: 'right' })
          .moveDown(2);

        const signY = doc.y;
        doc
          .strokeColor('#64748B')
          .lineWidth(0.8)
          .moveTo(60, signY)
          .lineTo(260, signY)
          .stroke()
          .moveTo(330, signY)
          .lineTo(530, signY)
          .stroke();

        doc
          .fontSize(8)
          .fillColor('#334155')
          .text('Produtora Responsável\nCaseTrack Gestão', 60, signY + 5, { width: 200, align: 'center' })
          .text('Responsável / Operador em Set\nAceite e Ciência dos Termos', 330, signY + 5, { width: 200, align: 'center' });

        doc.end();

        writeStream.on('finish', () => {
          resolve();
        });

        writeStream.on('error', (err) => {
          this.logger.error(`Erro ao escrever PDF do contrato: ${err.message}`);
          reject(err);
        });
      } catch (err) {
        this.logger.error(`Erro ao renderizar PDF do contrato: ${err.message}`);
        reject(err);
      }
    });
  }
}
