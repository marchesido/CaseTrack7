import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentsService } from './equipments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Equipment } from './entities/equipment.entity';

describe('EquipmentsService', () => {
  let service: EquipmentsService;

  const mockEquipmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentsService,
        {
          provide: getRepositoryToken(Equipment),
          useValue: mockEquipmentRepository,
        },
      ],
    }).compile();

    service = module.get<EquipmentsService>(EquipmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
