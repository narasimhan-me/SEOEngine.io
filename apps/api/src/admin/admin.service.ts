import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { ShopifyService } from '../shopify/shopify.service';
import { InternalAdminRole, Prisma } from '@prisma/client';

/**
 * [ADMIN-OPS-1] Admin action types for audit logging.
 */
type AdminActionType =
  | 'impersonation'
  | 'quota_reset'
  | 'plan_override'
  | 'project_resync'
  | 'run_retry'
  | 'admin_role_change'
  | 'user_role_change';

/**
 * [ADMIN-OPS-1] Admin user context from request.
 */
interface AdminUser {
  id: string;
  adminRole: InternalAdminRole;
}

/**
 * [ADMIN-OPS-1] Run filters for getRuns query.
 */
interface RunFilters {
  projectId?: string;
  runType?: string;
  status?: string;
  aiUsed?: boolean;
  reused?: boolean;
  page?: number;
  limit?: number;
}

/**
 * [ADMIN-OPS-1] Audit log filters for getAuditLog query.
 */
interface AuditLogFilters {
  actorId?: string;
  targetUserId?: string;
  targetProjectId?: string;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ShopifyService))
    private readonly shopifyService: ShopifyService
  ) {}

  // ===========================================================================
  // [ADMIN-OPS-1] Audit Logging Helper
  // ===========================================================================

  /**
   * Write an immutable AdminAuditLog entry.
   */
  private async logAdminAction(
    adminUser: AdminUser,
    actionType: AdminActionType,
    options: {
      targetUserId?: string;
      targetProjectId?: string;
      targetRunId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        performedByUserId: adminUser.id,
        performedByAdminRole: adminUser.adminRole,
        actionType,
        targetUserId: options.targetUserId,
        targetProjectId: options.targetProjectId,
        targetRunId: options.targetRunId,
        metadata: (options.metadata ?? null) as Prisma.InputJsonValue | null,
      },
    });
  }

  // ===========================================================================
  // [D1] Overview
  // ===========================================================================

  /**
   * [ADMIN-OPS-1] Get executive snapshot overview.
   * [EA-37] Extended with activation metrics for internal insight.
   * All metrics are derived from existing DB state - no AI calls or job enqueueing.
   */
  async getOverview() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      activeUsersLast7Days,
      shopifyConnectedProjects,
      deoScoreDistribution,
      aiUsageToday,
      aiUsageMonth,
      runsThisMonth,
      failedRunsThisMonth,
      shopifyFailures,
      quotaPressureUsers,
      // [EA-37] Activation metrics
      activatedUsers,
      usersWithProjects,
      usersWithConnectedStores,
      usersWithAppliedDrafts,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),

      // Active users (has any run or usage event within last 7 days)
      this.prisma.user.count({
        where: {
          OR: [
            {
              automationPlaybookRuns: {
                some: { createdAt: { gte: sevenDaysAgo } },
              },
            },
            { aiUsageEvents: { some: { createdAt: { gte: sevenDaysAgo } } } },
          ],
        },
      }),

      // Shopify-connected projects
      this.prisma.project.count({
        where: {
          integrations: { some: { type: 'SHOPIFY' } },
        },
      }),

      // DEO health distribution by score buckets
      this.prisma.$queryRaw<Array<{ bucket: string; count: bigint }>>`
        SELECT
          CASE
            WHEN "currentDeoScore" IS NULL THEN 'not_computed'
            WHEN "currentDeoScore" >= 80 THEN 'excellent'
            WHEN "currentDeoScore" >= 60 THEN 'good'
            WHEN "currentDeoScore" >= 40 THEN 'needs_work'
            ELSE 'poor'
          END as bucket,
          COUNT(*)::bigint as count
        FROM "Project"
        GROUP BY bucket
      `,

      // AI usage today
      this.prisma.automationPlaybookRun.count({
        where: {
          createdAt: { gte: todayStart },
          aiUsed: true,
        },
      }),

      // AI usage this month
      this.prisma.automationPlaybookRun.count({
        where: {
          createdAt: { gte: monthStart },
          aiUsed: true,
        },
      }),

      // Total runs this month
      this.prisma.automationPlaybookRun.count({
        where: { createdAt: { gte: monthStart } },
      }),

      // Failed/stale runs this month
      this.prisma.automationPlaybookRun.count({
        where: {
          createdAt: { gte: monthStart },
          status: { in: ['FAILED', 'STALE'] },
        },
      }),

      // Shopify-related failures
      this.prisma.answerBlockAutomationLog.count({
        where: {
          action: 'answer_blocks_synced_to_shopify',
          status: 'failed',
          createdAt: { gte: sevenDaysAgo },
        },
      }),

      // Quota pressure (users near limit - simplified check)
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT u.id)::bigint as count
        FROM "User" u
        JOIN "Subscription" s ON s."userId" = u.id
        JOIN "AutomationPlaybookRun" r ON r."createdByUserId" = u.id
        WHERE r."createdAt" >= ${monthStart}
        AND r."aiUsed" = true
        GROUP BY u.id, s.plan
        HAVING
          (s.plan = 'free' AND COUNT(r.id) >= 8) OR
          (s.plan = 'starter' AND COUNT(r.id) >= 90) OR
          (s.plan = 'pro' AND COUNT(r.id) >= 450)
      `,

      // [EA-37] Activation: Users who applied at least one draft successfully
      this.prisma.user.count({
        where: {
          automationPlaybookRuns: {
            some: {
              status: 'SUCCEEDED',
              runType: 'APPLY',
            },
          },
        },
      }),

      // [EA-37] Activation: Users with at least one project
      this.prisma.user.count({
        where: {
          projects: { some: {} },
        },
      }),

      // [EA-37] Activation: Users with connected stores
      this.prisma.user.count({
        where: {
          projects: {
            some: {
              integrations: {
                some: {
                  accessToken: { not: null },
                },
              },
            },
          },
        },
      }),

      // [EA-37] Activation: Users who applied drafts in last 30 days
      this.prisma.user.count({
        where: {
          automationPlaybookRuns: {
            some: {
              status: 'SUCCEEDED',
              runType: 'APPLY',
              createdAt: { gte: sevenDaysAgo },
            },
          },
        },
      }),
    ]);

    // Calculate reuse rate
    const reusedRunsThisMonth = await this.prisma.automationPlaybookRun.count({
      where: {
        createdAt: { gte: monthStart },
        reused: true,
      },
    });
    const reuseRate =
      runsThisMonth > 0 ? (reusedRunsThisMonth / runsThisMonth) * 100 : 0;

    // [EA-37] Compute activation rate
    const activationRate = totalUsers > 0
      ? Math.round((activatedUsers / totalUsers) * 100)
      : 0;

    return {
      totalUsers,
      activeUsers: activeUsersLast7Days,
      shopifyConnectedProjects,
      deoHealthDistribution: deoScoreDistribution.reduce(
        (acc, item) => {
          acc[item.bucket] = Number(item.count);
          return acc;
        },
        {} as Record<string, number>
      ),
      aiUsage: {
        today: aiUsageToday,
        month: aiUsageMonth,
        reuseRate: Math.round(reuseRate * 100) / 100,
      },
      quotaPressure: {
        usersNearLimit:
          quotaPressureUsers.length > 0
            ? Number(quotaPressureUsers[0].count)
            : 0,
      },
      errorRates: {
        failedRunsThisMonth,
        shopifyFailuresLast7Days: shopifyFailures,
      },
      // [EA-37] Activation signals - internal metrics for product insight
      activation: {
        activatedUsers,
        activationRate,
        usersWithProjects,
        usersWithConnectedStores,
        usersActivelyOptimizing: usersWithAppliedDrafts,
        // Funnel stages for identifying where users stall
        funnel: {
          signedUp: totalUsers,
          createdProject: usersWithProjects,
          connectedStore: usersWithConnectedStores,
          appliedOptimization: activatedUsers,
        },
      },
    };
  }

  // ===========================================================================
  // [D2] Users
  // ===========================================================================

  /**
   * Get all users with pagination and expanded details.
   */
  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminRole: true,
          accountStatus: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
          _count: {
            select: {
              projects: true,
              automationPlaybookRuns: true,
            },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    // Enrich with AI usage this month and quota percentage
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const aiUsageThisMonth = await this.prisma.automationPlaybookRun.count({
          where: {
            createdByUserId: user.id,
            createdAt: { gte: monthStart },
            aiUsed: true,
          },
        });

        const plan = user.subscription?.plan || 'free';
        const limits: Record<string, number> = {
          free: 10,
          starter: 100,
          pro: 500,
          enterprise: 10000,
        };
        const quotaLimit = limits[plan] || 10;
        const quotaPercent = Math.round((aiUsageThisMonth / quotaLimit) * 100);

        // Get last activity
        const lastRun = await this.prisma.automationPlaybookRun.findFirst({
          where: { createdByUserId: user.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        return {
          ...user,
          aiUsageThisMonth,
          quotaPercent: Math.min(quotaPercent, 100),
          lastActivity: lastRun?.createdAt || user.updatedAt,
        };
      })
    );

    return {
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single user by ID with admin context.
   */
  async getUser(userId: string) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        adminRole: true,
        accountStatus: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        subscription: true,
        projects: {
          select: {
            id: true,
            name: true,
            domain: true,
            currentDeoScore: true,
            createdAt: true,
            _count: {
              select: {
                products: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get usage summary
    const [aiUsageThisMonth, recentRuns] = await Promise.all([
      this.prisma.automationPlaybookRun.count({
        where: {
          createdByUserId: userId,
          createdAt: { gte: monthStart },
          aiUsed: true,
        },
      }),
      this.prisma.automationPlaybookRun.findMany({
        where: { createdByUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          playbookId: true,
          runType: true,
          status: true,
          aiUsed: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      ...user,
      usageSummary: {
        aiUsageThisMonth,
        recentRuns,
      },
    };
  }

  /**
   * [ADMIN-OPS-1] Generate a read-only impersonation token.
   */
  async impersonateUser(
    targetUserId: string,
    adminUser: AdminUser,
    reason?: string
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, role: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Log the impersonation
    await this.logAdminAction(adminUser, 'impersonation', {
      targetUserId,
      metadata: { reason, targetEmail: targetUser.email },
    });

    // Generate read-only impersonation token
    const impersonationPayload = {
      sub: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      impersonation: {
        actorUserId: adminUser.id,
        actorAdminRole: adminUser.adminRole,
        mode: 'readOnly' as const,
        issuedAt: Date.now(),
        reason,
      },
    };

    const token = this.jwtService.sign(impersonationPayload, {
      expiresIn: '1h',
    });

    return {
      token,
      expiresIn: 3600,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
      },
      mode: 'readOnly',
    };
  }

  /**
   * Update user's subscription plan (admin override).
   */
  async updateUserSubscription(
    userId: string,
    planId: string,
    adminUser?: AdminUser
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Log the plan override if admin context is provided
    if (adminUser) {
      await this.logAdminAction(adminUser, 'plan_override', {
        targetUserId: userId,
        metadata: {
          oldPlan: existingSubscription?.plan || 'none',
          newPlan: planId,
        },
      });
    }

    if (existingSubscription) {
      return this.prisma.subscription.update({
        where: { userId },
        data: {
          plan: planId,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        plan: planId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  /**
   * [ADMIN-OPS-1] Reset AI quota for a user without deleting ledger rows.
   */
  async resetUserQuota(userId: string, adminUser: AdminUser, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get current month's first day (UTC)
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    // Count current AI runs for this month
    const currentAiRuns = await this.prisma.automationPlaybookRun.count({
      where: {
        createdByUserId: userId,
        createdAt: { gte: monthStart },
        aiUsed: true,
      },
    });

    // Create the quota reset record
    const reset = await this.prisma.aiMonthlyQuotaReset.create({
      data: {
        userId,
        monthStart,
        aiRunsOffset: currentAiRuns,
        createdByUserId: adminUser.id,
        reason,
      },
    });

    // Log the action
    await this.logAdminAction(adminUser, 'quota_reset', {
      targetUserId: userId,
      metadata: { aiRunsOffset: currentAiRuns, reason },
    });

    return {
      success: true,
      reset: {
        id: reset.id,
        monthStart,
        aiRunsOffset: currentAiRuns,
      },
    };
  }

  /**
   * [ADMIN-OPS-1] Assign or remove internal admin role.
   */
  async updateAdminRole(
    userId: string,
    adminRole: InternalAdminRole | null,
    adminUser: AdminUser
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldRole = user.adminRole;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        adminRole,
        // If assigning an admin role, ensure user role is ADMIN
        ...(adminRole ? { role: 'ADMIN' } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        adminRole: true,
      },
    });

    // Log the action
    await this.logAdminAction(adminUser, 'admin_role_change', {
      targetUserId: userId,
      metadata: { oldRole, newRole: adminRole },
    });

    return updatedUser;
  }

  /**
   * Update user role (legacy endpoint with audit logging).
   */
  async updateUserRole(
    userId: string,
    role: 'USER' | 'ADMIN',
    adminUser?: AdminUser
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldRole = user.role;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (adminUser) {
      await this.logAdminAction(adminUser, 'user_role_change', {
        targetUserId: userId,
        metadata: { oldRole, newRole: role },
      });
    }

    return updatedUser;
  }

  // ===========================================================================
  // [D3] Projects
  // ===========================================================================

  /**
   * Get all projects with admin details.
   */
  async getProjects(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          domain: true,
          currentDeoScore: true,
          lastCrawledAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          integrations: {
            where: { type: 'SHOPIFY' },
            select: {
              externalId: true,
            },
          },
          products: {
            select: {
              lastSyncedAt: true,
            },
            orderBy: { lastSyncedAt: 'desc' },
            take: 1,
          },
          automationPlaybookRuns: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),
      this.prisma.project.count(),
    ]);

    const enrichedProjects = projects.map((project) => ({
      id: project.id,
      name: project.name,
      domain: project.domain,
      user: project.user,
      shopifyStore: project.integrations[0]?.externalId || null,
      deoScore: project.currentDeoScore,
      productCount: project._count.products,
      lastSyncTime: project.products[0]?.lastSyncedAt || null,
      lastRunStatus: project.automationPlaybookRuns[0]?.status || null,
      lastRunTime: project.automationPlaybookRuns[0]?.createdAt || null,
    }));

    return {
      projects: enrichedProjects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * [ADMIN-OPS-1] Trigger a safe resync for a project (no AI side effects).
   */
  async resyncProject(projectId: string, adminUser: AdminUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: { select: { id: true } },
        integrations: { where: { type: 'SHOPIFY' } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.integrations.length) {
      throw new BadRequestException('Project has no Shopify integration');
    }

    // Log the action first
    await this.logAdminAction(adminUser, 'project_resync', {
      targetProjectId: projectId,
    });

    // Trigger safe resync (no AI side effects)
    // This uses the shopifyService with triggerAutomation=false
    await this.shopifyService.syncProducts(projectId, project.user.id, {
      triggerAutomation: false,
    });

    return {
      success: true,
      message: 'Resync initiated (no AI side effects)',
    };
  }

  // ===========================================================================
  // [D4] Runs
  // ===========================================================================

  /**
   * Get runs with filters.
   */
  async getRuns(filters: RunFilters) {
    const {
      projectId,
      runType,
      status,
      aiUsed,
      reused,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (runType) where.runType = runType;
    if (status) where.status = status;
    if (aiUsed !== undefined) where.aiUsed = aiUsed;
    if (reused !== undefined) where.reused = reused;

    const [runs, total] = await Promise.all([
      this.prisma.automationPlaybookRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          projectId: true,
          playbookId: true,
          runType: true,
          status: true,
          aiUsed: true,
          reused: true,
          createdAt: true,
          project: {
            select: {
              name: true,
              user: {
                select: { email: true },
              },
            },
          },
        },
      }),
      this.prisma.automationPlaybookRun.count({ where }),
    ]);

    return {
      runs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get run detail with redacted inputs.
   */
  async getRun(runId: string) {
    const run = await this.prisma.automationPlaybookRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        projectId: true,
        playbookId: true,
        runType: true,
        status: true,
        aiUsed: true,
        reused: true,
        reusedFromRunId: true,
        errorCode: true,
        errorMessage: true,
        resultRef: true,
        meta: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            name: true,
            domain: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Run not found');
    }

    // Redact sensitive fields from meta
    const redactedMeta = run.meta
      ? this.redactSensitiveFields(run.meta as Record<string, unknown>)
      : null;

    return {
      ...run,
      meta: redactedMeta,
    };
  }

  /**
   * [ADMIN-OPS-1] Retry a failed run (safe runs only).
   */
  async retryRun(runId: string, adminUser: AdminUser) {
    const run = await this.prisma.automationPlaybookRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      throw new NotFoundException('Run not found');
    }

    if (!['FAILED', 'STALE'].includes(run.status)) {
      throw new BadRequestException('Only failed or stale runs can be retried');
    }

    // Only allow retry for non-AI-heavy run types
    const safeRetryTypes = ['PREVIEW_GENERATE'];
    if (!safeRetryTypes.includes(run.runType)) {
      throw new BadRequestException(
        'This run type cannot be safely retried from admin'
      );
    }

    // Log the action
    await this.logAdminAction(adminUser, 'run_retry', {
      targetRunId: runId,
      targetProjectId: run.projectId,
      metadata: { runType: run.runType, originalStatus: run.status },
    });

    // Reset the run status to QUEUED for retry
    const updatedRun = await this.prisma.automationPlaybookRun.update({
      where: { id: runId },
      data: {
        status: 'QUEUED',
        errorCode: null,
        errorMessage: null,
      },
    });

    return {
      success: true,
      run: {
        id: updatedRun.id,
        status: updatedRun.status,
      },
    };
  }

  // ===========================================================================
  // [D5] Issues
  // ===========================================================================

  /**
   * Get global issues summary (derived, no AI calls).
   */
  async getIssuesSummary() {
    // Count products with missing SEO as a proxy for issues
    const [
      productsMissingSeoTitle,
      productsMissingSeoDescription,
      productsWithBothMissing,
    ] = await Promise.all([
      this.prisma.product.count({
        where: { seoTitle: null },
      }),
      this.prisma.product.count({
        where: { seoDescription: null },
      }),
      this.prisma.product.count({
        where: {
          AND: [{ seoTitle: null }, { seoDescription: null }],
        },
      }),
    ]);

    return {
      summary: {
        missingSeoTitle: productsMissingSeoTitle,
        missingSeoDescription: productsMissingSeoDescription,
        missingBothSeoFields: productsWithBothMissing,
      },
      derivedAt: new Date().toISOString(),
    };
  }

  // ===========================================================================
  // [D6] AI Usage
  // ===========================================================================

  /**
   * Get AI usage metrics with APPLY invariant check.
   */
  async getAiUsage() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      usageByPlan,
      topConsumers,
      totalAiRuns,
      reusedRuns,
      applyRunsWithAi,
    ] = await Promise.all([
      // Usage by plan
      this.prisma.$queryRaw<Array<{ plan: string; count: bigint }>>`
        SELECT COALESCE(s.plan, 'free') as plan, COUNT(r.id)::bigint as count
        FROM "AutomationPlaybookRun" r
        JOIN "User" u ON r."createdByUserId" = u.id
        LEFT JOIN "Subscription" s ON s."userId" = u.id
        WHERE r."createdAt" >= ${monthStart}
        AND r."aiUsed" = true
        GROUP BY COALESCE(s.plan, 'free')
      `,

      // Top 10 consumers this month
      this.prisma.$queryRaw<
        Array<{ userId: string; email: string; count: bigint }>
      >`
        SELECT u.id as "userId", u.email, COUNT(r.id)::bigint as count
        FROM "AutomationPlaybookRun" r
        JOIN "User" u ON r."createdByUserId" = u.id
        WHERE r."createdAt" >= ${monthStart}
        AND r."aiUsed" = true
        GROUP BY u.id, u.email
        ORDER BY count DESC
        LIMIT 10
      `,

      // Total AI runs this month
      this.prisma.automationPlaybookRun.count({
        where: { createdAt: { gte: monthStart }, aiUsed: true },
      }),

      // Reused runs this month
      this.prisma.automationPlaybookRun.count({
        where: { createdAt: { gte: monthStart }, reused: true },
      }),

      // [ADMIN-OPS-1] APPLY invariant check: APPLY runs with aiUsed=true
      this.prisma.automationPlaybookRun.count({
        where: {
          runType: 'APPLY',
          aiUsed: true,
        },
      }),
    ]);

    const reuseRate = totalAiRuns > 0 ? (reusedRuns / totalAiRuns) * 100 : 0;

    return {
      usageByPlan: usageByPlan.reduce(
        (acc, item) => {
          acc[item.plan] = Number(item.count);
          return acc;
        },
        {} as Record<string, number>
      ),
      topConsumers: topConsumers.map((c) => ({
        userId: c.userId,
        email: c.email,
        aiRunsThisMonth: Number(c.count),
      })),
      reuseEffectiveness: {
        totalAiRuns,
        reusedRuns,
        reuseRate: Math.round(reuseRate * 100) / 100,
      },
      // [ADMIN-OPS-1] Red alert if ANY APPLY run has aiUsed=true
      applyInvariantRedAlert: applyRunsWithAi > 0,
      applyRunsWithAiCount: applyRunsWithAi,
    };
  }

  // ===========================================================================
  // [D7] System Health
  // ===========================================================================

  /**
   * Get system health signals.
   */
  async getSystemHealth() {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const [queuedRuns, stalledRuns, recentFailures, shopifyFailures] =
      await Promise.all([
        // Runs currently queued
        this.prisma.automationPlaybookRun.count({
          where: { status: 'QUEUED' },
        }),

        // Runs that have been queued for more than 1 hour
        this.prisma.automationPlaybookRun.count({
          where: {
            status: 'QUEUED',
            createdAt: { lt: oneHourAgo },
          },
        }),

        // Recent failures (last hour)
        this.prisma.automationPlaybookRun.count({
          where: {
            status: 'FAILED',
            updatedAt: { gte: oneHourAgo },
          },
        }),

        // Shopify sync failures (last 24 hours)
        this.prisma.answerBlockAutomationLog.count({
          where: {
            action: 'answer_blocks_synced_to_shopify',
            status: 'failed',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

    return {
      queueHealth: {
        queuedRuns,
        stalledRuns,
        jobLagWarning: stalledRuns > 0,
      },
      failureSignals: {
        recentFailures,
        shopifyFailures24h: shopifyFailures,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  // ===========================================================================
  // [D8] Audit Log
  // ===========================================================================

  /**
   * Get audit log with filters.
   */
  async getAuditLog(filters: AuditLogFilters) {
    const {
      actorId,
      targetUserId,
      targetProjectId,
      actionType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (actorId) where.performedByUserId = actorId;
    if (targetUserId) where.targetUserId = targetUserId;
    if (targetProjectId) where.targetProjectId = targetProjectId;
    if (actionType) where.actionType = actionType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          performedByUserId: true,
          performedByAdminRole: true,
          actionType: true,
          targetUserId: true,
          targetProjectId: true,
          targetRunId: true,
          metadata: true,
          performedBy: {
            select: { email: true },
          },
          targetUser: {
            select: { email: true },
          },
          targetProject: {
            select: { name: true },
          },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ===========================================================================
  // [D9] Governance Audit Events (ENTERPRISE-GEO-1)
  // ===========================================================================

  /**
   * [ENTERPRISE-GEO-1] Get governance audit events with filters.
   * Read-only access to project-level governance audit events.
   */
  async getGovernanceAuditEvents(filters: {
    projectId?: string;
    actorUserId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      projectId,
      actorUserId,
      eventType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (actorUserId) where.actorUserId = actorUserId;
    if (eventType) where.eventType = eventType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [events, total] = await Promise.all([
      this.prisma.governanceAuditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          eventType: true,
          actorUserId: true,
          resourceType: true,
          resourceId: true,
          metadata: true,
          projectId: true,
          project: {
            select: { name: true },
          },
        },
      }),
      this.prisma.governanceAuditEvent.count({ where }),
    ]);

    // Enrich with actor email if available
    const userIds = [
      ...new Set(events.map((e) => e.actorUserId).filter(Boolean)),
    ];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds as string[] } },
            select: { id: true, email: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u.email]));

    const enrichedEvents = events.map((event) => ({
      id: event.id,
      createdAt: event.createdAt,
      eventType: event.eventType,
      actorUserId: event.actorUserId,
      actorEmail: event.actorUserId
        ? userMap.get(event.actorUserId) || null
        : null,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      projectId: event.projectId,
      projectName: event.project?.name || null,
      // Redact any sensitive fields from metadata
      metadata: event.metadata
        ? this.redactSensitiveFields(event.metadata as Record<string, unknown>)
        : null,
    }));

    return {
      events: enrichedEvents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ===========================================================================
  // Legacy/Stats
  // ===========================================================================

  /**
   * Get dashboard statistics (legacy endpoint).
   */
  async getStats() {
    const [
      totalUsers,
      totalProjects,
      usersToday,
      usersByRole,
      subscriptionsByPlan,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.project.count(),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.subscription.groupBy({
        by: ['plan'],
        _count: true,
      }),
    ]);

    return {
      totalUsers,
      totalProjects,
      usersToday,
      usersByRole: usersByRole.reduce(
        (acc, item) => {
          acc[item.role] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      subscriptionsByPlan: subscriptionsByPlan.reduce(
        (acc, item) => {
          acc[item.plan] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  // ===========================================================================
  // [D10] Automation Oversight (EA-48) - Read-Only
  // ===========================================================================

  /**
   * [EA-48] Get automation run history with enhanced details.
   * Read-only view of automation runs including playbook info, scope, and outcomes.
   */
  async getAutomationRuns(filters: {
    projectId?: string;
    playbookId?: string;
    runType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      projectId,
      playbookId,
      runType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (playbookId) where.playbookId = playbookId;
    if (runType) where.runType = runType;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [runs, total] = await Promise.all([
      this.prisma.automationPlaybookRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          projectId: true,
          playbookId: true,
          runType: true,
          status: true,
          aiUsed: true,
          reused: true,
          errorCode: true,
          errorMessage: true,
          scopeId: true,
          resultRef: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: {
              name: true,
              domain: true,
              user: { select: { id: true, email: true } },
            },
          },
          createdBy: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      this.prisma.automationPlaybookRun.count({ where }),
    ]);

    // Enrich with scope details if available
    const enrichedRuns = runs.map((run) => ({
      id: run.id,
      projectId: run.projectId,
      projectName: run.project.name,
      projectDomain: run.project.domain,
      ownerEmail: run.project.user.email,
      playbookId: run.playbookId,
      runType: run.runType,
      status: run.status,
      aiUsed: run.aiUsed,
      reused: run.reused,
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      scopeId: run.scopeId,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      createdBy: run.createdBy
        ? {
            id: run.createdBy.id,
            email: run.createdBy.email,
            name: run.createdBy.name,
          }
        : null,
    }));

    return {
      runs: enrichedRuns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * [EA-48] Get automation scopes and their boundaries.
   * Read-only view of what areas automation can affect.
   */
  async getAutomationScopes(filters: {
    projectId?: string;
    page?: number;
    limit?: number;
  }) {
    const { projectId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (projectId) where.projectId = projectId;

    // Get unique scopes from recent drafts
    const [drafts, total] = await Promise.all([
      this.prisma.automationPlaybookDraft.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        distinct: ['scopeId'],
        select: {
          id: true,
          projectId: true,
          playbookId: true,
          scopeId: true,
          rulesHash: true,
          status: true,
          counts: true,
          appliedAt: true,
          expiresAt: true,
          createdAt: true,
          project: {
            select: {
              name: true,
              domain: true,
            },
          },
        },
      }),
      this.prisma.automationPlaybookDraft.count({
        where,
      }),
    ]);

    const scopes = drafts.map((draft) => {
      // Extract counts from JSON field if available
      const counts = (draft.counts as Record<string, number>) || {};
      return {
        draftId: draft.id,
        projectId: draft.projectId,
        projectName: draft.project.name,
        projectDomain: draft.project.domain,
        playbookId: draft.playbookId,
        scopeId: draft.scopeId,
        rulesHash: draft.rulesHash,
        status: draft.status,
        boundaries: {
          affectedTotal: counts.affectedTotal ?? 0,
          draftGenerated: counts.draftGenerated ?? 0,
        },
        applied: !!draft.appliedAt,
        appliedAt: draft.appliedAt,
        expired: draft.expiresAt ? draft.expiresAt < new Date() : false,
        expiresAt: draft.expiresAt,
        createdAt: draft.createdAt,
      };
    });

    return {
      scopes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * [EA-48] Get automation limits and thresholds.
   * Read-only view of rate limits, budgets, and execution constraints.
   */
  async getAutomationLimits() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get usage by plan for current month
    const usageByPlan = await this.prisma.$queryRaw<
      Array<{ plan: string; userCount: bigint; totalRuns: bigint; aiRuns: bigint }>
    >`
      SELECT
        COALESCE(s.plan, 'free') as plan,
        COUNT(DISTINCT u.id)::bigint as "userCount",
        COUNT(r.id)::bigint as "totalRuns",
        SUM(CASE WHEN r."aiUsed" = true THEN 1 ELSE 0 END)::bigint as "aiRuns"
      FROM "User" u
      LEFT JOIN "Subscription" s ON s."userId" = u.id
      LEFT JOIN "AutomationPlaybookRun" r ON r."createdByUserId" = u.id
        AND r."createdAt" >= ${monthStart}
      GROUP BY COALESCE(s.plan, 'free')
    `;

    // Plan limits configuration (read-only reference)
    const planLimits = {
      free: { aiRunsPerMonth: 10, maxExecutionsPerDay: 10 },
      starter: { aiRunsPerMonth: 100, maxExecutionsPerDay: 50 },
      pro: { aiRunsPerMonth: 500, maxExecutionsPerDay: 200 },
      enterprise: { aiRunsPerMonth: -1, maxExecutionsPerDay: -1 }, // -1 = unlimited
    };

    // Get quota resets this month
    const quotaResets = await this.prisma.aiMonthlyQuotaReset.count({
      where: { monthStart: { gte: monthStart } },
    });

    // Get users near quota limit
    const usersNearLimit = await this.prisma.$queryRaw<
      Array<{ userId: string; email: string; plan: string; aiRuns: bigint; limit: number }>
    >`
      SELECT
        u.id as "userId",
        u.email,
        COALESCE(s.plan, 'free') as plan,
        COUNT(r.id)::bigint as "aiRuns",
        CASE
          WHEN s.plan = 'enterprise' THEN -1
          WHEN s.plan = 'pro' THEN 500
          WHEN s.plan = 'starter' THEN 100
          ELSE 10
        END as limit
      FROM "User" u
      LEFT JOIN "Subscription" s ON s."userId" = u.id
      LEFT JOIN "AutomationPlaybookRun" r ON r."createdByUserId" = u.id
        AND r."createdAt" >= ${monthStart}
        AND r."aiUsed" = true
      GROUP BY u.id, u.email, s.plan
      HAVING
        CASE
          WHEN s.plan = 'enterprise' THEN false
          WHEN s.plan = 'pro' THEN COUNT(r.id) >= 450
          WHEN s.plan = 'starter' THEN COUNT(r.id) >= 90
          ELSE COUNT(r.id) >= 8
        END
      ORDER BY "aiRuns" DESC
      LIMIT 20
    `;

    return {
      planLimits,
      currentMonthUsage: usageByPlan.map((p) => ({
        plan: p.plan,
        userCount: Number(p.userCount),
        totalRuns: Number(p.totalRuns),
        aiRuns: Number(p.aiRuns),
        limit: planLimits[p.plan as keyof typeof planLimits]?.aiRunsPerMonth ?? 10,
      })),
      quotaResetsThisMonth: quotaResets,
      usersNearLimit: usersNearLimit.map((u) => ({
        userId: u.userId,
        email: u.email,
        plan: u.plan,
        aiRuns: Number(u.aiRuns),
        limit: u.limit,
        percentUsed: u.limit === -1 ? 0 : Math.round((Number(u.aiRuns) / u.limit) * 100),
      })),
      evaluatedAt: new Date().toISOString(),
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Redact sensitive fields from metadata.
   */
  private redactSensitiveFields(
    obj: Record<string, unknown>
  ): Record<string, unknown> {
    const sensitiveKeys = [
      'token',
      'secret',
      'password',
      'apiKey',
      'accessToken',
      'credential',
    ];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (
        sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))
      ) {
        result[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.redactSensitiveFields(
          value as Record<string, unknown>
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
