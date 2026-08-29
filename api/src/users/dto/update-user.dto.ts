import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength, Matches } from 'class-validator';

// Para edição do próprio usuário, e-mail não pode ser alterado conforme a regra de negócios.
export class UpdateUserDto extends OmitType(CreateUserDto, [
  'email',
  'password',
] as const) {
  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 dígitos' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter no mínimo 1 letra maiúscula',
  })
  @Matches(/[\W_]/, {
    message: 'A senha deve conter no mínimo 1 caractere especial',
  })
  password?: string;
}
