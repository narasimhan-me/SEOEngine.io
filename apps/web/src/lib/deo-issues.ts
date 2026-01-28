/**
 * DEO Issues and Score Types for the web app
 *
 * This is a local copy of the DEO issues/score types from @engineo/shared to work around
 * Next.js module resolution issues with monorepo workspace packages.
 */

import type { DeoPillarId } from './deo-pillars';

// [DRAFT-LIFECYCLE-VISIBILITY-1] Re-export draft lifecycle types for convenient access
export type {
  DraftLifecycleState,
  DraftLifecycleSignals,
  DraftLifecycleCopy,
} from './issues/draftLifecycleState';
export {
  deriveDraftLifecycleState,
  getDraftLifecycleCopy,
  checkSavedDraftInSessionStorage,
} from './issues/draftLifecycleState';

// [EA-16: ERROR-&-BLOCKED-STATE-UX-1] Re-export canonical blocked reasons
export type {
  CanonicalBlockedReasonId,
  CanonicalBlockedReason,
  BlockerCategory,
} from './issues/canonicalBlockedReasons';
export {
  CANONICAL_BLOCKED_REASONS,
  getCanonicalBlockedReason,
  getPriorityBlockedReason,
  isUserResolvable,
  getAllBlockedReasonsSorted,
} from './issues/canonicalBlockedReasons';

// [EA-27: PRIORITIZATION-SIGNAL-ENRICHMENT-1] Re-export prioritization types and helpers
export type {
  DeoIssueImpactLevel,
  PrioritizationFactor,
  IssuePriorityPreference,
} from './issues/prioritizationSignals';
export {
  deriveImpactLevel,
  getImpactLevelCopy,
  deriveConfidenceConsideration,
  derivePrioritizationFactors,
  derivePriorityRationale,
} from './issues/prioritizationSignals';

// =============================================================================
// DEO Score Types
// =============================================================================

export type DeoScoreBreakdown = {
  overall: number;
  content?: number | null;
  entities?: number | null;
  technical?: number | null;
  visibility?: number | null;
};

export type DeoScoreV2Breakdown = {
  overall: number;
  entityStrength: number;
  intentMatch: number;
  answerability: number;
  aiVisibility: number;
  contentCompleteness: number;
  technicalQuality: number;
};

export type DeoScoreSnapshot = {
  id: string;
  projectId: string;
  version: string;
  computedAt: string; // ISO timestamp
  breakdown: DeoScoreBreakdown;
  metadata?: Record<string, unknown>;
};

export type DeoScoreLatestResponse = {
  projectId: string;
  latestScore: DeoScoreBreakdown | null;
  latestSnapshot: DeoScoreSnapshot | null;
};

export type DeoScoreSignals = {
  // Content quality & coverage
  contentCoverage?: number | null;
  contentDepth?: number | null;
  contentFreshness?: number | null;
  // Entities & knowledge graph
  entityCoverage?: number | null;
  entityAccuracy?: number | null;
  entityLinkage?: number | null;
  // Technical & crawl
  crawlHealth?: number | null;
  coreWebVitals?: number | null;
  indexability?: number | null;
  // Visibility (SEO / AEO / PEO / VEO)
  serpPresence?: number | null;
  answerSurfacePresence?: number | null;
  brandNavigationalStrength?: number | null;
  // Technical detail signals
  htmlStructuralQuality?: number | null;
  thinContentQuality?: number | null;
  // Entity detail signals
  entityHintCoverage?: number | null;
  entityStructureAccuracy?: number | null;
  entityLinkageDensity?: number | null;
};

// =============================================================================
// DEO Issue Types
// =============================================================================

// Search Intent types (inline to avoid circular deps)
export type SearchIntentType =
  | 'transactional'
  | 'comparative'
  | 'problem_use_case'
  | 'trust_validation'
  | 'informational';

export type IntentCoverageStatus = 'none' | 'weak' | 'partial' | 'covered';

// Competitive types (inline to avoid circular deps)
export type CompetitorGapType =
  | 'intent_gap'
  | 'content_section_gap'
  | 'trust_signal_gap';

export type CompetitiveCoverageAreaId =
  | 'transactional_intent'
  | 'comparative_intent'
  | 'problem_use_case_intent'
  | 'trust_validation_intent'
  | 'informational_intent'
  | 'comparison_section'
  | 'why_choose_section'
  | 'buying_guide_section'
  | 'feature_benefits_section'
  | 'faq_coverage'
  | 'reviews_section'
  | 'guarantee_section';

// Offsite types (inline to avoid circular deps)
export type OffsiteSignalType =
  | 'brand_mention'
  | 'authoritative_listing'
  | 'trust_proof'
  | 'reference_content';

export type OffsiteGapType =
  | 'missing_brand_mentions'
  | 'missing_trust_proof'
  | 'missing_authoritative_listing'
  | 'competitor_has_offsite_signal';

// PERFORMANCE-1: Performance signal types (Technical & Indexability pillar)
export type PerformanceSignalType =
  | 'render_blocking'
  | 'indexability_risk'
  | 'ttfb_proxy'
  | 'page_weight_risk'
  | 'mobile_readiness';

// Local Discovery types (inline to avoid circular deps)
export type LocalApplicabilityStatus =
  | 'applicable'
  | 'not_applicable'
  | 'unknown';

export type LocalApplicabilityReason =
  | 'merchant_declared_physical_presence'
  | 'local_intent_product_category'
  | 'content_mentions_regions'
  | 'manual_override_enabled'
  | 'no_local_indicators'
  | 'global_only_config';

export type LocalSignalType =
  | 'location_presence'
  | 'local_intent_coverage'
  | 'local_trust_signals'
  | 'local_schema_readiness';

export type LocalGapType =
  | 'missing_local_intent_coverage'
  | 'missing_location_content'
  | 'unclear_service_area'
  | 'missing_local_trust_signal';

export type DeoIssueSeverity = 'critical' | 'warning' | 'info';

/** How an issue is intended to be resolved */
export type DeoIssueFixType = 'aiFix' | 'manualFix' | 'syncFix';

/**
 * Coarse UX-level hint for how an issue is addressed:
 * - 'manual': User-driven work (editing content, settings changes)
 * - 'automation': AI/sync driven (one-click fixes, automated sync)
 * - 'informational': Diagnostic only; no direct fix flow
 */
export type DeoIssueActionability = 'manual' | 'automation' | 'informational';

/**
 * Issue Engine Full category taxonomy.
 * - 'metadata': titles, descriptions, basic HTML/meta tags
 * - 'content_entity': body content, entities, product attributes
 * - 'answerability': ability of content to directly answer user/buyer questions
 * - 'technical': crawl/indexability, performance, status codes
 * - 'schema_visibility': structured data, AI visibility, schema/JSON-LD
 */
export type DeoIssueCategory =
  | 'metadata'
  | 'content_entity'
  | 'answerability'
  | 'technical'
  | 'schema_visibility';

/**
 * Fix cost/effort level for Issue Engine Full.
 * - 'one_click': can be fixed via existing AI optimize flows with minimal friction
 * - 'manual': requires user editing or Shopify/admin changes
 * - 'advanced': future structured/technical fixes
 */
export type DeoIssueFixCost = 'one_click' | 'manual' | 'advanced';

export type IssueAssetTypeKey = 'products' | 'pages' | 'collections';

export interface IssueAssetTypeCounts {
  products: number;
  pages: number;
  collections: number;
}

export interface DeoIssue {
  id: string;
  title: string;
  description: string;
  severity: DeoIssueSeverity;
  count: number;
  affectedPages?: string[];
  affectedProducts?: string[];

  /**
   * Canonical pillar assignment. Every issue must belong to exactly one DeoPillarId.
   * This determines where the issue appears in the pillar-centric UI (DEO Overview,
   * Issues Engine pillar grouping, Product details pillar tabs).
   */
  pillarId?: DeoPillarId;

  /**
   * Coarse UX-level hint for how this issue is addressed:
   * - 'manual': User-driven work (editing content, settings changes)
   * - 'automation': AI/sync driven (one-click fixes, automated sync)
   * - 'informational': Diagnostic only; no direct fix flow
   * Always set by backend builders in DEO-IA-1 and later phases.
   */
  actionability?: DeoIssueActionability;

  /**
   * COUNT-INTEGRITY-1: Canonical distribution of issue instances by asset type.
   */
  assetTypeCounts?: IssueAssetTypeCounts;

  /**
   * COUNT-INTEGRITY-1: Derived, role-aware actionability for the current viewer.
   */
  isActionableNow?: boolean;

  // === Issue Engine Lite fields (Phase UX-7) ===
  /** Stable issue type identifier (e.g., 'missing_seo_title', 'weak_description') */
  type?: string;
  /** How the issue is intended to be resolved */
  fixType?: DeoIssueFixType;
  /** Whether EngineO can offer a one-click or guided fix */
  fixReady?: boolean;
  /** The main product to highlight in the UI for Fix actions */
  primaryProductId?: string;

  // === Issue Engine Full fields (Phase UX-8 / IE-2.x) ===
  /**
   * High-level category for the issue.
   * @see DeoIssueCategory for allowed values
   */
  category?: DeoIssueCategory;

  /**
   * Optional numeric confidence score [0, 1] for the detection heuristic.
   * Left undefined for issues without clear confidence metrics.
   * To be wired up in later IE-2.x sub-phases.
   */
  confidence?: number;

  /**
   * Optional key mapping this issue to a DEO Score component.
   * Allowed values: 'content_quality', 'entity_strength', 'technical_health',
   * 'visibility_signals', 'answerability'.
   * To be wired up in later IE-2.x sub-phases.
   */
  deoComponentKey?: string;

  /**
   * Optional coarse-grained impact estimate (0–100) representing how much
   * this issue may affect the overall DEO Score or a component.
   * To be wired up in later IE-2.x sub-phases.
   */
  deoImpactEstimate?: number;

  /**
   * Short human-readable explanation of why this issue matters for DEO/AI visibility.
   * Distinct from the plain description if useful.
   */
  whyItMatters?: string;

  /**
   * Short human-readable summary of the recommended next action/fix.
   */
  recommendedFix?: string;

  /**
   * Whether this particular issue instance can be fixed via a one-click
   * or guided AI workflow.
   */
  aiFixable?: boolean;

  /**
   * Coarse effort level for fixing this issue.
   * @see DeoIssueFixCost for allowed values
   */
  fixCost?: DeoIssueFixCost;

  /**
   * Optional list of issue IDs that should be resolved first.
   * To be wired up in later IE-2.x sub-phases.
   */
  dependencies?: string[];

  // === Search & Intent Pillar fields (SEARCH-INTENT-1) ===

  /**
   * For Search & Intent pillar issues: the specific intent type
   * this issue relates to (transactional, comparative, etc.).
   */
  intentType?: SearchIntentType;

  /**
   * Example queries that illustrate the missing or weak intent coverage.
   * Helps users understand what search queries are not being addressed.
   */
  exampleQueries?: string[];

  /**
   * Current coverage status for the intent (none/weak/partial/covered).
   * Used to communicate severity and progress.
   */
  coverageStatus?: IntentCoverageStatus;

  /**
   * Short, actionable recommendation for fixing this intent gap.
   * Examples: "Add Answer Block", "Expand product description", "Add comparison section"
   */
  recommendedAction?: string;

  // === Competitive Positioning Pillar fields (COMPETITORS-1) ===

  /**
   * For Competitive Positioning pillar issues: the type of competitive gap.
   * Distinguishes intent gaps, content section gaps, and trust signal gaps.
   */
  gapType?: CompetitorGapType;

  /**
   * Number of competitors expected to cover this area (1-3).
   * Higher count indicates more competitive pressure and higher severity.
   */
  competitorCount?: number;

  /**
   * Coverage area identifier for competitive gaps.
   * Links to specific area being analyzed (e.g., 'comparison_section', 'transactional_intent').
   */
  competitiveAreaId?: CompetitiveCoverageAreaId;

  // === Off-site Signals Pillar fields (OFFSITE-1) ===

  /**
   * For Off-site Signals pillar issues: the type of off-site signal
   * this issue relates to (brand_mention, trust_proof, etc.).
   * For Performance for Discovery issues (PERFORMANCE-1): the performance
   * signal this issue relates to (render_blocking, page_weight_risk, etc.).
   */
  signalType?: OffsiteSignalType | PerformanceSignalType;

  /**
   * For Off-site Signals pillar issues: the type of off-site gap.
   * Distinguishes missing brand mentions, missing trust proof, etc.
   */
  offsiteGapType?: OffsiteGapType;

  // === Local Discovery Pillar fields (LOCAL-1) ===

  /**
   * For Local Discovery pillar issues: whether local discovery applies to this project.
   * Non-applicable projects receive no local issues (no penalty for global stores).
   */
  localApplicabilityStatus?: LocalApplicabilityStatus;

  /**
   * Reasons why local discovery is applicable or not.
   */
  localApplicabilityReasons?: LocalApplicabilityReason[];

  /**
   * For Local Discovery pillar issues: the type of local signal
   * this issue relates to (location_presence, local_intent_coverage, etc.).
   */
  localSignalType?: LocalSignalType;

  /**
   * For Local Discovery pillar issues: the type of local gap.
   * Distinguishes missing location content, unclear service area, etc.
   */
  localGapType?: LocalGapType;

  // === Media & Accessibility Pillar fields (MEDIA-1) ===

  /**
   * For Media & Accessibility pillar issues: the number of images affected.
   * Represents how many images are impacted across affected products.
   */
  imageCountAffected?: number;
}

export interface DeoIssuesResponse {
  projectId: string;
  generatedAt: string; // ISO timestamp
  issues: DeoIssue[];
}

/**
 * COUNT-INTEGRITY-1 (legacy v1 groups/instances): Bucket with detected/actionable groups and instances.
 * Groups = issue types aggregated across assets (issue rows)
 * Instances = (issueType + assetId) occurrences
 */
export interface IssueCountsBucket {
  detectedGroups: number;
  actionableGroups: number;
  detectedInstances: number;
  actionableInstances: number;
}

/**
 * COUNT-INTEGRITY-1 (legacy v1 groups/instances): Single source of truth for issue counts across the product.
 * "Groups" = issue types aggregated across assets (issue rows)
 * "Instances" = (issueType + assetId) occurrences
 */
export interface IssueCountsSummary {
  projectId: string;
  generatedAt: string; // ISO timestamp
  detectedTotal: number;
  actionableTotal: number;
  detectedGroupsTotal: number;
  actionableGroupsTotal: number;
  byPillar: Record<DeoPillarId, IssueCountsBucket>;
  bySeverity: Record<DeoIssueSeverity, IssueCountsBucket>;
  byAssetType: Record<IssueAssetTypeKey, IssueCountsBucket>;
  byIssueType: Record<string, IssueCountsBucket>;
}

/**
 * COUNT-INTEGRITY-1.1: Canonical triplet count contract with explicit labeled semantics.
 * All three counts MUST be displayed with their explicit labels in UI:
 * - issueTypesCount → "Issue types" or "N issue types"
 * - affectedItemsCount → "Items affected" or "N items affected"
 * - actionableNowCount → "Actionable now" or "N actionable now"
 */
export interface CanonicalCountTriplet {
  issueTypesCount: number;
  affectedItemsCount: number;
  actionableNowCount: number;
}

/**
 * COUNT-INTEGRITY-1.1: Canonical summary response with triplet counts for detected/actionable modes.
 * Replaces mixed v1 "groups/instances" semantics with explicit UX-labeled counts.
 * Backend computes deduped unique assets; UI displays only (no client-side recomputation).
 */
export interface CanonicalIssueCountsSummary {
  projectId: string;
  generatedAt: string; // ISO timestamp

  // Echoed filters for cache key validation
  filters?: {
    actionKey?: string;
    actionKeys?: string[];
    scopeType?: IssueAssetTypeKey;
    pillar?: DeoPillarId;
    pillars?: DeoPillarId[];
    severity?: DeoIssueSeverity;
  };

  // Triplet counts for detected mode (all issues including informational)
  detected: CanonicalCountTriplet;

  // Triplet counts for actionable mode (only isActionableNow=true issues)
  actionable: CanonicalCountTriplet;

  // Breakdown by pillar (for pillar filter badges)
  byPillar: Record<
    DeoPillarId,
    {
      detected: CanonicalCountTriplet;
      actionable: CanonicalCountTriplet;
    }
  >;

  // Breakdown by severity (for severity filter badges)
  bySeverity: Record<
    DeoIssueSeverity,
    {
      detected: CanonicalCountTriplet;
      actionable: CanonicalCountTriplet;
    }
  >;
}

/**
 * COUNT-INTEGRITY-1.1: Response for asset-specific issues endpoint.
 * Returns filtered issue list + canonical triplet summary for a specific asset.
 * Used by asset detail pages (products, pages, collections).
 */
export interface AssetIssuesResponse {
  projectId: string;
  assetType: IssueAssetTypeKey;
  assetId: string;
  generatedAt: string; // ISO timestamp

  // Filtered issue list (respects pillar/severity/actionability filters)
  issues: DeoIssue[];

  // Canonical triplet summary for this asset's issues
  summary: {
    detected: CanonicalCountTriplet;
    actionable: CanonicalCountTriplet;
    byPillar: Record<
      DeoPillarId,
      {
        detected: CanonicalCountTriplet;
        actionable: CanonicalCountTriplet;
      }
    >;
    bySeverity: Record<
      DeoIssueSeverity,
      {
        detected: CanonicalCountTriplet;
        actionable: CanonicalCountTriplet;
      }
    >;
  };
}
