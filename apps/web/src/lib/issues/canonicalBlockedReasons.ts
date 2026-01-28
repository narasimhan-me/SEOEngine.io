/**
 * EA-16: ERROR-&-BLOCKED-STATE-UX-1
 *
 * Canonical Blocked Reasons Contract
 *
 * Defines the exhaustive set of blocked reasons across the Issues Decision Engine
 * and Right Context Panel. Each reason includes:
 * - WHY the action is blocked
 * - Clear next step for the user
 * - Blocker category for visual styling
 *
 * Priority Order (most actionable first):
 * 1. PERMISSIONS_MISSING - Contact admin
 * 2. SHOPIFY_SCOPE_MISSING - Re-authenticate
 * 3. DRAFT_REQUIRED - Save draft first
 * 4. DESTINATION_UNAVAILABLE - Workflow limitation
 * 5. SYNC_PENDING - Wait for sync
 * 6. SYSTEM_ERROR - Contact support
 */

export type CanonicalBlockedReasonId =
  | 'PERMISSIONS_MISSING'
  | 'SHOPIFY_SCOPE_MISSING'
  | 'SYNC_PENDING'
  | 'DESTINATION_UNAVAILABLE'
  | 'DRAFT_REQUIRED'
  | 'SYSTEM_ERROR';

export type BlockerCategory = 'approval_required' | 'permission' | 'system';

export interface CanonicalBlockedReason {
  id: CanonicalBlockedReasonId;
  /** Priority order (1 = most actionable, shown first when multiple apply) */
  priority: number;
  /** Human-readable label for the blocked state */
  label: string;
  /** Detailed explanation of WHY blocked */
  reason: string;
  /** Clear next step the user can take */
  nextStep: string;
  /** Category for visual styling and screen reader context */
  category: BlockerCategory;
  /** True if user can potentially resolve this themselves */
  userResolvable: boolean;
}

/**
 * Canonical blocked reasons registry
 */
export const CANONICAL_BLOCKED_REASONS: Record<
  CanonicalBlockedReasonId,
  CanonicalBlockedReason
> = {
  PERMISSIONS_MISSING: {
    id: 'PERMISSIONS_MISSING',
    priority: 1,
    label: 'Missing permissions',
    reason: 'This action requires additional permissions you do not currently have.',
    nextStep: 'Contact a project owner to request the necessary permissions.',
    category: 'permission',
    userResolvable: false,
  },
  SHOPIFY_SCOPE_MISSING: {
    id: 'SHOPIFY_SCOPE_MISSING',
    priority: 2,
    label: 'Shopify access required',
    reason: 'This action requires Shopify OAuth scopes that have not been granted.',
    nextStep: 'Re-connect your Shopify store and grant the requested permissions.',
    category: 'permission',
    userResolvable: true,
  },
  DRAFT_REQUIRED: {
    id: 'DRAFT_REQUIRED',
    priority: 3,
    label: 'Draft not saved',
    reason: 'This action requires saving a draft first.',
    nextStep: 'Review and save your draft changes before applying.',
    category: 'approval_required',
    userResolvable: true,
  },
  DESTINATION_UNAVAILABLE: {
    id: 'DESTINATION_UNAVAILABLE',
    priority: 4,
    label: 'Action unavailable',
    reason: 'No valid action route exists for this issue in the current context.',
    nextStep: 'Review the issue details in the Issues Engine for guidance.',
    category: 'system',
    userResolvable: false,
  },
  SYNC_PENDING: {
    id: 'SYNC_PENDING',
    priority: 5,
    label: 'Sync in progress',
    reason: 'Data is not yet available because a sync is currently in progress.',
    nextStep: 'Wait for the sync to complete, then try again.',
    category: 'system',
    userResolvable: false,
  },
  SYSTEM_ERROR: {
    id: 'SYSTEM_ERROR',
    priority: 6,
    label: 'System error',
    reason: 'An unexpected system error prevented this action.',
    nextStep: 'Try again later or contact support if the problem persists.',
    category: 'system',
    userResolvable: false,
  },
};

/**
 * Get canonical blocked reason by ID
 */
export function getCanonicalBlockedReason(
  id: CanonicalBlockedReasonId
): CanonicalBlockedReason {
  return CANONICAL_BLOCKED_REASONS[id];
}

/**
 * Get the highest priority blocked reason from a list of reason IDs.
 * Used when multiple blocked conditions apply to show the most actionable one.
 */
export function getPriorityBlockedReason(
  reasonIds: CanonicalBlockedReasonId[]
): CanonicalBlockedReason | null {
  if (reasonIds.length === 0) return null;

  const reasons = reasonIds.map((id) => CANONICAL_BLOCKED_REASONS[id]);
  reasons.sort((a, b) => a.priority - b.priority);
  return reasons[0];
}

/**
 * Check if a blocked reason is user-resolvable
 */
export function isUserResolvable(id: CanonicalBlockedReasonId): boolean {
  return CANONICAL_BLOCKED_REASONS[id].userResolvable;
}

/**
 * Get all blocked reasons sorted by priority
 */
export function getAllBlockedReasonsSorted(): CanonicalBlockedReason[] {
  return Object.values(CANONICAL_BLOCKED_REASONS).sort(
    (a, b) => a.priority - b.priority
  );
}
