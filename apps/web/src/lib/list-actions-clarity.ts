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
  /** Viewer can apply drafts (OWNER only) */
  canApply: boolean;
  /** Viewer can request approval (OWNER/EDITOR) */
  canRequestApproval: boolean;
  /** Fix href for Products only (deterministic next issue) */
  fixNextHref: string | null;
  /** Open/view asset href (product workspace, or Issues filtered) */
  openHref: string;
  /** Review drafts href (Work Queue or Playbooks) */
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
 * 2. Blocked chip: only when hasDraftPendingApply === true AND canApply === false
 * 3. If hasDraftPendingApply === true:
 *    - If blocked → ⛔ Blocked, primary: Request approval / View approval status
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
    canApply,
    canRequestApproval,
    fixNextHref,
    openHref,
    reviewDraftsHref,
    requestApprovalHref,
    viewApprovalStatusHref,
  } = input;

  // Case 1: Has pending draft
  if (hasDraftPendingApply) {
    // Blocked: has draft but cannot apply
    if (!canApply) {
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
 */
export interface NavigationContext {
  /** Current list path with query params (e.g., /projects/123/products?q=test) */
  returnTo?: string;
  /** Label for back navigation (e.g., "Products") */
  returnLabel?: string;
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
  } else if (typeof navContext === 'string') {
    // Legacy: navContext is returnTo string
    params.set('returnTo', navContext);
    if (returnLabelLegacy) params.set('returnLabel', returnLabelLegacy);
  }

  return `/projects/${projectId}/issues?${params.toString()}`;
}

/**
 * Build the Work Queue URL for reviewing drafts
 * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Added returnTo support
 */
export function buildReviewDraftsHref(
  projectId: string,
  assetType?: AssetListType,
  navContext?: NavigationContext,
): string {
  const params = new URLSearchParams();
  if (assetType) {
    params.set('scopeType', assetType.toUpperCase());
  }
  if (navContext?.returnTo) {
    params.set('returnTo', navContext.returnTo);
  }
  if (navContext?.returnLabel) {
    params.set('returnLabel', navContext.returnLabel);
  }
  const qs = params.toString();
  return `/projects/${projectId}/work-queue${qs ? `?${qs}` : ''}`;
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
  if (!navContext?.returnTo && !navContext?.returnLabel) {
    return base;
  }
  const params = new URLSearchParams();
  if (navContext.returnTo) params.set('returnTo', navContext.returnTo);
  if (navContext.returnLabel) params.set('returnLabel', navContext.returnLabel);
  return `${base}?${params.toString()}`;
}
