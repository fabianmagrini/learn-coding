import { publicProcedure, router } from '../../trpc';
import { GetProductByIdInput, GetProductsInput, ProductSchema } from './schema';
import { z } from 'zod';

export const productRouter = router({
  getProducts: publicProcedure
    .input(GetProductsInput.optional())
    .output(z.array(ProductSchema))
    .query(({ input, ctx }) => {
      return ctx.services.product.getProducts(input);
    }),

  getProductById: publicProcedure
    .input(GetProductByIdInput)
    .output(ProductSchema.nullable())
    .query(({ input, ctx }) => {
      return ctx.services.product.getProductById(input.id);
    }),
});
