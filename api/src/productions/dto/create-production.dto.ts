import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductionStageAssigneesDto {
  @ApiPropertyOptional({ description: 'ID do responsável pela etapa de Captação' })
  @IsOptional()
  @IsUUID('4', { message: 'ID de responsável de captação inválido' })
  captureResponsibleUserId?: string;

  @ApiPropertyOptional({ description: 'ID do responsável pela etapa de Edição' })
  @IsOptional()
  @IsUUID('4', { message: 'ID de responsável de edição inválido' })
  editingResponsibleUserId?: string;

  @ApiPropertyOptional({ description: 'ID do responsável pela etapa de Backup' })
  @IsOptional()
  @IsUUID('4', { message: 'ID de responsável de backup inválido' })
  backupResponsibleUserId?: string;

  @ApiPropertyOptional({ description: 'ID do responsável pela etapa de Upload' })
  @IsOptional()
  @IsUUID('4', { message: 'ID de responsável de upload inválido' })
  uploadResponsibleUserId?: string;
}

export class CreateProductionDto {
  @ApiProperty({ description: 'Título da produção audiovisual', example: 'Comercial Campanha de Verão' })
  @IsNotEmpty({ message: 'O título da produção é obrigatório' })
  @IsString()
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres' })
  @MaxLength(150, { message: 'O título deve ter no máximo 150 caracteres' })
  title: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada do projeto' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Data/hora agendada de início (ISO 8601)', example: '2026-09-10T09:00:00.000Z' })
  @IsNotEmpty({ message: 'A data agendada de início é obrigatória' })
  @IsDateString({}, { message: 'scheduledAt deve ser uma data ISO 8601 válida' })
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Data/hora agendada de término (ISO 8601)', example: '2026-09-10T18:00:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'scheduledEndAt deve ser uma data ISO 8601 válida' })
  scheduledEndAt?: string;

  @ApiPropertyOptional({ description: 'Indica se a produção ocorre no dia inteiro', default: false })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: 'Fuso horário da produção', default: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Lista de IDs dos equipamentos necessários', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada equipamento deve ser um UUID válido' })
  equipmentIds?: string[];

  @ApiPropertyOptional({ description: 'Responsáveis pelas etapas lineares', type: ProductionStageAssigneesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductionStageAssigneesDto)
  assignees?: ProductionStageAssigneesDto;
}
