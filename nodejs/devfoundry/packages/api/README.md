# @devfoundry/api

NestJS backend for the DevFoundry platform. Provides REST endpoints for projects, agent runs, PRs, policies, metrics, and the AI harness pipeline.

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List all projects |
| GET | `/projects/:id` | Get project by ID |
| POST | `/projects` | Create a project |
| PUT | `/projects/:id` | Update a project |
| DELETE | `/projects/:id` | Delete a project |

### Agents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents/runs` | List all agent runs |
| GET | `/agents/runs/:id` | Get agent run by ID |
| POST | `/agents/runs` | Start a new agent run |

### Policies
| Method | Path | Description |
|--------|------|-------------|
| GET | `/policies` | List all policies |
| POST | `/policies` | Create a policy |
| PUT | `/policies/:id` | Update a policy |

### Harness
| Method | Path | Description |
|--------|------|-------------|
| POST | `/harness/run` | Run validation harness on agent output |

### PRs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/prs` | List all PRs |
| POST | `/prs` | Create a PR record |
| PUT | `/prs/:id` | Update a PR |

### Metrics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/metrics/dashboard` | Get dashboard KPI metrics |

Swagger docs available at: `http://localhost:3000/api/docs`

## Environment Variables

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=devfoundry
DATABASE_PASSWORD=devfoundry
DATABASE_NAME=devfoundry
REDIS_HOST=localhost
REDIS_PORT=6379
API_PORT=3000
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-...
```

## Running Locally

```bash
# Start dependencies
docker compose up postgres redis -d

# Install and run
cd packages/api
pnpm install
pnpm dev

# API available at http://localhost:3000
# Swagger at http://localhost:3000/api/docs
```

## Testing

```bash
pnpm test            # Unit tests (no DB required)
pnpm test:coverage   # With coverage report
```

## Architecture

```
src/
├── main.ts                    # Entry point
├── app.module.ts              # Root module
├── modules/
│   ├── auth/                  # JWT auth + RBAC
│   ├── projects/              # Project CRUD
│   ├── agents/                # Agent run management
│   ├── harness/               # Validation pipeline
│   ├── policies/              # Policy engine + risk classifier
│   ├── prs/                   # Pull request records
│   └── metrics/               # DORA + AI metrics
└── common/
    ├── guards/                # JwtAuthGuard, RolesGuard
    └── decorators/            # @Roles(), @CurrentUser()
```
