import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PullRequest } from './entities/pull-request.entity.js';
import { CreatePullRequestDto, UpdatePullRequestDto } from './dto/pull-request.dto.js';

@Injectable()
export class PrsService {
  constructor(
    @InjectRepository(PullRequest)
    private readonly prRepository: Repository<PullRequest>,
  ) {}

  async findAll(): Promise<PullRequest[]> {
    return this.prRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<PullRequest> {
    const pr = await this.prRepository.findOne({ where: { id } });
    if (!pr) {
      throw new NotFoundException(`Pull request "${id}" not found`);
    }
    return pr;
  }

  async create(dto: CreatePullRequestDto): Promise<PullRequest> {
    const pr = this.prRepository.create(dto);
    return this.prRepository.save(pr);
  }

  async update(id: string, dto: UpdatePullRequestDto): Promise<PullRequest> {
    const pr = await this.findOne(id);
    Object.assign(pr, dto);
    return this.prRepository.save(pr);
  }

  async remove(id: string): Promise<void> {
    const pr = await this.findOne(id);
    await this.prRepository.remove(pr);
  }
}
