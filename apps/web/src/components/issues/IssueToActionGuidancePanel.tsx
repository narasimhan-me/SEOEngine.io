'use client';

import { useState, useCallback } from 'react';
import { X, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import type { RecommendedPlaybook } from '@/lib/issue-to-action-guidance';

/**
 * [EA-41: ISSUE-TO-ACTION-GUIDANCE-1] Issue-to-Action Guidance Panel
 *
 * Displays a dismissible guidance panel linking an issue to recommended actions
 * with plain-English explanations of why the action helps.
 *
 * Trust Contract:
 * - Guidance is always optional and dismissible—never modal-blocking
 * - Language uses suggestive framing (e.g., "You might consider...")
 * - No auto-selection or auto-run of any action
 * - User retains full control; guidance informs but never acts
 * - Visually distinct from execution controls
 */

interface IssueToActionGuidancePanelProps {
  /** Issue title for context */
  issueTitle: string;
  /** Recommended playbooks/actions for this issue */
  recommendations: RecommendedPlaybook[];
  /** Callback when panel is dismissed */
  onDismiss?: () => void;
  /** Whether panel starts collapsed */
  defaultCollapsed?: boolean;
  /** Test ID for E2E testing */
  testId?: string;
}

export function IssueToActionGuidancePanel({
  issueTitle,
  recommendations,
  onDismiss,
  defaultCollapsed = false,
  testId = 'issue-to-action-guidance-panel',
}: IssueToActionGuidancePanelProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Don't render if dismissed or no recommendations
  if (isDismissed || recommendations.length === 0) {
    return null;
  }

  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-border bg-[hsl(var(--surface-card))] overflow-hidden"
      role="region"
      aria-label="Action guidance for this issue"
    >
      {/* Header - always visible */}
      <div className="flex items-center justify-between px-3 py-2 bg-[hsl(var(--surface-raised))]">
        <button
          type="button"
          onClick={toggleExpand}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
          aria-expanded={isExpanded}
          aria-controls="guidance-content"
        >
          <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-foreground truncate">
            Guidance Available
          </span>
          {/* [EA-45] Signal category badge for clear distinction */}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 flex-shrink-0">
            Advisory
          </span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0 ml-2"
          aria-label="Dismiss guidance"
          data-testid="dismiss-guidance-button"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Content - collapsible */}
      {isExpanded && (
        <div id="guidance-content" className="px-3 py-3 space-y-3">
          {recommendations.map((recommendation, index) => (
            <GuidanceRecommendation
              key={recommendation.playbookId}
              recommendation={recommendation}
              isFirst={index === 0}
            />
          ))}

          {/* [EA-45] Trust reminder with playbook reference */}
          <p className="text-[10px] text-muted-foreground/70 pt-2 border-t border-border">
            This guidance is based on related playbooks. You decide if and when to take action.
            No signal implies obligation or automatic execution.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Individual recommendation block within the guidance panel.
 * Displays the action name, why it helps, and what it affects.
 */
function GuidanceRecommendation({
  recommendation,
  isFirst,
}: {
  recommendation: RecommendedPlaybook;
  isFirst: boolean;
}) {
  return (
    <div
      className={`${isFirst ? '' : 'pt-3 border-t border-border'}`}
      data-testid="guidance-recommendation"
    >
      {/* Action name with fix type badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">
          {recommendation.name}
        </span>
        <span
          className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          title={recommendation.fixTypeDescription}
        >
          {recommendation.fixTypeLabel}
        </span>
      </div>

      {/* Why this helps - plain English explanation */}
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
        {recommendation.whyThisHelps}
      </p>

      {/* What it does */}
      <p className="mt-1.5 text-xs text-foreground">
        <span className="font-medium">What it does:</span>{' '}
        <span className="text-muted-foreground">{recommendation.oneLineWhatItDoes}</span>
      </p>

      {/* Affects scope */}
      <p className="mt-1 text-[11px] text-muted-foreground">
        <span className="font-medium">Affects:</span> {recommendation.affects}
      </p>

      {/* Preconditions - what user should know */}
      {recommendation.preconditions.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">
            Before you proceed
          </p>
          <ul className="space-y-0.5">
            {recommendation.preconditions.map((precondition, idx) => (
              <li
                key={idx}
                className="text-[10px] text-muted-foreground flex items-start gap-1"
              >
                <span className="text-muted-foreground/60 flex-shrink-0">•</span>
                <span>{precondition}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
