/**
 * Media & Accessibility Types and Interfaces for MEDIA-1
 *
 * This module defines the MEDIA pillar model, including:
 * - Alt text classification (missing, generic, good)
 * - Media accessibility status and scoring
 * - Per-product and project-level media stats
 * - Fix flow types for image alt text and captions
 *
 * DESIGN PRINCIPLES:
 * - Alt text quality directly impacts accessibility and AI/image discovery
 * - Missing alt text is penalized more severely than generic alt text
 * - No heavy CV/vision pipeline; alt text generation uses product metadata only
 * - Generated alt text must not hallucinate content not visible in images
 */

/**
 * Alt text quality classification.
 * - 'missing': No alt text or only whitespace
 * - 'generic': Overly generic or repeats product name without describing the image
 * - 'good': Descriptive, image-specific alt text reflecting visible content
 */
export type MediaAltTextQuality = 'missing' | 'generic' | 'good';

/**
 * Media accessibility status classification.
 */
export type MediaAccessibilityStatus = 'Strong' | 'Needs improvement' | 'Weak';

/**
 * Per-product media statistics.
 */
export interface ProductMediaStats {
  /** Product ID */
  productId: string;
  /** Total number of images */
  totalImages: number;
  /** Count of images with any alt text (non-empty) */
  imagesWithAnyAlt: number;
  /** Count of images with good (descriptive) alt text */
  imagesWithGoodAlt: number;
  /** Count of images with generic alt text */
  imagesWithGenericAlt: number;
  /** Count of images without alt text */
  imagesWithoutAlt: number;
  /** Count of images with captions */
  imagesWithCaptions: number;
  /** Alt text coverage percentage (any alt present, 0-100) */
  altTextCoveragePercent: number;
  /** Good alt text coverage percentage (good alt only, 0-100) */
  goodAltTextCoveragePercent: number;
  /** True when at least one image has a caption or clearly contextual alt */
  hasContextualMedia: boolean;
}

/**
 * Project-level media accessibility scorecard.
 */
export interface MediaAccessibilityScorecard {
  /** Project ID */
  projectId: string;
  /** Overall media score (0-100); missing alt text penalizes more than generic */
  overallScore: number;
  /** Status classification */
  status: MediaAccessibilityStatus;
  /** Total images across all products */
  totalImages: number;
  /** Count of images with any alt text */
  imagesWithAnyAlt: number;
  /** Count of images with good alt text */
  imagesWithGoodAlt: number;
  /** Count of images with generic alt text */
  imagesWithGenericAlt: number;
  /** Count of images without alt text */
  imagesWithoutAlt: number;
  /** Number of products with at least one missing alt text */
  productsWithMissingAlt: number;
  /** Number of products with at least one generic alt text */
  productsWithGenericAlt: number;
  /** When the scorecard was computed (ISO timestamp) */
  computedAt: string;
}

/**
 * Media fix draft type.
 */
export type MediaFixDraftType = 'image_alt_text' | 'image_caption';

/**
 * Human-readable labels for media fix draft types.
 */
export const MEDIA_FIX_DRAFT_LABELS: Record<MediaFixDraftType, string> = {
  image_alt_text: 'Image Alt Text',
  image_caption: 'Image Caption',
};

/**
 * Media fix apply target.
 */
export type MediaFixApplyTarget = 'IMAGE_ALT' | 'CAPTION_FIELD';

/**
 * Media fix draft structure (draft-first pattern).
 */
export interface MediaFixDraft {
  /** Draft ID */
  id: string;
  /** Product ID */
  productId: string;
  /** Image ID or stable image key (Shopify image ID) */
  imageId: string;
  /** Type of draft content */
  draftType: MediaFixDraftType;
  /** Draft payload */
  draftPayload: {
    /** Proposed alt text */
    altText?: string;
    /** Proposed caption */
    caption?: string;
  };
  /** Deterministic key for CACHE/REUSE v2 */
  aiWorkKey: string;
  /** If reused, the original work key */
  reusedFromWorkKey?: string;
  /** Whether AI was actually called to generate this draft */
  generatedWithAi: boolean;
  /** When the draft was generated (ISO timestamp) */
  generatedAt: string;
  /** When the draft expires (optional TTL, ISO timestamp) */
  expiresAt?: string;
}

/**
 * Media fix preview request payload.
 */
export interface MediaFixPreviewRequest {
  /** Image ID or stable image key */
  imageId: string;
  /** Desired draft type */
  draftType: MediaFixDraftType;
}

/**
 * Media fix preview response.
 */
export interface MediaFixPreviewResponse {
  /** The generated or reused draft */
  draft: MediaFixDraft;
  /** Whether AI was called (false if reused) */
  generatedWithAi: boolean;
  /** AI usage metrics if AI was called */
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

/**
 * Media fix apply request payload.
 */
export interface MediaFixApplyRequest {
  /** Draft ID to apply */
  draftId: string;
  /** Where to apply the fix */
  applyTarget: MediaFixApplyTarget;
}

/**
 * Media fix apply response.
 */
export interface MediaFixApplyResponse {
  /** Whether the apply was successful */
  success: boolean;
  /** Updated per-product media stats */
  updatedStats: ProductMediaStats;
  /** Whether related issues are resolved */
  issuesResolved: boolean;
  /** Number of issues resolved */
  issuesResolvedCount: number;
}

/**
 * Project-level media accessibility response (for API).
 */
export interface ProjectMediaAccessibilityResponse {
  /** Project ID */
  projectId: string;
  /** Media accessibility scorecard */
  scorecard: MediaAccessibilityScorecard;
  /** Per-product media statistics */
  stats: ProductMediaStats[];
  /** Open fix drafts for this project */
  openDrafts?: MediaFixDraft[];
}

/**
 * Per-image view for frontend display.
 */
export interface ProductImageView {
  /** Image ID (Shopify image ID or internal ID) */
  id: string;
  /** Image URL */
  src: string;
  /** Current alt text (may be null) */
  altText: string | null;
  /** Alt text quality classification */
  altTextQuality: MediaAltTextQuality;
  /** Image position (display order) */
  position?: number;
  /** Caption if available */
  caption?: string | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Classify alt text quality.
 *
 * @param altText - The alt text to classify (may be null/undefined)
 * @param productTitle - The product title for comparison
 * @returns MediaAltTextQuality classification
 *
 * Returns 'missing' when alt text is empty/whitespace/null.
 * Returns 'generic' when alt text is extremely generic (e.g., "product image", "image", "photo")
 *   or exactly equals the product title without descriptors.
 * Returns 'good' otherwise.
 */
export function classifyAltText(
  altText: string | null | undefined,
  productTitle: string
): MediaAltTextQuality {
  // Missing: null, undefined, empty, or whitespace-only
  if (!altText || altText.trim() === '') {
    return 'missing';
  }

  const normalizedAlt = altText.trim().toLowerCase();
  const normalizedTitle = productTitle.trim().toLowerCase();

  // Generic patterns
  const genericPatterns = [
    'product image',
    'product photo',
    'product picture',
    'image',
    'photo',
    'picture',
    'untitled',
    'no alt text',
    'alt text',
    'placeholder',
    'img',
    'pic',
  ];

  // Check for exact generic matches
  if (genericPatterns.includes(normalizedAlt)) {
    return 'generic';
  }

  // Check if alt text exactly equals the product title (no additional description)
  if (normalizedAlt === normalizedTitle) {
    return 'generic';
  }

  // Check for patterns like "Product Title image" or "Image of Product Title"
  if (
    normalizedAlt === `${normalizedTitle} image` ||
    normalizedAlt === `${normalizedTitle} photo` ||
    normalizedAlt === `${normalizedTitle} picture` ||
    normalizedAlt === `image of ${normalizedTitle}` ||
    normalizedAlt === `photo of ${normalizedTitle}` ||
    normalizedAlt === `picture of ${normalizedTitle}`
  ) {
    return 'generic';
  }

  // Check for very short alt text that's likely not descriptive
  if (normalizedAlt.length < 5) {
    return 'generic';
  }

  // Otherwise, consider it good
  return 'good';
}

/**
 * Get media accessibility status from score.
 *
 * @param score - The media score (0-100)
 * @returns MediaAccessibilityStatus
 *
 * < 40 → 'Weak'
 * 40-79 → 'Needs improvement'
 * >= 80 → 'Strong'
 */
export function getMediaAccessibilityStatusFromScore(
  score: number
): MediaAccessibilityStatus {
  if (score >= 80) return 'Strong';
  if (score >= 40) return 'Needs improvement';
  return 'Weak';
}

/**
 * Compute project-level media scorecard from per-product stats.
 *
 * Uses a weighted coverage model where:
 * - Good alt text contributes full credit (100%)
 * - Generic alt text contributes partial credit (40%)
 * - Missing alt text contributes zero credit (0%)
 *
 * Missing alt text hurts the score more than generic alt text.
 *
 * @param projectId - The project ID
 * @param stats - Array of per-product media statistics
 * @returns MediaAccessibilityScorecard
 */
export function computeMediaScoreFromStats(
  projectId: string,
  stats: ProductMediaStats[]
): MediaAccessibilityScorecard {
  let totalImages = 0;
  let imagesWithAnyAlt = 0;
  let imagesWithGoodAlt = 0;
  let imagesWithGenericAlt = 0;
  let imagesWithoutAlt = 0;
  let productsWithMissingAlt = 0;
  let productsWithGenericAlt = 0;

  for (const stat of stats) {
    totalImages += stat.totalImages;
    imagesWithAnyAlt += stat.imagesWithAnyAlt;
    imagesWithGoodAlt += stat.imagesWithGoodAlt;
    imagesWithGenericAlt += stat.imagesWithGenericAlt;
    imagesWithoutAlt += stat.imagesWithoutAlt;

    if (stat.imagesWithoutAlt > 0) {
      productsWithMissingAlt++;
    }
    if (stat.imagesWithGenericAlt > 0) {
      productsWithGenericAlt++;
    }
  }

  // Calculate weighted score
  // Good alt = 100% credit, Generic alt = 40% credit, Missing = 0% credit
  let overallScore = 0;
  if (totalImages > 0) {
    const goodCredit = imagesWithGoodAlt * 1.0;
    const genericCredit = imagesWithGenericAlt * 0.4;
    const missingCredit = imagesWithoutAlt * 0.0;
    const totalCredit = goodCredit + genericCredit + missingCredit;
    overallScore = Math.round((totalCredit / totalImages) * 100);
  }

  const status = getMediaAccessibilityStatusFromScore(overallScore);

  return {
    projectId,
    overallScore,
    status,
    totalImages,
    imagesWithAnyAlt,
    imagesWithGoodAlt,
    imagesWithGenericAlt,
    imagesWithoutAlt,
    productsWithMissingAlt,
    productsWithGenericAlt,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Compute deterministic work key for media fix draft.
 *
 * @param projectId - Project ID
 * @param productId - Product ID
 * @param imageKey - Image ID or stable key
 * @param draftType - Type of draft (image_alt_text or image_caption)
 * @returns Deterministic work key string
 */
export function computeMediaFixWorkKey(
  projectId: string,
  productId: string,
  imageKey: string,
  draftType: MediaFixDraftType
): string {
  return `media-fix:${projectId}:${productId}:${imageKey}:${draftType}`;
}
