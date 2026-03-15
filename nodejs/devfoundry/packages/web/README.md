# @devfoundry/web

React + Vite web dashboard for the DevFoundry platform. Provides engineering intelligence screens with real-time agent activity, PR governance, architecture health, and policy configuration.

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Engineering Dashboard | `/` | KPI cards, AI vs human PR chart, agent activity feed, violations table |
| Agent Activity | `/agents` | Table of all agent runs with expandable detail panel |
| PR Governance | `/prs` | PR list with risk tier badges and policy status |
| Architecture Health | `/architecture` | Violations list, trend chart, and rule toggles |
| Policy Config | `/policies` | Risk tier editor, architecture rules, approval workflows |

## Development

```bash
# Install dependencies
pnpm install

# Start development server (with mock data — no API required)
pnpm dev

# Open http://localhost:5173
```

## Building

```bash
pnpm build          # TypeScript check + Vite build
pnpm preview        # Preview production build locally
```

## Testing

```bash
pnpm test           # Vitest + Testing Library
pnpm test:watch     # Watch mode
pnpm test:coverage  # With coverage report
```

## Mock Data

All screens work with mock fixtures by default (`src/mocks/fixtures.ts`). When the API is running, replace mock imports with TanStack Query hooks:

```typescript
// Before (mock)
import { mockAgentRuns } from '../mocks/fixtures.js';

// After (live API)
import { useQuery } from '@tanstack/react-query';
const { data: runs } = useQuery({
  queryKey: ['agent-runs'],
  queryFn: () => fetch('/api/agents/runs').then(r => r.json()),
});
```

## Architecture

```
src/
├── main.tsx                   # Entry point + routing
├── index.css                  # Tailwind base styles
├── types/                     # Shared TypeScript types
├── lib/
│   └── utils.ts               # Formatting helpers, cn()
├── mocks/
│   └── fixtures.ts            # Mock API data
├── components/
│   ├── ui/                    # Badge, Card, KpiCard
│   ├── layout/                # Sidebar, Header, AppLayout
│   └── dashboard/             # PRVolumeChart, AgentActivityFeed, ViolationsTable
└── pages/                     # One file per screen
    ├── dashboard.tsx
    ├── agent-activity.tsx
    ├── pr-governance.tsx
    ├── architecture-health.tsx
    └── policy-config.tsx
```

## Tech Stack

- **React 18** + TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for utility-first styling
- **TanStack Query** for server state management
- **Recharts** for data visualisation
- **react-router-dom** v6 for routing
- **Vitest** + Testing Library for tests
