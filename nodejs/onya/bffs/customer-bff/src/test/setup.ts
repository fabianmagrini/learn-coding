import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SHARED_SERVICES_URL = 'http://localhost:3000';
process.env.SERVICE_TOKEN = 'test-token';
process.env.JWT_SECRET = 'test-secret';

// Mock external services
vi.mock('@/shared/services/sharedServiceClient', () => ({
  SharedServiceClient: vi.fn().mockImplementation(() => ({
    createChatSession: vi.fn(),
    sendMessage: vi.fn(),
    getChatSession: vi.fn(),
    getMessages: vi.fn(),
    escalateChat: vi.fn(),
    healthCheck: vi.fn(),
  })),
}));

// Global test setup
beforeAll(async () => {
  // Global setup code here
});

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
});

afterAll(async () => {
  // Global cleanup
});

// Export for use in tests
export { vi };