import { IsString, IsOptional, IsBoolean, IsObject, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'my-service' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Main backend service' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'org/my-service' })
  @IsOptional()
  @IsString()
  repoSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  riskConfig?: Record<string, unknown>;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
