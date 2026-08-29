import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { User } from '../../users/entities/user.entity';

export enum CheckInOutType {
  CHECKIN = 'CHECKIN',
  CHECKOUT = 'CHECKOUT',
}

@Entity('check_in_out')
export class CheckInOut {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reserva_id' })
  reservation: Reservation;

  @Column({ type: 'datetime' })
  data_hora: Date;

  @Column({ type: 'enum', enum: CheckInOutType })
  tipo: CheckInOutType;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'registrado_por_id' })
  registradoPor: User;
}
