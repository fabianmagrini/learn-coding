import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service.js';
import { CreateAgentRunDto } from './dto/agent-run.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get('runs')
  @ApiOperation({ summary: 'List all agent runs' })
  findAll() {
    return this.agentsService.findAll();
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get agent run by ID' })
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Post('runs')
  @ApiOperation({ summary: 'Start a new agent run' })
  createAndRun(@Body() dto: CreateAgentRunDto) {
    return this.agentsService.createAndRun(dto);
  }
}
