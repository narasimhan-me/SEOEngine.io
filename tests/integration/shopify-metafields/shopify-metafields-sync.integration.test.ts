// Integration tests for Shopify Answer Block metafield sync (AEO-2).
// Uses the shared test Prisma client and mocks Shopify Admin API via global.fetch.

import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../../apps/api/test/utils/test-db';
import { ShopifyService } from '../../../apps/api/src/shopify/shopify.service';

describe('Shopify Answer Block metafields sync (integration)', () => {
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

  it('syncs persisted Answer Blocks to Shopify metafields for a product', async () => {
    const user = await testPrisma.user.create({
      data: {
        email: `aeo2-sync-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'AEO-2 Sync Test User',
      },
    });

    const project = await testPrisma.project.create({
      data: {
        name: 'AEO-2 Metafields Project',
        domain: 'aeo2-metafields.example.com',
        userId: user.id,
        aeoSyncToShopifyMetafields: true,
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
        externalId: '1111111111',
        title: 'Metafield Sync Product',
        description: 'Description for metafield sync test.',
        seoTitle: null,
        seoDescription: null,
      },
    });

    await testPrisma.answerBlock.create({
      data: {
        productId: product.id,
        questionId: 'what_is_it',
        questionText: 'What is it?',
        answerText: 'This is a metafield-sync test answer.',
        confidenceScore: 0.9,
        sourceType: 'generated',
        sourceFieldsUsed: [],
      },
    });

    const recordedDefinitionKeys: string[] = [];
    const recordedMetafieldUpserts: Array<{ url: string; body: any }> = [];

    (global as any).fetch = jest.fn(
      async (url: string, init: any): Promise<any> => {
        if (
          url.includes(
            '/admin/api/2023-10/metafield_definitions.json?namespace=engineo&owner_type=product',
          )
        ) {
          return {
            ok: true,
            json: async () => ({ metafield_definitions: [] }),
            text: async () => '',
          };
        }

        if (url.endsWith('/admin/api/2023-10/metafield_definitions.json')) {
          const body = JSON.parse(init.body as string);
          recordedDefinitionKeys.push(body.metafield_definition.key);
          return {
            ok: true,
            json: async () => ({
              metafield_definition: { id: 1 },
            }),
            text: async () => '',
          };
        }

        if (
          url.includes(
            '/admin/api/2023-10/products/1111111111/metafields.json?namespace=engineo',
          )
        ) {
          return {
            ok: true,
            json: async () => ({ metafields: [] }),
            text: async () => '',
          };
        }

        if (
          url.includes('/admin/api/2023-10/products/1111111111/metafields.json') &&
          !url.includes('?namespace=')
        ) {
          const body = JSON.parse(init.body as string);
          recordedMetafieldUpserts.push({ url, body });
          return {
            ok: true,
            json: async () => ({ metafield: { id: 999 } }),
            text: async () => '',
          };
        }

        throw new Error(`Unexpected fetch URL in metafields sync test: ${url}`);
      },
    );

    const configServiceStub = {
      get: (key: string) => {
        if (key === 'SHOPIFY_API_KEY') return 'test-api-key';
        if (key === 'SHOPIFY_API_SECRET') return 'test-api-secret';
        if (key === 'SHOPIFY_APP_URL') return 'https://api.example.com';
        if (key === 'SHOPIFY_SCOPES') return 'read_products,write_products';
        return undefined;
      },
    } as any;

    const automationServiceStub = {
      runNewProductSeoTitleAutomation: jest.fn(),
      triggerAnswerBlockAutomationForProduct: jest.fn(),
    } as any;

    const shopifyService = new ShopifyService(
      testPrisma as any,
      configServiceStub,
      automationServiceStub,
    );

    await shopifyService.ensureMetafieldDefinitions(project.id);
    const result = await shopifyService.syncAnswerBlocksToShopify(product.id);

    expect(recordedDefinitionKeys).toContain('answer_what_is_it');
    expect(result.productId).toBe(product.id);
    expect(result.syncedCount).toBeGreaterThanOrEqual(1);
    expect(result.errors).toEqual([]);

    expect(recordedMetafieldUpserts.length).toBe(1);
    const upsert = recordedMetafieldUpserts[0];
    expect(upsert.url).toContain(
      '/admin/api/2023-10/products/1111111111/metafields.json',
    );
    expect(upsert.body.metafield.namespace).toBe('engineo');
    expect(upsert.body.metafield.type).toBe('multi_line_text_field');
    expect(upsert.body.metafield.key).toBe('answer_what_is_it');
    expect(upsert.body.metafield.value).toBe(
      'This is a metafield-sync test answer.',
    );
  });
});
