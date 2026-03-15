import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity.js';
import { CreatePolicyDto, UpdatePolicyDto } from './dto/policy.dto.js';

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
  ) {}

  async findAll(): Promise<Policy[]> {
    return this.policyRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Policy> {
    const policy = await this.policyRepository.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException(`Policy "${id}" not found`);
    }
    return policy;
  }

  async create(dto: CreatePolicyDto): Promise<Policy> {
    const policy = this.policyRepository.create(dto as Partial<Policy>);
    return this.policyRepository.save(policy);
  }

  async update(id: string, dto: UpdatePolicyDto): Promise<Policy> {
    const policy = await this.findOne(id);
    Object.assign(policy, dto);
    return this.policyRepository.save(policy);
  }

  async remove(id: string): Promise<void> {
    const policy = await this.findOne(id);
    await this.policyRepository.remove(policy);
  }
}
