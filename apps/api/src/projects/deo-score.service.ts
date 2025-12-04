import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  DEO_SCORE_VERSION,
  DeoScoreBreakdown,
  DeoScoreLatestResponse,
  DeoScoreSignals,
  DeoScoreSnapshot as DeoScoreSnapshotDto,
  computeDeoScoreFromSignals,
} from '@engineo/shared';

@Injectable()
export class DeoScoreService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the latest DEO score snapshot for a project,
   * with ownership validation.
   */
  async getLatestForProject(projectId: string, userId: string): Promise<DeoScoreLatestResponse> {
    const prisma = this.prisma as any;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const snapshot = await prisma.deoScoreSnapshot.findFirst({
      where: { projectId },
      orderBy: { computedAt: 'desc' },
    });

    if (!snapshot) {
      return {
        projectId,
        latestScore: null,
        latestSnapshot: null,
      };
    }

    const breakdown: DeoScoreBreakdown = {
      overall: snapshot.overallScore,
      content: snapshot.contentScore,
      entities: snapshot.entityScore,
      technical: snapshot.technicalScore,
      visibility: snapshot.visibilityScore,
    };

    const latestSnapshot: DeoScoreSnapshotDto = {
      id: snapshot.id,
      projectId,
      version: snapshot.version,
      computedAt: snapshot.computedAt.toISOString(),
      breakdown,
      metadata: (snapshot.metadata as Record<string, unknown> | null) ?? undefined,
    };

    return {
      projectId,
      latestScore: breakdown,
      latestSnapshot,
    };
  }

  /**
   * Compute DEO score breakdown from normalized signals and persist as snapshot.
   *
   * This is the v1 scoring engine entry point, used by the recompute worker.
   */
  async computeAndPersistScoreFromSignals(
    projectId: string,
    signals: DeoScoreSignals,
  ): Promise<DeoScoreSnapshotDto> {
    const prisma = this.prisma as any;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const breakdown = computeDeoScoreFromSignals(signals);
    const now = new Date();

    const created = await prisma.deoScoreSnapshot.create({
      data: {
        projectId,
        overallScore: breakdown.overall,
        contentScore: breakdown.content ?? null,
        entityScore: breakdown.entities ?? null,
        technicalScore: breakdown.technical ?? null,
        visibilityScore: breakdown.visibility ?? null,
        version: DEO_SCORE_VERSION,
        metadata: {},
        computedAt: now,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        currentDeoScore: breakdown.overall,
        currentDeoScoreComputedAt: now,
      },
    });

    return {
      id: created.id,
      projectId,
      version: created.version,
      computedAt: created.computedAt.toISOString(),
      breakdown,
      metadata: (created.metadata as Record<string, unknown> | null) ?? undefined,
    };
  }
}

/**
 * Service that collects DEO signals for a project.
 *
 * Phase 2.4: Uses heuristic, data-driven signals derived from existing DB tables
 * (CrawlResult, Product, Project) only. All signals are normalized in the 0–1 range.
 */
@Injectable()
export class DeoSignalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Collect all signals needed for DEO score computation.
   *
   * Heuristics are intentionally simple and based only on existing data:
   * - Content: coverage, depth, freshness
   * - Entities: hint coverage, structure accuracy, linkage density (heuristic v1)
   * - Technical: crawl health, indexability, html structural quality, thin content quality, placeholder CWV
   * - Visibility: SERP presence, brand navigational strength, answer surfaces
   */
  async collectSignalsForProject(projectId: string): Promise<DeoScoreSignals> {
    const prisma = this.prisma as any;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [crawlResults, products] = await Promise.all([
      prisma.crawlResult.findMany({ where: { projectId } }),
      prisma.product.findMany({ where: { projectId } }),
    ]);

    const totalCrawls = crawlResults.length;
    const totalProducts = products.length;
    const totalPages = totalCrawls;
    const pageCount = totalCrawls;
    const productCount = totalProducts;
    const totalSurfaces = pageCount + productCount;

    // ---------- Content signals (pages + products) ----------

    // Coverage
    let coveredPages = 0;
    let coveredProducts = 0;

    // Word-count aggregates for pages/products
    let sumPageWords = 0;
    let countPageWords = 0;
    let sumProductWords = 0;
    let countProductWords = 0;

    for (const cr of crawlResults) {
      const hasTitle = !!cr.title;
      const wordCount =
        typeof cr.wordCount === 'number' && cr.wordCount > 0 ? cr.wordCount : 0;
      if (hasTitle && wordCount > 0) {
        coveredPages++;
      }
      if (wordCount > 0) {
        sumPageWords += wordCount;
        countPageWords++;
      }
    }

    for (const product of products) {
      const titleSource = (product.seoTitle ?? product.title) ?? '';
      const rawDescription = (product.seoDescription ?? product.description) ?? '';
      const title = titleSource.toString().trim();
      const description = rawDescription.toString().trim();
      const descWordCount =
        description.length > 0
          ? description
              .split(/\s+/)
              .filter(Boolean).length
          : 0;

      const hasTitle = title.length > 0;
      const hasDescription = descWordCount > 0;
      if (hasTitle && hasDescription) {
        coveredProducts++;
      }
      if (descWordCount > 0) {
        sumProductWords += descWordCount;
        countProductWords++;
      }
    }

    const coveragePages =
      pageCount > 0 ? coveredPages / pageCount : 0;
    const coverageProducts =
      productCount > 0 ? coveredProducts / productCount : 0;

    let contentCoverage = 0;
    if (totalSurfaces > 0) {
      contentCoverage =
        (coveragePages * pageCount + coverageProducts * productCount) /
        totalSurfaces;
    }
    contentCoverage = Math.max(0, Math.min(1, contentCoverage));

    // Depth
    const avgPageWordCount =
      countPageWords > 0 ? sumPageWords / countPageWords : 0;
    const avgProductWordCount =
      countProductWords > 0 ? sumProductWords / countProductWords : 0;

    const contentDepthPages = Math.max(
      0,
      Math.min(1, avgPageWordCount / 800),
    );
    const contentDepthProducts = Math.max(
      0,
      Math.min(1, avgProductWordCount / 600),
    );

    let contentDepth = 0;
    if (totalSurfaces > 0) {
      contentDepth =
        (contentDepthPages * pageCount +
          contentDepthProducts * productCount) /
        totalSurfaces;
    }
    contentDepth = Math.max(0, Math.min(1, contentDepth));

    // Freshness
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    const pageFreshnessScores: number[] = [];
    for (const cr of crawlResults) {
      const ageMs = now - cr.scannedAt.getTime();
      const ageRatio = Math.min(ageMs / ninetyDaysMs, 1);
      pageFreshnessScores.push(1 - ageRatio);
    }

    const contentFreshnessPages =
      pageFreshnessScores.length > 0
        ? pageFreshnessScores.reduce((sum, v) => sum + v, 0) /
          pageFreshnessScores.length
        : 0;

    let freshProducts = 0;
    for (const product of products) {
      const ageMs = now - product.lastSyncedAt.getTime();
      if (ageMs <= ninetyDaysMs) {
        freshProducts++;
      }
    }

    const contentFreshnessProducts =
      productCount > 0 ? freshProducts / productCount : 0;

    let contentFreshness = 0;
    if (totalSurfaces > 0) {
      contentFreshness =
        (contentFreshnessPages * pageCount +
          contentFreshnessProducts * productCount) /
        totalSurfaces;
    }
    contentFreshness = Math.max(0, Math.min(1, contentFreshness));

    // ---------- Technical, entity & visibility helpers (Phase 2.4) ----------

    let healthyPages = 0;
    let indexablePages = 0;
    let htmlIssuePages = 0;
    let thinPages = 0;
    let serpReadyPages = 0;
    let answerReadyPages = 0;
    let navPages = 0;

    let entityHintPages = 0;
    let entityIssuePages = 0;
    let entityHintProducts = 0;
    let entityIssueProducts = 0;

    let internalLinkSamples = 0;
    let internalLinkSum = 0;

    for (const cr of crawlResults) {
      const issues = (cr.issues as string[]) ?? [];

      const hasHttpError =
        issues.includes('HTTP_ERROR') || issues.includes('FETCH_ERROR');

      const isHealthy =
        cr.statusCode >= 200 && cr.statusCode < 400 && !hasHttpError;

      if (isHealthy) {
        healthyPages++;
      }

      const hasTitle = !!cr.title;
      const hasMetaDescription = !!cr.metaDescription;
      const hasH1 = !!cr.h1;

      const hasThinFlag = issues.includes('THIN_CONTENT');
      const wordCount = typeof cr.wordCount === 'number' ? cr.wordCount : null;
      const isThinByWordCount = wordCount != null && wordCount < 150;
      const isVeryShort = wordCount != null && wordCount < 100;
      const isThin = hasThinFlag || isThinByWordCount;

      if (isThin) {
        thinPages++;
      }

      const hasHtmlIssue =
        !hasTitle || !hasMetaDescription || !hasH1 || isVeryShort;

      if (hasHtmlIssue) {
        htmlIssuePages++;
      }

      const hasEntityStructureIssue =
        !hasTitle || !hasMetaDescription || !hasH1 || isThin;

      if (hasEntityStructureIssue) {
        entityIssuePages++;
      }

      const isIndexable =
        isHealthy && hasTitle && hasMetaDescription && !isThin;

      if (isIndexable) {
        indexablePages++;
      }

      if (hasTitle && hasH1) {
        entityHintPages++;
      }

      const hasSerpMetadata = hasTitle && hasMetaDescription && hasH1;

      if (hasSerpMetadata) {
        serpReadyPages++;
      }

      const isAnswerReady =
        isHealthy && hasH1 && !hasThinFlag && wordCount != null && wordCount >= 400;

      if (isAnswerReady) {
        answerReadyPages++;
      }

      const internalLinkCount = (cr as any).internalLinkCount as
        | number
        | undefined;

      if (typeof internalLinkCount === 'number' && internalLinkCount >= 0) {
        internalLinkSamples++;
        internalLinkSum += internalLinkCount;
      }

      const url = cr.url.toLowerCase();
      const pathStart = url.indexOf('/', url.indexOf('://') + 3);
      const path =
        pathStart === -1 ? '/' : url.substring(pathStart).split('?')[0];

      const lowerPath = path.toLowerCase();
      if (
        lowerPath === '/' ||
        lowerPath === '/home' ||
        lowerPath === '/about' ||
        lowerPath === '/contact' ||
        lowerPath === '/pricing' ||
        lowerPath === '/faq' ||
        lowerPath === '/support'
      ) {
        navPages++;
      }
    }

    // Product-side entity issues / hints (Phase 2.5)
    for (const product of products) {
      const titleSource = (product.seoTitle ?? product.title) ?? '';
      const rawDescription = (product.seoDescription ?? product.description) ?? '';
      const title = titleSource.toString().trim();
      const description = rawDescription.toString().trim();
      const descWordCount =
        description.length > 0
          ? description
              .split(/\s+/)
              .filter(Boolean).length
          : 0;

      const hasTitle = title.length > 0;
      const hasDescription = descWordCount > 0;

      if (hasTitle && hasDescription) {
        entityHintProducts++;
      }

      const isThinProduct = descWordCount > 0 && descWordCount < 80;
      const hasEntityIssue =
        !hasTitle || !hasDescription || isThinProduct;

      if (hasEntityIssue) {
        entityIssueProducts++;
      }
    }

    // Combined average word count across pages + products for fallbacks
    const combinedWordSamples = countPageWords + countProductWords;
    const avgWordCount =
      combinedWordSamples > 0
        ? (sumPageWords + sumProductWords) / combinedWordSamples
        : 0;

    // ---------- Technical signals (Phase 2.4) ----------

    // crawlHealth: fraction of pages that are healthy (2xx/3xx, no HTTP/FETCH error)
    const crawlHealth =
      totalPages > 0 ? healthyPages / totalPages : 0;

    // indexability: fraction of healthy pages with title + metaDescription and not thin
    const indexability =
      totalPages > 0 ? indexablePages / totalPages : 0;

    // htmlStructuralQuality: 1 - (pages with structural issues / total pages)
    const htmlStructuralQuality =
      totalPages > 0
        ? Math.max(0, Math.min(1, 1 - htmlIssuePages / totalPages))
        : 0;

    // thinContentQuality: 1 - (thin pages / total pages)
    const thinContentQuality =
      totalPages > 0
        ? Math.max(0, Math.min(1, 1 - thinPages / totalPages))
        : 0;

    // coreWebVitals: placeholder 0.5 until real CWV integration
    const coreWebVitals = 0.5;

    // ---------- Entity signals (pages + products, heuristic v1) ----------

    // entityHintCoverage: fraction of surfaces (pages + products) with title + H1 (pages) or title + description (products)
    const entityHintTotal = entityHintPages + entityHintProducts;
    const entityHintCoverage =
      totalSurfaces > 0 ? entityHintTotal / totalSurfaces : 0;

    // entityStructureAccuracy: clamped inverse of entity structure issues across pages + products
    const entityIssueTotal = entityIssuePages + entityIssueProducts;
    let entityStructureAccuracy: number;
    if (totalSurfaces > 0) {
      const raw = 1 - entityIssueTotal / totalSurfaces;
      entityStructureAccuracy = Math.min(0.9, Math.max(0.3, raw));
    } else {
      entityStructureAccuracy = 0.5;
    }

    // entityLinkageDensity: internal link density if available, otherwise word-count fallback
    let entityLinkageDensity: number;
    if (internalLinkSamples > 0 && totalPages > 0) {
      // Treat pages without internalLinkCount as 0 when averaging
      const avgInternalLinks = internalLinkSum / totalPages;
      entityLinkageDensity = Math.min(avgInternalLinks / 20, 1);
    } else {
      entityLinkageDensity = Math.max(0, Math.min(1, avgWordCount / 1200));
    }

    // Maintain v1 component inputs using combined page + product heuristics
    const entityCoverage = entityHintCoverage;
    const entityAccuracy = entityStructureAccuracy;

    const entityLinkagePages = Math.max(
      0,
      Math.min(1, avgPageWordCount / 1200),
    );
    const entityLinkageProducts = Math.max(
      0,
      Math.min(1, avgProductWordCount / 800),
    );

    let entityLinkage = 0;
    if (totalSurfaces > 0) {
      entityLinkage =
        (entityLinkagePages * pageCount +
          entityLinkageProducts * productCount) /
        totalSurfaces;
    }
    entityLinkage = Math.max(0, Math.min(1, entityLinkage));

    // ---------- Visibility signals (Phase 2.4 heuristic) ----------

    // serpPresence: fraction of pages with title + metaDescription + H1
    const serpPresence =
      totalPages > 0 ? serpReadyPages / totalPages : 0;

    // answerSurfacePresence: fraction of pages that are healthy, not THIN_CONTENT, wordCount >= 400, and have H1
    const answerSurfacePresence =
      totalPages > 0 ? answerReadyPages / totalPages : 0;

    // brandNavigationalStrength: normalized count of navigational pages
    let brandNavigationalStrength = 0;
    if (totalPages > 0) {
      brandNavigationalStrength = Math.min(1, navPages / 3);
    }

    return {
      // Content
      contentCoverage,
      contentDepth,
      contentFreshness,
      // Entities (v1 component inputs, derived from Phase 2.4 heuristics)
      entityCoverage,
      entityAccuracy,
      entityLinkage,
      // Technical (v1 component inputs)
      crawlHealth,
      coreWebVitals,
      indexability,
      // Visibility
      serpPresence,
      answerSurfacePresence,
      brandNavigationalStrength,
      // Detailed technical/entity signals (Phase 2.4)
      htmlStructuralQuality,
      thinContentQuality,
      entityHintCoverage,
      entityStructureAccuracy,
      entityLinkageDensity,
    };
  }
}
