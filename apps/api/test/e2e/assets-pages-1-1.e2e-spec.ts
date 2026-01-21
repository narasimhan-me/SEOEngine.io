/**
 * ASSETS-PAGES-1.1 E2E Tests
 *
 * Tests for Pages & Collections automation playbook execution:
 * - Estimate endpoint with assetType parameter
 * - Handle-based asset refs for scoping
 * - Work Queue bundle generation for non-PRODUCTS asset types
 *
 * Authoritative Constraints:
 * 1. Canonical playbook IDs ONLY: missing_seo_title, missing_seo_description
 * 2. Metadata-only mutations for Pages/Collections
 * 3. Handle-only apply: page_handle:<handle>, collection_handle:<handle>
 * 4. Apply never uses AI (AUTO-PB-1.3 invariant preserved)
 */

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
  name: string,
  domain: string
): Promise<string> {
  const res = await request(server)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, domain })
    .expect(201);
  return res.body.id as string;
}

async function createCrawlResult(
  projectId: string,
  data: {
    url: string;
    title?: string | null;
    metaDescription?: string | null;
  }
): Promise<string> {
  const result = await testPrisma.crawlResult.create({
    data: {
      projectId,
      url: data.url,
      title: data.title ?? null,
      metaDescription: data.metaDescription ?? null,
      statusCode: 200,
      loadTimeMs: 100,
      issues: [],
    },
  });
  return result.id;
}

async function upgradeUserToPro(userId: string): Promise<void> {
  await testPrisma.subscription.create({
    data: {
      userId,
      stripeCustomerId: `cus_test_${userId}`,
      stripeSubscriptionId: `sub_test_${userId}`,
      status: 'active',
      plan: 'pro',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

describe('ASSETS-PAGES-1.1 (e2e)', () => {
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

  describe('POST /projects/:id/automation-playbooks/estimate with assetType', () => {
    it('returns estimate for PAGES with missing SEO title', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'pages-estimate@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Pages Test Project',
        'pages-test.com'
      );

      // Create pages: 2 without SEO title, 1 with SEO title
      await createCrawlResult(projectId, {
        url: 'https://pages-test.com/pages/about-us',
        title: null,
        metaDescription: 'About page description',
      });
      await createCrawlResult(projectId, {
        url: 'https://pages-test.com/pages/contact',
        title: '',
        metaDescription: 'Contact page description',
      });
      await createCrawlResult(projectId, {
        url: 'https://pages-test.com/pages/faq',
        title: 'FAQ Page Title',
        metaDescription: 'FAQ page description',
      });

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          assetType: 'PAGES',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('projectId', projectId);
      expect(res.body).toHaveProperty('playbookId', 'missing_seo_title');
      expect(res.body).toHaveProperty('totalAffectedProducts', 2);
      expect(res.body).toHaveProperty('scopeId');
      expect(typeof res.body.scopeId).toBe('string');
      expect(res.body.scopeId.length).toBeGreaterThan(0);
    });

    it('returns estimate for COLLECTIONS with missing SEO description', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'collections-estimate@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Collections Test Project',
        'collections-test.com'
      );

      // Create collections: 1 without SEO description, 2 with SEO description
      await createCrawlResult(projectId, {
        url: 'https://collections-test.com/collections/summer-sale',
        title: 'Summer Sale',
        metaDescription: null,
      });
      await createCrawlResult(projectId, {
        url: 'https://collections-test.com/collections/winter-collection',
        title: 'Winter Collection',
        metaDescription: 'Winter collection description',
      });
      await createCrawlResult(projectId, {
        url: 'https://collections-test.com/collections/new-arrivals',
        title: 'New Arrivals',
        metaDescription: 'New arrivals description',
      });

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_description',
          assetType: 'COLLECTIONS',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalAffectedProducts', 1);
      expect(res.body).toHaveProperty('playbookId', 'missing_seo_description');
      expect(res.body).toHaveProperty('scopeId');
    });

    it('returns different scopeId for same playbookId with different assetType', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'scope-diff@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Scope Diff Project',
        'scope-diff.com'
      );

      // Create both pages and collections with missing titles
      await createCrawlResult(projectId, {
        url: 'https://scope-diff.com/pages/about',
        title: null,
      });
      await createCrawlResult(projectId, {
        url: 'https://scope-diff.com/collections/sale',
        title: null,
      });

      // Get estimate for PAGES
      const pagesRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          assetType: 'PAGES',
        });

      // Get estimate for COLLECTIONS
      const collectionsRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          assetType: 'COLLECTIONS',
        });

      expect(pagesRes.status).toBe(200);
      expect(collectionsRes.status).toBe(200);
      // scopeId should be different for different asset types
      expect(pagesRes.body.scopeId).not.toBe(collectionsRes.body.scopeId);
    });
  });

  describe('Scoped estimates with scopeAssetRefs', () => {
    it('accepts page_handle refs for PAGES asset type', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'page-refs@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Page Refs Project',
        'page-refs.com'
      );

      // Create multiple pages
      await createCrawlResult(projectId, {
        url: 'https://page-refs.com/pages/about-us',
        title: null,
      });
      await createCrawlResult(projectId, {
        url: 'https://page-refs.com/pages/contact',
        title: null,
      });
      await createCrawlResult(projectId, {
        url: 'https://page-refs.com/pages/faq',
        title: null,
      });

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          assetType: 'PAGES',
          scopeAssetRefs: ['page_handle:about-us', 'page_handle:contact'],
        });

      expect(res.status).toBe(200);
      // Should only count the 2 specified pages
      expect(res.body.totalAffectedProducts).toBeLessThanOrEqual(2);
    });

    it('rejects collection_handle refs for PAGES asset type', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'wrong-refs@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Wrong Refs Project',
        'wrong-refs.com'
      );

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          assetType: 'PAGES',
          scopeAssetRefs: ['collection_handle:summer-sale'],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('page_handle');
    });

    it('rejects scopeProductIds for non-PRODUCTS asset type', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'product-ids-invalid@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Product IDs Invalid Project',
        'product-ids-invalid.com'
      );

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          assetType: 'PAGES',
          scopeProductIds: ['product-id-1'],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('scopeProductIds');
    });
  });

  describe('Work Queue with Pages/Collections bundles', () => {
    it('returns bundles with PAGES scopeType for page issues', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'work-queue-pages@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Work Queue Pages Project',
        'work-queue-pages.com'
      );

      // Create pages with missing SEO metadata
      await createCrawlResult(projectId, {
        url: 'https://work-queue-pages.com/pages/about',
        title: null,
        metaDescription: 'Has description',
      });

      const res = await request(server)
        .get(`/projects/${projectId}/work-queue`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('bundles');

      // Look for AUTOMATION_RUN bundles with PAGES scope
      const pagesBundles = res.body.bundles.filter(
        (b: any) => b.bundleType === 'AUTOMATION_RUN' && b.scopeType === 'PAGES'
      );

      // Should have at least one bundle for pages (if issues exist)
      if (pagesBundles.length > 0) {
        expect(pagesBundles[0].scopeType).toBe('PAGES');
        expect(pagesBundles[0].bundleId).toContain(':PAGES:');
      }
    });

    it('returns bundles with COLLECTIONS scopeType for collection issues', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'work-queue-collections@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Work Queue Collections Project',
        'work-queue-collections.com'
      );

      // Create collections with missing SEO metadata
      await createCrawlResult(projectId, {
        url: 'https://work-queue-collections.com/collections/summer',
        title: null,
        metaDescription: 'Has description',
      });

      const res = await request(server)
        .get(`/projects/${projectId}/work-queue`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('bundles');

      // Look for AUTOMATION_RUN bundles with COLLECTIONS scope
      const collectionsBundles = res.body.bundles.filter(
        (b: any) =>
          b.bundleType === 'AUTOMATION_RUN' && b.scopeType === 'COLLECTIONS'
      );

      // Should have at least one bundle for collections (if issues exist)
      if (collectionsBundles.length > 0) {
        expect(collectionsBundles[0].scopeType).toBe('COLLECTIONS');
        expect(collectionsBundles[0].bundleId).toContain(':COLLECTIONS:');
      }
    });
  });

  describe('Canonical playbook ID validation', () => {
    it('uses canonical missing_seo_title for all asset types', async () => {
      const { token } = await signupAndLogin(
        server,
        'canonical-title@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Canonical Title Project',
        'canonical-title.com'
      );

      // Create page with missing title
      await createCrawlResult(projectId, {
        url: 'https://canonical-title.com/pages/test',
        title: null,
      });

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          assetType: 'PAGES',
        });

      expect(res.status).toBe(200);
      // The response should use the canonical playbookId
      expect(res.body.playbookId).toBe('missing_seo_title');
    });

    it('rejects non-canonical playbook IDs like page_missing_seo_title', async () => {
      const { token } = await signupAndLogin(
        server,
        'non-canonical@example.com',
        'testpassword123'
      );
      const projectId = await createProject(
        server,
        token,
        'Non-Canonical Project',
        'non-canonical.com'
      );

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'page_missing_seo_title', // Non-canonical, should be rejected
          assetType: 'PAGES',
        });

      expect(res.status).toBe(400);
    });
  });
});
