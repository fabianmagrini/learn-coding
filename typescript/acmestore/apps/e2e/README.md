# @acme/e2e

Playwright end-to-end tests for Acme Store. Tests run against real browser instances with both the BFF and web dev servers started automatically.

## Setup

Playwright is configured in `playwright.config.ts` to:

- Run against **Chromium, Firefox, and WebKit** (Desktop Chrome / Firefox / Safari profiles)
- Set `baseURL` to `http://localhost:5173`
- Auto-start `apps/bff` (port 3001) and `apps/web` (port 5173) via `webServer` entries
- Reuse existing servers in non-CI environments (`reuseExistingServer: true`)

## Test files

```
tests/
├── products.spec.ts   — product listing, detail page, navigation
├── cart.spec.ts       — cart badge, drawer, empty state, item count
└── checkout.spec.ts   — checkout states, order placement, cart clearing
```

### products.spec.ts

- Page title is shown
- 4 product cards are rendered
- Clicking a product navigates to its detail page
- Product detail page shows name, price, and description
- Back navigation returns to the product listing
- Unknown product ID renders a not-found message

### cart.spec.ts

- Adding an item updates the navbar badge count
- The cart drawer opens on badge click
- Empty cart message is shown when cart is empty
- Cart drawer closes on close button click
- Cart heading shows item count after adding items

### checkout.spec.ts

- Checkout page shows "empty cart" when no items present
- Checkout summary is shown after adding items
- Correct item name, quantity, and price appear in summary
- Placing an order shows the confirmation screen
- Cart badge is cleared after placing an order
- "Continue Shopping" button navigates back to home

## Scripts

```bash
pnpm test:e2e          # run all tests (headless)
pnpm test:e2e:ui       # open Playwright UI mode
pnpm test:e2e:report   # open the last HTML report
```

## Running manually

If the dev servers are already running (`pnpm dev` from the repo root):

```bash
pnpm test:e2e
```

If not running, Playwright will start them automatically before the test suite.

## CI usage

Set `CI=true` to disable server reuse — Playwright will always start fresh servers:

```bash
CI=true pnpm test:e2e
```
