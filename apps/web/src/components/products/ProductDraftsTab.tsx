/**
 * NON-AI BOUNDARY: Draft Review is human-only. Do not import aiApi or add AI generation actions here.
 *
 * [DRAFT-REVIEW-ISOLATION-1] Isolated Product Drafts Tab Component
 * [DRAFT-FIELD-COVERAGE-1-FIXUP-1] Thin wrapper around AssetDraftsTab to prevent implementation drift
 *
 * This module is intentionally isolated from AI-related code to enforce the locked statement:
 * "Draft Review stays human-only; AI is never invoked during Draft Review/Approval/Apply."
 *
 * FORBIDDEN IMPORTS (enforced by guard test draft-review-isolation-1.spec.ts):
 * - aiApi
 * - ProductAiSuggestionsPanel
 * - suggestProductMetadata
 * - generateProductAnswers
 * - AI_DAILY_LIMIT_REACHED
 */

'use client';

import { AssetDraftsTab } from './AssetDraftsTab';

/**
 * [DRAFT-DIFF-CLARITY-1] Current field values for diff display
 * Keyed by field name (seoTitle, seoDescription)
 */
interface CurrentFieldValues {
  seoTitle?: string | null;
  seoDescription?: string | null;
}

interface ProductDraftsTabProps {
  projectId: string;
  productId: string;
  /** [DRAFT-DIFF-CLARITY-1] Current/live field values for diff display */
  currentFieldValues?: CurrentFieldValues;
}

/**
 * Product Drafts Tab - Non-AI Draft Review
 *
 * [DRAFT-FIELD-COVERAGE-1-FIXUP-1] Thin wrapper around AssetDraftsTab.
 * Delegates all implementation to AssetDraftsTab with assetType="products".
 * Preserved for backward compatibility with existing imports.
 *
 * Displays pending drafts for the product with inline edit capability.
 * Fetches drafts on mount (standard conditional tab behavior).
 * [DRAFT-DIFF-CLARITY-1] Shows Current (live) vs Draft (staged) diff for each item.
 */
export function ProductDraftsTab({ projectId, productId, currentFieldValues }: ProductDraftsTabProps) {
  return (
    <AssetDraftsTab
      projectId={projectId}
      assetType="products"
      assetId={productId}
      currentFieldValues={currentFieldValues}
    />
  );
}

export default ProductDraftsTab;
