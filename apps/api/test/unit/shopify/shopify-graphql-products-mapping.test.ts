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
    (global as any).fetch = jest.fn(async (_url: string, init: any) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      if (body.operationName === 'GetProducts') {
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
                      id: 'gid://shopify/Product/123',
                      title: 'Test Product',
                      handle: 'test-product',
                      descriptionHtml: '<p>Test description</p>',
                      status: 'ACTIVE',
                      productType: 'Accessories',
                      vendor: 'Test Vendor',
                      seo: {
                        title: 'SEO Title',
                        description: 'SEO Description',
                      },
                      images: {
                        edges: [
                          {
                            node: {
                              id: 'gid://shopify/ProductImage/1',
                              altText: 'Alt text',
                              url: 'https://example.com/image.jpg',
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
                              price: '19.99',
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
      throw new Error(`Unexpected GraphQL operation: ${body.operationName}`);
    });

    const prismaStub: any = {};
    const configStub: any = { get: () => undefined };
    const automationStub: any = {};

    const shopifyService = new ShopifyService(
      prismaStub,
      configStub,
      automationStub,
    );

    const products = await (shopifyService as any).fetchShopifyProducts(
      'test-store.myshopify.com',
      'test-token',
    );

    expect(products).toHaveLength(1);
    const product = products[0];
    expect(product.id).toBe(123);
    expect(product.title).toBe('Test Product');
    expect(product.body_html).toBe('<p>Test description</p>');
    expect(product.handle).toBe('test-product');
    expect(product.metafields_global_title_tag).toBe('SEO Title');
    expect(product.metafields_global_description_tag).toBe('SEO Description');
    expect(product.images).toEqual([
      {
        id: 'gid://shopify/ProductImage/1',
        src: 'https://example.com/image.jpg',
        altText: 'Alt text',
        position: 0,
      },
    ]);
  });
});
