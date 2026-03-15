import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@ApiTags('metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard KPI metrics' })
  getDashboard() {
    return this.metricsService.getDashboardMetrics();
  }
}
