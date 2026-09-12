import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectGoogleDto {
  @ApiProperty({
    description: 'Código de autorização OAuth2 retornado pelo Google após o consentimento do usuário.',
    example: '4/0AVHEtk45x...',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
