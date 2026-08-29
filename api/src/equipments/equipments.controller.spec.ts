import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentsController } from './equipments.controller';
import { EquipmentsService } from './equipments.service';

describe('EquipmentsController', () => {
  let controller: EquipmentsController;

  const mockEquipmentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquipmentsController],
      providers: [
        {
          provide: EquipmentsService,
          useValue: mockEquipmentsService,
        },
      ],
    }).compile();

    controller = module.get<EquipmentsController>(EquipmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
