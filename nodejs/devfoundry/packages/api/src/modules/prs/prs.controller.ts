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
import { PrsService } from './prs.service.js';
import { CreatePullRequestDto, UpdatePullRequestDto } from './dto/pull-request.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@ApiTags('prs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prs')
export class PrsController {
  constructor(private readonly prsService: PrsService) {}

  @Get()
  @ApiOperation({ summary: 'List all pull requests' })
  findAll() {
    return this.prsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pull request by ID' })
  findOne(@Param('id') id: string) {
    return this.prsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a pull request record' })
  create(@Body() dto: CreatePullRequestDto) {
    return this.prsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a pull request' })
  update(@Param('id') id: string, @Body() dto: UpdatePullRequestDto) {
    return this.prsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a pull request record' })
  remove(@Param('id') id: string) {
    return this.prsService.remove(id);
  }
}
