import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IntegrationType, CrawlFrequency } from '@prisma/client';

export interface CreateProjectDto {
  name: string;
  domain?: string;
}

export interface UpdateProjectDto {
  name?: string;
  domain?: string;
  autoCrawlEnabled?: boolean;
  crawlFrequency?: CrawlFrequency;
  autoSuggestMissingMetadata?: boolean;
  autoSuggestThinContent?: boolean;
  autoSuggestDailyCap?: number;
  aeoSyncToShopifyMetafields?: boolean;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all projects for a user
   */
  async getProjectsForUser(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get project by ID (with ownership check)
   */
  async getProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  /**
   * Create a new project
   */
  async createProject(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        userId,
        name: dto.name,
        domain: dto.domain,
      },
    });
  }

  /**
   * Update a project
   */
  async updateProject(projectId: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.getProject(projectId, userId);

    // Validate crawlFrequency if provided
    if (dto.crawlFrequency !== undefined) {
      const validFrequencies = Object.values(CrawlFrequency);
      if (!validFrequencies.includes(dto.crawlFrequency)) {
        throw new BadRequestException(`Invalid crawlFrequency. Must be one of: ${validFrequencies.join(', ')}`);
      }
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.domain !== undefined && { domain: dto.domain }),
        ...(dto.autoCrawlEnabled !== undefined && { autoCrawlEnabled: dto.autoCrawlEnabled }),
        ...(dto.crawlFrequency !== undefined && { crawlFrequency: dto.crawlFrequency }),
        ...(dto.autoSuggestMissingMetadata !== undefined && { autoSuggestMissingMetadata: dto.autoSuggestMissingMetadata }),
        ...(dto.autoSuggestThinContent !== undefined && { autoSuggestThinContent: dto.autoSuggestThinContent }),
        ...(dto.autoSuggestDailyCap !== undefined && { autoSuggestDailyCap: dto.autoSuggestDailyCap }),
        ...(dto.aeoSyncToShopifyMetafields !== undefined && {
          aeoSyncToShopifyMetafields: dto.aeoSyncToShopifyMetafields,
        }),
      },
    });
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string, userId: string) {
    const project = await this.getProject(projectId, userId);

    // Delete related integrations first
    await this.prisma.integration.deleteMany({
      where: { projectId },
    });

    // Delete related products
    await this.prisma.product.deleteMany({
      where: { projectId },
    });

    // Delete related crawl results
    await this.prisma.crawlResult.deleteMany({
      where: { projectId },
    });

    // Delete the project
    return this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  /**
   * Get integration status for a project
   */
  async getIntegrationStatus(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        integrations: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Build integration status map for all types
    const integrationMap = new Map(
      project.integrations.map((i) => [i.type, i]),
    );

    const shopifyIntegration = integrationMap.get(IntegrationType.SHOPIFY);
    const woocommerceIntegration = integrationMap.get(IntegrationType.WOOCOMMERCE);
    const bigcommerceIntegration = integrationMap.get(IntegrationType.BIGCOMMERCE);
    const magentoIntegration = integrationMap.get(IntegrationType.MAGENTO);
    const customWebsiteIntegration = integrationMap.get(IntegrationType.CUSTOM_WEBSITE);

    return {
      projectId: project.id,
      projectName: project.name,
      integrations: project.integrations.map((i) => ({
        type: i.type,
        externalId: i.externalId,
        connected: true,
        createdAt: i.createdAt,
        config: i.config,
      })),
      shopify: shopifyIntegration
        ? {
            connected: true,
            shopDomain: shopifyIntegration.externalId,
            installedAt: (shopifyIntegration.config as any)?.installedAt,
            scope: (shopifyIntegration.config as any)?.scope,
          }
        : {
            connected: false,
          },
      woocommerce: woocommerceIntegration
        ? {
            connected: true,
            storeUrl: woocommerceIntegration.externalId,
            createdAt: woocommerceIntegration.createdAt,
          }
        : {
            connected: false,
          },
      bigcommerce: bigcommerceIntegration
        ? {
            connected: true,
            storeHash: bigcommerceIntegration.externalId,
            createdAt: bigcommerceIntegration.createdAt,
          }
        : {
            connected: false,
          },
      magento: magentoIntegration
        ? {
            connected: true,
            storeUrl: magentoIntegration.externalId,
            createdAt: magentoIntegration.createdAt,
          }
        : {
            connected: false,
          },
      customWebsite: customWebsiteIntegration
        ? {
            connected: true,
            url: customWebsiteIntegration.externalId,
            createdAt: customWebsiteIntegration.createdAt,
          }
        : {
            connected: false,
          },
      // Crawl settings
      autoCrawlEnabled: project.autoCrawlEnabled,
      crawlFrequency: project.crawlFrequency,
      lastCrawledAt: project.lastCrawledAt,
      lastDeoComputedAt: project.lastDeoComputedAt,
      // Automation settings
      autoSuggestMissingMetadata: project.autoSuggestMissingMetadata,
      autoSuggestThinContent: project.autoSuggestThinContent,
      autoSuggestDailyCap: project.autoSuggestDailyCap,
      aeoSyncToShopifyMetafields: project.aeoSyncToShopifyMetafields ?? false,
    };
  }

  /**
   * Get project with all integrations
   */
  async getProjectWithIntegrations(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        integrations: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  /**
   * Validate project ownership
   */
  async validateProjectOwnership(projectId: string, userId: string): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });
    return !!project;
  }

  /**
   * Get project overview stats for dashboard
   */
  async getProjectOverview(projectId: string, userId: string): Promise<{
    crawlCount: number;
    issueCount: number;
    avgSeoScore: number | null;
    productCount: number;
    productsWithAppliedSeo: number;
    productsWithAnswerBlocks: number;
    lastAnswerBlockSyncStatus: string | null;
    lastAnswerBlockSyncAt: Date | null;
  }> {
    // Validate project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Get crawl results for issue count and avg score calculation
    const crawlResults = await this.prisma.crawlResult.findMany({
      where: { projectId },
      select: { issues: true },
    });

    const crawlCount = crawlResults.length;

    // Calculate issue count and average SEO score
    let issueCount = 0;
    let totalScore = 0;

    for (const result of crawlResults) {
      const issues = result.issues as string[];
      issueCount += issues.length;
      // Reuse the exact score formula from SeoScanService.calculateScore
      totalScore += Math.max(0, 100 - issues.length * 10);
    }

    const avgSeoScore = crawlCount > 0 ? Math.round(totalScore / crawlCount) : null;

    // Get product counts
    const productCount = await this.prisma.product.count({
      where: { projectId },
    });

    const productsWithAppliedSeo = await this.prisma.product.count({
      where: {
        projectId,
        OR: [
          { seoTitle: { not: null } },
          { seoDescription: { not: null } },
        ],
      },
    });

    const productsWithAnswerBlocks = await this.prisma.product.count({
      where: {
        projectId,
        answerBlocks: {
          some: {},
        },
      },
    });

    const lastAnswerBlockSync = await this.prisma.answerBlockAutomationLog.findFirst({
      where: {
        projectId,
        action: 'answer_blocks_synced_to_shopify',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      crawlCount,
      issueCount,
      avgSeoScore,
      productCount,
      productsWithAppliedSeo,
      productsWithAnswerBlocks,
      lastAnswerBlockSyncStatus: lastAnswerBlockSync?.status ?? null,
      lastAnswerBlockSyncAt: lastAnswerBlockSync?.createdAt ?? null,
    };
  }

  /**
   * Get non-product crawl pages for content optimization
   */
  async getCrawlPages(projectId: string, userId: string) {
    // Validate project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Get all crawl results for the project
    const crawlResults = await this.prisma.crawlResult.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        url: true,
        statusCode: true,
        title: true,
        metaDescription: true,
        h1: true,
        wordCount: true,
        loadTimeMs: true,
        issues: true,
        scannedAt: true,
      },
      orderBy: { scannedAt: 'desc' },
    });

    // Static paths that should be classified as 'static'
    const staticPaths = new Set([
      '/about',
      '/contact',
      '/faq',
      '/support',
      '/shipping',
      '/returns',
      '/privacy',
      '/terms',
      '/privacy-policy',
      '/terms-of-service',
      '/refund-policy',
    ]);

    // Helper to determine pageType from URL path
    const getPageType = (
      path: string,
    ): 'home' | 'collection' | 'blog' | 'static' | 'misc' => {
      const normalizedPath = path.toLowerCase();

      if (normalizedPath === '/' || normalizedPath === '') {
        return 'home';
      }
      if (
        normalizedPath.startsWith('/collections/') ||
        normalizedPath.startsWith('/collections')
      ) {
        return 'collection';
      }
      if (
        normalizedPath.startsWith('/blogs/') ||
        normalizedPath.startsWith('/blog/') ||
        normalizedPath === '/blog' ||
        normalizedPath === '/blogs'
      ) {
        return 'blog';
      }
      if (
        normalizedPath.startsWith('/pages/') ||
        staticPaths.has(normalizedPath)
      ) {
        return 'static';
      }

      return 'misc';
    };

    // Filter out product URLs, deduplicate by URL (keep most recent), and transform results
    // Since results are ordered by scannedAt desc, first occurrence of each URL is the most recent
    const seenUrls = new Set<string>();
    const contentPages = crawlResults
      .filter((result) => {
        // Skip if we've already seen this URL (keep only the most recent)
        if (seenUrls.has(result.url)) {
          return false;
        }
        seenUrls.add(result.url);

        try {
          const urlObj = new URL(result.url);
          const path = urlObj.pathname.toLowerCase();
          // Exclude product URLs (Shopify pattern: /products/*)
          return !path.startsWith('/products/') && path !== '/products';
        } catch {
          // If URL parsing fails, include it as misc
          return true;
        }
      })
      .map((result) => {
        let path = '/';
        try {
          const urlObj = new URL(result.url);
          path = urlObj.pathname || '/';
        } catch {
          // If URL parsing fails, use the full URL as path
          path = result.url;
        }

        return {
          id: result.id,
          projectId: result.projectId,
          url: result.url,
          path,
          pageType: getPageType(path),
          statusCode: result.statusCode,
          title: result.title,
          metaDescription: result.metaDescription,
          h1: result.h1,
          wordCount: result.wordCount,
          loadTimeMs: result.loadTimeMs,
          issues: result.issues as string[],
          scannedAt: result.scannedAt.toISOString(),
        };
      });

    return contentPages;
  }
}
