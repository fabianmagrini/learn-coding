import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { router, publicProcedure, authenticatedProcedure, sessionProcedure } from '../trpc';
import { ChatService } from '../../features/chat/services/chatService';
import { 
  sendMessageSchema, 
  createSessionSchema, 
  getChatHistorySchema,
  updateSessionSchema 
} from '../../features/chat/validation/chatSchemas';
import { Message, EscalationStatus } from '../../shared/types/common.types';
import { logger } from '../../shared/utils/logger';

// Event emitter for real-time updates
const chatEvents = new EventEmitter();
const chatService = new ChatService();

export const chatRouter = router({
  // Create a new chat session
  createSession: authenticatedProcedure
    .input(createSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const session = await chatService.createChatSession(
        ctx.customerId,
        { ...ctx.customerData, ...input.customerData }
      );

      logger.info('Created chat session via tRPC', {
        sessionId: session.id,
        customerId: ctx.customerId,
      });

      return { session };
    }),

  // Send a message and get bot response
  sendMessage: sessionProcedure
    .input(sendMessageSchema)
    .mutation(async ({ input, ctx }) => {
      // Ensure we have a session ID from input (required by schema)
      if (!input.sessionId) {
        throw new Error('Session ID required');
      }

      const { botMessage, escalationStatus } = await chatService.processMessage(
        input.message,
        input.sessionId,
        ctx.customerId,
        ctx.customerData
      );

      // Emit events for real-time updates
      chatEvents.emit('newMessage', {
        sessionId: input.sessionId,
        message: botMessage,
      });

      if (escalationStatus.escalated) {
        chatEvents.emit('escalationUpdate', {
          sessionId: input.sessionId,
          escalationStatus,
        });
      }

      return {
        message: botMessage,
        escalationStatus,
      };
    }),

  // Get chat history
  getChatHistory: sessionProcedure
    .input(getChatHistorySchema)
    .query(async ({ input, ctx }) => {
      // Ensure we have a session ID from input (required by schema)
      if (!input.sessionId) {
        throw new Error('Session ID required');
      }
      
      const messages = await chatService.getChatHistory(input.sessionId, input.limit);
      return { messages };
    }),

  // Get session details
  getSessionDetails: sessionProcedure
    .input(getChatHistorySchema.pick({ sessionId: true }))
    .query(async ({ input }) => {
      const sessionData = await chatService.getSessionDetails(input.sessionId);
      return sessionData;
    }),

  // Get customer's chat history (all sessions)
  getCustomerHistory: authenticatedProcedure
    .query(async ({ ctx }) => {
      const sessions = await chatService.getCustomerChatHistory(ctx.customerId);
      return { sessions };
    }),

  // Update session status
  updateSession: sessionProcedure
    .input(updateSessionSchema)
    .mutation(async ({ input }) => {
      if (!input.status) {
        throw new Error('Status is required for session update');
      }
      
      const session = await chatService.updateSessionStatus(input.sessionId, input.status);
      
      // Emit session update event
      chatEvents.emit('sessionUpdate', {
        sessionId: input.sessionId,
        session,
      });

      return { session };
    }),

  // Real-time subscription for new messages
  onNewMessage: sessionProcedure
    .input(getChatHistorySchema.pick({ sessionId: true }))
    .subscription(({ input }) => {
      return observable<Message>((emit) => {
        const onMessage = (data: { sessionId: string; message: Message }) => {
          if (data.sessionId === input.sessionId) {
            emit.next(data.message);
          }
        };

        chatEvents.on('newMessage', onMessage);

        return () => {
          chatEvents.off('newMessage', onMessage);
        };
      });
    }),

  // Real-time subscription for escalation updates
  onEscalationUpdate: sessionProcedure
    .input(getChatHistorySchema.pick({ sessionId: true }))
    .subscription(({ input }) => {
      return observable<EscalationStatus>((emit) => {
        const onEscalation = (data: { sessionId: string; escalationStatus: EscalationStatus }) => {
          if (data.sessionId === input.sessionId) {
            emit.next(data.escalationStatus);
          }
        };

        chatEvents.on('escalationUpdate', onEscalation);

        return () => {
          chatEvents.off('escalationUpdate', onEscalation);
        };
      });
    }),

  // Real-time subscription for session updates
  onSessionUpdate: sessionProcedure
    .input(getChatHistorySchema.pick({ sessionId: true }))
    .subscription(({ input }) => {
      return observable<any>((emit) => {
        const onSessionUpdate = (data: { sessionId: string; session: any }) => {
          if (data.sessionId === input.sessionId) {
            emit.next(data.session);
          }
        };

        chatEvents.on('sessionUpdate', onSessionUpdate);

        return () => {
          chatEvents.off('sessionUpdate', onSessionUpdate);
        };
      });
    }),
});