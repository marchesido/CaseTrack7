import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Reservation } from '../../reservations/entities/reservation.entity';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reserva_id' })
  reservation: Reservation;

  @Column({ type: 'varchar', length: 255 })
  documento_url: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  emitido_em: Date;
}
