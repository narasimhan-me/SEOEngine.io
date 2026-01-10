'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DeoIssue } from '@/lib/deo-issues';
import { DEO_PILLARS, type DeoPillarId } from '@/lib/deo-pillars';
import { ISSUE_UI_CONFIG } from '@/lib/issue-ui-config';
import {
  buildIssueFixHref,
  getSafeIssueTitle,
  getSafeIssueDescription,
} from '@/lib/issue-to-fix-path';

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

export function IssuesList({ issues, groupByPillar = false, projectId }: IssuesListProps) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  // Non-grouped view: show "No issues detected" if empty
  if (!groupByPillar && (!issues || issues.length === 0)) {
    return (
      <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
        <span className="font-medium">No issues detected</span>
        <span className="ml-1">
          Your project looks healthy based on the latest crawl and DEO analysis.
        </span>
      </div>
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
                          current === issue.id ? null : issue.id,
                        )
                      }
                      projectId={projectId}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Not analyzed yet
                </div>
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
              current === issue.id ? null : issue.id,
            )
          }
          projectId={projectId}
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
}

// [ISSUE-TO-FIX-PATH-1 FIXUP-1] Removed legacy getIssueDeepLink and PILLAR_TO_TAB_MAP
// Now uses buildIssueFixHref from issue-to-fix-path.ts for deterministic routing

function IssueCard({ issue, isExpanded, onToggleExpand, projectId }: IssueCardProps) {
  const router = useRouter();

  // [ISSUE-TO-FIX-PATH-1] Use centralized safe title/description helpers
  const safeTitle = getSafeIssueTitle(issue);
  const safeDescription = getSafeIssueDescription(issue);

  // [ISSUE-TO-FIX-PATH-1 FIXUP-1] Actionable = has a real href from buildIssueFixHref
  const fixHref = projectId ? buildIssueFixHref({ projectId, issue }) : null;
  const actionable = Boolean(fixHref);

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
      data-testid={actionable ? 'issue-card-actionable' : 'issue-card-informational'}
      role={actionable ? 'button' : undefined}
      tabIndex={actionable ? 0 : undefined}
      onClick={actionable ? handleCardClick : undefined}
      onKeyDown={actionable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); } : undefined}
      className={`rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700 ${
        actionable ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{safeTitle}</span>
            <span className={severityBadge.className}>{severityBadge.label}</span>
            {/* [ISSUE-TO-FIX-PATH-1] Informational badge for orphan issues */}
            {!actionable && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-200">
                Informational — no action required
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">{safeDescription}</p>
          <p className="mt-1 text-xs text-gray-500">
            {issue.count} pages/products affected.
          </p>
        </div>
      </div>

      {hasAffectedItems && (
        <div className="mt-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
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
                  <div className="mb-1 font-semibold">
                    Products ({affectedProductCount})
                  </div>
                  {projectId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{affectedProductCount} product{affectedProductCount !== 1 ? 's' : ''} affected</span>
                      <Link
                        href={`/projects/${projectId}/products`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View affected →
                      </Link>
                    </div>
                  ) : (
                    <span className="text-gray-500">{affectedProductCount} product{affectedProductCount !== 1 ? 's' : ''} affected</span>
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
