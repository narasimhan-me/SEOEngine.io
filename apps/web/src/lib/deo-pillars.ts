/**
 * DEO Pillars - Local copy for web app
 *
 * This is a local copy of the DEO pillars from @engineo/shared to work around
 * Next.js module resolution issues with monorepo workspace packages.
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
      'Product images, alt text coverage, and accessibility attributes that enhance discoverability across visual and voice interfaces. Tracks image alt text quality (missing, generic, good), image coverage, and contextual media usage.',
    whyItMatters:
      'Images with proper alt text improve accessibility and visual/AI search rankings. Missing or generic alt text excludes you from image search, voice assistants, and AI-powered discovery experiences. Good alt text helps AI understand and recommend your products.',
    comingSoon: false,
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
      'How your DEO signals compare to competitors, share of voice in search results, and competitive gap analysis.',
    whyItMatters:
      'Understanding your competitive landscape helps prioritize improvements that will have the greatest impact on your relative visibility and market share.',
    comingSoon: false,
  },
  {
    id: 'offsite_signals',
    label: 'Off-site Signals',
    shortName: 'Off-site',
    description:
      'Brand mentions, authoritative listings, reviews, certifications, and referenceable content that build trust and authority. This pillar focuses on the presence and quality of off-site trust signals — not raw backlink counts or domain authority metrics.',
    whyItMatters:
      'Discovery engines and AI models use off-site trust signals to evaluate brand authority and relevance. Mentions on industry directories, review platforms, and comparison sites increase the likelihood of being cited in AI answers and improve search visibility. Strong off-site presence demonstrates credibility to both algorithms and human buyers.',
    comingSoon: false,
  },
  {
    id: 'local_discovery',
    label: 'Local Discovery',
    shortName: 'Local',
    description:
      'Local intent coverage, location clarity, and local trust signals for stores with physical presence or geographic service areas. This pillar only applies when local discovery is relevant — global-only stores see "Not Applicable" status with no penalty.',
    whyItMatters:
      'For stores serving specific geographic areas, local signals are critical for "near me" searches, city-specific queries, and local AI recommendations. Clear location content and local trust signals help discovery engines match you with nearby customers. Non-local stores are not penalized.',
    comingSoon: false,
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
