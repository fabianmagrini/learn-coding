# DevFoundry — AI-Native Engineering Platform

> Governed AI code generation at organisational scale.

DevFoundry is a **software factory control system**. Developers describe engineering intent; AI agents implement code; the platform governs quality, architecture, and risk. It fills the gap between AI coding assistants (Copilot, Cursor) and governed engineering systems.

---

## Architecture

```
                    ┌────────────────────────────────┐
                    │      Developer Interface       │
                    │  CLI / Web Dashboard / IDE     │
                    └───────────────┬────────────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────┐
                    │        AI Agent Fleet          │
                    │  Feature · Test · Refactor     │
                    │  Security · Dependency · PR    │
                    └───────────────┬────────────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────┐
                    │    Engineering Control Plane   │
                    │                                │
                    │  Policy Engine (OPA-style)     │
                    │  Risk Tier Classifier          │
                    │  Architecture Rules            │
                    │  Approval Workflows            │
                    └───────────────┬────────────────┘
                                    │
                        ┌───────────┴────────────┐
                        │                        │
                        ▼                        ▼
        ┌───────────────────────┐   ┌─────────────────────────┐
        │   AI Harness System   │   │  Observability Platform │
        │  build → test → lint  │   │  DORA · AI metrics      │
        │  → arch → risk →      │   │  Architecture health    │
        │  policy → decision    │   │  Engineering dashboard  │
        └───────────────────────┘   └─────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────────────┐
        │                   Data Layer                       │
        │         PostgreSQL · Redis (BullMQ)               │
        └───────────────────────────────────────────────────┘
```

## Monorepo Structure

```
devfoundry/
├── packages/
│   ├── api/          # NestJS backend (REST + Swagger)
│   ├── web/          # React + Vite dashboard
│   ├── cli/          # oclif CLI
│   └── agents/       # AI agent library (Anthropic SDK)
├── docker-compose.yml
├── package.json      # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone <repo-url>
cd devfoundry
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY (optional — mock mode works without it)
pnpm install
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- API on http://localhost:3000 (Swagger: http://localhost:3000/api/docs)
- Web dashboard on http://localhost:5173

### 3. Or run in development mode

```bash
# Terminal 1 — infrastructure
docker compose up postgres redis -d

# Terminal 2 — API
cd packages/api
pnpm dev

# Terminal 3 — Web dashboard
cd packages/web
pnpm dev

# Terminal 4 — CLI (after building)
cd packages/cli
pnpm build
node dist/commands/status.js
```

---

## CLI Reference

```bash
# Implement a feature
devfoundry implement --description "add rate limiting to payments API" --repo myapp

# Run any agent
devfoundry agent run --task "refactor user service" --repo myapp --agent refactor
devfoundry agent run --task "audit auth module" --repo myapp --agent security

# Check policy on a PR
devfoundry policy check --pr 142

# Fix / generate tests
devfoundry fix tests --repo myapp

# Open web dashboard
devfoundry dashboard

# Show platform status
devfoundry status
```

See `packages/cli/README.md` for full CLI reference.

---

## AI Agents

| Agent | Purpose |
|-------|---------|
| **FeatureAgent** | Implements features from natural language intent |
| **TestAgent** | Generates comprehensive Vitest test suites |
| **RefactorAgent** | Improves code quality without changing behaviour |
| **SecurityAgent** | Scans for OWASP Top 10 vulnerabilities |
| **DependencyAgent** | Safely updates npm dependencies |
| **PRReviewerAgent** | Reviews PRs for quality, architecture, and risk |

All agents use `claude-sonnet-4-6` by default. Set `ANTHROPIC_API_KEY` in `.env` for real AI output; agents fall back to realistic mock responses when the key is absent.

---

## Harness Pipeline

Every AI-generated change runs through the automated validation pipeline:

```
Agent Output
    ↓
[1] Build       — TypeScript compilation check
    ↓
[2] Tests       — Verify test files are present and pass
    ↓
[3] Lint        — ESLint quality check
    ↓
[4] Architecture — Check forbidden import patterns
    ↓
[5] Risk         — Classify paths (high/medium/low)
    ↓
[6] Policy       — Evaluate governance rules
    ↓
Decision: auto-merge | team-lead-review | architecture-review | reject
```

---

## Risk Tier System

```json
{
  "riskTierRules": {
    "high":   ["db/schema/**", "auth/**", "payments/**"],
    "medium": ["services/**", "api/**"],
    "low":    ["ui/**", "docs/**"]
  },
  "approvalWorkflows": {
    "high":   { "required": ["architecture-team"], "sla": "24h" },
    "medium": { "required": ["team-lead"], "sla": "4h" },
    "low":    { "action": "auto-merge" }
  }
}
```

---

## Development Guide

### Running tests

```bash
# All packages
pnpm test

# Individual packages
pnpm --filter @devfoundry/agents test
pnpm --filter @devfoundry/api test
pnpm --filter @devfoundry/web test
pnpm --filter @devfoundry/cli test
```

### Building

```bash
pnpm build                       # Build all packages
pnpm --filter @devfoundry/api build  # Build one package
```

### Linting and formatting

```bash
pnpm lint      # ESLint all packages
pnpm format    # Prettier all files
pnpm typecheck # TypeScript strict check
```

### Adding a new agent

1. Create `packages/agents/src/agents/my-agent.ts`
2. Implement `getSystemPrompt()` and `buildPrompt()`
3. Export from `packages/agents/src/index.ts`
4. Write tests in `packages/agents/test/`
5. Register in `packages/api/src/modules/agents/agents.service.ts`

### Adding a new API module

1. Create `packages/api/src/modules/my-module/`
2. Add entity, service, controller, module files
3. Register in `packages/api/src/app.module.ts`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode everywhere) |
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query, Recharts |
| CLI | oclif v4 |
| Backend | NestJS, TypeORM, class-validator |
| AI | Anthropic SDK (`claude-sonnet-4-6`) |
| Queue | BullMQ + Redis |
| Database | PostgreSQL |
| Auth | JWT + Passport + bcrypt |
| Testing | Vitest, Testing Library, supertest |
| Build | Turbo (monorepo orchestration) |
| Container | Docker + Docker Compose |

---

## Environment Variables

See `.env.example` for a full list. Key variables:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (optional — mock mode without it) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` | Redis host |
| `JWT_SECRET` | JWT signing secret (change in production) |
| `API_PORT` | API server port (default: 3000) |

