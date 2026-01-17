// Integration tests for Shopify GraphQL product APIs (SHOP-API-1).
// Verifies product sync and SEO update flows using mocked Shopify GraphQL Admin API.

import { ShopifyService } from '../../../src/shopify/shopify.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

describe('Shopify GraphQL product APIs (integration)', () => {
  let originalFetch: any;

  beforeAll(() => {
    originalFetch = (global as any).fetch;
  });

  afterAll(async () => {
    (global as any).fetch = originalFetch;
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  it('syncs products using GraphQL product query', async () => {
    const user = await testPrisma.user.create({
      data: {
        email: `shop-api-1-sync-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'SHOP-API-1 Sync User',
      },
    });

    const project = await testPrisma.project.create({
      data: {
        name: 'SHOP-API-1 GraphQL Sync Project',
        domain: 'shop-api-1-sync.example.com',
        userId: user.id,
      },
    });

    await testPrisma.integration.create({
      data: {
        projectId: project.id,
        type: 'SHOPIFY',
        externalId: 'test-store.myshopify.com',
        accessToken: 'test-token',
        config: {
          scope: 'read_products,write_products',
          installedAt: new Date().toISOString(),
        } as any,
      },
    });

    (global as any).fetch = jest.fn(async (_url: string, init: any) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      const operationName = body.operationName as string | undefined;

      if (operationName === 'GetProducts') {
        return {
          ok: true,
          json: async () => ({
            data: {
              products: {
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/Product/555',
                      title: 'GraphQL Synced Product',
                      handle: 'graphql-synced-product',
                      descriptionHtml:
                        '<p>Description for GraphQL synced product.</p>',
                      status: 'ACTIVE',
                      productType: 'Shoes',
                      vendor: 'GraphQL Vendor',
                      seo: {
                        title: 'GraphQL SEO Title',
                        description: 'GraphQL SEO Description',
                      },
                      images: {
                        edges: [
                          {
                            node: {
                              id: 'gid://shopify/ProductImage/1',
                              altText: 'Alt text',
                              url: 'https://example.com/graphql-product.jpg',
                            },
                          },
                        ],
                      },
                      variants: {
                        edges: [
                          {
                            node: {
                              id: 'gid://shopify/ProductVariant/1',
                              title: 'Default',
                              price: '49.99',
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          }),
          text: async () => '',
        };
      }

      throw new Error(
        `Unexpected GraphQL operation in product sync test: ${operationName}`,
      );
    });

    const configServiceStub: any = {
      get: (key: string) => {
        if (key === 'SHOPIFY_API_KEY') return 'test-api-key';
        if (key === 'SHOPIFY_API_SECRET') return 'test-api-secret';
        if (key === 'SHOPIFY_APP_URL') return 'https://api.example.com';
        // [SHOPIFY-SCOPES-MATRIX-1] Include read_content for pages_sync capability
        if (key === 'SHOPIFY_SCOPES') return 'read_products,write_products,read_themes,read_content';
        return undefined;
      },
    };

    const automationServiceStub: any = {
      runNewProductSeoTitleAutomation: jest.fn().mockResolvedValue(undefined),
      triggerAnswerBlockAutomationForProduct: jest.fn().mockResolvedValue(undefined),
    };

    const roleResolutionService = new RoleResolutionService(testPrisma as any);
    const shopifyService = new ShopifyService(
      testPrisma as any,
      configServiceStub,
      automationServiceStub,
      roleResolutionService,
    );

    const result = await shopifyService.syncProducts(project.id, user.id);

    expect(result.projectId).toBe(project.id);
    expect(result.synced).toBe(1);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);

    const products = await testPrisma.product.findMany({
      where: { projectId: project.id },
    });

    expect(products).toHaveLength(1);
    expect(products[0].externalId).toBe('555');
    expect(products[0].title).toBe('GraphQL Synced Product');
    expect(products[0].seoTitle).toBe('GraphQL SEO Title');
  });

  it('updates product SEO using GraphQL productUpdate mutation', async () => {
    const user = await testPrisma.user.create({
      data: {
        email: `shop-api-1-seo-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'SHOP-API-1 SEO User',
      },
    });

    const project = await testPrisma.project.create({
      data: {
        name: 'SHOP-API-1 GraphQL SEO Project',
        domain: 'shop-api-1-seo.example.com',
        userId: user.id,
      },
    });

    await testPrisma.integration.create({
      data: {
        projectId: project.id,
        type: 'SHOPIFY',
        externalId: 'test-store.myshopify.com',
        accessToken: 'test-token',
        config: {
          scope: 'read_products,write_products',
          installedAt: new Date().toISOString(),
        } as any,
      },
    });

    const product = await testPrisma.product.create({
      data: {
        projectId: project.id,
        externalId: '777',
        title: 'SEO Product',
        description: 'Original description',
        seoTitle: null,
        seoDescription: null,
      },
    });

    (global as any).fetch = jest.fn(async (_url: string, init: any) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      const operationName = body.operationName as string | undefined;

      if (operationName === 'UpdateProductSeo') {
        return {
          ok: true,
          json: async () => ({
            data: {
              productUpdate: {
                product: {
                  id: 'gid://shopify/Product/777',
                  seo: {
                    title: body.variables.input.seo.title,
                    description: body.variables.input.seo.description,
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
        `Unexpected GraphQL operation in SEO update test: ${operationName}`,
      );
    });

    const configServiceStub: any = {
      get: (key: string) => {
        if (key === 'SHOPIFY_API_KEY') return 'test-api-key';
        if (key === 'SHOPIFY_API_SECRET') return 'test-api-secret';
        if (key === 'SHOPIFY_APP_URL') return 'https://api.example.com';
        // [SHOPIFY-SCOPES-MATRIX-1] Include read_content for pages_sync capability
        if (key === 'SHOPIFY_SCOPES') return 'read_products,write_products,read_themes,read_content';
        return undefined;
      },
    };

    const automationServiceStub: any = {
      runNewProductSeoTitleAutomation: jest.fn().mockResolvedValue(undefined),
      triggerAnswerBlockAutomationForProduct: jest.fn().mockResolvedValue(undefined),
    };

    const roleResolutionService = new RoleResolutionService(testPrisma as any);
    const shopifyService = new ShopifyService(
      testPrisma as any,
      configServiceStub,
      automationServiceStub,
      roleResolutionService,
    );

    await shopifyService.updateProductSeo(
      product.id,
      'Updated SEO Title',
      'Updated SEO Description',
      user.id,
    );

    const updated = await testPrisma.product.findUnique({
      where: { id: product.id },
    });

    expect(updated?.seoTitle).toBe('Updated SEO Title');
    expect(updated?.seoDescription).toBe('Updated SEO Description');
  });
});
