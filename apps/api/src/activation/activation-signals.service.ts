import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ActivationMilestoneId,
  MilestoneState,
  UserActivationStatus,
  ActivationTier,
  SuccessIndicator,
  ProjectSuccessMetrics,
  ActivationFunnelStage,
  ActivationFunnelSummary,
  StallSignal,
} from './activation-signals.types';

/**
 * [EA-37] Activation Signals Service
 *
 * Computes activation milestones and success indicators from existing data.
 * All metrics are derived - no separate event storage needed.
 *
 * Design principles:
 * - Metrics reflect user outcomes, not activity volume
 * - Signals do not pressure or shame users
 * - Internal-only (admin dashboards), no user-facing scores
 * - No gamification elements
 *
 * Trust Contract:
 * - Success indicators align to actual user value
 * - Stall detection is for internal support, not user-facing alerts
 */
@Injectable()
export class ActivationSignalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // User Activation Status
  // ===========================================================================

  /**
   * Compute activation status for a specific user.
   * Derives all milestones from existing database state.
   */
  async getUserActivationStatus(userId: string): Promise<UserActivationStatus | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const milestones = await this.computeMilestonesForUser(userId, user.createdAt);
    const completedCount = milestones.filter(m => m.status === 'completed').length;
    const activationTier = this.computeActivationTier(milestones);

    const now = new Date();
    const daysSinceSignup = Math.floor(
      (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // User is "activated" when they've applied at least one optimization
    const isActivated = milestones.some(
      m => m.milestoneId === 'first_draft_applied' && m.status === 'completed'
    );

    return {
      userId: user.id,
      signupAt: user.createdAt,
      daysSinceSignup,
      milestones,
      completedMilestoneCount: completedCount,
      totalMilestoneCount: milestones.length,
      isActivated,
      activationTier,
      computedAt: now,
    };
  }

  /**
   * Compute all milestone states for a user.
   */
  private async computeMilestonesForUser(
    userId: string,
    signupAt: Date
  ): Promise<MilestoneState[]> {
    // Fetch all relevant data in parallel
    const [
      firstProject,
      firstIntegration,
      firstCrawl,
      firstDeoScore,
      firstIssue,
      firstDraft,
      firstAppliedDraft,
      firstAppliedProduct,
    ] = await Promise.all([
      // First project created
      this.prisma.project.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      // First store connected (any integration with accessToken)
      this.prisma.integration.findFirst({
        where: {
          project: { userId },
          accessToken: { not: null },
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      // First crawl completed
      this.prisma.crawlResult.findFirst({
        where: { project: { userId } },
        orderBy: { scannedAt: 'asc' },
        select: { scannedAt: true },
      }),
      // First DEO score computed
      this.prisma.deoScoreSnapshot.findFirst({
        where: { project: { userId } },
        orderBy: { computedAt: 'asc' },
        select: { computedAt: true },
      }),
      // First issue identified (from crawl results with issues)
      this.prisma.crawlResult.findFirst({
        where: {
          project: { userId },
          issues: { not: { equals: [] } },
        },
        orderBy: { scannedAt: 'asc' },
        select: { scannedAt: true },
      }),
      // First draft generated
      this.prisma.automationPlaybookDraft.findFirst({
        where: { project: { userId } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      // First draft applied
      this.prisma.automationPlaybookDraft.findFirst({
        where: {
          project: { userId },
          appliedAt: { not: null },
        },
        orderBy: { appliedAt: 'asc' },
        select: { appliedAt: true },
      }),
      // First product with SEO applied
      this.prisma.product.findFirst({
        where: {
          project: { userId },
          OR: [
            { seoTitle: { not: null } },
            { seoDescription: { not: null } },
          ],
        },
        orderBy: { lastSyncedAt: 'asc' },
        select: { lastSyncedAt: true },
      }),
    ]);

    const computeDaysToComplete = (completedAt: Date | null): number | null => {
      if (!completedAt) return null;
      return Math.floor(
        (completedAt.getTime() - signupAt.getTime()) / (1000 * 60 * 60 * 24)
      );
    };

    const milestones: MilestoneState[] = [
      {
        milestoneId: 'project_created',
        status: firstProject ? 'completed' : 'not_started',
        completedAt: firstProject?.createdAt ?? null,
        daysToComplete: computeDaysToComplete(firstProject?.createdAt ?? null),
      },
      {
        milestoneId: 'store_connected',
        status: firstIntegration ? 'completed' : 'not_started',
        completedAt: firstIntegration?.createdAt ?? null,
        daysToComplete: computeDaysToComplete(firstIntegration?.createdAt ?? null),
      },
      {
        milestoneId: 'first_crawl_completed',
        status: firstCrawl ? 'completed' : 'not_started',
        completedAt: firstCrawl?.scannedAt ?? null,
        daysToComplete: computeDaysToComplete(firstCrawl?.scannedAt ?? null),
      },
      {
        milestoneId: 'first_deo_score_computed',
        status: firstDeoScore ? 'completed' : 'not_started',
        completedAt: firstDeoScore?.computedAt ?? null,
        daysToComplete: computeDaysToComplete(firstDeoScore?.computedAt ?? null),
      },
      {
        milestoneId: 'first_issue_identified',
        status: firstIssue ? 'completed' : 'not_started',
        completedAt: firstIssue?.scannedAt ?? null,
        daysToComplete: computeDaysToComplete(firstIssue?.scannedAt ?? null),
      },
      {
        milestoneId: 'first_draft_generated',
        status: firstDraft ? 'completed' : 'not_started',
        completedAt: firstDraft?.createdAt ?? null,
        daysToComplete: computeDaysToComplete(firstDraft?.createdAt ?? null),
      },
      {
        milestoneId: 'first_draft_applied',
        status: firstAppliedDraft ? 'completed' : 'not_started',
        completedAt: firstAppliedDraft?.appliedAt ?? null,
        daysToComplete: computeDaysToComplete(firstAppliedDraft?.appliedAt ?? null),
      },
      {
        milestoneId: 'first_optimization_live',
        status: firstAppliedProduct ? 'completed' : 'not_started',
        completedAt: firstAppliedProduct?.lastSyncedAt ?? null,
        daysToComplete: computeDaysToComplete(firstAppliedProduct?.lastSyncedAt ?? null),
      },
    ];

    return milestones;
  }

  /**
   * Compute activation tier based on milestone completion.
   */
  private computeActivationTier(milestones: MilestoneState[]): ActivationTier {
    const completed = new Set(
      milestones.filter(m => m.status === 'completed').map(m => m.milestoneId)
    );

    if (completed.has('first_optimization_live') && completed.size >= 6) {
      return 'successful';
    }
    if (completed.has('first_draft_applied')) {
      return 'activated';
    }
    if (completed.has('store_connected')) {
      return 'connected';
    }
    if (completed.has('project_created')) {
      return 'exploring';
    }
    return 'new';
  }

  // ===========================================================================
  // Project Success Metrics
  // ===========================================================================

  /**
   * Compute success metrics for a project.
   * All indicators measure real user value, not activity volume.
   */
  async getProjectSuccessMetrics(projectId: string): Promise<ProjectSuccessMetrics | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });

    if (!project) {
      return null;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      productsOptimized,
      pagesWithMetadata,
      appliedDraftsThisMonth,
      currentDeoScore,
      previousDeoScore,
    ] = await Promise.all([
      // Products with SEO applied
      this.prisma.product.count({
        where: {
          projectId,
          OR: [
            { seoTitle: { not: null } },
            { seoDescription: { not: null } },
          ],
        },
      }),
      // Pages with metadata (from crawl results)
      this.prisma.crawlResult.count({
        where: {
          projectId,
          OR: [
            { title: { not: null } },
            { metaDescription: { not: null } },
          ],
        },
      }),
      // Drafts applied in last 30 days
      this.prisma.automationPlaybookDraft.count({
        where: {
          projectId,
          appliedAt: { gte: thirtyDaysAgo },
        },
      }),
      // Current DEO score
      this.prisma.deoScoreSnapshot.findFirst({
        where: { projectId },
        orderBy: { computedAt: 'desc' },
        select: { overallScore: true },
      }),
      // DEO score 30 days ago
      this.prisma.deoScoreSnapshot.findFirst({
        where: {
          projectId,
          computedAt: { lte: thirtyDaysAgo },
        },
        orderBy: { computedAt: 'desc' },
        select: { overallScore: true },
      }),
    ]);

    const indicators: SuccessIndicator[] = [
      {
        indicatorId: 'products_optimized',
        label: 'Products with SEO metadata',
        value: productsOptimized,
        periodLabel: 'Total',
      },
      {
        indicatorId: 'pages_optimized',
        label: 'Pages with metadata',
        value: pagesWithMetadata,
        periodLabel: 'Total',
      },
      {
        indicatorId: 'drafts_applied',
        label: 'Optimizations applied',
        value: appliedDraftsThisMonth,
        periodLabel: 'Last 30 days',
      },
      {
        indicatorId: 'deo_score_improved',
        label: 'Discovery Score',
        value: currentDeoScore?.overallScore ?? 0,
        previousValue: previousDeoScore?.overallScore,
        periodLabel: '30-day change',
      },
    ];

    // Determine health status based on recent activity
    let healthStatus: 'healthy' | 'stalled' | 'at_risk' = 'healthy';
    if (appliedDraftsThisMonth === 0 && productsOptimized === 0) {
      healthStatus = 'at_risk';
    } else if (appliedDraftsThisMonth === 0) {
      healthStatus = 'stalled';
    }

    return {
      projectId: project.id,
      projectName: project.name,
      indicators,
      healthStatus,
      computedAt: now,
    };
  }

  // ===========================================================================
  // Activation Funnel (Admin Analytics)
  // ===========================================================================

  /**
   * Compute activation funnel for admin dashboard.
   * Shows where users stall without exposing this to end users.
   */
  async getActivationFunnel(
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<ActivationFunnelSummary> {
    const now = new Date();
    const start = periodStart ?? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const end = periodEnd ?? now;

    // Get all users who signed up in the period
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: { id: true, createdAt: true },
    });

    const totalUsers = users.length;
    if (totalUsers === 0) {
      return {
        totalUsers: 0,
        stages: [],
        biggestDropoff: null,
        periodStart: start,
        periodEnd: end,
        computedAt: now,
      };
    }

    // Compute milestones for all users
    const userStatuses = await Promise.all(
      users.map(u => this.getUserActivationStatus(u.id))
    );

    // Aggregate by milestone
    const milestoneCounts = new Map<ActivationMilestoneId, number>();
    const milestoneOrder: ActivationMilestoneId[] = [
      'project_created',
      'store_connected',
      'first_crawl_completed',
      'first_deo_score_computed',
      'first_issue_identified',
      'first_draft_generated',
      'first_draft_applied',
      'first_optimization_live',
    ];

    for (const milestone of milestoneOrder) {
      milestoneCounts.set(milestone, 0);
    }

    for (const status of userStatuses) {
      if (!status) continue;
      for (const milestone of status.milestones) {
        if (milestone.status === 'completed') {
          milestoneCounts.set(
            milestone.milestoneId,
            (milestoneCounts.get(milestone.milestoneId) ?? 0) + 1
          );
        }
      }
    }

    const milestoneLabels: Record<ActivationMilestoneId, string> = {
      project_created: 'Created project',
      store_connected: 'Connected store',
      first_crawl_completed: 'First crawl',
      first_deo_score_computed: 'First score',
      first_issue_identified: 'Issues found',
      first_draft_generated: 'Draft generated',
      first_draft_applied: 'Draft applied',
      first_optimization_live: 'Optimization live',
    };

    const stages: ActivationFunnelStage[] = milestoneOrder.map(milestone => ({
      milestoneId: milestone,
      label: milestoneLabels[milestone],
      userCount: milestoneCounts.get(milestone) ?? 0,
      percentage: Math.round(((milestoneCounts.get(milestone) ?? 0) / totalUsers) * 100),
      medianDaysFromPrevious: null, // Would need more complex calculation
    }));

    // Find biggest drop-off
    let biggestDropoff: ActivationMilestoneId | null = null;
    let biggestDrop = 0;
    for (let i = 1; i < stages.length; i++) {
      const drop = stages[i - 1].percentage - stages[i].percentage;
      if (drop > biggestDrop) {
        biggestDrop = drop;
        biggestDropoff = stages[i].milestoneId;
      }
    }

    return {
      totalUsers,
      stages,
      biggestDropoff,
      periodStart: start,
      periodEnd: end,
      computedAt: now,
    };
  }

  // ===========================================================================
  // Stall Detection (Internal Support)
  // ===========================================================================

  /**
   * Identify users who may be stalled.
   * For internal support use only - not exposed to users.
   */
  async getStalledUsers(daysThreshold = 7, limit = 50): Promise<StallSignal[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    // Find users with projects but no recent activity
    const stalledUsers = await this.prisma.user.findMany({
      where: {
        projects: { some: {} },
        automationPlaybookRuns: {
          none: { createdAt: { gte: thresholdDate } },
        },
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        automationPlaybookRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { playbookId: true, createdAt: true },
        },
        projects: {
          select: {
            integrations: {
              where: { accessToken: { not: null } },
              take: 1,
            },
          },
        },
      },
      take: limit,
    });

    const signals: StallSignal[] = [];

    for (const user of stalledUsers) {
      const status = await this.getUserActivationStatus(user.id);
      if (!status) continue;

      // Find the last incomplete milestone
      const incompleteMilestones = status.milestones.filter(
        m => m.status !== 'completed'
      );
      if (incompleteMilestones.length === 0) continue;

      const stalledAt = incompleteMilestones[0].milestoneId;

      const lastRun = user.automationPlaybookRuns[0];
      const lastActionAt = lastRun?.createdAt ?? user.createdAt;
      const daysSinceLastActivity = Math.floor(
        (new Date().getTime() - lastActionAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine intervention level based on stall point and duration
      let suggestedIntervention: StallSignal['suggestedIntervention'] = 'none';
      if (daysSinceLastActivity >= 14) {
        suggestedIntervention = 'support_outreach';
      } else if (daysSinceLastActivity >= 7) {
        suggestedIntervention = 'soft_nudge';
      }

      signals.push({
        userId: user.id,
        userEmail: user.email,
        stalledAtMilestone: stalledAt,
        daysSinceLastActivity,
        lastAction: lastRun ? `Ran ${lastRun.playbookId}` : 'Signed up',
        lastActionAt,
        suggestedIntervention,
      });
    }

    return signals;
  }

  // ===========================================================================
  // Aggregate Metrics (Admin Overview)
  // ===========================================================================

  /**
   * Get aggregate activation metrics for admin overview.
   */
  async getActivationOverview(): Promise<{
    totalUsers: number;
    activatedUsers: number;
    activationRate: number;
    tierDistribution: Record<ActivationTier, number>;
    averageDaysToActivation: number | null;
  }> {
    const totalUsers = await this.prisma.user.count();

    // Users with at least one applied draft (our activation definition)
    const activatedUsers = await this.prisma.user.count({
      where: {
        automationPlaybookRuns: {
          some: {
            status: 'SUCCEEDED',
            runType: 'APPLY',
          },
        },
      },
    });

    const activationRate = totalUsers > 0
      ? Math.round((activatedUsers / totalUsers) * 100)
      : 0;

    // For tier distribution and avg days, sample recent users
    const recentUsers = await this.prisma.user.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const tierCounts: Record<ActivationTier, number> = {
      new: 0,
      exploring: 0,
      connected: 0,
      activated: 0,
      successful: 0,
    };

    const daysToActivation: number[] = [];

    for (const user of recentUsers) {
      const status = await this.getUserActivationStatus(user.id);
      if (status) {
        tierCounts[status.activationTier]++;
        const appliedMilestone = status.milestones.find(
          m => m.milestoneId === 'first_draft_applied' && m.status === 'completed'
        );
        if (appliedMilestone?.daysToComplete !== null) {
          daysToActivation.push(appliedMilestone.daysToComplete);
        }
      }
    }

    const averageDaysToActivation = daysToActivation.length > 0
      ? Math.round(daysToActivation.reduce((a, b) => a + b, 0) / daysToActivation.length)
      : null;

    return {
      totalUsers,
      activatedUsers,
      activationRate,
      tierDistribution: tierCounts,
      averageDaysToActivation,
    };
  }
}
