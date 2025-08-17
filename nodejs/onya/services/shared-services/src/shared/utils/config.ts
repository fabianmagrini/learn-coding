import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-3.5-turbo'),
  LLM_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SERVICE_TOKEN: z.string().default('shared-service-secret-token'),
  LOG_LEVEL: z.string().default('info'),
  
  // Database
  DATABASE_URL: z.string().default('postgresql://onya:password@localhost:5432/onya_db'),
  
  // JWT Authentication
  JWT_SECRET: z.string().default('your-super-secret-jwt-key'),
  JWT_REFRESH_SECRET: z.string().default('your-super-secret-refresh-key'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'), // 100 requests per window
});

const parseConfig = () => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    console.error('Invalid configuration:', error);
    process.exit(1);
  }
};

export const config = parseConfig();

export type Config = typeof config;