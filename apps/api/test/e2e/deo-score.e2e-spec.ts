import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb } from '../utils/test-db';
import { DeoScoreService, DeoSignalsService } from '../../src/projects/deo-score.service';

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

async function createProject(
  server: any,
  token: string,
  name = 'DEO Project',
): Promise<string> {
  const res = await request(server)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      domain: 'deo-project.example.com',
    })
    .expect(201);

  return res.body.id as string;
}

describe('DEO Score (e2e)', () => {
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

  it('recompute enqueues job and scoring pipeline persists snapshot', async () => {
    const { token } = await signupAndLogin(
      server,
      'deo-score-owner@example.com',
      'testpassword123',
    );
    const projectId = await createProject(server, token, 'DEO Score Project');

    const recomputeRes = await request(server)
      .post(`/projects/${projectId}/deo-score/recompute`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(recomputeRes.status).toBe(201);
    expect(recomputeRes.body).toEqual({
      projectId,
      enqueued: true,
    });

    // Simulate worker execution synchronously in tests
    const deoSignalsService = app.get(DeoSignalsService);
    const deoScoreService = app.get(DeoScoreService);

    const signals = await deoSignalsService.collectSignalsForProject(projectId);
    const snapshot = await deoScoreService.computeAndPersistScoreFromSignals(
      projectId,
      signals,
    );

    expect(snapshot).toHaveProperty('id');
    expect(snapshot.breakdown.overall).toBeGreaterThanOrEqual(0);
    expect(snapshot.breakdown.overall).toBeLessThanOrEqual(100);

    const getRes = await request(server)
      .get(`/projects/${projectId}/deo-score`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveProperty('projectId', projectId);
    expect(getRes.body.latestScore).toBeDefined();
    expect(getRes.body.latestScore.overall).toBe(snapshot.breakdown.overall);
    expect(getRes.body.latestSnapshot.version).toBe('v1');
    expect(new Date(getRes.body.latestSnapshot.computedAt).getTime()).toBeGreaterThan(
      0,
    );
  });

  it('user cannot recompute DEO score for another user project', async () => {
    const owner = await signupAndLogin(
      server,
      'deo-owner@example.com',
      'testpassword123',
    );
    const other = await signupAndLogin(
      server,
      'deo-other@example.com',
      'testpassword123',
    );

    const projectId = await createProject(server, owner.token, 'Owner Project');

    const res = await request(server)
      .post(`/projects/${projectId}/deo-score/recompute`)
      .set('Authorization', `Bearer ${other.token}`)
      .send();

    expect(res.status).toBe(403);
  });

  it('recompute with invalid project id returns not found', async () => {
    const { token } = await signupAndLogin(
      server,
      'deo-invalid@example.com',
      'testpassword123',
    );

    const res = await request(server)
      .post('/projects/non-existent-id/deo-score/recompute')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(404);
  });
});
