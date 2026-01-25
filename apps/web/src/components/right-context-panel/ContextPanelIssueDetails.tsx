'use client';

import { useCallback, useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';
import type { DeoIssue } from '@/lib/deo-issues';
import { DEO_PILLARS } from '@/lib/deo-pillars';
import { getIssueToActionGuidance } from '@/lib/issue-to-action-guidance';
// [ISSUE-FIX-KIND-CLARITY-1 FIXUP-3] Import fix-action-kind helper for RCP copy alignment
import {
  deriveIssueFixActionKind,
  getRcpActionabilitySentence,
} from '@/lib/issues/issueFixActionKind';
// [DRAFT-LIFECYCLE-VISIBILITY-1 PATCH 4] Import draft lifecycle state helpers
import {
  getDraftLifecycleCopy,
  checkSavedDraftInSessionStorage,
  type DraftLifecycleState,
} from '@/lib/issues/draftLifecycleState';

/**
 * [ISSUES-ENGINE-REMOUNT-1] Read-only issue details renderer for RCP.
 * [ISSUES-ENGINE-REMOUNT-1 FIXUP-3] Enhanced with required RCP sections:
 *   - Issue summary (title + description)
 *   - Why this matters (truthful fallback)
 *   - Actionability section with guidance
 *   - Affected assets list (when present)
 * [ISSUE-TO-ACTION-GUIDANCE-1] Added "Automation guidance" section with playbook info.
 * [RIGHT-CONTEXT-PANEL-AUTONOMY-1] NO in-body navigation links.
 *   - Guidance is strictly informational (no CTAs/links)
 *   - Header external-link is the only navigation affordance
 */

interface ContextPanelIssueDetailsProps {
  projectId: string;
  issueId: string;
  initialIssue?: DeoIssue;
  // [DRAFT-LIFECYCLE-VISIBILITY-1 PATCH 4] Optional draft lifecycle state passed from parent
  draftLifecycleState?: string;
}

type LoadState = 'loading' | 'loaded' | 'not_found' | 'error';

/**
 * [ISSUE-TO-ACTION-GUIDANCE-1] Automation guidance section component.
 * [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Strictly informational (NO CTAs/links in body).
 * [ISSUE-TO-ACTION-GUIDANCE-1 FIXUP-1] Trust language alignment:
 *   - Non-actionable states use "Automation Guidance" label (no "Recommended" when nothing to recommend)
 *   - Actionable + mapped states use "Recommended Action" label (recommendation is present)
 * Shows playbook info when issue is actionable and has a mapping.
 * Shows "No automated action available." for informational or blocked issues.
 */
function AutomationGuidanceSection({
  issue,
}: {
  issue: DeoIssue;
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

  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Render playbook info (informational only, no CTAs)
  return (
    <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Recommended Action
      </p>
      <div className="mt-2 space-y-3">
        {guidance.map((playbook) => (
          <PlaybookInfoBlock key={playbook.playbookId} playbook={playbook} />
        ))}
      </div>
    </div>
  );
}

/**
 * [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Informational playbook block (NO navigation CTAs).
 * Displays playbook name, description, affects, and preconditions.
 * Navigation is via RCP header external-link only.
 */
function PlaybookInfoBlock({
  playbook,
}: {
  playbook: { playbookId: string; name: string; oneLineWhatItDoes: string; affects: string; preconditions: string[] };
}) {
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

      {/* [RIGHT-CONTEXT-PANEL-AUTONOMY-1] NO in-body navigation links.
          Header external-link is the only navigation affordance. */}
    </div>
  );
}

export function ContextPanelIssueDetails({
  projectId,
  issueId,
  initialIssue,
  draftLifecycleState: passedDraftLifecycleState,
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

  // [ISSUE-FIX-KIND-CLARITY-1 FIXUP-3] Derive fix-action kind for RCP copy alignment
  // Note: RCP doesn't have a real returnTo path, use a placeholder since destinations only need issue signals
  const fixActionKind = deriveIssueFixActionKind({
    projectId,
    issue,
    returnTo: `/projects/${projectId}/issues`, // Placeholder for RCP context
  });
  const fixActionSentence = getRcpActionabilitySentence(fixActionKind);

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
      {/* [ISSUE-FIX-KIND-CLARITY-1 FIXUP-3] Added fix-action kind sentence for copy alignment */}
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
        {/* [ISSUE-FIX-KIND-CLARITY-1 FIXUP-3] Fix-action kind sentence */}
        <p className="mt-1 text-xs text-muted-foreground italic">
          {fixActionSentence}
        </p>
        {/* [DRAFT-LIFECYCLE-VISIBILITY-1 PATCH 4] Draft lifecycle state line
            [FIXUP-1] Always show draft line (including NO_DRAFT) for complete state visibility */}
        {(() => {
          // Prefer passed-in state when present/valid, otherwise fall back conservatively
          let draftState: DraftLifecycleState = 'NO_DRAFT';
          const validStates: DraftLifecycleState[] = ['NO_DRAFT', 'GENERATED_UNSAVED', 'SAVED_NOT_APPLIED', 'APPLIED'];

          if (passedDraftLifecycleState && validStates.includes(passedDraftLifecycleState as DraftLifecycleState)) {
            draftState = passedDraftLifecycleState as DraftLifecycleState;
          } else if (issue.primaryProductId) {
            // Fall back: check sessionStorage for saved drafts
            const hasSavedInStorage = checkSavedDraftInSessionStorage(
              projectId,
              issue.id,
              issue.primaryProductId,
              ['SEO title', 'SEO description']
            );
            if (hasSavedInStorage) {
              draftState = 'SAVED_NOT_APPLIED';
            }
          }

          // [FIXUP-1] Always render the draft line (removed NO_DRAFT gating)
          const draftCopy = getDraftLifecycleCopy(draftState);
          return (
            <p className="mt-1 text-xs text-muted-foreground" title={draftCopy.description}>
              Draft: {draftCopy.shortLabel}
            </p>
          );
        })()}
      </div>

      {/* [ISSUE-TO-ACTION-GUIDANCE-1][RIGHT-CONTEXT-PANEL-AUTONOMY-1] Automation guidance section (informational only) */}
      <AutomationGuidanceSection issue={issue} />

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
       * [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Navigation link policy:
       * - NO in-body navigation links (all removed)
       * - Header external-link is the only navigation affordance
       * - Guidance sections are strictly informational
       */}
    </div>
  );
}
