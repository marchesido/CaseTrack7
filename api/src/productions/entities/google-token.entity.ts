import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('google_tokens')
export class GoogleToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'text' })
  refreshTokenEncrypted: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  calendarId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  calendarName: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  nextSyncToken: string | null;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  /**
   * Garantia de unicidade global conforme DP-2:
   * Apenas uma conexão Google ativa no sistema por vez.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30, default: 'GLOBAL_GOOGLE_CONNECTION' })
  singletonKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
