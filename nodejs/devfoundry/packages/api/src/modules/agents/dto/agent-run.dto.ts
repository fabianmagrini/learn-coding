import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Request body for `POST /agents/runs` — triggers an AI agent execution. */
export class CreateAgentRunDto {
  @ApiProperty({ enum: ['feature', 'test', 'refactor', 'security', 'dependency', 'pr-reviewer'] })
  @IsEnum(['feature', 'test', 'refactor', 'security', 'dependency', 'pr-reviewer'])
  agentType: string;

  @ApiProperty({ example: 'Add rate limiting to the payments API' })
  @IsString()
  task: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: 'myapp' })
  @IsOptional()
  @IsString()
  repo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;
}
