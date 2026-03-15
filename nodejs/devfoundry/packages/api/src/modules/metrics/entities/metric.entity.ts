import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * All metric names tracked by the platform.
 *
 * | Name | Description |
 * |------|-------------|
 * | `ai_pr_acceptance_rate` | % of AI-generated PRs merged without rejection (DORA proxy) |
 * | `deploy_frequency` | Average deployments per day |
 * | `lead_time_hours` | Avg hours from first commit to production |
 * | `mttr_hours` | Mean time to restore after an incident |
 * | `change_failure_rate` | % of deployments causing production failures |
 * | `architecture_violations` | Count of active architecture rule violations |
 * | `active_agents` | Number of agent types currently enabled |
 * | `total_agent_runs` | Cumulative agent executions |
 */
export type MetricName =
  | 'ai_pr_acceptance_rate'
  | 'deploy_frequency'
  | 'lead_time_hours'
  | 'mttr_hours'
  | 'change_failure_rate'
  | 'architecture_violations'
  | 'active_agents'
  | 'total_agent_runs';

/**
 * A single time-series metric data point.
 * Records are append-only — update by inserting a new row, not mutating existing ones.
 */
@Entity('metrics')
export class Metric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: MetricName;

  @Column('float')
  value: number;

  /** Optional dimension (e.g. projectId, agentType) */
  @Column({ nullable: true })
  dimension: string;

  @Column({ nullable: true })
  unit: string;

  @CreateDateColumn()
  recordedAt: Date;
}
