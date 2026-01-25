/**
 * ISSUE-FIX-ROUTE-INTEGRITY-1: Issue Action Destination Map
 *
 * Source of truth for issue action availability and destinations.
 * Prevents "dead clicks" by explicitly modeling where each action leads.
 */

import type { DeoIssue } from '../deo-issues';
import { buildIssueFixHref } from '../issue-to-fix-path';
import { withRouteContext } from '../route-context';

/**
 * Destination kinds:
 * - 'internal': Navigation within the app
 * - 'external': External link (e.g., Shopify admin)
 * - 'none': Action not available (explicit blocked state)
 */
export type IssueActionDestinationKind = 'internal' | 'external' | 'none';

export interface IssueActionDestination {
  kind: IssueActionDestinationKind;
  /** Href for internal or external navigation (required when kind !== 'none') */
  href?: string;
  /** Human-readable reason why action is blocked (required when kind === 'none') */
  reasonBlocked?: string;
  /** Whether external links should open in new tab */
  openInNewTab?: boolean;
}

export interface IssueActionDestinations {
  /** Primary fix action (AI fix, manual fix, sync fix, etc.) */
  fix: IssueActionDestination;
  /** Open asset in workspace or Shopify admin */
  open: IssueActionDestination;
  /** View list of affected assets */
  viewAffected: IssueActionDestination;
}

export interface GetIssueActionDestinationsParams {
  projectId: string;
  /** Accepts DeoIssue with optional shopifyAdminUrl (from IssueRow hydration) */
  issue: DeoIssue & { shopifyAdminUrl?: string };
  /** Current issues page path with query (for returnTo context) */
  returnTo: string;
}

/**
 * ISSUE-FIX-ROUTE-INTEGRITY-1: Get available action destinations for an issue.
 *
 * Returns explicit destinations for fix/open/viewAffected actions.
 * When kind='none', the action is blocked and should not be rendered as a clickable CTA.
 */
export function getIssueActionDestinations({
  projectId,
  issue,
  returnTo,
}: GetIssueActionDestinationsParams): IssueActionDestinations {
  // [PATCH 1] Informational issues: no fix action available
  if (issue.actionability === 'informational') {
    return {
      fix: {
        kind: 'none',
        reasonBlocked: 'Outside EngineO.ai control',
      },
      open: getOpenDestination({ projectId, issue, returnTo }),
      viewAffected: getViewAffectedDestination({ projectId, issue, returnTo }),
    };
  }

  // [PATCH 1] Non-actionable issues: no fix action available
  if (issue.isActionableNow !== true) {
    return {
      fix: {
        kind: 'none',
        reasonBlocked: 'Not actionable in this context',
      },
      open: getOpenDestination({ projectId, issue, returnTo }),
      viewAffected: getViewAffectedDestination({ projectId, issue, returnTo }),
    };
  }

  // [PATCH 1] Actionable issues: compute fix destination
  const fixHref = buildIssueFixHref({
    projectId,
    issue,
    from: 'issues_engine',
  });

  const fixDestination: IssueActionDestination = fixHref
    ? {
        kind: 'internal',
        href: fixHref,
      }
    : {
        kind: 'none',
        reasonBlocked: 'Fix destination not available in current UI',
      };

  return {
    fix: fixDestination,
    open: getOpenDestination({ projectId, issue, returnTo }),
    viewAffected: getViewAffectedDestination({ projectId, issue, returnTo }),
  };
}

/**
 * Get "Open" action destination.
 * Priority: Shopify admin URL > internal product workspace > none
 */
function getOpenDestination({
  projectId,
  issue,
  returnTo,
}: GetIssueActionDestinationsParams): IssueActionDestination {
  // [PATCH 1] Prefer explicit Shopify admin URL (external)
  if (issue.shopifyAdminUrl) {
    return {
      kind: 'external',
      href: issue.shopifyAdminUrl,
      openInNewTab: true,
    };
  }

  // [PATCH 1] Fallback to internal product workspace
  if (issue.primaryProductId) {
    const href = withRouteContext(
      `/projects/${projectId}/products/${issue.primaryProductId}`,
      {
        from: 'issues_engine',
        returnTo,
      }
    );
    return {
      kind: 'internal',
      href,
    };
  }

  // [PATCH 1] No asset to open
  return {
    kind: 'none',
    reasonBlocked: 'No asset to open',
  };
}

/**
 * Get "View affected" action destination.
 * Routes to Products list filtered by issueType (existing implementation).
 */
function getViewAffectedDestination({
  projectId,
  issue,
  returnTo,
}: GetIssueActionDestinationsParams): IssueActionDestination {
  // [PATCH 1] Only available when affected products exist and issueType is available
  const hasAffectedProducts =
    issue.affectedProducts && issue.affectedProducts.length > 0;

  if (!hasAffectedProducts || !issue.type) {
    return {
      kind: 'none',
      reasonBlocked:
        !issue.type
          ? 'No issueType filter available'
          : 'Affected list not available for this issue',
    };
  }

  const issueType = issue.type;
  const href = withRouteContext(`/projects/${projectId}/products`, {
    from: 'issues_engine',
    returnTo,
    issueType,
  });

  return {
    kind: 'internal',
    href,
  };
}
