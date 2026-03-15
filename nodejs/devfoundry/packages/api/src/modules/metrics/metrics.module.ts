import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';
import { Metric } from './entities/metric.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Metric])],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
