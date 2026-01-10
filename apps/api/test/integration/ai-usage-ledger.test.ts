/**
 * AI-USAGE-1: Integration tests for AI Usage Ledger
 *
 * Tests:
 * - Preview + DraftGenerate increment usage
 * - Apply does not increment usage
 * - Run summaries endpoint returns expected data
 */
import { AutomationPlaybookRunsService } from '../../src/projects/automation-playbook-runs.service';
import { AutomationPlaybookRunProcessor } from '../../src/projects/automation-playbook-run.processor';
import { AutomationPlaybooksService } from '../../src/projects/automation-playbooks.service';
import { AiUsageLedgerService } from '../../src/ai/ai-usage-ledger.service';

// Mock the queue for integration tests
jest.mock('../../src/queues/queues', () => ({
  playbookRunQueue: null,
}));

describe('AiUsageLedger Integration', () => {
  let runsService: AutomationPlaybookRunsService;
  let processor: AutomationPlaybookRunProcessor;
  let playbooksService: AutomationPlaybooksService;
  let ledgerService: AiUsageLedgerService;
  let prismaMock: any;
  let aiServiceMock: { generateMetadata: jest.Mock };

  const mockProject = {
    id: 'proj-ledger-1',
    userId: 'user-ledger-1',
    name: 'Test Project',
  };

  const mockProducts = [
    {
      id: 'prod-1',
      projectId: 'proj-ledger-1',
      externalId: 'ext-1',
      title: 'Product 1',
      description: 'Description 1',
      seoTitle: null,
      seoDescription: 'Has description',
    },
    {
      id: 'prod-2',
      projectId: 'proj-ledger-1',
      externalId: 'ext-2',
      title: 'Product 2',
      description: 'Description 2',
      seoTitle: null,
      seoDescription: 'Has description',
    },
  ];

  // Track created runs for ledger queries
  const createdRuns: any[] = [];

  beforeEach(async () => {
    createdRuns.length = 0;

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
        upsert: jest.fn().mockImplementation((args) => ({
          id: 'draft-ledger-1',
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
        findUnique: jest.fn().mockImplementation((args) => {
          return createdRuns.find((r) => r.id === args.where.id) || null;
        }),
        findMany: jest.fn().mockImplementation((args) => {
          // Filter runs by projectId and optional filters
          let filtered = createdRuns.filter((r) => r.projectId === args.where.projectId);
          if (args.where.runType) {
            filtered = filtered.filter((r) => r.runType === args.where.runType);
          }
          if (args.where.createdAt) {
            filtered = filtered.filter((r) => {
              const createdAt = new Date(r.createdAt);
              return createdAt >= args.where.createdAt.gte && createdAt <= args.where.createdAt.lte;
            });
          }
          return filtered;
        }),
        create: jest.fn().mockImplementation((args) => {
          const run = {
            id: 'run-ledger-' + Date.now() + '-' + Math.random().toString(36).slice(2),
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          createdRuns.push(run);
          return run;
        }),
        update: jest.fn().mockImplementation((args) => {
          const run = createdRuns.find((r) => r.id === args.where.id);
          if (run) {
            Object.assign(run, args.data);
          }
          return { ...run, ...args.data };
        }),
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
      getAiSuggestionLimit: jest.fn().mockResolvedValue({ planId: 'pro', limit: 100 }),
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
        projectId: mockProject.id,
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

    // [ROLES-3] Mock RoleResolutionService for role checks
    const roleResolutionMock = {
      resolveEffectiveRole: jest.fn().mockResolvedValue('OWNER'),
      assertOwnerRole: jest.fn().mockResolvedValue(undefined),
      assertProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertCanGenerateDrafts: jest.fn().mockResolvedValue(undefined),
      isMultiUserProject: jest.fn().mockResolvedValue(false),
    };

    // Create the real service instances with mocked dependencies
    playbooksService = new AutomationPlaybooksService(
      prismaMock,
      entitlementsMock as any,
      tokenUsageMock as any,
      aiServiceMock as any,
      quotaServiceMock as any,
      roleResolutionMock as any,
    );

    processor = new AutomationPlaybookRunProcessor(prismaMock, playbooksService);

    runsService = new AutomationPlaybookRunsService(prismaMock, processor, roleResolutionMock as any);

    ledgerService = new AiUsageLedgerService(prismaMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Preview + DraftGenerate increment usage', () => {
    it('should show increased AI usage after PREVIEW_GENERATE run', async () => {
      // Get baseline summary
      const baselineSummary = await ledgerService.getProjectSummary('proj-ledger-1');
      expect(baselineSummary.previewRuns).toBe(0);
      expect(baselineSummary.totalAiRuns).toBe(0);

      // Create and process PREVIEW_GENERATE run
      const run = await runsService.createRun({
        userId: 'user-ledger-1',
        projectId: 'proj-ledger-1',
        playbookId: 'missing_seo_title',
        runType: 'PREVIEW_GENERATE',
        scopeId: 'scope-test',
        rulesHash: 'hash-test',
        meta: { sampleSize: 2 },
      });

      // Update run to QUEUED status for processing
      const createdRun = createdRuns.find((r) => r.id === run.id);
      if (createdRun) createdRun.status = 'QUEUED';

      await processor.processJob(run.id);

      // Get summary after run
      const afterSummary = await ledgerService.getProjectSummary('proj-ledger-1');
      expect(afterSummary.previewRuns).toBe(1);
      expect(afterSummary.totalAiRuns).toBe(1);
      expect(afterSummary.applyAiRuns).toBe(0);
    });
  });

  describe('Apply does not increment AI usage', () => {
    it('should not increase AI usage when APPLY run uses existing draft', async () => {
      // The scopeId is computed as SHA-256 hash of "projectId:playbookId:sortedProductIds"
      // For proj-ledger-1:missing_seo_title:prod-1,prod-2 => e4a4d4c8f8bfccfb
      const computedScopeId = 'e4a4d4c8f8bfccfb';
      const defaultRulesHash = '39c4bcfbb8c41ddd';

      // Set up an existing draft with suggestions
      const existingDraft = {
        id: 'draft-ready-1',
        projectId: 'proj-ledger-1',
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

      prismaMock.automationPlaybookDraft.findFirst.mockResolvedValue(existingDraft);

      // Reset AI mock to verify no calls
      aiServiceMock.generateMetadata.mockClear();

      // First create a PREVIEW run that uses AI
      const previewRun = await runsService.createRun({
        userId: 'user-ledger-1',
        projectId: 'proj-ledger-1',
        playbookId: 'missing_seo_title',
        runType: 'PREVIEW_GENERATE',
        scopeId: computedScopeId,
        rulesHash: defaultRulesHash,
        meta: { sampleSize: 2 },
      });

      const previewRunInList = createdRuns.find((r) => r.id === previewRun.id);
      if (previewRunInList) previewRunInList.status = 'QUEUED';

      await processor.processJob(previewRun.id);

      // Now the run should show aiUsed=true
      const previewSummary = await ledgerService.getProjectSummary('proj-ledger-1');
      expect(previewSummary.previewRuns).toBe(1);
      expect(previewSummary.totalAiRuns).toBe(1);

      // Now create and process APPLY run
      const applyRun = await runsService.createRun({
        userId: 'user-ledger-1',
        projectId: 'proj-ledger-1',
        playbookId: 'missing_seo_title',
        runType: 'APPLY',
        scopeId: computedScopeId,
        rulesHash: defaultRulesHash,
      });

      const applyRunInList = createdRuns.find((r) => r.id === applyRun.id);
      if (applyRunInList) applyRunInList.status = 'QUEUED';

      await processor.processJob(applyRun.id);

      // Get summary after APPLY
      const afterApplySummary = await ledgerService.getProjectSummary('proj-ledger-1');

      // APPLY run should have been created with aiUsed=false
      expect(afterApplySummary.applyRuns).toBe(1);
      expect(afterApplySummary.applyAiRuns).toBe(0);
      // Total AI runs should NOT have increased from the APPLY
      expect(afterApplySummary.totalAiRuns).toBe(1); // Still 1 from preview
    });
  });

  describe('Run summaries endpoint', () => {
    it('should return run summaries with correct fields', async () => {
      // Create a couple of runs
      const run1 = await runsService.createRun({
        userId: 'user-ledger-1',
        projectId: 'proj-ledger-1',
        playbookId: 'missing_seo_title',
        runType: 'PREVIEW_GENERATE',
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
      });

      // Manually set aiUsed since we're not actually processing
      const run1InList = createdRuns.find((r) => r.id === run1.id);
      if (run1InList) {
        run1InList.aiUsed = true;
        run1InList.status = 'SUCCEEDED';
      }

      const run2 = await runsService.createRun({
        userId: 'user-ledger-1',
        projectId: 'proj-ledger-1',
        playbookId: 'missing_seo_title',
        runType: 'APPLY',
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
      });

      const run2InList = createdRuns.find((r) => r.id === run2.id);
      if (run2InList) {
        run2InList.aiUsed = false;
        run2InList.status = 'SUCCEEDED';
      }

      // Get run summaries
      const summaries = await ledgerService.getProjectRunSummaries('proj-ledger-1');

      expect(summaries.length).toBeGreaterThanOrEqual(2);

      // Find our runs in the summaries
      const previewSummary = summaries.find((s) => s.runId === run1.id);
      const applySummary = summaries.find((s) => s.runId === run2.id);

      expect(previewSummary).toBeDefined();
      expect(previewSummary?.runType).toBe('PREVIEW_GENERATE');
      expect(previewSummary?.aiUsed).toBe(true);

      expect(applySummary).toBeDefined();
      expect(applySummary?.runType).toBe('APPLY');
      expect(applySummary?.aiUsed).toBe(false);
    });

    it('should filter by runType when specified', async () => {
      // Create runs of different types
      await runsService.createRun({
        userId: 'user-ledger-1',
        projectId: 'proj-ledger-1',
        playbookId: 'missing_seo_title',
        runType: 'PREVIEW_GENERATE',
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
      });

      await runsService.createRun({
        userId: 'user-ledger-1',
        projectId: 'proj-ledger-1',
        playbookId: 'missing_seo_title',
        runType: 'APPLY',
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
      });

      // Get only PREVIEW_GENERATE runs
      const previewSummaries = await ledgerService.getProjectRunSummaries('proj-ledger-1', {
        runType: 'PREVIEW_GENERATE',
      });

      // All returned summaries should be PREVIEW_GENERATE
      for (const summary of previewSummaries) {
        expect(summary.runType).toBe('PREVIEW_GENERATE');
      }
    });
  });

  /**
   * [ROLES-3-HARDEN-1 FIXUP-1] recordAiRun actorUserId attribution tests
   *
   * Validates that the actorUserId parameter correctly sets createdByUserId:
   * - Case A: When actorUserId is provided, createdByUserId equals actorUserId
   * - Case B: When actorUserId is omitted, createdByUserId falls back to project.userId
   */
  describe('recordAiRun actorUserId attribution', () => {
    it('Case A: When actorUserId is provided, createdByUserId equals actorUserId', async () => {
      const editorUserId = 'user-editor-123';

      // Clear any previous runs
      createdRuns.length = 0;

      // Call recordAiRun with explicit actorUserId
      await ledgerService.recordAiRun({
        projectId: mockProject.id,
        runType: 'INTENT_FIX_PREVIEW',
        productIds: ['prod-1'],
        productsProcessed: 1,
        productsSkipped: 0,
        draftsFresh: 1,
        draftsReused: 0,
        actorUserId: editorUserId,
      });

      // Verify the created run has createdByUserId set to actorUserId
      expect(createdRuns.length).toBe(1);
      expect(createdRuns[0].createdByUserId).toBe(editorUserId);
    });

    it('Case B: When actorUserId is omitted, createdByUserId falls back to project.userId', async () => {
      // Clear any previous runs
      createdRuns.length = 0;

      // Call recordAiRun without actorUserId (should fall back to mockProject.userId)
      await ledgerService.recordAiRun({
        projectId: mockProject.id,
        runType: 'INTENT_FIX_PREVIEW',
        productIds: ['prod-2'],
        productsProcessed: 1,
        productsSkipped: 0,
        draftsFresh: 1,
        draftsReused: 0,
        // actorUserId intentionally omitted
      });

      // Verify the created run has createdByUserId set to project.userId (fallback)
      expect(createdRuns.length).toBe(1);
      expect(createdRuns[0].createdByUserId).toBe(mockProject.userId);
    });
  });
});
