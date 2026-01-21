/**
 * Unit tests for ProductIssueFixService
 *
 * Tests:
 * - fixMissingSeoFieldFromIssue() fixes missing SEO title
 * - fixMissingSeoFieldFromIssue() fixes missing SEO description
 * - fixMissingSeoFieldFromIssue() enforces plan restrictions
 * - fixMissingSeoFieldFromIssue() enforces daily AI limits
 * - fixMissingSeoFieldFromIssue() handles already has value case
 * - fixMissingSeoFieldFromIssue() handles no suggestion from AI
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ProductIssueFixService } from '../../../src/ai/product-issue-fix.service';
import { PrismaService } from '../../../src/prisma.service';
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { AiService } from '../../../src/ai/ai.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

const createPrismaMock = () => ({
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});

const createEntitlementsServiceMock = () => ({
  getUserPlan: jest.fn(),
  ensureWithinDailyAiLimit: jest.fn(),
  recordAiUsage: jest.fn(),
});

const createAiServiceMock = () => ({
  generateMetadata: jest.fn(),
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  assertOwnerRole: jest.fn().mockResolvedValue(undefined),
  hasProjectAccess: jest.fn().mockResolvedValue(true),
  isMultiUserProject: jest.fn().mockResolvedValue(false),
});

describe('ProductIssueFixService', () => {
  let service: ProductIssueFixService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let entitlementsServiceMock: ReturnType<typeof createEntitlementsServiceMock>;
  let aiServiceMock: ReturnType<typeof createAiServiceMock>;
  let roleResolutionServiceMock: ReturnType<
    typeof createRoleResolutionServiceMock
  >;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    entitlementsServiceMock = createEntitlementsServiceMock();
    aiServiceMock = createAiServiceMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductIssueFixService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EntitlementsService, useValue: entitlementsServiceMock },
        { provide: AiService, useValue: aiServiceMock },
        { provide: RoleResolutionService, useValue: roleResolutionServiceMock },
      ],
    }).compile();

    service = module.get<ProductIssueFixService>(ProductIssueFixService);
    consoleLogSpy = jest
      .spyOn(global.console, 'log')
      .mockImplementation(() => {});
    consoleErrorSpy = jest
      .spyOn(global.console, 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (consoleLogSpy) consoleLogSpy.mockRestore();
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  });

  describe('fixMissingSeoFieldFromIssue', () => {
    it('should fix missing SEO title', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const issueType = 'missing_seo_title';

      const mockProduct = {
        id: productId,
        projectId,
        title: 'Product Title',
        description: 'Product Description',
        seoTitle: null,
        seoDescription: 'Existing description',
        project: {
          id: projectId,
          userId,
        },
      };

      const aiMetadata = {
        title: 'AI Generated SEO Title',
        description: 'AI Generated Description',
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockResolvedValue({
        planId: 'pro',
        limit: 100,
        dailyCount: 10,
      });
      aiServiceMock.generateMetadata.mockResolvedValue(aiMetadata);
      entitlementsServiceMock.recordAiUsage.mockResolvedValue(undefined);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        seoTitle: aiMetadata.title,
      } as any);

      const result = await service.fixMissingSeoFieldFromIssue({
        userId,
        productId,
        issueType,
      });

      expect(result.productId).toBe(productId);
      expect(result.projectId).toBe(projectId);
      expect(result.issueType).toBe(issueType);
      expect(result.updated).toBe(true);
      expect(result.field).toBe('seoTitle');
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { seoTitle: aiMetadata.title },
      });
      expect(entitlementsServiceMock.recordAiUsage).toHaveBeenCalledWith(
        userId,
        projectId,
        'product_optimize'
      );
    });

    it('should fix missing SEO description', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const issueType = 'missing_seo_description';

      const mockProduct = {
        id: productId,
        projectId,
        title: 'Product Title',
        description: 'Product Description',
        seoTitle: 'Existing title',
        seoDescription: null,
        project: {
          id: projectId,
          userId,
        },
      };

      const aiMetadata = {
        title: 'AI Generated SEO Title',
        description: 'AI Generated SEO Description',
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockResolvedValue({
        planId: 'pro',
        limit: 100,
        dailyCount: 10,
      });
      aiServiceMock.generateMetadata.mockResolvedValue(aiMetadata);
      entitlementsServiceMock.recordAiUsage.mockResolvedValue(undefined);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        seoDescription: aiMetadata.description,
      } as any);

      const result = await service.fixMissingSeoFieldFromIssue({
        userId,
        productId,
        issueType,
      });

      expect(result.updated).toBe(true);
      expect(result.field).toBe('seoDescription');
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { seoDescription: aiMetadata.description },
      });
    });

    it('should throw BadRequestException for unsupported issue type', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';

      await expect(
        service.fixMissingSeoFieldFromIssue({
          userId,
          productId,
          issueType: 'unsupported_type' as any,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when product not found', async () => {
      const userId = 'user-1';
      const productId = 'non-existent';
      const issueType = 'missing_seo_title';

      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        service.fixMissingSeoFieldFromIssue({
          userId,
          productId,
          issueType,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own product', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';
      const issueType = 'missing_seo_title';

      const mockProduct = {
        id: productId,
        projectId: 'proj-1',
        project: {
          id: 'proj-1',
          userId: 'other-user',
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      roleResolutionServiceMock.assertOwnerRole.mockRejectedValue(
        new ForbiddenException('You do not have access to this project')
      );

      await expect(
        service.fixMissingSeoFieldFromIssue({
          userId,
          productId,
          issueType,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for free plan', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const issueType = 'missing_seo_title';

      const mockProduct = {
        id: productId,
        projectId,
        seoTitle: null,
        project: {
          id: projectId,
          userId,
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('free');

      await expect(
        service.fixMissingSeoFieldFromIssue({
          userId,
          productId,
          issueType,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw HttpException when daily AI limit reached', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const issueType = 'missing_seo_title';

      const mockProduct = {
        id: productId,
        projectId,
        seoTitle: null,
        project: {
          id: projectId,
          userId,
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockRejectedValue(
        new HttpException(
          {
            message: 'Daily AI limit reached',
            error: 'AI_DAILY_LIMIT_REACHED',
            code: 'AI_DAILY_LIMIT_REACHED',
          },
          HttpStatus.TOO_MANY_REQUESTS
        )
      );

      await expect(
        service.fixMissingSeoFieldFromIssue({
          userId,
          productId,
          issueType,
        })
      ).rejects.toThrow(HttpException);
    });

    it('should return not updated when field already has value', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const issueType = 'missing_seo_title';

      const mockProduct = {
        id: productId,
        projectId,
        seoTitle: 'Already has title',
        project: {
          id: projectId,
          userId,
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');

      const result = await service.fixMissingSeoFieldFromIssue({
        userId,
        productId,
        issueType,
      });

      expect(result.updated).toBe(false);
      expect(result.reason).toBe('already_has_value');
      expect(aiServiceMock.generateMetadata).not.toHaveBeenCalled();
    });

    it('should return not updated when AI provides no suggestion', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const issueType = 'missing_seo_title';

      const mockProduct = {
        id: productId,
        projectId,
        title: 'Product Title',
        description: 'Product Description',
        seoTitle: null,
        project: {
          id: projectId,
          userId,
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockResolvedValue({
        planId: 'pro',
        limit: 100,
        dailyCount: 10,
      });
      aiServiceMock.generateMetadata.mockResolvedValue({
        title: '', // Empty title
        description: 'AI Generated Description',
      });
      entitlementsServiceMock.recordAiUsage.mockResolvedValue(undefined);

      const result = await service.fixMissingSeoFieldFromIssue({
        userId,
        productId,
        issueType,
      });

      expect(result.updated).toBe(false);
      expect(result.reason).toBe('no_suggestion');
      expect(prismaMock.product.update).not.toHaveBeenCalled();
    });

    it('should record AI usage even if AI call fails', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const issueType = 'missing_seo_title';

      const mockProduct = {
        id: productId,
        projectId,
        title: 'Product Title',
        description: 'Product Description',
        seoTitle: null,
        project: {
          id: projectId,
          userId,
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockResolvedValue({
        planId: 'pro',
        limit: 100,
        dailyCount: 10,
      });
      aiServiceMock.generateMetadata.mockRejectedValue(
        new Error('AI service error')
      );
      entitlementsServiceMock.recordAiUsage.mockResolvedValue(undefined);

      await expect(
        service.fixMissingSeoFieldFromIssue({
          userId,
          productId,
          issueType,
        })
      ).rejects.toThrow();

      // Should record usage even after error
      expect(entitlementsServiceMock.recordAiUsage).toHaveBeenCalledWith(
        userId,
        projectId,
        'product_optimize'
      );
    });

    it('should handle empty string as missing value', async () => {
      const userId = 'user-1';
      const productId = 'prod-1';
      const projectId = 'proj-1';
      const issueType = 'missing_seo_title';

      const mockProduct = {
        id: productId,
        projectId,
        title: 'Product Title',
        description: 'Product Description',
        seoTitle: '   ', // Only whitespace
        project: {
          id: projectId,
          userId,
        },
      };

      const aiMetadata = {
        title: 'AI Generated SEO Title',
        description: 'AI Generated Description',
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      entitlementsServiceMock.ensureWithinDailyAiLimit.mockResolvedValue({
        planId: 'pro',
        limit: 100,
        dailyCount: 10,
      });
      aiServiceMock.generateMetadata.mockResolvedValue(aiMetadata);
      entitlementsServiceMock.recordAiUsage.mockResolvedValue(undefined);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        seoTitle: aiMetadata.title,
      } as any);

      const result = await service.fixMissingSeoFieldFromIssue({
        userId,
        productId,
        issueType,
      });

      expect(result.updated).toBe(true);
      expect(prismaMock.product.update).toHaveBeenCalled();
    });
  });
});
