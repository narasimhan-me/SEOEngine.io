'use client';

import { useState, useCallback } from 'react';
import type { RecommendedPlaybook } from '@/lib/issue-to-action-guidance';

/**
 * [EA-47] Explanation type for visual distinction between facts and recommendations
 */
type ExplanationType = 'observation' | 'recommendation';

/**
 * [EA-41: ISSUE-TO-ACTION-GUIDANCE-1] Issue-to-Action Guidance Panel
 * [EA-47] Enhanced with clear visual separation between observations and recommendations
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
          <span className="text-primary flex-shrink-0" aria-hidden="true">💡</span>
          <span className="text-xs font-medium text-foreground truncate">
            Guidance Available
          </span>
          {/* [EA-45] Signal category badge for clear distinction */}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 flex-shrink-0">
            Advisory
          </span>
          <span className="text-muted-foreground flex-shrink-0 text-[10px]" aria-hidden="true">
            {isExpanded ? '▲' : '▼'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0 ml-2"
          aria-label="Dismiss guidance"
          data-testid="dismiss-guidance-button"
        >
          <span aria-hidden="true">✕</span>
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

          {/* [EA-45][EA-47] Trust reminder with explicit non-execution language */}
          <p className="text-[10px] text-muted-foreground/70 pt-2 border-t border-border">
            <span className="font-medium">This is informational only.</span>{' '}
            Reading this guidance does not trigger any action. You decide if and when to act.
            Nothing happens until you explicitly choose to run a playbook.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * [EA-47] Explanation Type Badge for visual distinction
 * Clearly labels content as observation (fact) vs recommendation (suggestion)
 */
function ExplanationTypeBadge({ type }: { type: ExplanationType }) {
  const config = {
    observation: {
      label: 'Observation',
      icon: '👁',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-600',
      borderClass: 'border-slate-200',
      description: 'What the system observed—factual information',
    },
    recommendation: {
      label: 'Recommendation',
      icon: '⚡',
      bgClass: 'bg-purple-50',
      textClass: 'text-purple-700',
      borderClass: 'border-purple-200',
      description: 'What the system suggests—optional action',
    },
  };

  const { label, icon, bgClass, textClass, borderClass, description } = config[type];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${bgClass} ${textClass} ${borderClass}`}
      title={description}
      data-testid={`explanation-type-badge-${type}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

/**
 * Individual recommendation block within the guidance panel.
 * Displays the action name, why it helps, and what it affects.
 * [EA-47] Enhanced with visual separation between observations and recommendations
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

      {/* [EA-47] OBSERVATION SECTION - Factual information */}
      <div className="mt-3 p-2.5 rounded-md border border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-1.5">
          <ExplanationTypeBadge type="observation" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
            What we observed
          </span>
        </div>
        <p className="text-xs text-foreground leading-relaxed">
          {recommendation.whyThisHelps}
        </p>
      </div>

      {/* [EA-47] RECOMMENDATION SECTION - Suggested action */}
      <div className="mt-2.5 p-2.5 rounded-md border border-purple-200 bg-purple-50/30">
        <div className="flex items-center gap-2 mb-1.5">
          <ExplanationTypeBadge type="recommendation" />
          <span className="text-[10px] text-purple-600 uppercase tracking-wider font-medium">
            What you could do
          </span>
        </div>
        <p className="text-xs text-foreground">
          <span className="font-medium">This playbook:</span>{' '}
          <span className="text-muted-foreground">{recommendation.oneLineWhatItDoes}</span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          <span className="font-medium">Would affect:</span> {recommendation.affects}
        </p>
      </div>

      {/* [EA-47] AUTOMATION OUTCOME SECTION - What would happen if automated */}
      {recommendation.automationOutcomeExplanation && (
        <div
          className="mt-2.5 p-2.5 rounded-md border border-amber-200 bg-amber-50/30"
          data-testid="automation-outcome-explanation"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
              If automated
            </span>
            <span className="text-[10px] text-amber-600 italic">
              (reading this does not trigger any action)
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {recommendation.automationOutcomeExplanation}
          </p>
        </div>
      )}

      {/* Preconditions - what user should know */}
      {recommendation.preconditions.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-border/50">
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
