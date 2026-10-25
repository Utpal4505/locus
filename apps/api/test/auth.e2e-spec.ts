import 'dotenv/config';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Authentication & Session E2E', () => {
  let app: INestApplication;
  const testEmail = `tester-${Date.now()}@example.com`;
  const testPassword = 'Password123!Secure';
  const testName = 'E2E Tester';
  let sessionCookie: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      bodyParser: false,
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET / should return Hello World!', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.text).toBe('Hello World!');
  });

  it('GET /me without session should return 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer()).get('/me').expect(401);
    expect(res.body.message).toContain('Authentication required');
  });

  it('GET /api/auth/providers should return configured providers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/providers')
      .expect(200);

    expect(res.body.emailPassword).toBe(true);
    expect(typeof res.body.google).toBe('boolean');
    expect(typeof res.body.github).toBe('boolean');
  });

  it('POST /api/auth/sign-up/email should register user and return session cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('Content-Type', 'application/json')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies)).toBe(true);
    sessionCookie = cookies as unknown as string[];
  });

  it('GET /api/auth/get-session with cookie should return current session', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.session).toBeDefined();
  });

  it('GET /me with session cookie should return authenticated user', async () => {
    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.name).toBe(testName);
  });

  it('POST /api/auth/sign-out should invalidate the session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-out')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('GET /me after sign-out should return 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', sessionCookie)
      .expect(401);
  });
});
