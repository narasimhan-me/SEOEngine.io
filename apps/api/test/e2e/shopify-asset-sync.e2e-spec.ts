/**
 * [SHOPIFY-ASSET-SYNC-COVERAGE-1] API-level E2E tests for Shopify Pages + Collections sync.
 *
 * Tests:
 * - POST /projects/:id/shopify/sync-pages
 * - POST /projects/:id/shopify/sync-collections
 * - GET /projects/:id/shopify/sync-status
 *
 * Uses global.fetch stubbing pattern from shopify-update-product-seo.e2e-spec.ts.
 */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../utils/test-db';
import { seedFirstDeoWinProjectReady } from '../../src/testkit';

describe('Shopify Asset Sync (SHOPIFY-ASSET-SYNC-COVERAGE-1)', () => {
  let app: INestApplication;
  let server: any;
  let jwtService: JwtService;
  let originalFetch: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ENGINEO_ENV = process.env.ENGINEO_ENV || 'test';

    app = await createTestApp();
    server = app.getHttpServer();
    jwtService = app.get(JwtService);

    originalFetch = (global as any).fetch;
  });

  afterAll(async () => {
    (global as any).fetch = originalFetch;
    await cleanupTestDb();
    await disconnectTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  describe('POST /projects/:id/shopify/sync-pages', () => {
    it('creates CrawlResult rows with Shopify identity fields for pages', async () => {
      const { user, project } = await seedFirstDeoWinProjectReady(testPrisma, {
        userPlan: 'pro',
      });

      const mockPages = [
        {
          id: 'gid://shopify/Page/111',
          title: 'About Us',
          handle: 'about-us',
          updatedAt: '2025-01-01T00:00:00Z',
          seo: { title: 'About SEO', description: 'About description' },
        },
        {
          id: 'gid://shopify/Page/222',
          title: 'Contact',
          handle: 'contact',
          updatedAt: '2025-01-02T00:00:00Z',
          seo: { title: null, description: null },
        },
      ];

      // Mock Shopify GraphQL Admin API for GetPages
      (global as any).fetch = jest.fn(async (_url: string, init: any) => {
        const body = JSON.parse((init?.body as string) ?? '{}');

        if (body.operationName === 'GetPages') {
          return {
            ok: true,
            json: async () => ({
              data: {
                pages: {
                  edges: mockPages.map((p) => ({ node: p })),
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            }),
            text: async () => '',
          };
        }

        throw new Error(`Unexpected operation: ${body.operationName}`);
      });

      const token = jwtService.sign({ sub: user.id });

      const res = await request(server)
        .post(`/projects/${project.id}/shopify/sync-pages`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.projectId).toBe(project.id);
      expect(res.body.fetched).toBe(2);
      expect(res.body.upserted).toBe(2);
      expect(res.body.skipped).toBe(0);
      expect(res.body.completedAt).toBeDefined();

      // Verify CrawlResult rows were created with Shopify identity
      const crawlResults = await testPrisma.crawlResult.findMany({
        where: {
          projectId: project.id,
          shopifyResourceType: 'PAGE',
        },
      });

      expect(crawlResults.length).toBe(2);

      const aboutPage = crawlResults.find((r) => r.shopifyHandle === 'about-us');
      expect(aboutPage).toBeDefined();
      expect(aboutPage?.shopifyResourceId).toBe('111');
      expect(aboutPage?.url).toContain('/pages/about-us');
      expect(aboutPage?.title).toBe('About SEO');
      expect(aboutPage?.h1).toBe('About Us');

      const contactPage = crawlResults.find((r) => r.shopifyHandle === 'contact');
      expect(contactPage).toBeDefined();
      expect(contactPage?.shopifyResourceId).toBe('222');
    });
  });

  describe('POST /projects/:id/shopify/sync-collections', () => {
    it('creates CrawlResult rows with Shopify identity fields for collections', async () => {
      const { user, project } = await seedFirstDeoWinProjectReady(testPrisma, {
        userPlan: 'pro',
      });

      const mockCollections = [
        {
          id: 'gid://shopify/Collection/333',
          title: 'Summer Sale',
          handle: 'summer-sale',
          updatedAt: '2025-01-03T00:00:00Z',
          seo: { title: 'Summer Sale SEO', description: 'Summer deals' },
        },
        {
          id: 'gid://shopify/Collection/444',
          title: 'New Arrivals',
          handle: 'new-arrivals',
          updatedAt: '2025-01-04T00:00:00Z',
          seo: { title: null, description: null },
        },
      ];

      // Mock Shopify GraphQL Admin API for GetCollections
      (global as any).fetch = jest.fn(async (_url: string, init: any) => {
        const body = JSON.parse((init?.body as string) ?? '{}');

        if (body.operationName === 'GetCollections') {
          return {
            ok: true,
            json: async () => ({
              data: {
                collections: {
                  edges: mockCollections.map((c) => ({ node: c })),
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            }),
            text: async () => '',
          };
        }

        throw new Error(`Unexpected operation: ${body.operationName}`);
      });

      const token = jwtService.sign({ sub: user.id });

      const res = await request(server)
        .post(`/projects/${project.id}/shopify/sync-collections`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.projectId).toBe(project.id);
      expect(res.body.fetched).toBe(2);
      expect(res.body.upserted).toBe(2);
      expect(res.body.skipped).toBe(0);

      // Verify CrawlResult rows were created with Shopify identity
      const crawlResults = await testPrisma.crawlResult.findMany({
        where: {
          projectId: project.id,
          shopifyResourceType: 'COLLECTION',
        },
      });

      expect(crawlResults.length).toBe(2);

      const summerSale = crawlResults.find((r) => r.shopifyHandle === 'summer-sale');
      expect(summerSale).toBeDefined();
      expect(summerSale?.shopifyResourceId).toBe('333');
      expect(summerSale?.url).toContain('/collections/summer-sale');
    });
  });

  describe('GET /projects/:id/shopify/sync-status', () => {
    it('returns sync timestamps after syncing', async () => {
      const { user, project, shopifyIntegration } = await seedFirstDeoWinProjectReady(
        testPrisma,
        { userPlan: 'pro' },
      );

      // First check: all timestamps are null
      const token = jwtService.sign({ sub: user.id });

      const resBefore = await request(server)
        .get(`/projects/${project.id}/shopify/sync-status`)
        .set('Authorization', `Bearer ${token}`);

      expect(resBefore.status).toBe(200);
      expect(resBefore.body.projectId).toBe(project.id);
      expect(resBefore.body.lastProductsSyncAt).toBeNull();
      expect(resBefore.body.lastPagesSyncAt).toBeNull();
      expect(resBefore.body.lastCollectionsSyncAt).toBeNull();

      // Sync pages
      (global as any).fetch = jest.fn(async (_url: string, init: any) => {
        const body = JSON.parse((init?.body as string) ?? '{}');
        if (body.operationName === 'GetPages') {
          return {
            ok: true,
            json: async () => ({
              data: {
                pages: {
                  edges: [
                    {
                      node: {
                        id: 'gid://shopify/Page/999',
                        title: 'Test',
                        handle: 'test',
                        updatedAt: '2025-01-01T00:00:00Z',
                        seo: { title: null, description: null },
                      },
                    },
                  ],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            }),
            text: async () => '',
          };
        }
        throw new Error(`Unexpected operation: ${body.operationName}`);
      });

      await request(server)
        .post(`/projects/${project.id}/shopify/sync-pages`)
        .set('Authorization', `Bearer ${token}`);

      // Check: lastPagesSyncAt is now set
      const resAfter = await request(server)
        .get(`/projects/${project.id}/shopify/sync-status`)
        .set('Authorization', `Bearer ${token}`);

      expect(resAfter.status).toBe(200);
      expect(resAfter.body.lastPagesSyncAt).not.toBeNull();
      expect(resAfter.body.lastProductsSyncAt).toBeNull();
      expect(resAfter.body.lastCollectionsSyncAt).toBeNull();
    });
  });
});
