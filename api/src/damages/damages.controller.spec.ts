import { Test, TestingModule } from '@nestjs/testing';
import { DamagesController } from './damages.controller';
import { DamagesService } from './damages.service';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

describe('DamagesController', () => {
  let controller: DamagesController;
  let service: DamagesService;

  const mockDamagesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DamagesController],
      providers: [
        {
          provide: DamagesService,
          useValue: mockDamagesService,
        },
      ],
    }).compile();

    controller = module.get<DamagesController>(DamagesController);
    service = module.get<DamagesService>(DamagesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('deve rejeitar quando nenhum arquivo for enviado', async () => {
      await expect(controller.create({ descricao: 'Lente riscada' }, [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve rejeitar quando mais de 4 arquivos forem enviados', async () => {
      const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);
      const fakeFiles = [
        { filename: '1.jpg', path: '/tmp/1.jpg' },
        { filename: '2.jpg', path: '/tmp/2.jpg' },
        { filename: '3.jpg', path: '/tmp/3.jpg' },
        { filename: '4.jpg', path: '/tmp/4.jpg' },
        { filename: '5.jpg', path: '/tmp/5.jpg' },
      ] as Express.Multer.File[];

      await expect(
        controller.create({ descricao: 'Excesso de fotos' }, fakeFiles),
      ).rejects.toThrow(BadRequestException);

      expect(unlinkSpy).toHaveBeenCalledTimes(5);
      unlinkSpy.mockRestore();
    });

    it('deve salvar com sucesso até 4 arquivos de avaria', async () => {
      const fakeFiles = [
        { filename: 'foto1.jpg', path: '/tmp/foto1.jpg' },
        { filename: 'foto2.jpg', path: '/tmp/foto2.jpg' },
      ] as Express.Multer.File[];

      const expectedSaved = {
        id: 1,
        descricao: 'Dano na carcaça',
        imagem_url: '/uploads/damages/foto1.jpg,/uploads/damages/foto2.jpg',
      };

      mockDamagesService.create.mockResolvedValue(expectedSaved);

      const result = await controller.create({ descricao: 'Dano na carcaça' }, fakeFiles);

      expect(result).toEqual(expectedSaved);
      expect(mockDamagesService.create).toHaveBeenCalledWith(
        { descricao: 'Dano na carcaça' },
        ['/uploads/damages/foto1.jpg', '/uploads/damages/foto2.jpg'],
      );
    });

    it('deve acionar rollback físico (unlink) se a persistência falhar', async () => {
      const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);
      const fakeFiles = [
        { filename: 'foto_fail.jpg', path: '/tmp/foto_fail.jpg' },
      ] as Express.Multer.File[];

      mockDamagesService.create.mockRejectedValue(new Error('Falha no banco MySQL'));

      await expect(
        controller.create({ descricao: 'Falha simulada' }, fakeFiles),
      ).rejects.toThrow('Falha no banco MySQL');

      expect(unlinkSpy).toHaveBeenCalledWith('/tmp/foto_fail.jpg');
      unlinkSpy.mockRestore();
    });
  });

  describe('findAll and findOne', () => {
    it('deve listar todas as avarias', async () => {
      const mockList = [{ id: 1, descricao: 'Avaria 1' }];
      mockDamagesService.findAll.mockResolvedValue(mockList);

      const res = await controller.findAll();
      expect(res).toEqual(mockList);
    });

    it('deve buscar uma avaria por ID', async () => {
      const mockDamage = { id: 10, descricao: 'Avaria 10' };
      mockDamagesService.findOne.mockResolvedValue(mockDamage);

      const res = await controller.findOne('10');
      expect(res).toEqual(mockDamage);
    });
  });
});
