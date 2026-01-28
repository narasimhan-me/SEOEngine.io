/**
 * [EA-27: PRIORITIZATION-SIGNAL-ENRICHMENT-1] Prioritization Signal Helpers
 *
 * Utilities for deriving and displaying issue prioritization signals.
 * All signals are:
 * - Advisory, not prescriptive
 * - Transparent and explainable
 * - Framed qualitatively, not with numerical precision
 */

/**
 * Impact level indicator for visual display.
 * Expressed as qualitative level rather than numerical score.
 */
export type DeoIssueImpactLevel = 'high' | 'medium' | 'low';

/**
 * Prioritization factor contributing to issue ordering.
 * Each factor is transparent and explained in plain language.
 */
export interface PrioritizationFactor {
  factorId: string;
  label: string;
  explanation: string;
  direction: 'increases' | 'decreases';
}

/**
 * User preference for issue priority (for dismissal/override).
 */
export interface IssuePriorityPreference {
  dismissed: boolean;
  userPriority?: 'high' | 'medium' | 'low' | null;
  modifiedAt?: string;
}

/**
 * Copy/display metadata for impact levels.
 * Uses collaborative, non-alarming language.
 */
export interface ImpactLevelCopy {
  /** Display label (e.g., "High impact") */
  label: string;
  /** Short description for tooltips */
  description: string;
  /** Icon hint for consistent visual display */
  iconHint: 'arrow_upward' | 'remove' | 'arrow_downward';
  /** CSS color class hint (uses design tokens) */
  colorHint: 'high' | 'medium' | 'low';
}

/**
 * Derive impact level from deoImpactEstimate (0-100).
 * Uses thresholds that avoid false precision:
 * - High: 60+ (significant impact on DEO)
 * - Medium: 30-59 (moderate impact)
 * - Low: 0-29 (minor impact)
 */
export function deriveImpactLevel(
  deoImpactEstimate: number | undefined | null
): DeoIssueImpactLevel {
  if (deoImpactEstimate == null) {
    return 'low'; // Conservative default when no data
  }
  if (deoImpactEstimate >= 60) {
    return 'high';
  }
  if (deoImpactEstimate >= 30) {
    return 'medium';
  }
  return 'low';
}

/**
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] Get display copy for an impact level.
 * Uses helpful, non-prescriptive language.
 */
export function getImpactLevelCopy(level: DeoIssueImpactLevel): ImpactLevelCopy {
  switch (level) {
    case 'high':
      return {
        label: 'Higher priority',
        description: 'Addressing this issue could meaningfully improve how customers discover your content',
        iconHint: 'arrow_upward',
        colorHint: 'high',
      };
    case 'medium':
      return {
        label: 'Worth reviewing',
        description: 'This issue may be affecting how some customers find your content',
        iconHint: 'remove',
        colorHint: 'medium',
      };
    case 'low':
      return {
        label: 'Lower priority',
        description: 'This is a smaller issue that you can address when time permits',
        iconHint: 'arrow_downward',
        colorHint: 'low',
      };
  }
}

/**
 * Derive confidence consideration from confidence score (0-1).
 * Uses qualitative language rather than percentages.
 */
export function deriveConfidenceConsideration(
  confidence: number | undefined | null
): string {
  if (confidence == null) {
    return 'Based on available information';
  }
  if (confidence >= 0.8) {
    return 'Several strong indicators suggest this issue';
  }
  if (confidence >= 0.5) {
    return 'Multiple factors point to this issue';
  }
  if (confidence >= 0.3) {
    return 'Some signals suggest this may be an issue';
  }
  return 'Based on limited information available';
}

/**
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] Derive prioritization factors from issue data.
 * Returns transparent, explainable factors using helpful, non-alarmist language.
 */
export function derivePrioritizationFactors(issue: {
  count?: number;
  severity?: 'critical' | 'warning' | 'info';
  deoImpactEstimate?: number | null;
  deoComponentKey?: string | null;
  aiFixable?: boolean;
  fixCost?: 'one_click' | 'manual' | 'advanced';
}): PrioritizationFactor[] {
  const factors: PrioritizationFactor[] = [];

  // Factor: Affected count
  if (issue.count != null && issue.count > 0) {
    if (issue.count >= 10) {
      factors.push({
        factorId: 'high_affected_count',
        label: 'Applies to many items',
        explanation: `This applies to ${issue.count} products or pages, so addressing it could benefit a larger portion of your catalog.`,
        direction: 'increases',
      });
    } else if (issue.count >= 3) {
      factors.push({
        factorId: 'moderate_affected_count',
        label: 'Applies to several items',
        explanation: `This applies to ${issue.count} products or pages.`,
        direction: 'increases',
      });
    }
  }

  // Factor: Severity
  if (issue.severity === 'critical') {
    factors.push({
      factorId: 'critical_severity',
      label: 'Commonly addressed first',
      explanation: 'This type of issue is typically prioritized because it can affect how customers discover your content.',
      direction: 'increases',
    });
  }

  // Factor: DEO component impact
  if (issue.deoComponentKey) {
    const componentLabels: Record<string, string> = {
      content_quality: 'content completeness',
      entity_strength: 'product information',
      technical_health: 'site accessibility',
      visibility_signals: 'search visibility',
      answerability: 'AI recommendations',
    };
    const componentLabel = componentLabels[issue.deoComponentKey] || issue.deoComponentKey;
    factors.push({
      factorId: 'deo_component_impact',
      label: `Related to ${componentLabel}`,
      explanation: `Addressing this may improve your ${componentLabel}.`,
      direction: 'increases',
    });
  }

  // Factor: Easy to fix (positive - can be addressed quickly)
  if (issue.aiFixable || issue.fixCost === 'one_click') {
    factors.push({
      factorId: 'easy_to_fix',
      label: 'Quick to address',
      explanation: 'You can address this with a few clicks using the available tools.',
      direction: 'increases',
    });
  }

  // Factor: Requires manual work (context, not negative)
  if (issue.fixCost === 'manual') {
    factors.push({
      factorId: 'manual_effort',
      label: 'Benefits from your review',
      explanation: 'This works best when you review and customize the changes for your specific needs.',
      direction: 'decreases',
    });
  }

  return factors;
}

/**
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] Derive priority rationale from issue data and factors.
 * Returns plain-language explanation using helpful, advisory tone.
 */
export function derivePriorityRationale(
  issue: {
    title?: string;
    count?: number;
    severity?: 'critical' | 'warning' | 'info';
    deoImpactEstimate?: number | null;
    deoComponentKey?: string | null;
  },
  factors: PrioritizationFactor[]
): string {
  const parts: string[] = [];

  // Start with impact-based intro using advisory language
  const impactLevel = deriveImpactLevel(issue.deoImpactEstimate);
  if (impactLevel === 'high') {
    parts.push('You may want to look at this');
  } else if (impactLevel === 'medium') {
    parts.push('This could be worth reviewing');
  } else {
    parts.push('This has been noted');
  }

  // Add key factors with natural language
  const increasingFactors = factors.filter(f => f.direction === 'increases');
  if (increasingFactors.length > 0) {
    const factorLabels = increasingFactors.slice(0, 2).map(f => f.label.toLowerCase());
    if (factorLabels.length === 1) {
      parts.push(`since it ${factorLabels[0]}`);
    } else {
      parts.push(`since it ${factorLabels.join(' and ')}`);
    }
  }

  return parts.join(' ') + '.';
}
