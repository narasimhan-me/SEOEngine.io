import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';

async function signupAndLogin(
  server: any,
  email: string,
  password: string
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
  name = 'Answer Engine Project'
): Promise<string> {
  const res = await request(server)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      domain: 'answer-engine.example.com',
    })
    .expect(201);

  return res.body.id as string;
}

describe('Answer Engine Detection (e2e)', () => {
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

  it('returns answerability response with overall status and products', async () => {
    const { token, userId } = await signupAndLogin(
      server,
      'ae-owner@example.com',
      'testpassword123'
    );
    const projectId = await createProject(
      server,
      token,
      'Answer Engine Project'
    );

    // Insert test products with varying descriptions
    // Product A: Rich description with clear features, materials, and usage
    await testPrisma.product.create({
      data: {
        projectId,
        externalId: 'product-a-rich',
        title: 'Premium Organic Cotton T-Shirt',
        description:
          'This premium t-shirt is made from 100% organic cotton. Perfect for runners and athletes. Features include moisture-wicking fabric and reinforced seams. Machine wash cold, tumble dry low. Includes a reusable storage bag. Unlike other t-shirts, our patented StayFresh technology keeps you cool all day.',
        seoTitle: 'Premium Organic Cotton T-Shirt for Athletes',
        seoDescription:
          'Premium organic cotton t-shirt designed for runners. Features moisture-wicking fabric, perfect for outdoor activities. Machine washable.',
      },
    });

    // Product B: Minimal, vague description
    await testPrisma.product.create({
      data: {
        projectId,
        externalId: 'product-b-minimal',
        title: 'Widget',
        description: "Great product, you'll love it!",
      },
    });

    // Call the answerability endpoint
    const res = await request(server)
      .get(`/projects/${projectId}/answerability`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('projectId', projectId);
    expect(res.body).toHaveProperty('generatedAt');
    expect(new Date(res.body.generatedAt).getTime()).toBeGreaterThan(0);

    // Verify overall status structure
    expect(res.body).toHaveProperty('overallStatus');
    expect(res.body.overallStatus).toHaveProperty('status');
    expect([
      'answer_ready',
      'partially_answer_ready',
      'needs_answers',
    ]).toContain(res.body.overallStatus.status);
    expect(res.body.overallStatus).toHaveProperty('missingQuestions');
    expect(Array.isArray(res.body.overallStatus.missingQuestions)).toBe(true);
    expect(res.body.overallStatus).toHaveProperty('weakQuestions');
    expect(Array.isArray(res.body.overallStatus.weakQuestions)).toBe(true);
    expect(res.body.overallStatus).toHaveProperty('answerabilityScore');
    expect(res.body.overallStatus.answerabilityScore).toBeGreaterThanOrEqual(0);
    expect(res.body.overallStatus.answerabilityScore).toBeLessThanOrEqual(100);

    // Verify products array
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBe(2);

    // Find Product A (rich) and Product B (minimal)
    const productA = res.body.products.find(
      (p: any) => p.productTitle === 'Premium Organic Cotton T-Shirt'
    );
    const productB = res.body.products.find(
      (p: any) => p.productTitle === 'Widget'
    );

    expect(productA).toBeDefined();
    expect(productB).toBeDefined();

    // Product A should have fewer missing questions and not be needs_answers
    expect(productA.status).toHaveProperty('status');
    expect(productA.status.status).not.toBe('needs_answers');
    expect(productA.status.missingQuestions.length).toBeLessThan(
      productB.status.missingQuestions.length
    );

    // Product B should be needs_answers with many missing questions
    expect(productB.status.status).toBe('needs_answers');
    expect(productB.status.missingQuestions.length).toBeGreaterThanOrEqual(5);
    expect(productB.status.answerabilityScore).toBeLessThan(
      productA.status.answerabilityScore
    );
  });

  it('user cannot read answerability for another user project', async () => {
    const owner = await signupAndLogin(
      server,
      'ae-owner2@example.com',
      'testpassword123'
    );
    const other = await signupAndLogin(
      server,
      'ae-other@example.com',
      'testpassword123'
    );

    const projectId = await createProject(server, owner.token, 'Owner Project');

    const res = await request(server)
      .get(`/projects/${projectId}/answerability`)
      .set('Authorization', `Bearer ${other.token}`)
      .send();

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent project', async () => {
    const { token } = await signupAndLogin(
      server,
      'ae-invalid@example.com',
      'testpassword123'
    );

    const res = await request(server)
      .get('/projects/non-existent-id/answerability')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(404);
  });

  it('returns empty products array for project with no products', async () => {
    const { token } = await signupAndLogin(
      server,
      'ae-empty@example.com',
      'testpassword123'
    );
    const projectId = await createProject(server, token, 'Empty Project');

    const res = await request(server)
      .get(`/projects/${projectId}/answerability`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
    expect(res.body.overallStatus.status).toBe('needs_answers');
    expect(res.body.overallStatus.answerabilityScore).toBe(0);
  });
});
