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
 * Canonical DEO Pillars array in display order
 *
 * Pillars marked with comingSoon: false have full functionality implemented:
 * - metadata_snippet_quality
 * - content_commerce_signals
 * - search_intent_fit (SEARCH-INTENT-1)
 * - competitive_positioning (COMPETITORS-1)
 * - technical_indexability
 *
 * All other pillars are coming soon with placeholder functionality.
 */
export const DEO_PILLARS: DeoPillar[] = [
  {
    id: 'metadata_snippet_quality',
    label: 'Metadata & Snippet Quality',
    shortName: 'Metadata',
    description:
      'SEO titles, meta descriptions, and structured data that control how your pages appear in search results and AI answer engines.',
    whyItMatters:
      'Well-crafted metadata improves click-through rates from search results and helps AI engines accurately summarize your content. Missing or weak metadata can cause your pages to be overlooked or misrepresented.',
    comingSoon: false,
  },
  {
    id: 'content_commerce_signals',
    label: 'Content & Commerce Signals',
    shortName: 'Content',
    description:
      'Product descriptions, entity coverage, content depth, and semantic richness that help discovery engines understand your offerings.',
    whyItMatters:
      'Rich, entity-dense content helps search and AI engines understand what you sell and match you with relevant queries. Thin or duplicate content reduces your visibility and answer eligibility.',
    comingSoon: false,
  },
  {
    id: 'media_accessibility',
    label: 'Media & Accessibility',
    shortName: 'Media',
    description:
      'Product images, alt text coverage, video presence, and accessibility attributes that enhance discoverability across visual and voice interfaces.',
    whyItMatters:
      'Images with proper alt text improve accessibility and visual search rankings. Missing media or poor accessibility can exclude you from image search, voice assistants, and accessibility-focused users.',
    comingSoon: true,
  },
  {
    id: 'search_intent_fit',
    label: 'Search & Intent Fit',
    shortName: 'Search & Intent',
    description:
      'Query coverage analysis, missing intent detection, and Answer Block readiness for AI-powered answer engines. Identifies gaps in transactional, comparative, and informational query coverage.',
    whyItMatters:
      'Matching search intent increases conversion and featured snippet eligibility. Answer Blocks ensure your products are ready to be cited by AI engines like ChatGPT, Perplexity, and Google AI Overviews.',
    comingSoon: false,
  },
  {
    id: 'competitive_positioning',
    label: 'Competitive Positioning',
    shortName: 'Competitors',
    description:
      'Coverage gaps vs typical competitors in your category. Identifies missing intent coverage, content sections, and trust signals that similar products typically include. Uses ethical, heuristic-based analysis — no scraping or copying competitor content.',
    whyItMatters:
      'Products that cover more search intents and include comprehensive content sections rank higher and convert better. Addressing gaps where competitors likely excel helps you compete on equal footing without copying their content.',
    comingSoon: false,
  },
  {
    id: 'offsite_signals',
    label: 'Off-site Signals',
    shortName: 'Off-site',
    description:
      'Backlinks, brand mentions, citations, and external authority signals that influence your discovery engine rankings.',
    whyItMatters:
      'Off-site signals like backlinks and brand mentions are trust indicators that search and AI engines use to evaluate authority. Strong off-site signals improve rankings and citation likelihood.',
    comingSoon: true,
  },
  {
    id: 'local_discovery',
    label: 'Local Discovery',
    shortName: 'Local',
    description:
      'Local SEO signals, Google Business Profile optimization, local citations, and geographic relevance for location-based queries.',
    whyItMatters:
      'Local signals are critical for businesses serving specific geographic areas. Proper local optimization ensures visibility in "near me" searches and local AI recommendations.',
    comingSoon: true,
  },
  {
    id: 'technical_indexability',
    label: 'Technical & Indexability',
    shortName: 'Technical',
    description:
      'Core Web Vitals, crawl health, indexability status, structured data validation, and technical SEO foundations.',
    whyItMatters:
      'Technical issues can prevent search engines from crawling and indexing your content. Fast, accessible, and properly structured pages rank better and provide better user experiences.',
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
