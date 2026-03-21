import { router } from './trpc';
import { productRouter } from './modules/product/router';
import { checkoutRouter } from './modules/checkout/router';

export const appRouter = router({
  product: productRouter,
  checkout: checkoutRouter,
});

export type AppRouter = typeof appRouter;
