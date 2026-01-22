'use client';

import { useEffect, useState, useRef } from 'react';
import type { DeoIssue, DeoIssueSeverity } from '@/lib/deo-issues';
import type { DeoPillarId } from '@/lib/deo-pillars';
import { projectsApi } from '@/lib/api';

/**
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Read-only Issue Drilldown component with progressive disclosure.
 * Token-only styling, no links, no buttons, no navigation.
 *
 * Data source: projectsApi.assetIssues(projectId, assetType, assetId) (read-only).
 *
 * Behavior:
 * - If initialIssues provided and non-empty: render them immediately and skip fetch.
 * - Else: fetch issues on descriptor identity change (kind+id+scopeProjectId), with clear loading and error states.
 * - Avoid stale mismatch: discard late responses when descriptor changes mid-flight.
 */
interface ContextPanelIssueDrilldownProps {
  projectId: string;
  assetType: 'products' | 'pages' | 'collections';
  assetId: string;
  /** Optional in-memory issues; when provided (including empty), renders immediately without fetch */
  initialIssues?: DeoIssue[];
}

/** UX category derived from pillarId mapping */
type IssueCategory = 'Metadata' | 'Content' | 'Search Intent' | 'Technical' | 'Other';

/** Map pillarId to UX category */
function getCategoryFromPillar(pillarId?: DeoPillarId | string): IssueCategory {
  if (!pillarId) return 'Other';
  switch (pillarId) {
    case 'metadata_snippet_quality':
      return 'Metadata';
    case 'search_intent_fit':
      return 'Search Intent';
    case 'technical_indexability':
      return 'Technical';
    case 'content_commerce_signals':
    case 'media_accessibility':
    case 'competitive_positioning':
    case 'offsite_signals':
    case 'local_discovery':
      return 'Content';
    default:
      return 'Other';
  }
}

/** Map severity to display label */
function getSeverityLabel(severity: DeoIssueSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Needs Attention';
    case 'info':
      return 'Informational';
    default:
      return 'Unknown';
  }
}

/**
 * Severity badge styling.
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1 FIXUP-1] Token-only compliance:
 * All severities use neutral token-based styling; differentiation is by label text only.
 */
function getSeverityClasses(_severity: DeoIssueSeverity): string {
  // Token-only: all severities use the same neutral badge styling
  return 'border border-border bg-muted text-foreground';
}

export function ContextPanelIssueDrilldown({
  projectId,
  assetType,
  assetId,
  initialIssues,
}: ContextPanelIssueDrilldownProps) {
  // Use in-memory issues if provided (including empty array) - treat as authoritative
  const hasInitialIssues = initialIssues !== undefined;
  const [issues, setIssues] = useState<DeoIssue[]>(hasInitialIssues ? (initialIssues ?? []) : []);
  const [loading, setLoading] = useState(!hasInitialIssues);
  const [error, setError] = useState<string | null>(null);

  // Track current request identity to discard stale responses
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Skip fetch if we have in-memory issues (including empty array - treat as authoritative)
    if (hasInitialIssues) {
      setIssues(initialIssues ?? []);
      setLoading(false);
      setError(null);
      return;
    }

    // Fetch issues from API
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    projectsApi
      .assetIssues(projectId, assetType, assetId)
      .then((response) => {
        // Discard if descriptor changed mid-flight
        if (requestIdRef.current !== currentRequestId) return;
        setIssues(response.issues || []);
        setLoading(false);
      })
      .catch((err) => {
        // Discard if descriptor changed mid-flight
        if (requestIdRef.current !== currentRequestId) return;
        setError(err instanceof Error ? err.message : 'Failed to load issues');
        setLoading(false);
      });
  }, [projectId, assetType, assetId, hasInitialIssues, initialIssues]);

  // Loading state
  if (loading) {
    return (
      <div
        className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4"
        data-testid="context-panel-issue-drilldown-loading"
      >
        <p className="text-sm text-muted-foreground">Loading issues...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4"
        data-testid="context-panel-issue-drilldown-error"
      >
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  // Empty state
  if (issues.length === 0) {
    return (
      <div
        className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4"
        data-testid="context-panel-issue-drilldown-empty"
      >
        <p className="text-sm text-muted-foreground">No issues for this item.</p>
      </div>
    );
  }

  // Group issues by UX category
  const groupedIssues = issues.reduce(
    (acc, issue) => {
      const category = getCategoryFromPillar(issue.pillarId as DeoPillarId | undefined);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(issue);
      return acc;
    },
    {} as Record<IssueCategory, DeoIssue[]>
  );

  // Sort categories for consistent rendering
  const categoryOrder: IssueCategory[] = ['Metadata', 'Content', 'Search Intent', 'Technical', 'Other'];
  const sortedCategories = categoryOrder.filter((cat) => groupedIssues[cat]?.length > 0);

  return (
    <div className="space-y-3" data-testid="context-panel-issue-drilldown">
      {sortedCategories.map((category) => (
        <div
          key={category}
          className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3"
          data-testid={`issue-category-${category.toLowerCase().replace(' ', '-')}`}
        >
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            {category}
          </h4>
          <div className="space-y-2">
            {groupedIssues[category].map((issue) => (
              <div
                key={issue.id}
                className="rounded border border-border bg-background p-2"
                data-testid={`issue-row-${issue.id}`}
              >
                {/* Issue title */}
                <p className="text-sm font-medium text-foreground">{issue.title}</p>

                {/* Severity badge */}
                <span
                  className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSeverityClasses(issue.severity)}`}
                >
                  {getSeverityLabel(issue.severity)}
                </span>

                {/* "Why this matters" line */}
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
                  {issue.whyItMatters || issue.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
