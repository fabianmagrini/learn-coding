import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HarnessService } from './harness.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AgentOutput } from '@devfoundry/agents';

class RunHarnessDto {
  @ApiProperty({ description: 'Agent output to validate' })
  @IsObject()
  agentOutput: AgentOutput;
}

@ApiTags('harness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('harness')
export class HarnessController {
  constructor(private readonly harnessService: HarnessService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run the validation harness on agent output' })
  run(@Body() dto: RunHarnessDto) {
    return this.harnessService.run(dto.agentOutput);
  }
}
