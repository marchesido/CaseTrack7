import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GoogleCalendarService } from './google-calendar.service';
import { ConnectGoogleDto } from './dto/connect-google.dto';

@ApiTags('Productions Google Calendar')
@Controller('productions')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('google/auth-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter URL para autenticação e consentimento OAuth2 do Google Calendar' })
  @ApiResponse({ status: 200, description: 'URL de consentimento gerada com sucesso.' })
  getAuthUrl() {
    return this.googleCalendarService.getAuthUrl();
  }

  @Post('google/connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Conectar ao Google Calendar via código de autorização OAuth2' })
  @ApiResponse({ status: 200, description: 'Google Calendar conectado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Código inválido ou expirado.' })
  connect(@Body() dto: ConnectGoogleDto) {
    return this.googleCalendarService.handleCallback(dto.code);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Endpoint de callback HTTP para redirecionamento OAuth2 do Google' })
  async callback(@Query('code') code: string) {
    if (!code) {
      return { message: 'Código de autorização não fornecido.' };
    }
    return this.googleCalendarService.handleCallback(code);
  }

  @Get('google/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar status da conexão global do Google Calendar' })
  @ApiResponse({ status: 200, description: 'Status retornado com sucesso.' })
  getStatus() {
    return this.googleCalendarService.getConnectionStatus();
  }

  @Post('google/disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desconectar conta Google Calendar do CaseTrack' })
  @ApiResponse({ status: 200, description: 'Desconectado com sucesso.' })
  disconnect() {
    return this.googleCalendarService.disconnect();
  }

  @Post(':id/sync-google')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincronizar produção e cronograma de diárias com o Google Calendar' })
  @ApiResponse({ status: 200, description: 'Produção sincronizada no Google Calendar com sucesso.' })
  @ApiResponse({ status: 404, description: 'Produção não encontrada.' })
  @ApiResponse({ status: 424, description: 'Reconexão com o Google necessária (GOOGLE_RECONNECT_REQUIRED).' })
  syncProduction(@Param('id') id: string) {
    return this.googleCalendarService.syncProduction(id);
  }
}
