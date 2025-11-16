/**
 * E2E Test Setup
 *
 * This file sets up the environment for end-to-end tests.
 * Tests should run against a live Docker Compose environment.
 */

// Increase timeout for E2E tests (services need time to start)
jest.setTimeout(30000);

// Test environment configuration
export const E2E_CONFIG = {
  AQS_URL: process.env.AQS_URL || 'http://localhost:8080',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  JAEGER_URL: process.env.JAEGER_URL || 'http://localhost:16686',
};

// Test JWT token (matches backend mock)
export const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsInNjb3BlcyI6WyJhY2NvdW50czpyZWFkIiwiYWNjb3VudHM6d3JpdGUiXSwiaWF0IjoxNTE2MjM5MDIyfQ.4Zz8Z9Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z';

// Helper to wait for services to be ready
export async function waitForService(url: string, maxAttempts = 30): Promise<void> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (err) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  throw new Error(`Service at ${url} did not become ready after ${maxAttempts} attempts`);
}

// Helper to clear Redis cache
export async function clearRedisCache(): Promise<void> {
  const Redis = require('ioredis');
  const redis = new Redis({
    host: E2E_CONFIG.REDIS_HOST,
    port: E2E_CONFIG.REDIS_PORT,
  });
  await redis.flushall();
  await redis.quit();
}
