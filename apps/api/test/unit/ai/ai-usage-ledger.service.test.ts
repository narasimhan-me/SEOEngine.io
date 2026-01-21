/**
 * AI-USAGE-1: Unit tests for AiUsageLedgerService
 *
 * Tests:
 * - Aggregates counts correctly for PREVIEW_GENERATE, DRAFT_GENERATE, APPLY runs
 * - Apply never contributes to AI usage (applyAiRuns must be 0)
 * - Time window filtering works correctly
 * - Run summaries projection returns expected fields
 */
import { AiUsageLedgerService } from '../../../src/ai/ai-usage-ledger.service';

// Minimal mock factory
const createPrismaMock = () => ({
  automationPlaybookRun: {
    findMany: jest.fn(),
  },
});

describe('AiUsageLedgerService', () => {
  let service: AiUsageLedgerService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new AiUsageLedgerService(prismaMock as any);
  });

  describe('getProjectSummary', () => {
    it('should aggregate counts correctly for mixed run types', async () => {
      // Given: 2 PREVIEW_GENERATE (aiUsed=true), 1 DRAFT_GENERATE (aiUsed=true), 1 APPLY (aiUsed=false)
      const mockRuns = [
        { runType: 'PREVIEW_GENERATE', aiUsed: true },
        { runType: 'PREVIEW_GENERATE', aiUsed: true },
        { runType: 'DRAFT_GENERATE', aiUsed: true },
        { runType: 'APPLY', aiUsed: false },
      ];

      prismaMock.automationPlaybookRun.findMany.mockResolvedValue(mockRuns);

      const result = await service.getProjectSummary('proj-1');

      expect(result.totalRuns).toBe(4);
      expect(result.totalAiRuns).toBe(3);
      expect(result.previewRuns).toBe(2);
      expect(result.draftGenerateRuns).toBe(1);
      expect(result.applyRuns).toBe(1);
      expect(result.applyAiRuns).toBe(0);
    });

    it('should return zeros when no runs exist', async () => {
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      const result = await service.getProjectSummary('proj-1');

      expect(result.totalRuns).toBe(0);
      expect(result.totalAiRuns).toBe(0);
      expect(result.previewRuns).toBe(0);
      expect(result.draftGenerateRuns).toBe(0);
      expect(result.applyRuns).toBe(0);
      expect(result.applyAiRuns).toBe(0);
    });

    it('should log error if APPLY run has aiUsed=true (invariant violation)', async () => {
      // This should never happen in production, but we test the invariant check
      const mockRuns = [{ runType: 'APPLY', aiUsed: true }];

      prismaMock.automationPlaybookRun.findMany.mockResolvedValue(mockRuns);

      // Spy on logger to verify error is logged
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      const result = await service.getProjectSummary('proj-1');

      // The service should still count but log an error
      expect(result.applyRuns).toBe(1);
      expect(result.applyAiRuns).toBe(1);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Invariant violation: APPLY run with aiUsed=true'
        )
      );

      loggerSpy.mockRestore();
    });

    it('should filter by time window', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-01-31');

      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      await service.getProjectSummary('proj-1', { from, to });

      expect(prismaMock.automationPlaybookRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
            createdAt: {
              gte: from,
              lte: to,
            },
          }),
        })
      );
    });

    it('should include projectId and period dates in result', async () => {
      const from = new Date('2025-12-01');
      const to = new Date('2025-12-31');

      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      const result = await service.getProjectSummary('proj-abc', { from, to });

      expect(result.projectId).toBe('proj-abc');
      expect(result.periodStart).toEqual(from);
      expect(result.periodEnd).toEqual(to);
    });
  });

  describe('getProjectRunSummaries', () => {
    it('should return ordered list with expected fields', async () => {
      const mockRuns = [
        {
          id: 'run-1',
          runType: 'PREVIEW_GENERATE',
          status: 'SUCCEEDED',
          aiUsed: true,
          scopeId: 'scope-1',
          rulesHash: 'hash-1',
          createdAt: new Date('2025-12-17T10:00:00Z'),
        },
        {
          id: 'run-2',
          runType: 'APPLY',
          status: 'SUCCEEDED',
          aiUsed: false,
          scopeId: 'scope-1',
          rulesHash: 'hash-1',
          createdAt: new Date('2025-12-17T11:00:00Z'),
        },
      ];

      prismaMock.automationPlaybookRun.findMany.mockResolvedValue(mockRuns);

      const result = await service.getProjectRunSummaries('proj-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        runId: 'run-1',
        runType: 'PREVIEW_GENERATE',
        status: 'SUCCEEDED',
        aiUsed: true,
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
        createdAt: new Date('2025-12-17T10:00:00Z'),
      });
      expect(result[1]).toEqual({
        runId: 'run-2',
        runType: 'APPLY',
        status: 'SUCCEEDED',
        aiUsed: false,
        scopeId: 'scope-1',
        rulesHash: 'hash-1',
        createdAt: new Date('2025-12-17T11:00:00Z'),
      });
    });

    it('should filter by runType when provided', async () => {
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      await service.getProjectRunSummaries('proj-1', {
        runType: 'PREVIEW_GENERATE',
      });

      expect(prismaMock.automationPlaybookRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
            runType: 'PREVIEW_GENERATE',
          }),
        })
      );
    });

    it('should apply limit parameter', async () => {
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      await service.getProjectRunSummaries('proj-1', { limit: 5 });

      expect(prismaMock.automationPlaybookRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should cap limit at 100', async () => {
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      await service.getProjectRunSummaries('proj-1', { limit: 500 });

      expect(prismaMock.automationPlaybookRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it('should order by createdAt descending', async () => {
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      await service.getProjectRunSummaries('proj-1');

      expect(prismaMock.automationPlaybookRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getProjectMonthlyUsageCharts', () => {
    it('should return not implemented message', async () => {
      const result = await service.getProjectMonthlyUsageCharts('proj-1');

      expect(result).toEqual({ message: 'Not implemented. See AI-USAGE-2.' });
    });
  });
});
