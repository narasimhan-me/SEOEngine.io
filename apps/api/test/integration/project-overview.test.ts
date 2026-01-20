import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { seedConnectedStoreProject } from '../../src/testkit';

describe('TEST-1 – Project overview metrics', () => {
  let app: INestApplication;
  let server: any;
  let jwtService: JwtService;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  function authHeader(userId: string) {
    const token = jwtService.sign({ sub: userId });
    return { Authorization: `Bearer ${token}` };
  }

  it('productsWithAppliedSeo increments as products are optimized', async () => {
    const { user, project } = await seedConnectedStoreProject(testPrisma, {
      plan: 'pro',
    });

    const product1 = await testPrisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'overview-product-1',
        title: 'Overview Product 1',
        description: 'Missing SEO',
        seoTitle: null,
        seoDescription: null,
      },
    });

    const product2 = await testPrisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'overview-product-2',
        title: 'Overview Product 2',
        description: 'Missing SEO',
        seoTitle: null,
        seoDescription: null,
      },
    });

    const getOverview = async () =>
      request(server)
        .get(`/projects/${project.id}/overview`)
        .set(authHeader(user.id));

    const beforeRes = await getOverview();
    expect(beforeRes.status).toBe(200);
    expect(beforeRes.body.productCount).toBe(2);
    expect(beforeRes.body.productsWithAppliedSeo).toBe(0);

    await testPrisma.product.update({
      where: { id: product1.id },
      data: {
        seoTitle: 'Optimized Title 1',
        seoDescription: 'Optimized Description 1',
      },
    });

    const afterFirstRes = await getOverview();
    expect(afterFirstRes.status).toBe(200);
    expect(afterFirstRes.body.productsWithAppliedSeo).toBe(1);

    await testPrisma.product.update({
      where: { id: product2.id },
      data: {
        seoTitle: 'Optimized Title 2',
        seoDescription: 'Optimized Description 2',
      },
    });

    const afterSecondRes = await getOverview();
    expect(afterSecondRes.status).toBe(200);
    expect(afterSecondRes.body.productsWithAppliedSeo).toBe(2);

    // Basic sanity on other metrics: stable and non-negative.
    expect(afterSecondRes.body.crawlCount).toBeGreaterThanOrEqual(0);
    expect(afterSecondRes.body.issueCount).toBeGreaterThanOrEqual(0);
  });
});
