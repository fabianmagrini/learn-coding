import { Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ProductService } from '../product/product.service';
import type { CartItem, CheckoutSummary } from '@acme/api';

@Injectable()
export class CheckoutService {
  constructor(private readonly productService: ProductService) {}

  async getSummary(items: CartItem[]): Promise<CheckoutSummary> {
    const summaryItems = await Promise.all(
      items.map(async ({ productId, quantity }) => {
        const product = await this.productService.getProductById(productId);
        if (!product) {
          throw new NotFoundException(`Product ${productId} not found`);
        }
        const subtotal = new Decimal(product.price).times(quantity).toDecimalPlaces(2).toNumber();
        return {
          productId,
          name: product.name,
          price: product.price,
          quantity,
          subtotal,
        };
      }),
    );

    const total = summaryItems
      .reduce((acc, item) => acc.plus(item.subtotal), new Decimal(0))
      .toDecimalPlaces(2)
      .toNumber();

    return { items: summaryItems, total };
  }
}
