import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Damage } from './entities/damage.entity';

@Injectable()
export class DamagesService {
  constructor(
    @InjectRepository(Damage)
    private readonly damageRepository: Repository<Damage>,
  ) {}

  async create(data: Partial<Damage>, imageUrl?: string): Promise<Damage> {
    const damage = this.damageRepository.create({
      ...data,
      imagem_url: imageUrl,
    });
    return this.damageRepository.save(damage);
  }

  async findAll(): Promise<Damage[]> {
    return this.damageRepository.find({ relations: ['equipment', 'reportadoPor'] });
  }

  async findOne(id: number): Promise<Damage> {
    const damage = await this.damageRepository.findOne({
      where: { id },
      relations: ['equipment', 'reportadoPor'],
    });
    if (!damage) {
      throw new NotFoundException(`Damage #${id} not found`);
    }
    return damage;
  }
}
