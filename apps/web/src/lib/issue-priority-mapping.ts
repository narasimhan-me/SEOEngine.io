/**
 * [EA-46: PRIORITY-SIGNALS-2] Issue Type to Priority Signal Mapping
 *
 * Maps DEO issue types to their priority signals with full transparency.
 * Each issue type has predefined factors explaining its prioritization.
 *
 * Trust Contract:
 * - All mappings are visible and documented
 * - No hidden logic influences these mappings
 * - Users can see exactly why each issue type has its priority
 */

import {
  type PrioritySignal,
  type PriorityFactor,
  COMMON_PRIORITY_FACTORS,
  buildPrioritySignal,
} from './priority-signals';

/**
 * Issue-specific priority factors beyond common ones.
 */
const ISSUE_SPECIFIC_FACTORS: Record<string, PriorityFactor> = {
  titleMissing: {
    label: 'Missing critical element',
    explanation: 'Page titles are essential for search visibility and user orientation',
    weight: 'high',
    category: 'visibility',
  },
  descriptionMissing: {
    label: 'Search snippet affected',
    explanation: 'Meta descriptions influence click-through rates from search results',
    weight: 'medium',
    category: 'visibility',
  },
  contentThin: {
    label: 'Content depth issue',
    explanation: 'Thin content may not satisfy user intent or AI information needs',
    weight: 'medium',
    category: 'coverage',
  },
  entityGap: {
    label: 'Entity recognition gap',
    explanation: 'Missing entities reduce AI systems\' ability to understand content',
    weight: 'medium',
    category: 'trust',
  },
  answerabilityWeak: {
    label: 'Answer extraction difficulty',
    explanation: 'Content structure makes it harder for AI to extract direct answers',
    weight: 'medium',
    category: 'visibility',
  },
  duplicateContent: {
    label: 'Duplicate content signal',
    explanation: 'May cause search engines to choose wrong canonical or split signals',
    weight: 'high',
    category: 'technical',
  },
  productDepth: {
    label: 'Product detail gap',
    explanation: 'Products need comprehensive details for AI shopping assistants',
    weight: 'medium',
    category: 'coverage',
  },
};

/**
 * Configuration for each issue type's priority signal.
 */
interface IssuePriorityConfig {
  factors: PriorityFactor[];
  impactSummary: string;
  comparisonContext?: string;
}

/**
 * Priority configurations by issue key.
 * Each configuration explains exactly why the issue has its priority.
 */
const ISSUE_PRIORITY_CONFIGS: Record<string, IssuePriorityConfig> = {
  missing_seo_title: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.titleMissing,
      COMMON_PRIORITY_FACTORS.searchRankingFactor,
      COMMON_PRIORITY_FACTORS.aiVisibility,
    ],
    impactSummary: 'Missing titles significantly reduce search visibility and prevent AI systems from properly identifying page content.',
    comparisonContext: 'Ranked higher than description issues because titles are the primary identifier in search results.',
  },
  missing_seo_description: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.descriptionMissing,
      COMMON_PRIORITY_FACTORS.quickWin,
    ],
    impactSummary: 'Missing descriptions reduce click-through rates from search results but don\'t prevent indexing.',
    comparisonContext: 'Ranked lower than title issues because search engines can generate descriptions from content.',
  },
  weak_title: {
    factors: [
      COMMON_PRIORITY_FACTORS.searchRankingFactor,
      COMMON_PRIORITY_FACTORS.aiVisibility,
    ],
    impactSummary: 'Weak titles reduce search result prominence and may not clearly communicate page value.',
  },
  weak_description: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.descriptionMissing,
    ],
    impactSummary: 'Generic descriptions don\'t differentiate your content in search results.',
  },
  thin_content: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.contentThin,
      COMMON_PRIORITY_FACTORS.coverageGap,
      COMMON_PRIORITY_FACTORS.aiVisibility,
    ],
    impactSummary: 'Limited content may not satisfy search intent or provide enough detail for AI systems.',
    comparisonContext: 'Priority increases for pages with high traffic potential.',
  },
  missing_long_description: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.productDepth,
      COMMON_PRIORITY_FACTORS.revenueImpact,
    ],
    impactSummary: 'Products without detailed descriptions leave purchase questions unanswered.',
  },
  duplicate_product_content: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.duplicateContent,
      COMMON_PRIORITY_FACTORS.searchRankingFactor,
    ],
    impactSummary: 'Duplicate content splits ranking signals and may confuse search engines about canonical pages.',
    comparisonContext: 'Higher priority when multiple products share identical descriptions.',
  },
  low_entity_coverage: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.entityGap,
      COMMON_PRIORITY_FACTORS.trustSignal,
    ],
    impactSummary: 'Low entity coverage reduces how well AI systems understand and represent your content.',
  },
  low_product_entity_coverage: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.entityGap,
      COMMON_PRIORITY_FACTORS.revenueImpact,
      COMMON_PRIORITY_FACTORS.aiVisibility,
    ],
    impactSummary: 'Products need clear entity information for AI shopping assistants to surface them appropriately.',
  },
  product_content_depth: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.productDepth,
      COMMON_PRIORITY_FACTORS.coverageGap,
      COMMON_PRIORITY_FACTORS.revenueImpact,
    ],
    impactSummary: 'Shallow product content doesn\'t answer detailed questions from AI shopping assistants.',
  },
  answer_surface_weakness: {
    factors: [
      ISSUE_SPECIFIC_FACTORS.answerabilityWeak,
      COMMON_PRIORITY_FACTORS.aiVisibility,
    ],
    impactSummary: 'Content structure makes it difficult for AI systems to extract and cite direct answers.',
  },
};

/**
 * Default priority config for unknown issue types.
 */
const DEFAULT_PRIORITY_CONFIG: IssuePriorityConfig = {
  factors: [COMMON_PRIORITY_FACTORS.quickWin],
  impactSummary: 'Addressing this issue improves overall content quality.',
};

/**
 * Get the priority signal for a specific issue type.
 * Returns a complete signal with all factors visible to the user.
 *
 * @param issueKey - The issue type key (e.g., 'missing_seo_title')
 * @param additionalFactors - Optional additional factors based on context (e.g., page traffic)
 */
export function getIssuePrioritySignal(
  issueKey: string,
  additionalFactors?: PriorityFactor[]
): PrioritySignal {
  const config = ISSUE_PRIORITY_CONFIGS[issueKey] ?? DEFAULT_PRIORITY_CONFIG;

  const allFactors = additionalFactors
    ? [...config.factors, ...additionalFactors]
    : config.factors;

  return buildPrioritySignal(
    allFactors,
    config.impactSummary,
    config.comparisonContext
  );
}

/**
 * Get priority signals for multiple issues, sorted by priority.
 * Useful for displaying a prioritized list with explanations.
 */
export function getPrioritizedIssueSignals(
  issueKeys: string[]
): Array<{ issueKey: string; signal: PrioritySignal }> {
  const priorityOrder: Record<PrioritySignal['level'], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return issueKeys
    .map(issueKey => ({
      issueKey,
      signal: getIssuePrioritySignal(issueKey),
    }))
    .sort((a, b) => priorityOrder[a.signal.level] - priorityOrder[b.signal.level]);
}
