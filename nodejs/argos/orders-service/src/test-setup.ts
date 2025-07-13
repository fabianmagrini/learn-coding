jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('./tracing', () => ({
  initializeTracing: jest.fn(),
  shutdownTracing: jest.fn().mockResolvedValue(undefined)
}));