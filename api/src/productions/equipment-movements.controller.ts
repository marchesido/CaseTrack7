import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EquipmentMovementsService } from './equipment-movements.service';
import { CheckoutEquipmentDto } from './dto/checkout-equipment.dto';
import { CheckinEquipmentDto } from './dto/checkin-equipment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Equipment Movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productions/:id/equipments/:peId')
export class EquipmentMovementsController {
  constructor(private readonly movementsService: EquipmentMovementsService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Realizar checkout (retirada) do equipamento ou registrar reprovação por avaria na inspeção',
  })
  @ApiResponse({ status: 200, description: 'Checkout efetuado com sucesso (status EM_USO)' })
  @ApiResponse({
    status: 422,
    description:
      'Equipamento em manutenção ou reprovado na inspeção prévia (INSPECTION_FAILED). Solicite substituição ao gestor.',
  })
  @ApiResponse({ status: 400, description: 'damageId ausente quando condition=DAMAGED ou status inválido' })
  @ApiResponse({ status: 404, description: 'Produção ou equipamento não encontrado' })
  checkout(
    @Param('id') productionId: string,
    @Param('peId') peId: string,
    @Body() dto: CheckoutEquipmentDto,
    @Request() req: any,
  ) {
    return this.movementsService.checkout(productionId, peId, dto, req.user);
  }

  @Post('checkin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Realizar checkin (devolução) do equipamento (com verificação de avaria e disparo de auto-conclusão)',
  })
  @ApiResponse({
    status: 200,
    description: 'Devolução realizada com sucesso (DISPONIVEL ou MANUTENCAO se DAMAGED)',
  })
  @ApiResponse({ status: 400, description: 'damageId ausente quando condition=DAMAGED ou status não é CHECKED_OUT' })
  @ApiResponse({ status: 404, description: 'Produção ou equipamento não encontrado' })
  checkin(
    @Param('id') productionId: string,
    @Param('peId') peId: string,
    @Body() dto: CheckinEquipmentDto,
    @Request() req: any,
  ) {
    return this.movementsService.checkin(productionId, peId, dto, req.user);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Obter histórico de movimentações e inspeções deste equipamento na produção' })
  @ApiResponse({ status: 200, description: 'Histórico de movimentações ordenadas por data decrescente' })
  getMovements(@Param('id') productionId: string, @Param('peId') peId: string) {
    return this.movementsService.getMovements(productionId, peId);
  }
}
