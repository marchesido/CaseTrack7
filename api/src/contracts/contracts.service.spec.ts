import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ContractsService } from './contracts.service';
import { Contract, ContractStatus } from './entities/contract.entity';
import { Production, ProductionStatus } from '../productions/entities/production.entity';

describe('ContractsService', () => {
  let service: ContractsService;
  let mockContractRepo: any;
  let mockProductionRepo: any;
  const createdFiles: string[] = [];

  beforeEach(async () => {
    mockContractRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({ id: entity.id || 1, ...entity }),
      ),
    };

    mockProductionRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepo,
        },
        {
          provide: getRepositoryToken(Production),
          useValue: mockProductionRepo,
        },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  afterAll(() => {
    // Limpeza de arquivos temporários de teste
    for (const f of createdFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (_) {}
      }
    }
  });

  describe('generateProductionContract', () => {
    it('deve lançar NotFoundException se a produção não for encontrada', async () => {
      mockProductionRepo.findOne.mockResolvedValue(null);

      await expect(service.generateProductionContract('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve gerar arquivo PDF em disco e persistir o contrato com status ISSUED', async () => {
      const mockProduction = {
        id: 'prod-uuid-1',
        title: 'Filme Publicitário CaseTrack',
        description: 'Gravação em estúdio',
        status: ProductionStatus.SCHEDULED,
        scheduledAt: new Date(),
        scheduledEndAt: new Date(Date.now() + 86400000),
        stages: [
          {
            id: 'st-1',
            type: 'CAPTACAO',
            status: 'PENDING',
            order: 1,
            responsibleUser: { name: 'Diretor de Fotografia', email: 'dp@casetrack.com' },
          },
        ],
        productionEquipments: [
          {
            id: 'pe-1',
            isActive: true,
            movementStatus: 'PENDING_CHECKOUT',
            equipment: { name: 'Câmera Cinema 6K', serialNumber: 'SN-CINEMA-001' },
          },
        ],
      };

      mockProductionRepo.findOne.mockResolvedValue(mockProduction);

      const contract = await service.generateProductionContract('prod-uuid-1');

      expect(contract).toBeDefined();
      expect(contract.status).toBe(ContractStatus.ISSUED);
      expect(contract.documento_url).toContain('/uploads/contracts/');
      expect(mockContractRepo.save).toHaveBeenCalled();

      // Verifica se o arquivo físico foi realmente gerado pelo pdfkit
      const absolutePath = path.join(process.cwd(), contract.documento_url);
      createdFiles.push(absolutePath);
      expect(fs.existsSync(absolutePath)).toBe(true);
    });
  });

  describe('getContractByProduction', () => {
    it('deve buscar contrato associado à produção', async () => {
      const mockContract = { id: 1, status: ContractStatus.ISSUED };
      mockContractRepo.findOne.mockResolvedValue(mockContract);

      const result = await service.getContractByProduction('prod-uuid-1');
      expect(result).toBe(mockContract);
      expect(mockContractRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { production: { id: 'prod-uuid-1' } },
        }),
      );
    });
  });

  describe('signContract', () => {
    it('deve lançar BadRequestException se o contrato estiver CANCELLED', async () => {
      mockContractRepo.findOne.mockResolvedValue({
        id: 1,
        status: ContractStatus.CANCELLED,
      });

      await expect(
        service.signContract(1, {
          signerName: 'Operador Responsável',
          signerDocument: '123.456.789-00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve atualizar status para SIGNED com dados do signatário', async () => {
      const existing = {
        id: 2,
        status: ContractStatus.ISSUED,
        signer_name: null,
      };
      mockContractRepo.findOne.mockResolvedValue(existing);

      const signed = await service.signContract(2, {
        signerName: 'Ana Clara Operadora',
        signerDocument: '987.654.321-11',
      });

      expect(signed.status).toBe(ContractStatus.SIGNED);
      expect(signed.signer_name).toBe('Ana Clara Operadora');
      expect(signed.signer_document).toBe('987.654.321-11');
      expect(signed.signed_at).toBeDefined();
      expect(mockContractRepo.save).toHaveBeenCalled();
    });
  });

  describe('getPdfFilePath', () => {
    it('deve lançar NotFoundException se o arquivo PDF não existir no disco', async () => {
      mockContractRepo.findOne.mockResolvedValue({
        id: 99,
        documento_url: '/uploads/contracts/arquivo-inexistente.pdf',
      });

      await expect(service.getPdfFilePath(99)).rejects.toThrow(NotFoundException);
    });

    it('deve retornar o caminho absoluto se o arquivo existir', async () => {
      const tempDir = path.join(process.cwd(), 'uploads', 'contracts');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempFile = path.join(tempDir, 'teste-real.pdf');
      fs.writeFileSync(tempFile, 'teste dummy pdf');
      createdFiles.push(tempFile);

      mockContractRepo.findOne.mockResolvedValue({
        id: 10,
        documento_url: '/uploads/contracts/teste-real.pdf',
      });

      const filePath = await service.getPdfFilePath(10);
      expect(filePath).toBe(tempFile);
    });
  });
});
