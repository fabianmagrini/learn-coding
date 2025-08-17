# Shared Services - Claude Context

## Service Overview

The **Shared Services** is the core backend service that contains all the business logic, LLM integration, and data management for the Onya chatbot system. It provides REST APIs for other services and handles the core AI and chat functionality.

## Key Details

- **Port**: 3000
- **Framework**: Express.js + TypeScript
- **Primary Function**: Core business logic, LLM integration, data persistence
- **Communication**: REST APIs for BFF services, HTTP APIs for external integrations
- **LLM Providers**: OpenAI (configurable) + Mock service for development

## Project Structure

```
services/shared-services/
├── src/
│   ├── api/
│   │   └── routes/           # Express route handlers
│   │       ├── chat/         # Chat session and conversation routes
│   │       ├── llm/          # LLM processing routes
│   │       └── users/        # User and operator management routes
│   ├── services/
│   │   ├── chat-engine/      # Chat conversation management
│   │   ├── llm/             # LLM service implementations
│   │   └── user-management/  # User and operator services
│   ├── shared/
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utilities (config, logger)
│   ├── app.ts               # Express app configuration
│   └── server.ts            # Server entry point
├── dist/                    # Compiled JavaScript
├── logs/                    # Application logs
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── Dockerfile              # Docker container definition
```

## API Routes

### Chat Management (`/api/chat/`)

#### Session Operations
- `POST /api/chat/sessions` - Create new chat session
- `GET /api/chat/sessions/:id` - Get session details
- `PUT /api/chat/sessions/:id` - Update session status/metadata
- `DELETE /api/chat/sessions/:id` - Close/archive session

#### Message Operations
- `GET /api/chat/sessions/:id/messages` - Get conversation history
- `POST /api/chat/sessions/:id/messages` - Add message to conversation
- `GET /api/chat/sessions/:id/messages/:messageId` - Get specific message

### LLM Processing (`/api/llm/`)

#### Core Operations
- `POST /api/llm/process` - Process message with LLM and return response
- `GET /api/llm/status` - Get LLM service health and configuration
- `POST /api/llm/analyze-sentiment` - Analyze message sentiment for escalation

#### Example Request/Response
```typescript
// POST /api/llm/process
{
  "message": "I need help with my order",
  "context": {
    "sessionId": "abc123",
    "customerId": "customer456", 
    "customerTier": "premium",
    "conversationHistory": [...],
    "metadata": {}
  }
}

// Response
{
  "success": true,
  "data": {
    "response": "I'd be happy to help you with your order. Could you please provide your order number?",
    "escalationTriggers": {
      "sentiment": "neutral",
      "keywords": [],
      "shouldEscalate": false,
      "confidence": 0.85
    },
    "metadata": {
      "provider": "openai",
      "model": "gpt-4",
      "tokens": 150,
      "processingTime": 1200
    }
  }
}
```

### User Management (`/api/users/`)

#### Operator Operations
- `GET /api/users/operators` - List available operators
- `GET /api/users/operators/:id` - Get operator details
- `PUT /api/users/operators/:id/status` - Update operator availability

### Health Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Service metrics (planned)

## LLM Integration

### Service Architecture (`src/services/llm/`)

#### LLM Router (`llmRouter.ts`)
```typescript
class LLMRouter {
  private currentProvider: LLMService;
  
  async processMessage(message: string, context: ChatContext): Promise<LLMResponse> {
    // Route to appropriate LLM provider
    return await this.currentProvider.processMessage(message, context);
  }
  
  async analyzeEscalation(message: string, context: ChatContext): Promise<EscalationAnalysis> {
    // Analyze for escalation triggers
    return await this.currentProvider.analyzeEscalation(message, context);
  }
}
```

#### OpenAI Service (`openaiService.ts`)
```typescript
class OpenAIService implements LLMService {
  async processMessage(message: string, context: ChatContext): Promise<LLMResponse> {
    const prompt = this.buildPrompt(message, context);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: this.getSystemPrompt() },
        ...context.conversationHistory,
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    
    return this.formatResponse(response);
  }
  
  private getSystemPrompt(): string {
    return `You are a helpful customer service assistant. 
    Be professional, empathetic, and solution-focused.
    If you cannot help with an issue, suggest escalation to a human agent.`;
  }
}
```

#### Mock LLM Service (`mockLlmService.ts`)
```typescript
class MockLLMService implements LLMService {
  async processMessage(message: string, context: ChatContext): Promise<LLMResponse> {
    // Generate realistic mock responses for development
    const responses = [
      "Thank you for contacting us! How can I help you today?",
      "I understand your concern. Let me help you resolve this issue.",
      "Could you provide more details about the problem you're experiencing?",
    ];
    
    return {
      response: this.selectResponse(message, responses),
      escalationTriggers: this.analyzeForEscalation(message),
      metadata: { provider: "mock", processingTime: 100 }
    };
  }
}
```

### Escalation Logic

#### Trigger Detection
```typescript
interface EscalationTriggers {
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];           // Detected escalation keywords
  shouldEscalate: boolean;     // Final escalation decision
  confidence: number;          // Confidence score (0-1)
  reasons: string[];          // Human-readable reasons
}

// Escalation keywords
const ESCALATION_KEYWORDS = [
  'speak to manager', 'human agent', 'supervisor',
  'cancel my account', 'terrible service', 'lawsuit',
  'complaint', 'refund', 'unacceptable'
];
```

## Chat Engine (`src/services/chat-engine/`)

### Conversation Manager (`conversationManager.ts`)
```typescript
class ConversationManager {
  async createSession(customerId: string, customerData: CustomerData): Promise<ChatSession> {
    const session = {
      id: generateSessionId(),
      customerId,
      status: 'active',
      createdAt: new Date(),
      metadata: { ...customerData }
    };
    
    // Store session (in-memory for now, database later)
    this.sessions.set(session.id, session);
    return session;
  }
  
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    if (!session.messages) session.messages = [];
    session.messages.push(message);
    session.updatedAt = new Date();
  }
  
  async processCustomerMessage(sessionId: string, message: string, customerId: string): Promise<{
    botMessage: Message;
    escalationStatus: EscalationStatus;
  }> {
    // 1. Add customer message to session
    const customerMessage = this.createMessage(message, 'user', customerId);
    await this.addMessage(sessionId, customerMessage);
    
    // 2. Get conversation context
    const context = await this.buildChatContext(sessionId);
    
    // 3. Process with LLM
    const llmResponse = await this.llmService.processMessage(message, context);
    
    // 4. Create bot response
    const botMessage = this.createMessage(llmResponse.response, 'assistant');
    await this.addMessage(sessionId, botMessage);
    
    // 5. Check for escalation
    const escalationStatus = this.evaluateEscalation(llmResponse.escalationTriggers);
    
    return { botMessage, escalationStatus };
  }
}
```

## Data Models

### Core Types (`src/shared/types/common.types.ts`)
```typescript
interface ChatSession {
  id: string;
  customerId: string;
  operatorId?: string;
  status: 'active' | 'escalated' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
  metadata?: Record<string, any>;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface EscalationStatus {
  escalated: boolean;
  queuePosition?: number;
  estimatedWaitTime?: number;
  operatorId?: string;
  operatorName?: string;
  reason?: string;
}

interface CustomerData {
  name?: string;
  email?: string;
  tier: 'basic' | 'premium' | 'enterprise';
  metadata?: Record<string, any>;
}
```

## Configuration Management

### Environment Variables
```bash
# Core service configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# LLM Configuration
LLM_PROVIDER=mock              # 'openai' or 'mock'
OPENAI_API_KEY=your_key_here   # Required if LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4             # Default model

# Service authentication
SERVICE_TOKEN=shared-service-secret-token

# External service URLs (when added)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Configuration Loader (`src/shared/utils/config.ts`)
```typescript
export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'mock',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SERVICE_TOKEN: process.env.SERVICE_TOKEN || 'default-token',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
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
// Service-specific logging context
logger.info('Chat session created', {
  sessionId: session.id,
  customerId: session.customerId,
  customerTier: customerData.tier,
  service: 'shared-services',
  timestamp: new Date().toISOString(),
});

logger.error('LLM processing failed', {
  error: error.message,
  message: truncateMessage(message),
  provider: this.currentProvider.name,
  retryCount: context.retryCount,
  service: 'shared-services',
});
```

### Mock Data Seeding
```typescript
// Automatic mock data creation on startup
async function seedMockData() {
  // Create mock operators
  const operators = [
    { id: 'op1', name: 'Alice Johnson', status: 'available' },
    { id: 'op2', name: 'Bob Smith', status: 'busy' },
    // ...
  ];
  
  // Create mock customers  
  const customers = [
    { id: 'cust1', name: 'John Doe', tier: 'premium' },
    { id: 'cust2', name: 'Jane Smith', tier: 'basic' },
    // ...
  ];
  
  logger.info('Mock data seeded', { 
    operators: operators.length,
    customers: customers.length 
  });
}
```

## Testing Strategy

### Test Categories
- **Unit tests** - Individual service functions
- **Integration tests** - API endpoint testing
- **LLM tests** - Mock vs real LLM comparison
- **Performance tests** - Load testing for chat processing

### Example Tests
```typescript
describe('ConversationManager', () => {
  it('should create new chat session', async () => {
    const session = await conversationManager.createSession('customer1', {
      tier: 'basic'
    });
    
    expect(session.id).toBeDefined();
    expect(session.customerId).toBe('customer1');
    expect(session.status).toBe('active');
  });
  
  it('should process message and return bot response', async () => {
    const result = await conversationManager.processCustomerMessage(
      'session1',
      'I need help',
      'customer1'
    );
    
    expect(result.botMessage.content).toBeDefined();
    expect(result.escalationStatus.escalated).toBe(false);
  });
});
```

## Performance Considerations

### Optimization Strategies
- **Response caching** - Cache common LLM responses
- **Connection pooling** - Reuse HTTP connections for external APIs
- **Request batching** - Batch multiple LLM requests when possible
- **Async processing** - Non-blocking message processing

### Scalability Planning
- **Horizontal scaling** - Stateless service design
- **Database integration** - Replace in-memory storage
- **Queue system** - Handle high message volumes
- **Load balancing** - Distribute requests across instances

## Security Considerations

### API Security
- **Service authentication** - Token-based auth between services
- **Input validation** - Sanitize all user inputs
- **Rate limiting** - Prevent API abuse
- **CORS configuration** - Restrict cross-origin requests

### Data Protection
- **Message encryption** - Encrypt sensitive conversation data
- **PII handling** - Proper handling of customer personal information
- **Audit logging** - Log all data access and modifications

### LLM Security
- **Prompt injection prevention** - Sanitize user inputs to LLM
- **Content filtering** - Filter inappropriate content
- **Token limiting** - Prevent excessive LLM usage

This Shared Services layer provides the robust foundation for the entire Onya chatbot system, handling all core business logic, AI processing, and data management with scalability and security in mind.