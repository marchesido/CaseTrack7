import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductionsService } from './productions.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { SubstituteEquipmentDto } from './dto/substitute-equipment.dto';
import { QueryProductionsDto } from './dto/query-productions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Productions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productions')
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar nova produção com etapas e equipamentos (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Produção criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Acesso negado (apenas ADMIN)' })
  create(@Body() createDto: CreateProductionDto) {
    return this.productionsService.create(createDto);
  }

  @Get('my/pending')
  @ApiOperation({
    summary: 'Listar pendências operacionais do usuário logado (etapas e devoluções)',
  })
  @ApiResponse({ status: 200, description: 'Objeto contendo pendingStages e pendingReturns' })
  findMyPending(@Request() req: any) {
    return this.productionsService.findMyPending(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar produções com filtros (data, status, busca)' })
  @ApiResponse({ status: 200, description: 'Lista de produções encontradas' })
  findAll(@Query() query: QueryProductionsDto, @Request() req: any) {
    return this.productionsService.findAll(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes completos de uma produção' })
  @ApiResponse({ status: 200, description: 'Detalhes da produção com etapas e equipamentos' })
  @ApiResponse({ status: 404, description: 'Produção não encontrada' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.productionsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar dados cadastrais da produção (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Produção atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Produção não encontrada' })
  update(@Param('id') id: string, @Body() updateDto: UpdateProductionDto) {
    return this.productionsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelamento lógico da produção (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Produção cancelada com sucesso' })
  @ApiResponse({ status: 404, description: 'Produção não encontrada' })
  remove(@Param('id') id: string) {
    return this.productionsService.remove(id);
  }

  @Patch(':id/equipments/:peId/substitute')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Substituir equipamento avariado na produção mantendo histórico e liberando o fluxo (ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipamento substituído com sucesso, novo item ativo criado',
  })
  @ApiResponse({
    status: 422,
    description: 'Equipamento substituto não está disponível para uso',
  })
  @ApiResponse({ status: 404, description: 'Produção ou equipamento não encontrado' })
  substituteEquipment(
    @Param('id') id: string,
    @Param('peId') peId: string,
    @Body() substituteDto: SubstituteEquipmentDto,
  ) {
    return this.productionsService.substituteEquipment(id, peId, substituteDto);
  }
}
