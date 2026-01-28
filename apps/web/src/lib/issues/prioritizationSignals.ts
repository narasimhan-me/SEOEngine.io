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
 * Get display copy for an impact level.
 * Uses collaborative language that doesn't create false urgency.
 */
export function getImpactLevelCopy(level: DeoIssueImpactLevel): ImpactLevelCopy {
  switch (level) {
    case 'high':
      return {
        label: 'High impact',
        description: 'Addressing this issue may significantly improve your DEO performance',
        iconHint: 'arrow_upward',
        colorHint: 'high',
      };
    case 'medium':
      return {
        label: 'Medium impact',
        description: 'This issue has moderate potential impact on your DEO performance',
        iconHint: 'remove',
        colorHint: 'medium',
      };
    case 'low':
      return {
        label: 'Low impact',
        description: 'This issue has minor impact on your overall DEO performance',
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
 * Derive prioritization factors from issue data.
 * Returns transparent, explainable factors in plain language.
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
        label: 'Affects many items',
        explanation: `This issue affects ${issue.count} products or pages, so fixing it could have broad impact.`,
        direction: 'increases',
      });
    } else if (issue.count >= 3) {
      factors.push({
        factorId: 'moderate_affected_count',
        label: 'Affects multiple items',
        explanation: `This issue affects ${issue.count} products or pages.`,
        direction: 'increases',
      });
    }
  }

  // Factor: Severity
  if (issue.severity === 'critical') {
    factors.push({
      factorId: 'critical_severity',
      label: 'Marked as critical',
      explanation: 'This issue type is categorized as critical based on its potential impact on discoverability.',
      direction: 'increases',
    });
  }

  // Factor: DEO component impact
  if (issue.deoComponentKey) {
    const componentLabels: Record<string, string> = {
      content_quality: 'content quality',
      entity_strength: 'entity recognition',
      technical_health: 'technical health',
      visibility_signals: 'visibility',
      answerability: 'AI answer potential',
    };
    const componentLabel = componentLabels[issue.deoComponentKey] || issue.deoComponentKey;
    factors.push({
      factorId: 'deo_component_impact',
      label: `Impacts ${componentLabel}`,
      explanation: `Resolving this issue may improve your ${componentLabel} score.`,
      direction: 'increases',
    });
  }

  // Factor: Easy to fix (positive - can be addressed quickly)
  if (issue.aiFixable || issue.fixCost === 'one_click') {
    factors.push({
      factorId: 'easy_to_fix',
      label: 'Quick to address',
      explanation: 'This issue can be resolved with minimal effort using available tools.',
      direction: 'increases',
    });
  }

  // Factor: Requires manual work (context, not negative)
  if (issue.fixCost === 'manual') {
    factors.push({
      factorId: 'manual_effort',
      label: 'Requires manual review',
      explanation: 'This issue may need your attention to review and address appropriately.',
      direction: 'decreases',
    });
  }

  return factors;
}

/**
 * Derive priority rationale from issue data and factors.
 * Returns plain-language explanation of why issue is prioritized.
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

  // Start with impact-based intro
  const impactLevel = deriveImpactLevel(issue.deoImpactEstimate);
  if (impactLevel === 'high') {
    parts.push('Consider addressing this issue soon');
  } else if (impactLevel === 'medium') {
    parts.push('This issue may be worth reviewing');
  } else {
    parts.push('This issue has been identified');
  }

  // Add key factors
  const increasingFactors = factors.filter(f => f.direction === 'increases');
  if (increasingFactors.length > 0) {
    const factorLabels = increasingFactors.slice(0, 2).map(f => f.label.toLowerCase());
    if (factorLabels.length === 1) {
      parts.push(`because it ${factorLabels[0]}`);
    } else {
      parts.push(`because it ${factorLabels.join(' and ')}`);
    }
  }

  return parts.join(' ') + '.';
}
