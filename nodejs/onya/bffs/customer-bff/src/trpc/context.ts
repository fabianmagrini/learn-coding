import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { sharedServiceClient } from '../shared/services/sharedServiceClient';
import { logger } from '../shared/utils/logger';

export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  // Extract customer session from headers or session
  const customerId = req.headers['x-customer-id'] as string || 'anonymous';
  const sessionId = req.headers['x-session-id'] as string;
  
  // Extract customer metadata from headers
  const customerName = req.headers['x-customer-name'] as string;
  const customerEmail = req.headers['x-customer-email'] as string;
  const customerTier = req.headers['x-customer-tier'] as 'basic' | 'premium' | 'enterprise';

  logger.info('Creating tRPC context', { 
    customerId, 
    sessionId,
    hasCustomerName: !!customerName,
    hasCustomerEmail: !!customerEmail,
    customerTier,
  });

  return {
    req,
    res,
    customerId,
    sessionId,
    customerData: {
      name: customerName,
      email: customerEmail,
      tier: customerTier || 'basic',
    },
    // Inject shared service client
    sharedServiceClient,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;