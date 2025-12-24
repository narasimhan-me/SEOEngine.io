import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DeoScoreService, DeoSignalsService } from '../projects/deo-score.service';
import { AutomationService } from '../projects/automation.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { IntegrationType } from '@prisma/client';
import * as cheerio from 'cheerio';
import { isE2EMode } from '../config/test-env-guard';

export interface ScanResult {
  url: string;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number;
  loadTimeMs: number;
  issues: string[];
}

/**
 * [ROLES-3 FIXUP-4] SeoScanService with membership-aware access control:
 * - Scan operations (mutations): OWNER-only (assertOwnerRole)
 * - Read operations: any ProjectMember can view (assertProjectAccess)
 */
@Injectable()
export class SeoScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deoSignalsService: DeoSignalsService,
    private readonly deoScoreService: DeoScoreService,
    private readonly automationService: AutomationService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  /**
   * Start a SEO scan for a project's domain
   * [ROLES-3 FIXUP-4] OWNER-only for scan mutations
   */
  async startScan(projectId: string, userId: string) {
    // [ROLES-3 FIXUP-4] OWNER-only for scan mutations
    await this.roleResolution.assertOwnerRole(projectId, userId);

    // Get project with integrations
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        integrations: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Determine which domain to scan
    // Priority: 1. Connected Shopify store, 2. Project domain
    let domain: string | null = null;

    const shopifyIntegration = project.integrations.find(
      (i) => i.type === IntegrationType.SHOPIFY,
    );

    if (shopifyIntegration?.externalId) {
      // Use Shopify store domain
      domain = shopifyIntegration.externalId;
    } else if (project.domain) {
      domain = project.domain;
    }

    if (!domain) {
      throw new NotFoundException(
        'No domain configured. Connect a Shopify store or set a project domain.',
      );
    }

    // For MVP, scan only the homepage
    const url = `https://${domain}/`;
    const scanResult = await this.scanPage(url);

    // Store the crawl result
    const crawlResult = await this.prisma.crawlResult.create({
      data: {
        projectId,
        url: scanResult.url,
        statusCode: scanResult.statusCode,
        title: scanResult.title,
        metaDescription: scanResult.metaDescription,
        h1: scanResult.h1,
        wordCount: scanResult.wordCount,
        loadTimeMs: scanResult.loadTimeMs,
        issues: scanResult.issues,
      },
    });

    // Update project's lastCrawledAt
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        lastCrawledAt: crawlResult.scannedAt,
      },
    });

    // In local/dev mode (not using crawl queue), recompute DEO synchronously after the crawl
    const shouldRunSynchronously = !this.isUsingCrawlQueue();
    if (shouldRunSynchronously) {
      const startedAt = Date.now();
      try {
        const signals = await this.deoSignalsService.collectSignalsForProject(projectId);
        const snapshot = await this.deoScoreService.computeAndPersistScoreFromSignals(
          projectId,
          signals,
        );
        console.log(
          `[SeoScanService] Local DEO recompute complete for project ${projectId} (snapshot ${
            snapshot.id
          }, overall=${snapshot.breakdown.overall}) in ${Date.now() - startedAt}ms`,
        );

        // Run automation suggestions after successful crawl + DEO
        const automationStartedAt = Date.now();
        await this.automationService.scheduleSuggestionsForProject(projectId);
        console.log(
          `[SeoScanService] Automation suggestions scheduled for project ${projectId} in ${
            Date.now() - automationStartedAt
          }ms`,
        );
      } catch (error) {
        console.error(
          `[SeoScanService] Failed to recompute DEO score after manual crawl for project ${projectId}`,
          error,
        );
      }
    }

    return crawlResult;
  }

  /**
   * Run a full project crawl for scheduler/worker contexts.
   * In production this is invoked from the crawl queue worker; in local/dev it
   * can be called directly by the scheduler without requiring a user context.
   * Returns the crawl timestamp (scannedAt) when a crawl is performed,
   * or null if the project has no crawlable domain or does not exist.
   */
  async runFullProjectCrawl(projectId: string): Promise<Date | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        integrations: true,
      },
    });

    if (!project) {
      console.warn(`[SeoScanService] Project not found for crawl: ${projectId}`);
      return null;
    }

    // Determine which domain to scan
    // Priority: 1. Connected Shopify store, 2. Project domain
    let domain: string | null = null;

    const shopifyIntegration = project.integrations.find(
      (i) => i.type === IntegrationType.SHOPIFY,
    );

    if (shopifyIntegration?.externalId) {
      // Use Shopify store domain
      domain = shopifyIntegration.externalId;
    } else if (project.domain) {
      domain = project.domain;
    }

    if (!domain) {
      console.warn(
        `[SeoScanService] No domain configured for project ${projectId} - skipping crawl`,
      );
      return null;
    }

    // For MVP, scan only the homepage
    const url = `https://${domain}/`;
    const scanResult = await this.scanPage(url);

    // Store the crawl result
    const crawlResult = await this.prisma.crawlResult.create({
      data: {
        projectId,
        url: scanResult.url,
        statusCode: scanResult.statusCode,
        title: scanResult.title,
        metaDescription: scanResult.metaDescription,
        h1: scanResult.h1,
        wordCount: scanResult.wordCount,
        loadTimeMs: scanResult.loadTimeMs,
        issues: scanResult.issues,
      },
    });

    // Update project's lastCrawledAt
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        lastCrawledAt: crawlResult.scannedAt,
      },
    });

    return crawlResult.scannedAt;
  }

  /**
   * Scan a single page and extract SEO data
   */
  async scanPage(url: string): Promise<ScanResult> {
    const startTime = Date.now();
    let statusCode = 0;
    let html = '';
    let robotsHeader: string | null = null;

    // In E2E mode, return a deterministic synthetic scan result without network.
    if (isE2EMode()) {
      const loadTimeMs = Date.now() - startTime;
      return {
        url,
        statusCode: 200,
        title: 'E2E Test Homepage',
        metaDescription: 'E2E stubbed SEO scan (no external network).',
        h1: 'E2E Test',
        wordCount: 500,
        loadTimeMs,
        issues: [],
      };
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SEOEngine.io Bot/1.0 (+https://seoengine.io)',
        },
        redirect: 'follow',
      });
      statusCode = response.status;
      robotsHeader = response.headers.get('x-robots-tag');
      html = await response.text();
    } catch (error) {
      return {
        url,
        statusCode: 0,
        title: null,
        metaDescription: null,
        h1: null,
        wordCount: 0,
        loadTimeMs: Date.now() - startTime,
        issues: ['FETCH_ERROR'],
      };
    }

    const loadTimeMs = Date.now() - startTime;
    const $ = cheerio.load(html);

    // Extract SEO elements
    const title = $('title').first().text().trim() || null;
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || null;
    const h1 = $('h1').first().text().trim() || null;
    const canonicalHref =
      $('link[rel="canonical"]').attr('href')?.trim() || null;
    const robotsMeta =
      $('meta[name="robots"]').attr('content')?.trim().toLowerCase() || '';
    const viewportContent =
      $('meta[name="viewport"]').attr('content')?.trim() || '';

    // Calculate word count (simple: text content divided by average word length)
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
    const htmlBytes = Buffer.byteLength(html, 'utf8');

    // Build issues array
    const issues: string[] = [];

    if (!title) {
      issues.push('MISSING_TITLE');
    } else if (title.length > 65) {
      issues.push('TITLE_TOO_LONG');
    } else if (title.length < 30) {
      issues.push('TITLE_TOO_SHORT');
    }

    if (!metaDescription) {
      issues.push('MISSING_META_DESCRIPTION');
    } else if (metaDescription.length > 160) {
      issues.push('META_DESCRIPTION_TOO_LONG');
    } else if (metaDescription.length < 70) {
      issues.push('META_DESCRIPTION_TOO_SHORT');
    }

    if (!h1) {
      issues.push('MISSING_H1');
    }

    if (wordCount < 300) {
      issues.push('THIN_CONTENT');
    }

    if (loadTimeMs > 3000) {
      issues.push('SLOW_LOAD_TIME');
    }

    // PERFORMANCE-1: Discovery-critical performance heuristics
    // Render-blocking resources: scripts/styles in <head> without async/defer/module
    const blockingScripts = $('head script[src]').filter((_, el) => {
      const attribs = (el as any).attribs ?? {};
      const hasAsyncOrDefer = 'async' in attribs || 'defer' in attribs;
      const isModule = attribs.type === 'module';
      return !hasAsyncOrDefer && !isModule;
    });
    const blockingStyles = $('head link[rel="stylesheet"]');
    if (blockingScripts.length >= 3 || blockingStyles.length >= 4) {
      issues.push('RENDER_BLOCKING_RESOURCES');
    }

    // Page weight risk (very large HTML payloads)
    if (htmlBytes > 800 * 1024) {
      issues.push('VERY_LARGE_HTML');
    } else if (htmlBytes > 400 * 1024) {
      issues.push('LARGE_HTML');
    }

    // Mobile readiness heuristics
    if (!viewportContent) {
      issues.push('MISSING_VIEWPORT_META');
    } else {
      const viewportLower = viewportContent.toLowerCase();
      if (!viewportLower.includes('width=device-width')) {
        issues.push('POTENTIAL_MOBILE_LAYOUT_ISSUE');
      }
    }

    // Indexability-related hints (noindex and canonical conflicts)
    if (robotsMeta.includes('noindex')) {
      issues.push('META_ROBOTS_NOINDEX');
    }
    if (robotsHeader && robotsHeader.toLowerCase().includes('noindex')) {
      issues.push('NOINDEX');
    }
    if (canonicalHref) {
      try {
        const canonicalUrl = new URL(canonicalHref, url);
        const originalUrl = new URL(url);
        if (canonicalUrl.hostname !== originalUrl.hostname) {
          issues.push('CANONICAL_CONFLICT');
        }
      } catch {
        // Ignore invalid canonical URLs; structural issues are covered elsewhere.
      }
    }

    if (statusCode >= 400) {
      issues.push('HTTP_ERROR');
    }

    return {
      url,
      statusCode,
      title,
      metaDescription,
      h1,
      wordCount,
      loadTimeMs,
      issues,
    };
  }

  /**
   * Get all scan results for a project
   * [ROLES-3 FIXUP-4] Any ProjectMember can view (assertProjectAccess)
   */
  async getResults(projectId: string, userId: string) {
    // [ROLES-3 FIXUP-4] Any ProjectMember can view scan results
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const results = await this.prisma.crawlResult.findMany({
      where: { projectId },
      orderBy: { scannedAt: 'desc' },
    });

    // Add computed score to each result
    return results.map((result) => ({
      ...result,
      score: this.calculateScore(result.issues as string[]),
    }));
  }

  /**
   * Calculate SEO score based on issues
   */
  calculateScore(issues: string[]): number {
    // Start with 100, subtract 10 points per issue, minimum 0
    return Math.max(0, 100 - issues.length * 10);
  }

  /**
   * Determine if we're using the crawl queue (production with queue enabled).
   * When true, DEO recompute happens via queue workers; when false, it runs synchronously.
   * Uses the same logic as crawl-scheduler.service.ts for consistency.
   */
  private isUsingCrawlQueue(): boolean {
    const isLocalDev = process.env.IS_LOCAL_DEV === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    const hasCrawlQueue = !!process.env.REDIS_URL;
    return isProduction && !isLocalDev && hasCrawlQueue;
  }

  /**
   * Scan a single product page by product ID
   * [ROLES-3 FIXUP-4] OWNER-only for scan mutations
   */
  async scanProductPage(productId: string, userId: string) {
    // Load product with project and integrations
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: {
          include: {
            integrations: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // [ROLES-3 FIXUP-4] OWNER-only for scan mutations
    await this.roleResolution.assertOwnerRole(product.projectId, userId);

    // Get Shopify integration for the project
    const shopifyIntegration = product.project.integrations.find(
      (i) => i.type === IntegrationType.SHOPIFY,
    );

    if (!shopifyIntegration || !shopifyIntegration.externalId || !shopifyIntegration.accessToken) {
      throw new NotFoundException('No Shopify integration found for this project');
    }

    const shopDomain = shopifyIntegration.externalId;
    const accessToken = shopifyIntegration.accessToken;

    // Fetch the product from Shopify to get its handle
    const shopifyProduct = await this.fetchShopifyProductHandle(
      shopDomain,
      accessToken,
      product.externalId,
    );

    if (!shopifyProduct || !shopifyProduct.handle) {
      throw new NotFoundException('Could not find product handle from Shopify');
    }

    // Build the public product URL
    const productUrl = `https://${shopDomain}/products/${shopifyProduct.handle}`;

    // Scan the product page
    const scanResult = await this.scanPage(productUrl);

    // Store the crawl result
    const crawlResult = await this.prisma.crawlResult.create({
      data: {
        projectId: product.projectId,
        url: scanResult.url,
        statusCode: scanResult.statusCode,
        title: scanResult.title,
        metaDescription: scanResult.metaDescription,
        h1: scanResult.h1,
        wordCount: scanResult.wordCount,
        loadTimeMs: scanResult.loadTimeMs,
        issues: scanResult.issues,
      },
    });

    // Update project's lastCrawledAt
    await this.prisma.project.update({
      where: { id: product.projectId },
      data: {
        lastCrawledAt: crawlResult.scannedAt,
      },
    });

    // In local/dev mode, recompute DEO synchronously after the product crawl
    const shouldRunSynchronously = !this.isUsingCrawlQueue();
    if (shouldRunSynchronously) {
      const startedAt = Date.now();
      try {
        const signals = await this.deoSignalsService.collectSignalsForProject(product.projectId);
        const snapshot = await this.deoScoreService.computeAndPersistScoreFromSignals(
          product.projectId,
          signals,
        );
        console.log(
          `[SeoScanService] Local DEO recompute complete after product crawl for project ${
            product.projectId
          } (snapshot ${snapshot.id}, overall=${snapshot.breakdown.overall}) in ${
            Date.now() - startedAt
          }ms`,
        );

        // Run automation suggestions after successful crawl + DEO
        const automationStartedAt = Date.now();
        await this.automationService.scheduleSuggestionsForProject(product.projectId);
        console.log(
          `[SeoScanService] Automation suggestions scheduled for project ${product.projectId} in ${
            Date.now() - automationStartedAt
          }ms`,
        );
      } catch (error) {
        console.error(
          `[SeoScanService] Failed to recompute DEO score after product crawl for project ${product.projectId}`,
          error,
        );
      }
    }

    return {
      ...crawlResult,
      score: this.calculateScore(scanResult.issues),
    };
  }

  /**
   * Fetch a single product from Shopify to get its handle via GraphQL
   */
  private async fetchShopifyProductHandle(
    shopDomain: string,
    accessToken: string,
    productId: string,
  ): Promise<{ handle: string } | null> {
    // In E2E mode, avoid calling Shopify; return a synthetic handle.
    if (isE2EMode()) {
      return { handle: `e2e-product-${productId}` };
    }

    const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`;

    const query = `
      query GetProductHandle($id: ID!) {
        product(id: $id) {
          handle
        }
      }
    `;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            id: `gid://shopify/Product/${productId}`,
          },
          operationName: 'GetProductHandle',
        }),
      });

      if (!response.ok) {
        console.error(
          'Shopify GraphQL API error fetching product handle:',
          await response.text(),
        );
        return null;
      }

      const data = (await response.json()) as {
        data?: {
          product?: {
            handle?: string | null;
          } | null;
        };
        errors?: Array<{ message: string }>;
      };

      if (data.errors && data.errors.length) {
        console.error(
          'Shopify GraphQL errors fetching product handle:',
          data.errors,
        );
        return null;
      }

      const handle = data.data?.product?.handle;
      if (!handle) {
        return null;
      }

      return { handle };
    } catch (error) {
      console.error('Error fetching Shopify product via GraphQL:', error);
      return null;
    }
  }
}
