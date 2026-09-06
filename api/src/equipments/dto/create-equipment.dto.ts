import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { EquipmentStatus } from '../entities/equipment.entity';

export class CreateEquipmentDto {
  @ApiProperty({
    description: 'Nome do equipamento (Ex: Câmera, Lente, Tripé)',
    example: 'Sony Alpha A7IV',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome do equipamento é obrigatório' })
  @Length(3, 150)
  name: string;

  @ApiProperty({
    description: 'Descrição do equipamento',
    example: 'Câmera Mirrorless Full Frame',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Número de série único do fabricante',
    example: 'SN123456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  serialNumber?: string;

  @ApiProperty({
    description: 'Status atual do equipamento',
    enum: EquipmentStatus,
    default: EquipmentStatus.DISPONIVEL,
  })
  @IsEnum(EquipmentStatus, {
    message: 'Status inválido. Use: DISPONIVEL, EM_USO ou MANUTENCAO',
  })
  @IsOptional()
  status?: EquipmentStatus;

  @ApiProperty({
    description: 'URL ou caminho relativo da foto do equipamento',
    example: '/uploads/abc12345.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
