import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb } from '../utils/test-db';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  const email = 'test-auth@example.com';
  const password = 'testpassword123';

  it('signup returns user without password', async () => {
    const res = await request(server).post('/auth/signup').send({
      email,
      password,
      name: 'Test User',
      captchaToken: 'test-token',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', email);
    expect(res.body).not.toHaveProperty('password');
  });

  it('login returns access token after signup', async () => {
    await request(server)
      .post('/auth/signup')
      .send({
        email,
        password,
        name: 'Test User',
        captchaToken: 'test-token',
      })
      .expect(201);

    const res = await request(server).post('/auth/login').send({
      email,
      password,
      captchaToken: 'test-token',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('/users/me returns current user for valid token', async () => {
    await request(server)
      .post('/auth/signup')
      .send({
        email,
        password,
        name: 'Test User',
        captchaToken: 'test-token',
      })
      .expect(201);

    const loginRes = await request(server)
      .post('/auth/login')
      .send({
        email,
        password,
        captchaToken: 'test-token',
      })
      .expect(200);

    const token = loginRes.body.accessToken as string;
    expect(token).toBeDefined();

    const meRes = await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toHaveProperty('email', email);
  });

  it('invalid login returns 401', async () => {
    await request(server)
      .post('/auth/signup')
      .send({
        email,
        password,
        name: 'Test User',
        captchaToken: 'test-token',
      })
      .expect(201);

    const res = await request(server).post('/auth/login').send({
      email,
      password: 'wrong-password',
      captchaToken: 'test-token',
    });

    expect(res.status).toBe(401);
  });

  it('protected endpoint requires a token', async () => {
    const res = await request(server).get('/users/me');

    expect(res.status).toBe(401);
  });
});
