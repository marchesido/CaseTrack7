import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('upload')
export class UploadController {
  @Post()
  @Roles(UserRole.ADMIN, UserRole.FREELANCER)
  @ApiOperation({
    summary:
      'Fazer upload seguro de arquivo de imagem (.jpg, .jpeg, .png, .webp)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Arquivo de imagem nos formatos .jpg, .jpeg, .png ou .webp (máx. 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Upload realizado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Arquivo inválido, extensão não permitida (.jpg, .jpeg, .png, .webp) ou limite de tamanho excedido.',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado (Token JWT ausente ou inválido).',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado (perfil sem permissão para upload).',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // Limite estrito de 5MB
      },
      fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
        if (!file || !file.originalname) {
          return cb(
            new BadRequestException('Arquivo inválido ou não fornecido.'),
            false,
          );
        }

        // 1. Extração explícita da extensão original do arquivo
        const ext = extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

        // 2. Validação estrita da extensão (.jpg, .jpeg, .png, .webp)
        if (!allowedExtensions.includes(ext)) {
          return cb(
            new BadRequestException(
              'Extensão de arquivo inválida. Apenas arquivos .jpg, .jpeg, .png e .webp são permitidos.',
            ),
            false,
          );
        }

        // 3. Validação complementar de segurança por MIME type
        if (!file.mimetype || !file.mimetype.match(/\/(jpg|jpeg|png|webp)$/i)) {
          return cb(
            new BadRequestException(
              'Tipo MIME inválido. O arquivo deve ser uma imagem válida (jpg, jpeg, png, webp).',
            ),
            false,
          );
        }

        cb(null, true);
      },
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // Prevenção de colisão de nomes com UUID v4 e preservação da extensão validada
          const ext = extname(file.originalname).toLowerCase();
          const uniqueName = `${uuidv4()}${ext}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado ou arquivo inválido.',
      );
    }
    return {
      message: 'Upload realizado com sucesso',
      filePath: file.path,
      filename: file.filename,
      url: `/uploads/${file.filename}`,
    };
  }
}
