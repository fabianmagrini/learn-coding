import { publicProcedure, router } from '../../trpc';
import { GetSummaryInput, CheckoutSummarySchema } from './schema';

export const checkoutRouter = router({
  getSummary: publicProcedure
    .input(GetSummaryInput)
    .output(CheckoutSummarySchema)
    .query(({ input, ctx }) => {
      return ctx.services.checkout.getSummary(input.items);
    }),
});
