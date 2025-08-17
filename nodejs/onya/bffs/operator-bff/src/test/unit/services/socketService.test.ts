import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createServer, Server } from 'http';
import jwt from 'jsonwebtoken';
import { SocketService } from '@/services/socketService';
import { createMockOperator, createMockSocket, createMockChatSession } from '../../helpers/testHelpers';

// Mock dependencies
const mockSharedServicesClient = {
  verifyToken: vi.fn(),
  updateOperatorStatus: vi.fn(),
  assignOperatorToSession: vi.fn(),
  addChatMessage: vi.fn(),
  escalateSession: vi.fn(),
  resolveSession: vi.fn(),
};

vi.mock('@/services/sharedServicesClient', () => ({
  createSharedServicesClient: () => mockSharedServicesClient,
}));

// Mock Socket.IO
const mockSocket = {
  user: null,
  join: vi.fn(),
  leave: vi.fn(),
  emit: vi.fn(),
  to: vi.fn(() => ({
    emit: vi.fn(),
  })),
  handshake: {
    auth: { token: null },
    headers: {},
  },
  on: vi.fn(),
};

const mockIo = {
  use: vi.fn(),
  on: vi.fn(),
  to: vi.fn(() => ({
    emit: vi.fn(),
  })),
};

vi.mock('socket.io', () => ({
  Server: vi.fn(() => mockIo),
}));

describe('SocketService', () => {
  let socketService: SocketService;
  let httpServer: Server;
  let mockOperator: any;
  let mockToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    
    httpServer = createServer();
    mockOperator = createMockOperator();
    mockToken = jwt.sign(
      { userId: mockOperator.id, email: mockOperator.email, role: mockOperator.role, operatorId: mockOperator.operatorId },
      'test-secret',
      { expiresIn: '1h' }
    );

    socketService = new SocketService(httpServer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    it('should authenticate valid token', async () => {
      mockSharedServicesClient.verifyToken.mockResolvedValue({
        success: true,
        data: { user: mockOperator },
      });

      const mockNext = vi.fn();
      const authSocket = {
        ...mockSocket,
        handshake: {
          auth: { token: mockToken },
          headers: {},
        },
      };

      // Get the middleware function from the first call to mockIo.use
      const middlewareCall = (mockIo.use as any).mock.calls[0];
      const middleware = middlewareCall[0];

      await middleware(authSocket, mockNext);

      expect(mockSharedServicesClient.verifyToken).toHaveBeenCalledWith(mockToken);
      expect(authSocket.user).toEqual({
        id: mockOperator.id,
        email: mockOperator.email,
        role: mockOperator.role,
        operatorId: mockOperator.operatorId,
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request without token', async () => {
      const mockNext = vi.fn();
      const authSocket = {
        ...mockSocket,
        handshake: {
          auth: {},
          headers: {},
        },
      };

      const middlewareCall = (mockIo.use as any).mock.calls[0];
      const middleware = middlewareCall[0];

      await middleware(authSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Authentication token required');
    });

    it('should reject invalid token', async () => {
      mockSharedServicesClient.verifyToken.mockResolvedValue({
        success: false,
        error: 'Invalid token',
      });

      const mockNext = vi.fn();
      const authSocket = {
        ...mockSocket,
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {},
        },
      };

      const middlewareCall = (mockIo.use as any).mock.calls[0];
      const middleware = middlewareCall[0];

      await middleware(authSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Authentication failed');
    });

    it('should reject non-operator roles', async () => {
      const customerUser = { ...mockOperator, role: 'CUSTOMER' };
      const customerToken = jwt.sign(
        { userId: customerUser.id, email: customerUser.email, role: customerUser.role },
        'test-secret',
        { expiresIn: '1h' }
      );

      mockSharedServicesClient.verifyToken.mockResolvedValue({
        success: true,
        data: { user: customerUser },
      });

      const mockNext = vi.fn();
      const authSocket = {
        ...mockSocket,
        handshake: {
          auth: { token: customerToken },
          headers: {},
        },
      };

      const middlewareCall = (mockIo.use as any).mock.calls[0];
      const middleware = middlewareCall[0];

      await middleware(authSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Operator role required');
    });
  });

  describe('Connection Handling', () => {
    it('should handle operator connection', () => {
      const authSocket = createMockSocket(mockOperator);
      
      // Get the connection handler from mockIo.on calls
      const connectionCall = (mockIo.on as any).mock.calls.find(call => call[0] === 'connection');
      const connectionHandler = connectionCall[1];

      connectionHandler(authSocket);

      expect(authSocket.join).toHaveBeenCalledWith(`operator:${mockOperator.operatorId}`);
      expect(authSocket.join).toHaveBeenCalledWith('operators');
    });

    it('should track connected operators', () => {
      const authSocket = createMockSocket(mockOperator);
      
      const connectionCall = (mockIo.on as any).mock.calls.find(call => call[0] === 'connection');
      const connectionHandler = connectionCall[1];

      connectionHandler(authSocket);

      expect(socketService.isOperatorConnected(mockOperator.operatorId)).toBe(true);
      expect(socketService.getConnectedOperators()).toContain(mockOperator.operatorId);
    });
  });

  describe('Event Handlers', () => {
    let authSocket: any;
    let eventHandlers: any;

    beforeEach(() => {
      authSocket = createMockSocket(mockOperator);
      
      // Simulate connection to set up event handlers
      const connectionCall = (mockIo.on as any).mock.calls.find(call => call[0] === 'connection');
      const connectionHandler = connectionCall[1];
      connectionHandler(authSocket);

      // Extract event handlers from socket.on calls
      eventHandlers = {};
      authSocket.on.mock.calls.forEach(([event, handler]: [string, any]) => {
        eventHandlers[event] = handler;
      });
    });

    describe('operator:status:update', () => {
      it('should update operator status', async () => {
        mockSharedServicesClient.updateOperatorStatus.mockResolvedValue({
          success: true,
        });

        await eventHandlers['operator:status:update']({ status: 'BUSY' });

        expect(mockSharedServicesClient.updateOperatorStatus).toHaveBeenCalledWith(
          mockOperator.operatorId,
          'BUSY'
        );
        expect(authSocket.to).toHaveBeenCalledWith('operators');
      });

      it('should handle status update failure', async () => {
        mockSharedServicesClient.updateOperatorStatus.mockRejectedValue(
          new Error('Status update failed')
        );

        await eventHandlers['operator:status:update']({ status: 'BUSY' });

        expect(authSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Failed to update status',
        });
      });
    });

    describe('chat:accept', () => {
      it('should accept chat session', async () => {
        const mockSession = createMockChatSession({ operatorId: mockOperator.operatorId });
        
        mockSharedServicesClient.assignOperatorToSession.mockResolvedValue({
          success: true,
          data: { session: mockSession },
        });

        await eventHandlers['chat:accept']({ sessionId: 'session-123' });

        expect(mockSharedServicesClient.assignOperatorToSession).toHaveBeenCalledWith(
          'session-123',
          mockOperator.operatorId
        );
        expect(authSocket.join).toHaveBeenCalledWith('chat:session-123');
        expect(authSocket.emit).toHaveBeenCalledWith('chat:accepted', {
          sessionId: 'session-123',
          session: mockSession,
        });
      });

      it('should handle chat accept failure', async () => {
        mockSharedServicesClient.assignOperatorToSession.mockRejectedValue(
          new Error('Assignment failed')
        );

        await eventHandlers['chat:accept']({ sessionId: 'session-123' });

        expect(authSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Failed to accept chat',
        });
      });
    });

    describe('chat:message', () => {
      it('should send chat message', async () => {
        const mockMessage = { id: 'msg-123', content: 'Hello customer' };
        
        mockSharedServicesClient.addChatMessage.mockResolvedValue({
          success: true,
          data: mockMessage,
        });

        await eventHandlers['chat:message']({
          sessionId: 'session-123',
          content: 'Hello customer',
          type: 'operator',
        });

        expect(mockSharedServicesClient.addChatMessage).toHaveBeenCalledWith('session-123', {
          content: 'Hello customer',
          type: 'operator',
          userId: mockOperator.id,
          metadata: {
            operatorId: mockOperator.operatorId,
            timestamp: expect.any(String),
          },
        });
      });

      it('should use default message type', async () => {
        mockSharedServicesClient.addChatMessage.mockResolvedValue({
          success: true,
          data: {},
        });

        await eventHandlers['chat:message']({
          sessionId: 'session-123',
          content: 'Hello customer',
        });

        expect(mockSharedServicesClient.addChatMessage).toHaveBeenCalledWith('session-123', 
          expect.objectContaining({ type: 'operator' })
        );
      });
    });

    describe('chat:escalate', () => {
      it('should escalate chat session', async () => {
        mockSharedServicesClient.escalateSession.mockResolvedValue({
          success: true,
        });

        await eventHandlers['chat:escalate']({
          sessionId: 'session-123',
          reason: 'Complex technical issue',
          priority: 'HIGH',
        });

        expect(mockSharedServicesClient.escalateSession).toHaveBeenCalledWith('session-123', {
          operatorId: mockOperator.operatorId,
          reason: 'Complex technical issue',
          priority: 'HIGH',
        });
        expect(authSocket.emit).toHaveBeenCalledWith('chat:escalated', {
          sessionId: 'session-123',
        });
      });
    });

    describe('chat:resolve', () => {
      it('should resolve chat session', async () => {
        mockSharedServicesClient.resolveSession.mockResolvedValue({
          success: true,
        });

        await eventHandlers['chat:resolve']({
          sessionId: 'session-123',
          resolution: 'Issue resolved successfully',
          customerSatisfaction: 5,
          tags: ['billing', 'resolved'],
        });

        expect(mockSharedServicesClient.resolveSession).toHaveBeenCalledWith('session-123', {
          operatorId: mockOperator.operatorId,
          resolution: 'Issue resolved successfully',
          customerSatisfaction: 5,
          tags: ['billing', 'resolved'],
        });
        expect(authSocket.leave).toHaveBeenCalledWith('chat:session-123');
        expect(authSocket.emit).toHaveBeenCalledWith('chat:resolved', {
          sessionId: 'session-123',
        });
      });
    });

    describe('chat:transfer:request', () => {
      it('should handle chat transfer request to online operator', async () => {
        const targetOperator = createMockOperator({ operatorId: 'target-op-123' });
        const targetSocket = createMockSocket(targetOperator);
        
        // Simulate target operator being connected
        const connectionCall = (mockIo.on as any).mock.calls.find(call => call[0] === 'connection');
        const connectionHandler = connectionCall[1];
        connectionHandler(targetSocket);

        await eventHandlers['chat:transfer:request']({
          sessionId: 'session-123',
          toOperatorId: 'target-op-123',
          reason: 'Skill transfer',
          notes: 'Customer needs billing specialist',
        });

        expect(targetSocket.emit).toHaveBeenCalledWith('chat:transfer:request', {
          sessionId: 'session-123',
          fromOperatorId: mockOperator.operatorId,
          reason: 'Skill transfer',
          notes: 'Customer needs billing specialist',
        });
        expect(authSocket.emit).toHaveBeenCalledWith('chat:transfer:requested', {
          sessionId: 'session-123',
          toOperatorId: 'target-op-123',
        });
      });

      it('should handle transfer request to offline operator', async () => {
        await eventHandlers['chat:transfer:request']({
          sessionId: 'session-123',
          toOperatorId: 'offline-op-123',
          reason: 'Skill transfer',
          notes: 'Customer needs billing specialist',
        });

        expect(authSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Target operator not available',
        });
      });
    });

    describe('disconnect', () => {
      it('should handle operator disconnect', () => {
        // First connect the operator
        const connectionCall = (mockIo.on as any).mock.calls.find(call => call[0] === 'connection');
        const connectionHandler = connectionCall[1];
        connectionHandler(authSocket);

        // Now disconnect
        eventHandlers['disconnect']();

        expect(socketService.isOperatorConnected(mockOperator.operatorId)).toBe(false);
        expect(authSocket.to).toHaveBeenCalledWith('operators');
      });
    });
  });

  describe('Broadcasting Methods', () => {
    it('should broadcast to all operators', () => {
      socketService.broadcastToOperators('test:event', { data: 'test' });

      expect(mockIo.to).toHaveBeenCalledWith('operators');
    });

    it('should broadcast to specific operator', () => {
      socketService.broadcastToOperator('op-123', 'test:event', { data: 'test' });

      expect(mockIo.to).toHaveBeenCalledWith('operator:op-123');
    });

    it('should broadcast chat updates', () => {
      socketService.broadcastChatUpdate('session-123', { status: 'updated' });

      expect(mockIo.to).toHaveBeenCalledWith('chat:session-123');
    });
  });

  describe('Operator Tracking', () => {
    it('should track operator connections', () => {
      const authSocket = createMockSocket(mockOperator);
      
      const connectionCall = (mockIo.on as any).mock.calls.find(call => call[0] === 'connection');
      const connectionHandler = connectionCall[1];

      // Connect operator
      connectionHandler(authSocket);

      expect(socketService.isOperatorConnected(mockOperator.operatorId)).toBe(true);
      expect(socketService.getConnectedOperators()).toContain(mockOperator.operatorId);

      // Extract disconnect handler
      const eventHandlers: any = {};
      authSocket.on.mock.calls.forEach(([event, handler]: [string, any]) => {
        eventHandlers[event] = handler;
      });

      // Disconnect operator
      eventHandlers['disconnect']();

      expect(socketService.isOperatorConnected(mockOperator.operatorId)).toBe(false);
      expect(socketService.getConnectedOperators()).not.toContain(mockOperator.operatorId);
    });
  });
});