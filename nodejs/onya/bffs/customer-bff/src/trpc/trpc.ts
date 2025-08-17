import { initTRPC } from '@trpc/server';
import { Context } from './context';
import { ZodError } from 'zod';
import { logger } from '../shared/utils/logger';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Base router
export const router = t.router;

// Public procedure (no authentication required)
export const publicProcedure = t.procedure.use(
  t.middleware(({ ctx, next }) => {
    logger.info('Processing tRPC request', {
      customerId: ctx.customerId,
      sessionId: ctx.sessionId,
    });
    return next();
  })
);

// Authenticated procedure (requires customer ID)
export const authenticatedProcedure = publicProcedure.use(
  t.middleware(({ ctx, next }) => {
    if (!ctx.customerId || ctx.customerId === 'anonymous') {
      throw new Error('Customer authentication required');
    }
    return next({
      ctx: {
        ...ctx,
        customerId: ctx.customerId,
      },
    });
  })
);

// Session procedure (requires session ID in input or context)
// Note: For session procedures, the session ID comes from the input data
// The middleware will validate this after input parsing
export const sessionProcedure = authenticatedProcedure.use(
  t.middleware(({ ctx, input, next }) => {
    // Debug logging
    logger.info('Session middleware debug', {
      contextSessionId: ctx.sessionId,
      inputSessionId: (input as any)?.sessionId,
      inputType: typeof input,
      inputKeys: input ? Object.keys(input as any) : 'null',
      input: input,
    });
    
    // For session procedures, we'll validate the session ID exists in the actual procedure
    // The middleware just passes through since input validation happens later
    return next({
      ctx: {
        ...ctx,
        // Keep the original session ID from context if available
        sessionId: ctx.sessionId,
      },
    });
  })
);