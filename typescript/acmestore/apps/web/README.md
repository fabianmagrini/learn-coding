# @acme/web

Vite + React frontend. Communicates with `apps/bff` exclusively via tRPC. Cart state is managed client-side with Zustand and persisted to localStorage.

## Structure

```
src/
├── main.tsx                  # React root
├── index.css                 # Tailwind directives
├── App.tsx                   # Providers: tRPC, QueryClient, BrowserRouter
├── lib/
│   └── trpc.ts               # tRPC React client (typed against AppRouter)
├── app/
│   └── Router.tsx            # Route definitions
├── modules/
│   ├── product/
│   │   ├── components/
│   │   │   ├── ProductList.tsx     # /
│   │   │   ├── ProductCard.tsx     # grid item
│   │   │   └── ProductDetail.tsx   # /products/:id
│   │   └── hooks/
│   │       └── useProducts.ts      # tRPC query hooks
│   ├── cart/
│   │   ├── components/
│   │   │   ├── CartDrawer.tsx      # slide-out cart panel
│   │   │   └── CartItem.tsx        # single cart row
│   │   └── store/
│   │       └── cart.store.ts       # Zustand store
│   └── checkout/
│       ├── components/
│       │   └── CheckoutSummary.tsx # /checkout
│       └── hooks/
│           └── useCheckout.ts      # tRPC query hook
└── shared/
    └── components/
        ├── Layout.tsx
        └── Navbar.tsx              # cart badge + drawer trigger
```

## Module conventions

Each module owns its UI, data-fetching hooks, and state. **No cross-module imports** — the cart store is an exception used only by product components to add items and by the navbar for the badge count.

`ProductCard` renders product images with `loading="lazy"` for better initial page performance.

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `ProductList` | Product grid |
| `/products/:id` | `ProductDetail` | Single product |
| `/checkout` | `CheckoutSummary` | Order summary + place order |

## Cart

Cart is managed entirely client-side:

```ts
const { items, addItem, removeItem, updateQuantity, clearCart } = useCartStore();
```

State is persisted to `localStorage` under the key `acme-cart` using Zustand's `persist` middleware. No BFF call is made for cart mutations.

## tRPC client

```ts
// src/lib/trpc.ts
export const trpc = createTRPCReact<AppRouter>();
```

Usage in components:

```tsx
const { data, isLoading, error } = trpc.product.getProducts.useQuery();
const { data: summary } = trpc.checkout.getSummary.useQuery({ items });
```

The client is configured in `App.tsx` to batch requests to `http://localhost:3001/trpc`.

## Scripts

```bash
pnpm dev            # Vite dev server (port 5173)
pnpm build          # tsc + vite build
pnpm preview        # preview production build
pnpm test           # Vitest unit tests
pnpm test:watch     # Vitest in watch mode
pnpm test:coverage  # Vitest with coverage
pnpm typecheck      # tsc --noEmit
```

## Tests

React components are tested with Vitest + Testing Library. tRPC hooks are mocked with `vi.mock` so tests are fast and isolated from the network.

```
src/modules/cart/store/cart.store.test.ts               — Zustand store (6 tests)
src/modules/product/components/ProductCard.test.tsx     — renders, add-to-cart (7 tests)
src/modules/product/components/ProductList.test.tsx     — loading/error/success states (5 tests)
src/modules/product/components/ProductDetail.test.tsx   — loading/error/success states (7 tests)
src/modules/cart/components/CartItem.test.tsx           — quantity controls, remove (5 tests)
src/modules/cart/components/CartDrawer.test.tsx         — open/close, items, checkout link (10 tests)
src/modules/checkout/components/CheckoutSummary.test.tsx — summary, place order (7 tests)
```

```bash
pnpm test
# Test Files: 7 passed
# Tests:      47 passed
```

A shared `src/test-utils.tsx` provides a `renderWithRouter` helper that wraps components in `MemoryRouter`.
