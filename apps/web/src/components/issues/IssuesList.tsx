'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { DeoIssue } from '@/lib/deo-issues';
import { DEO_PILLARS, type DeoPillarId } from '@/lib/deo-pillars';
import { ISSUE_UI_CONFIG } from '@/lib/issue-ui-config';
import {
  buildIssueFixHref,
  getSafeIssueTitle,
  getSafeIssueDescription,
  getIssueFixConfig,
  type IssueFixKind,
} from '@/lib/issue-to-fix-path';
import {
  getReturnToFromCurrentUrl,
  withRouteContext,
  type RouteFrom,
} from '@/lib/route-context';
import { EmptyState } from '@/components/common/EmptyState';
import { EmptyStatePresets } from '@/lib/empty-state-contract';
import {
  getCanonicalBlockedReason,
  type CanonicalBlockedReasonId,
} from '@/lib/issues/canonicalBlockedReasons';
// [EA-27: PRIORITIZATION-SIGNAL-ENRICHMENT-1] Import prioritization signal helpers
import {
  deriveImpactLevel,
  derivePrioritizationFactors,
  derivePriorityRationale,
} from '@/lib/issues/prioritizationSignals';
import { ImpactIndicator } from './ImpactIndicator';

// [ISSUE-TO-FIX-PATH-1 FIXUP-1] Re-export ISSUE_UI_CONFIG for backwards compatibility
export { ISSUE_UI_CONFIG } from '@/lib/issue-ui-config';

/**
 * Get the pillar ID for an issue, preferring backend-provided pillarId,
 * falling back to ISSUE_UI_CONFIG mapping.
 */
function getIssuePillarId(issue: DeoIssue): DeoPillarId | undefined {
  // Backend pillarId takes precedence
  if (issue.pillarId) {
    return issue.pillarId;
  }
  // Fall back to frontend config
  return ISSUE_UI_CONFIG[issue.id]?.pillarId;
}

interface IssuesListProps {
  issues: DeoIssue[];
  /** When true, group issues by pillar in canonical DEO_PILLARS order */
  groupByPillar?: boolean;
  /** [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Project ID for deterministic routing */
  projectId?: string;
}

export function IssuesList({
  issues,
  groupByPillar = false,
  projectId,
}: IssuesListProps) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // [ISSUESLIST-VIEW-AFFECTED-CONTEXT-1] Compute returnTo for "View affected" links
  const viewAffectedReturnTo = useMemo(
    () => getReturnToFromCurrentUrl(pathname, searchParams),
    [pathname, searchParams]
  );

  // [ISSUESLIST-VIEW-AFFECTED-CONTEXT-1] Compute from context for "View affected" links
  const viewAffectedFrom = useMemo((): RouteFrom => {
    // If from param exists in URL, use it
    const existingFrom = searchParams?.get('from');
    if (existingFrom) {
      return existingFrom as RouteFrom;
    }
    // Infer from pathname
    if (pathname?.includes('/overview')) return 'overview';
    if (pathname?.includes('/issues')) return 'issues_engine';
    return 'issues_engine';
  }, [pathname, searchParams]);

  // Non-grouped view: show "No issues detected" if empty
  if (!groupByPillar && (!issues || issues.length === 0)) {
    return (
      <EmptyState
        {...EmptyStatePresets.noIssuesDetected()}
        message="Your project looks healthy based on the latest crawl and DEO analysis."
        compact={false}
      />
    );
  }

  // Grouped by pillar view
  if (groupByPillar) {
    // Group issues by pillarId
    const issuesByPillar = new Map<DeoPillarId, DeoIssue[]>();
    for (const issue of issues) {
      const pillarId = getIssuePillarId(issue);
      if (pillarId) {
        const existing = issuesByPillar.get(pillarId) ?? [];
        existing.push(issue);
        issuesByPillar.set(pillarId, existing);
      }
    }

    return (
      <div className="space-y-6">
        {DEO_PILLARS.map((pillar) => {
          const pillarIssues = issuesByPillar.get(pillar.id) ?? [];

          return (
            <div key={pillar.id} className="space-y-3">
              {/* Pillar header */}
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {pillar.label}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {pillar.whyItMatters}
                </p>
              </div>

              {/* Issues for this pillar or "Not analyzed yet" */}
              {pillarIssues.length > 0 ? (
                <div className="space-y-3">
                  {pillarIssues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      isExpanded={expandedIssueId === issue.id}
                      onToggleExpand={() =>
                        setExpandedIssueId((current) =>
                          current === issue.id ? null : issue.id
                        )
                      }
                      projectId={projectId}
                      viewAffectedFrom={viewAffectedFrom}
                      viewAffectedReturnTo={viewAffectedReturnTo}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState {...EmptyStatePresets.notAnalyzedYet()} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Flat list (default view)
  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          isExpanded={expandedIssueId === issue.id}
          onToggleExpand={() =>
            setExpandedIssueId((current) =>
              current === issue.id ? null : issue.id
            )
          }
          projectId={projectId}
          viewAffectedFrom={viewAffectedFrom}
          viewAffectedReturnTo={viewAffectedReturnTo}
        />
      ))}
    </div>
  );
}

interface IssueCardProps {
  issue: DeoIssue;
  isExpanded: boolean;
  onToggleExpand: () => void;
  /** [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Project ID for deterministic routing */
  projectId?: string;
  /** [ISSUESLIST-VIEW-AFFECTED-CONTEXT-1] From context for "View affected" links */
  viewAffectedFrom?: RouteFrom;
  /** [ISSUESLIST-VIEW-AFFECTED-CONTEXT-1] Return URL for "View affected" links */
  viewAffectedReturnTo?: string;
}

// [ISSUE-TO-FIX-PATH-1 FIXUP-1] Removed legacy getIssueDeepLink and PILLAR_TO_TAB_MAP
// Now uses buildIssueFixHref from issue-to-fix-path.ts for deterministic routing

function IssueCard({
  issue,
  isExpanded,
  onToggleExpand,
  projectId,
  viewAffectedFrom,
  viewAffectedReturnTo,
}: IssueCardProps) {
  const router = useRouter();

  // [ISSUE-TO-FIX-PATH-1] Use centralized safe title/description helpers
  const safeTitle = getSafeIssueTitle(issue);
  const safeDescription = getSafeIssueDescription(issue);

  // [DIAGNOSTIC-GUIDANCE-1] Issues with actionability === 'informational' are outside EngineO.ai control
  // [ISSUE-FIX-ROUTE-INTEGRITY-1] Informational issues display explanation badges, never dead CTAs
  const isOutsideEngineControl = issue.actionability === 'informational';

  // [ISSUE-TO-FIX-PATH-1 FIXUP-1] Actionable = has a real href from buildIssueFixHref
  // [DIAGNOSTIC-GUIDANCE-1] Outside-control issues are never actionable (no Fix/Review CTA)
  // [ISSUE-FIX-ROUTE-INTEGRITY-1] Ensures no dead clicks: only issues with valid fix paths are clickable
  const fixHref =
    projectId && !isOutsideEngineControl
      ? buildIssueFixHref({ projectId, issue })
      : null;
  const actionable = Boolean(fixHref) && !isOutsideEngineControl;

  // [ISSUE-FIX-KIND-CLARITY-1] Get fixKind to determine CTA wording
  const fixConfig = getIssueFixConfig(issue.type || issue.id);
  const fixKind: IssueFixKind = fixConfig?.fixKind || 'EDIT';
  const ctaLabel = fixKind === 'DIAGNOSTIC' ? 'Review' : 'Fix';

  const severityBadge = getSeverityBadge(issue.severity);
  const hasAffectedItems =
    (issue.affectedPages?.length ?? 0) + (issue.affectedProducts?.length ?? 0) >
    0;

  // [ISSUE-TO-FIX-PATH-1] Handle card click - only for actionable issues
  const handleCardClick = () => {
    if (fixHref) {
      router.push(fixHref);
    }
  };

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Get counts for affected items display
  const affectedProductCount = issue.affectedProducts?.length ?? 0;
  const affectedPageCount = issue.affectedPages?.length ?? 0;

  return (
    <div
      // [ISSUE-TO-FIX-PATH-1] Test hooks for actionable vs informational cards
      // [ISSUE-FIX-KIND-CLARITY-1] Added fixKind test attribute for DIAGNOSTIC detection
      data-testid={
        actionable ? 'issue-card-actionable' : 'issue-card-informational'
      }
      data-fix-kind={fixKind}
      role={actionable ? 'button' : undefined}
      tabIndex={actionable ? 0 : undefined}
      onClick={actionable ? handleCardClick : undefined}
      onKeyDown={
        actionable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') handleCardClick();
            }
          : undefined
      }
      className={`rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700 ${
        actionable
          ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{safeTitle}</span>
            <span className={severityBadge.className}>
              {severityBadge.label}
            </span>
            {/* [EA-27: PRIORITIZATION-SIGNAL-ENRICHMENT-1] Impact indicator */}
            {(() => {
              const impactLevel = deriveImpactLevel(issue.deoImpactEstimate);
              return <ImpactIndicator impactLevel={impactLevel} size="sm" showLabel={false} />;
            })()}
            {/* [DIAGNOSTIC-GUIDANCE-1] Outside-control issues get specific label */}
            {/* [ISSUE-TO-FIX-PATH-1] Informational badge for orphan issues (non-outside-control) */}
            {/* [EA-16: ERROR-&-BLOCKED-STATE-UX-1] Blocked states with canonical reasons */}
            {!actionable && (
              (() => {
                // Determine canonical blocked reason
                const canonicalReasonId: CanonicalBlockedReasonId = isOutsideEngineControl
                  ? 'DESTINATION_UNAVAILABLE'
                  : 'DESTINATION_UNAVAILABLE';
                const blockedReason = getCanonicalBlockedReason(canonicalReasonId);

                const tooltipText = isOutsideEngineControl
                  ? `${blockedReason.reason} ${blockedReason.nextStep}`
                  : `${blockedReason.reason} ${blockedReason.nextStep}`;

                const badgeLabel = isOutsideEngineControl
                  ? 'Blocked — outside EngineO.ai control'
                  : `Blocked — ${blockedReason.label.toLowerCase()}`;

                return (
                  <span
                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-200"
                    data-testid="issue-blocked-badge"
                    data-blocked-reason={canonicalReasonId}
                    title={tooltipText}
                    aria-label={`Blocked: ${tooltipText}`}
                    role="status"
                  >
                    {badgeLabel}
                  </span>
                );
              })()
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">{safeDescription}</p>
          <p className="mt-1 text-xs text-gray-500">
            {issue.count} pages/products affected.
          </p>
          {/* [EA-27: PRIORITIZATION-SIGNAL-ENRICHMENT-1] Priority rationale line */}
          {(() => {
            const factors = derivePrioritizationFactors(issue);
            const rationale = derivePriorityRationale(issue, factors);
            return rationale ? (
              <p className="mt-1 text-[10px] text-gray-400 italic">{rationale}</p>
            ) : null;
          })()}
          {/* [DIAGNOSTIC-GUIDANCE-1] Diagnostic guidance block for outside-control issues */}
          {isOutsideEngineControl && (
            <div
              className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3"
              data-testid="diagnostic-guidance-block"
            >
              <p className="text-xs text-gray-600">
                EngineO.ai cannot directly fix this issue because it depends on
                your theme, hosting, or Shopify configuration.
              </p>
              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-700">
                  How to address this
                </p>
                <ul className="mt-1 list-disc list-inside text-xs text-gray-600 space-y-0.5">
                  <li>Check your Shopify theme settings</li>
                  <li>Verify robots.txt and meta tags</li>
                  <li>Use Google Search Console → Pages → Indexing</li>
                  <li>Validate structured data using Rich Results Test</li>
                </ul>
              </div>
            </div>
          )}
          {/* [ISSUE-FIX-KIND-CLARITY-1] Visible CTA showing "Fix" or "Review" based on fixKind */}
          {actionable && (
            <span
              data-testid="issue-card-cta"
              className="mt-2 inline-flex items-center text-xs font-medium text-blue-600"
            >
              {ctaLabel} →
            </span>
          )}
        </div>
      </div>

      {hasAffectedItems && (
        <div className="mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Hide affected items' : 'Show affected items'}
          </button>
          {isExpanded && (
            <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-[11px] text-gray-700">
              {issue.affectedPages && issue.affectedPages.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 font-semibold">
                    Pages ({affectedPageCount})
                  </div>
                  <ul className="space-y-0.5">
                    {issue.affectedPages.map((url) => (
                      <li key={url} className="truncate">
                        {url}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {issue.affectedProducts && issue.affectedProducts.length > 0 && (
                <div>
                  {/* [ISSUE-TO-FIX-PATH-1] Remove internal ID leakage - show count and link instead */}
                  {/* [ISSUESLIST-VIEW-AFFECTED-CONTEXT-1] Secondary link preserves issueType + context */}
                  <div className="mb-1 font-semibold">
                    Products ({affectedProductCount})
                  </div>
                  {projectId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {affectedProductCount} product
                        {affectedProductCount !== 1 ? 's' : ''} affected
                      </span>
                      <Link
                        href={
                          viewAffectedFrom && viewAffectedReturnTo
                            ? withRouteContext(
                                `/projects/${projectId}/products`,
                                {
                                  from: viewAffectedFrom,
                                  returnTo: viewAffectedReturnTo,
                                  issueType: issue.type || issue.id,
                                }
                              )
                            : `/projects/${projectId}/products?issueType=${encodeURIComponent(issue.type || issue.id)}`
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                        data-testid="issue-card-view-affected-secondary"
                      >
                        View affected →
                      </Link>
                    </div>
                  ) : (
                    <span className="text-gray-500">
                      {affectedProductCount} product
                      {affectedProductCount !== 1 ? 's' : ''} affected
                      <span className="ml-1 text-[10px] text-gray-400" title="Project context required to view affected items">
                        (context unavailable)
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getSeverityBadge(severity: DeoIssue['severity']) {
  if (severity === 'critical') {
    return {
      label: 'Critical',
      className:
        'inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200',
    };
  }
  if (severity === 'warning') {
    return {
      label: 'Warning',
      className:
        'inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 border border-orange-200',
    };
  }
  return {
    label: 'Info',
    className:
      'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200',
  };
}
