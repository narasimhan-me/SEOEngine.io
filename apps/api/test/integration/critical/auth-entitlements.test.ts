import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../../utils/test-app';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import { createTestUser, createTestProject } from '../../../src/testkit';

describe('CRITICAL – Auth and entitlement gating', () => {
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

  it('unauthenticated request to protected endpoint returns 401', async () => {
    const res = await request(server).get('/projects');
    expect(res.status).toBe(401);
  });

  it('Free plan user cannot call paid-only Issue Engine Lite fix endpoint', async () => {
    const { user } = await createTestUser(testPrisma, { plan: 'free' });
    const project = await createTestProject(testPrisma, {
      userId: user.id,
      name: 'Entitlements Project',
      domain: 'entitlements.example.com',
    });

    const product = await testPrisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'entitlements-product',
        title: 'Entitlements Product',
        description: 'Missing SEO metadata',
        seoTitle: null,
        seoDescription: null,
      },
    });

    const token = jwtService.sign({ sub: user.id });

    const res = await request(server)
      .post('/ai/product-metadata/fix-from-issue')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        issueType: 'missing_seo_title',
      });

    expect(res.status).toBe(403);
    expect(res.body?.code).toBe('ENTITLEMENTS_LIMIT_REACHED');
  });
});

