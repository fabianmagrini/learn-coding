# @devfoundry/agents

AI agent library for the DevFoundry platform. Provides a fleet of specialised agents built on the Anthropic SDK that implement, test, refactor, audit, and review code.

## Agents

| Agent | Class | Description |
|-------|-------|-------------|
| Feature | `FeatureAgent` | Implements new features from natural language intent |
| Test | `TestAgent` | Generates comprehensive Vitest test suites |
| Refactor | `RefactorAgent` | Improves code quality without changing behaviour |
| Security | `SecurityAgent` | Scans for OWASP Top 10 vulnerabilities, produces patches |
| Dependency | `DependencyAgent` | Analyses and safely updates npm dependencies |
| PR Reviewer | `PRReviewerAgent` | Reviews PRs for quality, architecture compliance, and risk |

## Usage

```typescript
import { FeatureAgent } from '@devfoundry/agents';

const agent = new FeatureAgent();
const result = await agent.run({
  task: 'add rate limiting to the payments API',
  repo: 'myapp',
});

if (result.success) {
  console.log(result.output.summary);
  console.log(result.output.files); // Files to create/update
}
```

## Configuration

```typescript
const agent = new FeatureAgent({
  model: 'claude-sonnet-4-6',   // Anthropic model (default)
  maxTokens: 8192,               // Max response tokens
  temperature: 0.2,              // Creativity (0-1)
  allowMock: true,               // Fall back to mock when no API key
});
```

## Mock Mode

When `ANTHROPIC_API_KEY` is not set and `allowMock: true` (default), agents return realistic mock responses. This enables local development and testing without an API key.

Set the key in `.env` or the environment:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Adding a New Agent

1. Create `src/agents/my-agent.ts` extending `BaseAgent`
2. Implement `getSystemPrompt()` and `buildPrompt()`
3. Add a prompt builder in `src/utils/prompt-builder.ts`
4. Export from `src/index.ts`
5. Write tests in `test/`

```typescript
import { BaseAgent } from './base-agent.js';
import { AgentConfig, AgentInput } from '../types/index.js';

export class MyAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super('my-type' as AgentType, config);
  }

  protected getSystemPrompt(): string {
    return buildSystemPrompt('MyAgent, a specialist in ...', [
      'Capability 1',
      'Capability 2',
    ]);
  }

  protected buildPrompt(input: AgentInput): string {
    return `Task: ${input.task}\nRepo: ${input.repo}`;
  }
}
```

## Testing

```bash
pnpm test         # Run all tests (mock mode, no API key needed)
pnpm test:watch   # Watch mode
pnpm test:coverage
```
