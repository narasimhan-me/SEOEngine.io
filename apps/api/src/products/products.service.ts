import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';

/**
 * [LIST-SEARCH-FILTER-1] Product list filter options
 */
export interface ProductListFilters {
  /** Case-insensitive search across title and handle */
  q?: string;
  /** Status filter: 'optimized' | 'needs_attention' */
  status?: 'optimized' | 'needs_attention';
  /** Filter products that appear in non-applied drafts */
  hasDraft?: boolean;
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
 * [ROLES-3] Updated with ProjectMember-aware access enforcement
 * [LIST-SEARCH-FILTER-1] Extended with server-side filtering
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
  ) {}

  /**
   * Get all products for a project (with membership validation)
   * [ROLES-3] Any ProjectMember can view products
   * [LIST-SEARCH-FILTER-1] Server-authoritative filtering support
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
        const productIdsWithDrafts = await this.getProductIdsWithPendingDrafts(projectId);
        products = products.filter((p) => productIdsWithDrafts.has(p.id));
      }
    }

    return products;
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
