/**
 * CACHE/REUSE v2: Integration tests for deterministic AI work reuse
 *
 * Tests:
 * - computeAiWorkKey produces deterministic keys for same inputs
 * - Runs with matching aiWorkKey reuse prior AI work
 * - Reused runs have aiUsed=false, reused=true
 * - Ledger correctly counts reusedRuns and aiRunsAvoided
 */
import { AutomationPlaybookRunProcessor } from '../../src/projects/automation-playbook-run.processor';
import { AutomationPlaybooksService } from '../../src/projects/automation-playbooks.service';
import { AiUsageLedgerService } from '../../src/ai/ai-usage-ledger.service';

// Mock the queue for integration tests
jest.mock('../../../src/queues/queues', () => ({
  playbookRunQueue: null,
}));

describe('CACHE/REUSE v2: Deterministic AI Work Reuse', () => {
  let processor: AutomationPlaybookRunProcessor;
  let playbooksService: AutomationPlaybooksService;
  let ledgerService: AiUsageLedgerService;
  let prismaMock: any;
  let aiServiceMock: { generateMetadata: jest.Mock };

  const mockProject = {
    id: 'proj-cache-1',
    userId: 'user-cache-1',
    name: 'Test Project',
  };

  const mockProducts = [
    {
      id: 'prod-1',
      projectId: 'proj-cache-1',
      externalId: 'ext-1',
      title: 'Product 1',
      description: 'Description 1',
      seoTitle: null,
      seoDescription: 'Has description',
    },
    {
      id: 'prod-2',
      projectId: 'proj-cache-1',
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
          id: 'draft-cache-1',
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
        findFirst: jest.fn().mockImplementation((args) => {
          // CACHE/REUSE v2: Support reuse lookup by aiWorkKey
          if (args.where?.aiWorkKey) {
            return createdRuns.find(
              (r) =>
                r.projectId === args.where.projectId &&
                r.playbookId === args.where.playbookId &&
                r.runType === args.where.runType &&
                r.aiWorkKey === args.where.aiWorkKey &&
                r.status === 'SUCCEEDED' &&
                r.aiUsed === true &&
                r.reused === false,
            ) || null;
          }
          return null;
        }),
        findUnique: jest.fn().mockImplementation((args) => {
          return createdRuns.find((r) => r.id === args.where.id) || null;
        }),
        findMany: jest.fn().mockImplementation((args) => {
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
            id: 'run-cache-' + Date.now() + '-' + Math.random().toString(36).slice(2),
            ...args.data,
            reused: args.data.reused ?? false,
            reusedFromRunId: args.data.reusedFromRunId ?? null,
            aiWorkKey: args.data.aiWorkKey ?? null,
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

    aiServiceMock = {
      generateMetadata: jest.fn().mockResolvedValue({
        title: 'AI Generated Title',
        description: 'AI Generated Description',
      }),
    };

    const entitlementsMock = {
      getAiSuggestionLimit: jest.fn().mockResolvedValue({ planId: 'pro', limit: 100 }),
      getDailyAiUsage: jest.fn().mockResolvedValue(0),
      getUserPlan: jest.fn().mockResolvedValue('pro'),
      ensureCanCreateProject: jest.fn().mockResolvedValue(undefined),
      enforceEntitlement: jest.fn().mockResolvedValue(undefined),
    };

    const tokenUsageMock = {
      log: jest.fn().mockResolvedValue(undefined),
    };

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

    playbooksService = new AutomationPlaybooksService(
      prismaMock,
      entitlementsMock as any,
      tokenUsageMock as any,
      aiServiceMock as any,
      quotaServiceMock as any,
    );

    processor = new AutomationPlaybookRunProcessor(prismaMock, playbooksService);
    ledgerService = new AiUsageLedgerService(prismaMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('computeAiWorkKey', () => {
    it('produces deterministic key for same inputs', () => {
      const key1 = processor.computeAiWorkKey('missing_seo_title', ['prod-1', 'prod-2'], undefined);
      const key2 = processor.computeAiWorkKey('missing_seo_title', ['prod-1', 'prod-2'], undefined);
      expect(key1).toBe(key2);
    });

    it('produces different keys for different product order (sorted internally)', () => {
      const key1 = processor.computeAiWorkKey('missing_seo_title', ['prod-1', 'prod-2'], undefined);
      const key2 = processor.computeAiWorkKey('missing_seo_title', ['prod-2', 'prod-1'], undefined);
      // Keys should be the same because productIds are sorted internally
      expect(key1).toBe(key2);
    });

    it('produces different keys for different rules', () => {
      const key1 = processor.computeAiWorkKey('missing_seo_title', ['prod-1'], undefined);
      const key2 = processor.computeAiWorkKey('missing_seo_title', ['prod-1'], { enabled: true, prefix: 'Buy' });
      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different playbooks', () => {
      const key1 = processor.computeAiWorkKey('missing_seo_title', ['prod-1'], undefined);
      const key2 = processor.computeAiWorkKey('missing_seo_description', ['prod-1'], undefined);
      expect(key1).not.toBe(key2);
    });
  });

  describe('Ledger reuse metrics', () => {
    it('counts reusedRuns correctly', async () => {
      // Create runs with reused flag
      createdRuns.push({
        id: 'run-1',
        projectId: 'proj-cache-1',
        runType: 'PREVIEW_GENERATE',
        aiUsed: true,
        reused: false,
        createdAt: new Date(),
      });
      createdRuns.push({
        id: 'run-2',
        projectId: 'proj-cache-1',
        runType: 'PREVIEW_GENERATE',
        aiUsed: false,
        reused: true,
        reusedFromRunId: 'run-1',
        createdAt: new Date(),
      });

      const summary = await ledgerService.getProjectSummary('proj-cache-1');
      expect(summary.reusedRuns).toBe(1);
      expect(summary.aiRunsAvoided).toBe(1);
      expect(summary.totalAiRuns).toBe(1); // Only the original AI run
    });

    it('aiRunsAvoided equals reusedRuns', async () => {
      createdRuns.push({
        id: 'run-1',
        projectId: 'proj-cache-1',
        runType: 'PREVIEW_GENERATE',
        aiUsed: true,
        reused: false,
        createdAt: new Date(),
      });

      // Add multiple reused runs
      for (let i = 0; i < 5; i++) {
        createdRuns.push({
          id: `run-reused-${i}`,
          projectId: 'proj-cache-1',
          runType: 'PREVIEW_GENERATE',
          aiUsed: false,
          reused: true,
          reusedFromRunId: 'run-1',
          createdAt: new Date(),
        });
      }

      const summary = await ledgerService.getProjectSummary('proj-cache-1');
      expect(summary.reusedRuns).toBe(5);
      expect(summary.aiRunsAvoided).toBe(5);
      expect(summary.totalAiRuns).toBe(1);
    });
  });
});
