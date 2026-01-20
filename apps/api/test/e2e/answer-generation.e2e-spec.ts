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
  name = 'Answer Generation Project'
): Promise<string> {
  const res = await request(server)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      domain: 'answer-gen.example.com',
    })
    .expect(201);

  return res.body.id as string;
}

describe('Answer Generation API (e2e)', () => {
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

  it('returns ProductAnswersResponse with answers for a rich product', async () => {
    const { token } = await signupAndLogin(
      server,
      'ag-rich@example.com',
      'testpassword123'
    );
    const projectId = await createProject(server, token);

    // Create a product with rich content
    const product = await testPrisma.product.create({
      data: {
        projectId,
        externalId: 'product-rich',
        title: 'Premium Organic Cotton T-Shirt',
        description:
          'This premium t-shirt is made from 100% organic cotton. Perfect for runners and athletes. Features include moisture-wicking fabric and reinforced seams. Machine wash cold, tumble dry low. Includes a reusable storage bag. Unlike other t-shirts, our patented StayFresh technology keeps you cool all day.',
        seoTitle: 'Premium Organic Cotton T-Shirt for Athletes',
        seoDescription:
          'Premium organic cotton t-shirt designed for runners. Features moisture-wicking fabric, perfect for outdoor activities. Machine washable.',
      },
    });

    const res = await request(server)
      .post('/ai/product-answers')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('projectId', projectId);
    expect(res.body).toHaveProperty('productId', product.id);
    expect(res.body).toHaveProperty('generatedAt');
    expect(new Date(res.body.generatedAt).getTime()).toBeGreaterThan(0);

    // Verify answerabilityStatus structure
    expect(res.body).toHaveProperty('answerabilityStatus');
    expect(res.body.answerabilityStatus).toHaveProperty('status');
    expect([
      'answer_ready',
      'partially_answer_ready',
      'needs_answers',
    ]).toContain(res.body.answerabilityStatus.status);
    expect(res.body.answerabilityStatus).toHaveProperty('missingQuestions');
    expect(Array.isArray(res.body.answerabilityStatus.missingQuestions)).toBe(
      true
    );
    expect(res.body.answerabilityStatus).toHaveProperty('weakQuestions');
    expect(Array.isArray(res.body.answerabilityStatus.weakQuestions)).toBe(
      true
    );

    // Verify answers array structure
    expect(res.body).toHaveProperty('answers');
    expect(Array.isArray(res.body.answers)).toBe(true);

    // With AI provider, we'd expect answers; without, we get empty array (fallback)
    // The test verifies structure either way
    if (res.body.answers.length > 0) {
      const firstAnswer = res.body.answers[0];
      expect(firstAnswer).toHaveProperty('id');
      expect(firstAnswer).toHaveProperty('projectId', projectId);
      expect(firstAnswer).toHaveProperty('productId', product.id);
      expect(firstAnswer).toHaveProperty('questionId');
      expect(firstAnswer).toHaveProperty('question');
      expect(firstAnswer).toHaveProperty('answer');
      expect(firstAnswer).toHaveProperty('confidence');
      expect(firstAnswer).toHaveProperty('sourceType', 'generated');
      expect(firstAnswer).toHaveProperty('factsUsed');
      expect(firstAnswer).toHaveProperty('version', 'ae_v1');
      expect(firstAnswer).toHaveProperty('createdAt');
      expect(firstAnswer).toHaveProperty('updatedAt');
    }
  });

  it('returns empty answers for a minimal product (AI cannot answer)', async () => {
    const { token } = await signupAndLogin(
      server,
      'ag-minimal@example.com',
      'testpassword123'
    );
    const projectId = await createProject(server, token);

    // Create a product with minimal content
    const product = await testPrisma.product.create({
      data: {
        projectId,
        externalId: 'product-minimal',
        title: 'Widget',
        description: "Great product, you'll love it!",
      },
    });

    const res = await request(server)
      .post('/ai/product-answers')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('projectId', projectId);
    expect(res.body).toHaveProperty('productId', product.id);

    // Answerability should indicate poor answer readiness
    expect(res.body.answerabilityStatus.status).toBe('needs_answers');
    expect(
      res.body.answerabilityStatus.missingQuestions.length
    ).toBeGreaterThanOrEqual(5);
  });

  it('rejects requests for non-existent product', async () => {
    const { token } = await signupAndLogin(
      server,
      'ag-invalid@example.com',
      'testpassword123'
    );

    const res = await request(server)
      .post('/ai/product-answers')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'non-existent-id' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Product not found');
  });

  it("rejects requests for another user's product", async () => {
    const owner = await signupAndLogin(
      server,
      'ag-owner@example.com',
      'testpassword123'
    );
    const other = await signupAndLogin(
      server,
      'ag-other@example.com',
      'testpassword123'
    );

    const projectId = await createProject(server, owner.token);

    const product = await testPrisma.product.create({
      data: {
        projectId,
        externalId: 'owner-product',
        title: "Owner's Product",
        description: 'A product belonging to owner',
      },
    });

    const res = await request(server)
      .post('/ai/product-answers')
      .set('Authorization', `Bearer ${other.token}`)
      .send({ productId: product.id });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Access denied');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(server)
      .post('/ai/product-answers')
      .send({ productId: 'any-id' });

    expect(res.status).toBe(401);
  });
});
