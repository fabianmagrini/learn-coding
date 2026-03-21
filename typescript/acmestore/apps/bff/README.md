# @acme/bff

NestJS Backend-for-Frontend. Implements the tRPC API contract defined in `packages/api` and serves it via an Express middleware mounted at `/trpc`.

## Architecture

```
main.ts
└── AppModule
    ├── LoggerMiddleware          # HTTP request logger (all routes)
    ├── ProductModule
    │   └── ProductService        # getProducts(), getProductById()
    └── CheckoutModule
        └── CheckoutService       # getSummary()

trpc/
└── context.ts                    # bridges NestJS DI → tRPC context
```

### How tRPC and NestJS connect

1. NestJS bootstraps normally via `NestFactory.create(AppModule)`
2. Helmet security headers are applied globally
3. CORS is enabled with the origin from `CORS_ORIGIN` env var
4. The raw Express instance is retrieved from the NestJS HTTP adapter
5. `trpcExpress.createExpressMiddleware` is mounted at `/trpc`
6. `createContext` resolves NestJS services via `app.get(ServiceClass)` and injects them into the tRPC context
7. tRPC routers in `packages/api` call `ctx.services.product.*` / `ctx.services.checkout.*`

This means **routers contain no business logic** — they delegate entirely to NestJS services.

## Structure

```
src/
├── main.ts                          # Bootstrap: NestJS + Helmet + tRPC middleware
├── app.module.ts                    # Root module (registers LoggerMiddleware)
├── modules/
│   ├── product/
│   │   ├── product.module.ts
│   │   ├── product.service.ts       # In-memory mock data; Map index for O(1) lookup
│   │   └── product.service.spec.ts
│   └── checkout/
│       ├── checkout.module.ts
│       ├── checkout.service.ts      # Computes totals with decimal.js; NotFoundException on missing product
│       └── checkout.service.spec.ts
├── trpc/
│   ├── context.ts                   # createContext() factory
│   └── trpc.module.ts
└── common/
    └── logger.middleware.ts         # HTTP request logger
```

## Mock Data

All data is in-memory. `ProductService` holds a static array of 4 products and builds a `Map` index for O(1) lookups:

| ID | Name | Price |
|----|------|-------|
| 1 | Wireless Headphones | $79.99 |
| 2 | Mechanical Keyboard | $129.99 |
| 3 | USB-C Hub | $49.99 |
| 4 | Standing Desk Mat | $34.99 |

`getProducts` supports optional `limit`/`offset` pagination (defaults: 20 / 0).

## Configuration

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (frontend URL) |
| `NODE_ENV` | `development` | Node environment |

## Implementation notes

- **Helmet** — security headers applied on every response via `app.use(helmet())`
- **decimal.js** — all price arithmetic uses `Decimal` to avoid floating-point rounding errors
- **NotFoundException** — `CheckoutService.getSummary` throws NestJS `NotFoundException` (→ HTTP 404) when a cart item references an unknown product ID
- **Map index** — `ProductService` builds a `Map<string, Product>` at startup so `getProductById` is O(1)

## Scripts

```bash
pnpm dev         # NestJS watch mode (ts-node)
pnpm build       # compile to dist/
pnpm start       # run compiled output
pnpm test        # Vitest unit tests
pnpm test:cov    # Vitest with coverage report
pnpm typecheck   # tsc --noEmit
```

## Tests

Unit tests use Vitest with `@nestjs/testing` and mocked dependencies. SWC (`unplugin-swc`) is used so Vitest can handle NestJS decorator metadata:

```
src/modules/product/product.service.spec.ts    — getProducts (incl. pagination), getProductById
src/modules/checkout/checkout.service.spec.ts  — getSummary (incl. NotFoundException, decimal precision)
```

```bash
pnpm test
# Test Suites: 2 passed
# Tests:       16 passed
```
