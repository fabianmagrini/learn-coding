import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ProductModule } from './modules/product/product.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { LoggerMiddleware } from './common/logger.middleware';

@Module({
  imports: [ProductModule, CheckoutModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
