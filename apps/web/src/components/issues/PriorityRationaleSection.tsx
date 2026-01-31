'use client';

import type { PrioritizationFactor, DeoIssueImpactLevel } from '@/lib/issues/prioritizationSignals';
import { deriveConfidenceConsideration } from '@/lib/issues/prioritizationSignals';
import { ImpactIndicator } from './ImpactIndicator';
import { LearnMoreInline } from './LearnMoreInline';

/**
 * [EA-27: PRIORITIZATION-SIGNAL-ENRICHMENT-1] Priority Rationale Section
 * [EA-36: CONTEXTUAL-EDUCATION-1] Enhanced with inline contextual education
 *
 * Displays transparent prioritization reasoning for an issue.
 * Shows:
 * - Impact indicator
 * - Priority rationale in plain language
 * - Contributing factors (expandable)
 * - Confidence consideration
 * - Contextual education (optional, non-blocking)
 *
 * All signals are advisory, never prescriptive.
 */

interface PriorityRationaleSectionProps {
  /** Impact level indicator */
  impactLevel?: DeoIssueImpactLevel;
  /** Plain-language priority rationale */
  priorityRationale?: string;
  /** Factors contributing to prioritization */
  prioritizationFactors?: PrioritizationFactor[];
  /** Confidence score for deriving consideration text */
  confidence?: number | null;
  /** Pre-computed confidence consideration text */
  confidenceConsideration?: string;
  /** Whether this is a compact inline view */
  compact?: boolean;
  /** [EA-36] Issue key for contextual education lookup */
  issueKey?: string;
  /** [EA-36] Whether to show contextual education */
  showEducation?: boolean;
}

export function PriorityRationaleSection({
  impactLevel,
  priorityRationale,
  prioritizationFactors,
  confidence,
  confidenceConsideration,
  compact = false,
  issueKey,
  showEducation = true,
}: PriorityRationaleSectionProps) {
  // Derive confidence consideration if not provided
  const displayConfidence = confidenceConsideration || deriveConfidenceConsideration(confidence);

  // Don't render if no prioritization data
  if (!impactLevel && !priorityRationale && (!prioritizationFactors || prioritizationFactors.length === 0)) {
    return null;
  }

  if (compact) {
    // Compact inline view for issue cards
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {impactLevel && <ImpactIndicator impactLevel={impactLevel} size="sm" />}
        {priorityRationale && (
          <span className="text-[10px] text-muted-foreground">{priorityRationale}</span>
        )}
      </div>
    );
  }

  // Full section view for RCP
  return (
    <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Priority Considerations
      </p>

      {/* Impact indicator */}
      {impactLevel && (
        <div className="mt-2">
          <ImpactIndicator impactLevel={impactLevel} size="md" showLabel={true} />
        </div>
      )}

      {/* Priority rationale */}
      {priorityRationale && (
        <p className="mt-2 text-sm text-foreground">{priorityRationale}</p>
      )}

      {/* Confidence consideration */}
      <p className="mt-2 text-xs text-muted-foreground italic">{displayConfidence}</p>

      {/* Contributing factors */}
      {prioritizationFactors && prioritizationFactors.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            Factors considered
          </p>
          <ul className="space-y-1">
            {prioritizationFactors.map((factor) => (
              <li
                key={factor.factorId}
                className="text-xs text-muted-foreground flex items-start gap-1.5"
                title={factor.explanation}
              >
                <span className="text-muted-foreground/60">
                  {factor.direction === 'increases' ? '↑' : '↓'}
                </span>
                <span>{factor.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* [EA-36: CONTEXTUAL-EDUCATION-1] Inline contextual education */}
      {showEducation && issueKey && (
        <LearnMoreInline issueKey={issueKey} />
      )}

      {/* [EA-30: AI-ASSIST-ENTRY-POINTS-1] Advisory note with supportive language */}
      <p className="mt-3 text-[10px] text-muted-foreground/70">
        These are optional considerations based on available data. You know your business best—you might address issues in whatever order makes sense for your priorities.
      </p>
    </div>
  );
}
