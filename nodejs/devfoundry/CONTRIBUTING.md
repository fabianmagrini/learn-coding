# Contributing to DevFoundry

## Table of Contents

- [Development setup](#development-setup)
- [Repository structure](#repository-structure)
- [Architecture decisions](#architecture-decisions)
- [Adding a new AI agent](#adding-a-new-ai-agent)
- [Adding a new API module](#adding-a-new-api-module)
- [Testing strategy](#testing-strategy)
- [Code style](#code-style)
- [Documentation standards](#documentation-standards)

---

## Development setup

```bash
# Prerequisites: Node.js 20+, pnpm 9+, Docker
cp .env.example .env          # add ANTHROPIC_API_KEY
docker compose up -d          # postgres + redis
pnpm install
pnpm build                    # build all packages in dependency order
pnpm test                     # run all tests
```

For per-package development:

```bash
# API (hot reload)
pnpm --filter @devfoundry/api dev

# Web dashboard
pnpm --filter @devfoundry/web dev

# Run a single package's tests in watch mode
pnpm --filter @devfoundry/agents test:watch
```

---

## Repository structure

```
devfoundry/
├── packages/
│   ├── agents/   @devfoundry/agents  — AI agent library (Claude SDK)
│   ├── api/      @devfoundry/api     — NestJS REST/GraphQL backend
│   ├── cli/      @devfoundry/cli     — oclif CLI tool
│   └── web/      @devfoundry/web     — React dashboard (Vite+)
├── turbo.json                        — task pipeline (build order, caching)
├── docker-compose.yml                — local services
└── .env.example                      — required environment variables
```

Build order enforced by Turbo: `agents` → `api` + `cli` + `web`.

---

## Architecture decisions

### Why Turborepo over Vite+ for monorepo orchestration?

Turbo is tool-agnostic and works across all four packages (NestJS, oclif, Vite, TypeScript library). Vite+ is a frontend-first toolchain — it is used inside `packages/web` for bundling and linting, but is not suitable as a cross-package orchestrator for a mixed NestJS/React/CLI workspace.

### Why BullMQ + Redis instead of Kafka for the MVP?

Kafka is the production target for high-volume event streaming, but adds significant operational overhead. BullMQ on Redis provides the same job queue semantics with a much simpler setup. The `AgentsService` is written to be queue-agnostic; graduating to Kafka requires only swapping the queue adapter, not the service logic.

### Why in-process policy evaluation instead of OPA?

OPA (Open Policy Agent) is the production target for policy evaluation. For the MVP, policies are evaluated in-process using the `PolicyEngineService`, which implements the same glob-pattern risk-tier and architecture-rule semantics as OPA Rego. This avoids an additional runtime dependency while keeping the interface stable for a later OPA migration.

### Why Claude (Anthropic) as the default model?

The agent library is built on the Anthropic SDK but the `BaseAgent` class accepts any callable that matches the SDK interface. Claude's extended context window and instruction-following quality make it the best fit for the long system prompts required by the harness pipeline. GPT-4 and DeepSeek are future targets via an adapter layer.

### Why mock mode instead of VCR cassettes for agent tests?

Agent responses are non-deterministic and the Anthropic API is a paid service. A built-in mock mode (activated when `ANTHROPIC_API_KEY` is absent) produces structurally valid `AgentOutput` that exercises all downstream logic without network calls or cassette maintenance overhead.

---

## Adding a new AI agent

1. **Create the agent class** in `packages/agents/src/agents/`:

```typescript
// packages/agents/src/agents/my-agent.ts
import { BaseAgent } from './base-agent.js';
import { buildSystemPrompt } from '../utils/prompt-builder.js';
import type { AgentConfig, AgentInput, AgentResult } from '../types/index.js';

export class MyAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super(
      'my-agent',  // AgentType — add to the union in types/index.ts
      buildSystemPrompt('MyAgent', ['capability one', 'capability two']),
      config,
    );
  }

  async run(input: AgentInput): Promise<AgentResult> {
    const prompt = `Task: ${input.task}\nRepo: ${input.repo}`;
    return this.execute(input, prompt);
  }
}
```

2. **Add the type** to `AgentType` in `packages/agents/src/types/index.ts`:

```typescript
export type AgentType = 'feature' | 'test' | ... | 'my-agent';
```

3. **Add a mock summary** in `packages/agents/src/utils/mock-responses.ts`:

```typescript
const summaries: Record<AgentType, string> = {
  ...
  'my-agent': `My agent completed: "${task}"`,
};
```

4. **Export from the index** in `packages/agents/src/index.ts`.

5. **Register in the API** — add a `case 'my-agent'` branch to `AgentsService.buildAgent()`.

6. **Write tests** in `packages/agents/test/agents.test.ts` following the existing pattern.

---

## Adding a new API module

Follow the NestJS module pattern:

```
packages/api/src/modules/my-module/
├── entities/
│   └── my-entity.entity.ts   — TypeORM entity
├── dto/
│   ├── create-my-entity.dto.ts
│   └── update-my-entity.dto.ts
├── my-module.service.ts       — business logic
├── my-module.controller.ts    — HTTP handlers
└── my-module.module.ts        — NestJS module definition
```

Register the module in `packages/api/src/app.module.ts`.

Use the existing guards and decorators:

```typescript
@UseGuards(JwtAuthGuard)          // require authentication
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')                   // require a specific role
@CurrentUser() user: User         // inject the authenticated user
```

Write unit tests using the vi.fn() mock-repository pattern from the existing test files — no database required.

---

## Testing strategy

### Unit tests (no external dependencies)

All packages use **Vitest**. Tests must pass without a running database, Redis instance, or Anthropic API key.

| Package | Test location | Pattern |
|---------|--------------|---------|
| `agents` | `test/*.test.ts` | Mock mode — set `allowMock: true`, delete `ANTHROPIC_API_KEY` |
| `api` | `test/*.test.ts` | Mock TypeORM repositories with `vi.fn()`, use dynamic imports to avoid decorator issues |
| `cli` | `test/*.test.ts` | Mock `getApiClient()` via `vi.mock()`, test commands via `MyCommand.run([...args])` |
| `web` | `src/**/*.test.tsx` | `@testing-library/react` with jsdom, mock fixtures from `src/mocks/fixtures.ts` |

Run all tests:

```bash
pnpm test                       # all packages
pnpm --filter @devfoundry/api test          # single package
pnpm --filter @devfoundry/web test:coverage # with coverage report
```

### Test conventions

- Test **behaviour**, not implementation. Assert on outputs and side effects, not internal calls.
- One `describe` block per class or function group.
- Use `makeX()` factory functions for test fixtures — keep them at the top of each test file.
- Agents always run in mock mode: `new FeatureAgent({ allowMock: true })`.
- API service tests inject mock repositories directly into the constructor — do not use the NestJS testing module for unit tests.

---

## Code style

The project uses **ESLint** (root) and **Oxlint** (via Vite+ in `packages/web`) with **Prettier** formatting.

```bash
pnpm lint      # lint all packages
pnpm format    # format all files
```

Key conventions:

- **TypeScript strict mode** everywhere — no `any`, no non-null assertions without justification.
- **ESM modules** — use `.js` extensions in imports even for `.ts` source files.
- **No default exports** in library code (`agents`, `api`) — named exports only. Default exports are allowed in oclif commands and React page components (framework requirement).
- **No `console.log`** in production code — use `output.ts` helpers in the CLI, NestJS `Logger` in the API.

---

## Documentation standards

All public APIs must have JSDoc comments. Follow these patterns:

```typescript
/**
 * One-sentence summary.
 *
 * Longer explanation when the behaviour is non-obvious.
 *
 * @param name - What this parameter is for.
 * @returns What the function returns and any important edge cases.
 * @throws {ErrorType} When and why this is thrown.
 */
export function myFunction(name: string): string { ... }
```

For entities and DTOs, a single-line class comment is sufficient:

```typescript
/** Persisted record of a single AI agent execution. */
@Entity('agent_runs')
export class AgentRun { ... }
```

For React components, document the component's purpose and any non-obvious prop behaviour:

```typescript
/** Dashboard KPI card with a value, optional trend indicator, and icon. */
export function KpiCard({ title, value, trend }: KpiCardProps) { ... }
```

When adding a significant architectural decision, document it in the **Architecture decisions** section of this file.
