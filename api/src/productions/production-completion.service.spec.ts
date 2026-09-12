import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionCompletionService } from './production-completion.service';
import { Production, ProductionStatus } from './entities/production.entity';
import { StageStatus } from './entities/production-stage.entity';
import { MovementStatus } from './entities/production-equipment.entity';

describe('ProductionCompletionService', () => {
  let service: ProductionCompletionService;
  let productionRepo: jest.Mocked<Repository<Production>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionCompletionService,
        {
          provide: getRepositoryToken(Production),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn((e) => Promise.resolve(e)),
          },
        },
      ],
    }).compile();

    service = module.get<ProductionCompletionService>(ProductionCompletionService);
    productionRepo = module.get(getRepositoryToken(Production));
  });

  describe('checkAndAutoComplete (DP-4 & B13)', () => {
    it('should NOT auto-complete if any stage is not COMPLETED', async () => {
      const mockProd = {
        id: 'prod-1',
        status: ProductionStatus.IN_PROGRESS,
        stages: [
          { status: StageStatus.COMPLETED },
          { status: StageStatus.COMPLETED },
          { status: StageStatus.IN_PROGRESS }, // ainda não concluída
          { status: StageStatus.PENDING },
        ],
        productionEquipments: [
          { isActive: true, movementStatus: MovementStatus.RETURNED_OK },
        ],
      };
      productionRepo.findOne.mockResolvedValue(mockProd as any);

      const result = await service.checkAndAutoComplete('prod-1');
      expect(result.autoCompleted).toBe(false);
      expect(productionRepo.save).not.toHaveBeenCalled();
    });

    it('should NOT auto-complete if an ACTIVE equipment is not returned', async () => {
      const mockProd = {
        id: 'prod-1',
        status: ProductionStatus.IN_PROGRESS,
        stages: [
          { status: StageStatus.COMPLETED },
          { status: StageStatus.COMPLETED },
          { status: StageStatus.COMPLETED },
          { status: StageStatus.COMPLETED },
        ],
        productionEquipments: [
          { isActive: true, movementStatus: MovementStatus.CHECKED_OUT }, // Ainda em uso!
        ],
      };
      productionRepo.findOne.mockResolvedValue(mockProd as any);

      const result = await service.checkAndAutoComplete('prod-1');
      expect(result.autoCompleted).toBe(false);
      expect(productionRepo.save).not.toHaveBeenCalled();
    });

    it('should auto-complete if all 4 stages are completed and all ACTIVE equipments are returned, ignoring inactive equipment', async () => {
      const mockProd = {
        id: 'prod-1',
        status: ProductionStatus.IN_PROGRESS,
        stages: [
          { status: StageStatus.COMPLETED },
          { status: StageStatus.COMPLETED },
          { status: StageStatus.COMPLETED },
          { status: StageStatus.COMPLETED },
        ],
        productionEquipments: [
          {
            id: 'pe-old',
            isActive: false, // Inativo por falha na inspeção!
            movementStatus: MovementStatus.INSPECTION_FAILED,
          },
          {
            id: 'pe-substitute',
            isActive: true, // Substituto ativo
            movementStatus: MovementStatus.RETURNED_OK,
          },
        ],
      };
      productionRepo.findOne.mockResolvedValue(mockProd as any);

      const result = await service.checkAndAutoComplete('prod-1');
      expect(result.autoCompleted).toBe(true);
      expect(result.production?.status).toBe(ProductionStatus.COMPLETED);
      expect(productionRepo.save).toHaveBeenCalled();
    });
  });
});
