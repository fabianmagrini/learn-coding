# Customer BFF - Claude Context

## Service Overview

The **Customer BFF** (Backend For Frontend) is a Node.js TypeScript service that provides a tRPC-based API specifically designed for the customer-facing application. It acts as an intermediary between the React frontend and the shared services.

## Key Details

- **Port**: 3001
- **Framework**: Express.js + tRPC
- **Language**: TypeScript
- **Primary Function**: Type-safe API layer for customer operations
- **Communication**: HTTP REST with Shared Services, tRPC with Customer App

## Project Structure

```
bffs/customer-bff/
├── src/
│   ├── features/chat/          # Chat-related business logic
│   │   ├── services/          # Chat service implementations
│   │   └── validation/        # Zod schemas for validation
│   ├── shared/
│   │   ├── services/         # Shared service client
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utilities (config, logger)
│   ├── trpc/
│   │   ├── routers/         # tRPC route definitions
│   │   ├── context.ts       # tRPC context creation
│   │   ├── router.ts        # Main tRPC router
│   │   └── trpc.ts         # tRPC setup and procedures
│   ├── app.ts              # Express app configuration
│   └── server.ts           # Server entry point
├── dist/                   # Compiled JavaScript
├── logs/                   # Application logs
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── Dockerfile             # Docker container definition
```

## tRPC Architecture

### Core Setup (`src/trpc/`)

#### Procedures
- **publicProcedure** - No authentication required
- **authenticatedProcedure** - Requires customer ID
- **sessionProcedure** - Requires valid session ID (custom middleware)

#### Context Creation
```typescript
// src/trpc/context.ts
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  const customerId = req.headers['x-customer-id'] as string || 'anonymous';
  const sessionId = req.headers['x-session-id'] as string;
  
  return {
    req, res, customerId, sessionId,
    customerData: {
      name: req.headers['x-customer-name'],
      email: req.headers['x-customer-email'],
      tier: req.headers['x-customer-tier'],
    },
    sharedServiceClient,
  };
};
```

#### Session Middleware
```typescript
// Custom session procedure for chat operations
export const sessionProcedure = authenticatedProcedure.use(
  t.middleware(({ ctx, input, next }) => {
    // Session ID validation happens in procedure implementation
    // since input is available after schema validation
    return next({ ctx: { ...ctx, sessionId: ctx.sessionId } });
  })
);
```

### Router Structure (`src/trpc/routers/`)

#### Chat Router (`chatRouter.ts`)
- `createSession` - Creates new chat session
- `sendMessage` - Processes messages and gets AI responses
- `getChatHistory` - Retrieves conversation history
- `getSessionDetails` - Gets session metadata
- `updateSession` - Updates session status
- `onNewMessage` - Real-time message subscription
- `onEscalationUpdate` - Real-time escalation subscription

#### Escalation Router (`escalationRouter.ts`)
- `requestEscalation` - Manual escalation request
- `getEscalationStatus` - Current escalation status
- `cancelEscalation` - Cancel pending escalation
- `onEscalationStatusChange` - Real-time escalation updates
- `submitEscalationFeedback` - Post-escalation feedback

### Example tRPC Procedure
```typescript
// Chat history retrieval with session validation
getChatHistory: sessionProcedure
  .input(getChatHistorySchema)
  .query(async ({ input, ctx }) => {
    // Explicit session ID validation
    if (!input.sessionId) {
      throw new Error('Session ID required');
    }
    
    const messages = await chatService.getChatHistory(input.sessionId, input.limit);
    return { messages };
  }),
```

## Validation Schemas (`src/features/chat/validation/`)

### Zod Schemas
```typescript
// chatSchemas.ts
export const sendMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().min(1),
});

export const getChatHistorySchema = z.object({
  sessionId: z.string().min(1),
  limit: z.number().min(1).max(100).optional(),
});
```

## Service Integration

### Shared Services Client (`src/shared/services/sharedServiceClient.ts`)

#### Key Methods
```typescript
class SharedServiceClient {
  // Chat operations
  async createChatSession(customerId: string, customerData: any): Promise<any>
  async getChatHistory(sessionId: string, limit?: number): Promise<any>
  async processChatMessage(sessionId: string, message: string, customerId: string): Promise<any>
  
  // Session management
  async getChatSession(sessionId: string): Promise<any>
  async updateChatSession(sessionId: string, updates: any): Promise<any>
  
  // Health checks
  async healthCheck(): Promise<any>
}
```

#### HTTP Communication
- Base URL: `http://shared-services:3000` (Docker) or `http://localhost:3000` (local)
- Authentication: Service token in headers
- Error handling: Axios interceptors for logging and retry logic

## Real-time Features

### WebSocket Subscriptions
```typescript
// Real-time message updates
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
      return () => chatEvents.off('newMessage', onMessage);
    });
  }),
```

### Event System
- **EventEmitter** based real-time communication
- Events: `newMessage`, `escalationUpdate`, `sessionUpdate`
- Automatic cleanup on subscription end

## Environment Configuration

### Required Variables
```bash
# .env
PORT=3001
NODE_ENV=development
SHARED_SERVICES_URL=http://localhost:3000
CUSTOMER_APP_URL=http://localhost:5173
SERVICE_TOKEN=shared-service-secret-token
SESSION_SECRET=customer-bff-session-secret
LOG_LEVEL=info
```

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Logging and Monitoring

### Structured Logging
```typescript
// src/shared/utils/logger.ts
logger.info('tRPC request processed', {
  path: 'chat.sendMessage',
  customerId: ctx.customerId,
  sessionId: input.sessionId,
  timestamp: new Date().toISOString(),
});
```

### Health Checks
- Endpoint: `GET /health`
- Checks: Shared services connectivity, database health
- Docker health check integration

## Error Handling

### tRPC Error Filtering
```typescript
// Filter out browser noise from logs
onError: ({ error, path, input }) => {
  // Ignore browser requests to empty path
  if (path === '') return;
  
  logger.error('tRPC error', {
    error: error.message,
    path, input,
    stack: error.stack,
  });
},
```

### Common Error Patterns
- **Session not found** - Invalid or expired session ID
- **Customer authentication required** - Missing customer headers
- **Shared services unavailable** - Backend service down
- **Validation errors** - Invalid input data

## Testing Strategy

### Test Structure
```bash
src/
├── __tests__/              # Test files
│   ├── integration/        # tRPC integration tests
│   ├── unit/              # Unit tests
│   └── fixtures/          # Test data
```

### Testing Tools
- **Vitest** - Test runner
- **Supertest** - HTTP testing
- **MSW** - API mocking

### Example Test
```typescript
describe('Chat Router', () => {
  it('should create session for authenticated customer', async () => {
    const response = await request(app)
      .post('/trpc/chat.createSession')
      .set('x-customer-id', 'test-customer')
      .send({ customerData: { tier: 'basic' } });
      
    expect(response.status).toBe(200);
    expect(response.body.result.data.session).toBeDefined();
  });
});
```

## Common Development Tasks

### Adding New tRPC Procedures

1. **Define schema** in `src/features/*/validation/`
2. **Implement service logic** in `src/features/*/services/`
3. **Add tRPC procedure** in `src/trpc/routers/`
4. **Export in main router** in `src/trpc/router.ts`
5. **Add tests** in `src/__tests__/`

### Debugging tRPC Issues

1. **Check middleware execution** - Verify authentication and session validation
2. **Validate schemas** - Ensure input matches Zod schemas
3. **Test shared services** - Check backend service connectivity
4. **Review logs** - Look for structured log output

### Working with Real-time Features

1. **Event emission** - Ensure events are emitted after state changes
2. **Subscription cleanup** - Verify event listeners are removed
3. **WebSocket testing** - Use browser dev tools to monitor WS connections

## Performance Considerations

### Optimization Strategies
- **Connection pooling** - Reuse HTTP connections to shared services
- **Request batching** - Leverage tRPC batching for multiple calls
- **Caching** - Cache frequently accessed session data
- **Rate limiting** - Prevent abuse of endpoints

### Monitoring
- **Response times** - Track tRPC procedure execution times
- **Error rates** - Monitor failed requests and their causes
- **Resource usage** - Memory and CPU utilization

## Security Considerations

### Input Validation
- All inputs validated with Zod schemas
- Sanitization of user-provided content
- SQL injection prevention (when database is added)

### Authentication
- Customer ID validation on all authenticated procedures
- Session validation for chat operations
- Service-to-service authentication with tokens

### Rate Limiting
- Implement rate limiting for message sending
- Prevent spam and abuse
- Graceful degradation under high load

This Customer BFF provides a robust, type-safe API layer that seamlessly connects the React frontend with the backend services while maintaining proper separation of concerns and scalability.