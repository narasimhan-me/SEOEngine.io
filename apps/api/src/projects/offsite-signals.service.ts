import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import {
  OffsiteSignalType as PrismaSignalType,
  OffsiteGapType as PrismaGapType,
  OffsitePresenceStatus as PrismaStatus,
  OffsiteFixDraftType as PrismaDraftType,
  OffsiteFixApplyTarget as PrismaApplyTarget,
} from '@prisma/client';
import {
  OffsiteSignalType,
  OffsiteGapType,
  OffsitePresenceStatus,
  OffsiteFixDraftType,
  OffsiteFixApplyTarget,
  ProjectOffsiteSignal,
  ProjectOffsiteCoverage,
  OffsiteGap,
  OffsiteFixDraft,
  ProjectOffsiteSignalsResponse,
  OFFSITE_SIGNAL_TYPES,
  OFFSITE_SIGNAL_WEIGHTS,
  OFFSITE_SIGNAL_LABELS,
  OFFSITE_GAP_LABELS,
  getOffsitePresenceStatusFromScore,
  calculateOffsiteSeverity,
  getGapTypeForMissingSignal,
} from '@engineo/shared';
import type { DeoIssue, DeoIssueSeverity } from '@engineo/shared';

/**
 * Known platform configurations for heuristic detection.
 * These are platforms where presence is highly valuable.
 */
const KNOWN_PLATFORMS: { signalType: OffsiteSignalType; sourceName: string; description: string }[] = [
  // Trust Proof platforms
  { signalType: 'trust_proof', sourceName: 'Trustpilot', description: 'Third-party review platform' },
  { signalType: 'trust_proof', sourceName: 'Google Reviews', description: 'Google Business reviews' },
  { signalType: 'trust_proof', sourceName: 'Better Business Bureau', description: 'BBB accreditation' },
  { signalType: 'trust_proof', sourceName: 'G2', description: 'Software review platform' },
  { signalType: 'trust_proof', sourceName: 'Capterra', description: 'Software review platform' },
  // Authoritative Listing platforms
  { signalType: 'authoritative_listing', sourceName: 'Google Business Profile', description: 'Local business listing' },
  { signalType: 'authoritative_listing', sourceName: 'Shopify App Store', description: 'App marketplace listing' },
  { signalType: 'authoritative_listing', sourceName: 'Industry Directory', description: 'Vertical-specific directory' },
  { signalType: 'authoritative_listing', sourceName: 'Chamber of Commerce', description: 'Business association listing' },
  // Brand Mention platforms
  { signalType: 'brand_mention', sourceName: 'Industry Blog', description: 'Blog mention or feature' },
  { signalType: 'brand_mention', sourceName: 'News Publication', description: 'News article mention' },
  { signalType: 'brand_mention', sourceName: 'Social Media', description: 'Social platform mention' },
  // Reference Content platforms
  { signalType: 'reference_content', sourceName: 'Comparison Site', description: 'Product comparison guide' },
  { signalType: 'reference_content', sourceName: 'Industry Report', description: 'Research or study citation' },
];

/**
 * OffsiteSignalsService handles all Off-site Signals pillar functionality (OFFSITE-1):
 * - Project-level off-site signal management
 * - Coverage/scorecard computation
 * - Gap analysis and issue generation
 * - Fix draft management (preview/apply patterns)
 *
 * ETHICAL BOUNDARIES (Critical):
 * - No heavy crawling or scraping in v1
 * - Signals are discovered or configured, not scraped
 * - No DA-like scores or raw backlink counts
 * - Focus on presence and quality of trust signals
 * - All generated content requires human review
 */
/**
 * [ROLES-3 FIXUP-3] OffsiteSignalsService
 * Updated with membership-aware access control (any ProjectMember can view).
 */
@Injectable()
export class OffsiteSignalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  // ============================================================================
  // Type Mapping Helpers
  // ============================================================================

  private toPrismaSignalType(type: OffsiteSignalType): PrismaSignalType {
    const mapping: Record<OffsiteSignalType, PrismaSignalType> = {
      brand_mention: 'BRAND_MENTION',
      authoritative_listing: 'AUTHORITATIVE_LISTING',
      trust_proof: 'TRUST_PROOF',
      reference_content: 'REFERENCE_CONTENT',
    };
    return mapping[type];
  }

  private fromPrismaSignalType(type: PrismaSignalType): OffsiteSignalType {
    const mapping: Record<PrismaSignalType, OffsiteSignalType> = {
      BRAND_MENTION: 'brand_mention',
      AUTHORITATIVE_LISTING: 'authoritative_listing',
      TRUST_PROOF: 'trust_proof',
      REFERENCE_CONTENT: 'reference_content',
    };
    return mapping[type];
  }

  private toPrismaGapType(type: OffsiteGapType): PrismaGapType {
    const mapping: Record<OffsiteGapType, PrismaGapType> = {
      missing_brand_mentions: 'MISSING_BRAND_MENTIONS',
      missing_trust_proof: 'MISSING_TRUST_PROOF',
      missing_authoritative_listing: 'MISSING_AUTHORITATIVE_LISTING',
      competitor_has_offsite_signal: 'COMPETITOR_HAS_OFFSITE_SIGNAL',
    };
    return mapping[type];
  }

  private fromPrismaGapType(type: PrismaGapType): OffsiteGapType {
    const mapping: Record<PrismaGapType, OffsiteGapType> = {
      MISSING_BRAND_MENTIONS: 'missing_brand_mentions',
      MISSING_TRUST_PROOF: 'missing_trust_proof',
      MISSING_AUTHORITATIVE_LISTING: 'missing_authoritative_listing',
      COMPETITOR_HAS_OFFSITE_SIGNAL: 'competitor_has_offsite_signal',
    };
    return mapping[type];
  }

  private toPrismaStatus(status: OffsitePresenceStatus): PrismaStatus {
    const mapping: Record<OffsitePresenceStatus, PrismaStatus> = {
      Low: 'LOW',
      Medium: 'MEDIUM',
      Strong: 'STRONG',
    };
    return mapping[status];
  }

  private fromPrismaStatus(status: PrismaStatus): OffsitePresenceStatus {
    const mapping: Record<PrismaStatus, OffsitePresenceStatus> = {
      LOW: 'Low',
      MEDIUM: 'Medium',
      STRONG: 'Strong',
    };
    return mapping[status];
  }

  private toPrismaDraftType(type: OffsiteFixDraftType): PrismaDraftType {
    const mapping: Record<OffsiteFixDraftType, PrismaDraftType> = {
      outreach_email: 'OUTREACH_EMAIL',
      pr_pitch: 'PR_PITCH',
      brand_profile_snippet: 'BRAND_PROFILE_SNIPPET',
      review_request_copy: 'REVIEW_REQUEST_COPY',
    };
    return mapping[type];
  }

  private fromPrismaDraftType(type: PrismaDraftType): OffsiteFixDraftType {
    const mapping: Record<PrismaDraftType, OffsiteFixDraftType> = {
      OUTREACH_EMAIL: 'outreach_email',
      PR_PITCH: 'pr_pitch',
      BRAND_PROFILE_SNIPPET: 'brand_profile_snippet',
      REVIEW_REQUEST_COPY: 'review_request_copy',
    };
    return mapping[type];
  }

  private toPrismaApplyTarget(target: OffsiteFixApplyTarget): PrismaApplyTarget {
    const mapping: Record<OffsiteFixApplyTarget, PrismaApplyTarget> = {
      NOTES: 'NOTES',
      CONTENT_WORKSPACE: 'CONTENT_WORKSPACE',
      OUTREACH_DRAFTS: 'OUTREACH_DRAFTS',
    };
    return mapping[target];
  }

  // ============================================================================
  // Signal Management
  // ============================================================================

  /**
   * Get all off-site signals for a project.
   */
  async getProjectSignals(projectId: string): Promise<ProjectOffsiteSignal[]> {
    const rows = await this.prisma.projectOffsiteSignal.findMany({
      where: { projectId },
      orderBy: [{ signalType: 'asc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      signalType: this.fromPrismaSignalType(row.signalType),
      sourceName: row.sourceName,
      url: row.url || undefined,
      evidence: row.evidence,
      merchantProvided: row.merchantProvided,
      knownPlatform: row.knownPlatform,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  /**
   * Add a new off-site signal (merchant-provided or detected).
   */
  async addSignal(params: {
    projectId: string;
    signalType: OffsiteSignalType;
    sourceName: string;
    url?: string;
    evidence: string;
    merchantProvided?: boolean;
    knownPlatform?: boolean;
  }): Promise<ProjectOffsiteSignal> {
    const row = await this.prisma.projectOffsiteSignal.create({
      data: {
        projectId: params.projectId,
        signalType: this.toPrismaSignalType(params.signalType),
        sourceName: params.sourceName,
        url: params.url,
        evidence: params.evidence,
        merchantProvided: params.merchantProvided ?? false,
        knownPlatform: params.knownPlatform ?? false,
      },
    });

    return {
      id: row.id,
      projectId: row.projectId,
      signalType: this.fromPrismaSignalType(row.signalType),
      sourceName: row.sourceName,
      url: row.url || undefined,
      evidence: row.evidence,
      merchantProvided: row.merchantProvided,
      knownPlatform: row.knownPlatform,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  // ============================================================================
  // Coverage Computation
  // ============================================================================

  /**
   * Compute off-site coverage for a project.
   * Uses simple weighting per signal type, with higher weight for trust proof and authoritative listings.
   */
  async computeProjectCoverage(projectId: string): Promise<ProjectOffsiteCoverage> {
    // Get all signals
    const signals = await this.prisma.projectOffsiteSignal.findMany({
      where: { projectId },
    });

    // Count signals per type
    const signalCounts: Record<OffsiteSignalType, number> = {
      brand_mention: 0,
      authoritative_listing: 0,
      trust_proof: 0,
      reference_content: 0,
    };

    for (const signal of signals) {
      const type = this.fromPrismaSignalType(signal.signalType);
      signalCounts[type]++;
    }

    // Compute overall score based on presence and weights
    // Presence of at least one signal of each type earns points
    let totalWeight = 0;
    let earnedWeight = 0;

    for (const signalType of OFFSITE_SIGNAL_TYPES) {
      const weight = OFFSITE_SIGNAL_WEIGHTS[signalType];
      totalWeight += weight;

      // If at least one signal of this type exists, earn the weight
      // Additional signals provide diminishing returns (capped at 1.5x base weight)
      if (signalCounts[signalType] > 0) {
        const bonus = Math.min(signalCounts[signalType] - 1, 2) * 0.25 * weight;
        earnedWeight += weight + bonus;
      }
    }

    const overallScore = Math.round((earnedWeight / totalWeight) * 100);

    // Count high-impact gaps (missing trust proof or authoritative listing on known platforms)
    let highImpactGaps = 0;
    if (signalCounts.trust_proof === 0) highImpactGaps++;
    if (signalCounts.authoritative_listing === 0) highImpactGaps++;

    const status = getOffsitePresenceStatusFromScore(overallScore);

    const coverage: ProjectOffsiteCoverage = {
      projectId,
      overallScore,
      status,
      signalCounts,
      highImpactGaps,
      totalSignals: signals.length,
      computedAt: new Date().toISOString(),
    };

    // Persist coverage snapshot
    await this.persistCoverage(projectId, coverage);

    return coverage;
  }

  /**
   * Persist coverage snapshot to database.
   */
  private async persistCoverage(
    projectId: string,
    coverage: ProjectOffsiteCoverage
  ): Promise<void> {
    // Upsert the latest coverage (keep one row per project)
    await this.prisma.projectOffsiteCoverage.upsert({
      where: {
        id: (await this.prisma.projectOffsiteCoverage.findFirst({
          where: { projectId },
          orderBy: { computedAt: 'desc' },
        }))?.id ?? 'new',
      },
      create: {
        projectId,
        coverageData: {
          signalCounts: coverage.signalCounts,
          highImpactGaps: coverage.highImpactGaps,
          totalSignals: coverage.totalSignals,
        },
        overallScore: coverage.overallScore,
        status: this.toPrismaStatus(coverage.status),
        computedAt: new Date(),
      },
      update: {
        coverageData: {
          signalCounts: coverage.signalCounts,
          highImpactGaps: coverage.highImpactGaps,
          totalSignals: coverage.totalSignals,
        },
        overallScore: coverage.overallScore,
        status: this.toPrismaStatus(coverage.status),
        computedAt: new Date(),
      },
    });
  }

  /**
   * Get cached coverage or compute if not present.
   */
  async getProjectCoverage(projectId: string): Promise<ProjectOffsiteCoverage> {
    const row = await this.prisma.projectOffsiteCoverage.findFirst({
      where: { projectId },
      orderBy: { computedAt: 'desc' },
    });

    if (!row) {
      return this.computeProjectCoverage(projectId);
    }

    const coverageData = row.coverageData as {
      signalCounts: Record<OffsiteSignalType, number>;
      highImpactGaps: number;
      totalSignals: number;
    };

    return {
      projectId,
      overallScore: row.overallScore,
      status: this.fromPrismaStatus(row.status),
      signalCounts: coverageData.signalCounts,
      highImpactGaps: coverageData.highImpactGaps,
      totalSignals: coverageData.totalSignals,
      computedAt: row.computedAt.toISOString(),
    };
  }

  /**
   * INSIGHTS-1: Read-only coverage accessor (never computes or persists).
   * Returns null when no cached coverage exists.
   */
  async getCachedProjectCoverage(projectId: string): Promise<ProjectOffsiteCoverage | null> {
    const row = await this.prisma.projectOffsiteCoverage.findFirst({
      where: { projectId },
      orderBy: { computedAt: 'desc' },
    });

    if (!row) return null;

    const coverageData = row.coverageData as {
      signalCounts: Record<OffsiteSignalType, number>;
      highImpactGaps: number;
      totalSignals: number;
    };

    return {
      projectId,
      overallScore: row.overallScore,
      status: this.fromPrismaStatus(row.status),
      signalCounts: coverageData.signalCounts,
      highImpactGaps: coverageData.highImpactGaps,
      totalSignals: coverageData.totalSignals,
      computedAt: row.computedAt.toISOString(),
    };
  }

  // ============================================================================
  // Gap Analysis
  // ============================================================================

  /**
   * Generate off-site gaps from coverage data.
   */
  generateGaps(coverage: ProjectOffsiteCoverage): OffsiteGap[] {
    const gaps: OffsiteGap[] = [];

    // Check for missing signal types
    for (const signalType of OFFSITE_SIGNAL_TYPES) {
      if (coverage.signalCounts[signalType] === 0) {
        const gapType = getGapTypeForMissingSignal(signalType);
        const severity = calculateOffsiteSeverity(signalType, gapType);

        gaps.push({
          id: `gap_${coverage.projectId}_${signalType}`,
          gapType,
          signalType,
          example: this.getGapExample(signalType),
          recommendedAction: this.getRecommendedAction(signalType),
          severity,
        });
      }
    }

    // Add competitor-based gaps for high-impact signal types
    // (Heuristic: assume typical competitors have trust proof and authoritative listings)
    if (coverage.signalCounts.trust_proof === 0) {
      gaps.push({
        id: `gap_${coverage.projectId}_competitor_trust_proof`,
        gapType: 'competitor_has_offsite_signal',
        signalType: 'trust_proof',
        competitorCount: 2,
        example: 'Competitors in your industry typically have third-party reviews on platforms like Trustpilot or G2.',
        recommendedAction: 'Request reviews from customers or add review platform integration.',
        severity: 'critical',
      });
    }

    if (coverage.signalCounts.authoritative_listing === 0) {
      gaps.push({
        id: `gap_${coverage.projectId}_competitor_listing`,
        gapType: 'competitor_has_offsite_signal',
        signalType: 'authoritative_listing',
        competitorCount: 2,
        example: 'Competitors typically appear in industry directories and marketplace listings.',
        recommendedAction: 'Submit your business to relevant industry directories and marketplaces.',
        severity: 'warning',
      });
    }

    return gaps;
  }

  /**
   * Get example description for a gap.
   */
  private getGapExample(signalType: OffsiteSignalType): string {
    const examples: Record<OffsiteSignalType, string> = {
      brand_mention: 'No brand mentions detected in articles, blogs, or news publications.',
      authoritative_listing: 'No presence found in industry directories or marketplace listings.',
      trust_proof: 'No third-party reviews, testimonials, or certifications detected.',
      reference_content: 'No guides, comparisons, or studies citing your brand were found.',
    };
    return examples[signalType];
  }

  /**
   * Get recommended action for a gap.
   */
  private getRecommendedAction(signalType: OffsiteSignalType): string {
    const actions: Record<OffsiteSignalType, string> = {
      brand_mention: 'Pitch guest posts or press releases to industry publications.',
      authoritative_listing: 'Submit your business to relevant directories and marketplaces.',
      trust_proof: 'Request reviews from customers and consider review platform integration.',
      reference_content: 'Create shareable content that others can cite and reference.',
    };
    return actions[signalType];
  }

  // ============================================================================
  // Full Project Data Access
  // ============================================================================

  /**
   * Get complete off-site signals data for a project.
   */
  async getProjectOffsiteData(
    projectId: string,
    userId: string
  ): Promise<ProjectOffsiteSignalsResponse> {
    // Verify project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    // Get signals
    const signals = await this.getProjectSignals(projectId);

    // Get or compute coverage
    const coverage = await this.getProjectCoverage(projectId);

    // Generate gaps
    const gaps = this.generateGaps(coverage);

    // Get open drafts
    const draftRows = await this.prisma.projectOffsiteFixDraft.findMany({
      where: {
        projectId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    const openDrafts: OffsiteFixDraft[] = draftRows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      productId: row.productId || undefined,
      gapType: this.fromPrismaGapType(row.gapType),
      signalType: this.fromPrismaSignalType(row.signalType),
      focusKey: row.focusKey,
      draftType: this.fromPrismaDraftType(row.draftType),
      draftPayload: row.draftPayload as OffsiteFixDraft['draftPayload'],
      aiWorkKey: row.aiWorkKey,
      reusedFromWorkKey: row.reusedFromWorkKey || undefined,
      generatedWithAi: row.generatedWithAi,
      generatedAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    }));

    return {
      projectId,
      signals,
      coverage,
      gaps,
      openDrafts,
    };
  }

  // ============================================================================
  // Issue Generation
  // ============================================================================

  /**
   * Build off-site signal issues for a project.
   * Called by deo-issues.service.ts to include off-site issues in DEO issues.
   */
  async buildOffsiteIssuesForProject(projectId: string): Promise<DeoIssue[]> {
    const coverage = await this.getProjectCoverage(projectId);
    const issues: DeoIssue[] = [];

    // Generate issues based on coverage gaps
    for (const signalType of OFFSITE_SIGNAL_TYPES) {
      if (coverage.signalCounts[signalType] === 0) {
        const gapType = getGapTypeForMissingSignal(signalType);
        const severity: DeoIssueSeverity = calculateOffsiteSeverity(signalType, gapType);

        issues.push({
          id: `offsite_${gapType}_${projectId}`,
          title: `Missing ${OFFSITE_SIGNAL_LABELS[signalType]}`,
          description: this.getGapExample(signalType),
          severity,
          count: 1,
          pillarId: 'offsite_signals',
          actionability: 'manual',
          signalType,
          offsiteGapType: gapType,
          recommendedAction: this.getRecommendedAction(signalType),
          whyItMatters: `${OFFSITE_SIGNAL_LABELS[signalType]} signals help discovery engines and AI models understand your brand authority and trustworthiness.`,
        });
      }
    }

    // Add competitor-based issues for trust proof and authoritative listings
    if (coverage.signalCounts.trust_proof === 0) {
      issues.push({
        id: `offsite_competitor_trust_proof_${projectId}`,
        title: 'Competitors Have Third-Party Reviews',
        description: 'Competitors in your industry typically have third-party reviews, which you appear to be missing.',
        severity: 'critical',
        count: 1,
        pillarId: 'offsite_signals',
        actionability: 'manual',
        signalType: 'trust_proof',
        offsiteGapType: 'competitor_has_offsite_signal',
        competitorCount: 2,
        recommendedAction: 'Request reviews from customers to build third-party trust proof.',
        whyItMatters: 'Third-party reviews are high-trust signals that AI models and discovery engines rely on to verify brand legitimacy.',
      });
    }

    if (coverage.signalCounts.authoritative_listing === 0) {
      issues.push({
        id: `offsite_competitor_listing_${projectId}`,
        title: 'Competitors Appear in Industry Directories',
        description: 'Competitors typically appear in industry directories and marketplace listings.',
        severity: 'warning',
        count: 1,
        pillarId: 'offsite_signals',
        actionability: 'manual',
        signalType: 'authoritative_listing',
        offsiteGapType: 'competitor_has_offsite_signal',
        competitorCount: 2,
        recommendedAction: 'Submit your business to relevant directories and marketplace platforms.',
        whyItMatters: 'Directory listings provide authoritative backlinks and help discovery engines validate your business.',
      });
    }

    return issues;
  }

  /**
   * INSIGHTS-1: Read-only issue generation (never computes or persists coverage).
   * Returns [] when no cached coverage exists yet.
   */
  async buildOffsiteIssuesForProjectReadOnly(projectId: string): Promise<DeoIssue[]> {
    const coverage = await this.getCachedProjectCoverage(projectId);
    if (!coverage) return [];

    const issues: DeoIssue[] = [];

    for (const signalType of OFFSITE_SIGNAL_TYPES) {
      if (coverage.signalCounts[signalType] === 0) {
        const gapType = getGapTypeForMissingSignal(signalType);
        const severity: DeoIssueSeverity = calculateOffsiteSeverity(signalType, gapType);

        issues.push({
          id: `offsite_${gapType}_${projectId}`,
          title: `Missing ${OFFSITE_SIGNAL_LABELS[signalType]}`,
          description: this.getGapExample(signalType),
          severity,
          count: 1,
          pillarId: 'offsite_signals',
          actionability: 'manual',
          signalType,
          offsiteGapType: gapType,
          recommendedAction: this.getRecommendedAction(signalType),
          whyItMatters: `${OFFSITE_SIGNAL_LABELS[signalType]} signals help discovery engines and AI models understand your brand authority and trustworthiness.`,
        });
      }
    }

    if (coverage.signalCounts.trust_proof === 0) {
      issues.push({
        id: `offsite_competitor_trust_proof_${projectId}`,
        title: 'Competitors Have Third-Party Reviews',
        description: 'Competitors in your industry typically have third-party reviews, which you appear to be missing.',
        severity: 'critical',
        count: 1,
        pillarId: 'offsite_signals',
        actionability: 'manual',
        signalType: 'trust_proof',
        offsiteGapType: 'competitor_has_offsite_signal',
        competitorCount: 2,
        recommendedAction: 'Request reviews from customers to build third-party trust proof.',
        whyItMatters: 'Third-party reviews are high-trust signals that AI models and discovery engines rely on to verify brand legitimacy.',
      });
    }

    if (coverage.signalCounts.authoritative_listing === 0) {
      issues.push({
        id: `offsite_competitor_listing_${projectId}`,
        title: 'Competitors Appear in Industry Directories',
        description: 'Competitors typically appear in industry directories and marketplace listings.',
        severity: 'warning',
        count: 1,
        pillarId: 'offsite_signals',
        actionability: 'manual',
        signalType: 'authoritative_listing',
        offsiteGapType: 'competitor_has_offsite_signal',
        competitorCount: 2,
        recommendedAction: 'Submit your business to relevant directories and marketplace platforms.',
        whyItMatters: 'Directory listings provide authoritative backlinks and help discovery engines validate your business.',
      });
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
    await this.prisma.projectOffsiteCoverage.deleteMany({
      where: { projectId },
    });
  }
}
