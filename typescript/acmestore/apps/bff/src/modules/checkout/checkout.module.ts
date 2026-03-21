import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [ProductModule],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
