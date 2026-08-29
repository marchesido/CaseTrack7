import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { DamagesService } from './damages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('damages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DamagesController {
  constructor(private readonly damagesService: DamagesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.FREELANCER) // Ambos podem reportar avaria
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/damages',
        filename: (req, file, cb) => {
          // Prevenção de colisão de nomes
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limite de tamanho
      },
      fileFilter: (req, file, cb) => {
        // Validação de extensão/tipo de arquivo
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Apenas imagens (JPG/PNG) são permitidas!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Body() createDamageDto: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('A imagem da avaria é obrigatória!');
    }
    const imageUrl = `/uploads/damages/${file.filename}`;
    return this.damagesService.create(createDamageDto, imageUrl);
  }

  @Get()
  findAll() {
    return this.damagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.damagesService.findOne(+id);
  }
}
