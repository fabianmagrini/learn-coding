import { vi } from 'vitest';

// Mock tRPC client
export const mockTrpcClient = {
  chat: {
    createSession: {
      useMutation: vi.fn(() => ({
        mutate: vi.fn(),
        isLoading: false,
        error: null,
        data: null,
      })),
    },
    sendMessage: {
      useMutation: vi.fn(() => ({
        mutate: vi.fn(),
        isLoading: false,
        error: null,
        data: null,
      })),
    },
    getChatHistory: {
      useQuery: vi.fn(() => ({
        data: { messages: [] },
        isLoading: false,
        error: null,
      })),
    },
    onNewMessage: {
      useSubscription: vi.fn(() => {}),
    },
  },
  escalation: {
    requestEscalation: {
      useMutation: vi.fn(() => ({
        mutate: vi.fn(),
        isLoading: false,
        error: null,
        data: null,
      })),
    },
    getEscalationStatus: {
      useQuery: vi.fn(() => ({
        data: { status: 'NONE' },
        isLoading: false,
        error: null,
      })),
    },
    onEscalationStatusChange: {
      useSubscription: vi.fn(() => {}),
    },
  },
};

// Mock tRPC provider
export const MockTRPCProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="trpc-provider">{children}</div>;
};