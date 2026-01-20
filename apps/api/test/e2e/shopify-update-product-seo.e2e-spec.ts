import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { seedFirstDeoWinProjectReady } from '../../src/testkit';

describe('Shopify Update Product SEO (golden path e2e)', () => {
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

  it('persists SEO updates via POST /shopify/update-product-seo without hitting real Shopify', async () => {
    const { user, products } = await seedFirstDeoWinProjectReady(testPrisma, {
      userPlan: 'pro',
    });

    const product = products[0];

    // Mock Shopify GraphQL Admin API
    let lastOperationName: string | undefined;
    (global as any).fetch = jest.fn(async (_url: string, init: any) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      lastOperationName = body.operationName;

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
        `Unexpected Shopify operation in golden path test: ${body.operationName}`
      );
    });

    const token = jwtService.sign({ sub: user.id });

    const seoTitle = 'Golden Path SEO Title';
    const seoDescription = 'Golden Path SEO Description';

    const res = await request(server)
      .post('/shopify/update-product-seo')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        seoTitle,
        seoDescription,
      });

    expect(res.status).toBe(201);
    expect(res.body.productId).toBe(product.id);
    expect(res.body.seoTitle).toBe(seoTitle);
    expect(res.body.seoDescription).toBe(seoDescription);

    const updatedProduct = await testPrisma.product.findUnique({
      where: { id: product.id },
    });

    expect(updatedProduct?.seoTitle).toBe(seoTitle);
    expect(updatedProduct?.seoDescription).toBe(seoDescription);

    // Ensure our mock was used and no real Shopify call was made
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
    expect(lastOperationName).toBe('UpdateProductSeo');
  });
});
