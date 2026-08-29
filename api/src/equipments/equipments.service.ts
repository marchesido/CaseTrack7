import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { Equipment } from './entities/equipment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EquipmentsService {
  constructor(
    @InjectRepository(Equipment)
    private readonly repository: Repository<Equipment>,
  ) {}

  async create(createEquipmentDto: CreateEquipmentDto) {
    const Equipment = this.repository.create(createEquipmentDto);
    return await this.repository.save(Equipment);
  }

  async findAll(skip?: number, take?: number) {
    const equipment = await this.repository.find({ skip, take });
    return equipment;
  }

  async findOne(id: string): Promise<Equipment> {
    const equipment = await this.repository.findOne({ where: { id } });

    if (!equipment) {
      throw new NotFoundException(`Equipamento com ID ${id} não encontrado`);
    }

    return equipment;
  }

  async update(
    id: string,
    updateEquipmentDto: UpdateEquipmentDto,
  ): Promise<Equipment> {
    const equipment = await this.findOne(id);

    this.repository.merge(equipment, updateEquipmentDto);

    return await this.repository.save(equipment);
  }

  async remove(id: string): Promise<void> {
    // const equipment = await this.findOne(id);
    await this.repository.delete(id);
  }
}
