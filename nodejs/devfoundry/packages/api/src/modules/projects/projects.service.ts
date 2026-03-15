/**
 * ProjectsService — CRUD for projects (repositories registered with DevFoundry).
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity.js';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with id "${id}" not found`);
    }
    return project;
  }

  async findByName(name: string): Promise<Project | null> {
    return this.projectRepository.findOne({ where: { name } });
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create(dto);
    return this.projectRepository.save(project);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, dto);
    return this.projectRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepository.remove(project);
  }
}
