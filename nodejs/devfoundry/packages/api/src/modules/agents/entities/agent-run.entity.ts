import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity.js';

/** Lifecycle status of an agent run. Transitions: queued → running → completed | failed. */
export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed';

/**
 * Persisted record of a single AI agent execution.
 * Created immediately when a run is queued; `status`, `output`, `summary`, and
 * `durationMs` are updated when the agent completes or fails.
 */
@Entity('agent_runs')
export class AgentRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentType: string;

  @Column('text')
  task: string;

  @Column({ default: 'queued' })
  status: AgentRunStatus;

  @Column({ nullable: true })
  durationMs: number;

  @Column({ nullable: true, type: 'text' })
  summary: string;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown>;

  @Column({ nullable: true, type: 'text' })
  error: string;

  @ManyToOne(() => Project, (project) => project.agentRuns, { nullable: true })
  @JoinColumn()
  project: Project;

  @Column({ nullable: true })
  projectId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
