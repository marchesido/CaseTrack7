import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { ProductionStagesService } from './production-stages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Production Stages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productions/:id/stages')
export class ProductionStagesController {
  constructor(private readonly stagesService: ProductionStagesService) {}

  @Patch(':stageId/start')
  @ApiOperation({ summary: 'Iniciar o andamento de uma etapa (PENDING -> IN_PROGRESS)' })
  @ApiResponse({ status: 200, description: 'Etapa iniciada com sucesso' })
  @ApiResponse({ status: 403, description: 'Não autorizado para esta etapa' })
  @ApiResponse({ status: 404, description: 'Etapa ou produção não encontrada' })
  startStage(
    @Param('id') productionId: string,
    @Param('stageId') stageId: string,
    @Request() req: any,
  ) {
    return this.stagesService.startStage(productionId, stageId, req.user);
  }

  @Post(':stageId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Concluir uma etapa da produção com verificação de retirada de equipamentos na Captação e auto-conclusão',
  })
  @ApiResponse({ status: 200, description: 'Etapa concluída com sucesso' })
  @ApiResponse({
    status: 422,
    description: 'Todos os equipamentos ativos/substitutos devem ser retirados antes de concluir a captação',
  })
  @ApiResponse({ status: 403, description: 'Não autorizado para esta etapa' })
  @ApiResponse({ status: 404, description: 'Etapa ou produção não encontrada' })
  completeStage(
    @Param('id') productionId: string,
    @Param('stageId') stageId: string,
    @Request() req: any,
  ) {
    return this.stagesService.completeStage(productionId, stageId, req.user);
  }
}
