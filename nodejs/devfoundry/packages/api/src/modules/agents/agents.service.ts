/**
 * AgentsService — creates agent run records and dispatches agent jobs.
 *
 * Agent execution happens asynchronously via BullMQ. The service creates
 * a queued record immediately and returns it; the queue processor updates
 * the record when the run completes.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FeatureAgent,
  TestAgent,
  RefactorAgent,
  SecurityAgent,
  DependencyAgent,
  PRReviewerAgent,
  AgentInput,
  AgentType,
} from '@devfoundry/agents';
import { AgentRun } from './entities/agent-run.entity.js';
import { CreateAgentRunDto } from './dto/agent-run.dto.js';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(AgentRun)
    private readonly agentRunRepository: Repository<AgentRun>,
  ) {}

  async findAll(): Promise<AgentRun[]> {
    return this.agentRunRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<AgentRun> {
    const run = await this.agentRunRepository.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException(`Agent run "${id}" not found`);
    }
    return run;
  }

  /**
   * Creates a run record and immediately executes the agent in-process.
   * In a production system this would be pushed to a BullMQ queue.
   */
  async createAndRun(dto: CreateAgentRunDto): Promise<AgentRun> {
    // Persist the initial queued record
    const run = this.agentRunRepository.create({
      agentType: dto.agentType,
      task: dto.task,
      projectId: dto.projectId,
      status: 'running',
    });
    await this.agentRunRepository.save(run);

    // Execute the agent
    const agentInput: AgentInput = {
      task: dto.task,
      repo: dto.repo ?? 'unknown',
      context: dto.context,
    };

    try {
      const agent = this.buildAgent(dto.agentType as AgentType);
      const result = await agent.run(agentInput);

      run.status = result.success ? 'completed' : 'failed';
      run.durationMs = result.durationMs;
      run.summary = result.output?.summary ?? '';
      run.output = result.output as unknown as Record<string, unknown>;
      run.error = result.error ?? '';
    } catch (err) {
      run.status = 'failed';
      run.error = err instanceof Error ? err.message : String(err);
    }

    return this.agentRunRepository.save(run);
  }

  /** Instantiates the correct agent class for the given type */
  private buildAgent(agentType: AgentType) {
    const config = { allowMock: true };
    switch (agentType) {
      case 'feature':
        return new FeatureAgent(config);
      case 'test':
        return new TestAgent(config);
      case 'refactor':
        return new RefactorAgent(config);
      case 'security':
        return new SecurityAgent(config);
      case 'dependency':
        return new DependencyAgent(config);
      case 'pr-reviewer':
        return new PRReviewerAgent(config);
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }
}
