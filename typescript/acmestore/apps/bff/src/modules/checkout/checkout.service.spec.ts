import { Test, TestingModule } from '@nestjs/testing';
import { vi, type Mocked } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { ProductService } from '../product/product.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let productService: Mocked<ProductService>;

  beforeEach(async () => {
    const mockProductService: Mocked<ProductService> = {
      getProducts: vi.fn(),
      getProductById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: ProductService, useValue: mockProductService },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    productService = module.get(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    it('should compute checkout summary correctly', async () => {
      productService.getProductById
        .mockResolvedValueOnce({
          id: '1',
          name: 'Wireless Headphones',
          price: 79.99,
          description: 'Test',
          imageUrl: 'http://example.com/img.png',
        })
        .mockResolvedValueOnce({
          id: '2',
          name: 'Mechanical Keyboard',
          price: 129.99,
          description: 'Test',
          imageUrl: 'http://example.com/img.png',
        });

      const summary = await service.getSummary([
        { productId: '1', quantity: 2 },
        { productId: '2', quantity: 1 },
      ]);

      expect(summary.items).toHaveLength(2);
      expect(summary.items[0].subtotal).toBe(159.98);
      expect(summary.items[1].subtotal).toBe(129.99);
      expect(summary.total).toBe(289.97);
    });

    it('should throw NotFoundException if product not found', async () => {
      productService.getProductById.mockResolvedValueOnce(null);

      await expect(
        service.getSummary([{ productId: '999', quantity: 1 }]),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include the product id in the not-found message', async () => {
      productService.getProductById.mockResolvedValueOnce(null);

      await expect(
        service.getSummary([{ productId: 'missing-abc', quantity: 1 }]),
      ).rejects.toThrow('Product missing-abc not found');
    });

    it('should return empty summary for empty cart', async () => {
      const summary = await service.getSummary([]);
      expect(summary.items).toHaveLength(0);
      expect(summary.total).toBe(0);
    });

    it('should include correct product metadata in items', async () => {
      productService.getProductById.mockResolvedValueOnce({
        id: '1',
        name: 'USB-C Hub',
        price: 49.99,
        description: 'Hub',
        imageUrl: 'http://example.com/hub.png',
      });

      const summary = await service.getSummary([{ productId: '1', quantity: 1 }]);

      expect(summary.items[0]).toMatchObject({
        productId: '1',
        name: 'USB-C Hub',
        price: 49.99,
        quantity: 1,
        subtotal: 49.99,
      });
    });

    it('should handle large quantities correctly', async () => {
      productService.getProductById.mockResolvedValueOnce({
        id: '1',
        name: 'Desk Mat',
        price: 34.99,
        description: 'Mat',
        imageUrl: 'http://example.com/mat.png',
      });

      const summary = await service.getSummary([{ productId: '1', quantity: 10 }]);

      expect(summary.items[0].subtotal).toBe(349.9);
      expect(summary.total).toBe(349.9);
    });
  });
});
