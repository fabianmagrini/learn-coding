import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PRStatus = 'open' | 'merged' | 'closed' | 'draft';
export type PRRiskTier = 'high' | 'medium' | 'low';
export type PRApprovalStatus = 'pending' | 'approved' | 'rejected';

@Entity('pull_requests')
export class PullRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** External PR number (e.g. GitHub PR #42) */
  @Column({ nullable: true })
  prNumber: number;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column()
  repo: string;

  @Column({ default: 'open' })
  status: PRStatus;

  @Column({ default: 'low' })
  riskTier: PRRiskTier;

  @Column({ default: 'pending' })
  approvalStatus: PRApprovalStatus;

  /** Whether policy checks passed */
  @Column({ default: false })
  policyPassed: boolean;

  /** Harness run result (JSON) */
  @Column({ type: 'jsonb', nullable: true })
  harnessResult: Record<string, unknown>;

  /** Agent run that created this PR */
  @Column({ nullable: true })
  agentRunId: string;

  /** Whether the PR was AI-generated */
  @Column({ default: false })
  isAiGenerated: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
