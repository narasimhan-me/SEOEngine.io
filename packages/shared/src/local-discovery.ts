/**
 * Local Discovery Types and Interfaces for LOCAL-1
 *
 * This module defines the local discovery taxonomy, applicability models,
 * coverage types, and fix flow types for the Local Discovery pillar.
 *
 * IMPORTANT BOUNDARIES:
 * - Local discovery ONLY applies to stores where local presence is relevant
 * - Non-local/global stores receive NO penalty and see "Not Applicable" status
 * - No GMB management, map rank tracking, or multi-location/franchise tooling
 * - No geo-rank promises or external location API integrations in v1
 */

/**
 * Local applicability status - determines whether local discovery pillar applies.
 */
export type LocalApplicabilityStatus =
  | 'applicable'
  | 'not_applicable'
  | 'unknown';

/**
 * Reasons why local discovery is applicable or not.
 */
export type LocalApplicabilityReason =
  | 'merchant_declared_physical_presence'
  | 'local_intent_product_category'
  | 'content_mentions_regions'
  | 'manual_override_enabled'
  | 'no_local_indicators'
  | 'global_only_config';

/**
 * Local signal type taxonomy.
 * Describes the categories of local discovery signals.
 */
export type LocalSignalType =
  | 'location_presence' // Physical location / address / contact info
  | 'local_intent_coverage' // Coverage of local search intents ("near me", city-specific)
  | 'local_trust_signals' // Local reviews, testimonials, certifications
  | 'local_schema_readiness'; // Organization/location schema hints

/**
 * Human-readable labels for local signal types.
 */
export const LOCAL_SIGNAL_LABELS: Record<LocalSignalType, string> = {
  location_presence: 'Location Presence',
  local_intent_coverage: 'Local Intent Coverage',
  local_trust_signals: 'Local Trust Signals',
  local_schema_readiness: 'Local Schema Readiness',
};

/**
 * Descriptions for each local signal type.
 */
export const LOCAL_SIGNAL_DESCRIPTIONS: Record<LocalSignalType, string> = {
  location_presence:
    'Physical address, contact information, and store location details',
  local_intent_coverage:
    'Coverage of local search queries like "near me" or city-specific terms',
  local_trust_signals:
    'Local reviews, testimonials, and community presence indicators',
  local_schema_readiness:
    'Structured data for location and organization information',
};

/**
 * Importance weights per local signal type (out of 10).
 */
export const LOCAL_SIGNAL_WEIGHTS: Record<LocalSignalType, number> = {
  location_presence: 10, // Physical presence is critical for local
  local_intent_coverage: 9, // Local intent queries are high value
  local_trust_signals: 7, // Local trust builds community credibility
  local_schema_readiness: 6, // Schema helps discovery engines understand location
};

/**
 * Local signal types in priority order (highest impact first).
 */
export const LOCAL_SIGNAL_TYPES: LocalSignalType[] = [
  'location_presence',
  'local_intent_coverage',
  'local_trust_signals',
  'local_schema_readiness',
];

/**
 * A detected local signal for a project.
 */
export interface LocalSignal {
  /** Stable ID */
  id: string;
  /** Signal type */
  signalType: LocalSignalType;
  /** Human-readable label */
  label: string;
  /** Description of the signal */
  description: string;
  /** Optional URL where signal was detected */
  url?: string;
  /** Optional evidence text */
  evidence?: string;
}

/**
 * Local coverage status classification.
 */
export type LocalCoverageStatus = 'strong' | 'needs_improvement' | 'weak';

/**
 * Project-level local discovery scorecard.
 */
export interface LocalDiscoveryScorecard {
  /** Project ID */
  projectId: string;
  /** Whether local discovery applies to this project */
  applicabilityStatus: LocalApplicabilityStatus;
  /** Reasons for applicability determination */
  applicabilityReasons: LocalApplicabilityReason[];
  /** Local Discovery Score (0-100); only when applicable */
  score?: number;
  /** Coverage status; only when applicable */
  status?: LocalCoverageStatus;
  /** Counts per signal type (present signals) */
  signalCounts: Record<LocalSignalType, number>;
  /** Count of missing high-impact local signals */
  missingLocalSignalsCount: number;
  /** When the scorecard was computed */
  computedAt: string;
}

/**
 * Local gap type enumeration reflecting the issue taxonomy.
 */
export type LocalGapType =
  | 'missing_local_intent_coverage' // No coverage for local search intents
  | 'missing_location_content' // No location/city/service area content
  | 'unclear_service_area' // Physical presence implied but not described
  | 'missing_local_trust_signal'; // No local reviews/testimonials/certifications

/**
 * Human-readable labels for local gap types.
 */
export const LOCAL_GAP_LABELS: Record<LocalGapType, string> = {
  missing_local_intent_coverage: 'Missing Local Intent Coverage',
  missing_location_content: 'Missing Location Content',
  unclear_service_area: 'Unclear Service Area',
  missing_local_trust_signal: 'Missing Local Trust Signal',
};

/**
 * Local gap structure aligned with issues and fixes.
 */
export interface LocalGap {
  /** Unique gap identifier */
  id: string;
  /** Gap type */
  gapType: LocalGapType;
  /** Signal type this gap relates to */
  signalType: LocalSignalType;
  /** Applicability reasons that made this gap relevant */
  applicabilityReasons: LocalApplicabilityReason[];
  /** Human-readable example description */
  example: string;
  /** Recommended action */
  recommendedAction: string;
  /** Severity based on signal importance */
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Local fix draft types.
 */
export type LocalFixDraftType =
  | 'local_answer_block' // Q&A for local queries
  | 'city_section' // City/region landing section
  | 'service_area_description'; // Service area description

/**
 * Human-readable labels for draft types.
 */
export const LOCAL_FIX_DRAFT_LABELS: Record<LocalFixDraftType, string> = {
  local_answer_block: 'Local Answer Block',
  city_section: 'City/Region Section',
  service_area_description: 'Service Area Description',
};

/**
 * Apply target for local fixes.
 */
export type LocalFixApplyTarget =
  | 'ANSWER_BLOCK' // Create as Answer Block
  | 'CONTENT_SECTION'; // Add to content workspace

/**
 * Local fix draft structure (draft-first pattern).
 */
export interface LocalFixDraft {
  /** Draft ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Optional product ID if scoped to product-level */
  productId?: string;
  /** Gap type being addressed */
  gapType: LocalGapType;
  /** Signal type this draft addresses */
  signalType: LocalSignalType;
  /** Focus key (e.g., "city:denver", "service_area:front_range") */
  focusKey: string;
  /** Type of draft content */
  draftType: LocalFixDraftType;
  /** Draft payload */
  draftPayload: {
    /** For Answer Blocks: question text */
    question?: string;
    /** For Answer Blocks: answer text */
    answer?: string;
    /** For city sections: heading */
    heading?: string;
    /** For city sections: body text */
    body?: string;
    /** For service area: summary text */
    summary?: string;
    /** For service area: bullet points */
    bullets?: string[];
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
 * Local fix preview request payload.
 */
export interface LocalFixPreviewRequest {
  /** Gap type to address */
  gapType: LocalGapType;
  /** Signal type */
  signalType: LocalSignalType;
  /** Focus key (e.g., "city:denver") */
  focusKey: string;
  /** Desired draft type */
  draftType: LocalFixDraftType;
  /** Optional product ID for product-specific fixes */
  productId?: string;
}

/**
 * Local fix preview response.
 */
export interface LocalFixPreviewResponse {
  /** The generated or reused draft */
  draft: LocalFixDraft;
  /** Whether AI was called (false if reused) */
  generatedWithAi: boolean;
  /** AI usage metrics if AI was called */
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

/**
 * Local fix apply request payload.
 */
export interface LocalFixApplyRequest {
  /** Draft ID to apply */
  draftId: string;
  /** Where to apply the fix */
  applyTarget: LocalFixApplyTarget;
}

/**
 * Local fix apply response.
 */
export interface LocalFixApplyResponse {
  /** Whether the apply was successful */
  success: boolean;
  /** Updated scorecard */
  updatedScorecard: LocalDiscoveryScorecard;
  /** Whether related issues are resolved */
  issuesResolved: boolean;
  /** Number of issues affected */
  issuesAffectedCount: number;
}

/**
 * Project-level local discovery response (for API).
 */
export interface ProjectLocalDiscoveryResponse {
  /** Project ID */
  projectId: string;
  /** Local discovery scorecard */
  scorecard: LocalDiscoveryScorecard;
  /** Detected local signals */
  signals: LocalSignal[];
  /** Current local gaps */
  gaps: LocalGap[];
  /** Open fix drafts */
  openDrafts: LocalFixDraft[];
}

/**
 * Project local config for merchant-declared settings.
 */
export interface ProjectLocalConfig {
  /** Whether the project has a physical location */
  hasPhysicalLocation?: boolean;
  /** Service area description */
  serviceAreaDescription?: string;
  /** Manual override to enable local discovery */
  enabled?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine if local discovery is applicable based on reasons.
 */
export function isLocalApplicableFromReasons(
  reasons: LocalApplicabilityReason[]
): boolean {
  const applicableReasons: LocalApplicabilityReason[] = [
    'merchant_declared_physical_presence',
    'local_intent_product_category',
    'content_mentions_regions',
    'manual_override_enabled',
  ];

  return reasons.some((reason) => applicableReasons.includes(reason));
}

/**
 * Get local coverage status from score.
 */
export function getLocalCoverageStatusFromScore(
  score: number
): LocalCoverageStatus {
  if (score >= 70) return 'strong';
  if (score >= 40) return 'needs_improvement';
  return 'weak';
}

/**
 * Calculate severity based on signal type and gap type.
 */
export function calculateLocalSeverity(
  signalType: LocalSignalType,
  gapType: LocalGapType
): 'critical' | 'warning' | 'info' {
  const weight = LOCAL_SIGNAL_WEIGHTS[signalType];

  // Location presence and local intent gaps are high severity
  if (weight >= 9) {
    return 'critical';
  }

  // Missing location content is medium-high
  if (
    gapType === 'missing_location_content' ||
    gapType === 'unclear_service_area'
  ) {
    return 'warning';
  }

  // Trust signals and schema are lower
  if (weight >= 6) {
    return 'warning';
  }

  return 'info';
}

/**
 * Compute deterministic work key for local fix draft.
 */
export function computeLocalFixWorkKey(
  projectId: string,
  productId: string | null,
  gapType: LocalGapType,
  signalType: LocalSignalType,
  focusKey: string,
  draftType: LocalFixDraftType
): string {
  const productPart = productId || 'project';
  return `local-fix:${projectId}:${productPart}:${gapType}:${signalType}:${focusKey}:${draftType}`;
}

/**
 * Get gap type for missing signal type.
 */
export function getLocalGapTypeForMissingSignal(
  signalType: LocalSignalType
): LocalGapType {
  const mapping: Record<LocalSignalType, LocalGapType> = {
    location_presence: 'missing_location_content',
    local_intent_coverage: 'missing_local_intent_coverage',
    local_trust_signals: 'missing_local_trust_signal',
    local_schema_readiness: 'unclear_service_area', // Schema issues often relate to unclear service area
  };
  return mapping[signalType];
}
