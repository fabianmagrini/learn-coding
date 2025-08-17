import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export function setup() {
  // Register a test user for performance testing
  const registerPayload = {
    email: `perf-test-${Date.now()}@example.com`,
    password: 'perftest123',
    name: 'Performance Test User',
  };

  const registerResponse = http.post(`${BASE_URL}/api/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (registerResponse.status !== 201) {
    throw new Error(`Failed to register user: ${registerResponse.status}`);
  }

  return {
    authToken: registerResponse.json('data.accessToken'),
    userId: registerResponse.json('data.user.id'),
  };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.authToken}`,
  };

  // Create chat session
  const createSessionPayload = {
    customerData: {
      name: 'Performance Test User',
      tier: 'BASIC',
    },
  };

  const createSessionResponse = http.post(
    `${BASE_URL}/api/chat/create-session`,
    JSON.stringify(createSessionPayload),
    { headers }
  );

  const createSessionSuccess = check(createSessionResponse, {
    'create session status is 201': (r) => r.status === 201,
    'create session returns session ID': (r) => r.json('data.session.id') !== undefined,
  });

  if (!createSessionSuccess) {
    errorRate.add(1);
    return;
  }

  const sessionId = createSessionResponse.json('data.session.id');

  // Send messages
  const messages = [
    'Hello, I need help',
    'I have a question about my account',
    'Can you tell me about your services?',
    'What are your business hours?',
    'Thank you for your help',
  ];

  for (const message of messages) {
    const sendMessagePayload = { message };

    const sendMessageResponse = http.post(
      `${BASE_URL}/api/chat/sessions/${sessionId}/send-message`,
      JSON.stringify(sendMessagePayload),
      { headers }
    );

    const sendMessageSuccess = check(sendMessageResponse, {
      'send message status is 200': (r) => r.status === 200,
      'send message returns bot response': (r) => r.json('data.botMessage.content') !== undefined,
      'response time < 3s': (r) => r.timings.duration < 3000,
    });

    if (!sendMessageSuccess) {
      errorRate.add(1);
    }

    sleep(1); // Wait 1 second between messages
  }

  // Get chat history
  const historyResponse = http.get(
    `${BASE_URL}/api/chat/sessions/${sessionId}/messages`,
    { headers }
  );

  const historySuccess = check(historyResponse, {
    'get history status is 200': (r) => r.status === 200,
    'history contains messages': (r) => r.json('data.messages').length > 0,
  });

  if (!historySuccess) {
    errorRate.add(1);
  }

  // Get user sessions
  const sessionsResponse = http.get(
    `${BASE_URL}/api/chat/my-sessions`,
    { headers }
  );

  check(sessionsResponse, {
    'get sessions status is 200': (r) => r.status === 200,
    'sessions list returned': (r) => Array.isArray(r.json('data.sessions')),
  });

  sleep(1);
}

export function teardown(data) {
  // Cleanup can be done here if needed
  console.log('Performance test completed');
}