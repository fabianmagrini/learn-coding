import { Injectable } from '@nestjs/common';
import type { Product } from '@acme/api';

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Wireless Headphones',
    price: 79.99,
    description: 'High-quality wireless headphones with noise cancellation.',
    imageUrl: 'https://placehold.co/400x300?text=Headphones',
  },
  {
    id: '2',
    name: 'Mechanical Keyboard',
    price: 129.99,
    description: 'Tactile mechanical keyboard for developers.',
    imageUrl: 'https://placehold.co/400x300?text=Keyboard',
  },
  {
    id: '3',
    name: 'USB-C Hub',
    price: 49.99,
    description: '7-in-1 USB-C hub with HDMI, USB 3.0, and SD card.',
    imageUrl: 'https://placehold.co/400x300?text=USB-C+Hub',
  },
  {
    id: '4',
    name: 'Standing Desk Mat',
    price: 34.99,
    description: 'Anti-fatigue mat for standing desks.',
    imageUrl: 'https://placehold.co/400x300?text=Desk+Mat',
  },
];

// O(1) lookup indexed by id
const PRODUCT_MAP = new Map<string, Product>(MOCK_PRODUCTS.map((p) => [p.id, p]));

@Injectable()
export class ProductService {
  async getProducts(params?: { limit?: number; offset?: number }): Promise<Product[]> {
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;
    return MOCK_PRODUCTS.slice(offset, offset + limit);
  }

  async getProductById(id: string): Promise<Product | null> {
    return PRODUCT_MAP.get(id) ?? null;
  }
}
