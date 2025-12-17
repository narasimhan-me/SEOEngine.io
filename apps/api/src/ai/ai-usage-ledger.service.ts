import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AutomationPlaybookRunStatus, AutomationPlaybookRunType } from '@prisma/client';

// Re-export for consumers
export { AutomationPlaybookRunStatus };

export type AiUsageRunType = 'PREVIEW_GENERATE' | 'DRAFT_GENERATE' | 'APPLY';

export interface AiUsageProjectSummary {
  projectId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRuns: number;
  totalAiRuns: number;
  previewRuns: number;
  draftGenerateRuns: number;
  applyRuns: number;
  applyAiRuns: number; // must always be 0 (contract)
  // CACHE/REUSE v2: Reuse metrics
  reusedRuns: number; // runs that reused AI work from a prior run
  aiRunsAvoided: number; // same as reusedRuns (AI calls avoided due to reuse)
}

export interface AiUsageRunSummary {
  runId: string;
  runType: AiUsageRunType;
  status: AutomationPlaybookRunStatus;
  aiUsed: boolean;
  scopeId: string | null;
  rulesHash: string | null;
  createdAt: Date;
  // CACHE/REUSE v2: Reuse tracking
  reused: boolean;
  reusedFromRunId: string | null;
  aiWorkKey: string | null;
}

export interface GetProjectSummaryOptions {
  from?: Date;
  to?: Date;
}

export interface GetProjectRunSummariesOptions {
  runType?: AiUsageRunType;
  limit?: number;
}

@Injectable()
export class AiUsageLedgerService {
  private readonly logger = new Logger(AiUsageLedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get AI usage summary for a project within a given time period.
   * Source of truth: AutomationPlaybookRun rows.
   *
   * Invariant: applyAiRuns must be 0. If any APPLY run has aiUsed=true,
   * this is logged as an error (tests will catch this).
   */
  async getProjectSummary(
    projectId: string,
    opts?: GetProjectSummaryOptions,
  ): Promise<AiUsageProjectSummary> {
    const now = new Date();
    const from = opts?.from ?? this.startOfMonth(now);
    const to = opts?.to ?? this.endOfMonth(now);

    // Query all runs for this project in the date range
    const runs = await this.prisma.automationPlaybookRun.findMany({
      where: {
        projectId,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        runType: true,
        aiUsed: true,
        reused: true,
      },
    });

    // Aggregate counts
    let totalRuns = 0;
    let totalAiRuns = 0;
    let previewRuns = 0;
    let draftGenerateRuns = 0;
    let applyRuns = 0;
    let applyAiRuns = 0;
    let reusedRuns = 0;

    for (const run of runs) {
      totalRuns++;

      if (run.aiUsed) {
        totalAiRuns++;
      }

      // CACHE/REUSE v2: Count reused runs
      if (run.reused) {
        reusedRuns++;
      }

      switch (run.runType) {
        case 'PREVIEW_GENERATE':
          previewRuns++;
          break;
        case 'DRAFT_GENERATE':
          draftGenerateRuns++;
          break;
        case 'APPLY':
          applyRuns++;
          if (run.aiUsed) {
            applyAiRuns++;
            // This should never happen - log an error for visibility
            this.logger.error(
              `[AiUsageLedgerService] Invariant violation: APPLY run with aiUsed=true found for project ${projectId}`,
            );
          }
          break;
      }
    }

    // TODO: AI-USAGE-2 - Integrate token counts from TokenUsage table
    // TODO: AI-USAGE-2 - Integrate non-playbook AI usage from AiUsageEvent

    return {
      projectId,
      periodStart: from,
      periodEnd: to,
      totalRuns,
      totalAiRuns,
      previewRuns,
      draftGenerateRuns,
      applyRuns,
      applyAiRuns,
      // CACHE/REUSE v2: Reuse metrics
      reusedRuns,
      aiRunsAvoided: reusedRuns, // Same value - AI calls avoided due to reuse
    };
  }

  /**
   * Get list of run summaries for a project.
   * Returns a shallow projection ordered by createdAt desc.
   */
  async getProjectRunSummaries(
    projectId: string,
    opts?: GetProjectRunSummariesOptions,
  ): Promise<AiUsageRunSummary[]> {
    const limit = opts?.limit ?? 20;
    const runType = opts?.runType as AutomationPlaybookRunType | undefined;

    const where: Record<string, unknown> = { projectId };
    if (runType) {
      where.runType = runType;
    }

    const runs = await this.prisma.automationPlaybookRun.findMany({
      where,
      select: {
        id: true,
        runType: true,
        status: true,
        aiUsed: true,
        scopeId: true,
        rulesHash: true,
        createdAt: true,
        // CACHE/REUSE v2: Include reuse tracking fields
        reused: true,
        reusedFromRunId: true,
        aiWorkKey: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return runs.map((run) => ({
      runId: run.id,
      runType: run.runType as AiUsageRunType,
      status: run.status,
      aiUsed: run.aiUsed,
      scopeId: run.scopeId,
      rulesHash: run.rulesHash,
      createdAt: run.createdAt,
      // CACHE/REUSE v2: Reuse tracking
      reused: run.reused,
      reusedFromRunId: run.reusedFromRunId,
      aiWorkKey: run.aiWorkKey,
    }));
  }

  /**
   * Get monthly usage charts for a project.
   * TODO: AI-USAGE-2 - Implement token-based charting
   */
  async getProjectMonthlyUsageCharts(
    _projectId: string,
    _opts?: { months?: number },
  ): Promise<{ message: string }> {
    // Stub for future implementation
    return { message: 'Not implemented. See AI-USAGE-2.' };
  }

  // Helper: Get start of month
  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  // Helper: Get end of month
  private endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }
}
