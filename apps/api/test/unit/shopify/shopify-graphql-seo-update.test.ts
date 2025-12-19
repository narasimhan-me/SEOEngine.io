// Unit tests for ShopifyService.updateProductSeo GraphQL mutation behavior.
// Verifies mutation payload construction and user error handling for product SEO updates.

import { BadRequestException } from '@nestjs/common';
import { ShopifyService } from '../../../src/shopify/shopify.service';

describe('ShopifyService.updateProductSeo (GraphQL productUpdate)', () => {
  let originalFetch: any;

  beforeAll(() => {
    originalFetch = (global as any).fetch;
  });

  afterAll(() => {
    (global as any).fetch = originalFetch;
  });

  function createServiceWithPrismaStub() {
    const prismaStub: any = {
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'local-product-id',
          externalId: '1111111111',
          projectId: 'project-1',
          project: {
            id: 'project-1',
            userId: 'user-1',
          },
        }),
        update: jest.fn().mockResolvedValue(null),
      },
      integration: {
        findUnique: jest.fn().mockResolvedValue({
          projectId: 'project-1',
          type: 'SHOPIFY',
          externalId: 'test-store.myshopify.com',
          accessToken: 'test-token',
        }),
      },
    };
    const configStub: any = { get: () => undefined };
    const automationStub: any = {};

    return {
      service: new ShopifyService(prismaStub, configStub, automationStub),
      prismaStub,
    };
  }

  it('builds and sends a productUpdate mutation successfully', async () => {
    let lastRequestBody: any = null;

    (global as any).fetch = jest.fn(async (_url: string, init: any) => {
      lastRequestBody = JSON.parse((init?.body as string) ?? '{}');
      if (lastRequestBody.operationName === 'UpdateProductSeo') {
        return {
          ok: true,
          json: async () => ({
            data: {
              productUpdate: {
                product: {
                  id: 'gid://shopify/Product/1111111111',
                  seo: {
                    title: 'New Title',
                    description: 'New Description',
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
        `Unexpected GraphQL operation: ${lastRequestBody.operationName}`,
      );
    });

    const { service } = createServiceWithPrismaStub();

    await service.updateProductSeo(
      'local-product-id',
      'New Title',
      'New Description',
      'user-1',
    );

    expect(lastRequestBody.operationName).toBe('UpdateProductSeo');
    expect(lastRequestBody.variables.input.id).toBe(
      'gid://shopify/Product/1111111111',
    );
    expect(lastRequestBody.variables.input.seo.title).toBe('New Title');
    expect(lastRequestBody.variables.input.seo.description).toBe(
      'New Description',
    );
  });

  it('throws BadRequestException when productUpdate returns userErrors', async () => {
    (global as any).fetch = jest.fn(async (_url: string, init: any) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      if (body.operationName === 'UpdateProductSeo') {
        return {
          ok: true,
          json: async () => ({
            data: {
              productUpdate: {
                product: null,
                userErrors: [{ message: 'Title is too long' }],
              },
            },
          }),
          text: async () => '',
        };
      }
      throw new Error(`Unexpected GraphQL operation: ${body.operationName}`);
    });

    const { service } = createServiceWithPrismaStub();

    await expect(
      service.updateProductSeo(
        'local-product-id',
        'New Title',
        'New Description',
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
