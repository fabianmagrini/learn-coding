import { IsString, IsOptional, IsBoolean, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreatePolicyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['risk-tier', 'architecture', 'approval-workflow'] })
  @IsEnum(['risk-tier', 'architecture', 'approval-workflow'])
  type: string;

  @ApiProperty()
  @IsObject()
  rules: Record<string, unknown>;
}

export class UpdatePolicyDto extends PartialType(CreatePolicyDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
