import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductionEquipment } from './production-equipment.entity';
import { User } from '../../users/entities/user.entity';
import { Damage } from '../../damages/entities/damage.entity';

export enum EquipmentMovementType {
  CHECKOUT = 'CHECKOUT',
  CHECKIN = 'CHECKIN',
  INSPECTION_FAILED = 'INSPECTION_FAILED',
}

export enum EquipmentCondition {
  OK = 'OK',
  DAMAGED = 'DAMAGED',
}

@Entity('equipment_movements')
export class EquipmentMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EquipmentMovementType,
  })
  type: EquipmentMovementType;

  @Column({
    type: 'enum',
    enum: EquipmentCondition,
    default: EquipmentCondition.OK,
  })
  condition: EquipmentCondition;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @ManyToOne(() => ProductionEquipment, (pe) => pe.movements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'production_equipment_id' })
  productionEquipment: ProductionEquipment;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @ManyToOne(() => Damage, { nullable: true, eager: true })
  @JoinColumn({ name: 'damage_id' })
  damage: Damage | null;

  @CreateDateColumn()
  createdAt: Date;
}
