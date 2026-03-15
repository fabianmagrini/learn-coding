import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AgentRun } from '../../agents/entities/agent-run.entity.js';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  /** GitHub repository slug e.g. "org/repo" */
  @Column({ nullable: true })
  repoSlug: string;

  @Column({ default: true })
  isActive: boolean;

  /** JSON-serialised risk tier config */
  @Column({ type: 'jsonb', nullable: true })
  riskConfig: Record<string, unknown>;

  @OneToMany(() => AgentRun, (run) => run.project)
  agentRuns: AgentRun[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
