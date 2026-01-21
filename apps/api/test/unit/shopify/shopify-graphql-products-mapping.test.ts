// Unit tests for ShopifyService.fetchShopifyProducts GraphQL mapping.
// Verifies that GraphQL product nodes are mapped into the internal ShopifyProduct DTO shape.

import { ShopifyService } from '../../../src/shopify/shopify.service';

describe('ShopifyService.fetchShopifyProducts (GraphQL mapping)', () => {
  let originalFetch: any;

  beforeAll(() => {
    originalFetch = (global as any).fetch;
  });

  afterAll(() => {
    (global as any).fetch = originalFetch;
  });

  it('maps GraphQL product nodes to ShopifyProduct DTOs', async () => {
    // In test mode, rateLimitedFetch uses e2eMockShopifyFetch which handles GetProducts
    // The e2e mock returns products with id 'gid://shopify/Product/1'
    const prismaStub: any = {};
    const configStub: any = { get: () => undefined };
    const automationStub: any = {};
    const roleResolutionStub: any = {
      assertProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertOwnerRole: jest.fn().mockResolvedValue(undefined),
      hasProjectAccess: jest.fn().mockResolvedValue(true),
      isMultiUserProject: jest.fn().mockResolvedValue(false),
    };

    const shopifyService = new ShopifyService(
      prismaStub,
      configStub,
      automationStub,
      roleResolutionStub
    );

    const products = await (shopifyService as any).fetchShopifyProducts(
      'test-store.myshopify.com',
      'test-token'
    );

    expect(products).toHaveLength(1); // e2e mock returns 1 product
    const product = products[0];
    // e2e mock returns 'gid://shopify/Product/1', so extracted ID is 1
    expect(product.id).toBe(1);
    expect(product.title).toBe('Test Product 1');
    expect(product.handle).toBe('test-product-1');
    expect(product.body_html).toBe('<p>Test description 1</p>');
    expect(product.metafields_global_title_tag).toBe('Test SEO Title 1');
    expect(product.metafields_global_description_tag).toBe(
      'Test SEO Description 1'
    );
    expect(product.images).toBeDefined();
    expect(Array.isArray(product.images)).toBe(true);
    expect(product.images).toHaveLength(0); // e2e mock returns empty images array
  });
});
