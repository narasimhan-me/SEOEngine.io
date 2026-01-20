/**
 * Unit tests for AutomationPlaybooksService
 *
 * Tests:
 * - estimatePlaybook() estimates costs and eligibility
 * - previewPlaybook() generates preview with AI
 * - applyPlaybook() applies draft to products
 * - getLatestDraft() retrieves latest draft
 * - generateDraft() generates full draft
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  AutomationPlaybooksService,
  AutomationPlaybookId,
  PlaybookRulesV1,
} from '../../../src/projects/automation-playbooks.service';
import { PrismaService } from '../../../src/prisma.service';
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { TokenUsageService } from '../../../src/ai/token-usage.service';
import { AiService } from '../../../src/ai/ai.service';
import { AiUsageQuotaService } from '../../../src/ai/ai-usage-quota.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ESTIMATED_METADATA_TOKENS_PER_CALL } from '../../../src/ai/token-usage.service';

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  automationPlaybookDraft: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
});

const createEntitlementsServiceMock = () => ({
  getAiSuggestionLimit: jest.fn(),
  getDailyAiUsage: jest.fn(),
  getUserPlan: jest.fn(),
});

const createTokenUsageServiceMock = () => ({
  log: jest.fn(),
});

const createAiServiceMock = () => ({
  generateMetadata: jest.fn(),
});

const createAiUsageQuotaServiceMock = () => ({
  evaluateQuotaForAction: jest.fn(),
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  assertOwnerRole: jest.fn().mockResolvedValue(undefined),
  assertCanGenerateDrafts: jest.fn().mockResolvedValue(undefined),
  hasProjectAccess: jest.fn().mockResolvedValue(true),
  isMultiUserProject: jest.fn().mockResolvedValue(false),
  resolveEffectiveRole: jest.fn().mockResolvedValue('OWNER'),
});

describe('AutomationPlaybooksService', () => {
  let service: AutomationPlaybooksService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let entitlementsServiceMock: ReturnType<typeof createEntitlementsServiceMock>;
  let tokenUsageServiceMock: ReturnType<typeof createTokenUsageServiceMock>;
  let aiServiceMock: ReturnType<typeof createAiServiceMock>;
  let aiUsageQuotaServiceMock: ReturnType<typeof createAiUsageQuotaServiceMock>;
  let roleResolutionServiceMock: ReturnType<
    typeof createRoleResolutionServiceMock
  >;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    entitlementsServiceMock = createEntitlementsServiceMock();
    tokenUsageServiceMock = createTokenUsageServiceMock();
    aiServiceMock = createAiServiceMock();
    aiUsageQuotaServiceMock = createAiUsageQuotaServiceMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationPlaybooksService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EntitlementsService, useValue: entitlementsServiceMock },
        { provide: TokenUsageService, useValue: tokenUsageServiceMock },
        { provide: AiService, useValue: aiServiceMock },
        { provide: AiUsageQuotaService, useValue: aiUsageQuotaServiceMock },
        { provide: RoleResolutionService, useValue: roleResolutionServiceMock },
      ],
    }).compile();

    service = module.get<AutomationPlaybooksService>(
      AutomationPlaybooksService
    );
    jest.spyOn(global.console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    (global.console.log as jest.Mock).mockRestore();
  });

  describe('estimatePlaybook', () => {
    it('should estimate playbook with eligible plan', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';

      const mockProject = {
        id: projectId,
        userId,
      };

      const mockProducts = [
        { id: 'prod-1', seoTitle: null },
        { id: 'prod-2', seoTitle: '' },
        { id: 'prod-3', seoTitle: 'Has title' },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      // getAffectedProductIds uses getPlaybookWhere which finds products with null or empty seoTitle
      prismaMock.product.findMany.mockResolvedValue(
        mockProducts.filter((p) => !p.seoTitle || p.seoTitle === '') as any
      );
      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(null);
      entitlementsServiceMock.getAiSuggestionLimit.mockResolvedValue({
        planId: 'pro',
        limit: 100,
      });
      entitlementsServiceMock.getDailyAiUsage.mockResolvedValue(10);

      const result = await service.estimatePlaybook(
        userId,
        projectId,
        playbookId
      );

      expect(result.projectId).toBe(projectId);
      expect(result.playbookId).toBe(playbookId);
      expect(result.totalAffectedProducts).toBe(2); // prod-1 and prod-2 have missing titles
      expect(result.planId).toBe('pro');
      expect(result.eligible).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.estimatedTokens).toBe(
        2 * ESTIMATED_METADATA_TOKENS_PER_CALL
      );
      expect(result.aiDailyLimit.remaining).toBe(90); // 100 - 10
    });

    it('should return not eligible for free plan', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';

      const mockProject = {
        id: projectId,
        userId,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod-1', seoTitle: null },
      ] as any);
      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(null);
      entitlementsServiceMock.getAiSuggestionLimit.mockResolvedValue({
        planId: 'free',
        limit: 0,
      });
      entitlementsServiceMock.getDailyAiUsage.mockResolvedValue(0);

      const result = await service.estimatePlaybook(
        userId,
        projectId,
        playbookId
      );

      expect(result.planId).toBe('free');
      expect(result.eligible).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.reasons).toContain('plan_not_eligible');
    });

    it('should return not eligible when no affected products', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';

      const mockProject = {
        id: projectId,
        userId,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(null);
      entitlementsServiceMock.getAiSuggestionLimit.mockResolvedValue({
        planId: 'pro',
        limit: 100,
      });
      entitlementsServiceMock.getDailyAiUsage.mockResolvedValue(0);

      const result = await service.estimatePlaybook(
        userId,
        projectId,
        playbookId
      );

      expect(result.totalAffectedProducts).toBe(0);
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('no_affected_products');
    });

    it('should return not eligible when daily limit reached', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';

      const mockProject = {
        id: projectId,
        userId,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod-1', seoTitle: null },
      ] as any);
      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(null);
      entitlementsServiceMock.getAiSuggestionLimit.mockResolvedValue({
        planId: 'pro',
        limit: 100,
      });
      entitlementsServiceMock.getDailyAiUsage.mockResolvedValue(100); // Limit reached

      const result = await service.estimatePlaybook(
        userId,
        projectId,
        playbookId
      );

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('ai_daily_limit_reached');
    });

    it('should throw NotFoundException when project not found', async () => {
      const userId = 'user-1';
      const projectId = 'non-existent';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';

      prismaMock.project.findUnique.mockResolvedValue(null);
      roleResolutionServiceMock.assertProjectAccess.mockRejectedValue(
        new NotFoundException('Project not found')
      );

      await expect(
        service.estimatePlaybook(userId, projectId, playbookId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';

      const mockProject = {
        id: projectId,
        userId: 'other-user',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      roleResolutionServiceMock.assertProjectAccess.mockRejectedValue(
        new ForbiddenException('You do not have access to this project')
      );

      await expect(
        service.estimatePlaybook(userId, projectId, playbookId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('previewPlaybook', () => {
    it('should generate preview with AI suggestions', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';
      const sampleSize = 2;

      const mockProject = {
        id: projectId,
        userId,
      };

      const mockProducts = [
        {
          id: 'prod-1',
          seoTitle: null,
          title: 'Product 1',
          description: 'Desc 1',
        },
        {
          id: 'prod-2',
          seoTitle: '',
          title: 'Product 2',
          description: 'Desc 2',
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue(mockProducts as any);
      prismaMock.product.findUnique
        .mockResolvedValueOnce(mockProducts[0] as any)
        .mockResolvedValueOnce(mockProducts[1] as any);

      aiUsageQuotaServiceMock.evaluateQuotaForAction.mockResolvedValue({
        projectId,
        planId: 'pro',
        action: 'PREVIEW_GENERATE',
        policy: {
          monthlyAiRunsLimit: null,
          softThresholdPercent: 80,
          hardEnforcementEnabled: false,
        },
        currentMonthAiRuns: 0,
        remainingAiRuns: null,
        currentUsagePercent: null,
        status: 'allowed',
        reason: 'unlimited',
      });

      aiServiceMock.generateMetadata
        .mockResolvedValueOnce({
          title: 'AI Title 1',
          description: 'AI Desc 1',
        })
        .mockResolvedValueOnce({
          title: 'AI Title 2',
          description: 'AI Desc 2',
        });

      prismaMock.automationPlaybookDraft.upsert.mockResolvedValue({
        id: 'draft-1',
        projectId,
        playbookId,
        scopeId: expect.any(String),
        rulesHash: expect.any(String),
        status: 'PARTIAL',
      } as any);

      const result = await service.previewPlaybook(
        userId,
        projectId,
        playbookId,
        undefined,
        sampleSize
      );

      expect(result.projectId).toBe(projectId);
      expect(result.playbookId).toBe(playbookId);
      expect(result.samples).toHaveLength(2);
      expect(result.counts.affectedTotal).toBeGreaterThan(0);
      expect(result.aiCalled).toBe(true);
      expect(aiServiceMock.generateMetadata).toHaveBeenCalledTimes(2);
    });

    it('should throw HttpException when AI quota exceeded', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';

      const mockProject = {
        id: projectId,
        userId,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod-1', seoTitle: null },
      ] as any);

      aiUsageQuotaServiceMock.evaluateQuotaForAction.mockResolvedValue({
        projectId,
        planId: 'pro',
        action: 'PREVIEW_GENERATE',
        policy: {
          monthlyAiRunsLimit: 100,
          softThresholdPercent: 80,
          hardEnforcementEnabled: true,
        },
        currentMonthAiRuns: 100,
        remainingAiRuns: 0,
        currentUsagePercent: 100,
        status: 'blocked',
        reason: 'quota_exceeded',
      });

      await expect(
        service.previewPlaybook(userId, projectId, playbookId)
      ).rejects.toThrow(HttpException);
    });

    it('should apply rules to suggestions', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';
      const rules: PlaybookRulesV1 = {
        enabled: true,
        prefix: 'Best ',
        suffix: ' | Shop',
        maxLength: 60,
      };

      const mockProject = {
        id: projectId,
        userId,
      };

      const mockProduct = {
        id: 'prod-1',
        seoTitle: null,
        title: 'Product 1',
        description: 'Desc 1',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue([mockProduct] as any);
      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);

      aiUsageQuotaServiceMock.evaluateQuotaForAction.mockResolvedValue({
        projectId,
        planId: 'pro',
        action: 'PREVIEW_GENERATE',
        policy: {
          monthlyAiRunsLimit: null,
          softThresholdPercent: 80,
          hardEnforcementEnabled: false,
        },
        currentMonthAiRuns: 0,
        remainingAiRuns: null,
        currentUsagePercent: null,
        status: 'allowed',
        reason: 'unlimited',
      });

      aiServiceMock.generateMetadata.mockResolvedValue({
        title: 'AI Generated Title That Is Very Long',
        description: 'AI Desc',
      });

      prismaMock.automationPlaybookDraft.upsert.mockResolvedValue({
        id: 'draft-1',
        projectId,
        playbookId,
        scopeId: expect.any(String),
        rulesHash: expect.any(String),
        status: 'PARTIAL',
      } as any);

      const result = await service.previewPlaybook(
        userId,
        projectId,
        playbookId,
        rules,
        1
      );

      expect(result.samples).toHaveLength(1);
      const sample = result.samples[0];
      expect(sample.finalSuggestion).toContain('Best ');
      expect(sample.finalSuggestion).toContain(' | Shop');
      // Should be trimmed to maxLength
      expect(sample.finalSuggestion.length).toBeLessThanOrEqual(60);
    });
  });

  describe('getLatestDraft', () => {
    it('should return latest draft when it exists', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';

      const mockProject = {
        id: projectId,
        userId,
      };

      const mockDraft = {
        id: 'draft-1',
        projectId,
        playbookId,
        scopeId: 'scope-123',
        rulesHash: 'hash-456',
        status: 'READY',
        counts: { affectedTotal: 10, draftGenerated: 8, noSuggestionCount: 2 },
        sampleProductIds: ['prod-1', 'prod-2'],
        draftItems: [
          {
            productId: 'prod-1',
            field: 'seoTitle',
            rawSuggestion: 'Raw Title',
            finalSuggestion: 'Final Title',
            ruleWarnings: [],
          },
        ],
        updatedAt: new Date(),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(
        mockDraft as any
      );

      const result = await service.getLatestDraft(
        userId,
        projectId,
        playbookId
      );

      expect(result).not.toBeNull();
      expect(result?.draftId).toBe('draft-1');
      expect(result?.status).toBe('READY');
      expect(result?.counts?.affectedTotal).toBe(10);
    });

    it('should return null when no draft exists', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';

      const mockProject = {
        id: projectId,
        userId,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(null);

      const result = await service.getLatestDraft(
        userId,
        projectId,
        playbookId
      );

      expect(result).toBeNull();
    });
  });

  describe('applyPlaybook', () => {
    it('should apply draft to products', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';
      const rulesHash = 'hash-456';

      const mockProject = {
        id: projectId,
        userId,
      };

      const mockProducts = [
        { id: 'prod-1', seoTitle: null },
        { id: 'prod-2', seoTitle: '' },
      ];

      // Compute actual scopeId from affected products
      const affectedProductIds = mockProducts.map((p) => p.id);
      const actualScopeId = (service as any).computeScopeId(
        projectId,
        playbookId,
        affectedProductIds
      );

      const mockDraft = {
        id: 'draft-1',
        projectId,
        playbookId,
        scopeId: actualScopeId,
        rulesHash,
        draftItems: [
          {
            productId: 'prod-1',
            field: 'seoTitle',
            rawSuggestion: 'Raw Title 1',
            finalSuggestion: 'Final Title 1',
            ruleWarnings: [],
          },
          {
            productId: 'prod-2',
            field: 'seoTitle',
            rawSuggestion: 'Raw Title 2',
            finalSuggestion: 'Final Title 2',
            ruleWarnings: [],
          },
        ],
        updatedAt: new Date(),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue(mockProducts as any);
      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(
        mockDraft as any
      );
      prismaMock.product.update.mockResolvedValue({} as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      tokenUsageServiceMock.log.mockResolvedValue(undefined);

      const result = await service.applyPlaybook(
        userId,
        projectId,
        playbookId,
        actualScopeId,
        rulesHash
      );

      expect(result.projectId).toBe(projectId);
      expect(result.playbookId).toBe(playbookId);
      expect(result.totalAffectedProducts).toBe(2);
      expect(result.updatedCount).toBe(2);
      expect(result.attemptedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(prismaMock.product.update).toHaveBeenCalledTimes(2);
    });

    it('should skip products without draft suggestions', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';
      const rulesHash = 'hash-456';

      const mockProject = {
        id: projectId,
        userId,
      };

      const mockProducts = [
        { id: 'prod-1', seoTitle: null },
        { id: 'prod-2', seoTitle: '' },
      ];

      // Compute actual scopeId from affected products
      const affectedProductIds = mockProducts.map((p) => p.id);
      const actualScopeId = (service as any).computeScopeId(
        projectId,
        playbookId,
        affectedProductIds
      );

      const mockDraft = {
        id: 'draft-1',
        projectId,
        playbookId,
        scopeId: actualScopeId,
        rulesHash,
        draftItems: [
          {
            productId: 'prod-1',
            field: 'seoTitle',
            rawSuggestion: 'Raw Title 1',
            finalSuggestion: 'Final Title 1',
            ruleWarnings: [],
          },
          {
            productId: 'prod-2',
            field: 'seoTitle',
            rawSuggestion: '',
            finalSuggestion: '', // Empty suggestion
            ruleWarnings: [],
          },
        ],
        updatedAt: new Date(),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue(mockProducts as any);
      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(
        mockDraft as any
      );
      prismaMock.product.update.mockResolvedValue({} as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      tokenUsageServiceMock.log.mockResolvedValue(undefined);

      const result = await service.applyPlaybook(
        userId,
        projectId,
        playbookId,
        actualScopeId,
        rulesHash
      );

      expect(result.updatedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.results.find((r) => r.productId === 'prod-2')?.status).toBe(
        'SKIPPED'
      );
    });

    it('should throw ForbiddenException for free plan', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';
      const scopeId = 'scope-123';
      const rulesHash = 'hash-456';

      const mockProject = {
        id: projectId,
        userId,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('free');

      await expect(
        service.applyPlaybook(userId, projectId, playbookId, scopeId, rulesHash)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when scope changed', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';
      const scopeId = 'old-scope';
      const rulesHash = 'hash-456';

      const mockProject = {
        id: projectId,
        userId,
      };

      const mockProducts = [{ id: 'prod-1', seoTitle: null }];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue(mockProducts as any);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');

      // Current scope will be different from provided scopeId
      await expect(
        service.applyPlaybook(userId, projectId, playbookId, scopeId, rulesHash)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when draft not found', async () => {
      const userId = 'user-1';
      const projectId = 'proj-1';
      const playbookId: AutomationPlaybookId = 'missing_seo_title';
      const scopeId = 'scope-123';
      const rulesHash = 'hash-456';

      const mockProject = {
        id: projectId,
        userId,
      };

      const mockProducts = [{ id: 'prod-1', seoTitle: null }];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue(mockProducts as any);
      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(null);
      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');

      // Compute current scopeId to match
      const affectedProductIds = mockProducts.map((p) => p.id);
      const currentScopeId = (service as any).computeScopeId(
        projectId,
        playbookId,
        affectedProductIds
      );

      await expect(
        service.applyPlaybook(
          userId,
          projectId,
          playbookId,
          currentScopeId,
          rulesHash
        )
      ).rejects.toThrow(ConflictException);
    });
  });
});
