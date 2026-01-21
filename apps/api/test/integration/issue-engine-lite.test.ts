import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import {
  seedConnectedStoreProject,
  seedProductsNeedingSeo,
} from '../../src/testkit';

describe('TEST-1 – Issue Engine Lite determinism', () => {
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

  it('returns stable missing_seo_title and missing_seo_description issues for products without SEO', async () => {
    const { user, project } = await seedConnectedStoreProject(testPrisma, {
      plan: 'pro',
    });

    await seedProductsNeedingSeo(testPrisma, {
      projectId: project.id,
      count: 5,
    });

    const res = await request(server)
      .get(`/projects/${project.id}/deo-issues`)
      .set(authHeader(user.id));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.issues)).toBe(true);

    const issues = res.body.issues as Array<{
      id: string;
      type?: string;
      severity?: string;
    }>;

    const ids = issues.map((i) => i.id);
    expect(ids).toContain('missing_seo_title');
    expect(ids).toContain('missing_seo_description');

    const missingTitle = issues.find((i) => i.id === 'missing_seo_title');
    const missingDescription = issues.find(
      (i) => i.id === 'missing_seo_description'
    );

    expect(missingTitle).toBeDefined();
    expect(missingDescription).toBeDefined();

    // With all products missing metadata, severity should be critical for both.
    expect(missingTitle?.severity).toBe('critical');
    expect(missingDescription?.severity).toBe('critical');
  });
});
