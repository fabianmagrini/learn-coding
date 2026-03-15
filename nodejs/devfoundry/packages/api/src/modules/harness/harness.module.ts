import { Module } from '@nestjs/common';
import { HarnessController } from './harness.controller.js';
import { HarnessService } from './harness.service.js';
import { PoliciesModule } from '../policies/policies.module.js';

@Module({
  imports: [PoliciesModule],
  controllers: [HarnessController],
  providers: [HarnessService],
  exports: [HarnessService],
})
export class HarnessModule {}
