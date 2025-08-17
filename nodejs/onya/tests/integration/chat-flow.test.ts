import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

describe('Chat Flow Integration Tests', () => {
  let api: AxiosInstance;
  let bffApi: AxiosInstance;
  let authToken: string;
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    // Setup API clients
    api = axios.create({
      baseURL: process.env.SHARED_SERVICES_URL || 'http://localhost:3000',
      timeout: 10000,
    });

    bffApi = axios.create({
      baseURL: process.env.CUSTOMER_BFF_URL || 'http://localhost:3001',
      timeout: 10000,
    });

    // Wait for services to be ready
    await waitForService(api, '/health');
    await waitForService(bffApi, '/health');

    // Register a test user
    const userEmail = `test-${uuidv4()}@example.com`;
    const registerResponse = await api.post('/api/auth/register', {
      email: userEmail,
      password: 'testpassword123',
      name: 'Test User',
      role: 'CUSTOMER',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.data.success).toBe(true);
    
    authToken = registerResponse.data.data.accessToken;
    userId = registerResponse.data.data.user.id;

    // Set auth header for BFF requests
    bffApi.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  });

  afterAll(async () => {
    // Cleanup: Close any open sessions
    if (sessionId) {
      try {
        await api.patch(`/api/chat/sessions/${sessionId}`, 
          { status: 'CLOSED' },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  it('should create a chat session through BFF', async () => {
    const response = await bffApi.post('/api/chat/create-session', {
      customerData: {
        name: 'Test User',
        tier: 'BASIC',
      },
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.session).toBeDefined();
    expect(response.data.data.session.id).toBeDefined();

    sessionId = response.data.data.session.id;
  });

  it('should send a message and receive a response', async () => {
    expect(sessionId).toBeDefined();

    const message = 'Hello, I need help with my account';
    const response = await bffApi.post(`/api/chat/sessions/${sessionId}/send-message`, {
      message,
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.botMessage).toBeDefined();
    expect(response.data.data.botMessage.content).toBeDefined();
    expect(response.data.data.escalationStatus).toBeDefined();
  });

  it('should retrieve chat history', async () => {
    expect(sessionId).toBeDefined();

    const response = await bffApi.get(`/api/chat/sessions/${sessionId}/messages`);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.messages).toBeDefined();
    expect(response.data.data.messages.length).toBeGreaterThanOrEqual(2); // User message + bot response
  });

  it('should handle multiple messages in sequence', async () => {
    expect(sessionId).toBeDefined();

    const messages = [
      'I have a billing question',
      'Can you help me with my subscription?',
      'I want to upgrade my plan',
    ];

    for (const message of messages) {
      const response = await bffApi.post(`/api/chat/sessions/${sessionId}/send-message`, {
        message,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.botMessage.content).toBeDefined();

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check final message count
    const historyResponse = await bffApi.get(`/api/chat/sessions/${sessionId}/messages`);
    expect(historyResponse.data.data.messages.length).toBeGreaterThanOrEqual(8); // 4 initial + 6 new
  });

  it('should trigger escalation with specific keywords', async () => {
    expect(sessionId).toBeDefined();

    const escalationMessage = 'This is terrible service, I want to speak to a manager immediately!';
    const response = await bffApi.post(`/api/chat/sessions/${sessionId}/send-message`, {
      message: escalationMessage,
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.escalationStatus.escalated).toBe(true);
    expect(response.data.data.escalationStatus.reason).toBeDefined();
  });

  it('should handle session closure', async () => {
    expect(sessionId).toBeDefined();

    // Close session through direct API call (admin action)
    const response = await api.patch(`/api/chat/sessions/${sessionId}`, 
      { status: 'CLOSED' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.session.status).toBe('CLOSED');
  });

  it('should not allow messages to closed session', async () => {
    expect(sessionId).toBeDefined();

    try {
      await bffApi.post(`/api/chat/sessions/${sessionId}/send-message`, {
        message: 'This should fail',
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.success).toBe(false);
    }
  });

  it('should retrieve user sessions', async () => {
    const response = await bffApi.get('/api/chat/my-sessions');

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.sessions).toBeDefined();
    expect(response.data.data.sessions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Authentication Integration Tests', () => {
  let api: AxiosInstance;

  beforeAll(async () => {
    api = axios.create({
      baseURL: process.env.SHARED_SERVICES_URL || 'http://localhost:3000',
      timeout: 10000,
    });

    await waitForService(api, '/health');
  });

  it('should handle user registration and login flow', async () => {
    const userEmail = `auth-test-${uuidv4()}@example.com`;
    const password = 'authtest123';

    // Register user
    const registerResponse = await api.post('/api/auth/register', {
      email: userEmail,
      password,
      name: 'Auth Test User',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.data.success).toBe(true);
    expect(registerResponse.data.data.accessToken).toBeDefined();
    expect(registerResponse.data.data.refreshToken).toBeDefined();

    // Login with same credentials
    const loginResponse = await api.post('/api/auth/login', {
      email: userEmail,
      password,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data.success).toBe(true);
    expect(loginResponse.data.data.accessToken).toBeDefined();

    // Get user profile
    const profileResponse = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${loginResponse.data.data.accessToken}` },
    });

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.data.success).toBe(true);
    expect(profileResponse.data.data.user.email).toBe(userEmail);
  });

  it('should handle token refresh', async () => {
    const userEmail = `refresh-test-${uuidv4()}@example.com`;
    
    const registerResponse = await api.post('/api/auth/register', {
      email: userEmail,
      password: 'refreshtest123',
      name: 'Refresh Test User',
    });

    const refreshToken = registerResponse.data.data.refreshToken;

    // Refresh token
    const refreshResponse = await api.post('/api/auth/refresh', {
      refreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.data.success).toBe(true);
    expect(refreshResponse.data.data.accessToken).toBeDefined();
    expect(refreshResponse.data.data.refreshToken).toBeDefined();
  });

  it('should handle logout', async () => {
    const userEmail = `logout-test-${uuidv4()}@example.com`;
    
    const registerResponse = await api.post('/api/auth/register', {
      email: userEmail,
      password: 'logouttest123',
      name: 'Logout Test User',
    });

    const accessToken = registerResponse.data.data.accessToken;

    // Logout
    const logoutResponse = await api.post('/api/auth/logout', {}, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.data.success).toBe(true);

    // Try to use token after logout (should fail)
    try {
      await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
});

async function waitForService(api: AxiosInstance, endpoint: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await api.get(endpoint);
      return;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error(`Service not ready after ${maxAttempts} attempts`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}