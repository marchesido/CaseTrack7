import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Production } from './production.entity';
import { User } from '../../users/entities/user.entity';

export enum ProductionStageType {
  CAPTACAO = 'CAPTACAO',
  EDICAO = 'EDICAO',
  BACKUP = 'BACKUP',
  UPLOAD = 'UPLOAD',
}

export enum StageStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity('production_stages')
export class ProductionStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ProductionStageType,
  })
  type: ProductionStageType;

  @Column({
    type: 'enum',
    enum: StageStatus,
    default: StageStatus.PENDING,
  })
  status: StageStatus;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => Production, (production) => production.stages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'production_id' })
  production: Production;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
