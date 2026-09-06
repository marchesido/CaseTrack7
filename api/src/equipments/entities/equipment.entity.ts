import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum EquipmentStatus {
  DISPONIVEL = 'DISPONIVEL',
  EM_USO = 'EM_USO',
  MANUTENCAO = 'MANUTENCAO',
}

@Entity('equipments')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index({ unique: true })
  @Column({ length: 100, nullable: true })
  serialNumber: string;

  @Column({ type: 'enum', enum: EquipmentStatus, default: EquipmentStatus.DISPONIVEL })
  status: EquipmentStatus;

  @Column({ length: 255, nullable: true })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
