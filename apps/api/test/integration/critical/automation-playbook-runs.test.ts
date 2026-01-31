/**
 * CRITICAL – Integration tests for Automation Playbook Runs
 *
 * Tests:
 * - Create PREVIEW_GENERATE run + process
 * - Apply run uses existing draft and calls no AI
 * - Duplicate create run returns existing run (idempotency)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AutomationPlaybookRunsService } from '../../../src/projects/automation-playbook-runs.service';
import { AutomationPlaybookRunProcessor } from '../../../src/projects/automation-playbook-run.processor';
import { AutomationPlaybooksService } from '../../../src/projects/automation-playbooks.service';
import { PrismaService } from '../../../src/prisma.service';
import { AiService } from '../../../src/ai/ai.service';
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { TokenUsageService } from '../../../src/ai/token-usage.service';

// Mock the queue for integration tests
jest.mock('../../../src/queues/queues', () => ({
  playbookRunQueue: null,
}));

describe('CRITICAL – AutomationPlaybookRuns Integration', () => {
  let runsService: AutomationPlaybookRunsService;
  let processor: AutomationPlaybookRunProcessor;
  let playbooksService: AutomationPlaybooksService;
  let prismaMock: any;
  let aiServiceMock: { generateMetadata: jest.Mock };

  const mockProject = {
    id: 'proj-integration-1',
    userId: 'user-integration-1',
    name: 'Test Project',
  };

  const mockProducts = [
    {
      id: 'prod-1',
      projectId: 'proj-integration-1',
      externalId: 'ext-1',
      title: 'Product 1',
      description: 'Description 1',
      seoTitle: null,
      seoDescription: 'Has description',
    },
    {
      id: 'prod-2',
      projectId: 'proj-integration-1',
      externalId: 'ext-2',
      title: 'Product 2',
      description: 'Description 2',
      seoTitle: null,
      seoDescription: 'Has description',
    },
  ];

  beforeEach(async () => {
    // Create comprehensive prisma mock
    prismaMock = {
      project: {
        findUnique: jest.fn().mockResolvedValue(mockProject),
      },
      product: {
        findMany: jest.fn().mockResolvedValue(mockProducts),
        findUnique: jest.fn().mockImplementation((args) => {
          const id = args.where.id;
          return Promise.resolve(mockProducts.find((p) => p.id === id) || null);
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      automationPlaybookDraft: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation((args) => ({
          id: 'draft-integration-1',
          projectId: args.create.projectId,
          playbookId: args.create.playbookId,
          scopeId: args.create.scopeId,
          rulesHash: args.create.rulesHash,
          status: args.create.status,
          draftItems: args.create.draftItems,
          counts: args.create.counts,
          sampleProductIds: args.create.sampleProductIds,
          rules: args.create.rules,
        })),
        update: jest.fn().mockImplementation((args) => ({
          ...args.data,
          id: args.where.id,
        })),
      },
      automationPlaybookRun: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((args) => ({
          id: 'run-integration-' + Date.now(),
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        update: jest.fn().mockImplementation((args) => ({
          ...args.data,
          id: args.where.id,
        })),
      },
      tokenUsage: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    // AI service mock that tracks calls
    aiServiceMock = {
      generateMetadata: jest.fn().mockResolvedValue({
        title: 'AI Generated Title',
        description: 'AI Generated Description',
      }),
    };

    // Entitlements mock
    const entitlementsMock = {
      getAiSuggestionLimit: jest
        .fn()
        .mockResolvedValue({ planId: 'pro', limit: 100 }),
      getDailyAiUsage: jest.fn().mockResolvedValue(0),
      getUserPlan: jest.fn().mockResolvedValue('pro'),
      ensureCanCreateProject: jest.fn().mockResolvedValue(undefined),
      enforceEntitlement: jest.fn().mockResolvedValue(undefined),
    };

    // Token usage mock
    const tokenUsageMock = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    // Quota service mock (AI-USAGE v2: always allow in this integration suite)
    const quotaServiceMock = {
      evaluateQuotaForAction: jest.fn().mockResolvedValue({
        projectId: 'proj-runs-1',
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
      }),
    };

    // Role resolution mock
    const roleResolutionMock = {
      assertProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertCanGenerateDrafts: jest.fn().mockResolvedValue(undefined),
      assertOwnerRole: jest.fn().mockResolvedValue(undefined),
      canApply: jest.fn().mockResolvedValue(true),
    };

    // [EA-44] Mock AutomationSafetyRailsService
    const safetyRailsMock = {
      evaluateSafetyRails: jest.fn().mockResolvedValue({
        status: 'PASSED',
        checks: [],
        evaluatedAt: new Date().toISOString(),
        projectId: mockProject.id,
        userId: 'user-1',
        automationId: 'missing_seo_title',
        declaredScope: { scopeId: 'scope-1', assetCount: 2, assetType: 'products' },
      }),
      enforceOrBlock: jest.fn().mockResolvedValue({
        status: 'PASSED',
        checks: [],
        evaluatedAt: new Date().toISOString(),
        projectId: mockProject.id,
        userId: 'user-1',
        automationId: 'missing_seo_title',
        declaredScope: { scopeId: 'scope-1', assetCount: 2, assetType: 'products' },
      }),
    };

    // Create the real service instances with mocked dependencies
    playbooksService = new AutomationPlaybooksService(
      prismaMock,
      entitlementsMock as any,
      tokenUsageMock as any,
      aiServiceMock as any,
      quotaServiceMock as any,
      roleResolutionMock as any,
      safetyRailsMock as any
    );

    processor = new AutomationPlaybookRunProcessor(
      prismaMock,
      playbooksService
    );

    runsService = new AutomationPlaybookRunsService(
      prismaMock,
      processor,
      roleResolutionMock as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Create PREVIEW_GENERATE run + process', () => {
    it('should create run, process it, and track AI usage', async () => {
      const run = await runsService.createRun({
        userId: 'user-integration-1',
        projectId: 'proj-integration-1',
        playbookId: 'missing_seo_title',
        runType: 'PREVIEW_GENERATE',
        scopeId: 'scope-test',
        rulesHash: 'hash-test',
        meta: { sampleSize: 2 },
      });

      expect(run.id).toBeDefined();
      expect(run.status).toBe('QUEUED');
      expect(prismaMock.automationPlaybookRun.create).toHaveBeenCalledTimes(1);

      // Now set up mocks for processing
      prismaMock.automationPlaybookRun.findUnique.mockResolvedValue({
        ...run,
        status: 'QUEUED',
      });

      // Process the run
      await processor.processJob(run.id);

      // Verify AI was called during PREVIEW_GENERATE
      expect(aiServiceMock.generateMetadata).toHaveBeenCalled();

      // Verify status was updated to RUNNING then SUCCEEDED
      expect(prismaMock.automationPlaybookRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: run.id },
          data: expect.objectContaining({ status: 'RUNNING' }),
        })
      );
      expect(prismaMock.automationPlaybookRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: run.id },
          data: expect.objectContaining({
            status: 'SUCCEEDED',
            aiUsed: true,
          }),
        })
      );
    });
  });

  describe('Apply run uses existing draft and calls no AI', () => {
    it('should apply using draft without AI calls', async () => {
      // The scopeId is computed as SHA-256 hash of "projectId:playbookId:sortedProductIds"
      // For proj-integration-1:missing_seo_title:prod-1,prod-2 => 48e65518fc3a71df
      const computedScopeId = '48e65518fc3a71df';
      // Default rulesHash for { enabled: false } => 39c4bcfbb8c41ddd
      const defaultRulesHash = '39c4bcfbb8c41ddd';

      // Set up an existing draft with suggestions
      const existingDraft = {
        id: 'draft-ready-1',
        projectId: 'proj-integration-1',
        playbookId: 'missing_seo_title',
        scopeId: computedScopeId,
        rulesHash: defaultRulesHash,
        status: 'READY',
        draftItems: [
          {
            productId: 'prod-1',
            field: 'seoTitle',
            rawSuggestion: 'Title from draft',
            finalSuggestion: 'Title from draft',
            ruleWarnings: [],
          },
          {
            productId: 'prod-2',
            field: 'seoTitle',
            rawSuggestion: 'Title 2 from draft',
            finalSuggestion: 'Title 2 from draft',
            ruleWarnings: [],
          },
        ],
        counts: { affectedTotal: 2, draftGenerated: 2, noSuggestionCount: 0 },
        rules: { enabled: false },
      };

      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(
        existingDraft
      );

      // Reset AI mock to verify no calls
      aiServiceMock.generateMetadata.mockClear();

      // Create and process APPLY run
      const run = await runsService.createRun({
        userId: 'user-integration-1',
        projectId: 'proj-integration-1',
        playbookId: 'missing_seo_title',
        runType: 'APPLY',
        scopeId: computedScopeId,
        rulesHash: defaultRulesHash,
      });

      prismaMock.automationPlaybookRun.findUnique.mockResolvedValue({
        ...run,
        status: 'QUEUED',
      });

      await processor.processJob(run.id);

      // Critical assertion: AI should NOT have been called during Apply
      expect(aiServiceMock.generateMetadata).not.toHaveBeenCalled();

      // Verify status transition
      expect(prismaMock.automationPlaybookRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: run.id },
          data: expect.objectContaining({
            status: 'SUCCEEDED',
            aiUsed: false,
          }),
        })
      );

      // Verify products were updated from draft
      expect(prismaMock.product.update).toHaveBeenCalled();
    });
  });

  describe('Duplicate create run returns existing run (idempotency)', () => {
    it('should return existing run when idempotency key matches', async () => {
      const existingRun = {
        id: 'run-existing-idempotent',
        projectId: 'proj-integration-1',
        playbookId: 'missing_seo_title',
        runType: 'PREVIEW_GENERATE',
        scopeId: 'scope-idempotent',
        rulesHash: 'hash-idempotent',
        idempotencyKey: 'unique-key-123',
        status: 'QUEUED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call creates the run
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValueOnce(null);
      prismaMock.automationPlaybookRun.create.mockResolvedValueOnce(
        existingRun
      );

      const run1 = await runsService.createRun({
        userId: 'user-integration-1',
        projectId: 'proj-integration-1',
        playbookId: 'missing_seo_title',
        runType: 'PREVIEW_GENERATE',
        scopeId: 'scope-idempotent',
        rulesHash: 'hash-idempotent',
        idempotencyKey: 'unique-key-123',
      });

      expect(run1.id).toBe('run-existing-idempotent');
      expect(prismaMock.automationPlaybookRun.create).toHaveBeenCalledTimes(1);

      // Second call with same idempotency key returns existing
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValueOnce(
        existingRun
      );

      const run2 = await runsService.createRun({
        userId: 'user-integration-1',
        projectId: 'proj-integration-1',
        playbookId: 'missing_seo_title',
        runType: 'PREVIEW_GENERATE',
        scopeId: 'scope-idempotent',
        rulesHash: 'hash-idempotent',
        idempotencyKey: 'unique-key-123',
      });

      // Should return the same run ID
      expect(run2.id).toBe('run-existing-idempotent');
      // create should NOT have been called again
      expect(prismaMock.automationPlaybookRun.create).toHaveBeenCalledTimes(1);
    });
  });
});
