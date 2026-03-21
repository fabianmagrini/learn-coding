# @acme/api

Shared API contract package. Defines all tRPC routers and Zod schemas consumed by both `apps/bff` (implementation) and `apps/web` (client).

## Purpose

This package is the **single source of truth** for the API surface. It contains:

- tRPC router definitions (procedures + input/output schemas)
- Zod schemas for all domain types
- The `Context` interface that bridges tRPC and NestJS

Neither the BFF nor the frontend duplicates type definitions — they both import from here.

## Structure

```
src/
├── index.ts              # Public exports
├── trpc.ts               # tRPC instance (router, publicProcedure)
├── context.ts            # Context interface + service interfaces
├── root.ts               # Root AppRouter (combines all routers)
└── modules/
    ├── product/
    │   ├── schema.ts     # ProductSchema, GetProductByIdInput, GetProductsInput
    │   └── router.ts     # product.getProducts, product.getProductById
    └── checkout/
        ├── schema.ts     # CartItemInput, GetSummaryInput, CheckoutSummarySchema
        └── router.ts     # checkout.getSummary
```

## API Surface

### Product router

```ts
trpc.product.getProducts()
trpc.product.getProducts({ limit: number, offset: number })
// Returns: Product[]  (default: limit 20, offset 0)

trpc.product.getProductById({ id: string })
// Returns: Product | null
```

### Checkout router

```ts
trpc.checkout.getSummary({ items: CartItem[] })
// Returns: CheckoutSummary
```

## Context

The `Context` interface defines service interfaces that the BFF implements via NestJS DI:

```ts
interface Context {
  services: {
    product: ProductServiceInterface;
    checkout: CheckoutServiceInterface;
  };
}
```

Routers call services through context — they contain no business logic themselves.

## Schemas

All domain types are Zod schemas, giving runtime validation and TypeScript types from a single definition:

```ts
import { ProductSchema, type Product } from '@acme/api';
import { CartItemInput, CheckoutSummarySchema } from '@acme/api';
import { GetProductsInput } from '@acme/api';
```

Schemas enforce strict constraints:

- `Product.id` — non-empty string
- `Product.name` — 1–200 characters
- `Product.price` — non-negative number
- `Product.description` — max 2 000 characters
- `Product.imageUrl` — valid URL
- `GetProductsInput.limit` — positive integer, max 100 (default 20)
- `GetProductsInput.offset` — non-negative integer (default 0)
- `CartItem.quantity` — positive integer

## Scripts

```bash
pnpm build       # compile to dist/
pnpm dev         # watch mode
pnpm test        # run Vitest schema tests
pnpm typecheck   # tsc --noEmit
```

## Tests

Schema validation is tested with Vitest:

```
src/modules/product/schema.test.ts   — ProductSchema, GetProductByIdInput, GetProductsInput (23 tests)
src/modules/checkout/schema.test.ts  — CartItemInput, GetSummaryInput, CheckoutSummarySchema (13 tests)
```

```bash
pnpm test
# Test Files: 2 passed
# Tests:      36 passed
```
