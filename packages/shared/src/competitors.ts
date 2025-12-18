/**
 * Competitive Positioning Types and Interfaces for COMPETITORS-1
 *
 * This module defines the competitive gap taxonomy, competitor model,
 * coverage structures, and fix flow types for the Competitive Positioning pillar.
 *
 * ETHICAL BOUNDARIES (Critical):
 * - No raw competitor text is ever stored or exposed in this model.
 * - The model describes areas of coverage and positioning, not scraped content.
 * - Coverage analysis uses "industry baseline" assumptions, not actual competitor data.
 * - All generated content uses only merchant's product data and generic category patterns.
 */

import type { SearchIntentType } from './search-intent';

/**
 * Competitive gap types distinguishing different categories of gaps.
 */
export type CompetitorGapType =
  | 'intent_gap'           // Missing/weak intent coverage that competitors likely have
  | 'content_section_gap'  // Missing comparison section, buying guide, etc.
  | 'trust_signal_gap';    // Missing trust FAQ, reviews section, guarantees

/**
 * Human-readable labels for gap types.
 */
export const COMPETITOR_GAP_LABELS: Record<CompetitorGapType, string> = {
  intent_gap: 'Intent Gap',
  content_section_gap: 'Content Section Gap',
  trust_signal_gap: 'Trust Signal Gap',
};

/**
 * Coverage area identifiers for competitive analysis.
 */
export type CompetitiveCoverageAreaId =
  // Intent-based areas (reusing SearchIntentType)
  | 'transactional_intent'
  | 'comparative_intent'
  | 'problem_use_case_intent'
  | 'trust_validation_intent'
  | 'informational_intent'
  // Content section areas
  | 'comparison_section'
  | 'why_choose_section'
  | 'buying_guide_section'
  | 'feature_benefits_section'
  // Trust signal areas
  | 'faq_coverage'
  | 'reviews_section'
  | 'guarantee_section';

/**
 * Competitor reference for a product.
 * Stores only metadata, no scraped content.
 */
export interface ProductCompetitorRef {
  /** Stable competitor identifier */
  id: string;
  /** Display name for UI */
  displayName: string;
  /** Optional logo URL (merchant-provided) */
  logoUrl?: string;
  /** Optional homepage URL (for reference only) */
  homepageUrl?: string;
  /** Source of this competitor reference */
  source: 'heuristic_collection' | 'heuristic_category' | 'merchant_configured';
}

/**
 * Coverage status for a single area.
 */
export interface CompetitiveCoverageArea {
  /** Area identifier */
  areaId: CompetitiveCoverageAreaId;
  /** Gap type classification */
  gapType: CompetitorGapType;
  /** Intent type if this is an intent-based area */
  intentType?: SearchIntentType;
  /** Whether the merchant covers this area */
  merchantCovers: boolean;
  /** Whether at least one competitor is expected to cover it */
  oneCompetitorCovers: boolean;
  /** Whether 2+ competitors are expected to cover it */
  twoOrMoreCompetitorsCovers: boolean;
  /** Severity weight based on intent importance and competitor coverage */
  severityWeight: number;
  /** Human-readable description of the gap */
  gapDescription?: string;
  /** Example scenario for the gap */
  exampleScenario?: string;
}

/**
 * Per-product competitive coverage data.
 */
export interface ProductCompetitiveCoverage {
  /** Product ID */
  productId: string;
  /** Configured competitors (up to 3) */
  competitors: ProductCompetitorRef[];
  /** Coverage areas with merchant vs competitor analysis */
  coverageAreas: CompetitiveCoverageArea[];
  /** Overall Competitive Coverage Score (0-100) */
  overallScore: number;
  /** Count of areas where competitors lead */
  areasWhereCompetitorsLead: number;
  /** Status classification */
  status: 'Ahead' | 'On par' | 'Behind';
  /** When this coverage was computed */
  computedAt: string;
}

/**
 * Project-level competitive scorecard.
 */
export interface CompetitiveScorecard {
  /** Overall weighted coverage score (0-100) */
  overallScore: number;
  /** Per-gap-type breakdown */
  gapBreakdown: {
    gapType: CompetitorGapType;
    label: string;
    productsWithGaps: number;
    averageScore: number;
  }[];
  /** Count of products behind on high-impact areas */
  productsBehind: number;
  /** Count of products on par */
  productsOnPar: number;
  /** Count of products ahead */
  productsAhead: number;
  /** Overall status classification */
  status: 'Ahead' | 'On par' | 'Behind';
  /** Total products analyzed */
  totalProducts: number;
  /** When the scorecard was computed */
  computedAt: string;
}

/**
 * Competitive fix gap structure for issues.
 */
export interface CompetitiveFixGap {
  /** Unique gap identifier */
  id: string;
  /** Product ID */
  productId: string;
  /** Gap type */
  gapType: CompetitorGapType;
  /** Intent type for intent gaps */
  intentType?: SearchIntentType;
  /** Coverage area identifier */
  areaId: CompetitiveCoverageAreaId;
  /** Example scenario describing the gap */
  exampleScenario: string;
  /** Why this gap matters for discovery/conversion */
  whyItMatters: string;
  /** Number of competitors expected to cover this area (1-3) */
  competitorCount: number;
  /** Recommended action */
  recommendedAction: 'answer_block' | 'comparison_section' | 'description_expansion' | 'faq_section';
  /** Severity (calculated from competitor count and intent importance) */
  severity: 'critical' | 'warning' | 'info';
  /** Whether an automated fix is available */
  automationAvailable: boolean;
}

/**
 * Draft types for competitive fixes.
 */
export type CompetitiveFixDraftType =
  | 'answer_block'       // Q&A positioning content
  | 'comparison_copy'    // "Why choose this product vs others" text
  | 'positioning_section'; // "Why choose this product" section content

/**
 * Competitive fix draft structure (draft-first pattern).
 */
export interface CompetitiveFixDraft {
  /** Draft ID */
  id: string;
  /** Product ID */
  productId: string;
  /** Gap type being addressed */
  gapType: CompetitorGapType;
  /** Intent type for intent gaps */
  intentType?: SearchIntentType;
  /** Coverage area identifier */
  areaId: CompetitiveCoverageAreaId;
  /** Type of fix content */
  draftType: CompetitiveFixDraftType;
  /** Draft payload (no competitor text) */
  draftPayload: {
    /** For answer_block: the question text */
    question?: string;
    /** For answer_block: the answer text */
    answer?: string;
    /** For comparison_copy: the comparison text */
    comparisonText?: string;
    /** For positioning_section: the section content */
    positioningContent?: string;
    /** Suggested placement guidance */
    placementGuidance?: string;
  };
  /** Deterministic key for CACHE/REUSE v2 */
  aiWorkKey: string;
  /** If reused, the original work key */
  reusedFromWorkKey?: string;
  /** Whether AI was actually called to generate this draft */
  generatedWithAi: boolean;
  /** When the draft was generated */
  generatedAt: string;
  /** When the draft expires (optional TTL) */
  expiresAt?: string;
}

/**
 * Apply target for competitive fixes.
 */
export type CompetitiveFixApplyTarget =
  | 'ANSWER_BLOCK'
  | 'CONTENT_SECTION'
  | 'WHY_CHOOSE_SECTION';

/**
 * Request payload for previewing a competitive fix.
 */
export interface CompetitiveFixPreviewRequest {
  /** Gap type to address */
  gapType: CompetitorGapType;
  /** Intent type for intent gaps */
  intentType?: SearchIntentType;
  /** Coverage area identifier */
  areaId: CompetitiveCoverageAreaId;
  /** Type of fix to generate */
  draftType: CompetitiveFixDraftType;
}

/**
 * Response from preview endpoint.
 */
export interface CompetitiveFixPreviewResponse {
  /** The generated or reused draft */
  draft: CompetitiveFixDraft;
  /** Whether AI was called (false if reused) */
  generatedWithAi: boolean;
  /** AI usage metrics if AI was called */
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

/**
 * Request payload for applying a competitive fix.
 */
export interface CompetitiveFixApplyRequest {
  /** Draft ID to apply */
  draftId: string;
  /** Where to apply the fix */
  applyTarget: CompetitiveFixApplyTarget;
}

/**
 * Response from apply endpoint.
 */
export interface CompetitiveFixApplyResponse {
  /** Whether the apply was successful */
  success: boolean;
  /** Updated coverage for the product */
  updatedCoverage: ProductCompetitiveCoverage;
  /** Whether related issues were resolved */
  issuesResolved: boolean;
  /** Number of issues resolved */
  issuesResolvedCount: number;
}

/**
 * Per-product competitive data response (for API).
 */
export interface ProductCompetitiveResponse {
  /** Product ID */
  productId: string;
  /** Configured competitors */
  competitors: ProductCompetitorRef[];
  /** Coverage data */
  coverage: ProductCompetitiveCoverage;
  /** Gaps needing attention */
  gaps: CompetitiveFixGap[];
  /** Open fix drafts for this product */
  openDrafts: CompetitiveFixDraft[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get competitive status from score.
 */
export function getCompetitiveStatusFromScore(
  score: number
): 'Ahead' | 'On par' | 'Behind' {
  if (score >= 70) return 'Ahead';
  if (score >= 40) return 'On par';
  return 'Behind';
}

/**
 * Calculate severity based on competitor count and intent importance.
 */
export function calculateCompetitiveSeverity(
  competitorCount: number,
  intentType?: SearchIntentType
): 'critical' | 'warning' | 'info' {
  const isHighValueIntent =
    intentType === 'transactional' || intentType === 'comparative';

  if (competitorCount >= 2 && isHighValueIntent) {
    return 'critical';
  }
  if (competitorCount >= 2 || isHighValueIntent) {
    return 'warning';
  }
  return 'info';
}

/**
 * Compute deterministic work key for competitive fix draft.
 */
export function computeCompetitiveFixWorkKey(
  projectId: string,
  productId: string,
  gapType: CompetitorGapType,
  areaId: CompetitiveCoverageAreaId,
  draftType: CompetitiveFixDraftType,
  intentType?: SearchIntentType
): string {
  const intentPart = intentType ? `:${intentType}` : '';
  return `competitive-fix:${projectId}:${productId}:${gapType}:${areaId}${intentPart}:${draftType}`;
}

/**
 * Map coverage area to gap type.
 */
export function getGapTypeForArea(areaId: CompetitiveCoverageAreaId): CompetitorGapType {
  if (areaId.endsWith('_intent')) {
    return 'intent_gap';
  }
  if (areaId.endsWith('_section')) {
    return 'content_section_gap';
  }
  return 'trust_signal_gap';
}

/**
 * Get intent type from coverage area ID if applicable.
 */
export function getIntentTypeFromAreaId(
  areaId: CompetitiveCoverageAreaId
): SearchIntentType | undefined {
  const mapping: Partial<Record<CompetitiveCoverageAreaId, SearchIntentType>> = {
    transactional_intent: 'transactional',
    comparative_intent: 'comparative',
    problem_use_case_intent: 'problem_use_case',
    trust_validation_intent: 'trust_validation',
    informational_intent: 'informational',
  };
  return mapping[areaId];
}
