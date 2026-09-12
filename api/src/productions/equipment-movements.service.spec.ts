import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentMovementsService } from './equipment-movements.service';
import { ProductionEquipment, MovementStatus } from './entities/production-equipment.entity';
import { EquipmentMovement, EquipmentMovementType, EquipmentCondition } from './entities/equipment-movement.entity';
import { Equipment, EquipmentStatus } from '../equipments/entities/equipment.entity';
import { Damage } from '../damages/entities/damage.entity';
import { User } from '../users/entities/user.entity';
import { ProductionCompletionService } from './production-completion.service';
import { UnprocessableEntityException, BadRequestException } from '@nestjs/common';

describe('EquipmentMovementsService', () => {
  let service: EquipmentMovementsService;
  let prodEquipmentRepo: jest.Mocked<Repository<ProductionEquipment>>;
  let movementRepo: jest.Mocked<Repository<EquipmentMovement>>;
  let equipmentRepo: jest.Mocked<Repository<Equipment>>;
  let damageRepo: jest.Mocked<Repository<Damage>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let completionService: jest.Mocked<ProductionCompletionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentMovementsService,
        {
          provide: getRepositoryToken(ProductionEquipment),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn((e) => Promise.resolve(e)),
          },
        },
        {
          provide: getRepositoryToken(EquipmentMovement),
          useValue: {
            create: jest.fn((dto) => dto),
            save: jest.fn((e) => Promise.resolve({ id: 'mov-id', ...e })),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            save: jest.fn((e) => Promise.resolve(e)),
          },
        },
        {
          provide: getRepositoryToken(Damage),
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
          provide: ProductionCompletionService,
          useValue: {
            checkAndAutoComplete: jest.fn().mockResolvedValue({ autoCompleted: false }),
          },
        },
      ],
    }).compile();

    service = module.get<EquipmentMovementsService>(EquipmentMovementsService);
    prodEquipmentRepo = module.get(getRepositoryToken(ProductionEquipment));
    movementRepo = module.get(getRepositoryToken(EquipmentMovement));
    equipmentRepo = module.get(getRepositoryToken(Equipment));
    damageRepo = module.get(getRepositoryToken(Damage));
    userRepo = module.get(getRepositoryToken(User));
    completionService = module.get(ProductionCompletionService);
  });

  describe('checkout (DP-3, B5, B13)', () => {
    it('should throw 422 if equipment is already in MANUTENCAO', async () => {
      const mockPe = {
        id: 'pe-1',
        production: { id: 'prod-1' },
        equipment: { id: 'eq-1', status: EquipmentStatus.MANUTENCAO },
        movementStatus: MovementStatus.PENDING_CHECKOUT,
      };
      prodEquipmentRepo.findOne.mockResolvedValue(mockPe as any);

      await expect(
        service.checkout('prod-1', 'pe-1', { condition: EquipmentCondition.OK }, { id: 'user-1' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should record INSPECTION_FAILED, set equipment to MANUTENCAO and throw 422 on DAMAGED checkout', async () => {
      const mockEq = { id: 'eq-1', status: EquipmentStatus.DISPONIVEL };
      const mockPe = {
        id: 'pe-1',
        production: { id: 'prod-1' },
        equipment: mockEq,
        movementStatus: MovementStatus.PENDING_CHECKOUT,
      };
      prodEquipmentRepo.findOne.mockResolvedValue(mockPe as any);
      userRepo.findOne.mockResolvedValue({ id: 'user-1' } as any);
      damageRepo.findOne.mockResolvedValue({ id: 10, equipment: { id: 'eq-1' } } as any);

      try {
        await service.checkout(
          'prod-1',
          'pe-1',
          { condition: EquipmentCondition.DAMAGED, damageId: 10 },
          { id: 'user-1' },
        );
        fail('Should have thrown UnprocessableEntityException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        const response = err.getResponse();
        expect(response.error).toBe('INSPECTION_FAILED');
        expect(mockEq.status).toBe(EquipmentStatus.MANUTENCAO);
        expect(mockPe.movementStatus).toBe(MovementStatus.INSPECTION_FAILED);
        expect(movementRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: EquipmentMovementType.INSPECTION_FAILED,
            condition: EquipmentCondition.DAMAGED,
          }),
        );
      }
    });

    it('should complete checkout successfully when condition is OK', async () => {
      const mockEq = { id: 'eq-1', status: EquipmentStatus.DISPONIVEL };
      const mockPe = {
        id: 'pe-1',
        production: { id: 'prod-1' },
        equipment: mockEq,
        movementStatus: MovementStatus.PENDING_CHECKOUT,
      };
      prodEquipmentRepo.findOne.mockResolvedValue(mockPe as any);
      userRepo.findOne.mockResolvedValue({ id: 'user-1' } as any);

      const result = await service.checkout(
        'prod-1',
        'pe-1',
        { condition: EquipmentCondition.OK },
        { id: 'user-1' },
      );

      expect(result.message).toBe('Checkout efetuado com sucesso');
      expect(mockEq.status).toBe(EquipmentStatus.EM_USO);
      expect(mockPe.movementStatus).toBe(MovementStatus.CHECKED_OUT);
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EquipmentMovementType.CHECKOUT,
          condition: EquipmentCondition.OK,
        }),
      );
    });
  });

  describe('checkin (B5)', () => {
    it('should throw BadRequestException if equipment is not CHECKED_OUT', async () => {
      const mockPe = {
        id: 'pe-1',
        production: { id: 'prod-1' },
        equipment: { id: 'eq-1', status: EquipmentStatus.DISPONIVEL },
        movementStatus: MovementStatus.PENDING_CHECKOUT,
      };
      prodEquipmentRepo.findOne.mockResolvedValue(mockPe as any);

      await expect(
        service.checkin('prod-1', 'pe-1', { condition: EquipmentCondition.OK }, { id: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should complete checkin OK and trigger auto-completion check', async () => {
      const mockEq = { id: 'eq-1', status: EquipmentStatus.EM_USO };
      const mockPe = {
        id: 'pe-1',
        production: { id: 'prod-1' },
        equipment: mockEq,
        movementStatus: MovementStatus.CHECKED_OUT,
      };
      prodEquipmentRepo.findOne.mockResolvedValue(mockPe as any);
      userRepo.findOne.mockResolvedValue({ id: 'user-1' } as any);

      const result = await service.checkin(
        'prod-1',
        'pe-1',
        { condition: EquipmentCondition.OK },
        { id: 'user-1' },
      );

      expect(mockEq.status).toBe(EquipmentStatus.DISPONIVEL);
      expect(mockPe.movementStatus).toBe(MovementStatus.RETURNED_OK);
      expect(completionService.checkAndAutoComplete).toHaveBeenCalledWith('prod-1');
    });
  });
});
