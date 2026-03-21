import { z } from 'zod';

export const CartItemInput = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

export const CheckoutSummarySchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number(),
      subtotal: z.number(),
    })
  ),
  total: z.number(),
});

export const GetSummaryInput = z.object({
  items: z.array(CartItemInput),
});

export type CheckoutSummary = z.infer<typeof CheckoutSummarySchema>;
export type CartItemInputType = z.infer<typeof CartItemInput>;
