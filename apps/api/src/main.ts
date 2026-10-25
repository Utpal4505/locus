import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import { AppModule } from './app.module.js';
import { isAllowedOrigin } from './common/cors.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Enable CORS first so all preflight (OPTIONS) requests are responded to immediately
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-better-auth-origin',
      'x-better-auth-client',
      'x-csrf-token',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  const jsonParser = express.json();
  const urlencodedParser = express.urlencoded({ extended: true });

  // Better Auth endpoints require the raw unparsed request stream.
  // Parse incoming JSON and URL-encoded payloads only for non-auth application routes.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.originalUrl || req.url || '';
    if (path.startsWith('/api/auth')) {
      return next();
    }
    jsonParser(req, res, (err) => {
      if (err) return next(err);
      urlencodedParser(req, res, next);
    });
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`[Locus API] Server running on http://0.0.0.0:${port}`);
}

await bootstrap();
