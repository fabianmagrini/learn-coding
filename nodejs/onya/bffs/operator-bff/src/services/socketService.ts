import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { createSharedServicesClient } from './sharedServicesClient';

export interface SocketUser {
  id: string;
  email: string;
  role: string;
  operatorId?: string;
}

export interface AuthenticatedSocket extends Socket {
  user: SocketUser;
}

export class SocketService {
  private io: SocketIOServer;
  private connectedOperators: Map<string, AuthenticatedSocket> = new Map();
  private sharedServicesClient = createSharedServicesClient();

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5174'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
        const decoded = jwt.verify(token, jwtSecret) as any;

        const userResponse = await this.sharedServicesClient.verifyToken(token);
        if (!userResponse.success) {
          return next(new Error('Invalid token'));
        }

        if (decoded.role !== 'OPERATOR' && decoded.role !== 'SUPERVISOR') {
          return next(new Error('Operator role required'));
        }

        (socket as any).user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          operatorId: decoded.operatorId
        };

        next();
      } catch (error) {
        logger.error('Socket authentication failed', { error });
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      logger.info('Operator connected', { 
        operatorId: authSocket.user.operatorId,
        userId: authSocket.user.id 
      });

      this.connectedOperators.set(authSocket.user.operatorId!, authSocket);

      authSocket.join(`operator:${authSocket.user.operatorId}`);
      authSocket.join('operators');

      authSocket.on('operator:status:update', async (data: any) => {
        await this.handleOperatorStatusUpdate(authSocket, data);
      });

      authSocket.on('chat:accept', async (data: any) => {
        await this.handleChatAccept(authSocket, data);
      });

      authSocket.on('chat:message', async (data: any) => {
        await this.handleChatMessage(authSocket, data);
      });

      authSocket.on('chat:transfer:request', async (data: any) => {
        await this.handleChatTransferRequest(authSocket, data);
      });

      authSocket.on('chat:escalate', async (data: any) => {
        await this.handleChatEscalate(authSocket, data);
      });

      authSocket.on('chat:resolve', async (data: any) => {
        await this.handleChatResolve(authSocket, data);
      });

      authSocket.on('disconnect', () => {
        this.handleDisconnect(authSocket);
      });

      this.broadcastOperatorOnline(authSocket.user.operatorId!);
    });
  }

  private async handleOperatorStatusUpdate(socket: AuthenticatedSocket, data: { status: string }): Promise<void> {
    try {
      await this.sharedServicesClient.updateOperatorStatus(socket.user.operatorId!, data.status);
      
      socket.to('operators').emit('operator:status:changed', {
        operatorId: socket.user.operatorId,
        status: data.status
      });

      logger.info('Operator status updated', { 
        operatorId: socket.user.operatorId,
        status: data.status 
      });
    } catch (error) {
      logger.error('Failed to update operator status', { error, operatorId: socket.user.operatorId });
      socket.emit('error', { message: 'Failed to update status' });
    }
  }

  private async handleChatAccept(socket: AuthenticatedSocket, data: { sessionId: string }): Promise<void> {
    try {
      const result = await this.sharedServicesClient.assignOperatorToSession(
        data.sessionId,
        socket.user.operatorId!
      );

      if (result.success) {
        socket.join(`chat:${data.sessionId}`);
        
        socket.emit('chat:accepted', {
          sessionId: data.sessionId,
          session: result.data.session
        });

        this.io.to('operators').emit('chat:assigned', {
          sessionId: data.sessionId,
          operatorId: socket.user.operatorId
        });

        logger.info('Chat accepted by operator', {
          sessionId: data.sessionId,
          operatorId: socket.user.operatorId
        });
      }
    } catch (error) {
      logger.error('Failed to accept chat', { error, sessionId: data.sessionId });
      socket.emit('error', { message: 'Failed to accept chat' });
    }
  }

  private async handleChatMessage(socket: AuthenticatedSocket, data: { sessionId: string; content: string; type?: string }): Promise<void> {
    try {
      const message = await this.sharedServicesClient.addChatMessage(data.sessionId, {
        content: data.content,
        type: data.type || 'operator',
        userId: socket.user.id,
        metadata: {
          operatorId: socket.user.operatorId,
          timestamp: new Date().toISOString()
        }
      });

      this.io.to(`chat:${data.sessionId}`).emit('chat:message', message.data);

      logger.debug('Chat message sent', {
        sessionId: data.sessionId,
        operatorId: socket.user.operatorId
      });
    } catch (error) {
      logger.error('Failed to send chat message', { error, sessionId: data.sessionId });
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleChatTransferRequest(socket: AuthenticatedSocket, data: { sessionId: string; toOperatorId: string; reason: string; notes: string }): Promise<void> {
    try {
      const targetSocket = this.connectedOperators.get(data.toOperatorId);
      
      if (targetSocket) {
        targetSocket.emit('chat:transfer:request', {
          sessionId: data.sessionId,
          fromOperatorId: socket.user.operatorId,
          reason: data.reason,
          notes: data.notes
        });

        socket.emit('chat:transfer:requested', {
          sessionId: data.sessionId,
          toOperatorId: data.toOperatorId
        });

        logger.info('Chat transfer requested', {
          sessionId: data.sessionId,
          fromOperatorId: socket.user.operatorId,
          toOperatorId: data.toOperatorId
        });
      } else {
        socket.emit('error', { message: 'Target operator not available' });
      }
    } catch (error) {
      logger.error('Failed to request chat transfer', { error, sessionId: data.sessionId });
      socket.emit('error', { message: 'Failed to request transfer' });
    }
  }

  private async handleChatEscalate(socket: AuthenticatedSocket, data: { sessionId: string; reason: string; priority?: string }): Promise<void> {
    try {
      const result = await this.sharedServicesClient.escalateSession(data.sessionId, {
        operatorId: socket.user.operatorId!,
        reason: data.reason,
        priority: data.priority
      });

      if (result.success) {
        this.io.to('supervisors').emit('chat:escalated', {
          sessionId: data.sessionId,
          operatorId: socket.user.operatorId,
          reason: data.reason,
          priority: data.priority
        });

        socket.emit('chat:escalated', { sessionId: data.sessionId });

        logger.info('Chat escalated', {
          sessionId: data.sessionId,
          operatorId: socket.user.operatorId,
          reason: data.reason
        });
      }
    } catch (error) {
      logger.error('Failed to escalate chat', { error, sessionId: data.sessionId });
      socket.emit('error', { message: 'Failed to escalate chat' });
    }
  }

  private async handleChatResolve(socket: AuthenticatedSocket, data: { sessionId: string; resolution: string; customerSatisfaction?: number; tags?: string[] }): Promise<void> {
    try {
      const result = await this.sharedServicesClient.resolveSession(data.sessionId, {
        operatorId: socket.user.operatorId!,
        resolution: data.resolution,
        customerSatisfaction: data.customerSatisfaction,
        tags: data.tags
      });

      if (result.success) {
        socket.leave(`chat:${data.sessionId}`);
        
        this.io.to('operators').emit('chat:resolved', {
          sessionId: data.sessionId,
          operatorId: socket.user.operatorId,
          resolution: data.resolution
        });

        socket.emit('chat:resolved', { sessionId: data.sessionId });

        logger.info('Chat resolved', {
          sessionId: data.sessionId,
          operatorId: socket.user.operatorId
        });
      }
    } catch (error) {
      logger.error('Failed to resolve chat', { error, sessionId: data.sessionId });
      socket.emit('error', { message: 'Failed to resolve chat' });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    this.connectedOperators.delete(socket.user.operatorId!);
    
    socket.to('operators').emit('operator:offline', {
      operatorId: socket.user.operatorId
    });

    logger.info('Operator disconnected', { 
      operatorId: socket.user.operatorId,
      userId: socket.user.id 
    });
  }

  private broadcastOperatorOnline(operatorId: string): void {
    this.io.to('operators').emit('operator:online', { operatorId });
  }

  public broadcastToOperators(event: string, data: any): void {
    this.io.to('operators').emit(event, data);
  }

  public broadcastToOperator(operatorId: string, event: string, data: any): void {
    this.io.to(`operator:${operatorId}`).emit(event, data);
  }

  public broadcastChatUpdate(sessionId: string, update: any): void {
    this.io.to(`chat:${sessionId}`).emit('chat:updated', update);
  }

  public getConnectedOperators(): string[] {
    return Array.from(this.connectedOperators.keys());
  }

  public isOperatorConnected(operatorId: string): boolean {
    return this.connectedOperators.has(operatorId);
  }
}