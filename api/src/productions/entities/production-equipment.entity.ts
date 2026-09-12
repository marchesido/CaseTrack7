import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Production } from './production.entity';
import { Equipment } from '../../equipments/entities/equipment.entity';
import { EquipmentMovement } from './equipment-movement.entity';

export enum MovementStatus {
  PENDING_CHECKOUT = 'PENDING_CHECKOUT',
  CHECKED_OUT = 'CHECKED_OUT',
  RETURNED_OK = 'RETURNED_OK',
  RETURNED_DAMAGED = 'RETURNED_DAMAGED',
  INSPECTION_FAILED = 'INSPECTION_FAILED',
}

@Entity('production_equipments')
export class ProductionEquipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MovementStatus,
    default: MovementStatus.PENDING_CHECKOUT,
  })
  movementStatus: MovementStatus;

  /**
   * Indica se o equipamento é obrigatório e ativo no fluxo operacional atual.
   * Ao ser substituído após falha na inspeção, passa a false, mantendo todo o histórico.
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true })
  substitutedAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  substitutedById: string | null;

  @Column({ type: 'text', nullable: true })
  substitutionReason: string | null;

  @ManyToOne(() => Production, (production) => production.productionEquipments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'production_id' })
  production: Production;

  @ManyToOne(() => Equipment, { eager: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @OneToMany(() => EquipmentMovement, (movement) => movement.productionEquipment, {
    cascade: true,
  })
  movements: EquipmentMovement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
