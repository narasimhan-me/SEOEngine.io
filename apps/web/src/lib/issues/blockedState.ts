/**
 * ERROR-&-BLOCKED-STATE-UX-1: Centralized blocked-state derivation and copy
 *
 * Source of truth for blocked state detection and user-facing explanations.
 * No backend calls - derives from existing UI signals only.
 */

import type { DeoIssue } from '../deo-issues';
import type { IssueActionDestinations } from './issueActionDestinations';
import type { DraftLifecycleState } from './draftLifecycleState';

/**
 * Canonical blocked reasons (priority order: permissions → scopes → draft → destination → sync → system)
 */
export type BlockedState =
  | 'PERMISSIONS_MISSING'
  | 'SHOPIFY_SCOPE_MISSING'
  | 'DRAFT_REQUIRED'
  | 'DESTINATION_UNAVAILABLE'
  | 'SYNC_PENDING'
  | 'SYSTEM_ERROR';

/**
 * User-facing copy for blocked states.
 */
export interface BlockedStateCopy {
  chipLabel: string;
  description: string;
  nextStep?: string;
}

/**
 * Canonical copy for each blocked state.
 * Exact, user-facing copy (no vague errors).
 */
const BLOCKED_STATE_COPY: Record<BlockedState, BlockedStateCopy> = {
  PERMISSIONS_MISSING: {
    chipLabel: 'Blocked — permissions',
    description: "You don't have permission to run fixes for this project.",
    nextStep: 'Ask a project owner to grant access, then try again.',
  },
  SHOPIFY_SCOPE_MISSING: {
    chipLabel: 'Blocked — Shopify permissions',
    description:
      "Required Shopify permissions weren't granted, so fixes can't be applied.",
    nextStep: 'Reconnect Shopify to grant the missing permissions.',
  },
  DRAFT_REQUIRED: {
    chipLabel: 'Blocked — save draft',
    description: 'Save the draft before applying it to Shopify.',
    nextStep: 'Click "Save draft", then apply the saved draft.',
  },
  DESTINATION_UNAVAILABLE: {
    chipLabel: 'Blocked — unavailable',
    description: "This action isn't available in the current UI.",
    nextStep: 'Open the issue details to review context.',
  },
  SYNC_PENDING: {
    chipLabel: 'Blocked — syncing',
    description:
      "We can't show fixes yet because data sync is still in progress.",
    nextStep: 'Try again after the sync completes.',
  },
  SYSTEM_ERROR: {
    chipLabel: 'Blocked — system error',
    description: 'This action is unavailable due to a system error.',
    nextStep: 'Retry, or refresh the page.',
  },
};

/**
 * Context for deriving blocked state.
 * Uses existing UI signals only (no new backend calls).
 */
export interface DeriveBlockedStateContext {
  /** The issue being evaluated */
  issue: DeoIssue;
  /** Destinations from getIssueActionDestinations() */
  destinations: IssueActionDestinations;
  /** Draft lifecycle state for the issue row */
  draftLifecycleState: DraftLifecycleState;
  /** Shopify connection status (from integration-status) */
  shopifyConnected: boolean;
  /** Shopify granted scopes string (comma-separated, from integration-status) */
  shopifyScope: string;
  /** Last crawled timestamp (undefined/null if never crawled or sync pending) */
  lastCrawledAt?: string | null;
  /** UI error flag (true if a local error state is active) */
  uiErrorFlag?: boolean;
  /** User role-based permission flags */
  userPermissions?: {
    canGenerateDrafts?: boolean;
    canRequestApproval?: boolean;
    canApply?: boolean;
  };
}

/**
 * Private helper: Parse Shopify scopes and check if required scopes are granted.
 * Handles write_* satisfying read_* (e.g., write_products satisfies read_products).
 */
function hasRequiredShopifyScopes(
  grantedScopesString: string,
  requiredScopes: string[]
): boolean {
  if (!grantedScopesString || !requiredScopes.length) {
    return true; // No requirements = satisfied
  }

  // Parse granted scopes (handle comma-separated, whitespace-delimited, or JSON array formats)
  let grantedScopes: string[] = [];
  const trimmed = grantedScopesString.trim();

  if (trimmed.startsWith('[')) {
    // JSON array format
    try {
      grantedScopes = JSON.parse(trimmed);
    } catch {
      grantedScopes = [];
    }
  } else if (trimmed.includes(',')) {
    // Comma-separated
    grantedScopes = trimmed.split(',').map((s) => s.trim());
  } else {
    // Whitespace-delimited
    grantedScopes = trimmed.split(/\s+/).filter(Boolean);
  }

  // Normalize to lowercase set
  const grantedSet = new Set(grantedScopes.map((s) => s.toLowerCase().trim()));

  // Check each required scope
  for (const required of requiredScopes) {
    const normalizedRequired = required.toLowerCase().trim();

    // Direct match
    if (grantedSet.has(normalizedRequired)) {
      continue;
    }

    // write_* satisfies read_*
    if (normalizedRequired.startsWith('read_')) {
      const writeEquivalent = normalizedRequired.replace('read_', 'write_');
      if (grantedSet.has(writeEquivalent)) {
        continue;
      }
    }

    // Required scope not satisfied
    return false;
  }

  return true;
}

/**
 * Derive the blocked state from UI context.
 * Returns null if action is NOT blocked.
 *
 * Priority order: permissions → scopes → draft → destination → sync → system
 */
export function deriveBlockedState(
  context: DeriveBlockedStateContext
): BlockedState | null {
  const {
    issue,
    destinations,
    draftLifecycleState,
    shopifyConnected,
    shopifyScope,
    lastCrawledAt,
    uiErrorFlag,
    userPermissions,
  } = context;

  // Priority 1: PERMISSIONS_MISSING
  // Check if user lacks all permission flags
  if (userPermissions) {
    const hasAnyPermission =
      userPermissions.canGenerateDrafts ||
      userPermissions.canRequestApproval ||
      userPermissions.canApply;

    if (!hasAnyPermission) {
      return 'PERMISSIONS_MISSING';
    }
  }

  // Priority 2: SHOPIFY_SCOPE_MISSING
  // Check if Shopify is connected but required scopes are missing
  if (shopifyConnected) {
    // Required scopes for fix actions (read_products + write_products for product SEO)
    const requiredScopes = ['read_products', 'write_products'];
    if (!hasRequiredShopifyScopes(shopifyScope, requiredScopes)) {
      return 'SHOPIFY_SCOPE_MISSING';
    }
  }

  // Priority 3: DRAFT_REQUIRED
  // If we have a draft lifecycle state that indicates unsaved draft needed
  if (draftLifecycleState === 'GENERATED_UNSAVED') {
    // Check if there's a fix destination that requires a saved draft
    if (
      destinations.fix.kind === 'none' &&
      destinations.fix.reasonBlocked?.includes('draft')
    ) {
      return 'DRAFT_REQUIRED';
    }
  }

  // Priority 4: DESTINATION_UNAVAILABLE
  // Check if the fix destination is unavailable in current UI
  if (destinations.fix.kind === 'none') {
    const reason = destinations.fix.reasonBlocked || '';
    // Distinguish from other blocked reasons
    if (
      reason.includes('not available') ||
      reason.includes('unavailable') ||
      reason === 'Fix destination not available in current UI'
    ) {
      return 'DESTINATION_UNAVAILABLE';
    }
    // Non-actionable issues also fall here if not caught above
    if (issue.isActionableNow !== true) {
      return 'DESTINATION_UNAVAILABLE';
    }
  }

  // Priority 5: SYNC_PENDING
  // [ERROR-&-BLOCKED-STATE-UX-1 FIXUP-1 PATCH 2] Only infer SYNC_PENDING when lastCrawledAt is
  // explicitly null (known missing). Treat undefined as "unknown" - do not infer blocked state
  // from missing integration data (caller should only pass values when integration-status is loaded).
  if (lastCrawledAt === null) {
    return 'SYNC_PENDING';
  }

  // Priority 6: SYSTEM_ERROR
  // UI error flag or catch-all for unexpected blocked states
  if (uiErrorFlag) {
    return 'SYSTEM_ERROR';
  }

  // Not blocked
  return null;
}

/**
 * Get user-facing copy for a blocked state.
 * Always returns valid copy (SYSTEM_ERROR as fallback for unknown states).
 */
export function getBlockedStateCopy(state: BlockedState): BlockedStateCopy {
  const copy = BLOCKED_STATE_COPY[state];

  // Defensive fallback (should never happen)
  if (!copy) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[ERROR-&-BLOCKED-STATE-UX-1] Unknown blocked state: ${state}. Using SYSTEM_ERROR fallback.`
      );
    }
    return BLOCKED_STATE_COPY.SYSTEM_ERROR;
  }

  return copy;
}

/**
 * Build tooltip text from blocked state copy.
 * Concatenates description + nextStep (if present) in a single readable sentence.
 */
export function buildBlockedTooltip(copy: BlockedStateCopy): string {
  if (copy.nextStep) {
    return `${copy.description} ${copy.nextStep}`;
  }
  return copy.description;
}
