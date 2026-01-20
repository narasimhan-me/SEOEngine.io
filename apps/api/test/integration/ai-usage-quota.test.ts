/**
 * AI-USAGE v2: Integration tests for AI Usage Quota evaluation
 *
 * Tests:
 * - Quota evaluation reads from AiUsageLedgerService (AutomationPlaybookRun data).
 * - Monthly window semantics (calendar month) are respected via ledger summary.
 * - Soft vs hard thresholds behave correctly for limited plans.
 */
import { AiUsageQuotaService } from '../../src/ai/ai-usage-quota.service';
import { AiUsageLedgerService } from '../../src/ai/ai-usage-ledger.service';

describe('AiUsageQuotaService (integration with AiUsageLedgerService)', () => {
  let quotaService: AiUsageQuotaService;
  let ledgerService: AiUsageLedgerService;
  let prismaMock: any;
  let entitlementsMock: any;

  beforeEach(() => {
    prismaMock = {
      automationPlaybookRun: {
        findMany: jest.fn(),
      },
      // [ADMIN-OPS-1] Mock for quota reset offset query
      aiMonthlyQuotaReset: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { offsetCount: null } }),
      },
    };

    ledgerService = new AiUsageLedgerService(prismaMock);

    entitlementsMock = {
      getUserPlan: jest.fn().mockResolvedValue('pro'),
    };

    quotaService = new AiUsageQuotaService(
      entitlementsMock,
      ledgerService,
      prismaMock
    );
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO;
    delete process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT;
    delete process.env.AI_USAGE_HARD_ENFORCEMENT_PRO;
  });

  it('derives currentMonthAiRuns from AutomationPlaybookRun records in the current month', async () => {
    const now = new Date();

    const runs = [
      {
        projectId: 'proj-1',
        runType: 'PREVIEW_GENERATE',
        aiUsed: true,
        reused: false,
        createdAt: now,
      },
      {
        projectId: 'proj-1',
        runType: 'DRAFT_GENERATE',
        aiUsed: true,
        reused: false,
        createdAt: now,
      },
    ];

    prismaMock.automationPlaybookRun.findMany.mockResolvedValue(runs);

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '10';
    process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT = '80';

    const result = await quotaService.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    expect(result.currentMonthAiRuns).toBe(2);
    expect(result.remainingAiRuns).toBe(8);
  });

  it('treats previous-month runs as out of scope via ledger monthly window', async () => {
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    // The mock returns runs, but the ledger service filters by date range
    prismaMock.automationPlaybookRun.findMany.mockImplementation(
      (args: any) => {
        // Simulate the date filtering that happens in the real service
        const from = args.where?.createdAt?.gte;
        const to = args.where?.createdAt?.lte;

        if (from && to && previousMonth < from) {
          return []; // Previous month runs would be filtered out
        }

        return [
          {
            projectId: 'proj-1',
            runType: 'PREVIEW_GENERATE',
            aiUsed: true,
            reused: false,
            createdAt: previousMonth,
          },
        ];
      }
    );

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '5';

    const result = await quotaService.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    // Calendar month window is enforced by AiUsageLedgerService; this test ensures
    // quota evaluation respects the summary (even when findMany returned data).
    expect(result.currentMonthAiRuns).toBe(0);
    expect(result.remainingAiRuns).toBe(5);
  });

  it('returns correct quota status when approaching limit', async () => {
    const now = new Date();

    // Create 8 AI runs to reach 80% of limit=10
    const runs = Array.from({ length: 8 }, (_, i) => ({
      projectId: 'proj-1',
      runType: 'PREVIEW_GENERATE',
      aiUsed: true,
      reused: false,
      createdAt: now,
    }));

    prismaMock.automationPlaybookRun.findMany.mockResolvedValue(runs);

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '10';
    process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT = '80';

    const result = await quotaService.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    expect(result.status).toBe('warning');
    expect(result.reason).toBe('soft_threshold_reached');
    expect(result.currentMonthAiRuns).toBe(8);
    expect(result.currentUsagePercent).toBe(80);
    expect(result.remainingAiRuns).toBe(2);
  });

  it('blocks when at limit with hard enforcement', async () => {
    const now = new Date();

    // Create 10 AI runs to hit the limit
    const runs = Array.from({ length: 10 }, (_, i) => ({
      projectId: 'proj-1',
      runType: 'PREVIEW_GENERATE',
      aiUsed: true,
      reused: false,
      createdAt: now,
    }));

    prismaMock.automationPlaybookRun.findMany.mockResolvedValue(runs);

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '10';
    process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT = '80';
    process.env.AI_USAGE_HARD_ENFORCEMENT_PRO = 'true';

    const result = await quotaService.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    expect(result.status).toBe('blocked');
    expect(result.reason).toBe('hard_limit_reached');
    expect(result.currentMonthAiRuns).toBe(10);
    expect(result.remainingAiRuns).toBe(0);
  });
});
