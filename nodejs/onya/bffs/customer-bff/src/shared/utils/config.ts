import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SHARED_SERVICES_URL: z.string().default('http://localhost:3000'),
  SERVICE_TOKEN: z.string().default('shared-service-secret-token'),
  SESSION_SECRET: z.string().default('customer-bff-session-secret'),
  CUSTOMER_APP_URL: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info'),
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