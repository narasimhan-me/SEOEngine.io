import type { DeoPillarId } from './deo-pillars';
import type { SearchIntentType, IntentCoverageStatus } from './search-intent';
import type { CompetitorGapType, CompetitiveCoverageAreaId } from './competitors';
import type { OffsiteSignalType, OffsiteGapType } from './offsite-signals';
import type { PerformanceSignalType } from './performance-signals';
import type {
  LocalApplicabilityStatus,
  LocalApplicabilityReason,
  LocalSignalType,
  LocalGapType,
} from './local-discovery';
import type { GeoIssueType, GeoReadinessSignalType, GeoPillarContext } from './geo';

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
   * Used to keep tabs/tiles/list counts consistent without UI recomputation.
   */
  assetTypeCounts?: IssueAssetTypeCounts;

  /**
   * COUNT-INTEGRITY-1: Derived, role-aware actionability for the current viewer.
   * True only when an in-app destination exists and should be treated as actionable.
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
   * For Local Discovery pillar issues: the applicability status.
   * Issues are only generated when status is 'applicable'.
   */
  localApplicabilityStatus?: LocalApplicabilityStatus;

  /**
   * For Local Discovery pillar issues: reasons why local is applicable.
   * Helps users understand why they're seeing local-related issues.
   */
  localApplicabilityReasons?: LocalApplicabilityReason[];

  /**
   * For Local Discovery pillar issues: the type of local signal
   * this issue relates to (location_presence, local_intent_coverage, etc.).
   */
  localSignalType?: LocalSignalType;

  /**
   * For Local Discovery pillar issues: the type of local gap.
   * Distinguishes missing local intent, location content, service area, trust signals.
   */
  localGapType?: LocalGapType;

  // === Media & Accessibility Pillar fields (MEDIA-1) ===

  /**
   * For Media & Accessibility pillar issues: the number of images affected.
   * Represents how many images are impacted across affected products.
   */
  imageCountAffected?: number;

  // === GEO (GEO-FOUNDATION-1) optional fields ===
  geoIssueType?: GeoIssueType;
  geoSignalType?: GeoReadinessSignalType;
  geoPillarContext?: GeoPillarContext;
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
  byPillar: Record<DeoPillarId, {
    detected: CanonicalCountTriplet;
    actionable: CanonicalCountTriplet;
  }>;

  // Breakdown by severity (for severity filter badges)
  bySeverity: Record<DeoIssueSeverity, {
    detected: CanonicalCountTriplet;
    actionable: CanonicalCountTriplet;
  }>;
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
    byPillar: Record<DeoPillarId, {
      detected: CanonicalCountTriplet;
      actionable: CanonicalCountTriplet;
    }>;
    bySeverity: Record<DeoIssueSeverity, {
      detected: CanonicalCountTriplet;
      actionable: CanonicalCountTriplet;
    }>;
  };
}
