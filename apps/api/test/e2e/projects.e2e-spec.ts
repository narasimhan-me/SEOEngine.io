import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb } from '../utils/test-db';

async function signupAndLogin(
  server: any,
  email: string,
  password: string,
): Promise<{ token: string; userId: string }> {
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

  return {
    token: loginRes.body.accessToken as string,
    userId: loginRes.body.user.id as string,
  };
}

describe('Projects (e2e)', () => {
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

  it('POST /projects creates a project', async () => {
    const { token } = await signupAndLogin(
      server,
      'proj-create@example.com',
      'testpassword123',
    );

    const res = await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'My Project',
        domain: 'example.com',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name', 'My Project');
  });

  it('GET /projects lists only the authenticated user projects', async () => {
    const user1 = await signupAndLogin(
      server,
      'user1-projects@example.com',
      'testpassword123',
    );
    const user2 = await signupAndLogin(
      server,
      'user2-projects@example.com',
      'testpassword123',
    );

    // Create two projects for user1
    await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'U1 Project 1', domain: 'u1-1.com' })
      .expect(201);

    await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'U1 Project 2', domain: 'u1-2.com' })
      .expect(201);

    // Create one project for user2
    await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${user2.token}`)
      .send({ name: 'U2 Project 1', domain: 'u2-1.com' })
      .expect(201);

    const res = await request(server)
      .get('/projects')
      .set('Authorization', `Bearer ${user1.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    for (const proj of res.body) {
      expect(proj.userId).toBe(user1.userId);
    }
  });

  it('user cannot fetch another user project', async () => {
    const user1 = await signupAndLogin(
      server,
      'owner-project@example.com',
      'testpassword123',
    );
    const user2 = await signupAndLogin(
      server,
      'other-project@example.com',
      'testpassword123',
    );

    const createRes = await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'Owner Project', domain: 'owner.com' })
      .expect(201);

    const projectId = createRes.body.id as string;

    const res = await request(server)
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${user2.token}`);

    expect(res.status).toBe(403);
  });

  it('invalid payload results in an error response', async () => {
    const { token } = await signupAndLogin(
      server,
      'invalid-project@example.com',
      'testpassword123',
    );

    const res = await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({}); // missing required name

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
