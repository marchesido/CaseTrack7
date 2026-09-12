import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentCondition } from '../entities/equipment-movement.entity';

export class CheckoutEquipmentDto {
  @ApiProperty({
    description: 'Condição do equipamento avaliada na inspeção de retirada',
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
  @IsNotEmpty({ message: 'damageId é obrigatório quando o equipamento possui avaria na inspeção' })
  @IsNumber({}, { message: 'damageId deve ser um número' })
  damageId?: number;

  @ApiPropertyOptional({
    description: 'Observações adicionais da inspeção prévia',
    example: 'Lente testada no check-out, anéis de foco fluidos.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
