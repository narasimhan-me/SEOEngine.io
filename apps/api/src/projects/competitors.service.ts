import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CompetitorGapType as PrismaGapType,
  CompetitiveStatus as PrismaStatus,
  CompetitiveFixDraftType as PrismaDraftType,
  CompetitiveFixApplyTarget as PrismaApplyTarget,
} from '@prisma/client';
import {
  CompetitorGapType,
  ProductCompetitorRef,
  ProductCompetitiveCoverage,
  CompetitiveCoverageArea,
  CompetitiveCoverageAreaId,
  CompetitiveScorecard,
  CompetitiveFixGap,
  CompetitiveFixDraft,
  CompetitiveFixDraftType,
  CompetitiveFixApplyTarget,
  ProductCompetitiveResponse,
  getCompetitiveStatusFromScore,
  calculateCompetitiveSeverity,
  getGapTypeForArea,
  getIntentTypeFromAreaId,
  COMPETITOR_GAP_LABELS,
} from '@engineo/shared';
import type { DeoIssue, DeoIssueSeverity, SearchIntentType } from '@engineo/shared';

/**
 * Competitive Coverage Areas for analysis.
 * Defines the standard areas we check for competitive positioning.
 */
const COMPETITIVE_COVERAGE_AREAS: {
  areaId: CompetitiveCoverageAreaId;
  label: string;
  severityWeight: number;
}[] = [
  // Intent-based areas (high value)
  { areaId: 'transactional_intent', label: 'Transactional Intent', severityWeight: 10 },
  { areaId: 'comparative_intent', label: 'Comparative Intent', severityWeight: 9 },
  { areaId: 'problem_use_case_intent', label: 'Problem/Use Case Intent', severityWeight: 7 },
  { areaId: 'trust_validation_intent', label: 'Trust/Validation Intent', severityWeight: 6 },
  { areaId: 'informational_intent', label: 'Informational Intent', severityWeight: 5 },
  // Content section areas
  { areaId: 'comparison_section', label: 'Comparison Section', severityWeight: 8 },
  { areaId: 'why_choose_section', label: 'Why Choose Us Section', severityWeight: 7 },
  { areaId: 'buying_guide_section', label: 'Buying Guide Section', severityWeight: 6 },
  { areaId: 'feature_benefits_section', label: 'Feature/Benefits Section', severityWeight: 5 },
  // Trust signal areas
  { areaId: 'faq_coverage', label: 'FAQ Coverage', severityWeight: 6 },
  { areaId: 'reviews_section', label: 'Reviews Section', severityWeight: 5 },
  { areaId: 'guarantee_section', label: 'Guarantee Section', severityWeight: 4 },
];

/**
 * CompetitorsService handles all Competitive Positioning pillar functionality:
 * - Per-product competitive coverage analysis
 * - Project-level scorecard aggregation
 * - Competitive gap issue generation for DEO Issues Engine
 * - Fix draft management (preview/apply patterns)
 *
 * ETHICAL BOUNDARIES:
 * - No scraping of competitor websites or content
 * - Coverage analysis uses "industry baseline" assumptions
 * - All generated content uses only merchant's product data
 */
@Injectable()
export class CompetitorsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // Type Mapping Helpers
  // ============================================================================

  private toPrismaGapType(type: CompetitorGapType): PrismaGapType {
    const mapping: Record<CompetitorGapType, PrismaGapType> = {
      intent_gap: 'INTENT_GAP',
      content_section_gap: 'CONTENT_SECTION_GAP',
      trust_signal_gap: 'TRUST_SIGNAL_GAP',
    };
    return mapping[type];
  }

  private fromPrismaGapType(type: PrismaGapType): CompetitorGapType {
    const mapping: Record<PrismaGapType, CompetitorGapType> = {
      INTENT_GAP: 'intent_gap',
      CONTENT_SECTION_GAP: 'content_section_gap',
      TRUST_SIGNAL_GAP: 'trust_signal_gap',
    };
    return mapping[type];
  }

  private toPrismaStatus(status: 'Ahead' | 'On par' | 'Behind'): PrismaStatus {
    const mapping: Record<'Ahead' | 'On par' | 'Behind', PrismaStatus> = {
      Ahead: 'AHEAD',
      'On par': 'ON_PAR',
      Behind: 'BEHIND',
    };
    return mapping[status];
  }

  private fromPrismaStatus(status: PrismaStatus): 'Ahead' | 'On par' | 'Behind' {
    const mapping: Record<PrismaStatus, 'Ahead' | 'On par' | 'Behind'> = {
      AHEAD: 'Ahead',
      ON_PAR: 'On par',
      BEHIND: 'Behind',
    };
    return mapping[status];
  }

  private toPrismaDraftType(type: CompetitiveFixDraftType): PrismaDraftType {
    const mapping: Record<CompetitiveFixDraftType, PrismaDraftType> = {
      answer_block: 'ANSWER_BLOCK',
      comparison_copy: 'COMPARISON_COPY',
      positioning_section: 'POSITIONING_SECTION',
    };
    return mapping[type];
  }

  private fromPrismaDraftType(type: PrismaDraftType): CompetitiveFixDraftType {
    const mapping: Record<PrismaDraftType, CompetitiveFixDraftType> = {
      ANSWER_BLOCK: 'answer_block',
      COMPARISON_COPY: 'comparison_copy',
      POSITIONING_SECTION: 'positioning_section',
    };
    return mapping[type];
  }

  private toPrismaApplyTarget(target: CompetitiveFixApplyTarget): PrismaApplyTarget {
    const mapping: Record<CompetitiveFixApplyTarget, PrismaApplyTarget> = {
      ANSWER_BLOCK: 'ANSWER_BLOCK',
      CONTENT_SECTION: 'CONTENT_SECTION',
      WHY_CHOOSE_SECTION: 'WHY_CHOOSE_SECTION',
    };
    return mapping[target];
  }

  // ============================================================================
  // Heuristic Competitor Assignment
  // ============================================================================

  /**
   * Generate heuristic competitors for a product.
   * Uses product title/category to suggest typical competitor profiles.
   * NOTE: These are generic placeholders - not real scraped competitors.
   */
  private generateHeuristicCompetitors(productTitle: string): ProductCompetitorRef[] {
    // Extract product type for heuristic naming
    const words = productTitle.split(' ').filter(w => w.length > 2);
    const productType = words[words.length - 1] || 'Product';

    return [
      {
        id: 'heuristic_1',
        displayName: `Leading ${productType} Brand`,
        source: 'heuristic_category',
      },
      {
        id: 'heuristic_2',
        displayName: `Popular ${productType} Alternative`,
        source: 'heuristic_category',
      },
      {
        id: 'heuristic_3',
        displayName: `Budget ${productType} Option`,
        source: 'heuristic_category',
      },
    ];
  }

  // ============================================================================
  // Coverage Analysis
  // ============================================================================

  /**
   * Analyze competitive coverage for a single product.
   * Uses heuristics to determine how well the product covers areas
   * that competitors in the category typically cover.
   */
  async analyzeProductCompetitiveCoverage(
    productId: string
  ): Promise<ProductCompetitiveCoverage> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        answerBlocks: true,
        intentCoverages: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get or generate competitors
    let competitors = await this.prisma.productCompetitor.findMany({
      where: { productId },
    });

    if (competitors.length === 0) {
      // Generate heuristic competitors
      const heuristicCompetitors = this.generateHeuristicCompetitors(product.title);
      for (const hc of heuristicCompetitors) {
        await this.prisma.productCompetitor.create({
          data: {
            productId,
            displayName: hc.displayName,
            source: hc.source,
          },
        });
      }
      competitors = await this.prisma.productCompetitor.findMany({
        where: { productId },
      });
    }

    // Analyze coverage for each area
    const coverageAreas = await this.analyzeCoverageAreas(product);

    // Calculate overall score
    const totalWeight = COMPETITIVE_COVERAGE_AREAS.reduce((sum, a) => sum + a.severityWeight, 0);
    const earnedWeight = coverageAreas
      .filter(a => a.merchantCovers)
      .reduce((sum, a) => sum + a.severityWeight, 0);
    const overallScore = Math.round((earnedWeight / totalWeight) * 100);

    // Count areas where competitors lead
    const areasWhereCompetitorsLead = coverageAreas.filter(
      a => !a.merchantCovers && a.oneCompetitorCovers
    ).length;

    const status = getCompetitiveStatusFromScore(overallScore);

    const coverage: ProductCompetitiveCoverage = {
      productId,
      competitors: competitors.map(c => ({
        id: c.id,
        displayName: c.displayName,
        logoUrl: c.logoUrl || undefined,
        homepageUrl: c.homepageUrl || undefined,
        source: c.source as 'heuristic_collection' | 'heuristic_category' | 'merchant_configured',
      })),
      coverageAreas,
      overallScore,
      areasWhereCompetitorsLead,
      status,
      computedAt: new Date().toISOString(),
    };

    // Persist to database
    await this.persistCoverage(productId, coverage);

    return coverage;
  }

  /**
   * Analyze coverage for each competitive area.
   */
  private async analyzeCoverageAreas(
    product: {
      title: string;
      description: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
      answerBlocks: { questionText: string; answerText: string }[];
      intentCoverages: { intentType: string; coverageStatus: string }[];
    }
  ): Promise<CompetitiveCoverageArea[]> {
    const areas: CompetitiveCoverageArea[] = [];
    const productContent = [
      product.title,
      product.description || '',
      product.seoTitle || '',
      product.seoDescription || '',
    ].join(' ').toLowerCase();

    const answerBlockContent = product.answerBlocks
      .map(ab => `${ab.questionText} ${ab.answerText}`)
      .join(' ')
      .toLowerCase();

    for (const areaDef of COMPETITIVE_COVERAGE_AREAS) {
      const gapType = getGapTypeForArea(areaDef.areaId);
      const intentType = getIntentTypeFromAreaId(areaDef.areaId);

      // Determine merchant coverage based on area type
      let merchantCovers = false;

      if (intentType) {
        // Check intent coverage from Search & Intent data
        const intentCoverage = product.intentCoverages.find(
          ic => ic.intentType.toLowerCase() === intentType.toUpperCase().replace(/_/g, '_')
        );
        merchantCovers = intentCoverage
          ? ['PARTIAL', 'COVERED'].includes(intentCoverage.coverageStatus)
          : false;

        // Also check Answer Blocks for intent-related coverage
        if (!merchantCovers) {
          merchantCovers = this.checkAnswerBlockCoverage(answerBlockContent, intentType);
        }
      } else if (gapType === 'content_section_gap') {
        // Check for content section indicators
        merchantCovers = this.checkContentSectionCoverage(productContent, answerBlockContent, areaDef.areaId);
      } else if (gapType === 'trust_signal_gap') {
        // Check for trust signal indicators
        merchantCovers = this.checkTrustSignalCoverage(productContent, answerBlockContent, areaDef.areaId);
      }

      // For heuristic competitors, assume they cover high-impact areas
      // This is a baseline assumption, not actual competitor data
      const oneCompetitorCovers = areaDef.severityWeight >= 6;
      const twoOrMoreCompetitorsCovers = areaDef.severityWeight >= 8;

      const gapDescription = !merchantCovers && oneCompetitorCovers
        ? `Your product may be missing ${areaDef.label.toLowerCase()} that competitors typically include.`
        : undefined;

      const exampleScenario = !merchantCovers && oneCompetitorCovers
        ? this.generateExampleScenario(areaDef.areaId)
        : undefined;

      areas.push({
        areaId: areaDef.areaId,
        gapType,
        intentType,
        merchantCovers,
        oneCompetitorCovers,
        twoOrMoreCompetitorsCovers,
        severityWeight: areaDef.severityWeight,
        gapDescription,
        exampleScenario,
      });
    }

    return areas;
  }

  /**
   * Check if Answer Blocks cover a given intent type.
   */
  private checkAnswerBlockCoverage(answerBlockContent: string, intentType: SearchIntentType): boolean {
    const intentKeywords: Record<SearchIntentType, string[]> = {
      transactional: ['buy', 'price', 'order', 'purchase', 'cost', 'shipping'],
      comparative: ['vs', 'compare', 'alternative', 'better', 'difference'],
      problem_use_case: ['how to', 'use', 'for', 'when', 'beginner'],
      trust_validation: ['review', 'worth', 'good', 'quality', 'recommend'],
      informational: ['what is', 'how', 'explain', 'about'],
    };

    const keywords = intentKeywords[intentType] || [];
    return keywords.some(kw => answerBlockContent.includes(kw));
  }

  /**
   * Check if content covers a specific content section area.
   */
  private checkContentSectionCoverage(
    productContent: string,
    answerBlockContent: string,
    areaId: CompetitiveCoverageAreaId
  ): boolean {
    const combinedContent = `${productContent} ${answerBlockContent}`;

    const sectionKeywords: Partial<Record<CompetitiveCoverageAreaId, string[]>> = {
      comparison_section: ['vs', 'compare', 'versus', 'alternative', 'better than'],
      why_choose_section: ['why choose', 'why our', 'choose us', 'advantage'],
      buying_guide_section: ['guide', 'how to choose', 'buying', 'selection'],
      feature_benefits_section: ['feature', 'benefit', 'advantage', 'includes'],
    };

    const keywords = sectionKeywords[areaId] || [];
    return keywords.some(kw => combinedContent.includes(kw));
  }

  /**
   * Check if content covers trust signal areas.
   */
  private checkTrustSignalCoverage(
    productContent: string,
    answerBlockContent: string,
    areaId: CompetitiveCoverageAreaId
  ): boolean {
    const combinedContent = `${productContent} ${answerBlockContent}`;

    const trustKeywords: Partial<Record<CompetitiveCoverageAreaId, string[]>> = {
      faq_coverage: ['faq', 'question', 'answer', 'commonly asked'],
      reviews_section: ['review', 'rating', 'testimonial', 'customer says'],
      guarantee_section: ['guarantee', 'warranty', 'return', 'refund', 'money back'],
    };

    const keywords = trustKeywords[areaId] || [];
    return keywords.some(kw => combinedContent.includes(kw));
  }

  /**
   * Generate example scenario for a gap.
   */
  private generateExampleScenario(areaId: CompetitiveCoverageAreaId): string {
    const scenarios: Partial<Record<CompetitiveCoverageAreaId, string>> = {
      transactional_intent: 'A buyer searching "buy [product]" may find competitor pages with clear pricing and purchase CTAs.',
      comparative_intent: 'A shopper comparing options may find competitor pages with vs. comparisons while yours lacks this.',
      comparison_section: 'Competitors often include "Why choose us vs alternatives" sections that help buyers decide.',
      why_choose_section: 'A "Why Choose [Brand]" section helps differentiate from competitors.',
      faq_coverage: 'FAQ sections address common buyer questions that competitors answer upfront.',
      guarantee_section: 'Trust signals like guarantees and warranties can be the deciding factor for cautious buyers.',
    };

    return scenarios[areaId] || 'Competitors in your category typically cover this area.';
  }

  /**
   * Persist coverage data to database.
   */
  private async persistCoverage(
    productId: string,
    coverage: ProductCompetitiveCoverage
  ): Promise<void> {
    await this.prisma.productCompetitiveCoverage.upsert({
      where: { productId },
      create: {
        productId,
        coverageData: coverage.coverageAreas as any,
        overallScore: coverage.overallScore,
        areasWhereCompetitorsLead: coverage.areasWhereCompetitorsLead,
        status: this.toPrismaStatus(coverage.status),
        computedAt: new Date(),
      },
      update: {
        coverageData: coverage.coverageAreas as any,
        overallScore: coverage.overallScore,
        areasWhereCompetitorsLead: coverage.areasWhereCompetitorsLead,
        status: this.toPrismaStatus(coverage.status),
        computedAt: new Date(),
      },
    });
  }

  // ============================================================================
  // Product Data Access
  // ============================================================================

  /**
   * Get product competitive data including coverage, gaps, and drafts.
   */
  async getProductCompetitiveData(
    productId: string,
    userId: string
  ): Promise<ProductCompetitiveResponse> {
    // Verify product exists and user has access
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
        competitors: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this product');
    }

    // Get or compute coverage
    const coverageRow = await this.prisma.productCompetitiveCoverage.findUnique({
      where: { productId },
    });

    let coverage: ProductCompetitiveCoverage;
    if (!coverageRow) {
      // Compute coverage on first access
      coverage = await this.analyzeProductCompetitiveCoverage(productId);
    } else {
      // Convert from database
      coverage = {
        productId,
        competitors: product.competitors.map(c => ({
          id: c.id,
          displayName: c.displayName,
          logoUrl: c.logoUrl || undefined,
          homepageUrl: c.homepageUrl || undefined,
          source: c.source as 'heuristic_collection' | 'heuristic_category' | 'merchant_configured',
        })),
        coverageAreas: coverageRow.coverageData as unknown as CompetitiveCoverageArea[],
        overallScore: coverageRow.overallScore,
        areasWhereCompetitorsLead: coverageRow.areasWhereCompetitorsLead,
        status: this.fromPrismaStatus(coverageRow.status),
        computedAt: coverageRow.computedAt.toISOString(),
      };
    }

    // Generate gaps from coverage
    const gaps = this.generateGapsFromCoverage(productId, coverage.coverageAreas);

    // Get open drafts
    const draftRows = await this.prisma.productCompetitiveFixDraft.findMany({
      where: {
        productId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    const openDrafts: CompetitiveFixDraft[] = draftRows.map(row => ({
      id: row.id,
      productId: row.productId,
      gapType: this.fromPrismaGapType(row.gapType),
      intentType: row.intentType ? row.intentType.toLowerCase().replace(/_/g, '_') as SearchIntentType : undefined,
      areaId: row.areaId as CompetitiveCoverageAreaId,
      draftType: this.fromPrismaDraftType(row.draftType),
      draftPayload: row.draftPayload as any,
      aiWorkKey: row.aiWorkKey,
      reusedFromWorkKey: row.reusedFromWorkKey || undefined,
      generatedWithAi: row.generatedWithAi,
      generatedAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    }));

    return {
      productId,
      competitors: coverage.competitors,
      coverage,
      gaps,
      openDrafts,
    };
  }

  /**
   * Generate fix gaps from coverage areas.
   */
  private generateGapsFromCoverage(
    productId: string,
    coverageAreas: CompetitiveCoverageArea[]
  ): CompetitiveFixGap[] {
    const gaps: CompetitiveFixGap[] = [];

    for (const area of coverageAreas) {
      // Only create gaps for areas where merchant doesn't cover but competitors do
      if (area.merchantCovers || !area.oneCompetitorCovers) {
        continue;
      }

      const competitorCount = area.twoOrMoreCompetitorsCovers ? 2 : 1;
      const severity = calculateCompetitiveSeverity(competitorCount, area.intentType);

      // Determine recommended action based on gap type
      let recommendedAction: 'answer_block' | 'comparison_section' | 'description_expansion' | 'faq_section';
      if (area.gapType === 'intent_gap') {
        recommendedAction = 'answer_block';
      } else if (area.areaId === 'comparison_section' || area.areaId === 'why_choose_section') {
        recommendedAction = 'comparison_section';
      } else if (area.areaId === 'faq_coverage') {
        recommendedAction = 'faq_section';
      } else {
        recommendedAction = 'description_expansion';
      }

      gaps.push({
        id: `gap_${productId}_${area.areaId}`,
        productId,
        gapType: area.gapType,
        intentType: area.intentType,
        areaId: area.areaId,
        exampleScenario: area.exampleScenario || '',
        whyItMatters: area.gapDescription || 'Competitors typically cover this area.',
        competitorCount,
        recommendedAction,
        severity,
        automationAvailable: area.gapType === 'intent_gap' || area.areaId === 'comparison_section',
      });
    }

    return gaps;
  }

  // ============================================================================
  // Project-Level Summary
  // ============================================================================

  /**
   * Get project-level Competitive Positioning scorecard.
   */
  async getProjectCompetitiveScorecard(
    projectId: string,
    userId: string
  ): Promise<CompetitiveScorecard> {
    // Verify access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Get all products for project
    const products = await this.prisma.product.findMany({
      where: { projectId },
      select: { id: true },
    });

    if (products.length === 0) {
      return {
        overallScore: 0,
        gapBreakdown: [
          { gapType: 'intent_gap', label: COMPETITOR_GAP_LABELS.intent_gap, productsWithGaps: 0, averageScore: 0 },
          { gapType: 'content_section_gap', label: COMPETITOR_GAP_LABELS.content_section_gap, productsWithGaps: 0, averageScore: 0 },
          { gapType: 'trust_signal_gap', label: COMPETITOR_GAP_LABELS.trust_signal_gap, productsWithGaps: 0, averageScore: 0 },
        ],
        productsBehind: 0,
        productsOnPar: 0,
        productsAhead: 0,
        status: 'Behind',
        totalProducts: 0,
        computedAt: new Date().toISOString(),
      };
    }

    // Get all coverage rows
    const productIds = products.map(p => p.id);
    const coverageRows = await this.prisma.productCompetitiveCoverage.findMany({
      where: { productId: { in: productIds } },
    });

    // Calculate aggregates
    const productsBehind = coverageRows.filter(r => r.status === 'BEHIND').length;
    const productsOnPar = coverageRows.filter(r => r.status === 'ON_PAR').length;
    const productsAhead = coverageRows.filter(r => r.status === 'AHEAD').length;

    const avgScore = coverageRows.length > 0
      ? Math.round(coverageRows.reduce((sum, r) => sum + r.overallScore, 0) / coverageRows.length)
      : 0;

    // Gap breakdown by type
    const gapBreakdown: CompetitiveScorecard['gapBreakdown'] = [];
    for (const gapType of ['intent_gap', 'content_section_gap', 'trust_signal_gap'] as CompetitorGapType[]) {
      let productsWithGaps = 0;
      let totalScore = 0;

      for (const row of coverageRows) {
        const areas = row.coverageData as unknown as CompetitiveCoverageArea[];
        const typeAreas = areas.filter(a => a.gapType === gapType);
        const coveredCount = typeAreas.filter(a => a.merchantCovers).length;
        const typeScore = typeAreas.length > 0
          ? (coveredCount / typeAreas.length) * 100
          : 100;
        totalScore += typeScore;

        if (coveredCount < typeAreas.length) {
          productsWithGaps++;
        }
      }

      gapBreakdown.push({
        gapType,
        label: COMPETITOR_GAP_LABELS[gapType],
        productsWithGaps,
        averageScore: coverageRows.length > 0 ? Math.round(totalScore / coverageRows.length) : 0,
      });
    }

    return {
      overallScore: avgScore,
      gapBreakdown,
      productsBehind,
      productsOnPar,
      productsAhead,
      status: getCompetitiveStatusFromScore(avgScore),
      totalProducts: products.length,
      computedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // Issue Generation
  // ============================================================================

  /**
   * Build Competitive Positioning issues for a project.
   * Called by deo-issues.service.ts to include competitive issues.
   */
  async buildCompetitiveIssues(projectId: string): Promise<DeoIssue[]> {
    const products = await this.prisma.product.findMany({
      where: { projectId },
      select: { id: true, title: true },
    });

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map(p => p.id);
    const coverageRows = await this.prisma.productCompetitiveCoverage.findMany({
      where: { productId: { in: productIds } },
    });

    const issues: DeoIssue[] = [];

    // Group by gap type and area
    const gapCounts: Map<string, {
      gapType: CompetitorGapType;
      areaId: CompetitiveCoverageAreaId;
      productIds: string[];
      intentType?: SearchIntentType;
      competitorCount: number;
    }> = new Map();

    for (const row of coverageRows) {
      const areas = row.coverageData as unknown as CompetitiveCoverageArea[];

      for (const area of areas) {
        if (area.merchantCovers || !area.oneCompetitorCovers) {
          continue;
        }

        const key = `${area.gapType}_${area.areaId}`;
        const existing = gapCounts.get(key);

        if (existing) {
          existing.productIds.push(row.productId);
        } else {
          gapCounts.set(key, {
            gapType: area.gapType,
            areaId: area.areaId,
            productIds: [row.productId],
            intentType: area.intentType,
            competitorCount: area.twoOrMoreCompetitorsCovers ? 2 : 1,
          });
        }
      }
    }

    // Generate issues for each gap
    for (const [key, gap] of gapCounts) {
      const severity: DeoIssueSeverity = calculateCompetitiveSeverity(gap.competitorCount, gap.intentType);
      const areaDef = COMPETITIVE_COVERAGE_AREAS.find(a => a.areaId === gap.areaId);

      const title = gap.intentType
        ? `Missing ${areaDef?.label || gap.areaId} vs Competitors`
        : `Competitors Lead on ${areaDef?.label || gap.areaId}`;

      const description = gap.intentType
        ? `${gap.productIds.length} products lack ${gap.intentType} intent coverage that competitors in your category typically have.`
        : `${gap.productIds.length} products are missing ${areaDef?.label.toLowerCase() || gap.areaId} that competitors typically include.`;

      issues.push({
        id: `competitive_${key}`,
        title,
        description,
        severity,
        count: gap.productIds.length,
        affectedProducts: gap.productIds,
        pillarId: 'competitive_positioning',
        actionability: gap.gapType === 'intent_gap' ? 'automation' : 'manual',
        gapType: gap.gapType,
        competitorCount: gap.competitorCount,
        competitiveAreaId: gap.areaId,
        intentType: gap.intentType,
        recommendedAction: gap.gapType === 'intent_gap'
          ? 'Add Answer Block to address this intent'
          : 'Add content section addressing this area',
      });
    }

    return issues;
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  /**
   * Invalidate coverage cache for a product.
   */
  async invalidateCoverage(productId: string): Promise<void> {
    await this.prisma.productCompetitiveCoverage.deleteMany({
      where: { productId },
    });
  }
}
