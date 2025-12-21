/**
 * Unit tests for AutomationService
 *
 * Tests:
 * - scheduleSuggestionsForProject() schedules suggestions when enabled
 * - scheduleSuggestionsForProject() skips when disabled
 * - scheduleSuggestionsForProject() respects daily cap
 * - scheduleSuggestionsForProject() respects plan limits
 */
import { AutomationService } from '../../../src/projects/automation.service';
import { PrismaService } from '../../../src/prisma.service';
import { AiService } from '../../../src/ai/ai.service';
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { ShopifyService } from '../../../src/shopify/shopify.service';
import { AutomationTargetType, AutomationIssueType } from '@prisma/client';

// Mock queues module
jest.mock('../../../src/queues/queues', () => ({
  answerBlockAutomationQueue: null,
}));

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  crawlResult: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  automationSuggestion: {
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  answerBlockAutomationLog: {
    create: jest.fn(),
  },
});

const createAiServiceMock = () => ({
  generateMetadata: jest.fn(),
});

const createEntitlementsServiceMock = () => ({
  getEntitlementsSummary: jest.fn(),
  canAutoApplyMetadataAutomations: jest.fn(),
  ensureWithinDailyAiLimit: jest.fn(),
  recordAiUsage: jest.fn(),
  getUserPlan: jest.fn(),
});

const createShopifyServiceMock = () => ({});

describe('AutomationService', () => {
  let service: AutomationService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let aiServiceMock: ReturnType<typeof createAiServiceMock>;
  let entitlementsServiceMock: ReturnType<typeof createEntitlementsServiceMock>;
  let shopifyServiceMock: ReturnType<typeof createShopifyServiceMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    aiServiceMock = createAiServiceMock();
    entitlementsServiceMock = createEntitlementsServiceMock();
    shopifyServiceMock = createShopifyServiceMock();

    service = new AutomationService(
      prismaMock as unknown as PrismaService,
      aiServiceMock as unknown as AiService,
      entitlementsServiceMock as unknown as EntitlementsService,
      shopifyServiceMock as unknown as ShopifyService,
    );

    jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleSuggestionsForProject', () => {
    it('should skip when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await service.scheduleSuggestionsForProject('proj-1');

      expect(prismaMock.automationSuggestion.count).not.toHaveBeenCalled();
    });

    it('should skip when automation is disabled', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: false,
        autoSuggestThinContent: false,
        autoSuggestDailyCap: 50,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      await service.scheduleSuggestionsForProject('proj-1');

      expect(prismaMock.automationSuggestion.count).not.toHaveBeenCalled();
    });

    it('should skip when daily cap is reached', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: true,
        autoSuggestThinContent: false,
        autoSuggestDailyCap: 50,
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          automationSuggestionsPerDay: 100,
        },
        usage: {},
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(50); // At cap

      await service.scheduleSuggestionsForProject('proj-1');

      expect(prismaMock.automationSuggestion.findMany).not.toHaveBeenCalled();
    });

    it('should generate suggestions when enabled and within cap', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: true,
        autoSuggestThinContent: false,
        autoSuggestDailyCap: 50,
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          automationSuggestionsPerDay: 100,
        },
        usage: {},
      };

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: null,
          seoDescription: null,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(0); // No suggestions today
      prismaMock.automationSuggestion.findMany.mockResolvedValue([]); // No existing suggestions
      // Mock product.findMany for missing metadata check
      prismaMock.product.findMany.mockResolvedValueOnce(mockProducts); // For missing metadata
      prismaMock.crawlResult.findMany.mockResolvedValueOnce([]); // No pages with missing metadata
      prismaMock.product.findMany.mockResolvedValueOnce([]); // For thin content (not enabled)
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: 'Generated Title',
        description: 'Generated Description',
      });
      prismaMock.automationSuggestion.upsert.mockResolvedValue({
        id: 'suggestion-1',
        projectId: 'proj-1',
        targetType: AutomationTargetType.PRODUCT,
        targetId: 'prod-1',
        issueType: AutomationIssueType.MISSING_METADATA,
        suggestedTitle: 'Generated Title',
        suggestedDescription: 'Generated Description',
      });
      entitlementsServiceMock.canAutoApplyMetadataAutomations.mockResolvedValue(false);
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        seoTitle: null,
        seoDescription: null,
        externalId: 'ext-1',
        title: 'Product 1',
        description: 'Description',
      });

      await service.scheduleSuggestionsForProject('proj-1');

      expect(prismaMock.product.findMany).toHaveBeenCalled();
      // generateMetadata is called inside createProductSuggestion
      expect(aiServiceMock.generateMetadata).toHaveBeenCalled();
      expect(prismaMock.automationSuggestion.upsert).toHaveBeenCalled();
    });

    it('should respect plan limits when lower than project cap', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: true,
        autoSuggestThinContent: false,
        autoSuggestDailyCap: 100,
      };

      const mockEntitlements = {
        plan: 'free',
        limits: {
          automationSuggestionsPerDay: 5, // Lower than project cap
        },
        usage: {},
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(5); // At plan limit

      await service.scheduleSuggestionsForProject('proj-1');

      expect(prismaMock.automationSuggestion.findMany).not.toHaveBeenCalled();
    });
  });

  describe('runNewProductSeoTitleAutomation', () => {
    it('should skip when daily AI limit is reached', async () => {
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockRejectedValueOnce(
        new Error('Daily limit reached'),
      );

      await service.runNewProductSeoTitleAutomation('proj-1', 'prod-1', 'user-1');

      expect(prismaMock.product.findUnique).not.toHaveBeenCalled();
    });

    it('should skip when product not found', async () => {
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockResolvedValueOnce(undefined);
      prismaMock.product.findUnique.mockResolvedValue(null);

      await service.runNewProductSeoTitleAutomation('proj-1', 'prod-1', 'user-1');

      expect(aiServiceMock.generateMetadata).not.toHaveBeenCalled();
    });

    it('should skip when SEO fields already populated', async () => {
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockResolvedValueOnce(undefined);
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        seoTitle: 'Existing Title',
        seoDescription: 'Existing Description',
        title: 'Product Title',
        description: 'Product Description',
        externalId: 'ext-1',
      });

      await service.runNewProductSeoTitleAutomation('proj-1', 'prod-1', 'user-1');

      expect(aiServiceMock.generateMetadata).not.toHaveBeenCalled();
    });

    it('should generate and apply metadata when auto-apply is enabled', async () => {
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockResolvedValueOnce(undefined);
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        projectId: 'proj-1',
        seoTitle: null,
        seoDescription: null,
        title: 'Product Title',
        description: 'Product Description',
        externalId: 'ext-1',
      });
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: 'Generated Title',
        description: 'Generated Description',
      });
      entitlementsServiceMock.canAutoApplyMetadataAutomations.mockResolvedValue(true);
      entitlementsServiceMock.recordAiUsage.mockResolvedValue(undefined);
      prismaMock.automationSuggestion.upsert.mockResolvedValue({
        id: 'suggestion-1',
        projectId: 'proj-1',
        targetType: AutomationTargetType.PRODUCT,
        targetId: 'prod-1',
        issueType: AutomationIssueType.MISSING_METADATA,
        suggestedTitle: 'Generated Title',
        suggestedDescription: 'Generated Description',
        applied: false,
      });
      prismaMock.product.update.mockResolvedValue({} as any);
      prismaMock.automationSuggestion.update.mockResolvedValue({} as any);

      await service.runNewProductSeoTitleAutomation('proj-1', 'prod-1', 'user-1');

      expect(aiServiceMock.generateMetadata).toHaveBeenCalled();
      expect(prismaMock.product.update).toHaveBeenCalled();
      expect(prismaMock.automationSuggestion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'suggestion-1' },
          data: { applied: true, appliedAt: expect.any(Date) },
        }),
      );
    });

    it('should create suggestion but not apply when auto-apply is disabled', async () => {
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockResolvedValueOnce(undefined);
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        projectId: 'proj-1',
        seoTitle: null,
        seoDescription: null,
        title: 'Product Title',
        description: 'Product Description',
        externalId: 'ext-1',
      });
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: 'Generated Title',
        description: 'Generated Description',
      });
      entitlementsServiceMock.canAutoApplyMetadataAutomations.mockResolvedValue(false);
      entitlementsServiceMock.recordAiUsage.mockResolvedValue(undefined);
      prismaMock.automationSuggestion.upsert.mockResolvedValue({
        id: 'suggestion-1',
        projectId: 'proj-1',
        targetType: AutomationTargetType.PRODUCT,
        targetId: 'prod-1',
        issueType: AutomationIssueType.MISSING_METADATA,
        suggestedTitle: 'Generated Title',
        suggestedDescription: 'Generated Description',
        applied: false,
      });

      await service.runNewProductSeoTitleAutomation('proj-1', 'prod-1', 'user-1');

      expect(aiServiceMock.generateMetadata).toHaveBeenCalled();
      expect(prismaMock.product.update).not.toHaveBeenCalled();
      expect(prismaMock.automationSuggestion.upsert).toHaveBeenCalled();
    });
  });

  describe('getSuggestionsForProject', () => {
    it('should return suggestions for project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockSuggestions = [
        {
          id: 'suggestion-1',
          projectId: 'proj-1',
          targetType: AutomationTargetType.PRODUCT,
          targetId: 'prod-1',
          issueType: AutomationIssueType.MISSING_METADATA,
          suggestedTitle: 'Title 1',
          suggestedDescription: 'Description 1',
          suggestedH1: null,
          generatedAt: new Date('2024-01-01'),
          source: 'automation_v1',
          applied: false,
          appliedAt: null,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.automationSuggestion.findMany.mockResolvedValue(mockSuggestions);

      const result = await service.getSuggestionsForProject('proj-1', 'user-1');

      expect(result.projectId).toBe('proj-1');
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].targetType).toBe('product');
      expect(result.suggestions[0].issueType).toBe('missing_metadata');
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        service.getSuggestionsForProject('proj-1', 'user-1'),
      ).rejects.toThrow('Project not found');
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'other-user',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        service.getSuggestionsForProject('proj-1', 'user-1'),
      ).rejects.toThrow('You do not have access to this project');
    });
  });

  describe('triggerAnswerBlockAutomationForProduct', () => {
    it('should skip for free plan', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        project: {
          userId: 'user-1',
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('free');
      prismaMock.answerBlockAutomationLog.create.mockResolvedValue({} as any);

      await service.triggerAnswerBlockAutomationForProduct('prod-1', 'user-1', 'product_synced');

      expect(prismaMock.answerBlockAutomationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'skipped',
            action: 'skip_plan_free',
            planId: 'free',
          }),
        }),
      );
    });

    it('should throw ForbiddenException when user does not own product', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        project: {
          userId: 'other-user',
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);

      await expect(
        service.triggerAnswerBlockAutomationForProduct('prod-1', 'user-1', 'product_synced'),
      ).rejects.toThrow('You do not have access to this product');
    });

    it('should skip when product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await service.triggerAnswerBlockAutomationForProduct('prod-1', 'user-1', 'product_synced');

      expect(entitlementsServiceMock.getUserPlan).not.toHaveBeenCalled();
    });
  });

  describe('scheduleSuggestionsForProject - thin content suggestions', () => {
    it('should generate thin content suggestions for pages', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: false,
        autoSuggestThinContent: true,
        autoSuggestDailyCap: 50,
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          automationSuggestionsPerDay: 100,
        },
        usage: {},
      };

      const mockPages = [
        {
          id: 'page-1',
          projectId: 'proj-1',
          wordCount: 50, // Thin content
        },
        {
          id: 'page-2',
          projectId: 'proj-1',
          wordCount: 100, // Thin content
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(0);
      prismaMock.automationSuggestion.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValueOnce([]); // For missing metadata (disabled)
      prismaMock.crawlResult.findMany.mockResolvedValueOnce(mockPages); // For thin content
      prismaMock.product.findMany.mockResolvedValueOnce([]); // For thin products
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: 'Generated Title',
        description: 'Generated Description',
      });
      prismaMock.automationSuggestion.upsert.mockResolvedValue({
        id: 'suggestion-1',
        projectId: 'proj-1',
        targetType: AutomationTargetType.PAGE,
        targetId: 'page-1',
        issueType: AutomationIssueType.THIN_CONTENT,
        suggestedTitle: 'Generated Title',
        suggestedDescription: 'Generated Description',
      });
      prismaMock.crawlResult.findFirst.mockResolvedValue({
        id: 'page-1',
        url: 'https://example.com/page1',
        title: null,
        metaDescription: null,
        h1: null,
      });
      entitlementsServiceMock.canAutoApplyMetadataAutomations.mockResolvedValue(false);

      await service.scheduleSuggestionsForProject('proj-1');

      expect(prismaMock.crawlResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
            wordCount: expect.objectContaining({ lt: 200 }),
          }),
        }),
      );
      expect(prismaMock.automationSuggestion.upsert).toHaveBeenCalled();
    });

    it('should generate thin content suggestions for products', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: false,
        autoSuggestThinContent: true,
        autoSuggestDailyCap: 50,
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          automationSuggestionsPerDay: 100,
        },
        usage: {},
      };

      // Create a description with exactly 15 words (definitely < 80)
      const thinDescription = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
      const mockProducts = [
        {
          id: 'prod-1',
          description: thinDescription,
          seoDescription: null,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(0);
      prismaMock.automationSuggestion.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValueOnce([]); // For missing metadata (disabled)
      prismaMock.crawlResult.findMany.mockResolvedValueOnce([]); // No thin pages
      prismaMock.product.findMany.mockResolvedValueOnce(mockProducts); // For thin products
      // Mock findUnique for createProductSuggestion (called inside generateThinContentSuggestions)
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        seoTitle: 'Title',
        seoDescription: null,
        externalId: 'ext-1',
        title: 'Product 1',
        description: thinDescription,
      });
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: 'Generated Title',
        description: 'Generated Description',
      });
      prismaMock.automationSuggestion.upsert.mockResolvedValue({
        id: 'suggestion-1',
        projectId: 'proj-1',
        targetType: AutomationTargetType.PRODUCT,
        targetId: 'prod-1',
        issueType: AutomationIssueType.THIN_CONTENT,
        suggestedTitle: 'Generated Title',
        suggestedDescription: 'Generated Description',
      });
      entitlementsServiceMock.canAutoApplyMetadataAutomations.mockResolvedValue(false);

      await service.scheduleSuggestionsForProject('proj-1');

      // When autoSuggestMissingMetadata is false, product.findMany is only called once for thin content
      expect(prismaMock.product.findMany).toHaveBeenCalledTimes(1);
      // Verify that thin content products are being queried
      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'proj-1' },
        }),
      );
    });

    it('should skip existing suggestions', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: true,
        autoSuggestThinContent: false,
        autoSuggestDailyCap: 50,
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          automationSuggestionsPerDay: 100,
        },
        usage: {},
      };

      const mockProducts = [
        {
          id: 'prod-1',
          seoTitle: null,
          seoDescription: null,
        },
      ];

      const existingSuggestions = [
        {
          targetType: AutomationTargetType.PRODUCT,
          targetId: 'prod-1',
          issueType: AutomationIssueType.MISSING_METADATA,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(0);
      prismaMock.automationSuggestion.findMany.mockResolvedValue(existingSuggestions);
      prismaMock.product.findMany.mockResolvedValueOnce(mockProducts);
      prismaMock.crawlResult.findMany.mockResolvedValueOnce([]);

      await service.scheduleSuggestionsForProject('proj-1');

      // Should not create duplicate suggestion
      expect(prismaMock.automationSuggestion.upsert).not.toHaveBeenCalled();
    });

    it('should respect remaining slots when generating suggestions', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: true,
        autoSuggestThinContent: false,
        autoSuggestDailyCap: 50,
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          automationSuggestionsPerDay: 100,
        },
        usage: {},
      };

      const mockProducts = Array.from({ length: 10 }, (_, i) => ({
        id: `prod-${i + 1}`,
        seoTitle: null,
        seoDescription: null,
      }));

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(45); // 5 slots remaining
      prismaMock.automationSuggestion.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValueOnce(mockProducts);
      prismaMock.crawlResult.findMany.mockResolvedValueOnce([]);
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: 'Generated Title',
        description: 'Generated Description',
      });
      prismaMock.automationSuggestion.upsert.mockResolvedValue({
        id: 'suggestion-1',
        projectId: 'proj-1',
        targetType: AutomationTargetType.PRODUCT,
        targetId: 'prod-1',
        issueType: AutomationIssueType.MISSING_METADATA,
        suggestedTitle: 'Generated Title',
        suggestedDescription: 'Generated Description',
      });
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        seoTitle: null,
        seoDescription: null,
        externalId: 'ext-1',
        title: 'Product 1',
        description: 'Description',
      });
      entitlementsServiceMock.canAutoApplyMetadataAutomations.mockResolvedValue(false);

      await service.scheduleSuggestionsForProject('proj-1');

      // Should only create up to remaining slots (5)
      expect(prismaMock.automationSuggestion.upsert).toHaveBeenCalledTimes(5);
    });
  });

  describe('createProductSuggestion edge cases', () => {
    it('should handle auto-apply when only title is missing', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: true,
        autoSuggestThinContent: false,
        autoSuggestDailyCap: 50,
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          automationSuggestionsPerDay: 100,
        },
        usage: {},
      };

      const mockProducts = [
        {
          id: 'prod-1',
          seoTitle: null, // Missing title
          seoDescription: 'Existing Description', // Has description
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(0);
      prismaMock.automationSuggestion.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValueOnce(mockProducts);
      prismaMock.crawlResult.findMany.mockResolvedValueOnce([]);
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: 'Generated Title',
        description: 'Generated Description',
      });
      prismaMock.automationSuggestion.upsert.mockResolvedValue({
        id: 'suggestion-1',
        projectId: 'proj-1',
        targetType: AutomationTargetType.PRODUCT,
        targetId: 'prod-1',
        issueType: AutomationIssueType.MISSING_METADATA,
        suggestedTitle: 'Generated Title',
        suggestedDescription: 'Generated Description',
        applied: false,
      });
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        seoTitle: null,
        seoDescription: 'Existing Description',
        externalId: 'ext-1',
        title: 'Product 1',
        description: 'Description',
      });
      entitlementsServiceMock.canAutoApplyMetadataAutomations.mockResolvedValue(true);
      prismaMock.product.update.mockResolvedValue({} as any);
      prismaMock.automationSuggestion.update.mockResolvedValue({} as any);

      await service.scheduleSuggestionsForProject('proj-1');

      expect(prismaMock.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({
            seoTitle: 'Generated Title',
          }),
        }),
      );
    });

    it('should handle auto-apply when only description is missing', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: true,
        autoSuggestThinContent: false,
        autoSuggestDailyCap: 50,
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          automationSuggestionsPerDay: 100,
        },
        usage: {},
      };

      const mockProducts = [
        {
          id: 'prod-1',
          seoTitle: 'Existing Title',
          seoDescription: null, // Missing description
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(0);
      prismaMock.automationSuggestion.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValueOnce(mockProducts);
      prismaMock.crawlResult.findMany.mockResolvedValueOnce([]);
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: 'Generated Title',
        description: 'Generated Description',
      });
      prismaMock.automationSuggestion.upsert.mockResolvedValue({
        id: 'suggestion-1',
        projectId: 'proj-1',
        targetType: AutomationTargetType.PRODUCT,
        targetId: 'prod-1',
        issueType: AutomationIssueType.MISSING_METADATA,
        suggestedTitle: 'Generated Title',
        suggestedDescription: 'Generated Description',
        applied: false,
      });
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        seoTitle: 'Existing Title',
        seoDescription: null,
        externalId: 'ext-1',
        title: 'Product 1',
        description: 'Description',
      });
      entitlementsServiceMock.canAutoApplyMetadataAutomations.mockResolvedValue(true);
      prismaMock.product.update.mockResolvedValue({} as any);
      prismaMock.automationSuggestion.update.mockResolvedValue({} as any);

      await service.scheduleSuggestionsForProject('proj-1');

      expect(prismaMock.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({
            seoDescription: 'Generated Description',
          }),
        }),
      );
    });

    it('should not auto-apply when suggestion is invalid', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        autoSuggestMissingMetadata: true,
        autoSuggestThinContent: false,
        autoSuggestDailyCap: 50,
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          automationSuggestionsPerDay: 100,
        },
        usage: {},
      };

      const mockProducts = [
        {
          id: 'prod-1',
          seoTitle: null,
          seoDescription: null,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(mockEntitlements);
      prismaMock.automationSuggestion.count.mockResolvedValue(0);
      prismaMock.automationSuggestion.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValueOnce(mockProducts);
      prismaMock.crawlResult.findMany.mockResolvedValueOnce([]);
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: '', // Invalid - empty title
        description: '', // Invalid - empty description
      });
      prismaMock.automationSuggestion.upsert.mockResolvedValue({
        id: 'suggestion-1',
        projectId: 'proj-1',
        targetType: AutomationTargetType.PRODUCT,
        targetId: 'prod-1',
        issueType: AutomationIssueType.MISSING_METADATA,
        suggestedTitle: '',
        suggestedDescription: '',
        applied: false,
      });
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        seoTitle: null,
        seoDescription: null,
        externalId: 'ext-1',
        title: 'Product 1',
        description: 'Description',
      });
      entitlementsServiceMock.canAutoApplyMetadataAutomations.mockResolvedValue(true);

      await service.scheduleSuggestionsForProject('proj-1');

      // Should not auto-apply when suggestions are invalid
      expect(prismaMock.product.update).not.toHaveBeenCalled();
    });
  });
});

