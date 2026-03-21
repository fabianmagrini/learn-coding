import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  price: z.number().nonnegative(),
  description: z.string().max(2000),
  imageUrl: z.string().url(),
});

export type Product = z.infer<typeof ProductSchema>;

export const GetProductByIdInput = z.object({
  id: z.string().min(1),
});

export const GetProductsInput = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type GetProductsInput = z.infer<typeof GetProductsInput>;
