import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink, splitLink, wsLink, createWSClient } from '@trpc/client';
import type { AppRouter } from '../../../../bffs/customer-bff/src/trpc/router';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = import.meta.env.VITE_CUSTOMER_BFF_URL;
  if (url) return url;
  
  if (typeof window !== 'undefined') {
    return 'http://localhost:3001';
  }
  
  return 'http://localhost:3001';
};

const getCustomerHeaders = () => {
  const customerId = import.meta.env.VITE_CUSTOMER_ID || 'demo-customer';
  const customerName = import.meta.env.VITE_CUSTOMER_NAME || 'Demo Customer';
  const customerEmail = import.meta.env.VITE_CUSTOMER_EMAIL || 'demo@example.com';
  const customerTier = import.meta.env.VITE_CUSTOMER_TIER || 'basic';

  return {
    'x-customer-id': customerId,
    'x-customer-name': customerName,
    'x-customer-email': customerEmail,
    'x-customer-tier': customerTier,
  };
};

// WebSocket client for subscriptions
const wsClient = createWSClient({
  url: getBaseUrl().replace('http', 'ws') + '/trpc',
});

export const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition(op) {
        return op.type === 'subscription';
      },
      true: wsLink({
        client: wsClient,
      }),
      false: httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        headers: () => ({
          ...getCustomerHeaders(),
        }),
      }),
    }),
  ],
});