import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Production, ProductionStatus } from './entities/production.entity';
import { StageStatus } from './entities/production-stage.entity';
import { MovementStatus } from './entities/production-equipment.entity';

@Injectable()
export class ProductionCompletionService {
  constructor(
    @InjectRepository(Production)
    private readonly productionRepo: Repository<Production>,
  ) {}

  /**
   * DP-4 & B13: Verifica e auto-conclui a produção quando:
   * 1. Todas as 4 etapas estiverem COMPLETED.
   * 2. Todos os equipamentos ATIVOS (isActive === true) estiverem devolvidos (RETURNED_OK ou RETURNED_DAMAGED).
   * Itens inativos (isActive === false / substituídos) são ignorados para não travar a produção.
   */
  async checkAndAutoComplete(
    productionId: string,
  ): Promise<{ autoCompleted: boolean; production: Production | null }> {
    const production = await this.productionRepo.findOne({
      where: { id: productionId },
      relations: ['stages', 'productionEquipments'],
    });

    if (!production || production.status === ProductionStatus.COMPLETED) {
      return { autoCompleted: false, production };
    }

    // 1. Todas as etapas concluídas
    const allStagesCompleted =
      production.stages &&
      production.stages.length >= 4 &&
      production.stages.every((s) => s.status === StageStatus.COMPLETED);

    if (!allStagesCompleted) {
      return { autoCompleted: false, production };
    }

    // 2. Todos os equipamentos ativos devolvidos
    const activeEquipments = (production.productionEquipments || []).filter(
      (pe) => pe.isActive,
    );

    const allActiveReturned = activeEquipments.every(
      (pe) =>
        pe.movementStatus === MovementStatus.RETURNED_OK ||
        pe.movementStatus === MovementStatus.RETURNED_DAMAGED,
    );

    if (!allActiveReturned) {
      return { autoCompleted: false, production };
    }

    // Auto-conclusão confirmada
    production.status = ProductionStatus.COMPLETED;
    const saved = await this.productionRepo.save(production);

    return { autoCompleted: true, production: saved };
  }
}
