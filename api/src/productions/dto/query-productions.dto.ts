import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductionStatus } from '../entities/production.entity';

export class QueryProductionsDto {
  @ApiPropertyOptional({
    description: 'Filtrar por data específica no fuso da produção (formato YYYY-MM-DD)',
    example: '2026-09-10',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status operacional da produção',
    enum: ProductionStatus,
    example: ProductionStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(ProductionStatus)
  status?: ProductionStatus;

  @ApiPropertyOptional({
    description: 'Busca textual por título ou descrição',
    example: 'Campanha',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
