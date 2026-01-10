import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import {
  SearchIntentType as PrismaIntentType,
  IntentCoverageStatus as PrismaCoverageStatus,
} from '@prisma/client';
import {
  SearchIntentType,
  IntentCoverageStatus,
  ProductIntentCoverage,
  SearchIntentScorecard,
  DEFAULT_INTENT_TEMPLATES,
  SEARCH_INTENT_TYPES,
  SEARCH_INTENT_WEIGHTS,
  SEARCH_INTENT_LABELS,
  getCoverageStatusFromScore,
  isHighValueIntent,
  ProductSearchIntentResponse,
  IntentFixDraft,
} from '@engineo/shared';
import type { DeoIssue, DeoIssueSeverity } from '@engineo/shared';

/**
 * SearchIntentService handles all Search & Intent pillar functionality:
 * - Per-product intent coverage analysis
 * - Project-level scorecard aggregation
 * - Intent issue generation for DEO Issues Engine
 * - Fix draft management (preview/apply patterns)
 */
/**
 * [ROLES-3 FIXUP-3] SearchIntentService
 * Updated with membership-aware access control (any ProjectMember can view).
 */
@Injectable()
export class SearchIntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  // ============================================================================
  // Type Mapping Helpers
  // ============================================================================

  private toPrismaIntentType(type: SearchIntentType): PrismaIntentType {
    const mapping: Record<SearchIntentType, PrismaIntentType> = {
      informational: 'INFORMATIONAL',
      comparative: 'COMPARATIVE',
      transactional: 'TRANSACTIONAL',
      problem_use_case: 'PROBLEM_USE_CASE',
      trust_validation: 'TRUST_VALIDATION',
    };
    return mapping[type];
  }

  private fromPrismaIntentType(type: PrismaIntentType): SearchIntentType {
    const mapping: Record<PrismaIntentType, SearchIntentType> = {
      INFORMATIONAL: 'informational',
      COMPARATIVE: 'comparative',
      TRANSACTIONAL: 'transactional',
      PROBLEM_USE_CASE: 'problem_use_case',
      TRUST_VALIDATION: 'trust_validation',
    };
    return mapping[type];
  }

  private toPrismaCoverageStatus(status: IntentCoverageStatus): PrismaCoverageStatus {
    const mapping: Record<IntentCoverageStatus, PrismaCoverageStatus> = {
      none: 'NONE',
      weak: 'WEAK',
      partial: 'PARTIAL',
      covered: 'COVERED',
    };
    return mapping[status];
  }

  private fromPrismaCoverageStatus(status: PrismaCoverageStatus): IntentCoverageStatus {
    const mapping: Record<PrismaCoverageStatus, IntentCoverageStatus> = {
      NONE: 'none',
      WEAK: 'weak',
      PARTIAL: 'partial',
      COVERED: 'covered',
    };
    return mapping[status];
  }

  // ============================================================================
  // Query Template Application
  // ============================================================================

  /**
   * Generate expected queries for a product based on templates.
   */
  private generateExpectedQueries(
    product: { title: string; description?: string | null },
    intentType: SearchIntentType
  ): string[] {
    const templates = DEFAULT_INTENT_TEMPLATES.filter(t => t.intentType === intentType);
    const queries: string[] = [];

    for (const template of templates) {
      // Simple token replacement
      let query = template.pattern;
      query = query.replace('{{title}}', product.title);
      query = query.replace('{{type}}', this.extractProductType(product.title));
      query = query.replace('{{tags}}', ''); // Would need actual tags from Shopify
      queries.push(query.trim());
    }

    return queries;
  }

  /**
   * Extract a simple product type from title (e.g., "Snowboard" from "Burton Custom Snowboard")
   */
  private extractProductType(title: string): string {
    // Simple heuristic: use the last word as the product type
    const words = title.split(' ').filter(w => w.length > 2);
    return words[words.length - 1] || 'product';
  }

  // ============================================================================
  // Coverage Analysis
  // ============================================================================

  /**
   * Analyze intent coverage for a single product.
   * Uses heuristics to determine how well the product's content
   * addresses expected queries for each intent type.
   */
  async analyzeProductIntent(
    productId: string
  ): Promise<ProductIntentCoverage[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        answerBlocks: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const coverages: ProductIntentCoverage[] = [];
    const answerBlockTexts = product.answerBlocks.map(ab =>
      `${ab.questionText} ${ab.answerText}`.toLowerCase()
    );
    const productContent = [
      product.title,
      product.description || '',
      product.seoTitle || '',
      product.seoDescription || '',
    ].join(' ').toLowerCase();

    for (const intentType of SEARCH_INTENT_TYPES) {
      const expectedQueries = this.generateExpectedQueries(product, intentType);
      const missingQueries: string[] = [];
      const weakQueries: string[] = [];
      const coveredQueries: string[] = [];

      for (const query of expectedQueries) {
        const queryLower = query.toLowerCase();
        const queryKeywords = queryLower.split(' ').filter(w => w.length > 2);

        // Check Answer Blocks first (strong coverage)
        const hasAnswerBlock = answerBlockTexts.some(text =>
          queryKeywords.some(kw => text.includes(kw))
        );

        if (hasAnswerBlock) {
          coveredQueries.push(query);
          continue;
        }

        // Check product content (weaker coverage)
        const keywordsInContent = queryKeywords.filter(kw =>
          productContent.includes(kw)
        ).length;
        const coverageRatio = keywordsInContent / queryKeywords.length;

        if (coverageRatio >= 0.7) {
          coveredQueries.push(query);
        } else if (coverageRatio >= 0.3) {
          weakQueries.push(query);
        } else {
          missingQueries.push(query);
        }
      }

      // Calculate score based on coverage
      const totalQueries = expectedQueries.length;
      const coveredWeight = coveredQueries.length * 1.0;
      const weakWeight = weakQueries.length * 0.3;
      const score = totalQueries > 0
        ? Math.round(((coveredWeight + weakWeight) / totalQueries) * 100)
        : 0;

      const coverageStatus = getCoverageStatusFromScore(score);

      coverages.push({
        productId,
        intentType,
        score,
        coverageStatus,
        missingQueries,
        weakQueries,
        coveredQueries,
        expectedQueries,
        computedAt: new Date().toISOString(),
      });
    }

    // Persist coverage to database
    await this.persistCoverage(productId, coverages);

    return coverages;
  }

  /**
   * Persist coverage data to database.
   */
  private async persistCoverage(
    productId: string,
    coverages: ProductIntentCoverage[]
  ): Promise<void> {
    for (const coverage of coverages) {
      await this.prisma.productIntentCoverage.upsert({
        where: {
          productId_intentType: {
            productId,
            intentType: this.toPrismaIntentType(coverage.intentType),
          },
        },
        create: {
          productId,
          intentType: this.toPrismaIntentType(coverage.intentType),
          score: coverage.score,
          coverageStatus: this.toPrismaCoverageStatus(coverage.coverageStatus),
          missingQueries: coverage.missingQueries,
          weakQueries: coverage.weakQueries,
          coveredQueries: coverage.coveredQueries,
          expectedQueries: coverage.expectedQueries,
          computedAt: new Date(),
        },
        update: {
          score: coverage.score,
          coverageStatus: this.toPrismaCoverageStatus(coverage.coverageStatus),
          missingQueries: coverage.missingQueries,
          weakQueries: coverage.weakQueries,
          coveredQueries: coverage.coveredQueries,
          expectedQueries: coverage.expectedQueries,
          computedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get product intent data including coverage, scorecard, and open drafts.
   */
  async getProductIntentData(
    productId: string,
    userId: string
  ): Promise<ProductSearchIntentResponse> {
    // Verify product exists and user has access
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(product.projectId, userId);

    // Get or compute coverage
    let coverageRows = await this.prisma.productIntentCoverage.findMany({
      where: { productId },
    });

    if (coverageRows.length === 0) {
      // Compute coverage on first access
      await this.analyzeProductIntent(productId);
      coverageRows = await this.prisma.productIntentCoverage.findMany({
        where: { productId },
      });
    }

    // Convert to shared types
    const coverage: ProductIntentCoverage[] = coverageRows.map(row => ({
      productId: row.productId,
      intentType: this.fromPrismaIntentType(row.intentType),
      score: row.score,
      coverageStatus: this.fromPrismaCoverageStatus(row.coverageStatus),
      missingQueries: row.missingQueries as string[],
      weakQueries: row.weakQueries as string[],
      coveredQueries: row.coveredQueries as string[],
      expectedQueries: row.expectedQueries as string[],
      computedAt: row.computedAt.toISOString(),
    }));

    // Calculate product-level scorecard
    const weightedSum = coverage.reduce((sum, c) => {
      return sum + c.score * SEARCH_INTENT_WEIGHTS[c.intentType];
    }, 0);
    const totalWeight = Object.values(SEARCH_INTENT_WEIGHTS).reduce((a, b) => a + b, 0);
    const overallScore = Math.round(weightedSum / totalWeight);

    const missingHighValueIntents = coverage.filter(
      c => isHighValueIntent(c.intentType) && c.coverageStatus === 'none'
    ).length;

    // Get open drafts
    const draftRows = await this.prisma.productIntentFixDraft.findMany({
      where: {
        productId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    const openDrafts: IntentFixDraft[] = draftRows.map(row => ({
      id: row.id,
      productId: row.productId,
      intentType: this.fromPrismaIntentType(row.intentType),
      query: row.query,
      draftType: row.draftType.toLowerCase() as any,
      draftPayload: row.draftPayload as any,
      aiWorkKey: row.aiWorkKey,
      reusedFromWorkKey: row.reusedFromWorkKey || undefined,
      generatedWithAi: row.generatedWithAi,
      generatedAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    }));

    return {
      productId,
      coverage,
      scorecard: {
        overallScore,
        status: overallScore >= 60 ? 'Good' : 'Needs improvement',
        missingHighValueIntents,
      },
      openDrafts,
    };
  }

  // ============================================================================
  // Project-Level Summary
  // ============================================================================

  /**
   * Get project-level Search & Intent scorecard.
   */
  async getProjectIntentSummary(
    projectId: string,
    userId: string
  ): Promise<SearchIntentScorecard> {
    // Verify access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    // Get all products for project
    const products = await this.prisma.product.findMany({
      where: { projectId },
      select: { id: true },
    });

    if (products.length === 0) {
      return {
        overallScore: 0,
        intentBreakdown: SEARCH_INTENT_TYPES.map(intentType => ({
          intentType,
          label: SEARCH_INTENT_LABELS[intentType],
          score: 0,
          status: 'none' as IntentCoverageStatus,
          productsWithGaps: 0,
        })),
        missingHighValueIntents: 0,
        status: 'Needs improvement',
        totalProducts: 0,
        computedAt: new Date().toISOString(),
      };
    }

    // Get all coverage rows for project products
    const productIds = products.map(p => p.id);
    const coverageRows = await this.prisma.productIntentCoverage.findMany({
      where: {
        productId: { in: productIds },
      },
    });

    // Aggregate by intent type
    const intentBreakdown = SEARCH_INTENT_TYPES.map(intentType => {
      const rows = coverageRows.filter(
        r => this.fromPrismaIntentType(r.intentType) === intentType
      );
      const avgScore = rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length)
        : 0;
      const productsWithGaps = rows.filter(
        r => this.fromPrismaCoverageStatus(r.coverageStatus) !== 'covered'
      ).length;

      return {
        intentType,
        label: SEARCH_INTENT_LABELS[intentType],
        score: avgScore,
        status: getCoverageStatusFromScore(avgScore),
        productsWithGaps,
      };
    });

    // Calculate weighted overall score
    const weightedSum = intentBreakdown.reduce((sum, b) => {
      return sum + b.score * SEARCH_INTENT_WEIGHTS[b.intentType];
    }, 0);
    const totalWeight = Object.values(SEARCH_INTENT_WEIGHTS).reduce((a, b) => a + b, 0);
    const overallScore = Math.round(weightedSum / totalWeight);

    // Count products with missing high-value intents
    const highValueIntentTypes: PrismaIntentType[] = ['TRANSACTIONAL', 'COMPARATIVE'];
    const missingHighValueIntents = coverageRows.filter(
      r => highValueIntentTypes.includes(r.intentType) &&
           r.coverageStatus === 'NONE'
    ).length;

    return {
      overallScore,
      intentBreakdown,
      missingHighValueIntents,
      status: overallScore >= 60 ? 'Good' : 'Needs improvement',
      totalProducts: products.length,
      computedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // Issue Generation
  // ============================================================================

  /**
   * Build Search & Intent issues for a project.
   * Called by deo-issues.service.ts to include intent issues in the issues list.
   */
  async buildSearchIntentIssues(projectId: string): Promise<DeoIssue[]> {
    const products = await this.prisma.product.findMany({
      where: { projectId },
      select: { id: true, title: true },
    });

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map(p => p.id);
    const coverageRows = await this.prisma.productIntentCoverage.findMany({
      where: {
        productId: { in: productIds },
      },
    });

    const issues: DeoIssue[] = [];

    // Group coverage by intent type
    for (const intentType of SEARCH_INTENT_TYPES) {
      const prismaType = this.toPrismaIntentType(intentType);
      const rows = coverageRows.filter(r => r.intentType === prismaType);

      // Find products with missing or weak coverage
      const missingProducts = rows.filter(r => r.coverageStatus === 'NONE');
      const weakProducts = rows.filter(r => r.coverageStatus === 'WEAK');

      const isHighValue = isHighValueIntent(intentType);

      // Generate issue for missing coverage
      if (missingProducts.length > 0) {
        const severity: DeoIssueSeverity = isHighValue ? 'critical' : 'warning';
        const allMissingQueries = missingProducts.flatMap(
          r => (r.missingQueries as string[]).slice(0, 2)
        );
        const exampleQueries = [...new Set(allMissingQueries)].slice(0, 5);

        issues.push({
          id: `missing_${intentType}_intent`,
          title: `Missing ${SEARCH_INTENT_LABELS[intentType]} Intent Coverage`,
          description: `${missingProducts.length} products have no coverage for ${intentType} search queries. Users searching with ${intentType} intent may not find your products.`,
          severity,
          count: missingProducts.length,
          affectedProducts: missingProducts.map(r => r.productId),
          pillarId: 'search_intent_fit',
          actionability: 'automation',
          intentType,
          exampleQueries,
          coverageStatus: 'none',
          recommendedAction: isHighValue
            ? 'Add Answer Blocks addressing purchase/comparison queries'
            : 'Expand product descriptions with relevant content',
        });
      }

      // Generate issue for weak coverage
      if (weakProducts.length > 0) {
        const severity: DeoIssueSeverity = isHighValue ? 'warning' : 'info';
        const allWeakQueries = weakProducts.flatMap(
          r => (r.weakQueries as string[]).slice(0, 2)
        );
        const exampleQueries = [...new Set(allWeakQueries)].slice(0, 5);

        issues.push({
          id: `weak_${intentType}_coverage`,
          title: `Weak ${SEARCH_INTENT_LABELS[intentType]} Intent Coverage`,
          description: `${weakProducts.length} products have weak coverage for ${intentType} search queries. Content exists but may not fully address user intent.`,
          severity,
          count: weakProducts.length,
          affectedProducts: weakProducts.map(r => r.productId),
          pillarId: 'search_intent_fit',
          actionability: 'automation',
          intentType,
          exampleQueries,
          coverageStatus: 'weak',
          recommendedAction: 'Strengthen existing content or add targeted Answer Blocks',
        });
      }
    }

    return issues;
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  /**
   * Invalidate coverage cache for a product (e.g., after Answer Block changes).
   */
  async invalidateCoverage(productId: string): Promise<void> {
    await this.prisma.productIntentCoverage.deleteMany({
      where: { productId },
    });
  }
}
