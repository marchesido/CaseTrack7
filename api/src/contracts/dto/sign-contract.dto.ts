import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignContractDto {
  @ApiProperty({
    description: 'Nome completo do signatário/responsável legal',
    example: 'Carlos Eduardo Mendes',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome do signatário é obrigatório.' })
  @MinLength(3, { message: 'O nome do signatário deve ter no mínimo 3 caracteres.' })
  signerName: string;

  @ApiProperty({
    description: 'Documento de identificação (CPF, CNPJ ou RG) do signatário',
    example: '123.456.789-00',
  })
  @IsString()
  @IsNotEmpty({ message: 'O documento do signatário é obrigatório.' })
  @MinLength(5, { message: 'O documento do signatário deve ter no mínimo 5 caracteres.' })
  signerDocument: string;
}
