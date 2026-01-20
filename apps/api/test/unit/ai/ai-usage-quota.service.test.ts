/**
 * AI-USAGE v2: Unit tests for AiUsageQuotaService
 *
 * Tests focus on pure quota evaluation logic:
 * - Unlimited plans (null limit) are always allowed with "unlimited" reason.
 * - Limited plans below soft threshold → status 'allowed'.
 * - At/above soft threshold but below hard limit → status 'warning'.
 * - At/above hard limit with hardEnforcementEnabled=true → status 'blocked'.
 * - Percent calculations and remaining runs are derived from ledger summary.
 */
import { AiUsageQuotaService } from '../../../src/ai/ai-usage-quota.service';
import { PrismaService } from '../../../src/prisma.service';

describe('AiUsageQuotaService', () => {
  const entitlementsStub = {
    getUserPlan: jest.fn(),
  } as any;

  const ledgerStub = {
    getProjectSummary: jest.fn(),
  } as any;

  const createPrismaMock = () => ({
    aiMonthlyQuotaReset: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  });

  let service: AiUsageQuotaService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.resetAllMocks();
    prismaMock = createPrismaMock();
    service = new AiUsageQuotaService(
      entitlementsStub,
      ledgerStub,
      prismaMock as unknown as PrismaService
    );
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO;
    delete process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT;
    delete process.env.AI_USAGE_HARD_ENFORCEMENT_PRO;
  });

  it('treats null monthlyAiRunsLimit as unlimited (always allowed)', async () => {
    entitlementsStub.getUserPlan.mockResolvedValue('pro');
    ledgerStub.getProjectSummary.mockResolvedValue({
      projectId: 'proj-1',
      periodStart: new Date(),
      periodEnd: new Date(),
      totalRuns: 10,
      totalAiRuns: 10,
      previewRuns: 10,
      draftGenerateRuns: 0,
      applyRuns: 0,
      applyAiRuns: 0,
      // CACHE/REUSE v2
      reusedRuns: 0,
      aiRunsAvoided: 0,
    });

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '';

    const result = await service.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    expect(result.status).toBe('allowed');
    expect(result.reason).toBe('unlimited');
    expect(result.remainingAiRuns).toBeNull();
    expect(result.currentUsagePercent).toBeNull();
  });

  it('returns allowed below soft threshold for limited plan', async () => {
    entitlementsStub.getUserPlan.mockResolvedValue('pro');
    ledgerStub.getProjectSummary.mockResolvedValue({
      projectId: 'proj-1',
      periodStart: new Date(),
      periodEnd: new Date(),
      totalRuns: 10,
      totalAiRuns: 40,
      previewRuns: 40,
      draftGenerateRuns: 0,
      applyRuns: 0,
      applyAiRuns: 0,
      // CACHE/REUSE v2
      reusedRuns: 0,
      aiRunsAvoided: 0,
    });

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '100';
    process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT = '80';

    const result = await service.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    expect(result.status).toBe('allowed');
    expect(result.reason).toBe('below_soft_threshold');
    expect(result.currentUsagePercent).toBeGreaterThan(0);
    expect(result.currentUsagePercent).toBeLessThan(80);
  });

  it('returns warning at/above soft threshold but below hard limit', async () => {
    entitlementsStub.getUserPlan.mockResolvedValue('pro');
    ledgerStub.getProjectSummary.mockResolvedValue({
      projectId: 'proj-1',
      periodStart: new Date(),
      periodEnd: new Date(),
      totalRuns: 10,
      totalAiRuns: 80,
      previewRuns: 80,
      draftGenerateRuns: 0,
      applyRuns: 0,
      applyAiRuns: 0,
      // CACHE/REUSE v2
      reusedRuns: 0,
      aiRunsAvoided: 0,
    });

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '100';
    process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT = '80';
    delete process.env.AI_USAGE_HARD_ENFORCEMENT_PRO;

    const result = await service.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    expect(result.status).toBe('warning');
    expect(result.reason).toBe('soft_threshold_reached');
    expect(result.remainingAiRuns).toBe(20);
  });

  it('returns blocked at/above hard limit when hard enforcement enabled', async () => {
    entitlementsStub.getUserPlan.mockResolvedValue('pro');
    ledgerStub.getProjectSummary.mockResolvedValue({
      projectId: 'proj-1',
      periodStart: new Date(),
      periodEnd: new Date(),
      totalRuns: 10,
      totalAiRuns: 100,
      previewRuns: 100,
      draftGenerateRuns: 0,
      applyRuns: 0,
      applyAiRuns: 0,
      // CACHE/REUSE v2
      reusedRuns: 0,
      aiRunsAvoided: 0,
    });

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '100';
    process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT = '80';
    process.env.AI_USAGE_HARD_ENFORCEMENT_PRO = 'true';

    const result = await service.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    expect(result.status).toBe('blocked');
    expect(result.reason).toBe('hard_limit_reached');
    expect(result.remainingAiRuns).toBe(0);
    expect(result.currentUsagePercent).toBe(100);
  });

  it('returns warning at hard limit when hard enforcement is disabled', async () => {
    entitlementsStub.getUserPlan.mockResolvedValue('pro');
    ledgerStub.getProjectSummary.mockResolvedValue({
      projectId: 'proj-1',
      periodStart: new Date(),
      periodEnd: new Date(),
      totalRuns: 10,
      totalAiRuns: 100,
      previewRuns: 100,
      draftGenerateRuns: 0,
      applyRuns: 0,
      applyAiRuns: 0,
      // CACHE/REUSE v2
      reusedRuns: 0,
      aiRunsAvoided: 0,
    });

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '100';
    process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT = '80';
    process.env.AI_USAGE_HARD_ENFORCEMENT_PRO = 'false';

    const result = await service.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    // Without hard enforcement, status is warning even at limit
    expect(result.status).toBe('warning');
    expect(result.reason).toBe('soft_threshold_reached');
    expect(result.remainingAiRuns).toBe(0);
  });

  it('uses default 80% soft threshold when not configured', async () => {
    entitlementsStub.getUserPlan.mockResolvedValue('pro');
    ledgerStub.getProjectSummary.mockResolvedValue({
      projectId: 'proj-1',
      periodStart: new Date(),
      periodEnd: new Date(),
      totalRuns: 10,
      totalAiRuns: 79,
      previewRuns: 79,
      draftGenerateRuns: 0,
      applyRuns: 0,
      applyAiRuns: 0,
      // CACHE/REUSE v2
      reusedRuns: 0,
      aiRunsAvoided: 0,
    });

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '100';
    delete process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT;

    const result = await service.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'PREVIEW_GENERATE',
    });

    // 79% is below default 80% threshold
    expect(result.status).toBe('allowed');
    expect(result.reason).toBe('below_soft_threshold');
  });

  it('respects DRAFT_GENERATE action type', async () => {
    entitlementsStub.getUserPlan.mockResolvedValue('pro');
    ledgerStub.getProjectSummary.mockResolvedValue({
      projectId: 'proj-1',
      periodStart: new Date(),
      periodEnd: new Date(),
      totalRuns: 5,
      totalAiRuns: 5,
      previewRuns: 3,
      draftGenerateRuns: 2,
      applyRuns: 0,
      applyAiRuns: 0,
      // CACHE/REUSE v2
      reusedRuns: 0,
      aiRunsAvoided: 0,
    });

    process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '';

    const result = await service.evaluateQuotaForAction({
      userId: 'user-1',
      projectId: 'proj-1',
      action: 'DRAFT_GENERATE',
    });

    expect(result.action).toBe('DRAFT_GENERATE');
    expect(result.status).toBe('allowed');
  });
});
