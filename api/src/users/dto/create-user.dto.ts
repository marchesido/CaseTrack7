import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;


  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 dígitos' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter no mínimo 1 letra maiúscula',
  })
  @Matches(/[\W_]/, {
    message: 'A senha deve conter no mínimo 1 caractere especial',
  })
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
