import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Production } from '../../productions/entities/production.entity';

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  SIGNED = 'SIGNED',
  CANCELLED = 'CANCELLED',
}

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Production, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'production_id' })
  production: Production | null;

  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reserva_id' })
  reservation: Reservation | null;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.ISSUED,
  })
  status: ContractStatus;

  @Column({ type: 'varchar', length: 255 })
  documento_url: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  signer_name: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  signer_document: string | null;

  @Column({ type: 'datetime', nullable: true })
  signed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  terms_summary: string | null;

  @CreateDateColumn({ name: 'emitido_em' })
  emitido_em: Date;

  @UpdateDateColumn({ nullable: true })
  updated_at: Date;
}
