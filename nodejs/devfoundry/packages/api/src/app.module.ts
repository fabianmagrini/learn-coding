/**
 * Root application module — wires together all feature modules.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';
import { HarnessModule } from './modules/harness/harness.module.js';
import { PoliciesModule } from './modules/policies/policies.module.js';
import { PrsModule } from './modules/prs/prs.module.js';
import { MetricsModule } from './modules/metrics/metrics.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { Project } from './modules/projects/entities/project.entity.js';
import { AgentRun } from './modules/agents/entities/agent-run.entity.js';
import { Policy } from './modules/policies/entities/policy.entity.js';
import { PullRequest } from './modules/prs/entities/pull-request.entity.js';
import { Metric } from './modules/metrics/entities/metric.entity.js';
import { User } from './modules/auth/entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['DATABASE_HOST'] ?? 'localhost',
      port: parseInt(process.env['DATABASE_PORT'] ?? '5432', 10),
      username: process.env['DATABASE_USERNAME'] ?? 'devfoundry',
      password: process.env['DATABASE_PASSWORD'] ?? 'devfoundry',
      database: process.env['DATABASE_NAME'] ?? 'devfoundry',
      entities: [Project, AgentRun, Policy, PullRequest, Metric, User],
      synchronize: process.env['NODE_ENV'] !== 'production',
      logging: process.env['NODE_ENV'] === 'development',
    }),
    AuthModule,
    ProjectsModule,
    AgentsModule,
    HarnessModule,
    PoliciesModule,
    PrsModule,
    MetricsModule,
  ],
})
export class AppModule {}
