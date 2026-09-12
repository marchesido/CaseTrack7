import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProductionStage,
  ProductionStageType,
  StageStatus,
} from './entities/production-stage.entity';
import { Production, ProductionStatus } from './entities/production.entity';
import { MovementStatus } from './entities/production-equipment.entity';
import { UserRole } from '../users/entities/user.entity';
import { ProductionCompletionService } from './production-completion.service';

@Injectable()
export class ProductionStagesService {
  constructor(
    @InjectRepository(ProductionStage)
    private readonly stageRepo: Repository<ProductionStage>,

    @InjectRepository(Production)
    private readonly productionRepo: Repository<Production>,

    private readonly completionService: ProductionCompletionService,
  ) {}

  /**
   * Inicia o trabalho em uma etapa (PENDING -> IN_PROGRESS)
   */
  async startStage(
    productionId: string,
    stageId: string,
    user: { id: string; role: UserRole },
  ): Promise<ProductionStage> {
    const stage = await this.stageRepo.findOne({
      where: { id: stageId },
      relations: ['production', 'responsibleUser'],
    });

    if (!stage || stage.production?.id !== productionId) {
      throw new NotFoundException('Etapa não encontrada nesta produção');
    }

    if (user.role !== UserRole.ADMIN && stage.responsibleUser?.id !== user.id) {
      throw new ForbiddenException(
        'Apenas o responsável pela etapa ou um administrador pode iniciá-la',
      );
    }

    if (stage.status === StageStatus.PENDING) {
      stage.status = StageStatus.IN_PROGRESS;
      await this.stageRepo.save(stage);

      if (stage.production.status === ProductionStatus.SCHEDULED) {
        stage.production.status = ProductionStatus.IN_PROGRESS;
        await this.productionRepo.save(stage.production);
      }
    }

    return stage;
  }

  /**
   * Conclui uma etapa com validações estritas:
   * - B9/B13: A etapa de CAPTACAO só pode ser concluída se todos os equipamentos
   *   ativos (isActive === true) tiverem sido retirados (CHECKED_OUT ou devolvidos).
   * - Equipamentos inativos (isActive === false / substituídos) são ignorados.
   * - Dispara a verificação de auto-conclusão da produção via ProductionCompletionService.
   */
  async completeStage(
    productionId: string,
    stageId: string,
    user: { id: string; role: UserRole },
  ): Promise<{
    stage: ProductionStage;
    productionStatus: ProductionStatus;
    autoCompleted: boolean;
  }> {
    const stage = await this.stageRepo.findOne({
      where: { id: stageId },
      relations: [
        'production',
        'production.productionEquipments',
        'production.productionEquipments.equipment',
        'responsibleUser',
      ],
    });

    if (!stage || stage.production?.id !== productionId) {
      throw new NotFoundException('Etapa não encontrada nesta produção');
    }

    // Validação de permissão
    if (user.role !== UserRole.ADMIN && stage.responsibleUser?.id !== user.id) {
      throw new ForbiddenException(
        'Apenas o responsável pela etapa ou um administrador pode concluí-la',
      );
    }

    if (stage.status === StageStatus.COMPLETED) {
      return {
        stage,
        productionStatus: stage.production.status,
        autoCompleted: stage.production.status === ProductionStatus.COMPLETED,
      };
    }

    // Regra B9 & B13: Bloqueio da conclusão de Captação caso equipamentos ativos não tenham sido retirados
    if (stage.type === ProductionStageType.CAPTACAO) {
      const activeEquipments = (stage.production.productionEquipments || []).filter(
        (pe) => pe.isActive,
      );

      const hasUncheckedEquipment = activeEquipments.some(
        (pe) =>
          pe.movementStatus === MovementStatus.PENDING_CHECKOUT ||
          pe.movementStatus === MovementStatus.INSPECTION_FAILED,
      );

      if (hasUncheckedEquipment) {
        throw new UnprocessableEntityException(
          'Todos os equipamentos ativos/substitutos devem ser retirados antes de concluir a captação',
        );
      }
    }

    // Marca a etapa como concluída
    stage.status = StageStatus.COMPLETED;
    stage.completedAt = new Date();
    await this.stageRepo.save(stage);

    // Se produção estava SCHEDULED, avança para IN_PROGRESS
    if (stage.production.status === ProductionStatus.SCHEDULED) {
      stage.production.status = ProductionStatus.IN_PROGRESS;
      await this.productionRepo.save(stage.production);
    }

    // Dispara auto-conclusão da produção se todas as condições forem atendidas
    const completionResult = await this.completionService.checkAndAutoComplete(
      productionId,
    );

    return {
      stage,
      productionStatus:
        completionResult.production?.status || stage.production.status,
      autoCompleted: completionResult.autoCompleted,
    };
  }
}
