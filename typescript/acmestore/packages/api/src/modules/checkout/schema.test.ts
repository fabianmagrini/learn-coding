import { describe, it, expect } from 'vitest';
import { CartItemInput, CheckoutSummarySchema, GetSummaryInput } from './schema';

describe('CartItemInput', () => {
  it('parses a valid cart item', () => {
    const result = CartItemInput.safeParse({ productId: 'prod-1', quantity: 2 });
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', () => {
    expect(CartItemInput.safeParse({ productId: 'prod-1', quantity: 0 }).success).toBe(false);
  });

  it('rejects negative quantity', () => {
    expect(CartItemInput.safeParse({ productId: 'prod-1', quantity: -1 }).success).toBe(false);
  });

  it('rejects non-integer quantity', () => {
    expect(CartItemInput.safeParse({ productId: 'prod-1', quantity: 1.5 }).success).toBe(false);
  });

  it('rejects missing productId', () => {
    expect(CartItemInput.safeParse({ quantity: 1 }).success).toBe(false);
  });

  it('rejects missing quantity', () => {
    expect(CartItemInput.safeParse({ productId: 'prod-1' }).success).toBe(false);
  });
});

describe('GetSummaryInput', () => {
  it('parses a valid items array', () => {
    const result = GetSummaryInput.safeParse({
      items: [{ productId: 'prod-1', quantity: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('parses an empty items array', () => {
    const result = GetSummaryInput.safeParse({ items: [] });
    expect(result.success).toBe(true);
  });

  it('rejects invalid items', () => {
    const result = GetSummaryInput.safeParse({
      items: [{ productId: 'prod-1', quantity: -5 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('CheckoutSummarySchema', () => {
  const validSummary = {
    items: [
      { productId: '1', name: 'Headphones', price: 79.99, quantity: 2, subtotal: 159.98 },
    ],
    total: 159.98,
  };

  it('parses a valid summary', () => {
    const result = CheckoutSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.total).toBe(159.98);
  });

  it('rejects missing total', () => {
    const { total: _t, ...rest } = validSummary;
    expect(CheckoutSummarySchema.safeParse(rest).success).toBe(false);
  });

  it('rejects item missing subtotal', () => {
    const bad = { ...validSummary, items: [{ productId: '1', name: 'x', price: 1, quantity: 1 }] };
    expect(CheckoutSummarySchema.safeParse(bad).success).toBe(false);
  });

  it('parses summary with multiple items', () => {
    const multi = {
      items: [
        { productId: '1', name: 'A', price: 10, quantity: 1, subtotal: 10 },
        { productId: '2', name: 'B', price: 20, quantity: 3, subtotal: 60 },
      ],
      total: 70,
    };
    expect(CheckoutSummarySchema.safeParse(multi).success).toBe(true);
  });
});
