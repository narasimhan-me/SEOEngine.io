import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DeoSignalsService } from './deo-score.service';
import { DeoIssue, DeoIssuesResponse, DeoScoreSignals } from '@engineo/shared';

@Injectable()
export class DeoIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deoSignalsService: DeoSignalsService,
  ) {}

  /**
   * Compute DEO issues for a project by combining crawl results,
   * product data, and aggregated DEO signals.
   */
  async getIssuesForProject(projectId: string, userId: string): Promise<DeoIssuesResponse> {
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

    const [crawlResults, products, signals] = await Promise.all([
      prisma.crawlResult.findMany({ where: { projectId } }),
      prisma.product.findMany({ where: { projectId } }),
      this.deoSignalsService.collectSignalsForProject(projectId),
    ]);

    const totalPages = crawlResults.length;
    const totalProducts = products.length;
    const totalSurfaces = totalPages + totalProducts;

    const issues: DeoIssue[] = [];

    const missingMetadataIssue = this.buildMissingMetadataIssue(
      crawlResults,
      products,
      totalSurfaces,
    );
    if (missingMetadataIssue) {
      issues.push(missingMetadataIssue);
    }

    const thinContentIssue = this.buildThinContentIssue(
      crawlResults,
      products,
      totalSurfaces,
    );
    if (thinContentIssue) {
      issues.push(thinContentIssue);
    }

    const lowEntityCoverageIssue = this.buildLowEntityCoverageIssue(
      crawlResults,
      products,
      totalSurfaces,
      signals,
    );
    if (lowEntityCoverageIssue) {
      issues.push(lowEntityCoverageIssue);
    }

    const indexabilityIssue = this.buildIndexabilityIssue(crawlResults, signals);
    if (indexabilityIssue) {
      issues.push(indexabilityIssue);
    }

    const answerSurfaceIssue = this.buildAnswerSurfaceIssue(crawlResults, signals);
    if (answerSurfaceIssue) {
      issues.push(answerSurfaceIssue);
    }

    const brandNavIssue = this.buildBrandNavigationalIssue(crawlResults, signals);
    if (brandNavIssue) {
      issues.push(brandNavIssue);
    }

    const crawlHealthIssue = this.buildCrawlHealthIssue(crawlResults, signals);
    if (crawlHealthIssue) {
      issues.push(crawlHealthIssue);
    }

    const productDepthIssue = this.buildProductContentDepthIssue(products);
    if (productDepthIssue) {
      issues.push(productDepthIssue);
    }

    // Issue Engine Lite: Product-focused issues
    const issueEngineLiteBuilders = [
      () => this.buildMissingSeoTitleIssue(products),
      () => this.buildMissingSeoDescriptionIssue(products),
      () => this.buildWeakTitleIssue(products),
      () => this.buildWeakDescriptionIssue(products),
      () => this.buildMissingLongDescriptionIssue(products),
      () => this.buildDuplicateProductContentIssue(products),
      () => this.buildLowProductEntityCoverageIssue(products, signals),
      () => this.buildNotAnswerReadyIssue(products),
      () => this.buildWeakIntentMatchIssue(products),
      () => this.buildMissingProductImageIssue(products),
      () => this.buildMissingPriceIssue(products),
      () => this.buildMissingCategoryIssue(products),
    ];

    for (const builder of issueEngineLiteBuilders) {
      const issue = builder();
      if (issue) {
        issues.push(issue);
      }
    }

    return {
      projectId,
      generatedAt: new Date().toISOString(),
      issues,
    };
  }

  private buildMissingMetadataIssue(
    crawlResults: any[],
    products: any[],
    totalSurfaces: number,
  ): DeoIssue | null {
    if (totalSurfaces === 0) {
      return null;
    }

    let missingTitles = 0;
    let missingDescriptions = 0;
    let missingProductMetadata = 0;
    let surfacesWithMissing = 0;
    const affectedPages: string[] = [];
    const affectedProducts: string[] = [];

    for (const cr of crawlResults) {
      let missingAny = false;

      if (!cr.title) {
        missingTitles++;
        missingAny = true;
      }

      if (!cr.metaDescription) {
        missingDescriptions++;
        missingAny = true;
      }

      if (missingAny) {
        surfacesWithMissing++;
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    for (const product of products) {
      const hasSeoTitle = !!product.seoTitle;
      const hasSeoDescription = !!product.seoDescription;
      let missingAny = false;

      if (!hasSeoTitle || !hasSeoDescription) {
        missingProductMetadata++;
        missingAny = true;
      }

      if (missingAny && affectedProducts.length < 20) {
        affectedProducts.push(product.id);
      }
    }

    const surfacesRatio = surfacesWithMissing / totalSurfaces;
    const severity = this.getSeverityForHigherIsWorse(surfacesRatio, {
      info: 0,
      warning: 0.03,
      critical: 0.1,
    });

    const totalMissing = missingTitles + missingDescriptions + missingProductMetadata;

    if (!severity || totalMissing === 0) {
      return null;
    }

    return {
      id: 'missing_metadata',
      title: 'Missing titles or descriptions',
      description:
        'Some pages or products are missing SEO titles or meta descriptions, which reduces visibility and click-through rates.',
      severity,
      count: totalMissing,
      affectedPages,
      affectedProducts,
    };
  }

  private buildThinContentIssue(
    crawlResults: any[],
    products: any[],
    totalSurfaces: number,
  ): DeoIssue | null {
    if (totalSurfaces === 0) {
      return null;
    }

    let thinPages = 0;
    let thinProducts = 0;
    const affectedPages: string[] = [];
    const affectedProducts: string[] = [];

    for (const cr of crawlResults) {
      const wordCount = typeof cr.wordCount === 'number' ? cr.wordCount : 0;
      if (wordCount > 0 && wordCount < 150) {
        thinPages++;
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    for (const product of products) {
      const desc = (product.seoDescription ?? product.description) as string | null;
      const descWordCount = this.getWordCount(desc);
      if (descWordCount > 0 && descWordCount < 80) {
        thinProducts++;
        if (affectedProducts.length < 20) {
          affectedProducts.push(product.id);
        }
      }
    }

    const thinSurfaces = thinPages + thinProducts;
    const thinRatio = thinSurfaces / totalSurfaces;
    const severity = this.getSeverityForHigherIsWorse(thinRatio, {
      info: 0.02,
      warning: 0.1,
      critical: 0.25,
    });

    if (!severity || thinSurfaces === 0) {
      return null;
    }

    return {
      id: 'thin_content',
      title: 'Thin content across pages and products',
      description:
        'Many pages or products have very short content, which weakens depth, answerability, and ranking potential.',
      severity,
      count: thinSurfaces,
      affectedPages,
      affectedProducts,
    };
  }

  private buildLowEntityCoverageIssue(
    crawlResults: any[],
    products: any[],
    totalSurfaces: number,
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (totalSurfaces === 0) {
      return null;
    }

    let entityIssueSurfaces = 0;
    const affectedPages: string[] = [];
    const affectedProducts: string[] = [];

    for (const cr of crawlResults) {
      const hasEntityHint = !!cr.title && !!cr.h1;
      if (!hasEntityHint) {
        entityIssueSurfaces++;
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    for (const product of products) {
      const seoTitle = product.seoTitle as string | null;
      const seoDescription = product.seoDescription as string | null;
      const desc = (product.seoDescription ?? product.description) as string | null;
      const descWordCount = this.getWordCount(desc);
      const hasEntityHint =
        !!seoTitle && !!seoDescription && descWordCount >= 120;

      if (!hasEntityHint) {
        entityIssueSurfaces++;
        if (affectedProducts.length < 20) {
          affectedProducts.push(product.id);
        }
      }
    }

    let entityCoverage = signals?.entityCoverage ?? null;
    if (entityCoverage == null) {
      entityCoverage =
        totalSurfaces > 0
          ? (totalSurfaces - entityIssueSurfaces) / totalSurfaces
          : null;
    }

    const severity = this.getSeverityForLowerIsWorse(entityCoverage, {
      critical: 0.35,
      warning: 0.6,
      info: 0.8,
    });

    if (!severity || entityIssueSurfaces === 0) {
      return null;
    }

    return {
      id: 'low_entity_coverage',
      title: 'Low entity and schema coverage',
      description:
        'Key entities are not well modeled across pages and products (missing H1, SEO metadata, or sufficiently detailed descriptions).',
      severity,
      count: entityIssueSurfaces,
      affectedPages,
      affectedProducts,
    };
  }

  private buildIndexabilityIssue(
    crawlResults: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let issueCount = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const issues = (cr.issues as string[]) ?? [];
      const hasHttpError =
        issues.includes('HTTP_ERROR') || issues.includes('FETCH_ERROR');
      const isErrorStatus = cr.statusCode < 200 || cr.statusCode >= 400;
      const missingHtmlBasics = !cr.title || !cr.metaDescription || !cr.h1;
      const hasNoindex =
        issues.includes('NOINDEX') ||
        issues.includes('NO_INDEX') ||
        issues.includes('META_ROBOTS_NOINDEX');

      if (hasHttpError || isErrorStatus || missingHtmlBasics || hasNoindex) {
        issueCount++;
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    const indexability = signals?.indexability ?? null;
    const severity = this.getSeverityForLowerIsWorse(indexability, {
      critical: 0.5,
      warning: 0.75,
      info: 0.9,
    });

    if (!severity || issueCount === 0) {
      return null;
    }

    return {
      id: 'indexability_problems',
      title: 'Indexability and crawl issues',
      description:
        'Some pages have crawl errors or are missing critical HTML elements, making them difficult for search engines to index correctly.',
      severity,
      count: issueCount,
      affectedPages,
    };
  }

  private buildAnswerSurfaceIssue(
    crawlResults: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let weakCount = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const wordCount = typeof cr.wordCount === 'number' ? cr.wordCount : 0;
      const hasH1 = !!cr.h1;
      const isWeak = (wordCount > 0 && wordCount < 400) || !hasH1;

      if (isWeak) {
        weakCount++;
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    const answerSurfacePresence = signals?.answerSurfacePresence ?? null;
    const severity = this.getSeverityForLowerIsWorse(answerSurfacePresence, {
      critical: 0.2,
      warning: 0.35,
      info: 0.5,
    });

    if (!severity || weakCount === 0) {
      return null;
    }

    return {
      id: 'answer_surface_weakness',
      title: 'Weak answer surfaces',
      description:
        'Many pages lack the long-form content and clear headings needed to be strong answer surfaces for search and AI assistants.',
      severity,
      count: weakCount,
      affectedPages,
    };
  }

  private buildBrandNavigationalIssue(
    crawlResults: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    const canonicalPaths = ['/', '/about', '/contact', '/faq', '/support'];
    const found = new Set<string>();

    for (const cr of crawlResults) {
      const path = this.extractPathFromUrl(cr.url);
      if (canonicalPaths.includes(path)) {
        found.add(path);
      }
    }

    const missing = canonicalPaths.filter((p) => !found.has(p));
    const brandNavigationalStrength = signals?.brandNavigationalStrength ?? null;
    const severity = this.getSeverityForLowerIsWorse(brandNavigationalStrength, {
      critical: 0.25,
      warning: 0.4,
      info: 0.6,
    });

    const count = missing.length;

    if (!severity || count === 0) {
      return null;
    }

    return {
      id: 'brand_navigational_weakness',
      title: 'Brand navigational weakness',
      description:
        'Canonical navigational pages like /about, /contact, /faq, or /support are missing or not discoverable, weakening brand and trust signals.',
      severity,
      count,
      affectedPages: missing,
    };
  }

  private buildCrawlHealthIssue(
    crawlResults: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let errorCount = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const issues = (cr.issues as string[]) ?? [];
      const hasHttpError =
        issues.includes('HTTP_ERROR') || issues.includes('FETCH_ERROR');
      const isErrorStatus = cr.statusCode < 200 || cr.statusCode >= 400;

      if (hasHttpError || isErrorStatus) {
        errorCount++;
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    const crawlHealth = signals?.crawlHealth ?? null;
    const severity = this.getSeverityForLowerIsWorse(crawlHealth, {
      critical: 0.6,
      warning: 0.8,
      info: 0.95,
    });

    if (!severity || errorCount === 0) {
      return null;
    }

    return {
      id: 'crawl_health_errors',
      title: 'Crawl health and errors',
      description:
        'A number of pages return HTTP errors or cannot be crawled reliably, which can hide issues and hurt discovery.',
      severity,
      count: errorCount,
      affectedPages,
    };
  }

  private buildProductContentDepthIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) {
      return null;
    }

    let shortOrMissingDescriptions = 0;
    let sumProductWords = 0;
    let countProductWords = 0;
    const affectedProducts: string[] = [];

    for (const product of products) {
      const desc = (product.seoDescription ?? product.description) as string | null;
      const wordCount = this.getWordCount(desc);

      if (wordCount > 0) {
        sumProductWords += wordCount;
        countProductWords++;
      }

      if (wordCount === 0 || wordCount < 50) {
        shortOrMissingDescriptions++;
        if (affectedProducts.length < 20) {
          affectedProducts.push(product.id);
        }
      }
    }

    if (shortOrMissingDescriptions === 0) {
      return null;
    }

    const avgProductWordCount =
      countProductWords > 0 ? sumProductWords / countProductWords : 0;
    const contentDepthProducts = Math.max(
      0,
      Math.min(1, avgProductWordCount / 600),
    );

    const severity = this.getSeverityForLowerIsWorse(contentDepthProducts, {
      critical: 0.25,
      warning: 0.45,
      info: 0.65,
    });

    if (!severity) {
      return null;
    }

    return {
      id: 'product_content_depth',
      title: 'Shallow product descriptions',
      description:
        'Many products have very short or missing descriptions, limiting their ability to rank and convert.',
      severity,
      count: shortOrMissingDescriptions,
      affectedProducts,
    };
  }

  // ========== Issue Engine Lite: Product-Focused Builders ==========

  /**
   * Missing SEO Title - Products without seoTitle set
   */
  private buildMissingSeoTitleIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => !p.seoTitle);
    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0,
      warning: 0.1,
      critical: 0.3,
    });

    if (!severity) return null;

    return {
      id: 'missing_seo_title',
      type: 'missing_seo_title',
      title: 'Missing SEO Title',
      description:
        'Products without an SEO title are harder for search engines and AI assistants to understand and rank.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Missing SEO Description - Products without seoDescription set
   */
  private buildMissingSeoDescriptionIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => !p.seoDescription);
    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0,
      warning: 0.1,
      critical: 0.3,
    });

    if (!severity) return null;

    return {
      id: 'missing_seo_description',
      type: 'missing_seo_description',
      title: 'Missing SEO Description',
      description:
        'Products without an SEO description miss out on click-through optimization and rich snippet opportunities.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Weak Title - Products with seoTitle that is too short or generic
   */
  private buildWeakTitleIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const title = (p.seoTitle ?? p.title ?? '') as string;
      // Weak: too short (<20 chars) or same as product title (no optimization)
      return title.length > 0 && (title.length < 20 || title === p.title);
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.05,
      warning: 0.15,
      critical: 0.35,
    });

    if (!severity) return null;

    return {
      id: 'weak_title',
      type: 'weak_title',
      title: 'Weak Product Title',
      description:
        'Some product titles are too short or unoptimized, reducing their search visibility and click appeal.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Weak Description - Products with seoDescription that is too short
   */
  private buildWeakDescriptionIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const desc = (p.seoDescription ?? '') as string;
      // Has a description but it's weak: < 80 chars
      return desc.length > 0 && desc.length < 80;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.05,
      warning: 0.15,
      critical: 0.35,
    });

    if (!severity) return null;

    return {
      id: 'weak_description',
      type: 'weak_description',
      title: 'Weak Product Description',
      description:
        'Short SEO descriptions limit search snippet quality and fail to convey product value.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Missing Long Description - Products without detailed body content
   */
  private buildMissingLongDescriptionIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const desc = (p.description ?? '') as string;
      const wordCount = this.getWordCount(desc);
      // Missing or very thin body description: < 50 words
      return wordCount < 50;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.25,
      critical: 0.5,
    });

    if (!severity) return null;

    return {
      id: 'missing_long_description',
      type: 'missing_long_description',
      title: 'Missing Long Description',
      description:
        'Products without detailed descriptions lack the content depth needed for rich search results and AI answers.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'manualFix',
      fixReady: false,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Duplicate Product Content - Products with identical or near-identical descriptions
   */
  private buildDuplicateProductContentIssue(products: any[]): DeoIssue | null {
    if (products.length < 2) return null;

    // Simple hash-based duplicate detection on seoDescription
    const descMap = new Map<string, any[]>();
    for (const p of products) {
      const desc = ((p.seoDescription ?? p.description ?? '') as string)
        .toLowerCase()
        .trim();
      if (desc.length < 20) continue; // Skip very short ones

      const existing = descMap.get(desc) ?? [];
      existing.push(p);
      descMap.set(desc, existing);
    }

    const duplicateGroups = Array.from(descMap.values()).filter(
      (group) => group.length > 1,
    );
    const affectedProducts: string[] = [];
    for (const group of duplicateGroups) {
      for (const p of group) {
        if (affectedProducts.length < 20) {
          affectedProducts.push(p.id);
        }
      }
    }

    if (affectedProducts.length === 0) return null;

    const ratio = affectedProducts.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.02,
      warning: 0.1,
      critical: 0.25,
    });

    if (!severity) return null;

    return {
      id: 'duplicate_product_content',
      type: 'duplicate_product_content',
      title: 'Duplicate Product Content',
      description:
        'Multiple products share identical descriptions, which can hurt search rankings and confuse AI systems.',
      severity,
      count: affectedProducts.length,
      affectedProducts,
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affectedProducts[0],
    };
  }

  /**
   * Low Product Entity Coverage - Products lacking rich entity signals
   */
  private buildLowProductEntityCoverageIssue(
    products: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const seoTitle = (p.seoTitle ?? '') as string;
      const seoDesc = (p.seoDescription ?? '') as string;
      const desc = (p.description ?? '') as string;
      const descWordCount = this.getWordCount(desc);

      // Low entity coverage: missing seoTitle OR seoDesc too short OR body too thin
      return !seoTitle || seoDesc.length < 60 || descWordCount < 100;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.3,
      critical: 0.5,
    });

    if (!severity) return null;

    return {
      id: 'low_product_entity_coverage',
      type: 'low_product_entity_coverage',
      title: 'Low Entity Coverage in Product Content',
      description:
        'Products lack the rich metadata and content depth needed for strong entity signals in search and AI.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Not Answer-Ready - Products that can't serve as good AI answer sources
   */
  private buildNotAnswerReadyIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const desc = (p.description ?? '') as string;
      const seoDesc = (p.seoDescription ?? '') as string;
      const descWordCount = this.getWordCount(desc);
      const seoDescWordCount = this.getWordCount(seoDesc);

      // Not answer-ready: total content < 80 words
      return descWordCount + seoDescWordCount < 80;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.25,
      critical: 0.5,
    });

    if (!severity) return null;

    return {
      id: 'not_answer_ready',
      type: 'not_answer_ready',
      title: 'Not Answer-Ready',
      description:
        'Products lack sufficient content to be cited or featured in AI-powered answer experiences.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Weak Intent Match - Products whose metadata doesn't match likely search intent
   */
  private buildWeakIntentMatchIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const seoTitle = (p.seoTitle ?? '') as string;
      const title = (p.title ?? '') as string;
      const seoDesc = (p.seoDescription ?? '') as string;

      // Weak intent match: seoTitle exactly equals product title (no optimization)
      // or seoDescription is empty/very generic
      const titleNotOptimized = seoTitle === title && seoTitle.length > 0;
      const descTooGeneric = seoDesc.length > 0 && seoDesc.length < 50;

      return titleNotOptimized || descTooGeneric;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.25,
      critical: 0.5,
    });

    if (!severity) return null;

    return {
      id: 'weak_intent_match',
      type: 'weak_intent_match',
      title: 'Weak Intent Match',
      description:
        'Product metadata may not align well with user search intent, limiting discoverability.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Missing Product Image - Products without images
   */
  private buildMissingProductImageIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const images = p.imageUrls as string[] | null;
      return !images || images.length === 0;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0,
      warning: 0.05,
      critical: 0.15,
    });

    if (!severity) return null;

    return {
      id: 'missing_product_image',
      type: 'missing_product_image',
      title: 'Missing Product Image',
      description:
        'Products without images have significantly lower engagement and conversion rates.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'manualFix',
      fixReady: false,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Missing Price - Products without price information
   */
  private buildMissingPriceIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      // Check common price field patterns
      const price = p.price ?? p.priceMin ?? p.priceMax;
      return price == null || price === 0;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0,
      warning: 0.05,
      critical: 0.15,
    });

    if (!severity) return null;

    return {
      id: 'missing_price',
      type: 'missing_price',
      title: 'Missing Product Price',
      description:
        'Products without price data cannot appear in price-filtered search results or shopping feeds.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'syncFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
    };
  }

  /**
   * Missing Category - Products without category/type classification
   */
  private buildMissingCategoryIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const productType = p.productType ?? p.category ?? p.type;
      return !productType || (productType as string).trim().length === 0;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.05,
      warning: 0.15,
      critical: 0.35,
    });

    if (!severity) return null;

    return {
      id: 'missing_category',
      type: 'missing_category',
      title: 'Missing Product Category/Type',
      description:
        'Products without categories are harder to organize, filter, and surface in relevant search contexts.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'syncFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
    };
  }

  // ========== Helper Methods ==========

  private getSeverityForHigherIsWorse(
    ratio: number,
    thresholds: { info: number; warning: number; critical: number },
  ): 'critical' | 'warning' | 'info' | null {
    if (ratio > thresholds.critical) {
      return 'critical';
    }
    if (ratio > thresholds.warning) {
      return 'warning';
    }
    if (ratio > thresholds.info) {
      return 'info';
    }
    return null;
  }

  private getSeverityForLowerIsWorse(
    value: number | null | undefined,
    thresholds: { critical: number; warning: number; info: number },
  ): 'critical' | 'warning' | 'info' | null {
    if (value == null) {
      return null;
    }

    if (value < thresholds.critical) {
      return 'critical';
    }
    if (value < thresholds.warning) {
      return 'warning';
    }
    if (value < thresholds.info) {
      return 'info';
    }

    return null;
  }

  private getWordCount(text: string | null | undefined): number {
    if (!text) {
      return 0;
    }

    return text
      .toString()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  private extractPathFromUrl(url: string): string {
    try {
      const lower = url.toLowerCase();
      const protocolIndex = lower.indexOf('://');

      if (protocolIndex === -1) {
        const pathIndex = lower.indexOf('/');
        return pathIndex === -1 ? '/' : lower.substring(pathIndex).split('?')[0];
      }

      const pathStart = lower.indexOf('/', protocolIndex + 3);
      if (pathStart === -1) {
        return '/';
      }

      return lower.substring(pathStart).split('?')[0];
    } catch {
      return '/';
    }
  }
}
