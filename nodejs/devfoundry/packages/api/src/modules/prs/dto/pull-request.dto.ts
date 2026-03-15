import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreatePullRequestDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  repo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  prNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAiGenerated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentRunId?: string;
}

export class UpdatePullRequestDto extends PartialType(CreatePullRequestDto) {
  @ApiPropertyOptional({ enum: ['open', 'merged', 'closed', 'draft'] })
  @IsOptional()
  @IsEnum(['open', 'merged', 'closed', 'draft'])
  status?: string;

  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  approvalStatus?: string;
}
