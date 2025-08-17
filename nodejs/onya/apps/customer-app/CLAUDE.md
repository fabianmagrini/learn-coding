# Customer App - Claude Context

## Service Overview

The **Customer App** is a React-based frontend application that provides the chat interface for customers to interact with the AI chatbot and request human escalation.

## Key Details

- **Port**: 5173 (Vite dev server)
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand (client) + TanStack Query (server)
- **API Communication**: tRPC client

## Project Structure

```
apps/customer-app/
├── src/
│   ├── features/chat/          # Chat functionality
│   │   ├── components/         # Chat UI components
│   │   ├── hooks/             # Custom React hooks
│   │   └── stores/            # Zustand stores
│   ├── shared/
│   │   ├── components/        # Reusable UI components
│   │   ├── stores/           # Global stores
│   │   └── trpc/             # tRPC client setup
│   ├── App.tsx               # Main app component
│   └── main.tsx              # React entry point
├── public/                   # Static assets
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
└── tsconfig.json            # TypeScript config
```

## Key Components

### Chat Features (`src/features/chat/`)

#### Components
- **ChatInterface** - Main chat container
- **MessageList** - Displays conversation history
- **MessageInput** - Input field for new messages
- **EscalationPanel** - Shows escalation status and controls

#### Hooks
- **useChat** - Main chat logic and tRPC integration
- **useEscalation** - Escalation management

#### Stores
- **chatStore** - Chat state management with Zustand

### tRPC Client (`src/shared/trpc/`)

#### Key Files
- **client.ts** - tRPC client configuration
- **types.ts** - TypeScript type exports

#### Configuration
```typescript
// Client setup with proper headers
const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: wsLink({ client: wsClient }),
      false: httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        headers: () => getCustomerHeaders(),
      }),
    }),
  ],
});
```

## tRPC Integration

### Available Procedures

#### Chat Operations
- `chat.createSession` - Creates new chat session
- `chat.sendMessage` - Sends message and gets AI response
- `chat.getChatHistory` - Retrieves conversation history
- `chat.onNewMessage` - Real-time message subscription

#### Escalation Operations
- `escalation.requestEscalation` - Requests human operator
- `escalation.getEscalationStatus` - Gets current escalation status
- `escalation.onEscalationStatusChange` - Real-time escalation updates

### Example Usage
```typescript
// In useChat hook
const sendMessageMutation = trpc.chat.sendMessage.useMutation({
  onSuccess: (data) => {
    addMessage(data.message);
    setEscalationStatus(data.escalationStatus);
  },
});

// Real-time subscription
trpc.chat.onNewMessage.useSubscription(
  { sessionId: currentSession?.id || '' },
  {
    enabled: !!currentSession?.id,
    onData: (message) => addMessage(message),
  }
);
```

## State Management

### Chat Store (Zustand)
```typescript
interface ChatStore {
  // State
  currentSession: ChatSession | null;
  messages: Message[];
  isSending: boolean;
  escalationStatus: EscalationStatus;
  customerId: string;

  // Actions
  setCurrentSession: (session: ChatSession) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setIsSending: (sending: boolean) => void;
  setEscalationStatus: (status: EscalationStatus) => void;
}
```

## Environment Variables

### Required Configuration
```bash
# .env
VITE_CUSTOMER_BFF_URL=http://localhost:3001
VITE_CUSTOMER_ID=demo-customer
VITE_CUSTOMER_NAME=Demo Customer
VITE_CUSTOMER_EMAIL=demo@example.com
VITE_CUSTOMER_TIER=basic
```

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Common Development Tasks

### Adding New Chat Features

1. **Update tRPC types** - Ensure Customer BFF has new procedures
2. **Create/update hooks** - Add logic in `src/features/chat/hooks/`
3. **Update components** - Modify UI in `src/features/chat/components/`
4. **Update store** - Add state management if needed

### Debugging tRPC Issues

1. **Check network tab** - Verify requests are being sent
2. **Check console logs** - Look for tRPC errors
3. **Verify headers** - Ensure customer headers are set correctly
4. **Test BFF directly** - Use curl to test backend endpoints

### Working with Real-time Features

1. **WebSocket connections** - Check if WS connection is established
2. **Subscription management** - Ensure subscriptions are properly cleaned up
3. **State updates** - Verify real-time data updates store correctly

## Testing Strategy

### Test Files
- Component tests in `src/**/*.test.tsx`
- Hook tests in `src/**/*.test.ts`
- Integration tests for tRPC client

### Testing Tools
- **Vitest** - Test runner
- **React Testing Library** - Component testing
- **MSW** - API mocking

### Example Test
```typescript
describe('useChat hook', () => {
  it('should create session and send message', async () => {
    const { result } = renderHook(() => useChat());
    
    await act(async () => {
      await result.current.createSession();
    });
    
    expect(result.current.currentSession).toBeDefined();
  });
});
```

## Common Issues & Solutions

### tRPC Connection Issues
- Check `VITE_CUSTOMER_BFF_URL` environment variable
- Verify Customer BFF is running on port 3001
- Check browser network tab for failed requests

### WebSocket Subscription Issues
- Verify WebSocket URL is correct
- Check if subscriptions are being properly cleaned up
- Look for connection errors in browser console

### State Management Issues
- Check if Zustand store is properly initialized
- Verify state updates are triggering re-renders
- Use React DevTools to inspect component state

### Styling Issues
- Ensure Tailwind CSS is properly configured
- Check if custom styles are conflicting
- Verify responsive design on different screen sizes

## Performance Considerations

### Optimization Strategies
- Use React.memo for expensive components
- Implement proper dependency arrays in useEffect
- Debounce user input for search/filtering
- Lazy load components that aren't immediately visible

### Bundle Size Management
- Use dynamic imports for large dependencies
- Analyze bundle with `npm run build` and source maps
- Consider code splitting for different features

## Integration with Backend

### Customer BFF Communication
- All API calls go through tRPC client
- Session management handled automatically
- Real-time updates via WebSocket subscriptions

### Error Handling
- tRPC errors are caught and displayed to user
- Network errors trigger retry mechanisms
- Graceful degradation when services are unavailable

This customer app provides a modern, responsive chat interface with real-time capabilities and seamless integration with the backend services.