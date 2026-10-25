import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
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

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const origins = Array.from(
    new Set([frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000']),
  );

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
    ],
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`[Locus API] Server running on http://0.0.0.0:${port}`);
}

await bootstrap();
