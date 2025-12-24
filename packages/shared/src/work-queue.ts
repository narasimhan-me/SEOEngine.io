/**
 * WORK-QUEUE-1: Unified Action Bundle Work Queue Types
 *
 * Authoritative contract for the Work Queue system.
 * All bundles are derived at request time from existing persisted artifacts.
 * No new WorkQueue storage tables are introduced.
 */

// =============================================================================
// Core Enums
// =============================================================================

/**
 * Bundle type discriminator.
 * Determines derivation source and available actions.
 */
export type WorkQueueBundleType =
  | 'ASSET_OPTIMIZATION'     // Issue-derived bundles (from DeoIssuesService)
  | 'AUTOMATION_RUN'         // Playbook-derived bundles (from AutomationPlaybooksService)
  | 'GEO_EXPORT';            // GEO export/share bundle (from GeoReportsService)

/**
 * Recommended action keys map to specific fix workflows.
 * Verb-first labels for clarity.
 */
export type WorkQueueRecommendedActionKey =
  | 'FIX_MISSING_METADATA'       // Missing SEO titles/descriptions
  | 'RESOLVE_TECHNICAL_ISSUES'   // Technical/indexability issues
  | 'IMPROVE_SEARCH_INTENT'      // Search intent fit gaps
  | 'OPTIMIZE_CONTENT'           // Content/commerce signal improvements
  | 'SHARE_LINK_GOVERNANCE';     // GEO export share link management

/**
 * Health status derived from underlying issue severity.
 */
export type WorkQueueHealth =
  | 'CRITICAL'        // Requires immediate attention (critical severity)
  | 'NEEDS_ATTENTION' // Should be addressed (warning severity)
  | 'HEALTHY';        // No action needed (info severity, typically omitted)

/**
 * Bundle state machine.
 * Derived from underlying artifact states.
 */
export type WorkQueueState =
  | 'NEW'              // No action taken yet
  | 'PREVIEWED'        // Preview generated (partial draft)
  | 'DRAFTS_READY'     // Full drafts generated, ready for apply
  | 'PENDING_APPROVAL' // Awaiting approval (governance-gated)
  | 'APPROVED'         // Approved, ready to apply
  | 'APPLIED'          // Successfully applied (Applied Recently tab)
  | 'FAILED'           // Draft generation failed
  | 'BLOCKED';         // Cannot proceed (expired drafts, missing requirements)

/**
 * AI usage disclosure levels.
 */
export type WorkQueueAiUsage =
  | 'NONE'        // No AI used for this action
  | 'DRAFTS_ONLY' // AI used for draft generation, apply does not use AI
  | 'FULL';       // AI used throughout (not currently used in v1)

/**
 * Scope type for affected items.
 * [ASSETS-PAGES-1] Extended to include PAGES and COLLECTIONS as first-class asset types.
 */
export type WorkQueueScopeType =
  | 'PRODUCTS'     // Affects specific products
  | 'PAGES'        // Affects Shopify pages (/pages/*)
  | 'COLLECTIONS'  // Affects Shopify collections (/collections/*)
  | 'STORE_WIDE';  // Affects the entire store/project

/**
 * Approval status for governance-gated actions.
 */
export type WorkQueueApprovalStatus =
  | 'NOT_REQUESTED' // No approval request exists
  | 'PENDING'       // Approval request pending
  | 'APPROVED'      // Approved (unconsumed)
  | 'REJECTED';     // Rejected

/**
 * Draft status for automation bundles.
 */
export type WorkQueueDraftStatus =
  | 'NONE'     // No draft exists
  | 'PARTIAL'  // Preview-only draft (sample products)
  | 'READY'    // Full draft ready for apply
  | 'FAILED'   // Draft generation failed
  | 'EXPIRED'; // Draft expired, needs regeneration

/**
 * Share link status for GEO export bundles.
 */
export type WorkQueueShareLinkStatus =
  | 'NONE'    // No share links exist
  | 'ACTIVE'  // At least one active share link
  | 'EXPIRED' // All links expired
  | 'REVOKED'; // All links revoked

// =============================================================================
// Action Bundle Schema
// =============================================================================

/**
 * Approval subschema for governance-gated bundles.
 */
export interface WorkQueueApprovalInfo {
  approvalRequired: boolean;
  approvalStatus: WorkQueueApprovalStatus;
  requestedBy?: string;       // userId who requested approval
  requestedAt?: string;       // ISO timestamp
  approvedBy?: string | null; // userId who approved (null if not approved)
  approvedAt?: string | null; // ISO timestamp (null if not approved)
}

/**
 * Draft subschema for automation bundles.
 */
export interface WorkQueueDraftInfo {
  draftStatus: WorkQueueDraftStatus;
  draftCount: number;          // Number of products with drafts
  draftCoverage: number;       // Percentage of affected products with drafts (0-100)
  lastDraftRunId?: string;     // Reference to last draft generation run
}

/**
 * GEO export specialization subschema.
 */
export interface WorkQueueGeoExportInfo {
  exportType?: string;
  mutationFreeView: true;                    // Always true - viewing doesn't trigger mutations
  shareLinkStatus: WorkQueueShareLinkStatus;
  passcodeShownOnce: true;                   // Always true - passcode is never returned after creation
}

/**
 * WORK-QUEUE-1 Action Bundle.
 *
 * The authoritative schema for Work Queue items.
 * All fields are derived at request time from existing persisted artifacts.
 */
export interface WorkQueueActionBundle {
  // --- Core identity ---
  bundleId: string;                          // Deterministic ID (e.g., `{bundleType}:{recommendedActionKey}:{scopeId}`)
  bundleType: WorkQueueBundleType;
  createdAt: string;                         // ISO timestamp (stable, from persisted artifact)
  updatedAt: string;                         // ISO timestamp (stable, from persisted artifact)

  // --- Scope ---
  scopeType: WorkQueueScopeType;
  scopeCount: number;                        // Number of affected items
  scopePreviewList: string[];                // Top 5 item names + "+N more" if applicable
  scopeQueryRef?: string;                    // Optional reference for scope resolution (e.g., scopeId)

  // --- Health + priority ---
  health: WorkQueueHealth;
  impactRank: number;                        // Lower = higher priority (for sorting)

  // --- Recommended action ---
  recommendedActionKey: WorkQueueRecommendedActionKey;
  recommendedActionLabel: string;            // Verb-first label (e.g., "Fix missing metadata")

  // --- AI disclosure ---
  aiUsage: WorkQueueAiUsage;
  aiDisclosureText: string;                  // Exact copy for UI display

  // --- State machine ---
  state: WorkQueueState;

  // --- Approval subschema (when applicable) ---
  approval?: WorkQueueApprovalInfo;

  // --- Draft subschema (when applicable) ---
  draft?: WorkQueueDraftInfo;

  // --- GEO export specialization (when bundleType = GEO_EXPORT) ---
  geoExport?: WorkQueueGeoExportInfo;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Work Queue tab filter values.
 */
export type WorkQueueTab =
  | 'Critical'
  | 'NeedsAttention'
  | 'PendingApproval'
  | 'DraftsReady'
  | 'AppliedRecently';

/**
 * Query parameters for GET /projects/:id/work-queue.
 * [ASSETS-PAGES-1] Added scopeType filter for filtering by asset type.
 */
export interface WorkQueueQueryParams {
  tab?: WorkQueueTab;
  bundleType?: WorkQueueBundleType;
  actionKey?: WorkQueueRecommendedActionKey;
  scopeType?: WorkQueueScopeType;
  bundleId?: string;
}

/**
 * Role capabilities for the current viewer.
 */
export interface WorkQueueViewerCapabilities {
  canGenerateDrafts: boolean;
  canApply: boolean;
  canApprove: boolean;
  canRequestApproval: boolean;
}

/**
 * Viewer context included in response.
 */
export interface WorkQueueViewer {
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  capabilities: WorkQueueViewerCapabilities;
  isMultiUserProject: boolean;
}

/**
 * GET /projects/:id/work-queue response shape.
 */
export interface WorkQueueResponse {
  viewer?: WorkQueueViewer;                  // Included for role-aware UI
  items: WorkQueueActionBundle[];
}

// =============================================================================
// Asset-Scoped Automation Playbook Types (ASSETS-PAGES-1.1)
// =============================================================================

/**
 * Asset type for asset-scoped automation playbooks.
 * Determines which asset table to query and how to resolve scopeAssetRefs.
 *
 * [ASSETS-PAGES-1.1] Canonical playbook IDs (missing_seo_title, missing_seo_description)
 * work across all asset types. The assetType parameter determines which assets to target.
 */
export type AutomationAssetType = 'PRODUCTS' | 'PAGES' | 'COLLECTIONS';

/**
 * Asset reference format for non-product assets.
 * Uses handle-based refs to avoid exposing internal IDs.
 *
 * Format: `{type}_handle:{handle}`
 * Examples:
 *   - `page_handle:about-us`
 *   - `collection_handle:summer-sale`
 *
 * Handle-only resolution: Apply is handle-based with no URL/title fallback lookups.
 * Unaddressable items (no handle) are deterministically blocked.
 */
export type AssetRef = string;

/**
 * Parse an asset reference into its components.
 * Returns null if the format is invalid.
 */
export function parseAssetRef(ref: AssetRef): { type: 'page' | 'collection'; handle: string } | null {
  const pageMatch = ref.match(/^page_handle:(.+)$/);
  if (pageMatch) {
    return { type: 'page', handle: pageMatch[1] };
  }
  const collectionMatch = ref.match(/^collection_handle:(.+)$/);
  if (collectionMatch) {
    return { type: 'collection', handle: collectionMatch[1] };
  }
  return null;
}

/**
 * Create an asset reference from type and handle.
 */
export function createAssetRef(type: 'page' | 'collection', handle: string): AssetRef {
  return `${type}_handle:${handle}`;
}

/**
 * Validate that asset references match the expected asset type.
 */
export function validateAssetRefsForType(
  assetType: AutomationAssetType,
  refs: AssetRef[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (assetType === 'PRODUCTS') {
    // Products use scopeProductIds, not scopeAssetRefs
    if (refs.length > 0) {
      errors.push('Products should use scopeProductIds, not scopeAssetRefs');
    }
    return { valid: errors.length === 0, errors };
  }

  const expectedPrefix = assetType === 'PAGES' ? 'page_handle:' : 'collection_handle:';

  for (const ref of refs) {
    if (!ref.startsWith(expectedPrefix)) {
      errors.push(`Invalid ref "${ref}" for assetType ${assetType}. Expected prefix "${expectedPrefix}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * [ASSETS-PAGES-1.1] Get the applicable asset type from assetType parameter.
 * Used to resolve which asset table to query for a given playbook run.
 *
 * CANONICAL INVARIANT: Only two playbook IDs exist: missing_seo_title, missing_seo_description.
 * Asset type differentiation is done via the assetType parameter, NOT via playbook ID variants.
 */
export function getPlaybookAssetType(assetType?: AutomationAssetType): AutomationAssetType {
  return assetType ?? 'PRODUCTS';
}

/**
 * Map of playbook IDs to the asset types they support.
 * Both canonical playbooks support all asset types.
 */
export const PLAYBOOK_ASSET_TYPES: Record<string, AutomationAssetType[]> = {
  missing_seo_title: ['PRODUCTS', 'PAGES', 'COLLECTIONS'],
  missing_seo_description: ['PRODUCTS', 'PAGES', 'COLLECTIONS'],
};

// =============================================================================
// Constants
// =============================================================================

/**
 * AI disclosure text constants.
 */
export const WORK_QUEUE_AI_DISCLOSURE_TEXT = {
  NONE: 'No AI is used for this action.',
  DRAFTS_ONLY: 'Uses AI to generate drafts. Apply does not use AI when a valid draft exists.',
} as const;

/**
 * Recommended action labels (verb-first).
 */
export const WORK_QUEUE_ACTION_LABELS: Record<WorkQueueRecommendedActionKey, string> = {
  FIX_MISSING_METADATA: 'Fix missing metadata',
  RESOLVE_TECHNICAL_ISSUES: 'Resolve technical issues',
  IMPROVE_SEARCH_INTENT: 'Improve search intent coverage',
  OPTIMIZE_CONTENT: 'Optimize content signals',
  SHARE_LINK_GOVERNANCE: 'Manage share link governance',
} as const;

/**
 * Impact rank values for deterministic sorting.
 * Lower value = higher priority.
 */
export const WORK_QUEUE_IMPACT_RANKS: Record<WorkQueueRecommendedActionKey, number> = {
  FIX_MISSING_METADATA: 100,
  RESOLVE_TECHNICAL_ISSUES: 200,
  IMPROVE_SEARCH_INTENT: 300,
  OPTIMIZE_CONTENT: 400,
  SHARE_LINK_GOVERNANCE: 500,
} as const;

/**
 * State priority for deterministic sorting.
 * Lower value = appears earlier in list.
 */
export const WORK_QUEUE_STATE_PRIORITY: Record<WorkQueueState, number> = {
  PENDING_APPROVAL: 100,
  DRAFTS_READY: 200,
  FAILED: 300,
  BLOCKED: 350,
  NEW: 400,
  PREVIEWED: 450,
  APPROVED: 150,  // Between PENDING_APPROVAL and DRAFTS_READY
  APPLIED: 900,   // Applied Recently tab only
} as const;

/**
 * Health priority for deterministic sorting.
 * Lower value = appears earlier in list.
 */
export const WORK_QUEUE_HEALTH_PRIORITY: Record<WorkQueueHealth, number> = {
  CRITICAL: 100,
  NEEDS_ATTENTION: 200,
  HEALTHY: 300,
} as const;
