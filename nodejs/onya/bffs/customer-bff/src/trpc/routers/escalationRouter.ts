import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { router, sessionProcedure } from '../trpc';
import { EscalationStatus } from '../../shared/types/common.types';
import { sharedServiceClient } from '../../shared/services/sharedServiceClient';
import { logger } from '../../shared/utils/logger';

// Event emitter for escalation updates
const escalationEvents = new EventEmitter();

const requestEscalationSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

const getEscalationStatusSchema = z.object({
  sessionId: z.string().min(1),
});

export const escalationRouter = router({
  // Manually request escalation
  requestEscalation: sessionProcedure
    .input(requestEscalationSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Update session to escalated status
        await sharedServiceClient.updateChatSession(input.sessionId, {
          status: 'escalated',
          metadata: {
            escalationReason: input.reason || 'Manual escalation requested',
            escalationTimestamp: new Date(),
            priority: input.priority,
            customerId: ctx.customerId,
          },
        });

        // Mock queue position calculation
        const queuePosition = Math.floor(Math.random() * 5) + 1;
        const estimatedWaitTime = queuePosition * 3; // 3 minutes per position

        const escalationStatus: EscalationStatus = {
          escalated: true,
          queuePosition,
          estimatedWaitTime,
          reason: input.reason || 'Manual escalation requested',
        };

        // Emit escalation event
        escalationEvents.emit('escalationRequested', {
          sessionId: input.sessionId,
          customerId: ctx.customerId,
          escalationStatus,
        });

        logger.info('Manual escalation requested', {
          sessionId: input.sessionId,
          customerId: ctx.customerId,
          reason: input.reason,
          priority: input.priority,
        });

        return { escalationStatus };

      } catch (error) {
        logger.error('Failed to request escalation', { 
          error, 
          sessionId: input.sessionId,
          customerId: ctx.customerId 
        });
        throw new Error('Failed to request escalation');
      }
    }),

  // Get current escalation status
  getEscalationStatus: sessionProcedure
    .input(getEscalationStatusSchema)
    .query(async ({ input, ctx }) => {
      try {
        const sessionData = await sharedServiceClient.getChatSession(input.sessionId);
        const session = sessionData.data.session;

        if (!session) {
          throw new Error('Session not found');
        }

        const escalationStatus: EscalationStatus = {
          escalated: session.status === 'escalated',
          queuePosition: session.metadata?.queuePosition,
          estimatedWaitTime: session.metadata?.estimatedWaitTime,
          operatorId: session.operatorId,
          operatorName: session.metadata?.operatorName,
          reason: session.metadata?.escalationReason,
        };

        return { escalationStatus };

      } catch (error) {
        logger.error('Failed to get escalation status', { 
          error, 
          sessionId: input.sessionId,
          customerId: ctx.customerId 
        });
        throw new Error('Failed to get escalation status');
      }
    }),

  // Cancel escalation (if still in queue)
  cancelEscalation: sessionProcedure
    .input(getEscalationStatusSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const sessionData = await sharedServiceClient.getChatSession(input.sessionId);
        const session = sessionData.data.session;

        if (!session) {
          throw new Error('Session not found');
        }

        if (session.status !== 'escalated') {
          throw new Error('Session is not escalated');
        }

        if (session.operatorId) {
          throw new Error('Cannot cancel escalation - operator already assigned');
        }

        // Update session back to active
        await sharedServiceClient.updateChatSession(input.sessionId, {
          status: 'active',
          metadata: {
            ...session.metadata,
            escalationCancelled: true,
            escalationCancelledAt: new Date(),
          },
        });

        // Emit cancellation event
        escalationEvents.emit('escalationCancelled', {
          sessionId: input.sessionId,
          customerId: ctx.customerId,
        });

        logger.info('Escalation cancelled', {
          sessionId: input.sessionId,
          customerId: ctx.customerId,
        });

        return { 
          success: true,
          escalationStatus: { escalated: false }
        };

      } catch (error) {
        logger.error('Failed to cancel escalation', { 
          error, 
          sessionId: input.sessionId,
          customerId: ctx.customerId 
        });
        throw new Error('Failed to cancel escalation');
      }
    }),

  // Real-time subscription for escalation updates
  onEscalationStatusChange: sessionProcedure
    .input(getEscalationStatusSchema)
    .subscription(({ input }) => {
      return observable<{
        type: 'escalated' | 'assigned' | 'cancelled' | 'position_updated';
        escalationStatus: EscalationStatus;
      }>((emit) => {
        const onEscalationChange = (data: { 
          sessionId: string; 
          type: string;
          escalationStatus: EscalationStatus;
        }) => {
          if (data.sessionId === input.sessionId) {
            emit.next({
              type: data.type as any,
              escalationStatus: data.escalationStatus,
            });
          }
        };

        // Listen to various escalation events
        escalationEvents.on('escalationRequested', (data) => {
          if (data.sessionId === input.sessionId) {
            emit.next({
              type: 'escalated',
              escalationStatus: data.escalationStatus,
            });
          }
        });

        escalationEvents.on('operatorAssigned', (data) => {
          if (data.sessionId === input.sessionId) {
            emit.next({
              type: 'assigned',
              escalationStatus: data.escalationStatus,
            });
          }
        });

        escalationEvents.on('escalationCancelled', (data) => {
          if (data.sessionId === input.sessionId) {
            emit.next({
              type: 'cancelled',
              escalationStatus: { escalated: false },
            });
          }
        });

        escalationEvents.on('queuePositionUpdated', (data) => {
          if (data.sessionId === input.sessionId) {
            emit.next({
              type: 'position_updated',
              escalationStatus: data.escalationStatus,
            });
          }
        });

        return () => {
          escalationEvents.removeAllListeners();
        };
      });
    }),

  // Provide feedback on escalation experience
  submitEscalationFeedback: sessionProcedure
    .input(z.object({
      sessionId: z.string().min(1),
      rating: z.number().min(1).max(5),
      feedback: z.string().optional(),
      waitTimeAcceptable: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Store feedback in session metadata
        const sessionData = await sharedServiceClient.getChatSession(input.sessionId);
        const session = sessionData.data.session;

        if (!session) {
          throw new Error('Session not found');
        }

        await sharedServiceClient.updateChatSession(input.sessionId, {
          metadata: {
            ...session.metadata,
            escalationFeedback: {
              rating: input.rating,
              feedback: input.feedback,
              waitTimeAcceptable: input.waitTimeAcceptable,
              submittedAt: new Date(),
            },
          },
        });

        logger.info('Escalation feedback submitted', {
          sessionId: input.sessionId,
          customerId: ctx.customerId,
          rating: input.rating,
        });

        return { success: true };

      } catch (error) {
        logger.error('Failed to submit escalation feedback', { 
          error, 
          sessionId: input.sessionId,
          customerId: ctx.customerId 
        });
        throw new Error('Failed to submit feedback');
      }
    }),
});