import { PartialType } from '@nestjs/swagger';
import { CreateProductionDto } from './create-production.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ProductionStatus } from '../entities/production.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductionDto extends PartialType(CreateProductionDto) {
  @ApiPropertyOptional({
    description: 'Status operacional da produção',
    enum: ProductionStatus,
    example: ProductionStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(ProductionStatus, {
    message: 'Status inválido. Use SCHEDULED, IN_PROGRESS, COMPLETED ou CANCELLED',
  })
  status?: ProductionStatus;
}
