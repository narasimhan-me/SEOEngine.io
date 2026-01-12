/**
 * Unit tests for ShopifyService
 *
 * Tests:
 * - generateInstallUrl() generates OAuth URL with state
 * - validateHmac() validates HMAC signatures
 * - validateState() validates and retrieves projectId from state
 * - exchangeToken() exchanges authorization code for access token
 * - storeShopifyConnection() persists integration
 * - getShopifyIntegration() retrieves integration
 * - ensureMetafieldDefinitions() ensures metafield definitions exist
 * - syncAnswerBlocksToShopify() syncs answer blocks to Shopify metafields
 * - updateProductSeo() updates product SEO in Shopify
 * - validateProjectOwnership() validates project ownership
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ShopifyService, mapAnswerBlocksToMetafieldPayloads } from '../../../src/shopify/shopify.service';
import { PrismaService } from '../../../src/prisma.service';
import { AutomationService } from '../../../src/projects/automation.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { IntegrationType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

// Mock global fetch
(global as any).fetch = jest.fn();

const createPrismaMock = () => ({
  integration: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  answerBlock: {
    findMany: jest.fn(),
  },
  productImage: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
});

const createConfigMock = (env: Record<string, string> = {}) => ({
  get: jest.fn((key: string) => {
    const defaults: Record<string, string> = {
      SHOPIFY_API_KEY: 'test-api-key',
      SHOPIFY_API_SECRET: 'test-api-secret',
      SHOPIFY_APP_URL: 'https://app.example.com',
      SHOPIFY_SCOPES: 'read_products,write_products',
    };
    return env[key] ?? defaults[key];
  }),
});

const createAutomationServiceMock = () => ({
  runNewProductSeoTitleAutomation: jest.fn(),
  triggerAnswerBlockAutomationForProduct: jest.fn(),
});

describe('ShopifyService', () => {
  let service: ShopifyService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let configServiceMock: ReturnType<typeof createConfigMock>;
  let automationServiceMock: ReturnType<typeof createAutomationServiceMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    configServiceMock = createConfigMock();
    automationServiceMock = createAutomationServiceMock();

    // Ensure ENGINEO_E2E is not set so rateLimitedFetch uses fetch (not e2eMockShopifyFetch)
    delete process.env.ENGINEO_E2E;

    const roleResolutionServiceMock = {
      assertProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertOwnerRole: jest.fn().mockResolvedValue(undefined),
      hasProjectAccess: jest.fn().mockResolvedValue(true),
      isMultiUserProject: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: AutomationService, useValue: automationServiceMock },
        { provide: RoleResolutionService, useValue: roleResolutionServiceMock },
      ],
    }).compile();

    service = module.get<ShopifyService>(ShopifyService);
    // Don't set global.fetch here - let the service use e2eMockShopifyFetch in test mode
    // Tests that need to mock fetch should set it up individually
    jest.spyOn(global.console, 'log').mockImplementation(() => {});
    jest.spyOn(global.console, 'warn').mockImplementation(() => {});
    jest.spyOn(global.console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    const logSpy = global.console.log as jest.Mock;
    const warnSpy = global.console.warn as jest.Mock;
    const errorSpy = global.console.error as jest.Mock;
    if (logSpy?.mockRestore) logSpy.mockRestore();
    if (warnSpy?.mockRestore) warnSpy.mockRestore();
    if (errorSpy?.mockRestore) errorSpy.mockRestore();
  });

  describe('generateInstallUrl', () => {
    it('should generate OAuth URL with state and projectId', () => {
      const shop = 'test-shop.myshopify.com';
      const projectId = 'proj-1';

      const url = service.generateInstallUrl(shop, projectId);

      expect(url).toContain(`https://${shop}/admin/oauth/authorize`);
      expect(url).toContain('client_id=test-api-key');
      // URL encoding: comma becomes %2C
      expect(url).toContain('scope=read_products%2Cwrite_products');
      // URL encoding: slashes and colons are encoded
      expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.example.com%2Fshopify%2Fcallback');
      expect(url).toContain('state=');
    });

    it('should store state in stateStore', () => {
      const shop = 'test-shop.myshopify.com';
      const projectId = 'proj-1';

      const url = service.generateInstallUrl(shop, projectId);
      const urlObj = new URL(url);
      const state = urlObj.searchParams.get('state');

      expect(state).toBeTruthy();
      // State should be retrievable via validateState
      const retrievedProjectId = service.validateState(state!);
      expect(retrievedProjectId).toBe(projectId);
    });
  });

  describe('validateHmac', () => {
    it('should validate correct HMAC signature', () => {
      const query = {
        shop: 'test-shop.myshopify.com',
        code: 'auth-code',
        timestamp: '1234567890',
        hmac: '',
      };

      // Generate correct HMAC
      const sortedParams = Object.keys(query)
        .filter(key => key !== 'hmac')
        .sort()
        .map(key => `${key}=${query[key as keyof typeof query]}`)
        .join('&');
      const hash = crypto
        .createHmac('sha256', 'test-api-secret')
        .update(sortedParams)
        .digest('hex');
      query.hmac = hash;

      const isValid = service.validateHmac(query);
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC signature', () => {
      const query = {
        shop: 'test-shop.myshopify.com',
        code: 'auth-code',
        timestamp: '1234567890',
        hmac: 'invalid-hmac',
      };

      const isValid = service.validateHmac(query);
      expect(isValid).toBe(false);
    });

    it('should handle missing HMAC', () => {
      const query = {
        shop: 'test-shop.myshopify.com',
        code: 'auth-code',
        timestamp: '1234567890',
      };

      const isValid = service.validateHmac(query);
      expect(isValid).toBe(false);
    });
  });

  describe('validateState', () => {
    it('should return projectId for valid state', () => {
      const shop = 'test-shop.myshopify.com';
      const projectId = 'proj-1';

      const url = service.generateInstallUrl(shop, projectId);
      const urlObj = new URL(url);
      const state = urlObj.searchParams.get('state')!;

      const retrievedProjectId = service.validateState(state);
      expect(retrievedProjectId).toBe(projectId);
    });

    it('should return null for invalid state', () => {
      const result = service.validateState('invalid-state');
      expect(result).toBeNull();
    });

    it('should delete state after retrieval', () => {
      const shop = 'test-shop.myshopify.com';
      const projectId = 'proj-1';

      const url = service.generateInstallUrl(shop, projectId);
      const urlObj = new URL(url);
      const state = urlObj.searchParams.get('state')!;

      const firstRetrieval = service.validateState(state);
      expect(firstRetrieval).toBe(projectId);

      const secondRetrieval = service.validateState(state);
      expect(secondRetrieval).toBeNull();
    });
  });

  describe('exchangeToken', () => {
    it('should exchange authorization code for access token', async () => {
      const shop = 'test-shop.myshopify.com';
      const code = 'auth-code';
      const mockResponse = {
        access_token: 'access-token-123',
        scope: 'read_products,write_products',
      };

      // Ensure global.fetch is not a Jest mock for this test
      // Delete any existing mock to ensure e2e mock is used
      if ((global as any).fetch && (global as any).fetch._isMockFunction) {
        delete (global as any).fetch;
      }

      // In test mode, rateLimitedFetch uses e2eMockShopifyFetch which handles OAuth endpoint
      // The e2e mock returns the expected token response
      const result = await service.exchangeToken(shop, code);

      expect(result).toEqual(mockResponse);
      // Note: In test mode, global.fetch is not called because e2eMockShopifyFetch is used
    });

    it('should throw BadRequestException on failed token exchange', async () => {
      const shop = 'test-shop.myshopify.com';
      const code = 'invalid-code';

      // In test mode, we need to mock fetch as a Jest mock to test error handling
      // Set up a Jest mock that returns an error response
      (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(service.exchangeToken(shop, code)).rejects.toThrow(BadRequestException);
      
      // Clean up the mock
      (global.fetch as jest.Mock).mockClear();
    });
  });

  describe('storeShopifyConnection', () => {
    it('should create new integration', async () => {
      const projectId = 'proj-1';
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'access-token-123';
      const scope = 'read_products,write_products';

      const mockIntegration = {
        id: 'int-1',
        projectId,
        type: IntegrationType.SHOPIFY,
        externalId: shopDomain,
        accessToken,
        config: { scope, installedAt: expect.any(String) },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.integration.findUnique.mockResolvedValue(null);
      prismaMock.integration.upsert.mockResolvedValue(mockIntegration as any);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { metafieldDefinitions: { edges: [] } } }),
      });

      const result = await service.storeShopifyConnection(
        projectId,
        shopDomain,
        accessToken,
        scope,
      );

      expect(result).toEqual(mockIntegration);
      expect(prismaMock.integration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId_type: {
              projectId,
              type: IntegrationType.SHOPIFY,
            },
          },
          create: expect.objectContaining({
            projectId,
            type: IntegrationType.SHOPIFY,
            externalId: shopDomain,
            accessToken,
          }),
        }),
      );
    });

    it('should update existing integration', async () => {
      const projectId = 'proj-1';
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'new-access-token';
      const scope = 'read_products,write_products';

      const mockIntegration = {
        id: 'int-1',
        projectId,
        type: IntegrationType.SHOPIFY,
        externalId: shopDomain,
        accessToken,
        config: { scope, installedAt: expect.any(String) },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.integration.findUnique.mockResolvedValue({
        id: 'int-1',
        projectId,
        type: IntegrationType.SHOPIFY,
      } as any);
      prismaMock.integration.upsert.mockResolvedValue(mockIntegration as any);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { metafieldDefinitions: { edges: [] } } }),
      });

      const result = await service.storeShopifyConnection(
        projectId,
        shopDomain,
        accessToken,
        scope,
      );

      expect(result).toEqual(mockIntegration);
      expect(prismaMock.integration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            externalId: shopDomain,
            accessToken,
          }),
        }),
      );
    });
  });

  describe('getShopifyIntegration', () => {
    it('should return integration when it exists', async () => {
      const projectId = 'proj-1';
      const mockIntegration = {
        id: 'int-1',
        projectId,
        type: IntegrationType.SHOPIFY,
        externalId: 'test-shop.myshopify.com',
        accessToken: 'access-token',
      };

      prismaMock.integration.findUnique.mockResolvedValue(mockIntegration as any);

      const result = await service.getShopifyIntegration(projectId);

      expect(result).toEqual(mockIntegration);
      expect(prismaMock.integration.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_type: {
            projectId,
            type: IntegrationType.SHOPIFY,
          },
        },
      });
    });

    it('should return null when integration does not exist', async () => {
      const projectId = 'proj-1';

      prismaMock.integration.findUnique.mockResolvedValue(null);

      const result = await service.getShopifyIntegration(projectId);

      expect(result).toBeNull();
    });
  });

  describe('validateProjectOwnership', () => {
    it('should return true when user owns project', async () => {
      const projectId = 'proj-1';
      const userId = 'user-1';

      // Mock RoleResolutionService to return 'OWNER' for resolveEffectiveRole
      const roleResolutionServiceMock = {
        resolveEffectiveRole: jest.fn().mockResolvedValue('OWNER'),
      };
      // Replace the mock in the service
      (service as any).roleResolution = roleResolutionServiceMock;

      const result = await service.validateProjectOwnership(projectId, userId);

      expect(result).toBe(true);
      expect(roleResolutionServiceMock.resolveEffectiveRole).toHaveBeenCalledWith(projectId, userId);
    });

    it('should return false when user does not own project', async () => {
      const projectId = 'proj-1';
      const userId = 'user-1';

      // Mock RoleResolutionService to return 'EDITOR' (not OWNER) or throw
      const roleResolutionServiceMock = {
        resolveEffectiveRole: jest.fn().mockResolvedValue('EDITOR'),
      };
      // Replace the mock in the service
      (service as any).roleResolution = roleResolutionServiceMock;

      const result = await service.validateProjectOwnership(projectId, userId);

      expect(result).toBe(false);
      expect(roleResolutionServiceMock.resolveEffectiveRole).toHaveBeenCalledWith(projectId, userId);
    });
  });

  describe('mapAnswerBlocksToMetafieldPayloads', () => {
    it('should map answer blocks to metafield payloads', () => {
      const blocks = [
        { questionId: 'what_is_it', answerText: 'This is a product' },
        { questionId: 'who_is_it_for', answerText: 'For everyone' },
        { questionId: 'unknown_question', answerText: 'Should be skipped' },
      ];

      const result = mapAnswerBlocksToMetafieldPayloads(blocks);

      expect(result.mappings).toHaveLength(2);
      expect(result.mappings[0]).toEqual({
        key: 'answer_what_is_it',
        value: 'This is a product',
      });
      expect(result.mappings[1]).toEqual({
        key: 'answer_usage',
        value: 'For everyone',
      });
      expect(result.skippedUnknownQuestionIds).toEqual(['unknown_question']);
    });

    it('should skip empty answer text', () => {
      const blocks = [
        { questionId: 'what_is_it', answerText: '   ' },
        { questionId: 'who_is_it_for', answerText: 'Valid answer' },
      ];

      const result = mapAnswerBlocksToMetafieldPayloads(blocks);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].key).toBe('answer_usage');
    });
  });

  describe('syncAnswerBlocksToShopify', () => {
    it('should sync answer blocks to Shopify metafields', async () => {
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'access-token';

      const mockProduct = {
        id: productId,
        projectId,
        externalId: '123',
        project: { id: projectId },
      };

      const mockIntegration = {
        id: 'int-1',
        projectId,
        type: IntegrationType.SHOPIFY,
        externalId: shopDomain,
        accessToken,
      };

      const mockAnswerBlocks = [
        {
          id: 'block-1',
          productId,
          questionId: 'what_is_it',
          answerText: 'This is a product',
        },
        {
          id: 'block-2',
          productId,
          questionId: 'who_is_it_for',
          answerText: 'For everyone',
        },
      ];

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaMock.answerBlock.findMany.mockResolvedValue(mockAnswerBlocks as any);
      
      // Mock getShopifyIntegration calls:
      // 1. First call in syncAnswerBlocksToShopify (line 716)
      // 2. Second call in ensureMetafieldDefinitions (line 595)
      prismaMock.integration.findUnique
        .mockResolvedValueOnce(mockIntegration as any) // syncAnswerBlocksToShopify
        .mockResolvedValueOnce(mockIntegration as any); // ensureMetafieldDefinitions

      // Mock GraphQL calls via rateLimitedFetch -> fetch:
      // In test mode (NODE_ENV=test), rateLimitedFetch calls fetch directly (not e2eMockShopifyFetch)
      // 1. GetEngineoMetafieldDefinitions query (in ensureMetafieldDefinitionsForStore, line 482)
      // 2. SetEngineoMetafields mutation (in upsertMetafields, line 656)
      // Use a function-based mock similar to shopify-graphql-products-mapping.test.ts
      let callCount = 0;
      (global.fetch as jest.Mock) = jest.fn(async (_url: string, init: any) => {
        const body = JSON.parse((init?.body as string) ?? '{}');
        callCount++;
        
        if (body.operationName === 'GetEngineoMetafieldDefinitions' || callCount === 1) {
          return {
            ok: true,
            json: async () => ({
              data: { metafieldDefinitions: { edges: [] } },
            }),
            text: async () => '',
          };
        }
        
        if (body.operationName === 'SetEngineoMetafields' || callCount === 2) {
          return {
            ok: true,
            json: async () => ({
              data: {
                metafieldsSet: {
                  metafields: [{ id: 'meta-1', namespace: 'engineo', key: 'answer_what_is_it' }],
                  userErrors: [],
                },
              },
            }),
            text: async () => '',
          };
        }
        
        throw new Error(`Unexpected GraphQL operation: ${body.operationName}`);
      });

      const result = await service.syncAnswerBlocksToShopify(productId);

      expect(result.productId).toBe(productId);
      expect(result.shopDomain).toBe(shopDomain);
      expect(result.syncedCount).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when product not found', async () => {
      const productId = 'non-existent';

      prismaMock.product.findUnique.mockResolvedValue(null);

      const result = await service.syncAnswerBlocksToShopify(productId);

      expect(result.productId).toBe(productId);
      expect(result.shopDomain).toBeNull();
      expect(result.syncedCount).toBe(0);
      expect(result.errors).toContain('product_not_found');
      expect(result.skippedReason).toBe('product_not_found');
    });

    it('should return error when no Shopify integration', async () => {
      const productId = 'prod-1';
      const projectId = 'proj-1';

      const mockProduct = {
        id: productId,
        projectId,
        project: { id: projectId },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaMock.integration.findUnique.mockResolvedValue(null);

      const result = await service.syncAnswerBlocksToShopify(productId);

      expect(result.productId).toBe(productId);
      expect(result.shopDomain).toBeNull();
      expect(result.syncedCount).toBe(0);
      expect(result.errors).toContain('no_shopify_integration');
      expect(result.skippedReason).toBe('no_shopify_integration');
    });

    it('should return skipped when no answer blocks', async () => {
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'access-token';

      const mockProduct = {
        id: productId,
        projectId,
        project: { id: projectId },
      };

      const mockIntegration = {
        id: 'int-1',
        projectId,
        type: IntegrationType.SHOPIFY,
        externalId: shopDomain,
        accessToken,
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaMock.integration.findUnique.mockResolvedValue(mockIntegration as any);
      prismaMock.answerBlock.findMany.mockResolvedValue([]);

      const result = await service.syncAnswerBlocksToShopify(productId);

      expect(result.productId).toBe(productId);
      expect(result.shopDomain).toBe(shopDomain);
      expect(result.syncedCount).toBe(0);
      expect(result.skippedReason).toBe('no_answer_blocks');
    });
  });

  describe('updateProductSeo', () => {
    it('should update product SEO in Shopify and local database', async () => {
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const userId = 'user-1';
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'access-token';
      const seoTitle = 'New SEO Title';
      const seoDescription = 'New SEO Description';

      const mockProduct = {
        id: productId,
        projectId,
        externalId: '123',
        project: {
          id: projectId,
          userId,
        },
      };

      const mockIntegration = {
        id: 'int-1',
        projectId,
        type: IntegrationType.SHOPIFY,
        externalId: shopDomain,
        accessToken,
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaMock.integration.findUnique.mockResolvedValue(mockIntegration as any);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        seoTitle,
        seoDescription,
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            productUpdate: {
              product: {
                id: 'gid://shopify/Product/123',
                seo: { title: seoTitle, description: seoDescription },
              },
              userErrors: [],
            },
          },
        }),
      });

      const result = await service.updateProductSeo(productId, seoTitle, seoDescription, userId);

      expect(result.productId).toBe(productId);
      expect(result.shopDomain).toBe(shopDomain);
      expect(result.seoTitle).toBe(seoTitle);
      expect(result.seoDescription).toBe(seoDescription);
      expect(prismaMock.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: productId },
          data: {
            seoTitle,
            seoDescription,
            lastSyncedAt: expect.any(Date),
          },
        }),
      );
    });

    it('should throw BadRequestException when product not found', async () => {
      const productId = 'non-existent';
      const userId = 'user-1';

      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProductSeo(productId, 'Title', 'Description', userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user does not own product', async () => {
      const productId = 'prod-1';
      const userId = 'user-1';

      const mockProduct = {
        id: productId,
        projectId: 'proj-1',
        project: {
          id: 'proj-1',
          userId: 'other-user',
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);

      await expect(
        service.updateProductSeo(productId, 'Title', 'Description', userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no Shopify integration', async () => {
      const productId = 'prod-1';
      const userId = 'user-1';

      const mockProduct = {
        id: productId,
        projectId: 'proj-1',
        project: {
          id: 'proj-1',
          userId,
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaMock.integration.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProductSeo(productId, 'Title', 'Description', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

