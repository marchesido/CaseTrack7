import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubstituteEquipmentDto {
  @ApiProperty({
    description: 'UUID do novo equipamento substituto (deve estar DISPONIVEL no inventário)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'O ID do novo equipamento substituto é obrigatório' })
  @IsUUID('4', { message: 'newEquipmentId deve ser um UUID válido' })
  newEquipmentId: string;

  @ApiPropertyOptional({
    description: 'Justificativa ou observação sobre a substituição do item avariado',
    example: 'Item original apresentou falha na inspeção prévia de retirada (avaria identificada).',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
