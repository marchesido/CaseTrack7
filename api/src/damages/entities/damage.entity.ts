import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Equipment } from '../../equipments/entities/equipment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('damages')
export class Damage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipment)
  @JoinColumn({ name: 'equipamento_id' })
  equipment: Equipment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reportado_por_id' })
  reportadoPor: User;

  @Column({ type: 'text' })
  descricao: string;

  @Column({ type: 'text', nullable: true })
  imagem_url: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  data_registro: Date;
}
