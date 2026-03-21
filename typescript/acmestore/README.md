# Acme Store

A **reference implementation** demonstrating modular architecture patterns for a full-stack TypeScript web application. The focus is on clarity and correct structure — not feature completeness.

The two features (products and checkout) are intentionally simple so the architecture itself is easy to follow. The patterns scale: adding a third or fourth feature module should feel obvious from reading the existing ones.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Routing | React Router v7 |
| Data fetching | TanStack Query + tRPC client |
| Cart state | Zustand (persisted to localStorage) |
| Styling | Tailwind CSS v3 |
| BFF | NestJS + TypeScript |
| API contract | tRPC v11 + Zod |
| Monorepo | Turborepo + pnpm workspaces |
| Node | 22 |

## Architecture

```
┌─────────────────────────────────┐
│   Vite React App  (:5173)       │
│   - tRPC React client           │
│   - TanStack Query              │
│   - Zustand (cart)              │
└────────────┬────────────────────┘
             │  tRPC over HTTP (/trpc)
┌────────────▼────────────────────┐
│   NestJS BFF  (:3001)           │
│   - tRPC Express adapter        │
│   - Domain modules (DI)         │
│   - Mocked data services        │
└─────────────────────────────────┘
```

### Key architectural principles

**Contract first.** `packages/api` defines *what* the API is (tRPC routers + Zod schemas). `apps/bff` defines *how* it runs (NestJS services injected via context). Types flow end-to-end — from BFF service return types through tRPC to React components — with zero duplication.

**Dependency inversion.** `packages/api/src/context.ts` defines service *interfaces*; the BFF implements them via NestJS DI. This means the contract package has no dependency on NestJS and could be served by any runtime.

**Feature modules.** Both the BFF and the frontend are organised by feature (`product/`, `checkout/`), not by layer (`controllers/`, `services/`). Each feature owns its module, service, and tests with no cross-feature imports.

### Deep vs shallow modules

A **deep module** (Ousterhout, *A Philosophy of Software Design*) has a simple interface that hides substantial complexity. The benefit-to-interface-cost ratio is high. A **shallow module** has an interface nearly as complex as its implementation — useful for composing layers, but not for hiding complexity.

This codebase has both, by design.

**Deep modules — simple interface, meaningful hidden complexity:**

| Module | Interface | What it hides |
|--------|-----------|---------------|
| `CheckoutService` | `getSummary(items)` | Parallel product fetches, `Decimal.js` precision arithmetic, subtotal calculations, `NotFoundException` on missing product |
| `CartStore` (Zustand) | `addItem()`, `removeItem()`, `updateQuantity()`, `clearCart()` | Quantity merging on duplicate add, auto-removal at zero, localStorage persistence, immutable updates |
| Zod schemas | `ProductSchema.parse(x)` | URL validation, string length bounds, numeric constraints, integer enforcement |

**Shallow modules — intentionally thin adapters:**

| Module | Why shallow is correct here |
|--------|-----------------------------|
| tRPC routers (`packages/api`) | Transport-layer wrappers; business logic belongs in services, not in routing |
| tRPC client hooks (`apps/web`) | Thin adapters over TanStack Query; state management lives in the store |
| `ProductService` | Simple interface over simple logic (array slice + Map lookup); thin by nature, not a design flaw |

**Takeaway:** This repo is primarily a demonstration of **contract-first design and clean separation of concerns**. The deep module pattern appears clearly in `CheckoutService` and `CartStore`, and can be contrasted against the shallow routers and hooks to illustrate the spectrum. It is not a comprehensive demonstration of deep modules throughout — the features are intentionally simple to keep the architecture legible.

### What this repo does not demonstrate

This is a demo with mocked data. A production codebase built on the same patterns would additionally need:

| Concern | What to add |
|---------|-------------|
| Data layer | Repository pattern, database abstraction (e.g. Prisma) |
| Auth | NestJS Guards, JWT middleware, per-user tRPC context |
| Error handling | Global NestJS exception filter, structured error responses |
| Config | `@nestjs/config` with Zod validation, per-environment overrides |
| Observability | Structured logging, tracing, health-check endpoint |

## Repository Structure

```
acme-store/
├── packages/
│   ├── api/          # Shared tRPC routers + Zod schemas (API contract)
│   └── config/       # Shared TypeScript base config
└── apps/
    ├── web/          # Vite + React frontend
    ├── bff/          # NestJS BFF
    └── e2e/          # Playwright end-to-end tests
```

See each package's own README for details:
- [`packages/api`](./packages/api/README.md)
- [`apps/bff`](./apps/bff/README.md)
- [`apps/web`](./apps/web/README.md)
- [`apps/e2e`](./apps/e2e/README.md)

## Features

| Feature | Description |
|---------|-------------|
| Product listing | Grid of products fetched via tRPC |
| Product detail | Individual product page with name, description, price |
| Cart | Add/remove/update items; persisted to localStorage via Zustand |
| Checkout summary | Cart items + total fetched from BFF; simulated order placement |

All data is **mocked in the BFF** — no database required.

## Getting Started

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation)

```bash
node --version   # v22.x.x
pnpm --version   # 9.x.x
```

### Install

```bash
pnpm install
```

### Run in development

```bash
pnpm dev
```

This starts both `apps/bff` (port 3001) and `apps/web` (port 5173) in parallel via Turborepo.

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
pnpm build
```

Turborepo builds packages in dependency order: `packages/api` → `apps/bff` + `apps/web`.

## Testing

### Unit tests

```bash
pnpm test
```

Runs all unit tests across the monorepo in parallel:

| Package | Runner | Tests | Coverage |
|---------|--------|-------|----------|
| `packages/api` | Vitest | 36 | Zod schema validation |
| `apps/bff` | Vitest | 16 | NestJS service logic |
| `apps/web` | Vitest + Testing Library | 47 | React components + Zustand store |

### End-to-end tests

```bash
# Option 1: let Playwright start the servers automatically
pnpm test:e2e

# Option 2: start servers first, then run tests
pnpm dev
pnpm --filter @acme/e2e test:e2e
```

E2e tests cover product listing, cart interactions, and the checkout flow using Playwright across **Chromium, Firefox, and WebKit**.

### Typecheck

```bash
pnpm typecheck
```

## Domain Model

```
Product
  id          string
  name        string
  price       number
  description string
  imageUrl    string

CartItem
  productId   string
  quantity    number   (positive integer)

CheckoutSummary
  items       Array<{ productId, name, price, quantity, subtotal }>
  total       number
```

## API Reference (tRPC)

| Router | Procedure | Input | Description |
|--------|-----------|-------|-------------|
| `product` | `getProducts` | `{ limit?: number; offset?: number }` (optional) | Returns paginated products (default: limit 20, offset 0) |
| `product` | `getProductById` | `{ id: string }` | Returns a single product or `null` |
| `checkout` | `getSummary` | `{ items: CartItem[] }` | Returns itemised summary + total |

All inputs and outputs are validated with Zod. Types are shared automatically between BFF and frontend via `packages/api`.

## Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Cart storage | Client-side Zustand | Keeps BFF stateless; no session management needed for a demo |
| Data layer | In-memory mocks | No database setup required; swap in a repository layer to go further |
| tRPC context | Service interfaces in `packages/api` | Breaks the circular dependency between the contract package and NestJS |
| BFF framework | NestJS | DI, lifecycle hooks, and module boundaries hold up as features are added |
| Styling | Tailwind CSS v3 | Utility-first; no build config required beyond the directives in `index.css` |
| Test runner | Vitest everywhere | Single runner across all packages; SWC plugin handles NestJS decorator metadata |
