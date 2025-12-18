/**
 * Search Intent Types and Interfaces for SEARCH-INTENT-1
 *
 * This module defines the canonical intent taxonomy, query templates,
 * coverage models, and fix flow types for the Search & Intent pillar.
 */

/**
 * Canonical search intent types in priority order.
 * Transactional and comparative intents are weighted higher
 * because they have stronger purchase intent signals.
 */
export type SearchIntentType =
  | 'informational'
  | 'comparative'
  | 'transactional'
  | 'problem_use_case'
  | 'trust_validation';

/**
 * Intent types in priority order (highest first).
 * Used for scoring and display ordering.
 */
export const SEARCH_INTENT_TYPES: SearchIntentType[] = [
  'transactional',
  'comparative',
  'problem_use_case',
  'trust_validation',
  'informational',
];

/**
 * Importance weights per intent type (out of 10).
 * Higher weights mean more impact on overall coverage score.
 */
export const SEARCH_INTENT_WEIGHTS: Record<SearchIntentType, number> = {
  transactional: 10,
  comparative: 9,
  problem_use_case: 7,
  trust_validation: 6,
  informational: 5,
};

/**
 * Human-readable labels for intent types.
 */
export const SEARCH_INTENT_LABELS: Record<SearchIntentType, string> = {
  transactional: 'Transactional',
  comparative: 'Comparative',
  problem_use_case: 'Problem / Use Case',
  trust_validation: 'Trust / Validation',
  informational: 'Informational',
};

/**
 * Coverage status for intent analysis.
 */
export type IntentCoverageStatus = 'none' | 'weak' | 'partial' | 'covered';

/**
 * Query template structure for generating expected queries.
 */
export interface SearchIntentQueryTemplate {
  /** Stable template identifier */
  id: string;
  /** Human-readable template name */
  label: string;
  /** Intent type this template belongs to */
  intentType: SearchIntentType;
  /** Query pattern with tokens like {{title}}, {{type}}, {{tags}} */
  pattern: string;
  /** Available tokens in this pattern */
  tokens: string[];
  /** Optional product type filters (e.g., only apply to 'snowboard' products) */
  categoryFilters?: string[];
  /** Importance weight 1-10 (higher = more important) */
  importanceWeight: number;
  /** Whether this is a high-value template (transactional/comparative) */
  isHighValue: boolean;
}

/**
 * Default intent query templates covering all intent types.
 * These are applied to products to determine expected queries.
 */
export const DEFAULT_INTENT_TEMPLATES: SearchIntentQueryTemplate[] = [
  // Transactional (high value)
  {
    id: 'buy_product',
    label: 'Buy Product',
    intentType: 'transactional',
    pattern: 'buy {{title}}',
    tokens: ['title'],
    importanceWeight: 10,
    isHighValue: true,
  },
  {
    id: 'product_price',
    label: 'Product Price',
    intentType: 'transactional',
    pattern: '{{title}} price',
    tokens: ['title'],
    importanceWeight: 9,
    isHighValue: true,
  },
  {
    id: 'order_product',
    label: 'Order Product',
    intentType: 'transactional',
    pattern: 'order {{title}}',
    tokens: ['title'],
    importanceWeight: 8,
    isHighValue: true,
  },
  {
    id: 'product_discount',
    label: 'Product Discount',
    intentType: 'transactional',
    pattern: '{{title}} discount',
    tokens: ['title'],
    importanceWeight: 7,
    isHighValue: true,
  },

  // Comparative (high value)
  {
    id: 'product_vs',
    label: 'Product vs Alternative',
    intentType: 'comparative',
    pattern: '{{title}} vs',
    tokens: ['title'],
    importanceWeight: 9,
    isHighValue: true,
  },
  {
    id: 'best_type_for',
    label: 'Best Type For',
    intentType: 'comparative',
    pattern: 'best {{type}} for',
    tokens: ['type'],
    importanceWeight: 8,
    isHighValue: true,
  },
  {
    id: 'product_alternatives',
    label: 'Product Alternatives',
    intentType: 'comparative',
    pattern: '{{title}} alternatives',
    tokens: ['title'],
    importanceWeight: 7,
    isHighValue: true,
  },
  {
    id: 'product_or_alternative',
    label: 'Product or Alternative',
    intentType: 'comparative',
    pattern: '{{title}} or',
    tokens: ['title'],
    importanceWeight: 6,
    isHighValue: true,
  },

  // Problem/Use Case
  {
    id: 'product_for_beginners',
    label: 'Product for Beginners',
    intentType: 'problem_use_case',
    pattern: '{{title}} for beginners',
    tokens: ['title'],
    importanceWeight: 7,
    isHighValue: false,
  },
  {
    id: 'product_for_use_case',
    label: 'Product for Use Case',
    intentType: 'problem_use_case',
    pattern: '{{type}} for {{tags}}',
    tokens: ['type', 'tags'],
    importanceWeight: 6,
    isHighValue: false,
  },
  {
    id: 'how_to_use_product',
    label: 'How to Use Product',
    intentType: 'problem_use_case',
    pattern: 'how to use {{title}}',
    tokens: ['title'],
    importanceWeight: 6,
    isHighValue: false,
  },

  // Trust/Validation
  {
    id: 'product_reviews',
    label: 'Product Reviews',
    intentType: 'trust_validation',
    pattern: '{{title}} reviews',
    tokens: ['title'],
    importanceWeight: 7,
    isHighValue: false,
  },
  {
    id: 'is_product_good',
    label: 'Is Product Good',
    intentType: 'trust_validation',
    pattern: 'is {{title}} good',
    tokens: ['title'],
    importanceWeight: 6,
    isHighValue: false,
  },
  {
    id: 'product_worth_it',
    label: 'Product Worth It',
    intentType: 'trust_validation',
    pattern: '{{title}} worth it',
    tokens: ['title'],
    importanceWeight: 5,
    isHighValue: false,
  },

  // Informational
  {
    id: 'what_is_product',
    label: 'What Is Product',
    intentType: 'informational',
    pattern: 'what is {{title}}',
    tokens: ['title'],
    importanceWeight: 6,
    isHighValue: false,
  },
  {
    id: 'how_product_works',
    label: 'How Product Works',
    intentType: 'informational',
    pattern: 'how {{title}} works',
    tokens: ['title'],
    importanceWeight: 5,
    isHighValue: false,
  },
  {
    id: 'product_explained',
    label: 'Product Explained',
    intentType: 'informational',
    pattern: '{{title}} explained',
    tokens: ['title'],
    importanceWeight: 4,
    isHighValue: false,
  },
];

/**
 * Per-product intent coverage data.
 */
export interface ProductIntentCoverage {
  /** Product ID */
  productId: string;
  /** Intent type this coverage is for */
  intentType: SearchIntentType;
  /** Coverage score 0-100 */
  score: number;
  /** Coverage status classification */
  coverageStatus: IntentCoverageStatus;
  /** Queries with no coverage */
  missingQueries: string[];
  /** Queries with weak coverage */
  weakQueries: string[];
  /** Queries with strong coverage */
  coveredQueries: string[];
  /** All expected queries for this intent type */
  expectedQueries: string[];
  /** When this coverage was computed */
  computedAt: string;
}

/**
 * Project-level search intent scorecard.
 */
export interface SearchIntentScorecard {
  /** Overall weighted coverage score 0-100 */
  overallScore: number;
  /** Per-intent-type breakdown */
  intentBreakdown: {
    intentType: SearchIntentType;
    label: string;
    score: number;
    status: IntentCoverageStatus;
    productsWithGaps: number;
  }[];
  /** Count of products missing high-value (transactional/comparative) intents */
  missingHighValueIntents: number;
  /** Overall status classification */
  status: 'Good' | 'Needs improvement';
  /** Total products analyzed */
  totalProducts: number;
  /** When the scorecard was computed */
  computedAt: string;
}

/**
 * Fix draft types for intent coverage gaps.
 */
export type IntentFixDraftType =
  | 'answer_block'
  | 'content_snippet'
  | 'metadata_guidance';

/**
 * Intent fix draft structure.
 */
export interface IntentFixDraft {
  /** Draft ID */
  id: string;
  /** Product ID this draft is for */
  productId: string;
  /** Intent type being addressed */
  intentType: SearchIntentType;
  /** Specific query this draft addresses */
  query: string;
  /** Type of fix being proposed */
  draftType: IntentFixDraftType;
  /** Draft payload (Answer Block structure or text content) */
  draftPayload: {
    /** For answer_block: the question text */
    question?: string;
    /** For answer_block: the answer text */
    answer?: string;
    /** For content_snippet: the snippet text */
    snippet?: string;
    /** For metadata_guidance: suggestions */
    titleSuggestion?: string;
    descriptionSuggestion?: string;
  };
  /** Deterministic key for cache/reuse */
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
 * Apply target for intent fixes.
 */
export type IntentFixApplyTarget = 'ANSWER_BLOCK' | 'CONTENT_SNIPPET_SECTION';

/**
 * Request payload for previewing an intent fix.
 */
export interface IntentFixPreviewRequest {
  /** Intent type to address */
  intentType: SearchIntentType;
  /** Specific query to address */
  query: string;
  /** Type of fix to generate */
  fixType: IntentFixDraftType;
}

/**
 * Response from preview endpoint.
 */
export interface IntentFixPreviewResponse {
  /** The generated or reused draft */
  draft: IntentFixDraft;
  /** Whether AI was called (false if reused) */
  generatedWithAi: boolean;
  /** AI usage metrics if AI was called */
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

/**
 * Request payload for applying an intent fix.
 */
export interface IntentFixApplyRequest {
  /** Draft ID to apply */
  draftId: string;
  /** Where to apply the fix */
  applyTarget: IntentFixApplyTarget;
}

/**
 * Response from apply endpoint.
 */
export interface IntentFixApplyResponse {
  /** Whether the apply was successful */
  success: boolean;
  /** Updated coverage for the product */
  updatedCoverage: ProductIntentCoverage[];
  /** Whether related issues were resolved */
  issuesResolved: boolean;
  /** Number of issues resolved */
  issuesResolvedCount: number;
}

/**
 * Per-product search intent data response (for API).
 */
export interface ProductSearchIntentResponse {
  /** Product ID */
  productId: string;
  /** Coverage per intent type */
  coverage: ProductIntentCoverage[];
  /** Product-level scorecard */
  scorecard: {
    overallScore: number;
    status: 'Good' | 'Needs improvement';
    missingHighValueIntents: number;
  };
  /** Open fix drafts for this product */
  openDrafts: IntentFixDraft[];
}

/**
 * Helper to check if an intent type is high-value.
 */
export function isHighValueIntent(intentType: SearchIntentType): boolean {
  return intentType === 'transactional' || intentType === 'comparative';
}

/**
 * Helper to get coverage status from score.
 */
export function getCoverageStatusFromScore(
  score: number
): IntentCoverageStatus {
  if (score >= 80) return 'covered';
  if (score >= 50) return 'partial';
  if (score >= 20) return 'weak';
  return 'none';
}

/**
 * Helper to compute deterministic AI work key for cache/reuse.
 */
export function computeIntentFixWorkKey(
  projectId: string,
  productId: string,
  intentType: SearchIntentType,
  query: string,
  fixType: IntentFixDraftType
): string {
  // Simple deterministic key - in production would use proper hashing
  return `intent-fix:${projectId}:${productId}:${intentType}:${query}:${fixType}`;
}
