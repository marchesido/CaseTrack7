import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentCondition } from '../entities/equipment-movement.entity';

export class CheckinEquipmentDto {
  @ApiProperty({
    description: 'Condição do equipamento avaliada na inspeção de devolução',
    enum: EquipmentCondition,
    example: EquipmentCondition.OK,
  })
  @IsNotEmpty({ message: 'A condição do equipamento é obrigatória' })
  @IsEnum(EquipmentCondition, {
    message: 'Condição inválida. Use OK ou DAMAGED',
  })
  condition: EquipmentCondition;

  @ApiPropertyOptional({
    description: 'ID da avaria registrada previamente (obrigatório se condition = DAMAGED)',
    example: 1,
  })
  @ValidateIf((o) => o.condition === EquipmentCondition.DAMAGED)
  @IsNotEmpty({ message: 'damageId é obrigatório quando o equipamento é devolvido com avaria' })
  @IsNumber({}, { message: 'damageId deve ser um número' })
  damageId?: number;

  @ApiPropertyOptional({
    description: 'Observações adicionais da devolução',
    example: 'Equipamento conferido e limpo na devolução.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
