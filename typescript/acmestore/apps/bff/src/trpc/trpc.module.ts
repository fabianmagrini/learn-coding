import { Module } from '@nestjs/common';
import { ProductModule } from '../modules/product/product.module';
import { CheckoutModule } from '../modules/checkout/checkout.module';

@Module({
  imports: [ProductModule, CheckoutModule],
})
export class TrpcModule {}
