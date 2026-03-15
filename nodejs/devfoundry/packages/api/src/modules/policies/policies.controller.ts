import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PoliciesService } from './policies.service.js';
import { CreatePolicyDto, UpdatePolicyDto } from './dto/policy.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@ApiTags('policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'List all policies' })
  findAll() {
    return this.policiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get policy by ID' })
  findOne(@Param('id') id: string) {
    return this.policiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new policy' })
  create(@Body() dto: CreatePolicyDto) {
    return this.policiesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a policy' })
  update(@Param('id') id: string, @Body() dto: UpdatePolicyDto) {
    return this.policiesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a policy' })
  remove(@Param('id') id: string) {
    return this.policiesService.remove(id);
  }
}
