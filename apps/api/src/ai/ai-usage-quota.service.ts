import { Injectable } from '@nestjs/common';
import { EntitlementsService } from '../billing/entitlements.service';
import { AiUsageLedgerService } from './ai-usage-ledger.service';
import { PlanId } from '../billing/plans';
import { PrismaService } from '../prisma.service';

export type AiUsageQuotaAction = 'PREVIEW_GENERATE' | 'DRAFT_GENERATE';

export type AiUsageQuotaStatus = 'allowed' | 'warning' | 'blocked';

export interface AiUsageQuotaPolicy {
  /**
   * Maximum AI runs per calendar month for this plan.
   * null = unlimited (no plan-level quota).
   */
  monthlyAiRunsLimit: number | null;
  /**
   * Soft warning threshold as a percentage of monthlyAiRunsLimit.
   * Defaults to 80% when not overridden via environment.
   */
  softThresholdPercent: number;
  /**
   * When true and usage is at/above monthlyAiRunsLimit, hard blocking is enabled.
   * Defaults to false (warnings only) for all plans unless explicitly configured.
   */
  hardEnforcementEnabled: boolean;
}

export interface AiUsageQuotaEvaluation {
  projectId: string;
  planId: PlanId;
  action: AiUsageQuotaAction;
  policy: AiUsageQuotaPolicy;
  /**
   * Total AI runs recorded in the ledger for the current calendar month.
   * Derived from AiUsageLedgerService (AutomationPlaybookRun records).
   */
  currentMonthAiRuns: number;
  /**
   * Remaining runs before hitting the hard limit.
   * null when monthlyAiRunsLimit is null (unlimited).
   */
  remainingAiRuns: number | null;
  /**
   * Percentage of monthlyAiRunsLimit consumed.
   * null when monthlyAiRunsLimit is null (unlimited).
   */
  currentUsagePercent: number | null;
  /**
   * High-level status:
   * 'allowed' → below soft threshold, no warning
   * 'warning' → at/above soft threshold but below hard limit
   * 'blocked' → at/above hard limit and hardEnforcementEnabled = true
   */
  status: AiUsageQuotaStatus;
  /**
   * More specific reason for the status; used by frontend messaging.
   */
  reason:
    | 'unlimited'
    | 'below_soft_threshold'
    | 'soft_threshold_reached'
    | 'hard_limit_reached';
}

@Injectable()
export class AiUsageQuotaService {
  private readonly defaultSoftThresholdPercent = 80;

  constructor(
    private readonly entitlementsService: EntitlementsService,
    private readonly aiUsageLedgerService: AiUsageLedgerService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * [ADMIN-OPS-1] Get quota reset offsets for a user in the current month.
   * This incorporates AiMonthlyQuotaReset records without deleting ledger rows.
   */
  private async getQuotaResetOffset(userId: string): Promise<number> {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    const resets = await this.prisma.aiMonthlyQuotaReset.findMany({
      where: {
        userId,
        monthStart,
      },
      select: {
        aiRunsOffset: true,
      },
    });

    return resets.reduce((sum, reset) => sum + reset.aiRunsOffset, 0);
  }

  private getPolicyForPlan(planId: PlanId): AiUsageQuotaPolicy {
    const upper = planId.toUpperCase();
    const limitEnv = process.env[`AI_USAGE_MONTHLY_RUN_LIMIT_${upper}`];
    const softThresholdEnv = process.env.AI_USAGE_SOFT_THRESHOLD_PERCENT;
    const hardEnforcementEnv =
      process.env[`AI_USAGE_HARD_ENFORCEMENT_${upper}`];

    let monthlyAiRunsLimit: number | null = null;
    if (typeof limitEnv === 'string' && limitEnv.trim() !== '') {
      const parsed = Number(limitEnv);
      if (Number.isFinite(parsed) && parsed > 0) {
        monthlyAiRunsLimit = parsed;
      }
    }

    const softThresholdPercent = softThresholdEnv
      ? Math.min(Math.max(Number(softThresholdEnv), 0), 100)
      : this.defaultSoftThresholdPercent;

    const hardEnforcementEnabled =
      typeof hardEnforcementEnv === 'string'
        ? hardEnforcementEnv === 'true'
        : false;

    return {
      monthlyAiRunsLimit,
      softThresholdPercent,
      hardEnforcementEnabled,
    };
  }

  /**
   * Evaluate AI usage quota for a given project + action for the current calendar month.
   * Uses AiUsageLedgerService as the source of truth (AutomationPlaybookRun rows).
   * [ADMIN-OPS-1] Incorporates AiMonthlyQuotaReset offsets without deleting ledger rows.
   */
  async evaluateQuotaForAction(params: {
    userId: string;
    projectId: string;
    action: AiUsageQuotaAction;
  }): Promise<AiUsageQuotaEvaluation> {
    const { userId, projectId, action } = params;

    const planId = await this.entitlementsService.getUserPlan(userId);
    const policy = this.getPolicyForPlan(planId);

    // Ledger summary uses calendar-month window by default (AI-USAGE-1 contract).
    const summary =
      await this.aiUsageLedgerService.getProjectSummary(projectId);
    const ledgerAiRuns = summary.totalAiRuns;

    // [ADMIN-OPS-1] Incorporate quota reset offsets.
    // Adjust currentMonthAiRuns = max(ledgerAiRuns - offsetsSum, 0).
    // This does not weaken the APPLY invariant (APPLY aiUsed must still be treated as violation).
    const offsetsSum = await this.getQuotaResetOffset(userId);
    const currentMonthAiRuns = Math.max(ledgerAiRuns - offsetsSum, 0);

    // Unlimited plans: always allowed, no percentage or remaining.
    if (policy.monthlyAiRunsLimit === null) {
      return {
        projectId,
        planId,
        action,
        policy,
        currentMonthAiRuns,
        remainingAiRuns: null,
        currentUsagePercent: null,
        status: 'allowed',
        reason: 'unlimited',
      };
    }

    const limit = policy.monthlyAiRunsLimit;
    const remainingAiRuns = Math.max(limit - currentMonthAiRuns, 0);
    const currentUsagePercent =
      limit > 0 ? Math.min((currentMonthAiRuns / limit) * 100, 100) : 100;

    // Hard enforcement: once at or above limit, and hardEnforcementEnabled = true, block.
    if (policy.hardEnforcementEnabled && currentMonthAiRuns >= limit) {
      return {
        projectId,
        planId,
        action,
        policy,
        currentMonthAiRuns,
        remainingAiRuns: 0,
        currentUsagePercent,
        status: 'blocked',
        reason: 'hard_limit_reached',
      };
    }

    // Soft threshold: warn when usage is at or above soft threshold.
    if (currentUsagePercent >= policy.softThresholdPercent) {
      return {
        projectId,
        planId,
        action,
        policy,
        currentMonthAiRuns,
        remainingAiRuns,
        currentUsagePercent,
        status: 'warning',
        reason: 'soft_threshold_reached',
      };
    }

    // Below soft threshold: allowed with no warning.
    return {
      projectId,
      planId,
      action,
      policy,
      currentMonthAiRuns,
      remainingAiRuns,
      currentUsagePercent,
      status: 'allowed',
      reason: 'below_soft_threshold',
    };
  }
}
