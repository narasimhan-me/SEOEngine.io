import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { DeoIssuesService } from '../projects/deo-issues.service';
import type { DeoIssue } from '@engineo/shared';

/**
 * [LIST-SEARCH-FILTER-1] Product list filter options
 * [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Extended with issueType filter
 */
export interface ProductListFilters {
  /** Case-insensitive search across title and handle */
  q?: string;
  /** Status filter: 'optimized' | 'needs_attention' */
  status?: 'optimized' | 'needs_attention';
  /** Filter products that appear in non-applied drafts */
  hasDraft?: boolean;
  /** [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Filter to products affected by this issue type */
  issueType?: string;
}

/**
 * [LIST-SEARCH-FILTER-1] SEO Metadata status thresholds
 * Must match products.ts:getProductStatus semantics:
 * - optimized: has both title (30-60 chars) and description (70-155 chars)
 * - needs_attention: missing metadata or length issues
 */
const SEO_TITLE_MIN = 30;
const SEO_TITLE_MAX = 60;
const SEO_DESC_MIN = 70;
const SEO_DESC_MAX = 155;

/**
 * [COUNT-INTEGRITY-1.1 PATCH 3.1] Internal field name for full affected asset keys.
 * Non-enumerable property on DeoIssue for accurate per-asset counting.
 */
const FULL_AFFECTED_ASSET_KEYS_FIELD = '__fullAffectedAssetKeys';

/**
 * [ROLES-3] Updated with ProjectMember-aware access enforcement
 * [LIST-SEARCH-FILTER-1] Extended with server-side filtering
 * [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Uses canonical DEO issues for actionable counts
 *
 * Access control:
 * - getProductsForProject: Any ProjectMember can view
 * - getProduct: Any ProjectMember can view
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService,
    // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Inject DeoIssuesService for canonical issue counts
    @Inject(forwardRef(() => DeoIssuesService))
    private readonly deoIssuesService: DeoIssuesService,
  ) {}

  /**
   * Get all products for a project (with membership validation)
   * [ROLES-3] Any ProjectMember can view products
   * [LIST-SEARCH-FILTER-1] Server-authoritative filtering support
   * [LIST-ACTIONS-CLARITY-1] Always returns hasDraftPendingApply for each product
   * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Returns actionableNowCount and blockedByApproval
   */
  async getProductsForProject(
    projectId: string,
    userId: string,
    filters?: ProductListFilters,
  ) {
    // [ROLES-3] Verify membership (any role can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    // [LIST-SEARCH-FILTER-1] Build where clause for filtering
    const whereClause: any = { projectId };

    // Get products for this project with filters
    let products = await this.prisma.product.findMany({
      where: whereClause,
      orderBy: { lastSyncedAt: 'desc' },
      select: {
        id: true,
        externalId: true,
        title: true,
        description: true,
        handle: true, // [LIST-SEARCH-FILTER-1] Include handle
        seoTitle: true,
        seoDescription: true,
        imageUrls: true,
        lastSyncedAt: true,
      },
    });

    // [LIST-ACTIONS-CLARITY-1] Always compute pending draft set for hasDraftPendingApply field
    const productIdsWithDrafts = await this.getProductIdsWithPendingDrafts(projectId);

    // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Fetch canonical DEO issues for actionable counts
    const canonicalIssueCountsByProductId = await this.getCanonicalIssueCountsByProduct(projectId, userId);

    // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Get viewer's role capabilities (not governance-based)
    const viewerCanApply = await this.roleResolution.canApply(projectId, userId);

    // [LIST-SEARCH-FILTER-1] Apply filters in memory for complex conditions
    if (filters) {
      // Search filter: case-insensitive match across title and handle
      if (filters.q) {
        const searchLower = filters.q.toLowerCase();
        products = products.filter((p) => {
          const titleMatch = p.title?.toLowerCase().includes(searchLower);
          const handleMatch = p.handle?.toLowerCase().includes(searchLower);
          return titleMatch || handleMatch;
        });
      }

      // Status filter: optimized vs needs_attention
      if (filters.status) {
        products = products.filter((p) => {
          const status = this.getProductStatus(p);
          if (filters.status === 'optimized') {
            return status === 'optimized';
          }
          // needs_attention includes both 'missing-metadata' and 'needs-optimization'
          return status === 'missing-metadata' || status === 'needs-optimization';
        });
      }

      // Has draft filter: products in non-applied drafts
      if (filters.hasDraft) {
        products = products.filter((p) => productIdsWithDrafts.has(p.id));
      }

      // [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Issue type filter: products affected by this issue
      if (filters.issueType) {
        const affectedProductIds = await this.getProductIdsAffectedByIssueType(
          projectId,
          userId,
          filters.issueType,
        );
        products = products.filter((p) => affectedProductIds.has(p.id));
      }
    }

    // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Add server-derived row action fields to each product
    // Uses canonical DEO issues for actionableNowCount (not SEO heuristics)
    return products.map((p) => {
      const hasDraftPendingApply = productIdsWithDrafts.has(p.id);
      // Canonical issue count from DeoIssuesService (isActionableNow === true issues affecting this product)
      const counts = canonicalIssueCountsByProductId.get(p.id);
      const actionableNowCount = counts?.actionable ?? 0;
      const detectedIssueCount = counts?.detected ?? 0;
      // blockedByApproval: has draft AND viewer cannot apply (capability-based, not governance-based)
      const blockedByApproval = hasDraftPendingApply && !viewerCanApply;

      return {
        ...p,
        hasDraftPendingApply,
        actionableNowCount,
        detectedIssueCount,
        blockedByApproval,
      };
    });
  }

  /**
   * [LIST-SEARCH-FILTER-1] Compute product SEO status
   * Must match products.ts:getProductStatus semantics exactly
   */
  private getProductStatus(
    product: { seoTitle: string | null; seoDescription: string | null },
  ): 'missing-metadata' | 'needs-optimization' | 'optimized' {
    const hasTitle = !!product.seoTitle?.trim();
    const hasDescription = !!product.seoDescription?.trim();

    if (!hasTitle && !hasDescription) {
      return 'missing-metadata';
    }

    const titleLength = product.seoTitle?.length ?? 0;
    const descriptionLength = product.seoDescription?.length ?? 0;

    const titleNeedsWork = titleLength > 0 && (titleLength < SEO_TITLE_MIN || titleLength > SEO_TITLE_MAX);
    const descriptionNeedsWork = descriptionLength > 0 && (descriptionLength < SEO_DESC_MIN || descriptionLength > SEO_DESC_MAX);

    if (!hasTitle || !hasDescription || titleNeedsWork || descriptionNeedsWork) {
      return 'needs-optimization';
    }

    return 'optimized';
  }

  /**
   * [LIST-SEARCH-FILTER-1] Get set of product IDs that appear in non-applied drafts
   * "Draft pending apply" = product appears in any AutomationPlaybookDraft
   * with status READY or PARTIAL and not expired
   */
  private async getProductIdsWithPendingDrafts(projectId: string): Promise<Set<string>> {
    const now = new Date();

    // Find non-applied, non-expired drafts for this project
    const drafts = await this.prisma.automationPlaybookDraft.findMany({
      where: {
        projectId,
        status: { in: ['READY', 'PARTIAL'] },
        appliedAt: null, // Not yet applied
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: {
        draftItems: true,
        sampleProductIds: true,
      },
    });

    const productIdSet = new Set<string>();

    for (const draft of drafts) {
      // Extract product IDs from draftItems
      if (draft.draftItems && Array.isArray(draft.draftItems)) {
        for (const item of draft.draftItems as any[]) {
          if (item?.productId) {
            productIdSet.add(item.productId);
          }
        }
      }

      // Also check sampleProductIds
      if (draft.sampleProductIds && Array.isArray(draft.sampleProductIds)) {
        for (const id of draft.sampleProductIds as string[]) {
          if (id) {
            productIdSet.add(id);
          }
        }
      }
    }

    return productIdSet;
  }

  /**
   * [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Compute canonical issue counts per product
   * Returns a Map of productId → { actionable: number, detected: number }
   *
   * Uses DeoIssuesService to fetch canonical issues and counts them per product:
   * - actionable: count of issue types where isActionableNow === true affecting this product
   * - detected: count of all issue types affecting this product
   *
   * Issue matching uses the non-enumerable __fullAffectedAssetKeys field when present,
   * falling back to issue.affectedProducts.
   */
  private async getCanonicalIssueCountsByProduct(
    projectId: string,
    userId: string,
  ): Promise<Map<string, { actionable: number; detected: number }>> {
    const countsMap = new Map<string, { actionable: number; detected: number }>();

    try {
      // Fetch canonical issues from DeoIssuesService
      const issuesResponse = await this.deoIssuesService.getIssuesForProjectReadOnly(projectId, userId);

      if (!issuesResponse.issues || issuesResponse.issues.length === 0) {
        return countsMap;
      }

      // Build per-product issue type sets
      // Key: productId, Value: { actionableTypes: Set<string>, detectedTypes: Set<string> }
      const productIssueTypes = new Map<string, { actionableTypes: Set<string>; detectedTypes: Set<string> }>();

      for (const issue of issuesResponse.issues) {
        const issueType = issue.type ?? issue.id;
        const productIds = this.getProductIdsAffectedByIssue(issue);

        for (const productId of productIds) {
          let entry = productIssueTypes.get(productId);
          if (!entry) {
            entry = { actionableTypes: new Set(), detectedTypes: new Set() };
            productIssueTypes.set(productId, entry);
          }

          // Always count detected
          entry.detectedTypes.add(issueType);

          // Only count actionable if isActionableNow === true
          if (issue.isActionableNow) {
            entry.actionableTypes.add(issueType);
          }
        }
      }

      // Convert to counts
      for (const [productId, entry] of productIssueTypes) {
        countsMap.set(productId, {
          actionable: entry.actionableTypes.size,
          detected: entry.detectedTypes.size,
        });
      }
    } catch (error) {
      // If issues fetch fails, return empty map (graceful degradation)
      console.error('[ProductsService] Failed to fetch canonical issues:', error);
    }

    return countsMap;
  }

  /**
   * [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Extract product IDs affected by an issue
   * Prefers __fullAffectedAssetKeys (non-enumerable, uncapped) when present,
   * falls back to issue.affectedProducts.
   */
  private getProductIdsAffectedByIssue(issue: DeoIssue): string[] {
    // Try non-enumerable full affected keys first (format: "products:{productId}")
    const fullKeys = (issue as any)[FULL_AFFECTED_ASSET_KEYS_FIELD] as string[] | undefined;
    if (Array.isArray(fullKeys) && fullKeys.length > 0) {
      const productIds: string[] = [];
      for (const key of fullKeys) {
        if (key.startsWith('products:')) {
          productIds.push(key.substring('products:'.length));
        }
      }
      if (productIds.length > 0) {
        return productIds;
      }
    }

    // Fallback to affectedProducts array
    if (Array.isArray(issue.affectedProducts) && issue.affectedProducts.length > 0) {
      return issue.affectedProducts;
    }

    return [];
  }

  /**
   * [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Get product IDs affected by a specific issue type
   * Used for server-authoritative filtering in "View affected" routing from Issues Engine.
   *
   * @param projectId - The project ID
   * @param userId - The viewer's user ID (for access control)
   * @param issueType - The issue type key (e.g., 'missing_seo_title')
   * @returns Set of product IDs affected by the issue
   */
  private async getProductIdsAffectedByIssueType(
    projectId: string,
    userId: string,
    issueType: string,
  ): Promise<Set<string>> {
    const affectedSet = new Set<string>();

    try {
      // Fetch canonical issues from DeoIssuesService
      const issuesResponse = await this.deoIssuesService.getIssuesForProjectReadOnly(projectId, userId);

      if (!issuesResponse.issues || issuesResponse.issues.length === 0) {
        return affectedSet;
      }

      // Find the matching issue by type or id
      const matchingIssue = issuesResponse.issues.find((issue) => {
        const key = issue.type ?? issue.id;
        return key === issueType;
      });

      if (!matchingIssue) {
        // No matching issue found - return empty set (deterministic "no affected items")
        return affectedSet;
      }

      // Get affected product IDs using existing helper
      const productIds = this.getProductIdsAffectedByIssue(matchingIssue);
      for (const id of productIds) {
        affectedSet.add(id);
      }
    } catch (error) {
      // If issues fetch fails, return empty set (graceful degradation)
      console.error('[ProductsService] Failed to fetch issues for issueType filter:', error);
    }

    return affectedSet;
  }

  /**
   * Get a single product by ID (with membership validation)
   * [ROLES-3] Any ProjectMember can view products
   */
  async getProduct(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // [ROLES-3] Verify membership (any role can view)
    await this.roleResolution.assertProjectAccess(product.projectId, userId);

    return product;
  }
}
