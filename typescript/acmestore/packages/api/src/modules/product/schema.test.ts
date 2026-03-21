import { describe, it, expect } from 'vitest';
import { ProductSchema, GetProductByIdInput, GetProductsInput } from './schema';

const validProduct = {
  id: '1',
  name: 'Wireless Headphones',
  price: 79.99,
  description: 'Great headphones',
  imageUrl: 'https://example.com/img.jpg',
};

describe('ProductSchema', () => {
  it('parses a valid product', () => {
    const result = ProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(validProduct);
  });

  it('rejects missing id', () => {
    const { id: _id, ...withoutId } = validProduct;
    expect(ProductSchema.safeParse(withoutId).success).toBe(false);
  });

  it('rejects empty id', () => {
    expect(ProductSchema.safeParse({ ...validProduct, id: '' }).success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name: _n, ...rest } = validProduct;
    expect(ProductSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty name', () => {
    expect(ProductSchema.safeParse({ ...validProduct, name: '' }).success).toBe(false);
  });

  it('rejects name exceeding 200 chars', () => {
    expect(ProductSchema.safeParse({ ...validProduct, name: 'x'.repeat(201) }).success).toBe(false);
  });

  it('rejects non-numeric price', () => {
    expect(ProductSchema.safeParse({ ...validProduct, price: 'free' }).success).toBe(false);
  });

  it('rejects negative price', () => {
    expect(ProductSchema.safeParse({ ...validProduct, price: -1 }).success).toBe(false);
  });

  it('allows zero price', () => {
    expect(ProductSchema.safeParse({ ...validProduct, price: 0 }).success).toBe(true);
  });

  it('rejects missing description', () => {
    const { description: _d, ...rest } = validProduct;
    expect(ProductSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects description exceeding 2000 chars', () => {
    expect(ProductSchema.safeParse({ ...validProduct, description: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('rejects missing imageUrl', () => {
    const { imageUrl: _i, ...rest } = validProduct;
    expect(ProductSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects non-URL imageUrl', () => {
    expect(ProductSchema.safeParse({ ...validProduct, imageUrl: 'not-a-url' }).success).toBe(false);
  });
});

describe('GetProductByIdInput', () => {
  it('parses a valid id', () => {
    expect(GetProductByIdInput.safeParse({ id: 'abc-123' }).success).toBe(true);
  });

  it('rejects missing id', () => {
    expect(GetProductByIdInput.safeParse({}).success).toBe(false);
  });

  it('rejects empty id', () => {
    expect(GetProductByIdInput.safeParse({ id: '' }).success).toBe(false);
  });

  it('rejects non-string id', () => {
    expect(GetProductByIdInput.safeParse({ id: 42 }).success).toBe(false);
  });
});

describe('GetProductsInput', () => {
  it('applies default limit and offset', () => {
    const result = GetProductsInput.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
    }
  });

  it('parses explicit limit and offset', () => {
    const result = GetProductsInput.safeParse({ limit: 10, offset: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(5);
    }
  });

  it('rejects limit of 0', () => {
    expect(GetProductsInput.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('rejects limit exceeding 100', () => {
    expect(GetProductsInput.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('rejects negative offset', () => {
    expect(GetProductsInput.safeParse({ offset: -1 }).success).toBe(false);
  });

  it('rejects non-integer limit', () => {
    expect(GetProductsInput.safeParse({ limit: 1.5 }).success).toBe(false);
  });
});
