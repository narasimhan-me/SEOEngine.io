import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthService } from '../auth/auth.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { RoleResolutionService } from '../common/role-resolution.service';

/**
 * [SELF-SERVICE-1] Profile data transfer objects
 */
export interface ProfileResponse {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  locale: string | null;
  organizationName: string | null;
  accountRole: string;
  lastLoginAt: Date | null;
}

export interface UpdateProfileDto {
  name?: string;
  avatarUrl?: string | null;
  timezone?: string | null;
  locale?: string | null;
  organizationName?: string | null;
}

/**
 * [SELF-SERVICE-1] Preferences data transfer objects
 */
export interface PreferencesResponse {
  notifyQuotaWarnings: boolean;
  notifyRunFailures: boolean;
  notifyWeeklyDeoSummary: boolean;
  autoOpenIssuesTab: boolean;
  preferredPillarLanding: string | null;
}

export interface UpdatePreferencesDto {
  notifyQuotaWarnings?: boolean;
  notifyRunFailures?: boolean;
  notifyWeeklyDeoSummary?: boolean;
  autoOpenIssuesTab?: boolean;
  preferredPillarLanding?: string | null;
}

/**
 * [SELF-SERVICE-1] AI Usage summary response
 */
export interface AiUsageSummaryResponse {
  month: string; // e.g., "2025-12"
  periodLabel: string; // e.g., "December 2025"
  totalRuns: number;
  aiUsedRuns: number;
  reusedRuns: number;
  runsAvoided: number; // Savings from reuse
  quotaLimit: number | null; // Plan-based AI quota (null = unlimited)
  quotaUsedPercent: number; // Percentage of quota consumed
  applyInvariantViolations: number; // Should always be 0 - "APPLY never uses AI"
  applyInvariantMessage: string;
  reuseMessage: string;
}

/**
 * [SELF-SERVICE-1] Connected store response
 */
export interface ConnectedStoreResponse {
  projectId: string;
  projectName: string;
  storeDomain: string | null;
  integrationType: string;
  integrationId: string;
  connectedAt: Date;
}

/**
 * [SELF-SERVICE-1] Session response
 */
export interface SessionResponse {
  id: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  ip: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

/**
 * [BILLING-GTM-1] Parse AI quota limit from environment variable.
 * Pattern: AI_USAGE_MONTHLY_RUN_LIMIT_${PLAN_ID}
 * Returns null (unlimited) if missing, blank, non-positive, or non-numeric.
 */
function getAiQuotaLimitFromEnv(planId: string): number | null {
  const envKey = `AI_USAGE_MONTHLY_RUN_LIMIT_${planId.toUpperCase()}`;
  const envValue = process.env[envKey];

  if (!envValue || envValue.trim() === '') {
    return null; // Unlimited
  }

  const parsed = parseInt(envValue, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return null; // Unlimited
  }

  return parsed;
}

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly entitlementsService: EntitlementsService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  // ==========================================================================
  // Profile
  // ==========================================================================

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        timezone: true,
        locale: true,
        organizationName: true,
        accountRole: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        timezone: dto.timezone,
        locale: dto.locale,
        organizationName: dto.organizationName,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        timezone: true,
        locale: true,
        organizationName: true,
        accountRole: true,
        lastLoginAt: true,
      },
    });

    // Write audit log
    await this.prisma.userAccountAuditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'profile_updated',
        metadata: {
          updatedFields: Object.keys(dto),
        },
      },
    });

    return user;
  }

  // ==========================================================================
  // Preferences
  // ==========================================================================

  async getPreferences(userId: string): Promise<PreferencesResponse> {
    let prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Lazy initialization: create default preferences if none exist
    if (!prefs) {
      prefs = await this.prisma.userPreferences.create({
        data: { userId },
      });
    }

    return {
      notifyQuotaWarnings: prefs.notifyQuotaWarnings,
      notifyRunFailures: prefs.notifyRunFailures,
      notifyWeeklyDeoSummary: prefs.notifyWeeklyDeoSummary,
      autoOpenIssuesTab: prefs.autoOpenIssuesTab,
      preferredPillarLanding: prefs.preferredPillarLanding,
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
    userAccountRole: string,
  ): Promise<PreferencesResponse> {
    // VIEWER cannot update preferences
    if (userAccountRole === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot update preferences');
    }

    // Ensure preferences exist (lazy init)
    await this.getPreferences(userId);

    const prefs = await this.prisma.userPreferences.update({
      where: { userId },
      data: {
        notifyQuotaWarnings: dto.notifyQuotaWarnings,
        notifyRunFailures: dto.notifyRunFailures,
        notifyWeeklyDeoSummary: dto.notifyWeeklyDeoSummary,
        autoOpenIssuesTab: dto.autoOpenIssuesTab,
        preferredPillarLanding: dto.preferredPillarLanding,
      },
    });

    // Write audit log
    await this.prisma.userAccountAuditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'preferences_updated',
        metadata: {
          updatedFields: Object.keys(dto),
        },
      },
    });

    return {
      notifyQuotaWarnings: prefs.notifyQuotaWarnings,
      notifyRunFailures: prefs.notifyRunFailures,
      notifyWeeklyDeoSummary: prefs.notifyWeeklyDeoSummary,
      autoOpenIssuesTab: prefs.autoOpenIssuesTab,
      preferredPillarLanding: prefs.preferredPillarLanding,
    };
  }

  // ==========================================================================
  // AI Usage
  // ==========================================================================

  async getAiUsageSummary(userId: string): Promise<AiUsageSummaryResponse> {
    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // [BILLING-GTM-1] Get user's plan and quota limit from env
    const planId = await this.entitlementsService.getUserPlan(userId);
    const quotaLimit = getAiQuotaLimitFromEnv(planId);

    // Query automation playbook runs for the current month
    const runs = await this.prisma.automationPlaybookRun.findMany({
      where: {
        createdByUserId: userId,
        createdAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      select: {
        runType: true,
        aiUsed: true,
        reusedFromRunId: true,
      },
    });

    const totalRuns = runs.length;
    const aiUsedRuns = runs.filter((r) => r.aiUsed).length;
    const reusedRuns = runs.filter((r) => r.reusedFromRunId !== null).length;

    // APPLY runs should never use AI - this is the invariant
    const applyRuns = runs.filter((r) => r.runType === 'APPLY');
    const applyWithAi = applyRuns.filter((r) => r.aiUsed);
    const applyInvariantViolations = applyWithAi.length;

    // runsAvoided = reused runs that would have consumed AI quota
    const runsAvoided = reusedRuns;

    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Format period label (e.g., "December 2025")
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const periodLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Calculate quota used percentage
    const quotaUsedPercent = quotaLimit !== null
      ? Math.min(Math.round((aiUsedRuns / quotaLimit) * 100), 100)
      : 0;

    return {
      month,
      periodLabel,
      totalRuns,
      aiUsedRuns,
      reusedRuns,
      runsAvoided,
      quotaLimit,
      quotaUsedPercent,
      applyInvariantViolations,
      // [BILLING-GTM-1] Trust-safe messaging
      applyInvariantMessage:
        applyInvariantViolations === 0
          ? 'APPLY never uses AI — applying fixes is always quota-free.'
          : `WARNING: ${applyInvariantViolations} APPLY operations used AI. This should not happen.`,
      reuseMessage: `Reuse saves AI usage. ${reusedRuns} operations were served from cache this month, avoiding ${reusedRuns} AI calls.`,
    };
  }

  // ==========================================================================
  // Connected Stores
  // ==========================================================================

  async getConnectedStores(userId: string): Promise<ConnectedStoreResponse[]> {
    // Get all projects owned by user with Shopify integrations
    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: {
        integrations: {
          where: {
            type: 'SHOPIFY',
            accessToken: { not: null },
            externalId: { not: null },
          },
        },
      },
    });

    const stores: ConnectedStoreResponse[] = [];

    for (const project of projects) {
      for (const integration of project.integrations) {
        stores.push({
          projectId: project.id,
          projectName: project.name,
          storeDomain: project.domain,
          integrationType: integration.type,
          integrationId: integration.id,
          connectedAt: integration.createdAt,
        });
      }
    }

    return stores;
  }

  async disconnectStore(
    userId: string,
    projectId: string,
    userAccountRole: string,
  ): Promise<{ success: boolean }> {
    // Only account OWNER can disconnect stores (account-level restriction)
    if (userAccountRole !== 'OWNER') {
      throw new ForbiddenException('Only account owners can disconnect stores');
    }

    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3 FIXUP-5] Verify user has OWNER role on project (supports co-owners)
    try {
      await this.roleResolution.assertOwnerRole(projectId, userId);
    } catch {
      throw new ForbiddenException('You do not have owner access to this project');
    }

    // Delete the Shopify integration (does NOT trigger AI work)
    await this.prisma.integration.deleteMany({
      where: {
        projectId,
        type: 'SHOPIFY',
      },
    });

    // Write audit log
    await this.prisma.userAccountAuditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'disconnect_store',
        metadata: {
          projectId,
          projectName: project.name,
        },
      },
    });

    return { success: true };
  }

  // ==========================================================================
  // Sessions
  // ==========================================================================

  async getActiveSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<SessionResponse[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      ip: s.ip,
      userAgent: s.userAgent,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async signOutAllSessions(userId: string): Promise<{ revokedCount: number }> {
    // Delegate to AuthService which handles tokenInvalidBefore + session revocation + audit log
    return this.authService.signOutAllSessions(userId);
  }
}
