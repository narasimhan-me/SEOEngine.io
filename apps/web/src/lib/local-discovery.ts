/**
 * Local Discovery Types for the web app (LOCAL-1)
 *
 * This is a local copy of the Local Discovery types from @engineo/shared to work around
 * Next.js module resolution issues with monorepo workspace packages.
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
  | 'location_presence'
  | 'local_intent_coverage'
  | 'local_trust_signals'
  | 'local_schema_readiness';

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
  location_presence: 10,
  local_intent_coverage: 9,
  local_trust_signals: 7,
  local_schema_readiness: 6,
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
  id: string;
  signalType: LocalSignalType;
  label: string;
  description: string;
  url?: string;
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
  projectId: string;
  applicabilityStatus: LocalApplicabilityStatus;
  applicabilityReasons: LocalApplicabilityReason[];
  score?: number;
  status?: LocalCoverageStatus;
  signalCounts: Record<LocalSignalType, number>;
  missingLocalSignalsCount: number;
  computedAt: string;
}

/**
 * Local gap type enumeration reflecting the issue taxonomy.
 */
export type LocalGapType =
  | 'missing_local_intent_coverage'
  | 'missing_location_content'
  | 'unclear_service_area'
  | 'missing_local_trust_signal';

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
  id: string;
  gapType: LocalGapType;
  signalType: LocalSignalType;
  applicabilityReasons: LocalApplicabilityReason[];
  example: string;
  recommendedAction: string;
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Local fix draft types.
 */
export type LocalFixDraftType =
  | 'local_answer_block'
  | 'city_section'
  | 'service_area_description';

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
export type LocalFixApplyTarget = 'ANSWER_BLOCK' | 'CONTENT_SECTION';

/**
 * Local fix draft structure (draft-first pattern).
 */
export interface LocalFixDraft {
  id: string;
  projectId: string;
  productId?: string;
  gapType: LocalGapType;
  signalType: LocalSignalType;
  focusKey: string;
  draftType: LocalFixDraftType;
  draftPayload: {
    question?: string;
    answer?: string;
    heading?: string;
    body?: string;
    summary?: string;
    bullets?: string[];
  };
  aiWorkKey: string;
  reusedFromWorkKey?: string;
  generatedWithAi: boolean;
  generatedAt: string;
  expiresAt?: string;
}

/**
 * Local fix preview request payload.
 */
export interface LocalFixPreviewRequest {
  gapType: LocalGapType;
  signalType: LocalSignalType;
  focusKey: string;
  draftType: LocalFixDraftType;
  productId?: string;
}

/**
 * Local fix preview response.
 */
export interface LocalFixPreviewResponse {
  draft: LocalFixDraft;
  generatedWithAi: boolean;
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

/**
 * Local fix apply request payload.
 */
export interface LocalFixApplyRequest {
  draftId: string;
  applyTarget: LocalFixApplyTarget;
}

/**
 * Local fix apply response.
 */
export interface LocalFixApplyResponse {
  success: boolean;
  updatedScorecard: LocalDiscoveryScorecard;
  issuesResolved: boolean;
  issuesAffectedCount: number;
}

/**
 * Project-level local discovery response (for API).
 */
export interface ProjectLocalDiscoveryResponse {
  projectId: string;
  scorecard: LocalDiscoveryScorecard;
  signals: LocalSignal[];
  gaps: LocalGap[];
  openDrafts: LocalFixDraft[];
}

/**
 * Project local config for merchant-declared settings.
 */
export interface ProjectLocalConfig {
  hasPhysicalLocation?: boolean;
  serviceAreaDescription?: string;
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

  if (weight >= 9) {
    return 'critical';
  }

  if (
    gapType === 'missing_location_content' ||
    gapType === 'unclear_service_area'
  ) {
    return 'warning';
  }

  if (weight >= 6) {
    return 'warning';
  }

  return 'info';
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
    local_schema_readiness: 'unclear_service_area',
  };
  return mapping[signalType];
}
