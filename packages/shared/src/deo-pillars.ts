/**
 * DEO Pillars - Canonical pillar definitions for Discovery Engine Optimization
 *
 * These 8 pillars represent the authoritative grouping for all DEO issues,
 * scores, and recommendations across the EngineO.ai platform.
 */

/**
 * Canonical DEO Pillar IDs - stable, lowercase, underscore-separated
 */
export type DeoPillarId =
  | 'metadata_snippet_quality'
  | 'content_commerce_signals'
  | 'media_accessibility'
  | 'search_intent_fit'
  | 'competitive_positioning'
  | 'offsite_signals'
  | 'local_discovery'
  | 'technical_indexability';

/**
 * DEO Pillar definition interface
 */
export interface DeoPillar {
  /** Canonical pillar ID */
  id: DeoPillarId;
  /** User-facing pillar name */
  label: string;
  /** Tab label / compact form */
  shortName: string;
  /** What this pillar covers */
  description: string;
  /** Short copy explaining why this pillar matters */
  whyItMatters: string;
  /** Whether this pillar is coming soon (limited functionality) */
  comingSoon: boolean;
}

/**
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] Canonical DEO Pillars array
 * All whyItMatters explanations use clear, accessible language for non-expert users.
 *
 * Pillars marked with comingSoon: false have full functionality implemented:
 * - metadata_snippet_quality
 * - content_commerce_signals
 * - search_intent_fit (SEARCH-INTENT-1)
 * - competitive_positioning (COMPETITORS-1)
 * - offsite_signals (OFFSITE-1)
 * - local_discovery (LOCAL-1)
 * - technical_indexability
 *
 * All other pillars are coming soon with placeholder functionality.
 */
export const DEO_PILLARS: DeoPillar[] = [
  {
    id: 'metadata_snippet_quality',
    label: 'Titles & Descriptions',
    shortName: 'Metadata',
    description:
      'The titles, descriptions, and structured information that control how your pages appear in search results.',
    whyItMatters:
      "Good titles and descriptions help your pages stand out in search results and give customers a clear preview of what they'll find. They also help AI assistants accurately describe your content when answering questions.",
    comingSoon: false,
  },
  {
    id: 'content_commerce_signals',
    label: 'Product Content',
    shortName: 'Content',
    description:
      'The depth and quality of your product descriptions, including key details that help customers understand what you sell.',
    whyItMatters:
      'Detailed product content helps customers make informed decisions and helps search engines match your products with what people are looking for. Products with thorough descriptions are more likely to appear in relevant searches.',
    comingSoon: false,
  },
  {
    id: 'media_accessibility',
    label: 'Images & Accessibility',
    shortName: 'Media',
    description:
      'Product images and the descriptive text that helps search engines and screen readers understand your visual content.',
    whyItMatters:
      'Product images with good descriptions can appear in image search and help AI assistants recommend your products. Descriptive image text also makes your site accessible to customers using screen readers.',
    comingSoon: false,
  },
  {
    id: 'search_intent_fit',
    label: 'Search Matching',
    shortName: 'Search & Intent',
    description:
      'How well your content matches the different ways customers search for products like yours, including questions they might ask AI assistants.',
    whyItMatters:
      'Customers search in different ways—some want to compare products, others want to solve a problem, and some are ready to buy. Content that addresses these different needs is more likely to appear when customers search.',
    comingSoon: false,
  },
  {
    id: 'competitive_positioning',
    label: 'Competitive Completeness',
    shortName: 'Competitors',
    description:
      'How your product content compares to what customers typically find when shopping for similar products.',
    whyItMatters:
      'Customers often compare products before buying. Having comprehensive information—like comparisons, use cases, and trust signals—helps your products compete when customers are researching their options.',
    comingSoon: false,
  },
  {
    id: 'offsite_signals',
    label: 'External Presence',
    shortName: 'Off-site',
    description:
      "Your brand's presence on external sites like review platforms, directories, and comparison sites that build credibility.",
    whyItMatters:
      'When your brand appears on trusted external sites, it builds credibility with both customers and search engines. AI assistants also look at external sources when deciding which brands to recommend.',
    comingSoon: false,
  },
  {
    id: 'local_discovery',
    label: 'Local Presence',
    shortName: 'Local',
    description:
      'How easily local customers can find you through location-based searches. Only relevant for businesses serving specific geographic areas.',
    whyItMatters:
      "If you serve specific locations, local search is how nearby customers find you. Clear location information helps you appear in 'near me' searches and local recommendations. This doesn't apply to businesses that ship everywhere.",
    comingSoon: false,
  },
  {
    id: 'technical_indexability',
    label: 'Site Accessibility',
    shortName: 'Technical',
    description:
      'Whether search engines can successfully access, read, and understand all your pages.',
    whyItMatters:
      'Search engines need to access your pages before they can show them in results. Fast-loading, error-free pages provide better experiences for both visitors and search engines.',
    comingSoon: false,
  },
];

/**
 * Helper to get a pillar by ID
 */
export function getDeoPillarById(id: DeoPillarId): DeoPillar | undefined {
  return DEO_PILLARS.find((pillar) => pillar.id === id);
}

/**
 * Helper to get all active (non-coming-soon) pillars
 */
export function getActiveDeoPillars(): DeoPillar[] {
  return DEO_PILLARS.filter((pillar) => !pillar.comingSoon);
}
