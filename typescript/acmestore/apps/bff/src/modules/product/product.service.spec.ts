import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductService],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProducts', () => {
    it('should return an array of products', async () => {
      const products = await service.getProducts();
      expect(products).toBeInstanceOf(Array);
      expect(products.length).toBeGreaterThan(0);
    });

    it('should return products with required fields', async () => {
      const products = await service.getProducts();
      for (const product of products) {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('description');
        expect(product).toHaveProperty('imageUrl');
      }
    });

    it('should respect the limit parameter', async () => {
      const products = await service.getProducts({ limit: 2 });
      expect(products).toHaveLength(2);
    });

    it('should respect the offset parameter', async () => {
      const all = await service.getProducts();
      const paged = await service.getProducts({ offset: 1 });
      expect(paged[0].id).toBe(all[1].id);
    });

    it('should return all products when limit exceeds total', async () => {
      const products = await service.getProducts({ limit: 100 });
      expect(products.length).toBe(4);
    });

    it('should return empty array when offset exceeds total', async () => {
      const products = await service.getProducts({ offset: 100 });
      expect(products).toHaveLength(0);
    });
  });

  describe('getProductById', () => {
    it('should return a product when it exists', async () => {
      const product = await service.getProductById('1');
      expect(product).not.toBeNull();
      expect(product?.id).toBe('1');
    });

    it('should return null when product does not exist', async () => {
      const product = await service.getProductById('999');
      expect(product).toBeNull();
    });
  });
});
