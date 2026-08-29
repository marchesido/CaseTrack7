import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'O e-mail do usuário',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'admin123', description: 'A senha do usuário' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
