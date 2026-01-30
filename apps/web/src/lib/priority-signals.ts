/**
 * [EA-46: PRIORITY-SIGNALS-1] Priority Signals with Impact Framing
 *
 * Provides transparent prioritization context for issues and recommendations.
 * All weighting factors are visible to users with clear explanations.
 *
 * Trust Contract:
 * - No hidden weighting logic: all factors influencing priority are visible
 * - Explanations are honest about confidence levels—never overstate certainty
 * - Priority signals are informational guidance, not automated decisions
 * - No silent changes to how priorities are calculated or displayed
 */

/**
 * Confidence level for priority signals.
 * Indicates how certain the system is about the priority ranking.
 */
export type PriorityConfidence = 'high' | 'medium' | 'low';

/**
 * Impact category explaining why something is prioritized.
 */
export type ImpactCategory =
  | 'visibility' // Affects how content appears in search/AI results
  | 'traffic' // Directly impacts traffic potential
  | 'conversion' // Affects user conversion likelihood
  | 'trust' // Impacts trust signals for AI systems
  | 'coverage' // Affects content coverage gaps
  | 'technical'; // Technical SEO factors

/**
 * A single factor contributing to priority ranking.
 * All factors are transparent and user-visible.
 */
export interface PriorityFactor {
  /** Human-readable label for the factor */
  label: string;
  /** Brief explanation of why this factor matters */
  explanation: string;
  /** Relative weight contribution (for display, not hidden calculation) */
  weight: 'high' | 'medium' | 'low';
  /** The category this factor belongs to */
  category: ImpactCategory;
}

/**
 * Complete priority signal with transparent framing.
 * Contains all information needed for users to understand prioritization.
 */
export interface PrioritySignal {
  /** Overall priority level */
  level: 'critical' | 'high' | 'medium' | 'low';
  /** Confidence in this priority assessment */
  confidence: PriorityConfidence;
  /** Human-readable summary of why this is prioritized */
  impactSummary: string;
  /** All factors contributing to this priority (transparent, not hidden) */
  factors: PriorityFactor[];
  /** Optional: comparison context explaining relative ranking */
  comparisonContext?: string;
}

/**
 * Labels for confidence levels with honest framing.
 */
export const CONFIDENCE_LABELS: Record<PriorityConfidence, string> = {
  high: 'High confidence',
  medium: 'Moderate confidence',
  low: 'Limited data available',
};

/**
 * Descriptions explaining what each confidence level means.
 */
export const CONFIDENCE_DESCRIPTIONS: Record<PriorityConfidence, string> = {
  high: 'Based on strong signals and historical patterns',
  medium: 'Based on available data with some uncertainty',
  low: 'Limited data—consider additional context when prioritizing',
};

/**
 * Labels for impact categories.
 */
export const IMPACT_CATEGORY_LABELS: Record<ImpactCategory, string> = {
  visibility: 'Search & AI Visibility',
  traffic: 'Traffic Potential',
  conversion: 'Conversion Impact',
  trust: 'Trust Signals',
  coverage: 'Content Coverage',
  technical: 'Technical SEO',
};

/**
 * Priority level labels with clear meaning.
 */
export const PRIORITY_LEVEL_LABELS: Record<PrioritySignal['level'], string> = {
  critical: 'Critical Priority',
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Lower Priority',
};

/**
 * Get a human-readable explanation for a priority signal.
 * This is the primary text users see explaining prioritization.
 */
export function getPriorityExplanation(signal: PrioritySignal): string {
  const levelLabel = PRIORITY_LEVEL_LABELS[signal.level];
  const confidenceLabel = CONFIDENCE_LABELS[signal.confidence];

  return `${levelLabel} (${confidenceLabel}): ${signal.impactSummary}`;
}

/**
 * Get formatted factor list for display.
 * Shows all contributing factors with their weights transparently.
 */
export function getFactorsSummary(factors: PriorityFactor[]): string {
  if (factors.length === 0) {
    return 'No specific factors identified';
  }

  return factors
    .map(f => `• ${f.label} (${f.weight} impact): ${f.explanation}`)
    .join('\n');
}

/**
 * Common priority factors used across issue types.
 * These are reusable building blocks for priority signals.
 */
export const COMMON_PRIORITY_FACTORS: Record<string, PriorityFactor> = {
  highTrafficPage: {
    label: 'High-traffic page',
    explanation: 'This page receives significant traffic, so improvements have greater reach',
    weight: 'high',
    category: 'traffic',
  },
  revenueImpact: {
    label: 'Revenue-generating content',
    explanation: 'This content is associated with conversion paths',
    weight: 'high',
    category: 'conversion',
  },
  aiVisibility: {
    label: 'AI answer surface',
    explanation: 'This content type is frequently surfaced by AI assistants',
    weight: 'medium',
    category: 'visibility',
  },
  searchRankingFactor: {
    label: 'Search ranking signal',
    explanation: 'This element is a known factor in search engine rankings',
    weight: 'medium',
    category: 'technical',
  },
  trustSignal: {
    label: 'Trust indicator',
    explanation: 'Improves how AI systems evaluate content credibility',
    weight: 'medium',
    category: 'trust',
  },
  coverageGap: {
    label: 'Coverage gap',
    explanation: 'Addresses missing content that users or AI systems expect',
    weight: 'medium',
    category: 'coverage',
  },
  quickWin: {
    label: 'Quick improvement',
    explanation: 'Relatively straightforward to address with clear benefit',
    weight: 'low',
    category: 'technical',
  },
};

/**
 * Build a priority signal from a set of factors.
 * Calculates level and confidence based on factor composition.
 */
export function buildPrioritySignal(
  factors: PriorityFactor[],
  impactSummary: string,
  comparisonContext?: string
): PrioritySignal {
  // Determine level based on factor weights
  const highWeightCount = factors.filter(f => f.weight === 'high').length;
  const mediumWeightCount = factors.filter(f => f.weight === 'medium').length;

  let level: PrioritySignal['level'];
  if (highWeightCount >= 2) {
    level = 'critical';
  } else if (highWeightCount >= 1) {
    level = 'high';
  } else if (mediumWeightCount >= 2) {
    level = 'medium';
  } else {
    level = 'low';
  }

  // Determine confidence based on factor count and diversity
  const uniqueCategories = new Set(factors.map(f => f.category)).size;
  let confidence: PriorityConfidence;
  if (factors.length >= 3 && uniqueCategories >= 2) {
    confidence = 'high';
  } else if (factors.length >= 2) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    level,
    confidence,
    impactSummary,
    factors,
    comparisonContext,
  };
}
