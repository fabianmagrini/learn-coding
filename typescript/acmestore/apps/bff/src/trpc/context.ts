import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Context } from '@acme/api';
import { ProductService } from '../modules/product/product.service';
import { CheckoutService } from '../modules/checkout/checkout.service';

interface CreateContextOptions {
  req: Request;
  res: Response;
  nestApp: INestApplication;
}

export function createContext({ nestApp }: CreateContextOptions): Context {
  return {
    services: {
      product: nestApp.get(ProductService),
      checkout: nestApp.get(CheckoutService),
    },
  };
}
