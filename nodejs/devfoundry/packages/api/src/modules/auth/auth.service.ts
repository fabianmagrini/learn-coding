/**
 * AuthService — handles user registration, login, and JWT issuance.
 */

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity.js';
import { LoginDto, RegisterDto, JwtPayload, AuthResponse } from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user with a hashed password.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      role: 'developer',
    });
    await this.userRepository.save(user);

    return this.buildAuthResponse(user);
  }

  /**
   * Authenticates a user and returns a JWT.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Validates a JWT payload (used by the JWT strategy).
   */
  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: payload.sub, isActive: true } });
  }

  private buildAuthResponse(user: User): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
