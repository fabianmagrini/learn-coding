import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { createTestUser, createAuthHeaders } from '../helpers/testHelpers';
import { Role, ChatSessionStatus, MessageType } from '@prisma/client';
import { prisma } from '../setup';

describe('Chat Flow Integration', () => {
  let customer: any;
  let operator: any;
  let supervisor: any;
  let customerHeaders: any;
  let operatorHeaders: any;
  let supervisorHeaders: any;

  beforeEach(async () => {
    // Create test users
    customer = await createTestUser({
      email: 'customer@example.com',
      role: Role.CUSTOMER,
    });

    operator = await createTestUser({
      email: 'operator@example.com',
      role: Role.OPERATOR,
    });

    supervisor = await createTestUser({
      email: 'supervisor@example.com',
      role: Role.SUPERVISOR,
    });

    customerHeaders = createAuthHeaders(customer);
    operatorHeaders = createAuthHeaders(operator);
    supervisorHeaders = createAuthHeaders(supervisor);

    // Create operator profile
    await prisma.operatorProfile.create({
      data: {
        userId: operator.id,
        skills: ['general', 'billing'],
        maxSessions: 5,
        status: 'ONLINE',
        currentLoad: 0,
        lastActiveAt: new Date(),
        metadata: {},
      },
    });
  });

  describe('Complete Chat Flow', () => {
    it('should handle complete customer chat journey', async () => {
      // 1. Customer starts a chat session
      const createSessionResponse = await request(app)
        .post('/api/chat/sessions')
        .set(customerHeaders)
        .send({
          subject: 'Billing inquiry',
          metadata: {
            priority: 'MEDIUM',
            skills: ['billing'],
          },
        })
        .expect(201);

      expect(createSessionResponse.body.success).toBe(true);
      const sessionId = createSessionResponse.body.data.session.id;

      // 2. Customer sends initial message
      const messageResponse = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set(customerHeaders)
        .send({
          content: 'I have a question about my latest bill',
          type: 'USER',
        })
        .expect(201);

      expect(messageResponse.body.success).toBe(true);

      // Wait for LLM response
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. Check that LLM responded
      const messagesResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}/messages`)
        .set(customerHeaders)
        .expect(200);

      expect(messagesResponse.body.data.messages.length).toBeGreaterThan(1);
      const llmMessage = messagesResponse.body.data.messages.find(
        (msg: any) => msg.type === MessageType.LLM
      );
      expect(llmMessage).toBeDefined();

      // 4. Customer requests human operator
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set(customerHeaders)
        .send({
          content: 'I need to speak with a human agent',
          type: 'USER',
        })
        .expect(201);

      // 5. Operator views available chats
      const queueResponse = await request(app)
        .get('/api/chat/sessions')
        .set(operatorHeaders)
        .query({ status: 'ACTIVE' })
        .expect(200);

      expect(queueResponse.body.data.sessions.length).toBeGreaterThan(0);

      // 6. Operator assigns themselves to the chat
      const assignResponse = await request(app)
        .patch(`/api/chat/sessions/${sessionId}`)
        .set(operatorHeaders)
        .send({
          operatorId: operator.id,
          status: 'ACTIVE',
        })
        .expect(200);

      expect(assignResponse.body.success).toBe(true);

      // 7. Operator sends response
      const operatorMessageResponse = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set(operatorHeaders)
        .send({
          content: 'Hello! I can help you with your billing question. What specific issue are you experiencing?',
          type: 'OPERATOR',
        })
        .expect(201);

      expect(operatorMessageResponse.body.success).toBe(true);

      // 8. Customer responds
      await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set(customerHeaders)
        .send({
          content: 'I was charged twice for the same service last month',
          type: 'USER',
        })
        .expect(201);

      // 9. Operator resolves the issue
      const resolveResponse = await request(app)
        .patch(`/api/chat/sessions/${sessionId}`)
        .set(operatorHeaders)
        .send({
          status: 'RESOLVED',
          metadata: {
            resolution: 'Duplicate charge identified and refund processed',
            customerSatisfaction: 5,
            tags: ['billing', 'duplicate-charge', 'refund'],
          },
        })
        .expect(200);

      expect(resolveResponse.body.success).toBe(true);

      // 10. Verify final session state
      const finalSessionResponse = await request(app)
        .get(`/api/chat/sessions/${sessionId}`)
        .set(operatorHeaders)
        .expect(200);

      const finalSession = finalSessionResponse.body.data.session;
      expect(finalSession.status).toBe(ChatSessionStatus.RESOLVED);
      expect(finalSession.operatorId).toBe(operator.id);
      expect(finalSession.metadata.resolution).toBeDefined();
    });

    it('should handle chat escalation flow', async () => {
      // 1. Create chat session with operator
      const session = await prisma.chatSession.create({
        data: {
          customerId: customer.id,
          operatorId: operator.id,
          status: ChatSessionStatus.ACTIVE,
          metadata: {
            subject: 'Complex technical issue',
            priority: 'HIGH',
          },
        },
      });

      // 2. Operator escalates to supervisor
      const escalateResponse = await request(app)
        .post(`/api/chat/sessions/${session.id}/escalate`)
        .set(operatorHeaders)
        .send({
          reason: 'Requires technical expertise beyond my level',
          priority: 'HIGH',
          supervisorId: supervisor.id,
        })
        .expect(200);

      expect(escalateResponse.body.success).toBe(true);

      // 3. Verify escalation was recorded
      const sessionResponse = await request(app)
        .get(`/api/chat/sessions/${session.id}`)
        .set(supervisorHeaders)
        .expect(200);

      const updatedSession = sessionResponse.body.data.session;
      expect(updatedSession.status).toBe(ChatSessionStatus.ESCALATED);
      expect(updatedSession.metadata.escalationReason).toBeDefined();

      // 4. Supervisor can view escalated chats
      const escalatedChatsResponse = await request(app)
        .get('/api/chat/sessions')
        .set(supervisorHeaders)
        .query({ status: 'ESCALATED' })
        .expect(200);

      expect(escalatedChatsResponse.body.data.sessions.length).toBeGreaterThan(0);
    });

    it('should handle chat transfer between operators', async () => {
      // Create second operator
      const operator2 = await createTestUser({
        email: 'operator2@example.com',
        role: Role.OPERATOR,
      });

      await prisma.operatorProfile.create({
        data: {
          userId: operator2.id,
          skills: ['technical', 'advanced'],
          maxSessions: 3,
          status: 'ONLINE',
          currentLoad: 0,
          lastActiveAt: new Date(),
          metadata: {},
        },
      });

      // 1. Create active session with first operator
      const session = await prisma.chatSession.create({
        data: {
          customerId: customer.id,
          operatorId: operator.id,
          status: ChatSessionStatus.ACTIVE,
          metadata: {
            subject: 'Technical support needed',
          },
        },
      });

      // 2. Transfer to second operator
      const transferResponse = await request(app)
        .post(`/api/chat/sessions/${session.id}/transfer`)
        .set(operatorHeaders)
        .send({
          toOperatorId: operator2.id,
          reason: 'SKILL_MISMATCH',
          notes: 'Customer needs advanced technical support',
        })
        .expect(200);

      expect(transferResponse.body.success).toBe(true);

      // 3. Verify transfer
      const sessionResponse = await request(app)
        .get(`/api/chat/sessions/${session.id}`)
        .set(operatorHeaders)
        .expect(200);

      const updatedSession = sessionResponse.body.data.session;
      expect(updatedSession.operatorId).toBe(operator2.id);
      expect(updatedSession.metadata.transferHistory).toBeDefined();
    });
  });

  describe('Analytics Integration', () => {
    it('should track operator metrics correctly', async () => {
      // Create multiple resolved sessions for operator
      await prisma.chatSession.createMany({
        data: [
          {
            customerId: customer.id,
            operatorId: operator.id,
            status: ChatSessionStatus.RESOLVED,
            metadata: {
              customerSatisfaction: 4.5,
              resolution: 'Issue resolved',
              resolutionTime: 300, // 5 minutes
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            customerId: customer.id,
            operatorId: operator.id,
            status: ChatSessionStatus.RESOLVED,
            metadata: {
              customerSatisfaction: 5.0,
              resolution: 'Problem fixed',
              resolutionTime: 180, // 3 minutes
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            customerId: customer.id,
            operatorId: operator.id,
            status: ChatSessionStatus.ACTIVE,
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      // Get operator metrics
      const metricsResponse = await request(app)
        .get(`/api/analytics/operators/${operator.id}`)
        .set(supervisorHeaders)
        .expect(200);

      const metrics = metricsResponse.body.data.metrics;
      expect(metrics.totalSessions).toBe(3);
      expect(metrics.activeSessions).toBe(1);
      expect(metrics.resolutionRate).toBe(2/3); // 2 resolved out of 3
      expect(metrics.averageCustomerSatisfaction).toBeCloseTo(4.75);
    });

    it('should provide team-wide analytics', async () => {
      // Create sessions for multiple operators
      const operator2 = await createTestUser({
        email: 'op2@example.com',
        role: Role.OPERATOR,
      });

      await prisma.operatorProfile.create({
        data: {
          userId: operator2.id,
          skills: ['general'],
          maxSessions: 3,
          status: 'ONLINE',
          currentLoad: 1,
          lastActiveAt: new Date(),
          metadata: {},
        },
      });

      await prisma.chatSession.createMany({
        data: [
          {
            customerId: customer.id,
            operatorId: operator.id,
            status: ChatSessionStatus.ACTIVE,
            metadata: {},
          },
          {
            customerId: customer.id,
            operatorId: operator2.id,
            status: ChatSessionStatus.ACTIVE,
            metadata: {},
          },
          {
            customerId: customer.id,
            status: ChatSessionStatus.PENDING,
            metadata: {},
          },
        ],
      });

      const teamMetricsResponse = await request(app)
        .get('/api/analytics/team')
        .set(supervisorHeaders)
        .expect(200);

      const teamMetrics = teamMetricsResponse.body.data.metrics;
      expect(teamMetrics.totalOperators).toBe(2);
      expect(teamMetrics.onlineOperators).toBe(2);
      expect(teamMetrics.totalActiveSessions).toBe(2);
      expect(teamMetrics.queuedSessions).toBe(1);
    });
  });
});