import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Test database setup
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/onya_test',
    },
  },
});

// Test Redis setup
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 1, // Use different database for tests
});

// Global test setup
beforeAll(async () => {
  // Ensure test database is clean
  await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`;
  await prisma.$executeRaw`CREATE SCHEMA public`;
  
  // Run migrations
  const { execSync } = await import('child_process');
  execSync('npx prisma migrate dev --name init', { 
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/onya_test' }
  });
});

beforeEach(async () => {
  // Clean Redis test database
  await redis.flushdb();
  
  // Clean database tables in correct order (respecting foreign keys)
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;
  
  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter(name => name !== '_prisma_migrations')
    .map(name => `"public"."${name}"`)
    .join(', ');

  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});

// Export for use in tests
export { prisma, redis };