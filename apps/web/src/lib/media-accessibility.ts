/**
 * Media & Accessibility Types for Frontend (MEDIA-1)
 *
 * This file mirrors packages/shared/src/media-accessibility.ts
 * to avoid monorepo import complications with the Next.js web app.
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
  productId: string;
  totalImages: number;
  imagesWithAnyAlt: number;
  imagesWithGoodAlt: number;
  imagesWithGenericAlt: number;
  imagesWithoutAlt: number;
  imagesWithCaptions: number;
  altTextCoveragePercent: number;
  goodAltTextCoveragePercent: number;
  hasContextualMedia: boolean;
}

/**
 * Project-level media accessibility scorecard.
 */
export interface MediaAccessibilityScorecard {
  projectId: string;
  overallScore: number;
  status: MediaAccessibilityStatus;
  totalImages: number;
  imagesWithAnyAlt: number;
  imagesWithGoodAlt: number;
  imagesWithGenericAlt: number;
  imagesWithoutAlt: number;
  productsWithMissingAlt: number;
  productsWithGenericAlt: number;
  computedAt: string;
}

/**
 * Media fix draft type.
 */
export type MediaFixDraftType = 'image_alt_text' | 'image_caption';

/**
 * Media fix apply target.
 */
export type MediaFixApplyTarget = 'IMAGE_ALT' | 'CAPTION_FIELD';

/**
 * Media fix draft structure.
 */
export interface MediaFixDraft {
  id: string;
  productId: string;
  imageId: string;
  draftType: MediaFixDraftType;
  draftPayload: {
    altText?: string;
    caption?: string;
  };
  aiWorkKey: string;
  reusedFromWorkKey?: string;
  generatedWithAi: boolean;
  generatedAt: string;
  expiresAt?: string;
}

/**
 * Media fix preview request payload.
 */
export interface MediaFixPreviewRequest {
  imageId: string;
  draftType: MediaFixDraftType;
}

/**
 * Media fix preview response.
 */
export interface MediaFixPreviewResponse {
  draft: MediaFixDraft;
  generatedWithAi: boolean;
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

/**
 * Media fix apply request payload.
 */
export interface MediaFixApplyRequest {
  draftId: string;
  applyTarget: MediaFixApplyTarget;
}

/**
 * Media fix apply response.
 */
export interface MediaFixApplyResponse {
  success: boolean;
  updatedStats: ProductMediaStats;
  issuesResolved: boolean;
  issuesResolvedCount: number;
}

/**
 * Project-level media accessibility response (for API).
 */
export interface ProjectMediaAccessibilityResponse {
  projectId: string;
  scorecard: MediaAccessibilityScorecard;
  stats: ProductMediaStats[];
  openDrafts?: MediaFixDraft[];
}

/**
 * Per-image view for frontend display.
 */
export interface ProductImageView {
  id: string;
  src: string;
  altText: string | null;
  altTextQuality: MediaAltTextQuality;
  position?: number;
  caption?: string | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get media accessibility status from score.
 */
export function getMediaAccessibilityStatusFromScore(
  score: number
): MediaAccessibilityStatus {
  if (score >= 80) return 'Strong';
  if (score >= 40) return 'Needs improvement';
  return 'Weak';
}

/**
 * Get status color class for media accessibility status.
 */
export function getMediaStatusColorClass(
  status: MediaAccessibilityStatus
): string {
  switch (status) {
    case 'Strong':
      return 'text-green-600 bg-green-100';
    case 'Needs improvement':
      return 'text-yellow-600 bg-yellow-100';
    case 'Weak':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get alt text quality badge color class.
 */
export function getAltTextQualityColorClass(
  quality: MediaAltTextQuality
): string {
  switch (quality) {
    case 'good':
      return 'text-green-600 bg-green-100';
    case 'generic':
      return 'text-yellow-600 bg-yellow-100';
    case 'missing':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get human-readable label for alt text quality.
 */
export function getAltTextQualityLabel(quality: MediaAltTextQuality): string {
  switch (quality) {
    case 'good':
      return 'Good';
    case 'generic':
      return 'Generic';
    case 'missing':
      return 'Missing';
    default:
      return 'Unknown';
  }
}
