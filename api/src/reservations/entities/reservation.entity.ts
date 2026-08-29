import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Equipment } from '../../equipments/entities/equipment.entity';

export enum ReservationStatus {
  PENDENTE = 'PENDENTE',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  user: User;

  @ManyToOne(() => Equipment)
  @JoinColumn({ name: 'equipamento_id' })
  equipment: Equipment;

  @Column({ type: 'date' })
  data_inicio: Date;

  @Column({ type: 'date' })
  data_fim: Date;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDENTE })
  status: ReservationStatus;
}
