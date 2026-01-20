/**
 * Off-site Signals Types and Interfaces for OFFSITE-1
 *
 * This is a local copy of the off-site signals from @engineo/shared to work around
 * Next.js module resolution issues with monorepo workspace packages.
 */

/**
 * Off-site signal type taxonomy.
 * Describes the categories of off-site trust signals.
 */
export type OffsiteSignalType =
  | 'brand_mention' // Brand referenced in articles, blogs, news
  | 'authoritative_listing' // Presence in industry directories, marketplaces
  | 'trust_proof' // Reviews, testimonials, certifications
  | 'reference_content'; // Guides, comparisons, studies that cite the brand

/**
 * Human-readable labels for off-site signal types.
 */
export const OFFSITE_SIGNAL_LABELS: Record<OffsiteSignalType, string> = {
  brand_mention: 'Brand Mention',
  authoritative_listing: 'Authoritative Listing',
  trust_proof: 'Trust Proof',
  reference_content: 'Reference Content',
};

/**
 * Descriptions for each signal type.
 */
export const OFFSITE_SIGNAL_DESCRIPTIONS: Record<OffsiteSignalType, string> = {
  brand_mention: 'Articles, blogs, or news that mention your brand',
  authoritative_listing:
    'Presence in industry directories, marketplaces, or app stores',
  trust_proof: 'Third-party reviews, testimonials, or certifications',
  reference_content: 'Guides, comparisons, or studies that cite your brand',
};

/**
 * Importance weights per signal type (out of 10).
 * Higher weights mean more impact on overall presence score.
 */
export const OFFSITE_SIGNAL_WEIGHTS: Record<OffsiteSignalType, number> = {
  trust_proof: 10, // Reviews and certifications are highest value
  authoritative_listing: 9, // Directory presence is highly valuable
  brand_mention: 7, // Brand mentions build awareness
  reference_content: 6, // Reference content supports authority
};

/**
 * Off-site signal types in priority order (highest impact first).
 */
export const OFFSITE_SIGNAL_TYPES: OffsiteSignalType[] = [
  'trust_proof',
  'authoritative_listing',
  'brand_mention',
  'reference_content',
];

/**
 * A single detected or configured off-site signal for a project.
 */
export interface ProjectOffsiteSignal {
  /** Stable ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Signal type */
  signalType: OffsiteSignalType;
  /** Source name (e.g., "Trustpilot", "Industry directory", "Tech blog") */
  sourceName: string;
  /** URL (optional, may be absent for "no signals detected" cases) */
  url?: string;
  /** Evidence description (short text the UI can show to explain what this is) */
  evidence: string;
  /** Is this an explicitly merchant-provided reference */
  merchantProvided: boolean;
  /** Is this a "known platform" entry (Google Business, Shopify app store, key directories) */
  knownPlatform: boolean;
  /** When this signal was created */
  createdAt: string;
  /** When this signal was last updated */
  updatedAt: string;
}

/**
 * Off-site presence status classification.
 */
export type OffsitePresenceStatus = 'Low' | 'Medium' | 'Strong';

/**
 * Project-level off-site coverage/scorecard.
 */
export interface ProjectOffsiteCoverage {
  /** Project ID */
  projectId: string;
  /** Overall Off-site Presence Score (0-100) */
  overallScore: number;
  /** Status classification */
  status: OffsitePresenceStatus;
  /** Counts per signal type (present signals) */
  signalCounts: Record<OffsiteSignalType, number>;
  /** Count of "high-impact authority gaps" (e.g., missing trust proof on known platforms) */
  highImpactGaps: number;
  /** Total signals detected */
  totalSignals: number;
  /** When the coverage was computed */
  computedAt: string;
}

/**
 * Off-site gap type enumeration reflecting the issue taxonomy.
 */
export type OffsiteGapType =
  | 'missing_brand_mentions' // No brand mentions signals exist
  | 'missing_trust_proof' // No review/testimonial/certification signals
  | 'missing_authoritative_listing' // Key directories or marketplaces are empty
  | 'competitor_has_offsite_signal'; // Competitors assumed to have this class of signal

/**
 * Human-readable labels for gap types.
 */
export const OFFSITE_GAP_LABELS: Record<OffsiteGapType, string> = {
  missing_brand_mentions: 'Missing Brand Mentions',
  missing_trust_proof: 'Missing Trust Proof',
  missing_authoritative_listing: 'Missing Authoritative Listing',
  competitor_has_offsite_signal: 'Competitors Have This Signal',
};

/**
 * Off-site gap structure aligned with issues and fixes.
 */
export interface OffsiteGap {
  /** Unique gap identifier */
  id: string;
  /** Gap type */
  gapType: OffsiteGapType;
  /** Signal type this gap relates to */
  signalType: OffsiteSignalType;
  /** Optional: how many competitors are assumed to have this class of signal */
  competitorCount?: number;
  /** Human-readable example (e.g., "No third-party reviews detected") */
  example: string;
  /** Recommended action (e.g., "Add reviews", "Pitch a comparison guide") */
  recommendedAction: string;
  /** Severity based on signal importance */
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Off-site fix draft types.
 */
export type OffsiteFixDraftType =
  | 'outreach_email' // Email template for outreach
  | 'pr_pitch' // PR pitch paragraphs
  | 'brand_profile_snippet' // Brand profile / About text
  | 'review_request_copy'; // Polite review solicitation copy

/**
 * Human-readable labels for draft types.
 */
export const OFFSITE_FIX_DRAFT_LABELS: Record<OffsiteFixDraftType, string> = {
  outreach_email: 'Outreach Email',
  pr_pitch: 'PR Pitch',
  brand_profile_snippet: 'Brand Profile Snippet',
  review_request_copy: 'Review Request Copy',
};

/**
 * Apply target for off-site fixes.
 */
export type OffsiteFixApplyTarget =
  | 'NOTES' // Save to notes for later use
  | 'CONTENT_WORKSPACE' // Create content snippet for About/FAQ pages
  | 'OUTREACH_DRAFTS'; // Save to outreach drafts queue

/**
 * Off-site fix draft structure (draft-first pattern).
 */
export interface OffsiteFixDraft {
  /** Draft ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Optional product ID if scoped to product-level */
  productId?: string;
  /** Gap type being addressed */
  gapType: OffsiteGapType;
  /** Signal type this draft addresses */
  signalType: OffsiteSignalType;
  /** Focus key identifying the opportunity (e.g., "reviews/trustpilot", "comparison_directory") */
  focusKey: string;
  /** Type of draft content */
  draftType: OffsiteFixDraftType;
  /** Draft payload */
  draftPayload: {
    /** For outreach/PR: email subject */
    subject?: string;
    /** For outreach/PR: body text */
    body?: string;
    /** For brand profile: summary text */
    summary?: string;
    /** For brand profile: key bullets */
    bullets?: string[];
    /** For review request: message text */
    message?: string;
    /** For review request: channel hint (email, onsite) */
    channel?: string;
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
 * Project-level off-site signals response (for API).
 */
export interface ProjectOffsiteSignalsResponse {
  /** Project ID */
  projectId: string;
  /** Current project-level signals list (by type) */
  signals: ProjectOffsiteSignal[];
  /** Off-site coverage scorecard */
  coverage: ProjectOffsiteCoverage;
  /** Derived list of off-site gaps */
  gaps: OffsiteGap[];
  /** Open fix drafts for this project */
  openDrafts: OffsiteFixDraft[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get presence status from score.
 */
export function getOffsitePresenceStatusFromScore(
  score: number
): OffsitePresenceStatus {
  if (score >= 70) return 'Strong';
  if (score >= 40) return 'Medium';
  return 'Low';
}

/**
 * Calculate severity based on signal type and gap type.
 */
export function calculateOffsiteSeverity(
  signalType: OffsiteSignalType,
  gapType: OffsiteGapType
): 'critical' | 'warning' | 'info' {
  const weight = OFFSITE_SIGNAL_WEIGHTS[signalType];

  // Trust proof and authoritative listing gaps are high severity
  if (weight >= 9) {
    return 'critical';
  }

  // Competitor-based gaps are higher severity
  if (gapType === 'competitor_has_offsite_signal') {
    return weight >= 7 ? 'warning' : 'info';
  }

  // Brand mentions and reference content are medium
  if (weight >= 7) {
    return 'warning';
  }

  return 'info';
}

/**
 * Compute deterministic work key for off-site fix draft.
 */
export function computeOffsiteFixWorkKey(
  projectId: string,
  gapType: OffsiteGapType,
  signalType: OffsiteSignalType,
  focusKey: string,
  draftType: OffsiteFixDraftType
): string {
  return `offsite-fix:${projectId}:${gapType}:${signalType}:${focusKey}:${draftType}`;
}

/**
 * Get gap type for missing signal type.
 */
export function getGapTypeForMissingSignal(
  signalType: OffsiteSignalType
): OffsiteGapType {
  const mapping: Record<OffsiteSignalType, OffsiteGapType> = {
    brand_mention: 'missing_brand_mentions',
    authoritative_listing: 'missing_authoritative_listing',
    trust_proof: 'missing_trust_proof',
    reference_content: 'missing_brand_mentions', // Group with brand mentions
  };
  return mapping[signalType];
}
