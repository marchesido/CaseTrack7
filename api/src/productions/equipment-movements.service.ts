import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProductionEquipment,
  MovementStatus,
} from './entities/production-equipment.entity';
import {
  EquipmentMovement,
  EquipmentMovementType,
  EquipmentCondition,
} from './entities/equipment-movement.entity';
import { Equipment, EquipmentStatus } from '../equipments/entities/equipment.entity';
import { Damage } from '../damages/entities/damage.entity';
import { User } from '../users/entities/user.entity';
import { CheckoutEquipmentDto } from './dto/checkout-equipment.dto';
import { CheckinEquipmentDto } from './dto/checkin-equipment.dto';
import { ProductionCompletionService } from './production-completion.service';

@Injectable()
export class EquipmentMovementsService {
  constructor(
    @InjectRepository(ProductionEquipment)
    private readonly prodEquipmentRepo: Repository<ProductionEquipment>,

    @InjectRepository(EquipmentMovement)
    private readonly movementRepo: Repository<EquipmentMovement>,

    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,

    @InjectRepository(Damage)
    private readonly damageRepo: Repository<Damage>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly completionService: ProductionCompletionService,
  ) {}

  /**
   * DP-3, B5 & B13: Realiza o checkout do equipamento ou aborta em caso de falha na inspeção
   */
  async checkout(
    productionId: string,
    peId: string,
    dto: CheckoutEquipmentDto,
    operatorUser: { id: string },
  ) {
    const prodEquipment = await this.prodEquipmentRepo.findOne({
      where: { id: peId },
      relations: ['production', 'equipment'],
    });

    if (!prodEquipment) {
      throw new NotFoundException(`Item de produção com ID ${peId} não encontrado`);
    }

    if (prodEquipment.production?.id !== productionId) {
      throw new BadRequestException('O equipamento não pertence à produção informada');
    }

    const equipment = prodEquipment.equipment;

    // Regra DP-3: Equipamento em MANUTENCAO não pode ser retirado de forma alguma
    if (equipment.status === EquipmentStatus.MANUTENCAO) {
      throw new UnprocessableEntityException(
        'Equipamento em manutenção — solicite substituição ao gestor',
      );
    }

    if (prodEquipment.movementStatus !== MovementStatus.PENDING_CHECKOUT) {
      throw new BadRequestException(
        `Equipamento não está aguardando retirada (status atual: ${prodEquipment.movementStatus})`,
      );
    }

    const operator = await this.userRepo.findOne({ where: { id: operatorUser.id } });
    if (!operator) {
      throw new NotFoundException('Operador não encontrado');
    }

    // Cenário de Avaria na Inspeção de Retirada (B5 & B13)
    if (dto.condition === EquipmentCondition.DAMAGED) {
      if (!dto.damageId) {
        throw new BadRequestException(
          'damageId é obrigatório quando há avaria identificada na inspeção de retirada',
        );
      }

      const damage = await this.damageRepo.findOne({
        where: { id: dto.damageId },
        relations: ['equipment'],
      });

      if (!damage) {
        throw new BadRequestException('Registro de avaria informado não encontrado');
      }

      if (damage.equipment?.id !== equipment.id) {
        throw new BadRequestException('A avaria informada não pertence a este equipamento');
      }

      // 1. Registra movimentação de tipo INSPECTION_FAILED
      const movement = this.movementRepo.create({
        type: EquipmentMovementType.INSPECTION_FAILED,
        condition: EquipmentCondition.DAMAGED,
        notes: dto.notes || null,
        productionEquipment: prodEquipment,
        operator,
        damage,
      });
      await this.movementRepo.save(movement);

      // 2. Marca o ProductionEquipment com INSPECTION_FAILED
      prodEquipment.movementStatus = MovementStatus.INSPECTION_FAILED;
      await this.prodEquipmentRepo.save(prodEquipment);

      // 3. Atualiza o status do equipamento no inventário para MANUTENCAO
      equipment.status = EquipmentStatus.MANUTENCAO;
      await this.equipmentRepo.save(equipment);

      // 4. Checkout NÃO é concluído. Retorna 422 estruturado conforme B13
      throw new UnprocessableEntityException({
        error: 'INSPECTION_FAILED',
        message:
          'Equipamento reprovado na inspeção e enviado para MANUTENCAO. Solicite a substituição do item ao gestor.',
        damageId: dto.damageId,
        equipmentId: equipment.id,
      });
    }

    // Cenário Normal: Checkout OK
    const movement = this.movementRepo.create({
      type: EquipmentMovementType.CHECKOUT,
      condition: EquipmentCondition.OK,
      notes: dto.notes || null,
      productionEquipment: prodEquipment,
      operator,
      damage: null,
    });
    await this.movementRepo.save(movement);

    prodEquipment.movementStatus = MovementStatus.CHECKED_OUT;
    await this.prodEquipmentRepo.save(prodEquipment);

    equipment.status = EquipmentStatus.EM_USO;
    await this.equipmentRepo.save(equipment);

    return {
      message: 'Checkout efetuado com sucesso',
      productionEquipment: prodEquipment,
    };
  }

  /**
   * B5: Realiza o checkin (devolução) do equipamento
   */
  async checkin(
    productionId: string,
    peId: string,
    dto: CheckinEquipmentDto,
    operatorUser: { id: string },
  ) {
    const prodEquipment = await this.prodEquipmentRepo.findOne({
      where: { id: peId },
      relations: ['production', 'equipment'],
    });

    if (!prodEquipment) {
      throw new NotFoundException(`Item de produção com ID ${peId} não encontrado`);
    }

    if (prodEquipment.production?.id !== productionId) {
      throw new BadRequestException('O equipamento não pertence à produção informada');
    }

    if (prodEquipment.movementStatus !== MovementStatus.CHECKED_OUT) {
      throw new BadRequestException(
        `Apenas equipamentos retirados (CHECKED_OUT) podem ser devolvidos. Status atual: ${prodEquipment.movementStatus}`,
      );
    }

    const equipment = prodEquipment.equipment;
    const operator = await this.userRepo.findOne({ where: { id: operatorUser.id } });
    if (!operator) {
      throw new NotFoundException('Operador não encontrado');
    }

    let damage: Damage | null = null;

    if (dto.condition === EquipmentCondition.DAMAGED) {
      if (!dto.damageId) {
        throw new BadRequestException(
          'damageId é obrigatório quando o equipamento for devolvido com avaria',
        );
      }

      damage = await this.damageRepo.findOne({
        where: { id: dto.damageId },
        relations: ['equipment'],
      });

      if (!damage) {
        throw new BadRequestException('Registro de avaria informado não encontrado');
      }

      if (damage.equipment?.id !== equipment.id) {
        throw new BadRequestException('A avaria informada não pertence a este equipamento');
      }

      // Atualiza movimentação para RETURNED_DAMAGED e equipamento para MANUTENCAO
      prodEquipment.movementStatus = MovementStatus.RETURNED_DAMAGED;
      equipment.status = EquipmentStatus.MANUTENCAO;
    } else {
      // Devolução OK
      prodEquipment.movementStatus = MovementStatus.RETURNED_OK;
      equipment.status = EquipmentStatus.DISPONIVEL;
    }

    const movement = this.movementRepo.create({
      type: EquipmentMovementType.CHECKIN,
      condition: dto.condition,
      notes: dto.notes || null,
      productionEquipment: prodEquipment,
      operator,
      damage,
    });

    await this.movementRepo.save(movement);
    await this.prodEquipmentRepo.save(prodEquipment);
    await this.equipmentRepo.save(equipment);

    // Dispara checagem de auto-conclusão da produção se todos os itens foram devolvidos
    const completionResult = await this.completionService.checkAndAutoComplete(
      productionId,
    );

    return {
      message:
        dto.condition === EquipmentCondition.DAMAGED
          ? 'Devolução registrada com avaria (equipamento enviado para manutenção)'
          : 'Devolução registrada com sucesso (equipamento disponível)',
      productionEquipment: prodEquipment,
      autoCompleted: completionResult.autoCompleted,
    };
  }

  /**
   * Histórico de movimentações de um equipamento específico dentro da produção
   */
  async getMovements(productionId: string, peId: string) {
    const prodEquipment = await this.prodEquipmentRepo.findOne({
      where: { id: peId },
      relations: ['production'],
    });

    if (!prodEquipment || prodEquipment.production?.id !== productionId) {
      throw new NotFoundException('Equipamento não encontrado nesta produção');
    }

    return this.movementRepo.find({
      where: { productionEquipment: { id: peId } },
      relations: ['operator', 'damage'],
      order: { timestamp: 'DESC' },
    });
  }
}
