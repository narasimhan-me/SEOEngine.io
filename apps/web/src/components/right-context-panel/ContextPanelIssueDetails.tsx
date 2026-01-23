'use client';

import { useCallback, useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';
import type { DeoIssue } from '@/lib/deo-issues';
import { DEO_PILLARS } from '@/lib/deo-pillars';
import {
  getIssueToActionGuidance,
  type RecommendedPlaybook,
} from '@/lib/issue-to-action-guidance';
import { buildPlaybookRunHref } from '@/lib/playbooks-routing';
import { GuardedLink } from '@/components/navigation/GuardedLink';

/**
 * [ISSUES-ENGINE-REMOUNT-1] Read-only issue details renderer for RCP.
 * [ISSUES-ENGINE-REMOUNT-1 FIXUP-3] Enhanced with required RCP sections:
 *   - Issue summary (title + description)
 *   - Why this matters (truthful fallback)
 *   - Actionability section with guidance
 *   - Affected assets list (when present)
 * [ISSUE-TO-ACTION-GUIDANCE-1] Added "Recommended action" section with playbook guidance.
 * Token-only styling; no in-body navigation links EXCEPT the single "View playbook" CTA
 * in the Recommended action section.
 */

interface ContextPanelIssueDetailsProps {
  projectId: string;
  issueId: string;
  initialIssue?: DeoIssue;
}

type LoadState = 'loading' | 'loaded' | 'not_found' | 'error';

/**
 * [ISSUE-TO-ACTION-GUIDANCE-1] Automation guidance section component.
 * [ISSUE-TO-ACTION-GUIDANCE-1 FIXUP-1] Trust language alignment:
 *   - Non-actionable states use "Automation Guidance" label (no "Recommended" when nothing to recommend)
 *   - Actionable + mapped states use "Recommended Action" label (recommendation is present)
 * Shows playbook guidance when issue is actionable and has a mapping.
 * Shows "No automated action available." for informational or blocked issues.
 */
function RecommendedActionSection({
  issue,
  projectId,
}: {
  issue: DeoIssue;
  projectId: string;
}) {
  // Determine if we should show recommendations
  const isActionable =
    issue.actionability !== 'informational' && issue.isActionableNow === true;

  // Derive issue type deterministically
  const issueType = (issue.type as string | undefined) ?? issue.id;

  // Get playbook guidance
  const guidance = getIssueToActionGuidance(issueType);
  const hasGuidance = guidance.length > 0;

  // [FIXUP-1] If not actionable, show calm "no action" message with neutral label
  // (no "Recommended" language when there is no recommendation)
  if (!isActionable) {
    return (
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Automation Guidance
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          No automated action available. Review the Work Canvas for next steps.
        </p>
      </div>
    );
  }

  // [FIXUP-1] If actionable but no guidance mapping, show calm "no action" message with neutral label
  if (!hasGuidance) {
    return (
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Automation Guidance
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          No automated action available. Review the Work Canvas for next steps.
        </p>
      </div>
    );
  }

  // Render recommended playbook(s) - use "Recommended Action" since we have a recommendation
  return (
    <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Recommended Action
      </p>
      <div className="mt-2 space-y-3">
        {guidance.map((playbook) => (
          <RecommendedPlaybookBlock
            key={playbook.playbookId}
            playbook={playbook}
            projectId={projectId}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * [ISSUE-TO-ACTION-GUIDANCE-1] Individual playbook recommendation block.
 * [ISSUE-TO-ACTION-GUIDANCE-1 FIXUP-1] CTA uses GuardedLink for unsaved-changes protection.
 * Displays playbook name, description, affects, preconditions, and CTA.
 */
function RecommendedPlaybookBlock({
  playbook,
  projectId,
}: {
  playbook: RecommendedPlaybook;
  projectId: string;
}) {
  // Build canonical playbook route with returnTo context
  const playbookHref = buildPlaybookRunHref({
    projectId,
    playbookId: playbook.playbookId,
    step: 'preview',
    source: 'entry',
    extraParams: {
      returnTo: `/projects/${projectId}/issues`,
      returnLabel: 'Issues',
    },
  });

  return (
    <div className="space-y-2">
      {/* Playbook name */}
      <p className="text-sm font-semibold text-foreground">{playbook.name}</p>

      {/* One-line description */}
      <p className="text-xs text-muted-foreground">
        {playbook.oneLineWhatItDoes}
      </p>

      {/* Affects */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">Affects</p>
        <p className="text-xs text-foreground">{playbook.affects}</p>
      </div>

      {/* Preconditions */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">
          Before you proceed
        </p>
        <ul className="mt-1 space-y-0.5">
          {playbook.preconditions.map((precondition, idx) => (
            <li
              key={idx}
              className="text-xs text-muted-foreground flex items-start gap-1.5"
            >
              <span className="text-muted-foreground/60">•</span>
              <span>{precondition}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* [FIXUP-1] CTA: View playbook (uses GuardedLink for unsaved-changes protection) */}
      <GuardedLink
        href={playbookHref}
        className="mt-2 inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
        data-testid="issue-rcp-view-playbook-cta"
      >
        View playbook
      </GuardedLink>
    </div>
  );
}

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

  // [FIXUP-3][FIXUP-4] Derive actionability label and guidance
  // FIXUP-4: isActionableNow must be explicitly true to be actionable; undefined treated as blocked
  const getActionabilityInfo = () => {
    if (issue.actionability === 'informational') {
      return {
        label: 'Informational — outside EngineO.ai control',
        guidance:
          'EngineO.ai cannot take direct action on this issue. You can review the context in the Work Canvas for more information.',
      };
    }
    // FIXUP-4: Only treat as actionable when explicitly true (not undefined)
    if (issue.isActionableNow === true) {
      return {
        label: 'Actionable now',
        guidance:
          'Actions for this issue can be initiated from the Work Canvas where context and available options are displayed.',
      };
    }
    // FIXUP-4: Blocked label de-speculated (no "permissions" claim)
    return {
      label: 'Blocked — not actionable in this context',
      guidance:
        'This issue cannot be acted upon in the current context. Review the issue details in the Work Canvas for more information.',
    };
  };

  const actionabilityInfo = getActionabilityInfo();

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

  // [FIXUP-3] Render affected assets list (max 6 + overflow)
  // Note: affectedProducts and affectedPages are string arrays (titles or IDs)
  const renderAffectedAssets = () => {
    const hasProducts =
      issue.affectedProducts && issue.affectedProducts.length > 0;
    const hasPages = issue.affectedPages && issue.affectedPages.length > 0;

    if (!hasProducts && !hasPages) {
      return (
        <p className="text-sm text-muted-foreground">
          No affected asset list available.
        </p>
      );
    }

    const maxItems = 6;

    return (
      <div className="space-y-3">
        {hasProducts && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Products
            </p>
            <ul className="space-y-1">
              {issue.affectedProducts!.slice(0, maxItems).map((product, idx) => (
                <li
                  key={`product-${idx}`}
                  className="text-sm text-foreground truncate"
                >
                  {product}
                </li>
              ))}
              {issue.affectedProducts!.length > maxItems && (
                <li className="text-sm text-muted-foreground">
                  + {issue.affectedProducts!.length - maxItems} more
                </li>
              )}
            </ul>
          </div>
        )}
        {hasPages && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Pages
            </p>
            <ul className="space-y-1">
              {issue.affectedPages!.slice(0, maxItems).map((page, idx) => (
                <li
                  key={`page-${idx}`}
                  className="text-sm text-foreground truncate"
                >
                  {page}
                </li>
              ))}
              {issue.affectedPages!.length > maxItems && (
                <li className="text-sm text-muted-foreground">
                  + {issue.affectedPages!.length - maxItems} more
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* [FIXUP-3] Issue Summary */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Issue Summary
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {issue.title}
        </p>
        {issue.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {issue.description}
          </p>
        )}
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

      {/* [FIXUP-3] Why This Matters - truthful fallback */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Why This Matters
        </p>
        {issue.whyItMatters ? (
          <p className="mt-1 text-sm text-foreground">{issue.whyItMatters}</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Not available for this issue.
          </p>
        )}
      </div>

      {/* [FIXUP-3] Actionability (replaces Status) */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Actionability
        </p>
        <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {actionabilityInfo.label}
        </span>
        <p className="mt-2 text-xs text-muted-foreground">
          {actionabilityInfo.guidance}
        </p>
      </div>

      {/* [ISSUE-TO-ACTION-GUIDANCE-1] Recommended action section */}
      <RecommendedActionSection
        issue={issue}
        projectId={projectId}
      />

      {/* [FIXUP-3] Affected Assets List */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Affected Assets
        </p>
        {renderAffectedAssets()}
      </div>

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

      {/*
       * [ISSUE-TO-ACTION-GUIDANCE-1] Navigation link policy:
       * - NO in-body navigation links EXCEPT the single "View playbook" CTA in the
       *   Recommended action section above.
       * - Header external-link remains the primary navigation affordance for direct issue access.
       * - "View playbook" navigates to playbook page in preview step; does NOT execute any operation.
       */}
    </div>
  );
}
