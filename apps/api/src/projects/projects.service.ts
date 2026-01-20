import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IntegrationType, CrawlFrequency, ProjectMemberRole, GovernanceAuditEventType } from '@prisma/client';
import { RoleResolutionService, EffectiveProjectRole } from '../common/role-resolution.service';

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
  // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Project-level gate for Answer Block automation on product sync
  autoGenerateAnswerBlocksOnProductSync?: boolean;
}

// [ROLES-3] Project member DTOs
export interface AddMemberDto {
  email: string;
  role: ProjectMemberRole;
}

export interface ChangeMemberRoleDto {
  role: ProjectMemberRole;
}

export interface ProjectMemberInfo {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: ProjectMemberRole;
  createdAt: Date;
}

/**
 * [LIST-SEARCH-FILTER-1.1] Crawl page list filter options
 */
export interface CrawlPageListFilters {
  /** Case-insensitive search across URL path and title */
  q?: string;
  /** Status filter: 'optimized' | 'needs_attention' */
  status?: 'optimized' | 'needs_attention';
  /** Filter pages that appear in non-applied drafts */
  hasDraft?: boolean;
  /** Filter by page type: 'static' (pages), 'collection' (collections), or 'blog' (blog posts) */
  pageType?: 'static' | 'collection' | 'blog';
}

/**
 * [LIST-SEARCH-FILTER-1.1] SEO Metadata status thresholds (same as products)
 */
const CRAWL_PAGE_SEO_TITLE_MIN = 30;
const CRAWL_PAGE_SEO_TITLE_MAX = 60;
const CRAWL_PAGE_SEO_DESC_MIN = 70;
const CRAWL_PAGE_SEO_DESC_MAX = 155;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  /**
   * [ROLES-3] Get all projects for a user (includes projects where user is a member)
   */
  async getProjectsForUser(userId: string) {
    // Get projects where user is a ProjectMember
    const memberProjects = await this.prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: true,
      },
      orderBy: { project: { createdAt: 'desc' } },
    });

    // Also get legacy projects (where user is Project.userId but no membership record)
    const legacyProjects = await this.prisma.project.findMany({
      where: {
        userId,
        members: {
          none: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Combine and return (members first, then legacy)
    const memberProjectList = memberProjects.map((m) => ({
      ...m.project,
      memberRole: m.role,
    }));
    const legacyProjectList = legacyProjects.map((p) => ({
      ...p,
      memberRole: 'OWNER' as ProjectMemberRole, // Legacy owner
    }));

    return [...memberProjectList, ...legacyProjectList];
  }

  /**
   * [ROLES-3] Get project by ID (with membership check instead of ownership check)
   */
  async getProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3] Check membership instead of ownership
    const hasAccess = await this.roleResolution.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Include user's role in the response
    const role = await this.roleResolution.resolveEffectiveRole(projectId, userId);

    return {
      ...project,
      memberRole: role,
    };
  }

  /**
   * Create a new project (and add creator as OWNER member)
   */
  async createProject(userId: string, dto: CreateProjectDto) {
    // Use transaction to create project and membership atomically
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          userId,
          name: dto.name,
          domain: dto.domain,
        },
      });

      // [ROLES-3] Create OWNER membership for the creator
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId,
          role: ProjectMemberRole.OWNER,
        },
      });

      return project;
    });
  }

  /**
   * [ROLES-3] Update a project (OWNER-only)
   */
  async updateProject(projectId: string, userId: string, dto: UpdateProjectDto) {
    // Verify project exists and user has OWNER role
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3] Enforce OWNER-only for updates
    await this.roleResolution.assertOwnerRole(projectId, userId);

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
        // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Persist Answer Block automation setting
        ...(dto.autoGenerateAnswerBlocksOnProductSync !== undefined && {
          autoGenerateAnswerBlocksOnProductSync: dto.autoGenerateAnswerBlocksOnProductSync,
        }),
      },
    });
  }

  /**
   * [ROLES-3] Delete a project (OWNER-only)
   */
  async deleteProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3] Enforce OWNER-only for deletion
    await this.roleResolution.assertOwnerRole(projectId, userId);

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

    // Delete the project (ProjectMember records cascade-deleted)
    return this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  /**
   * [ROLES-3] Get integration status for a project (membership check)
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

    // [ROLES-3] Check membership instead of ownership
    const hasAccess = await this.roleResolution.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Build integration status map for all types
    const integrationMap = new Map(project.integrations.map((i) => [i.type, i]));

    const isIntegrationConnected = (integration: any): boolean => {
      if (!integration) return false;
      switch (integration.type) {
        case IntegrationType.SHOPIFY:
        case IntegrationType.WOOCOMMERCE:
        case IntegrationType.BIGCOMMERCE:
        case IntegrationType.MAGENTO:
          return !!integration.externalId && !!integration.accessToken;
        case IntegrationType.CUSTOM_WEBSITE:
          return !!integration.externalId;
        default:
          return !!integration.externalId;
      }
    };

    const shopifyIntegration = integrationMap.get(IntegrationType.SHOPIFY);
    const woocommerceIntegration = integrationMap.get(IntegrationType.WOOCOMMERCE);
    const bigcommerceIntegration = integrationMap.get(IntegrationType.BIGCOMMERCE);
    const magentoIntegration = integrationMap.get(IntegrationType.MAGENTO);
    const customWebsiteIntegration = integrationMap.get(IntegrationType.CUSTOM_WEBSITE);

    const activeIntegrations = project.integrations
      .map((i) => ({
        type: i.type,
        externalId: i.externalId,
        connected: isIntegrationConnected(i),
        createdAt: i.createdAt,
        config: i.config,
      }))
      .filter((i) => i.connected);

    const shopifyConnected = !!shopifyIntegration && isIntegrationConnected(shopifyIntegration);

    return {
      projectId: project.id,
      projectName: project.name,
      projectDomain: project.domain ?? null,
      integrations: activeIntegrations,
      shopify: shopifyIntegration
        ? {
            connected: shopifyConnected,
            shopDomain: shopifyIntegration.externalId,
            installedAt: shopifyConnected ? (shopifyIntegration.config as any)?.installedAt : undefined,
            scope: shopifyConnected ? (shopifyIntegration.config as any)?.scope : undefined,
          }
        : { connected: false },
      woocommerce: woocommerceIntegration
        ? {
            connected: isIntegrationConnected(woocommerceIntegration),
            storeUrl: woocommerceIntegration.externalId,
            createdAt: woocommerceIntegration.createdAt,
          }
        : {
            connected: false,
          },
      bigcommerce: bigcommerceIntegration
        ? {
            connected: isIntegrationConnected(bigcommerceIntegration),
            storeHash: bigcommerceIntegration.externalId,
            createdAt: bigcommerceIntegration.createdAt,
          }
        : {
            connected: false,
          },
      magento: magentoIntegration
        ? {
            connected: isIntegrationConnected(magentoIntegration),
            storeUrl: magentoIntegration.externalId,
            createdAt: magentoIntegration.createdAt,
          }
        : {
            connected: false,
          },
      customWebsite: customWebsiteIntegration
        ? {
            connected: isIntegrationConnected(customWebsiteIntegration),
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
      // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Answer Block automation on product sync setting
      autoGenerateAnswerBlocksOnProductSync: project.autoGenerateAnswerBlocksOnProductSync ?? false,
    };
  }

  /**
   * [ROLES-3] Get project with all integrations (membership check)
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

    // [ROLES-3] Check membership instead of ownership
    const hasAccess = await this.roleResolution.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  /**
   * [ROLES-3] Validate project access (replaces validateProjectOwnership for read paths)
   */
  async validateProjectAccess(projectId: string, userId: string): Promise<boolean> {
    return this.roleResolution.hasProjectAccess(projectId, userId);
  }

  /**
   * Legacy: Validate project ownership (kept for backward compatibility)
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
   * [ROLES-3] Get project overview stats for dashboard (membership check)
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
    // Validate project access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3] Check membership instead of ownership
    const hasAccess = await this.roleResolution.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
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
   * [ROLES-3] [LIST-SEARCH-FILTER-1.1] Get non-product crawl pages for content optimization (membership check)
   * Supports filtering by q, status, hasDraft, pageType
   * [LIST-ACTIONS-CLARITY-1] Always returns hasDraftPendingApply for each page
   */
  async getCrawlPages(projectId: string, userId: string, filters?: CrawlPageListFilters) {
    // Validate project access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3] Check membership instead of ownership
    const hasAccess = await this.roleResolution.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Get all crawl results for the project
    // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Include Shopify identity fields
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
        // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Shopify identity fields
        shopifyResourceType: true,
        shopifyResourceId: true,
        shopifyHandle: true,
        shopifyBlogHandle: true,
        shopifyUpdatedAt: true,
        // [BLOGS-ASSET-SYNC-COVERAGE-1] Shopify article publish status support
        shopifyPublishedAt: true,
        shopifySyncedAt: true,
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

    // [LIST-SEARCH-FILTER-1.1] Helper to determine SEO status
    const getCrawlPageStatus = (page: { title: string | null; metaDescription: string | null }): 'optimized' | 'needs_attention' => {
      const titleLen = page.title?.length ?? 0;
      const descLen = page.metaDescription?.length ?? 0;

      const titleOk = titleLen >= CRAWL_PAGE_SEO_TITLE_MIN && titleLen <= CRAWL_PAGE_SEO_TITLE_MAX;
      const descOk = descLen >= CRAWL_PAGE_SEO_DESC_MIN && descLen <= CRAWL_PAGE_SEO_DESC_MAX;

      return titleOk && descOk ? 'optimized' : 'needs_attention';
    };

    // [LIST-ACTIONS-CLARITY-1] Always compute pending draft set for hasDraftPendingApply field
    const crawlPageIdsWithDrafts = await this.getCrawlPageIdsWithPendingDrafts(projectId);

    // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Deduplicate by URL, preferring Shopify-identified rows
    // Build a map of URL -> best candidate (Shopify-identified preferred, then most recent)
    const urlToBestResult = new Map<string, typeof crawlResults[0]>();

    for (const result of crawlResults) {
      try {
        const urlObj = new URL(result.url);
        const path = urlObj.pathname.toLowerCase();
        // Exclude product URLs (Shopify pattern: /products/*)
        if (path.startsWith('/products/') || path === '/products') {
          continue;
        }
      } catch {
        // If URL parsing fails, include it as misc
      }

      const existing = urlToBestResult.get(result.url);
      if (!existing) {
        urlToBestResult.set(result.url, result);
      } else {
        // Prefer Shopify-identified row (has shopifyResourceId) over non-Shopify row
        const existingIsShopify = !!existing.shopifyResourceId;
        const currentIsShopify = !!result.shopifyResourceId;

        if (currentIsShopify && !existingIsShopify) {
          // Current has Shopify identity, existing doesn't - prefer current
          urlToBestResult.set(result.url, result);
        }
        // Otherwise keep existing (already ordered by scannedAt desc, so first is most recent)
      }
    }

    // Convert map values to array
    let contentPages = Array.from(urlToBestResult.values())
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
          // [LIST-ACTIONS-CLARITY-1] Add hasDraftPendingApply
          hasDraftPendingApply: crawlPageIdsWithDrafts.has(result.id),
          // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Include Shopify identity fields
          shopifyResourceType: result.shopifyResourceType,
          shopifyResourceId: result.shopifyResourceId,
          shopifyHandle: result.shopifyHandle,
          shopifyBlogHandle: result.shopifyBlogHandle,
          shopifyUpdatedAt: result.shopifyUpdatedAt?.toISOString() ?? null,
          shopifyPublishedAt: result.shopifyPublishedAt?.toISOString() ?? null,
          shopifySyncedAt: result.shopifySyncedAt?.toISOString() ?? null,
        };
      });

    // [LIST-SEARCH-FILTER-1.1] Apply filters
    if (filters) {
      // Filter by pageType
      if (filters.pageType) {
        contentPages = contentPages.filter(page => page.pageType === filters.pageType);
      }

      // Filter by search query (q) - search in path and title
      if (filters.q) {
        const searchLower = filters.q.toLowerCase();
        contentPages = contentPages.filter(page => {
          const pathMatch = page.path.toLowerCase().includes(searchLower);
          const titleMatch = page.title?.toLowerCase().includes(searchLower) ?? false;
          return pathMatch || titleMatch;
        });
      }

      // Filter by status
      if (filters.status) {
        contentPages = contentPages.filter(page => getCrawlPageStatus(page) === filters.status);
      }

      // Filter by hasDraft
      if (filters.hasDraft) {
        contentPages = contentPages.filter(page => page.hasDraftPendingApply);
      }
    }

    return contentPages;
  }

  /**
   * [LIST-SEARCH-FILTER-1.1] Get crawl page IDs that appear in non-applied drafts
   * Checks draftItems Json array for items with crawlResultId field
   */
  private async getCrawlPageIdsWithPendingDrafts(projectId: string): Promise<Set<string>> {
    const now = new Date();
    const drafts = await this.prisma.automationPlaybookDraft.findMany({
      where: {
        projectId,
        status: { in: ['READY', 'PARTIAL'] },
        appliedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: {
        draftItems: true,
      },
    });

    const ids = new Set<string>();
    for (const draft of drafts) {
      // draftItems is a Json field containing an array of items
      if (draft.draftItems && Array.isArray(draft.draftItems)) {
        for (const item of draft.draftItems as any[]) {
          if (item?.crawlResultId) {
            ids.add(item.crawlResultId);
          }
        }
      }
    }
    return ids;
  }

  // ===========================================================================
  // [ROLES-3] Membership Management API
  // ===========================================================================

  /**
   * [ROLES-3] List all members of a project (read-only for all members)
   */
  async listMembers(projectId: string, userId: string): Promise<ProjectMemberInfo[]> {
    // Verify project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.roleResolution.assertProjectAccess(projectId, userId);

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      createdAt: m.createdAt,
    }));
  }

  /**
   * [ROLES-3] Add a member to a project (OWNER-only)
   */
  async addMember(
    projectId: string,
    actorUserId: string,
    dto: AddMemberDto,
  ): Promise<ProjectMemberInfo> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Enforce OWNER-only
    await this.roleResolution.assertOwnerRole(projectId, actorUserId);

    // Find user by email
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if already a member
    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUser.id },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this project');
    }

    // Create membership
    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role: dto.role,
      },
    });

    // Audit log
    await this.prisma.governanceAuditEvent.create({
      data: {
        projectId,
        actorUserId,
        eventType: GovernanceAuditEventType.PROJECT_MEMBER_ADDED,
        resourceType: 'PROJECT_MEMBER',
        resourceId: member.id,
        metadata: {
          targetUserId: targetUser.id,
          targetEmail: targetUser.email,
          role: dto.role,
        },
      },
    });

    return {
      id: member.id,
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: member.role,
      createdAt: member.createdAt,
    };
  }

  /**
   * [ROLES-3] Change a member's role (OWNER-only)
   */
  async changeMemberRole(
    projectId: string,
    memberId: string,
    actorUserId: string,
    dto: ChangeMemberRoleDto,
  ): Promise<ProjectMemberInfo> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Enforce OWNER-only
    await this.roleResolution.assertOwnerRole(projectId, actorUserId);

    // Find membership
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // If changing from OWNER to non-OWNER, ensure at least one OWNER remains
    if (member.role === ProjectMemberRole.OWNER && dto.role !== ProjectMemberRole.OWNER) {
      const ownerCount = await this.prisma.projectMember.count({
        where: { projectId, role: ProjectMemberRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner. Projects must have at least one owner.');
      }
    }

    const oldRole = member.role;

    // Update role
    const updated = await this.prisma.projectMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });

    // Audit log
    await this.prisma.governanceAuditEvent.create({
      data: {
        projectId,
        actorUserId,
        eventType: GovernanceAuditEventType.PROJECT_MEMBER_ROLE_CHANGED,
        resourceType: 'PROJECT_MEMBER',
        resourceId: member.id,
        metadata: {
          targetUserId: member.userId,
          targetEmail: member.user.email,
          oldRole,
          newRole: dto.role,
        },
      },
    });

    return {
      id: updated.id,
      userId: member.userId,
      email: member.user.email,
      name: member.user.name,
      role: updated.role,
      createdAt: updated.createdAt,
    };
  }

  /**
   * [ROLES-3] Remove a member from a project (OWNER-only)
   */
  async removeMember(
    projectId: string,
    memberId: string,
    actorUserId: string,
  ): Promise<void> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Enforce OWNER-only
    await this.roleResolution.assertOwnerRole(projectId, actorUserId);

    // Find membership
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // If removing an OWNER, ensure at least one OWNER remains
    if (member.role === ProjectMemberRole.OWNER) {
      const ownerCount = await this.prisma.projectMember.count({
        where: { projectId, role: ProjectMemberRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner. Projects must have at least one owner.');
      }
    }

    // Delete membership
    await this.prisma.projectMember.delete({
      where: { id: memberId },
    });

    // Audit log
    await this.prisma.governanceAuditEvent.create({
      data: {
        projectId,
        actorUserId,
        eventType: GovernanceAuditEventType.PROJECT_MEMBER_REMOVED,
        resourceType: 'PROJECT_MEMBER',
        resourceId: member.id,
        metadata: {
          targetUserId: member.userId,
          targetEmail: member.user.email,
          role: member.role,
        },
      },
    });
  }

  /**
   * [ROLES-3] Get user's role in a project
   */
  async getUserRole(projectId: string, userId: string): Promise<EffectiveProjectRole | null> {
    return this.roleResolution.resolveEffectiveRole(projectId, userId);
  }
}
