import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionStagesService } from './production-stages.service';
import { ProductionStage, ProductionStageType, StageStatus } from './entities/production-stage.entity';
import { Production, ProductionStatus } from './entities/production.entity';
import { MovementStatus } from './entities/production-equipment.entity';
import { ProductionCompletionService } from './production-completion.service';
import { UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

describe('ProductionStagesService', () => {
  let service: ProductionStagesService;
  let stageRepo: jest.Mocked<Repository<ProductionStage>>;
  let productionRepo: jest.Mocked<Repository<Production>>;
  let completionService: jest.Mocked<ProductionCompletionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionStagesService,
        {
          provide: getRepositoryToken(ProductionStage),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn((entity) => Promise.resolve(entity)),
          },
        },
        {
          provide: getRepositoryToken(Production),
          useValue: {
            save: jest.fn((entity) => Promise.resolve(entity)),
          },
        },
        {
          provide: ProductionCompletionService,
          useValue: {
            checkAndAutoComplete: jest.fn().mockResolvedValue({ autoCompleted: false }),
          },
        },
      ],
    }).compile();

    service = module.get<ProductionStagesService>(ProductionStagesService);
    stageRepo = module.get(getRepositoryToken(ProductionStage));
    productionRepo = module.get(getRepositoryToken(Production));
    completionService = module.get(ProductionCompletionService);
  });

  describe('completeStage (B9 & B13 Rules)', () => {
    it('should throw UnprocessableEntityException (422) if CAPTACAO has active equipment not checked out', async () => {
      const mockStage = {
        id: 'stage-cap',
        type: ProductionStageType.CAPTACAO,
        status: StageStatus.IN_PROGRESS,
        responsibleUser: { id: 'user-op' },
        production: {
          id: 'prod-1',
          status: ProductionStatus.IN_PROGRESS,
          productionEquipments: [
            {
              id: 'pe-1',
              isActive: true,
              movementStatus: MovementStatus.PENDING_CHECKOUT, // Não retirado!
            },
          ],
        },
      };

      stageRepo.findOne.mockResolvedValue(mockStage as any);

      await expect(
        service.completeStage('prod-1', 'stage-cap', { id: 'user-op', role: UserRole.FREELANCER }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw UnprocessableEntityException (422) if CAPTACAO has active equipment with INSPECTION_FAILED', async () => {
      const mockStage = {
        id: 'stage-cap',
        type: ProductionStageType.CAPTACAO,
        status: StageStatus.IN_PROGRESS,
        responsibleUser: { id: 'user-op' },
        production: {
          id: 'prod-1',
          status: ProductionStatus.IN_PROGRESS,
          productionEquipments: [
            {
              id: 'pe-1',
              isActive: true,
              movementStatus: MovementStatus.INSPECTION_FAILED, // Falha na inspeção e ainda ativo!
            },
          ],
        },
      };

      stageRepo.findOne.mockResolvedValue(mockStage as any);

      await expect(
        service.completeStage('prod-1', 'stage-cap', { id: 'user-op', role: UserRole.FREELANCER }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should successfully complete CAPTACAO if inactive equipment had INSPECTION_FAILED and active replacement is CHECKED_OUT', async () => {
      const mockStage = {
        id: 'stage-cap',
        type: ProductionStageType.CAPTACAO,
        status: StageStatus.IN_PROGRESS,
        responsibleUser: { id: 'user-op' },
        production: {
          id: 'prod-1',
          status: ProductionStatus.IN_PROGRESS,
          productionEquipments: [
            {
              id: 'pe-old',
              isActive: false, // Inativo / substituído por falha na inspeção!
              movementStatus: MovementStatus.INSPECTION_FAILED,
            },
            {
              id: 'pe-new',
              isActive: true, // Ativo / substituto
              movementStatus: MovementStatus.CHECKED_OUT, // Retirado com sucesso!
            },
          ],
        },
      };

      stageRepo.findOne.mockResolvedValue(mockStage as any);

      const result = await service.completeStage('prod-1', 'stage-cap', {
        id: 'user-op',
        role: UserRole.FREELANCER,
      });

      expect(result.stage.status).toBe(StageStatus.COMPLETED);
      expect(completionService.checkAndAutoComplete).toHaveBeenCalledWith('prod-1');
    });
  });
});
