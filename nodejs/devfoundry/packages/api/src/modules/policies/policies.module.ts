import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliciesController } from './policies.controller.js';
import { PoliciesService } from './policies.service.js';
import { PolicyEngineService } from './policy-engine.service.js';
import { RiskClassifierService } from './risk-classifier.service.js';
import { Policy } from './entities/policy.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Policy])],
  controllers: [PoliciesController],
  providers: [PoliciesService, PolicyEngineService, RiskClassifierService],
  exports: [PoliciesService, PolicyEngineService, RiskClassifierService],
})
export class PoliciesModule {}
