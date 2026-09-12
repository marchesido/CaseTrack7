import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { type Response } from 'express';
import { ContractsService } from './contracts.service';
import { SignContractDto } from './dto/sign-contract.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Contracts & Terms')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('production/:productionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gerar Termo de Cessão e Responsabilidade em PDF para uma Produção',
  })
  @ApiResponse({
    status: 201,
    description: 'Contrato/Termo gerado com sucesso em PDF.',
  })
  @ApiResponse({ status: 404, description: 'Produção não encontrada.' })
  generateProductionContract(@Param('productionId') productionId: string) {
    return this.contractsService.generateProductionContract(productionId);
  }

  @Get('production/:productionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar o Termo / Contrato mais recente vinculado à Produção',
  })
  @ApiResponse({ status: 200, description: 'Contrato retornado com sucesso.' })
  getContractByProduction(@Param('productionId') productionId: string) {
    return this.contractsService.getContractByProduction(productionId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de um Contrato por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes do contrato.' })
  @ApiResponse({ status: 404, description: 'Contrato não encontrado.' })
  getContractById(@Param('id', ParseIntPipe) id: number) {
    return this.contractsService.getContractById(id);
  }

  @Post(':id/sign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar assinatura digital / aceite do Termo de Responsabilidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Assinatura digital registrada com sucesso.',
  })
  @ApiResponse({ status: 400, description: 'Contrato cancelado ou inválido.' })
  @ApiResponse({ status: 404, description: 'Contrato não encontrado.' })
  signContract(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SignContractDto,
  ) {
    return this.contractsService.signContract(id, dto);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Download ou visualização direta do arquivo PDF do Contrato',
  })
  @ApiResponse({ status: 200, description: 'Stream do arquivo PDF.' })
  @ApiResponse({ status: 404, description: 'Arquivo PDF não encontrado.' })
  async downloadContract(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const filePath = await this.contractsService.getPdfFilePath(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="termo-responsabilidade-${id}.pdf"`,
    );
    res.sendFile(filePath);
  }
}
