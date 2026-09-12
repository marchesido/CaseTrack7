import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductionStage } from './production-stage.entity';
import { ProductionEquipment } from './production-equipment.entity';

export enum ProductionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum GoogleSourceStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  DELETED = 'DELETED',
}

export interface UnresolvedEmail {
  email: string;
  stageType: string;
}

export interface SyncOverrides {
  scheduledAt?: boolean;
  scheduledEndAt?: boolean;
  description?: boolean;
  assignee_capture?: boolean;
  assignee_editing?: boolean;
  assignee_backup?: boolean;
  assignee_upload?: boolean;
  equipments?: boolean;
}

export interface SyncConflict {
  field: string;
  googleValue: any;
  currentValue: any;
  detectedAt: string;
}

@Entity('productions')
@Index(['googleCalendarId', 'googleEventId'], { unique: true })
export class Production {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ProductionStatus,
    default: ProductionStatus.SCHEDULED,
  })
  status: ProductionStatus;

  @Column({
    type: 'enum',
    enum: GoogleSourceStatus,
    default: GoogleSourceStatus.ACTIVE,
  })
  googleSourceStatus: GoogleSourceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  googleCalendarId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  googleEventId: string | null;

  @Column({ type: 'datetime' })
  scheduledAt: Date;

  @Column({ type: 'datetime', nullable: true })
  scheduledEndAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isAllDay: boolean;

  @Column({ type: 'varchar', length: 50, default: 'America/Sao_Paulo' })
  timezone: string;

  @Column({ type: 'datetime', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: 'json', nullable: true })
  unresolvedEmails: UnresolvedEmail[] | null;

  @Column({
    type: 'json',
    nullable: true,
  })
  syncOverrides: SyncOverrides | null;

  @Column({ type: 'json', nullable: true })
  syncConflicts: SyncConflict[] | null;

  @OneToMany(() => ProductionStage, (stage) => stage.production, {
    cascade: true,
  })
  stages: ProductionStage[];

  @OneToMany(() => ProductionEquipment, (pe) => pe.production, {
    cascade: true,
  })
  productionEquipments: ProductionEquipment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
