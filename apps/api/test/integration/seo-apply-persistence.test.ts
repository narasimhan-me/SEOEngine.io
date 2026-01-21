import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { seedFirstDeoWinProjectReady } from '../../src/testkit';

describe('TEST-1 – SEO apply persistence via /shopify/update-product-seo', () => {
  let app: INestApplication;
  let server: any;
  let jwtService: JwtService;
  let originalFetch: any;

  beforeAll(async () => {
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
    (global as any).fetch = originalFetch;
  });

  function authHeader(userId: string) {
    const token = jwtService.sign({ sub: userId });
    return { Authorization: `Bearer ${token}` };
  }

  it('applies SEO to a product and calls Shopify mock exactly once', async () => {
    const { user, project, products } = await seedFirstDeoWinProjectReady(
      testPrisma,
      {
        userPlan: 'pro',
      }
    );
    const product = products[0];

    let lastRequestBody: any = null;

    (global as any).fetch = jest.fn(async (_url: string, init: any) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      lastRequestBody = body;

      if (body.operationName === 'UpdateProductSeo') {
        return {
          ok: true,
          json: async () => ({
            data: {
              productUpdate: {
                product: {
                  id: `gid://shopify/Product/${product.externalId}`,
                  seo: {
                    title: 'Updated Title',
                    description: 'Updated Description',
                  },
                },
                userErrors: [],
              },
            },
          }),
          text: async () => '',
        };
      }

      throw new Error(
        `Unexpected Shopify operation in TEST-1 seo-apply-persistence test: ${body.operationName}`
      );
    });

    const seoTitle = 'Integration SEO Title';
    const seoDescription = 'Integration SEO Description';

    const res = await request(server)
      .post('/shopify/update-product-seo')
      .set(authHeader(user.id))
      .send({
        productId: product.id,
        seoTitle,
        seoDescription,
      });

    expect(res.status).toBe(201);
    expect(res.body.productId).toBe(product.id);
    expect(res.body.seoTitle).toBe(seoTitle);
    expect(res.body.seoDescription).toBe(seoDescription);

    const updated = await testPrisma.product.findUnique({
      where: { id: product.id },
    });

    expect(updated?.seoTitle).toBe(seoTitle);
    expect(updated?.seoDescription).toBe(seoDescription);

    expect((global as any).fetch).toHaveBeenCalledTimes(1);
    expect(lastRequestBody?.operationName).toBe('UpdateProductSeo');
    expect(lastRequestBody?.variables?.input?.id).toBe(
      `gid://shopify/Product/${product.externalId}`
    );
    expect(lastRequestBody?.variables?.input?.seo?.title).toBe(seoTitle);
    expect(lastRequestBody?.variables?.input?.seo?.description).toBe(
      seoDescription
    );
  });

  it('returns 400 when product does not exist', async () => {
    const user = await testPrisma.user.create({
      data: {
        email: `seo-negative-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'SEO Negative Test User',
      },
    });

    const res = await request(server)
      .post('/shopify/update-product-seo')
      .set(authHeader(user.id))
      .send({
        productId: 'non-existent-product-id',
        seoTitle: 'Title',
        seoDescription: 'Description',
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
