import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Request body for `POST /auth/login`. */
export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;
}

/** Request body for `POST /auth/register`. */
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;
}

/** Claims embedded inside the signed JWT. `sub` is the user UUID. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/** Returned by both `/auth/login` and `/auth/register` on success. */
export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}
