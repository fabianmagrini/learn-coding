import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.SHARED_SERVICES_URL = 'http://localhost:3000';
process.env.SERVICE_TOKEN = 'test-service-token';

// Mock Winston logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
});