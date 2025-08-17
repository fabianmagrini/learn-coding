# Claude AI Assistant Project Context

## Project Overview

**Onya** is a production-grade AI customer service chatbot built with a modern TypeScript stack. This document provides context for Claude AI assistants working on this project.

## Architecture Summary

This is a **monorepo** using **npm workspaces** with a **vertical slice architecture**:

```
Customer App (React) → Customer BFF (tRPC) → Shared Services (LLM + Business Logic)
```

### Key Services
- **Shared Services** (port 3000) - Core business logic, LLM integration, data management
- **Customer BFF** (port 3001) - tRPC server for customer-facing API
- **Customer App** (port 5173) - React frontend for customers
- **Operator Services** (planned) - For human operators

## Technology Stack

### Core Technologies
- **TypeScript** - Primary language across all services
- **tRPC** - Type-safe API communication between frontend and backend
- **React 18 + Vite** - Frontend framework and build tool
- **Node.js + Express** - Backend runtime and HTTP server
- **Zod** - Schema validation
- **TanStack Query** - Server state management (integrated with tRPC)
- **Zustand** - Client state management

### AI Integration
- **OpenAI API** - Primary LLM provider
- **Mock LLM Service** - Fallback for development/testing

### Infrastructure
- **Docker + Docker Compose** - Containerization
- **npm Workspaces** - Monorepo management
- **WebSockets** - Real-time communication via tRPC subscriptions

## Project Structure

```
onya/
├── apps/
│   ├── customer-app/          # React customer interface
│   └── operator-app/          # Operator dashboard (planned)
├── bffs/
│   ├── customer-bff/          # Customer API server (tRPC)
│   └── operator-bff/          # Operator API server (planned)
├── services/
│   └── shared-services/       # Core business logic + LLM
├── docker-compose.yml         # Container orchestration
├── package.json              # Monorepo configuration
├── README.md                 # User documentation
└── CLAUDE.md                 # This file
```

## Development Commands

### Primary Commands
```bash
# Start all services (recommended)
npm run dev

# Docker setup (alternative)
docker-compose up -d

# Individual services
npm run dev:shared-services    # Port 3000
npm run dev:customer-bff      # Port 3001  
npm run dev:customer-app      # Port 5173
```

### Testing & Building
```bash
npm test                      # Run all tests
npm run build                # Build all services
npm run lint                 # Lint all services
npm run typecheck            # TypeScript compilation check
```

## Key Implementation Details

### tRPC Setup
- **Session-based procedures** - Custom middleware for session validation
- **Real-time subscriptions** - WebSocket support for live updates
- **Type-safe APIs** - Full TypeScript integration

### Session Management
- Sessions created via `chat.createSession` mutation
- Session ID passed in request input data (not headers)
- Custom `sessionProcedure` middleware validates session IDs

### LLM Integration
- Mock service by default (`LLM_PROVIDER=mock`)
- OpenAI integration available (`LLM_PROVIDER=openai`)
- Escalation triggers based on sentiment analysis and keywords

### Real-time Features
- Chat messaging via WebSocket subscriptions
- Escalation status updates
- Queue position updates for human operators

## Common Issues & Solutions

### tRPC Session Middleware
The `sessionProcedure` middleware expects session IDs in the input data, not headers. For queries like `getChatHistory`, the session ID comes from the validated input schema.

### Docker Build Issues
If npm ci fails in Docker builds, ensure package-lock.json files exist in individual service directories or use `npm install` instead.

### Port Conflicts
Services use ports 3000, 3001, and 5173. Use `lsof -ti:PORT | xargs kill -9` to clear conflicts.

## Environment Configuration

### Required Environment Variables
```bash
# Shared Services
NODE_ENV=development
OPENAI_API_KEY=your_key_here  # Optional
LLM_PROVIDER=mock             # or 'openai'

# Customer BFF  
SHARED_SERVICES_URL=http://localhost:3000

# Customer App
VITE_CUSTOMER_BFF_URL=http://localhost:3001
VITE_CUSTOMER_ID=demo-customer
```

## Testing Strategy

### Test Framework
- **Vitest** - Unit testing
- **React Testing Library** - Component testing
- **Supertest** - API testing (planned)

### Test Commands
```bash
npm test --workspace=apps/customer-app
npm test --workspace=bffs/customer-bff
npm test --workspace=services/shared-services
```

## Current Status

### Completed Features ✅
- Core chat functionality with AI responses
- Real-time messaging via WebSockets
- Session management and persistence
- Smart escalation triggers
- Docker containerization
- Type-safe tRPC APIs
- Customer React frontend

### Planned Features 🚧
- Operator dashboard for human agents
- Operator BFF for chat management
- Comprehensive test suite
- Production deployment configuration

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add proper error handling and logging
- Include JSDoc comments for complex functions

### Architecture Principles
- Maintain separation of concerns between services
- Use tRPC for type-safe API communication
- Keep business logic in shared services
- Follow vertical slice architecture patterns

### Testing Requirements
- Add tests for new features
- Maintain high test coverage
- Test both happy path and error scenarios
- Include integration tests for tRPC endpoints

## Helpful Context for Claude

### When Working on This Project:
1. **Always check running services** - Use `docker-compose ps` or `npm run dev` status
2. **Session IDs are critical** - Most chat operations require valid session IDs
3. **tRPC types are generated** - TypeScript errors often indicate schema mismatches
4. **Check logs for debugging** - Use `docker-compose logs -f` or individual service logs
5. **Test endpoints manually** - Use curl or Postman for API validation

### Common Workflows:
- **Adding new chat features** → Update shared services, then BFF, then frontend
- **Fixing tRPC issues** → Check schemas, middleware, and type exports
- **Debugging real-time features** → Check WebSocket connections and subscriptions
- **Performance issues** → Check service health endpoints and logs

### Important Files:
- `bffs/customer-bff/src/trpc/router.ts` - Main tRPC router
- `services/shared-services/src/services/llm/` - LLM integration
- `apps/customer-app/src/features/chat/` - React chat components
- `docker-compose.yml` - Service orchestration

This document should be updated as the project evolves to maintain accurate context for future Claude interactions.