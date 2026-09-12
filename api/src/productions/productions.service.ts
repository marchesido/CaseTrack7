import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Production,
  ProductionStatus,
  GoogleSourceStatus,
} from './entities/production.entity';
import {
  ProductionStage,
  ProductionStageType,
  StageStatus,
} from './entities/production-stage.entity';
import {
  ProductionEquipment,
  MovementStatus,
} from './entities/production-equipment.entity';
import { Equipment, EquipmentStatus } from '../equipments/entities/equipment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { SubstituteEquipmentDto } from './dto/substitute-equipment.dto';
import { QueryProductionsDto } from './dto/query-productions.dto';

@Injectable()
export class ProductionsService {
  constructor(
    @InjectRepository(Production)
    private readonly productionRepo: Repository<Production>,

    @InjectRepository(ProductionStage)
    private readonly stageRepo: Repository<ProductionStage>,

    @InjectRepository(ProductionEquipment)
    private readonly prodEquipmentRepo: Repository<ProductionEquipment>,

    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Cria uma nova produção com suas 4 etapas sequenciais obrigatórias
   * e associa os equipamentos solicitados.
   */
  async create(dto: CreateProductionDto): Promise<Production> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Criar entidade Production
      const production = this.productionRepo.create({
        title: dto.title,
        description: dto.description || null,
        scheduledAt: new Date(dto.scheduledAt),
        scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null,
        isAllDay: dto.isAllDay ?? false,
        timezone: dto.timezone || 'America/Sao_Paulo',
        status: ProductionStatus.SCHEDULED,
        googleSourceStatus: GoogleSourceStatus.ACTIVE,
        syncOverrides: {
          scheduledAt: false,
          scheduledEndAt: false,
          description: false,
          assignee_capture: false,
          assignee_editing: false,
          assignee_backup: false,
          assignee_upload: false,
          equipments: false,
        },
      });

      const savedProduction = await queryRunner.manager.save(Production, production);

      // 2. Resolver responsáveis das etapas se fornecidos
      const stagesConfig = [
        {
          type: ProductionStageType.CAPTACAO,
          order: 1,
          userId: dto.assignees?.captureResponsibleUserId,
        },
        {
          type: ProductionStageType.EDICAO,
          order: 2,
          userId: dto.assignees?.editingResponsibleUserId,
        },
        {
          type: ProductionStageType.BACKUP,
          order: 3,
          userId: dto.assignees?.backupResponsibleUserId,
        },
        {
          type: ProductionStageType.UPLOAD,
          order: 4,
          userId: dto.assignees?.uploadResponsibleUserId,
        },
      ];

      for (const sc of stagesConfig) {
        let responsibleUser: User | null = null;
        if (sc.userId) {
          responsibleUser = await queryRunner.manager.findOne(User, {
            where: { id: sc.userId },
          });
        }

        const stage = this.stageRepo.create({
          production: savedProduction,
          type: sc.type,
          order: sc.order,
          status: StageStatus.PENDING,
          responsibleUser,
        });

        await queryRunner.manager.save(ProductionStage, stage);
      }

      // 3. Vincular equipamentos com status PENDING_CHECKOUT e isActive = true
      if (dto.equipmentIds && dto.equipmentIds.length > 0) {
        for (const eqId of dto.equipmentIds) {
          const equipment = await queryRunner.manager.findOne(Equipment, {
            where: { id: eqId },
          });

          if (equipment) {
            const prodEq = this.prodEquipmentRepo.create({
              production: savedProduction,
              equipment,
              movementStatus: MovementStatus.PENDING_CHECKOUT,
              isActive: true,
            });
            await queryRunner.manager.save(ProductionEquipment, prodEq);
          }
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedProduction.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lista produções com filtros (data, status, busca) e filtragem de perfil.
   */
  async findAll(query: QueryProductionsDto, user?: { id: string; role: UserRole }): Promise<Production[]> {
    const qb = this.productionRepo
      .createQueryBuilder('production')
      .leftJoinAndSelect('production.stages', 'stage')
      .leftJoinAndSelect('stage.responsibleUser', 'responsibleUser')
      .leftJoinAndSelect('production.productionEquipments', 'prodEq')
      .leftJoinAndSelect('prodEq.equipment', 'equipment')
      .orderBy('production.scheduledAt', 'ASC')
      .addOrderBy('stage.order', 'ASC');

    // Se freelancer, exibe apenas produções em que ele é responsável por alguma etapa
    if (user && user.role === UserRole.FREELANCER) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM production_stages ps WHERE ps.production_id = production.id AND ps.responsible_user_id = :userId)',
        { userId: user.id },
      );
    }

    if (query.status) {
      qb.andWhere('production.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(production.title LIKE :search OR production.description LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.date) {
      qb.andWhere('DATE(production.scheduledAt) = :date', { date: query.date });
    }

    return qb.getMany();
  }

  /**
   * Busca detalhes completos de uma produção
   */
  async findOne(id: string, user?: { id: string; role: UserRole }): Promise<Production> {
    const production = await this.productionRepo.findOne({
      where: { id },
      relations: [
        'stages',
        'stages.responsibleUser',
        'productionEquipments',
        'productionEquipments.equipment',
        'productionEquipments.movements',
        'productionEquipments.movements.operator',
        'productionEquipments.movements.damage',
      ],
      order: {
        stages: {
          order: 'ASC',
        },
      },
    });

    if (!production) {
      throw new NotFoundException(`Produção com ID ${id} não encontrada`);
    }

    // Se freelancer, valida se tem acesso
    if (user && user.role === UserRole.FREELANCER) {
      const isAssigned = production.stages?.some(
        (s) => s.responsibleUser?.id === user.id,
      );
      if (!isAssigned) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar esta produção',
        );
      }
    }

    return production;
  }

  /**
   * Atualização de dados da produção pelo gestor
   */
  async update(id: string, dto: UpdateProductionDto): Promise<Production> {
    const production = await this.findOne(id);

    // Rastreia overrides caso a produção tenha sido importada do Google
    if (production.googleCalendarId) {
      const overrides = production.syncOverrides || {};
      if (dto.title !== undefined) overrides.description = true; // flag geral de texto
      if (dto.scheduledAt !== undefined) overrides.scheduledAt = true;
      if (dto.scheduledEndAt !== undefined) overrides.scheduledEndAt = true;
      if (dto.description !== undefined) overrides.description = true;
      production.syncOverrides = overrides;
    }

    if (dto.title !== undefined) production.title = dto.title;
    if (dto.description !== undefined) production.description = dto.description;
    if (dto.scheduledAt !== undefined) production.scheduledAt = new Date(dto.scheduledAt);
    if (dto.scheduledEndAt !== undefined)
      production.scheduledEndAt = dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null;
    if (dto.isAllDay !== undefined) production.isAllDay = dto.isAllDay;
    if (dto.timezone !== undefined) production.timezone = dto.timezone;
    if (dto.status !== undefined) production.status = dto.status;

    // Atualização dos responsáveis das etapas se fornecido
    if (dto.assignees) {
      const stageMappings: { type: ProductionStageType; userId?: string; overrideKey: string }[] = [
        {
          type: ProductionStageType.CAPTACAO,
          userId: dto.assignees.captureResponsibleUserId,
          overrideKey: 'assignee_capture',
        },
        {
          type: ProductionStageType.EDICAO,
          userId: dto.assignees.editingResponsibleUserId,
          overrideKey: 'assignee_editing',
        },
        {
          type: ProductionStageType.BACKUP,
          userId: dto.assignees.backupResponsibleUserId,
          overrideKey: 'assignee_backup',
        },
        {
          type: ProductionStageType.UPLOAD,
          userId: dto.assignees.uploadResponsibleUserId,
          overrideKey: 'assignee_upload',
        },
      ];

      for (const map of stageMappings) {
        if (map.userId !== undefined) {
          const stage = production.stages?.find((s) => s.type === map.type);
          if (stage) {
            if (map.userId) {
              const user = await this.userRepo.findOne({ where: { id: map.userId } });
              stage.responsibleUser = user || null;
            } else {
              stage.responsibleUser = null;
            }
            await this.stageRepo.save(stage);

            if (production.googleCalendarId) {
              if (!production.syncOverrides) production.syncOverrides = {};
              (production.syncOverrides as any)[map.overrideKey] = true;
            }
          }
        }
      }
    }

    await this.productionRepo.save(production);
    return this.findOne(id);
  }

  /**
   * Cancelamento lógico da produção
   */
  async remove(id: string): Promise<Production> {
    const production = await this.findOne(id);
    production.status = ProductionStatus.CANCELLED;
    return this.productionRepo.save(production);
  }

  /**
   * "Minhas Pendências": Retorna etapas pendentes e devoluções pendentes
   * para o usuário autenticado.
   */
  async findMyPending(userId: string): Promise<{
    pendingStages: ProductionStage[];
    pendingReturns: ProductionEquipment[];
  }> {
    // 1. Etapas sob responsabilidade do usuário que não estão concluídas
    const pendingStages = await this.stageRepo
      .createQueryBuilder('stage')
      .innerJoinAndSelect('stage.production', 'production')
      .leftJoinAndSelect('stage.responsibleUser', 'responsibleUser')
      .where('responsibleUser.id = :userId', { userId })
      .andWhere('stage.status != :completedStatus', {
        completedStatus: StageStatus.COMPLETED,
      })
      .andWhere('production.status != :cancelledStatus', {
        cancelledStatus: ProductionStatus.CANCELLED,
      })
      .orderBy('production.scheduledAt', 'ASC')
      .getMany();

    // 2. Devoluções pendentes: equipamentos CHECKED_OUT ativos em produções onde o usuário é responsável pela CAPTACAO
    const pendingReturns = await this.prodEquipmentRepo
      .createQueryBuilder('prodEq')
      .innerJoinAndSelect('prodEq.production', 'production')
      .innerJoinAndSelect('prodEq.equipment', 'equipment')
      .innerJoin(
        'production.stages',
        'stage',
        'stage.type = :captureType AND stage.responsible_user_id = :userId',
        { captureType: ProductionStageType.CAPTACAO, userId },
      )
      .where('prodEq.movementStatus = :checkedOut', {
        checkedOut: MovementStatus.CHECKED_OUT,
      })
      .andWhere('prodEq.isActive = :isActive', { isActive: true })
      .andWhere('production.status != :cancelledStatus', {
        cancelledStatus: ProductionStatus.CANCELLED,
      })
      .getMany();

    return {
      pendingStages,
      pendingReturns,
    };
  }

  /**
   * B13 / Critério Mandatório: Substituição de Equipamento Avariado pelo Gestor (ADMIN)
   * - Inativa o ProductionEquipment antigo (isActive = false), mantendo todo o histórico
   * - Cria um novo ProductionEquipment com o equipamento substituto (isActive = true, PENDING_CHECKOUT)
   */
  async substituteEquipment(
    productionId: string,
    peId: string,
    dto: SubstituteEquipmentDto,
  ): Promise<ProductionEquipment> {
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

    // Busca o novo equipamento solicitado
    const newEquipment = await this.equipmentRepo.findOne({
      where: { id: dto.newEquipmentId },
    });

    if (!newEquipment) {
      throw new NotFoundException('Novo equipamento substituto não encontrado no inventário');
    }

    // Valida se o novo equipamento está DISPONIVEL
    if (newEquipment.status !== EquipmentStatus.DISPONIVEL) {
      throw new UnprocessableEntityException(
        `O equipamento substituto não está disponível (status atual: ${newEquipment.status}). Selecione um equipamento DISPONIVEL.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Inativa o equipamento anterior sem apagar histórico
      prodEquipment.isActive = false;
      prodEquipment.substitutedAt = new Date();
      prodEquipment.substitutedById = newEquipment.id;
      prodEquipment.substitutionReason =
        dto.reason || 'Equipamento avariado substituído pelo gestor';
      await queryRunner.manager.save(ProductionEquipment, prodEquipment);

      // 2. Cria o novo registro ativo
      const replacement = this.prodEquipmentRepo.create({
        production: prodEquipment.production,
        equipment: newEquipment,
        isActive: true,
        movementStatus: MovementStatus.PENDING_CHECKOUT,
      });
      const savedReplacement = await queryRunner.manager.save(
        ProductionEquipment,
        replacement,
      );

      await queryRunner.commitTransaction();

      // Recarrega o substituto com relações
      return this.prodEquipmentRepo.findOne({
        where: { id: savedReplacement.id },
        relations: ['equipment', 'production'],
      }) as Promise<ProductionEquipment>;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
