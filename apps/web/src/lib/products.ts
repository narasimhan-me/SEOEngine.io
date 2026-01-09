export interface Product {
  id: string;
  externalId: string;
  title: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrls: string[] | null;
  lastSyncedAt: string;
  handle?: string | null;
  price?: number | null;
  currency?: string | null;
  shopifyStatus?: string | null;
  lastOptimizedAt?: string | null;
  /** [LIST-ACTIONS-CLARITY-1] Server-derived: true if product appears in a pending draft */
  hasDraftPendingApply?: boolean;
}

export type ProductStatus = 'missing-metadata' | 'needs-optimization' | 'optimized';

/**
 * Get the SEO Metadata status for a product.
 *
 * IMPORTANT: This function defines the SEO Metadata status only (Metadata & Snippet Quality pillar).
 * It must never be used as a proxy for overall DEO health. DEO issues are tracked separately
 * via the DeoIssue system and should be displayed alongside metadata status, not hidden by it.
 *
 * @param product - The product to evaluate
 * @returns ProductStatus - 'missing-metadata' | 'needs-optimization' | 'optimized'
 */
export function getProductStatus(product: Product): ProductStatus {
  const hasTitle = !!product.seoTitle?.trim();
  const hasDescription = !!product.seoDescription?.trim();

  if (!hasTitle && !hasDescription) {
    return 'missing-metadata';
  }

  const titleLength = product.seoTitle?.length ?? 0;
  const descriptionLength = product.seoDescription?.length ?? 0;

  const titleNeedsWork = titleLength > 0 && (titleLength < 30 || titleLength > 60);
  const descriptionNeedsWork =
    descriptionLength > 0 && (descriptionLength < 70 || descriptionLength > 155);

  if (!hasTitle || !hasDescription || titleNeedsWork || descriptionNeedsWork) {
    return 'needs-optimization';
  }

  return 'optimized';
}
