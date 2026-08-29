import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DamagesService } from './damages.service';
import { DamagesController } from './damages.controller';
import { Damage } from './entities/damage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Damage])],
  controllers: [DamagesController],
  providers: [DamagesService],
})
export class DamagesModule {}
