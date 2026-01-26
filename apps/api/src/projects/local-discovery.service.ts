import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import {
  LocalApplicabilityStatus as PrismaApplicabilityStatus,
  LocalSignalType as PrismaSignalType,
  LocalGapType as PrismaGapType,
  LocalCoverageStatus as PrismaCoverageStatus,
  LocalFixDraftType as PrismaDraftType,
  LocalFixApplyTarget as PrismaApplyTarget,
} from '@prisma/client';
import {
  LocalApplicabilityStatus,
  LocalApplicabilityReason,
  LocalSignalType,
  LocalCoverageStatus,
  LocalGapType,
  LocalFixDraftType,
  LocalFixApplyTarget,
  LocalSignal,
  LocalDiscoveryScorecard,
  LocalGap,
  LocalFixDraft,
  ProjectLocalDiscoveryResponse,
  ProjectLocalConfig,
  LOCAL_SIGNAL_TYPES,
  LOCAL_SIGNAL_WEIGHTS,
  LOCAL_SIGNAL_LABELS,
  LOCAL_SIGNAL_DESCRIPTIONS,
  LOCAL_GAP_LABELS,
  isLocalApplicableFromReasons,
  getLocalCoverageStatusFromScore,
  calculateLocalSeverity,
  getLocalGapTypeForMissingSignal,
} from '@engineo/shared';
import type { DeoIssue, DeoIssueSeverity } from '@engineo/shared';

/**
 * LocalDiscoveryService handles all Local Discovery pillar functionality (LOCAL-1):
 * - Project-level local configuration and applicability determination
 * - Local signal detection and management
 * - Coverage/scorecard computation
 * - Gap analysis and issue generation
 * - Fix draft management (preview/apply patterns)
 *
 * CRITICAL DESIGN PRINCIPLE:
 * - Local discovery ONLY applies to stores where local presence is relevant
 * - Non-local/global stores receive NO penalty and see "Not Applicable" status
 * - No GMB management, map rank tracking, or multi-location/franchise tooling in v1
 * - No geo-rank promises or external location API integrations in v1
 */
/**
 * [ROLES-3 FIXUP-3] LocalDiscoveryService
 * Updated with membership-aware access control (any ProjectMember can view).
 */
@Injectable()
export class LocalDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService
  ) {}

  // ============================================================================
  // Type Mapping Helpers
  // ============================================================================

  private toPrismaApplicabilityStatus(
    status: LocalApplicabilityStatus
  ): PrismaApplicabilityStatus {
    const mapping: Record<LocalApplicabilityStatus, PrismaApplicabilityStatus> =
      {
        applicable: 'APPLICABLE',
        not_applicable: 'NOT_APPLICABLE',
        unknown: 'UNKNOWN',
      };
    return mapping[status];
  }

  private fromPrismaApplicabilityStatus(
    status: PrismaApplicabilityStatus
  ): LocalApplicabilityStatus {
    const mapping: Record<PrismaApplicabilityStatus, LocalApplicabilityStatus> =
      {
        APPLICABLE: 'applicable',
        NOT_APPLICABLE: 'not_applicable',
        UNKNOWN: 'unknown',
      };
    return mapping[status];
  }

  private toPrismaSignalType(type: LocalSignalType): PrismaSignalType {
    const mapping: Record<LocalSignalType, PrismaSignalType> = {
      location_presence: 'LOCATION_PRESENCE',
      local_intent_coverage: 'LOCAL_INTENT_COVERAGE',
      local_trust_signals: 'LOCAL_TRUST_SIGNALS',
      local_schema_readiness: 'LOCAL_SCHEMA_READINESS',
    };
    return mapping[type];
  }

  private fromPrismaSignalType(type: PrismaSignalType): LocalSignalType {
    const mapping: Record<PrismaSignalType, LocalSignalType> = {
      LOCATION_PRESENCE: 'location_presence',
      LOCAL_INTENT_COVERAGE: 'local_intent_coverage',
      LOCAL_TRUST_SIGNALS: 'local_trust_signals',
      LOCAL_SCHEMA_READINESS: 'local_schema_readiness',
    };
    return mapping[type];
  }

  private toPrismaGapType(type: LocalGapType): PrismaGapType {
    const mapping: Record<LocalGapType, PrismaGapType> = {
      missing_local_intent_coverage: 'MISSING_LOCAL_INTENT_COVERAGE',
      missing_location_content: 'MISSING_LOCATION_CONTENT',
      unclear_service_area: 'UNCLEAR_SERVICE_AREA',
      missing_local_trust_signal: 'MISSING_LOCAL_TRUST_SIGNAL',
    };
    return mapping[type];
  }

  private fromPrismaGapType(type: PrismaGapType): LocalGapType {
    const mapping: Record<PrismaGapType, LocalGapType> = {
      MISSING_LOCAL_INTENT_COVERAGE: 'missing_local_intent_coverage',
      MISSING_LOCATION_CONTENT: 'missing_location_content',
      UNCLEAR_SERVICE_AREA: 'unclear_service_area',
      MISSING_LOCAL_TRUST_SIGNAL: 'missing_local_trust_signal',
    };
    return mapping[type];
  }

  private toPrismaCoverageStatus(
    status: LocalCoverageStatus
  ): PrismaCoverageStatus {
    const mapping: Record<LocalCoverageStatus, PrismaCoverageStatus> = {
      strong: 'STRONG',
      needs_improvement: 'NEEDS_IMPROVEMENT',
      weak: 'WEAK',
    };
    return mapping[status];
  }

  private fromPrismaCoverageStatus(
    status: PrismaCoverageStatus
  ): LocalCoverageStatus {
    const mapping: Record<PrismaCoverageStatus, LocalCoverageStatus> = {
      STRONG: 'strong',
      NEEDS_IMPROVEMENT: 'needs_improvement',
      WEAK: 'weak',
    };
    return mapping[status];
  }

  private toPrismaDraftType(type: LocalFixDraftType): PrismaDraftType {
    const mapping: Record<LocalFixDraftType, PrismaDraftType> = {
      local_answer_block: 'LOCAL_ANSWER_BLOCK',
      city_section: 'CITY_SECTION',
      service_area_description: 'SERVICE_AREA_DESCRIPTION',
    };
    return mapping[type];
  }

  private fromPrismaDraftType(type: PrismaDraftType): LocalFixDraftType {
    const mapping: Record<PrismaDraftType, LocalFixDraftType> = {
      LOCAL_ANSWER_BLOCK: 'local_answer_block',
      CITY_SECTION: 'city_section',
      SERVICE_AREA_DESCRIPTION: 'service_area_description',
    };
    return mapping[type];
  }

  private toPrismaApplyTarget(target: LocalFixApplyTarget): PrismaApplyTarget {
    const mapping: Record<LocalFixApplyTarget, PrismaApplyTarget> = {
      ANSWER_BLOCK: 'ANSWER_BLOCK',
      CONTENT_SECTION: 'CONTENT_SECTION',
    };
    return mapping[target];
  }

  // ============================================================================
  // Local Configuration Management
  // ============================================================================

  /**
   * Get local configuration for a project.
   */
  async getProjectLocalConfig(
    projectId: string
  ): Promise<ProjectLocalConfig | null> {
    const row = await this.prisma.projectLocalConfig.findUnique({
      where: { projectId },
    });

    if (!row) {
      return null;
    }

    return {
      hasPhysicalLocation: row.hasPhysicalLocation,
      serviceAreaDescription: row.serviceAreaDescription || undefined,
      enabled: row.enabled,
    };
  }

  /**
   * Update local configuration for a project.
   */
  async updateProjectLocalConfig(
    projectId: string,
    config: Partial<ProjectLocalConfig>
  ): Promise<ProjectLocalConfig> {
    const row = await this.prisma.projectLocalConfig.upsert({
      where: { projectId },
      create: {
        projectId,
        hasPhysicalLocation: config.hasPhysicalLocation ?? false,
        serviceAreaDescription: config.serviceAreaDescription,
        enabled: config.enabled ?? false,
      },
      update: {
        hasPhysicalLocation: config.hasPhysicalLocation,
        serviceAreaDescription: config.serviceAreaDescription,
        enabled: config.enabled,
      },
    });

    // Invalidate coverage when config changes
    await this.invalidateCoverage(projectId);

    return {
      hasPhysicalLocation: row.hasPhysicalLocation,
      serviceAreaDescription: row.serviceAreaDescription || undefined,
      enabled: row.enabled,
    };
  }

  // ============================================================================
  // Applicability Determination
  // ============================================================================

  /**
   * Determine local applicability for a project.
   * Uses multiple signals to decide if local discovery is relevant.
   */
  async determineApplicability(projectId: string): Promise<{
    status: LocalApplicabilityStatus;
    reasons: LocalApplicabilityReason[];
  }> {
    const reasons: LocalApplicabilityReason[] = [];

    // Check merchant-declared configuration
    const config = await this.getProjectLocalConfig(projectId);

    if (config?.enabled) {
      reasons.push('manual_override_enabled');
    }

    if (config?.hasPhysicalLocation) {
      reasons.push('merchant_declared_physical_presence');
    }

    // Check for local intent product categories (heuristic)
    // This would analyze product types and determine if they're typically local-focused
    // For v1, we rely primarily on merchant configuration
    // Future: analyze product categories, shipping settings, etc.

    // Check for content mentions of regions
    // Future: analyze content for city/region mentions

    // Determine overall applicability
    if (reasons.length === 0) {
      // Check if explicitly configured as global-only
      if (config && !config.hasPhysicalLocation && !config.enabled) {
        return {
          status: 'not_applicable',
          reasons: ['global_only_config'],
        };
      }

      // No indicators either way
      return {
        status: 'unknown',
        reasons: ['no_local_indicators'],
      };
    }

    // Has local indicators
    return {
      status: isLocalApplicableFromReasons(reasons)
        ? 'applicable'
        : 'not_applicable',
      reasons,
    };
  }

  // ============================================================================
  // Signal Management
  // ============================================================================

  /**
   * Get all local signals for a project.
   */
  async getProjectSignals(projectId: string): Promise<LocalSignal[]> {
    const rows = await this.prisma.projectLocalSignal.findMany({
      where: { projectId },
      orderBy: [{ signalType: 'asc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      signalType: this.fromPrismaSignalType(row.signalType),
      label: row.label,
      description: row.description,
      url: row.url || undefined,
      evidence: row.evidence || undefined,
    }));
  }

  /**
   * Add a new local signal.
   */
  async addSignal(params: {
    projectId: string;
    signalType: LocalSignalType;
    label: string;
    description: string;
    url?: string;
    evidence?: string;
  }): Promise<LocalSignal> {
    const row = await this.prisma.projectLocalSignal.create({
      data: {
        projectId: params.projectId,
        signalType: this.toPrismaSignalType(params.signalType),
        label: params.label,
        description: params.description,
        url: params.url,
        evidence: params.evidence,
      },
    });

    // Invalidate coverage when signals change
    await this.invalidateCoverage(params.projectId);

    return {
      id: row.id,
      signalType: this.fromPrismaSignalType(row.signalType),
      label: row.label,
      description: row.description,
      url: row.url || undefined,
      evidence: row.evidence || undefined,
    };
  }

  // ============================================================================
  // Coverage/Scorecard Computation
  // ============================================================================

  /**
   * Compute local discovery scorecard for a project.
   */
  async computeProjectScorecard(
    projectId: string
  ): Promise<LocalDiscoveryScorecard> {
    // Determine applicability first
    const { status: applicabilityStatus, reasons: applicabilityReasons } =
      await this.determineApplicability(projectId);

    // Get all signals
    const signals = await this.prisma.projectLocalSignal.findMany({
      where: { projectId },
    });

    // Count signals per type
    const signalCounts: Record<LocalSignalType, number> = {
      location_presence: 0,
      local_intent_coverage: 0,
      local_trust_signals: 0,
      local_schema_readiness: 0,
    };

    for (const signal of signals) {
      const type = this.fromPrismaSignalType(signal.signalType);
      signalCounts[type]++;
    }

    // Count missing high-impact signals
    let missingLocalSignalsCount = 0;
    for (const signalType of LOCAL_SIGNAL_TYPES) {
      if (
        signalCounts[signalType] === 0 &&
        LOCAL_SIGNAL_WEIGHTS[signalType] >= 8
      ) {
        missingLocalSignalsCount++;
      }
    }

    // If not applicable, return scorecard without score
    if (applicabilityStatus === 'not_applicable') {
      const scorecard: LocalDiscoveryScorecard = {
        projectId,
        applicabilityStatus,
        applicabilityReasons,
        signalCounts,
        missingLocalSignalsCount: 0, // No penalty for non-local stores
        computedAt: new Date().toISOString(),
      };

      await this.persistCoverage(projectId, scorecard);
      return scorecard;
    }

    // Compute score for applicable projects
    let totalWeight = 0;
    let earnedWeight = 0;

    for (const signalType of LOCAL_SIGNAL_TYPES) {
      const weight = LOCAL_SIGNAL_WEIGHTS[signalType];
      totalWeight += weight;

      if (signalCounts[signalType] > 0) {
        // Additional signals provide diminishing returns
        const bonus = Math.min(signalCounts[signalType] - 1, 2) * 0.25 * weight;
        earnedWeight += weight + bonus;
      }
    }

    const score = Math.round((earnedWeight / totalWeight) * 100);
    const status = getLocalCoverageStatusFromScore(score);

    const scorecard: LocalDiscoveryScorecard = {
      projectId,
      applicabilityStatus,
      applicabilityReasons,
      score,
      status,
      signalCounts,
      missingLocalSignalsCount,
      computedAt: new Date().toISOString(),
    };

    await this.persistCoverage(projectId, scorecard);
    return scorecard;
  }

  /**
   * Persist coverage snapshot to database.
   */
  private async persistCoverage(
    projectId: string,
    scorecard: LocalDiscoveryScorecard
  ): Promise<void> {
    await this.prisma.projectLocalCoverage.upsert({
      where: {
        id:
          (
            await this.prisma.projectLocalCoverage.findFirst({
              where: { projectId },
              orderBy: { computedAt: 'desc' },
            })
          )?.id ?? 'new',
      },
      create: {
        projectId,
        applicabilityStatus: this.toPrismaApplicabilityStatus(
          scorecard.applicabilityStatus
        ),
        applicabilityReasons: scorecard.applicabilityReasons,
        score: scorecard.score ?? null,
        status: scorecard.status
          ? this.toPrismaCoverageStatus(scorecard.status)
          : null,
        signalCounts: scorecard.signalCounts,
        missingLocalSignalsCount: scorecard.missingLocalSignalsCount,
        computedAt: new Date(),
      },
      update: {
        applicabilityStatus: this.toPrismaApplicabilityStatus(
          scorecard.applicabilityStatus
        ),
        applicabilityReasons: scorecard.applicabilityReasons,
        score: scorecard.score ?? null,
        status: scorecard.status
          ? this.toPrismaCoverageStatus(scorecard.status)
          : null,
        signalCounts: scorecard.signalCounts,
        missingLocalSignalsCount: scorecard.missingLocalSignalsCount,
        computedAt: new Date(),
      },
    });
  }

  /**
   * Get cached scorecard or compute if not present.
   */
  async getProjectScorecard(
    projectId: string
  ): Promise<LocalDiscoveryScorecard> {
    const row = await this.prisma.projectLocalCoverage.findFirst({
      where: { projectId },
      orderBy: { computedAt: 'desc' },
    });

    if (!row) {
      return this.computeProjectScorecard(projectId);
    }

    const signalCounts = row.signalCounts as Record<LocalSignalType, number>;

    return {
      projectId,
      applicabilityStatus: this.fromPrismaApplicabilityStatus(
        row.applicabilityStatus
      ),
      applicabilityReasons:
        row.applicabilityReasons as LocalApplicabilityReason[],
      score: row.score ?? undefined,
      status: row.status
        ? this.fromPrismaCoverageStatus(row.status)
        : undefined,
      signalCounts,
      missingLocalSignalsCount: row.missingLocalSignalsCount,
      computedAt: row.computedAt.toISOString(),
    };
  }

  /**
   * INSIGHTS-1: Read-only scorecard accessor (never computes or persists).
   * Returns null when no cached scorecard exists.
   */
  async getCachedProjectScorecard(
    projectId: string
  ): Promise<LocalDiscoveryScorecard | null> {
    const row = await this.prisma.projectLocalCoverage.findFirst({
      where: { projectId },
      orderBy: { computedAt: 'desc' },
    });

    if (!row) return null;

    const signalCounts = row.signalCounts as Record<LocalSignalType, number>;

    return {
      projectId,
      applicabilityStatus: this.fromPrismaApplicabilityStatus(
        row.applicabilityStatus
      ),
      applicabilityReasons:
        row.applicabilityReasons as LocalApplicabilityReason[],
      score: row.score ?? undefined,
      status: row.status
        ? this.fromPrismaCoverageStatus(row.status)
        : undefined,
      signalCounts,
      missingLocalSignalsCount: row.missingLocalSignalsCount,
      computedAt: row.computedAt.toISOString(),
    };
  }

  // ============================================================================
  // Gap Analysis
  // ============================================================================

  /**
   * Generate local gaps from scorecard data.
   * Only generates gaps for applicable projects.
   */
  generateGaps(scorecard: LocalDiscoveryScorecard): LocalGap[] {
    // No gaps for non-applicable projects
    if (scorecard.applicabilityStatus !== 'applicable') {
      return [];
    }

    const gaps: LocalGap[] = [];

    // Check for missing signal types
    for (const signalType of LOCAL_SIGNAL_TYPES) {
      if (scorecard.signalCounts[signalType] === 0) {
        const gapType = getLocalGapTypeForMissingSignal(signalType);
        const severity = calculateLocalSeverity(signalType, gapType);

        gaps.push({
          id: `gap_${scorecard.projectId}_${signalType}`,
          gapType,
          signalType,
          applicabilityReasons: scorecard.applicabilityReasons,
          example: this.getGapExample(signalType),
          recommendedAction: this.getRecommendedAction(signalType),
          severity,
        });
      }
    }

    return gaps;
  }

  /**
   * Get example description for a gap.
   */
  private getGapExample(signalType: LocalSignalType): string {
    const examples: Record<LocalSignalType, string> = {
      location_presence:
        'No physical address, store location, or contact information detected.',
      local_intent_coverage:
        'No coverage for "near me" or city-specific search queries.',
      local_trust_signals:
        'No local reviews, testimonials, or community presence indicators.',
      local_schema_readiness:
        'No structured data for location or organization information.',
    };
    return examples[signalType];
  }

  /**
   * Get recommended action for a gap.
   */
  private getRecommendedAction(signalType: LocalSignalType): string {
    const actions: Record<LocalSignalType, string> = {
      location_presence:
        'Add clear physical address, store hours, and contact information.',
      local_intent_coverage:
        'Create content targeting local search queries with city/region mentions.',
      local_trust_signals:
        'Add local customer reviews and community involvement content.',
      local_schema_readiness:
        'Add LocalBusiness or Organization schema with location details.',
    };
    return actions[signalType];
  }

  // ============================================================================
  // Full Project Data Access
  // ============================================================================

  /**
   * Get complete local discovery data for a project.
   */
  async getProjectLocalData(
    projectId: string,
    userId: string
  ): Promise<ProjectLocalDiscoveryResponse> {
    // Verify project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    // Get or compute scorecard
    const scorecard = await this.getProjectScorecard(projectId);

    // Get signals
    const signals = await this.getProjectSignals(projectId);

    // Generate gaps
    const gaps = this.generateGaps(scorecard);

    // Get open drafts
    const draftRows = await this.prisma.projectLocalFixDraft.findMany({
      where: {
        projectId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    const openDrafts: LocalFixDraft[] = draftRows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      productId: row.productId || undefined,
      gapType: this.fromPrismaGapType(row.gapType),
      signalType: this.fromPrismaSignalType(row.signalType),
      focusKey: row.focusKey,
      draftType: this.fromPrismaDraftType(row.draftType),
      draftPayload: row.draftPayload as LocalFixDraft['draftPayload'],
      aiWorkKey: row.aiWorkKey,
      reusedFromWorkKey: row.reusedFromWorkKey || undefined,
      generatedWithAi: row.generatedWithAi,
      generatedAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    }));

    return {
      projectId,
      scorecard,
      signals,
      gaps,
      openDrafts,
    };
  }

  // ============================================================================
  // Issue Generation
  // ============================================================================

  /**
   * Build local discovery issues for a project.
   * Called by deo-issues.service.ts to include local issues in DEO issues.
   *
   * CRITICAL: Non-applicable projects get NO issues (no penalty).
   */
  async buildLocalIssuesForProject(projectId: string): Promise<DeoIssue[]> {
    const scorecard = await this.getProjectScorecard(projectId);
    const issues: DeoIssue[] = [];

    // Non-applicable projects get no issues (no penalty)
    if (scorecard.applicabilityStatus !== 'applicable') {
      return [];
    }

    // Generate issues based on coverage gaps
    for (const signalType of LOCAL_SIGNAL_TYPES) {
      if (scorecard.signalCounts[signalType] === 0) {
        const gapType = getLocalGapTypeForMissingSignal(signalType);
        const severity: DeoIssueSeverity = calculateLocalSeverity(
          signalType,
          gapType
        );

        issues.push({
          id: `local_${gapType}_${projectId}`,
          title: `Missing ${LOCAL_SIGNAL_LABELS[signalType]}`,
          description: this.getGapExample(signalType),
          severity,
          count: 1,
          pillarId: 'local_discovery',
          actionability: 'manual',
          localSignalType: signalType,
          localGapType: gapType,
          localApplicabilityStatus: scorecard.applicabilityStatus,
          localApplicabilityReasons: scorecard.applicabilityReasons,
          recommendedAction: this.getRecommendedAction(signalType),
          whyItMatters: `${LOCAL_SIGNAL_LABELS[signalType]} helps local customers and discovery engines find your business for location-specific searches.`,
        });
      }
    }

    return issues;
  }

  /**
   * INSIGHTS-1: Read-only issue generation (never computes or persists scorecard).
   * Returns [] when no cached scorecard exists yet.
   */
  async buildLocalIssuesForProjectReadOnly(
    projectId: string
  ): Promise<DeoIssue[]> {
    const scorecard = await this.getCachedProjectScorecard(projectId);
    if (!scorecard) return [];

    const issues: DeoIssue[] = [];

    if (scorecard.applicabilityStatus !== 'applicable') {
      return [];
    }

    for (const signalType of LOCAL_SIGNAL_TYPES) {
      if (scorecard.signalCounts[signalType] === 0) {
        const gapType = getLocalGapTypeForMissingSignal(signalType);
        const severity: DeoIssueSeverity = calculateLocalSeverity(
          signalType,
          gapType
        );

        issues.push({
          id: `local_${gapType}_${projectId}`,
          title: `Missing ${LOCAL_SIGNAL_LABELS[signalType]}`,
          description: this.getGapExample(signalType),
          severity,
          count: 1,
          pillarId: 'local_discovery',
          actionability: 'manual',
          localSignalType: signalType,
          localGapType: gapType,
          localApplicabilityStatus: scorecard.applicabilityStatus,
          localApplicabilityReasons: scorecard.applicabilityReasons,
          recommendedAction: this.getRecommendedAction(signalType),
          whyItMatters: `${LOCAL_SIGNAL_LABELS[signalType]} helps local customers and discovery engines find your business for location-specific searches.`,
        });
      }
    }

    return issues;
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  /**
   * Invalidate coverage cache for a project.
   */
  async invalidateCoverage(projectId: string): Promise<void> {
    await this.prisma.projectLocalCoverage.deleteMany({
      where: { projectId },
    });
  }
}
