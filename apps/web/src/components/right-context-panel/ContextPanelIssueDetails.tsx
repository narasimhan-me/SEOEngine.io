'use client';

import { useCallback, useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';
import type { DeoIssue } from '@/lib/deo-issues';
import { DEO_PILLARS } from '@/lib/deo-pillars';

/**
 * [ISSUES-ENGINE-REMOUNT-1] Read-only issue details renderer for RCP.
 * Token-only styling; no in-body navigation links.
 */

interface ContextPanelIssueDetailsProps {
  projectId: string;
  issueId: string;
  initialIssue?: DeoIssue;
}

type LoadState = 'loading' | 'loaded' | 'not_found' | 'error';

export function ContextPanelIssueDetails({
  projectId,
  issueId,
  initialIssue,
}: ContextPanelIssueDetailsProps) {
  const [issue, setIssue] = useState<DeoIssue | null>(initialIssue ?? null);
  const [loadState, setLoadState] = useState<LoadState>(
    initialIssue ? 'loaded' : 'loading'
  );

  const fetchIssue = useCallback(async () => {
    try {
      setLoadState('loading');
      const result = await projectsApi.deoIssuesReadOnly(projectId);
      const found = result.issues?.find((i: DeoIssue) => i.id === issueId);
      if (found) {
        setIssue(found);
        setLoadState('loaded');
      } else {
        setIssue(null);
        setLoadState('not_found');
      }
    } catch (err) {
      console.error('Error fetching issue for RCP:', err);
      setIssue(null);
      setLoadState('error');
    }
  }, [projectId, issueId]);

  // Fetch issue if not provided initially
  useEffect(() => {
    if (!initialIssue) {
      fetchIssue();
    }
  }, [initialIssue, fetchIssue]);

  // Loading state
  if (loadState === 'loading') {
    return (
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
        <p className="text-sm text-muted-foreground">Loading issue details...</p>
      </div>
    );
  }

  // Not found state
  if (loadState === 'not_found') {
    return (
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
        <p className="text-sm text-muted-foreground">Issue not found.</p>
      </div>
    );
  }

  // Error state
  if (loadState === 'error') {
    return (
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
        <p className="text-sm text-[hsl(var(--danger-foreground))]">
          Failed to load issue details. Please try again.
        </p>
      </div>
    );
  }

  // Loaded state (issue is guaranteed to be non-null here)
  if (!issue) {
    return null;
  }

  // Derive pillar label
  const pillarLabel = issue.pillarId
    ? DEO_PILLARS.find((p) => p.id === issue.pillarId)?.label || issue.pillarId
    : 'Unknown pillar';

  // Derive status label
  const getStatusLabel = () => {
    if (issue.actionability === 'informational') {
      return 'Informational only';
    }
    if (issue.isActionableNow === false) {
      return 'Blocked by permissions';
    }
    return 'Detected';
  };

  // Derive severity display
  const getSeverityClass = () => {
    switch (issue.severity) {
      case 'critical':
        return 'border-[hsl(var(--danger-background))]/50 bg-[hsl(var(--danger-background))] text-[hsl(var(--danger-foreground))]';
      case 'warning':
        return 'border-[hsl(var(--warning-background))]/50 bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]';
      default:
        return 'border-border bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Issue
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {issue.title}
        </p>
      </div>

      {/* Pillar */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Pillar
        </p>
        <p className="mt-1 text-sm text-foreground">{pillarLabel}</p>
      </div>

      {/* Severity */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Severity
        </p>
        <span
          className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getSeverityClass()}`}
        >
          {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
        </span>
      </div>

      {/* Status */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status
        </p>
        <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {getStatusLabel()}
        </span>
      </div>

      {/* Why This Matters */}
      {(issue.whyItMatters || issue.description) && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Why This Matters
          </p>
          <p className="mt-1 text-sm text-foreground">
            {issue.whyItMatters || issue.description}
          </p>
        </div>
      )}

      {/* Affected Counts */}
      {(issue.count > 0 || issue.assetTypeCounts) && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Affected Items
          </p>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-foreground">
              <span className="font-medium">{issue.count}</span> item
              {issue.count !== 1 ? 's' : ''} affected
            </p>
            {issue.assetTypeCounts && (
              <div className="flex flex-wrap gap-2 mt-2">
                {issue.assetTypeCounts.products > 0 && (
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {issue.assetTypeCounts.products} product
                    {issue.assetTypeCounts.products !== 1 ? 's' : ''}
                  </span>
                )}
                {issue.assetTypeCounts.pages > 0 && (
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {issue.assetTypeCounts.pages} page
                    {issue.assetTypeCounts.pages !== 1 ? 's' : ''}
                  </span>
                )}
                {issue.assetTypeCounts.collections > 0 && (
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {issue.assetTypeCounts.collections} collection
                    {issue.assetTypeCounts.collections !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NO in-body navigation links - header external-link is the only navigation affordance */}
    </div>
  );
}
