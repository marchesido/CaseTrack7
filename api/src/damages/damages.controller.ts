import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import * as fs from 'fs';
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
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: './uploads/damages',
        filename: (req, file, cb) => {
          // Extrai a extensão original ou deriva do mimetype seguro
          let ext = extname(file.originalname).toLowerCase();
          if (!ext || ext === '.') {
            if (file.mimetype === 'image/png') ext = '.png';
            else if (file.mimetype === 'image/webp') ext = '.webp';
            else ext = '.jpg';
          }
          // Prevenção de colisão de nomes com UUID v4
          const uniqueName = `${randomUUID()}${ext}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limite por foto
        files: 4, // Máximo 4 imagens por laudo
      },
      fileFilter: (req, file, cb) => {
        // Validação estrita de extensão/tipo MIME seguro (JPG, PNG, WEBP)
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/i)) {
          return cb(new BadRequestException('Apenas imagens (JPG, PNG ou WEBP) são permitidas!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Body() createDamageDto: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Pelo menos uma imagem da avaria é obrigatória!');
    }

    if (files.length > 4) {
      // Limpeza imediata se o Multer tiver recebido mais de 4
      await Promise.all(
        files.map((file) =>
          fs.promises.unlink(file.path).catch(() => {}),
        ),
      );
      throw new BadRequestException('É permitido anexar no máximo 4 imagens por avaria!');
    }

    const imageUrls = files.map((file) => `/uploads/damages/${file.filename}`);

    try {
      return await this.damagesService.create(createDamageDto, imageUrls);
    } catch (error) {
      // Rollback físico: remove arquivos órfãos do disco caso a persistência falhe
      await Promise.all(
        files.map((file) =>
          fs.promises.unlink(file.path).catch((unlinkErr) =>
            console.warn(`[DamagesController] Falha no rollback do arquivo órfão ${file.path}:`, unlinkErr),
          ),
        ),
      );
      throw error;
    }
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
