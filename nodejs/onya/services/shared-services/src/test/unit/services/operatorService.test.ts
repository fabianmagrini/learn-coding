import { describe, it, expect, beforeEach } from 'vitest';
import { OperatorService } from '@/services/user-management/services/operatorService';
import { prisma } from '../../setup';
import { createTestUser } from '../../helpers/testHelpers';
import { Role, ChatSessionStatus } from '@prisma/client';

describe('OperatorService', () => {
  let operatorService: OperatorService;

  beforeEach(() => {
    operatorService = new OperatorService();
  });

  describe('createOperatorProfile', () => {
    it('should create operator profile for valid user', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      const profileData = {
        skills: ['general', 'technical'],
        maxSessions: 5,
        workingHours: {
          monday: { enabled: true, startTime: '09:00', endTime: '17:00' },
          tuesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        },
      };

      const profile = await operatorService.createOperatorProfile(operator.id, profileData);

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(operator.id);
      expect(profile.skills).toEqual(profileData.skills);
      expect(profile.maxSessions).toBe(profileData.maxSessions);
      expect(profile.status).toBe('OFFLINE');
    });

    it('should reject non-operator users', async () => {
      const customer = await createTestUser({ role: Role.CUSTOMER });

      await expect(
        operatorService.createOperatorProfile(customer.id, {
          skills: ['general'],
          maxSessions: 3,
        })
      ).rejects.toThrow('User is not an operator');
    });

    it('should not create duplicate profiles', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      
      await operatorService.createOperatorProfile(operator.id, {
        skills: ['general'],
        maxSessions: 3,
      });

      await expect(
        operatorService.createOperatorProfile(operator.id, {
          skills: ['technical'],
          maxSessions: 5,
        })
      ).rejects.toThrow('Operator profile already exists');
    });
  });

  describe('updateOperatorStatus', () => {
    it('should update operator status', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      await operatorService.createOperatorProfile(operator.id, {
        skills: ['general'],
        maxSessions: 3,
      });

      const updatedProfile = await operatorService.updateOperatorStatus(operator.id, 'ONLINE');

      expect(updatedProfile.status).toBe('ONLINE');
      expect(updatedProfile.lastActiveAt).toBeDefined();
    });

    it('should validate status values', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      await operatorService.createOperatorProfile(operator.id, {
        skills: ['general'],
        maxSessions: 3,
      });

      await expect(
        operatorService.updateOperatorStatus(operator.id, 'INVALID_STATUS' as any)
      ).rejects.toThrow('Invalid status');
    });
  });

  describe('getOperatorMetrics', () => {
    it('should calculate basic metrics', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      const profile = await operatorService.createOperatorProfile(operator.id, {
        skills: ['general'],
        maxSessions: 5,
      });

      // Create some test sessions
      await prisma.chatSession.create({
        data: {
          customerId: 'customer-1',
          operatorId: operator.id,
          status: ChatSessionStatus.RESOLVED,
          metadata: { satisfaction: 4.5 },
        },
      });

      await prisma.chatSession.create({
        data: {
          customerId: 'customer-2',
          operatorId: operator.id,
          status: ChatSessionStatus.ACTIVE,
          metadata: {},
        },
      });

      const metrics = await operatorService.getOperatorMetrics(operator.id);

      expect(metrics).toBeDefined();
      expect(metrics.totalSessions).toBe(2);
      expect(metrics.activeSessions).toBe(1);
      expect(metrics.resolutionRate).toBe(0.5); // 1 resolved out of 2 total
    });

    it('should handle operators with no sessions', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      await operatorService.createOperatorProfile(operator.id, {
        skills: ['general'],
        maxSessions: 3,
      });

      const metrics = await operatorService.getOperatorMetrics(operator.id);

      expect(metrics.totalSessions).toBe(0);
      expect(metrics.activeSessions).toBe(0);
      expect(metrics.resolutionRate).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });
  });

  describe('getAvailableOperators', () => {
    it('should return online operators with capacity', async () => {
      const operator1 = await createTestUser({ 
        role: Role.OPERATOR,
        email: 'op1@example.com' 
      });
      const operator2 = await createTestUser({ 
        role: Role.OPERATOR,
        email: 'op2@example.com' 
      });

      await operatorService.createOperatorProfile(operator1.id, {
        skills: ['general'],
        maxSessions: 3,
      });

      await operatorService.createOperatorProfile(operator2.id, {
        skills: ['technical'],
        maxSessions: 2,
      });

      await operatorService.updateOperatorStatus(operator1.id, 'ONLINE');
      await operatorService.updateOperatorStatus(operator2.id, 'BUSY');

      // Create active sessions for operator2 to max out capacity
      await prisma.chatSession.createMany({
        data: [
          {
            customerId: 'customer-1',
            operatorId: operator2.id,
            status: ChatSessionStatus.ACTIVE,
            metadata: {},
          },
          {
            customerId: 'customer-2',
            operatorId: operator2.id,
            status: ChatSessionStatus.ACTIVE,
            metadata: {},
          },
        ],
      });

      const availableOperators = await operatorService.getAvailableOperators(['general']);

      expect(availableOperators).toHaveLength(1);
      expect(availableOperators[0].userId).toBe(operator1.id);
    });

    it('should filter by required skills', async () => {
      const operator1 = await createTestUser({ 
        role: Role.OPERATOR,
        email: 'general@example.com' 
      });
      const operator2 = await createTestUser({ 
        role: Role.OPERATOR,
        email: 'technical@example.com' 
      });

      await operatorService.createOperatorProfile(operator1.id, {
        skills: ['general', 'billing'],
        maxSessions: 3,
      });

      await operatorService.createOperatorProfile(operator2.id, {
        skills: ['technical', 'advanced'],
        maxSessions: 3,
      });

      await operatorService.updateOperatorStatus(operator1.id, 'ONLINE');
      await operatorService.updateOperatorStatus(operator2.id, 'ONLINE');

      const technicalOperators = await operatorService.getAvailableOperators(['technical']);

      expect(technicalOperators).toHaveLength(1);
      expect(technicalOperators[0].userId).toBe(operator2.id);
    });
  });

  describe('assignChatToOperator', () => {
    it('should assign chat and update operator load', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      await operatorService.createOperatorProfile(operator.id, {
        skills: ['general'],
        maxSessions: 3,
      });

      const session = await prisma.chatSession.create({
        data: {
          customerId: 'customer-1',
          status: ChatSessionStatus.PENDING,
          metadata: {},
        },
      });

      const assignment = await operatorService.assignChatToOperator(
        session.id,
        operator.id
      );

      expect(assignment.success).toBe(true);
      expect(assignment.session.operatorId).toBe(operator.id);

      // Check that operator's current load increased
      const profile = await operatorService.getOperatorProfile(operator.id);
      expect(profile!.currentLoad).toBe(1);
    });

    it('should reject assignment when operator at capacity', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      await operatorService.createOperatorProfile(operator.id, {
        skills: ['general'],
        maxSessions: 1,
      });

      // Create existing active session
      await prisma.chatSession.create({
        data: {
          customerId: 'customer-1',
          operatorId: operator.id,
          status: ChatSessionStatus.ACTIVE,
          metadata: {},
        },
      });

      const newSession = await prisma.chatSession.create({
        data: {
          customerId: 'customer-2',
          status: ChatSessionStatus.PENDING,
          metadata: {},
        },
      });

      const assignment = await operatorService.assignChatToOperator(
        newSession.id,
        operator.id
      );

      expect(assignment.success).toBe(false);
      expect(assignment.reason).toContain('capacity');
    });
  });

  describe('getOperatorWorkload', () => {
    it('should calculate current workload', async () => {
      const operator = await createTestUser({ role: Role.OPERATOR });
      await operatorService.createOperatorProfile(operator.id, {
        skills: ['general'],
        maxSessions: 5,
      });

      // Create 3 active sessions
      await prisma.chatSession.createMany({
        data: [
          {
            customerId: 'customer-1',
            operatorId: operator.id,
            status: ChatSessionStatus.ACTIVE,
            metadata: {},
          },
          {
            customerId: 'customer-2',
            operatorId: operator.id,
            status: ChatSessionStatus.ACTIVE,
            metadata: {},
          },
          {
            customerId: 'customer-3',
            operatorId: operator.id,
            status: ChatSessionStatus.RESOLVED,
            metadata: {},
          },
        ],
      });

      const workload = await operatorService.getOperatorWorkload(operator.id);

      expect(workload.currentLoad).toBe(2); // Only active sessions
      expect(workload.maxCapacity).toBe(5);
      expect(workload.utilizationPercentage).toBe(40); // 2/5 * 100
    });
  });

  describe('getTeamMetrics', () => {
    it('should aggregate metrics across all operators', async () => {
      // Create operators
      const operator1 = await createTestUser({ 
        role: Role.OPERATOR,
        email: 'op1@example.com' 
      });
      const operator2 = await createTestUser({ 
        role: Role.OPERATOR,
        email: 'op2@example.com' 
      });

      await operatorService.createOperatorProfile(operator1.id, {
        skills: ['general'],
        maxSessions: 3,
      });

      await operatorService.createOperatorProfile(operator2.id, {
        skills: ['technical'],
        maxSessions: 5,
      });

      await operatorService.updateOperatorStatus(operator1.id, 'ONLINE');
      await operatorService.updateOperatorStatus(operator2.id, 'BUSY');

      // Create some sessions
      await prisma.chatSession.createMany({
        data: [
          {
            customerId: 'customer-1',
            operatorId: operator1.id,
            status: ChatSessionStatus.ACTIVE,
            metadata: {},
          },
          {
            customerId: 'customer-2',
            operatorId: operator2.id,
            status: ChatSessionStatus.ACTIVE,
            metadata: {},
          },
          {
            customerId: 'customer-3',
            status: ChatSessionStatus.PENDING,
            metadata: {},
          },
        ],
      });

      const teamMetrics = await operatorService.getTeamMetrics();

      expect(teamMetrics.totalOperators).toBe(2);
      expect(teamMetrics.onlineOperators).toBe(1);
      expect(teamMetrics.busyOperators).toBe(1);
      expect(teamMetrics.totalActiveSessions).toBe(2);
      expect(teamMetrics.queuedSessions).toBe(1);
    });
  });
});