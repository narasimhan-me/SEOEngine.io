/**
 * [LIST-ACTIONS-CLARITY-1] Shared NextAction resolver for list rows
 *
 * Single source of truth for row chip labels and actions across
 * Products, Pages, and Collections lists.
 *
 * LOCKED VOCABULARY:
 * - Chip labels: ✅ Optimized, ⚠ Needs attention, 🟡 Draft saved (not applied), ⛔ Blocked
 * - Actions: Fix next, Review drafts, View issues, Request approval, View approval status, Open
 */

import type { FromContext } from './issue-fix-navigation';

// =============================================================================
// Types
// =============================================================================

export type AssetListType = 'products' | 'pages' | 'collections';

/**
 * LOCKED chip labels - do not modify without design review
 */
export type RowChipLabel =
  | '✅ Optimized'
  | '⚠ Needs attention'
  | '🟡 Draft saved (not applied)'
  | '⛔ Blocked';

export interface RowAction {
  label: string;
  href: string;
}

export interface ResolvedRowNextAction {
  chipLabel: RowChipLabel;
  primaryAction: RowAction | null;
  secondaryAction: RowAction | null;
  /** Neutral help text for optimized state */
  helpText?: string;
}

export interface RowNextActionInput {
  assetType: AssetListType;
  /** Server-derived: true if asset appears in a pending draft */
  hasDraftPendingApply: boolean;
  /** Count of actionable-now issues for this asset */
  actionableNowCount: number;
  /**
   * [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Server-derived blocked state
   * True if hasDraft AND viewer cannot apply. Replaces canApply derivation.
   */
  blockedByApproval?: boolean;
  /** @deprecated Use blockedByApproval instead. Kept for backwards compat. */
  canApply?: boolean;
  /** Viewer can request approval (OWNER/EDITOR) */
  canRequestApproval: boolean;
  /** Fix href for Products only (deterministic next issue) */
  fixNextHref: string | null;
  /** Open/view asset href (product workspace, or Issues filtered) */
  openHref: string;
  /** Review drafts href (Draft Review surface, scoped to asset) */
  reviewDraftsHref: string;
  /** Request approval href */
  requestApprovalHref?: string;
  /** View approval status href */
  viewApprovalStatusHref?: string;
}

// =============================================================================
// Resolver
// =============================================================================

/**
 * Resolves the chip label and actions for a list row.
 *
 * LOCKED RULES:
 * 1. Draft chip source: hasDraftPendingApply only (server-derived)
 * 2. Blocked chip: only when blockedByApproval === true (server-derived)
 *    [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Uses server field, not canApply derivation
 * 3. If hasDraftPendingApply === true:
 *    - If blockedByApproval → ⛔ Blocked, primary: Request approval / View approval status
 *    - Else → 🟡 Draft saved (not applied), primary: Review drafts
 * 4. Else (no draft):
 *    - If actionableNowCount > 0 → ⚠ Needs attention, primary: Fix next (Products) / View issues (Pages/Collections)
 *    - If actionableNowCount === 0 → ✅ Optimized, no Fix-style primary CTA
 * 5. Secondary action: Open only when not redundant (primary routes elsewhere)
 */
export function resolveRowNextAction(input: RowNextActionInput): ResolvedRowNextAction {
  const {
    assetType,
    hasDraftPendingApply,
    actionableNowCount,
    blockedByApproval,
    canApply,
    canRequestApproval,
    fixNextHref,
    openHref,
    reviewDraftsHref,
    requestApprovalHref,
    viewApprovalStatusHref,
  } = input;

  // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Determine blocked state:
  // Prefer server-derived blockedByApproval, fall back to canApply derivation for backwards compat
  const isBlocked = blockedByApproval !== undefined ? blockedByApproval : (hasDraftPendingApply && !canApply);

  // Case 1: Has pending draft
  if (hasDraftPendingApply) {
    // Blocked: has draft but cannot apply (server-derived or capability-derived)
    if (isBlocked) {
      const primaryLabel = canRequestApproval ? 'Request approval' : 'View approval status';
      const primaryHref = canRequestApproval
        ? (requestApprovalHref || reviewDraftsHref)
        : (viewApprovalStatusHref || reviewDraftsHref);

      return {
        chipLabel: '⛔ Blocked',
        primaryAction: {
          label: primaryLabel,
          href: primaryHref,
        },
        secondaryAction: {
          label: 'Open',
          href: openHref,
        },
      };
    }

    // Not blocked: can apply the draft
    return {
      chipLabel: '🟡 Draft saved (not applied)',
      primaryAction: {
        label: 'Review drafts',
        href: reviewDraftsHref,
      },
      secondaryAction: {
        label: 'Open',
        href: openHref,
      },
    };
  }

  // Case 2: No pending draft
  if (actionableNowCount > 0) {
    // Has actionable issues
    if (assetType === 'products' && fixNextHref) {
      // Products: Fix next links to deterministic issue fix
      return {
        chipLabel: '⚠ Needs attention',
        primaryAction: {
          label: 'Fix next',
          href: fixNextHref,
        },
        secondaryAction: {
          label: 'Open',
          href: openHref,
        },
      };
    }

    // Pages/Collections: View issues (openHref is Issues filtered)
    return {
      chipLabel: '⚠ Needs attention',
      primaryAction: {
        label: 'View issues',
        href: openHref,
      },
      // No secondary when primary already routes to issues/open
      secondaryAction: null,
    };
  }

  // Case 3: No draft, no actionable issues = Optimized
  return {
    chipLabel: '✅ Optimized',
    primaryAction: null,
    secondaryAction: {
      label: 'Open',
      href: openHref,
    },
    helpText: 'No action needed',
  };
}

// =============================================================================
// Helper: Build standard hrefs
// =============================================================================

/**
 * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Navigation context for returnTo propagation
 * [ROUTE-INTEGRITY-1] Extended with from for deterministic routing
 */
export interface NavigationContext {
  /** Current list path with query params (e.g., /projects/123/products?q=test) */
  returnTo?: string;
  /** Label for back navigation (e.g., "Products") */
  returnLabel?: string;
  /** [ROUTE-INTEGRITY-1] Origin context for back navigation */
  from?: FromContext;
}

/**
 * Build the Issues Engine filtered URL for an asset
 * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Updated to accept NavigationContext
 */
export function buildAssetIssuesHref(
  projectId: string,
  assetType: AssetListType,
  assetId: string,
  navContext?: NavigationContext | string,
  returnLabelLegacy?: string,
): string {
  const params = new URLSearchParams();
  params.set('assetType', assetType);
  params.set('assetId', assetId);

  // Support both new NavigationContext and legacy string params
  if (typeof navContext === 'object' && navContext !== null) {
    if (navContext.returnTo) params.set('returnTo', navContext.returnTo);
    if (navContext.returnLabel) params.set('returnLabel', navContext.returnLabel);
    // [ROUTE-INTEGRITY-1] Append from when provided
    if (navContext.from) params.set('from', navContext.from);
  } else if (typeof navContext === 'string') {
    // Legacy: navContext is returnTo string
    params.set('returnTo', navContext);
    if (returnLabelLegacy) params.set('returnLabel', returnLabelLegacy);
  }

  return `/projects/${projectId}/issues?${params.toString()}`;
}

/**
 * Build the Draft Review URL for reviewing drafts (scoped to asset)
 * [DRAFT-ROUTING-INTEGRITY-1] Review drafts NEVER routes to Work Queue.
 * Routes to /automation/playbooks with mode=drafts and asset scope.
 * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Added returnTo support
 */
export function buildReviewDraftsHref(
  projectId: string,
  assetType: AssetListType,
  assetId: string,
  navContext?: NavigationContext,
): string {
  const params = new URLSearchParams();
  // [DRAFT-ROUTING-INTEGRITY-1] Required params for Draft Review mode
  params.set('mode', 'drafts');
  params.set('assetType', assetType);
  params.set('assetId', assetId);
  params.set('from', 'asset_list');
  if (navContext?.returnTo) {
    params.set('returnTo', navContext.returnTo);
  }
  if (navContext?.returnLabel) {
    params.set('returnLabel', navContext.returnLabel);
  }
  return `/projects/${projectId}/automation/playbooks?${params.toString()}`;
}

/**
 * Build the product workspace URL
 * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Added returnTo support
 */
export function buildProductWorkspaceHref(
  projectId: string,
  productId: string,
  navContext?: NavigationContext,
): string {
  const base = `/projects/${projectId}/products/${productId}`;
  if (!navContext?.returnTo && !navContext?.returnLabel && !navContext?.from) {
    return base;
  }
  const params = new URLSearchParams();
  if (navContext?.returnTo) params.set('returnTo', navContext.returnTo);
  if (navContext?.returnLabel) params.set('returnLabel', navContext.returnLabel);
  // [ROUTE-INTEGRITY-1] Append from when provided
  if (navContext?.from) params.set('from', navContext.from);
  return `${base}?${params.toString()}`;
}

/**
 * [DRAFT-ENTRYPOINT-UNIFICATION-1] Build the product detail Drafts tab URL
 *
 * Products-only routing for "Review drafts" action.
 * Routes to /projects/:projectId/products/:productId?tab=drafts with navigation context.
 *
 * LOCKED: "Product detail is the canonical draft review entrypoint for Products."
 */
export function buildProductDraftsTabHref(
  projectId: string,
  productId: string,
  navContext?: NavigationContext,
): string {
  const base = `/projects/${projectId}/products/${productId}`;
  const params = new URLSearchParams();
  params.set('tab', 'drafts');
  params.set('from', 'asset_list');
  if (navContext?.returnTo) params.set('returnTo', navContext.returnTo);
  if (navContext?.returnLabel) params.set('returnLabel', navContext.returnLabel);
  return `${base}?${params.toString()}`;
}
