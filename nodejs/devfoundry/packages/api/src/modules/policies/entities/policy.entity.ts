import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** Discriminates between the three governance policy categories. */
export type PolicyType = 'risk-tier' | 'architecture' | 'approval-workflow';

/**
 * A governance policy rule stored in the platform.
 *
 * - `risk-tier`: maps file-path glob patterns to high/medium/low risk tiers.
 * - `architecture`: defines forbidden import relationships between modules.
 * - `approval-workflow`: maps risk tiers to required reviewers and SLAs.
 *
 * The `rules` field is a free-form JSONB document whose schema depends on `type`.
 */
@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  type: PolicyType;

  /** JSON rule definition */
  @Column({ type: 'jsonb' })
  rules: Record<string, unknown>;

  @Column({ default: true })
  isEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
