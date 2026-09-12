import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductionsService } from './productions.service';
import { Production, ProductionStatus } from './entities/production.entity';
import { ProductionStage } from './entities/production-stage.entity';
import { ProductionEquipment, MovementStatus } from './entities/production-equipment.entity';
import { Equipment, EquipmentStatus } from '../equipments/entities/equipment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UnprocessableEntityException, NotFoundException } from '@nestjs/common';

describe('ProductionsService', () => {
  let service: ProductionsService;
  let productionRepo: jest.Mocked<Repository<Production>>;
  let stageRepo: jest.Mocked<Repository<ProductionStage>>;
  let prodEquipmentRepo: jest.Mocked<Repository<ProductionEquipment>>;
  let equipmentRepo: jest.Mocked<Repository<Equipment>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let dataSource: any;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn().mockImplementation((entityClass, data) => Promise.resolve({ id: 'saved-id', ...data })),
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionsService,
        {
          provide: getRepositoryToken(Production),
          useValue: {
            create: jest.fn((dto) => dto),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductionStage),
          useValue: {
            create: jest.fn((dto) => dto),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductionEquipment),
          useValue: {
            create: jest.fn((dto) => dto),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<ProductionsService>(ProductionsService);
    productionRepo = module.get(getRepositoryToken(Production));
    stageRepo = module.get(getRepositoryToken(ProductionStage));
    prodEquipmentRepo = module.get(getRepositoryToken(ProductionEquipment));
    equipmentRepo = module.get(getRepositoryToken(Equipment));
    userRepo = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('substituteEquipment (B13 Mandatory Criterion)', () => {
    it('should throw UnprocessableEntityException (422) if replacement equipment is not DISPONIVEL', async () => {
      const existingPe = {
        id: 'pe-1',
        production: { id: 'prod-1' },
        equipment: { id: 'eq-1', status: EquipmentStatus.MANUTENCAO },
        isActive: true,
      };
      prodEquipmentRepo.findOne.mockResolvedValue(existingPe as any);

      // Equipamento substituto em MANUTENCAO
      equipmentRepo.findOne.mockResolvedValue({
        id: 'eq-2',
        name: 'Câmera Reserva',
        status: EquipmentStatus.MANUTENCAO,
      } as any);

      await expect(
        service.substituteEquipment('prod-1', 'pe-1', {
          newEquipmentId: 'eq-2',
          reason: 'Item original quebrado',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should successfully substitute equipment, marking old as inactive and creating new active', async () => {
      const existingPe = {
        id: 'pe-1',
        production: { id: 'prod-1' },
        equipment: { id: 'eq-1', status: EquipmentStatus.MANUTENCAO },
        isActive: true,
      };
      prodEquipmentRepo.findOne
        .mockResolvedValueOnce(existingPe as any)
        .mockResolvedValueOnce({
          id: 'new-pe-id',
          isActive: true,
          movementStatus: MovementStatus.PENDING_CHECKOUT,
          equipment: { id: 'eq-2', status: EquipmentStatus.DISPONIVEL },
        } as any);

      equipmentRepo.findOne.mockResolvedValue({
        id: 'eq-2',
        name: 'Câmera Reserva',
        status: EquipmentStatus.DISPONIVEL,
      } as any);

      prodEquipmentRepo.create.mockImplementation((dto) => dto as any);

      const result = await service.substituteEquipment('prod-1', 'pe-1', {
        newEquipmentId: 'eq-2',
        reason: 'Item original quebrado',
      });

      expect(result).toBeDefined();
      expect(result.isActive).toBe(true);
      expect(result.movementStatus).toBe(MovementStatus.PENDING_CHECKOUT);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('findMyPending (B10)', () => {
    it('should return pendingStages and pendingReturns structure', async () => {
      const mockStageQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'stage-1' }]),
      };
      stageRepo.createQueryBuilder.mockReturnValue(mockStageQb as any);

      const mockPeQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'pe-return-1' }]),
      };
      prodEquipmentRepo.createQueryBuilder.mockReturnValue(mockPeQb as any);

      const result = await service.findMyPending('user-1');

      expect(result).toHaveProperty('pendingStages');
      expect(result).toHaveProperty('pendingReturns');
      expect(result.pendingStages.length).toBe(1);
      expect(result.pendingReturns.length).toBe(1);
    });
  });
});
