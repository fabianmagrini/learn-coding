import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrsController } from './prs.controller.js';
import { PrsService } from './prs.service.js';
import { PullRequest } from './entities/pull-request.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([PullRequest])],
  controllers: [PrsController],
  providers: [PrsService],
  exports: [PrsService],
})
export class PrsModule {}
