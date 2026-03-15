import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller.js';
import { AgentsService } from './agents.service.js';
import { AgentRun } from './entities/agent-run.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AgentRun])],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
