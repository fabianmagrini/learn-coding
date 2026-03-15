# @devfoundry/cli

The DevFoundry command-line interface. Communicates with the DevFoundry API to trigger AI agents, check policies, and view platform status.

## Installation

```bash
# From the monorepo
pnpm build

# Or globally
npm install -g @devfoundry/cli
```

## Configuration

```bash
export DEVFOUNDRY_API_URL=http://localhost:3000   # API URL (default)
export DEVFOUNDRY_TOKEN=your-jwt-token            # Optional auth token
export DEVFOUNDRY_WEB_URL=http://localhost:5173   # Dashboard URL
```

## Commands

### `devfoundry implement`

Trigger the FeatureAgent to implement a feature from a description.

```bash
devfoundry implement --description "add rate limiting to payments API" --repo myapp
devfoundry implement -d "implement user notifications" -r myapp --context "$(cat src/notifications.ts)"
```

**Flags:**
- `--description, -d` (required) — Feature description / developer intent
- `--repo, -r` (required) — Target repository name
- `--context, -c` — Additional context (e.g. existing code snippets)

### `devfoundry agent run`

Run any agent type with a task description.

```bash
devfoundry agent run --task "implement rate limiting" --repo myapp
devfoundry agent run --task "refactor user service" --repo myapp --agent refactor
devfoundry agent run --task "audit auth module" --repo myapp --agent security
devfoundry agent run --task "update dependencies" --repo myapp --agent dependency
```

**Flags:**
- `--task, -t` (required) — Task description
- `--repo, -r` (required) — Target repository
- `--agent, -a` — Agent type: `feature`, `test`, `refactor`, `security`, `dependency`, `pr-reviewer` (default: `feature`)

### `devfoundry policy check`

Evaluate governance policy on a pull request.

```bash
devfoundry policy check --pr 142
devfoundry policy check --pr abc-uuid-here
```

**Flags:**
- `--pr` (required) — PR ID or number

### `devfoundry fix tests`

Trigger the TestAgent to generate or fix tests.

```bash
devfoundry fix tests --repo myapp
devfoundry fix tests --repo myapp --focus "UserService unit tests"
```

**Flags:**
- `--repo, -r` (required) — Target repository
- `--focus, -f` — Specific area to focus on

### `devfoundry dashboard`

Open the web dashboard in the default browser.

```bash
devfoundry dashboard
```

### `devfoundry status`

Show platform status and KPI metrics.

```bash
devfoundry status
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (API unreachable, agent failed, policy check failed) |
