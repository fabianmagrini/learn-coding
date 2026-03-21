import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from '@acme/api';
import { createContext } from './trpc/context';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import type { Application } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin: corsOrigin });

  const server = app.getHttpAdapter().getInstance() as Application;

  server.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) => createContext({ req, res, nestApp: app }),
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`BFF running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
