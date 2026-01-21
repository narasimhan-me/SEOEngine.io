import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../../utils/test-app';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import {
  createTestUser,
  createTestProject,
  seedConnectedStoreProject,
  seedCrawledProject,
  seedReviewedDeoProject,
  seedOptimizedProducts,
} from '../../../src/testkit';

describe('CRITICAL – Onboarding checklist backend signals', () => {
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

  it('baseline new project: no integrations, no crawls, no score, no optimized products', async () => {
    const { user } = await createTestUser(testPrisma);
    const project = await createTestProject(testPrisma, {
      userId: user.id,
      name: 'Onboarding Baseline',
      domain: 'baseline.example.com',
    });

    const integrationRes = await request(server)
      .get(`/projects/${project.id}/integration-status`)
      .set(authHeader(user.id));

    expect(integrationRes.status).toBe(200);
    expect(integrationRes.body.shopify?.connected).toBe(false);
    expect(Array.isArray(integrationRes.body.integrations)).toBe(true);
    expect(integrationRes.body.integrations.length).toBe(0);

    const overviewRes = await request(server)
      .get(`/projects/${project.id}/overview`)
      .set(authHeader(user.id));

    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.crawlCount).toBe(0);
    expect(overviewRes.body.productsWithAppliedSeo).toBe(0);

    const deoScoreRes = await request(server)
      .get(`/projects/${project.id}/deo-score`)
      .set(authHeader(user.id));

    expect(deoScoreRes.status).toBe(200);
    expect(deoScoreRes.body.latestScore).toBeNull();
  });

  it('connected Shopify store is reflected via integration-status', async () => {
    const { user, project } = await seedConnectedStoreProject(testPrisma, {
      plan: 'pro',
    });

    const res = await request(server)
      .get(`/projects/${project.id}/integration-status`)
      .set(authHeader(user.id));

    expect(res.status).toBe(200);
    expect(res.body.shopify?.connected).toBe(true);
    expect(typeof res.body.shopify?.shopDomain).toBe('string');
    expect(res.body.shopify.shopDomain.length).toBeGreaterThan(0);
  });

  it('first crawl is reflected via overview metrics (crawlCount > 0)', async () => {
    const { user, project } = await seedCrawledProject(testPrisma, {
      plan: 'pro',
    });

    const res = await request(server)
      .get(`/projects/${project!.id}/overview`)
      .set(authHeader(user.id));

    expect(res.status).toBe(200);
    expect(res.body.crawlCount).toBeGreaterThanOrEqual(1);
  });

  it('DEO score snapshot makes backend expose a latestScore', async () => {
    const { user, project } = await seedReviewedDeoProject(testPrisma, {
      plan: 'pro',
      score: 82,
    });

    const res = await request(server)
      .get(`/projects/${project!.id}/deo-score`)
      .set(authHeader(user.id));

    expect(res.status).toBe(200);
    expect(res.body.latestScore?.overall).toBe(82);
  });

  it('productsWithAppliedSeo >= 3 when three products are optimized', async () => {
    const { user, project } = await seedConnectedStoreProject(testPrisma, {
      plan: 'pro',
    });

    await seedOptimizedProducts(testPrisma, {
      projectId: project.id,
      count: 3,
    });

    const res = await request(server)
      .get(`/projects/${project.id}/overview`)
      .set(authHeader(user.id));

    expect(res.status).toBe(200);
    expect(res.body.productsWithAppliedSeo).toBeGreaterThanOrEqual(3);
  });
});
