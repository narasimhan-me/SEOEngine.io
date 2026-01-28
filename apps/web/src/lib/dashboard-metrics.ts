/**
 * [DASHBOARD-SIGNAL-REWRITE-1] Dashboard Metrics Configuration
 *
 * Single source of truth for all dashboard metric definitions with:
 * - Clear, human-readable explanations of what each metric measures
 * - "Why it matters" context connecting signals to user outcomes
 * - Distinction between SIGNAL (observation) and RECOMMENDATION (action)
 * - Plain language accessible to non-technical users
 *
 * Trust Contract: Users can always answer "What is this measuring and why should I care?"
 */

/**
 * Metric type classification for visual distinction.
 * - 'signal': An observation or measurement (descriptive, not prescriptive)
 * - 'recommendation': A suggested action based on signals
 */
export type MetricType = 'signal' | 'recommendation';

/**
 * Metric definition with full explanation metadata.
 */
export interface MetricDefinition {
  /** Unique metric identifier */
  id: string;
  /** Human-readable label (no jargon, no ambiguity) */
  label: string;
  /** Short, clear description of what this measures */
  whatItMeasures: string;
  /** Why this metric matters to the user (outcome-focused) */
  whyItMatters: string;
  /** How to interpret the value (what good/bad looks like) */
  howToInterpret: string;
  /** Type: signal (observation) or recommendation (action) */
  type: MetricType;
  /** Technical term this replaces/explains (for SEO-savvy users) */
  technicalTerm?: string;
  /** Data source transparency (where does this number come from) */
  dataSource?: string;
  /** Known limitations or caveats (trust-building transparency) */
  limitations?: string;
}

/**
 * DEO Score component metrics (Content, Entities, Technical, Visibility)
 */
export const DEO_COMPONENT_METRICS: Record<string, MetricDefinition> = {
  content: {
    id: 'content',
    label: 'Content Quality',
    whatItMeasures: 'How complete, detailed, and useful your product descriptions and page content are.',
    whyItMatters: 'Rich, detailed content helps search engines and AI assistants understand what you sell and match you with relevant customer searches.',
    howToInterpret: '80+ is strong coverage. Below 60 means key products may lack enough detail to rank well or be cited by AI.',
    type: 'signal',
    technicalTerm: 'Content coverage, depth, and freshness',
    dataSource: 'Analysis of your product titles, descriptions, and page content',
  },
  entities: {
    id: 'entities',
    label: 'Product Identity',
    whatItMeasures: 'How clearly your products are identified with consistent names, categories, and attributes.',
    whyItMatters: 'Clear product identity helps search engines confidently display your products and helps AI understand exactly what you sell.',
    howToInterpret: '80+ means your products are well-identified. Below 60 suggests inconsistent or unclear product information.',
    type: 'signal',
    technicalTerm: 'Entity coverage, accuracy, and linkage',
    dataSource: 'Analysis of product titles, categories, and structured data',
  },
  technical: {
    id: 'technical',
    label: 'Site Health',
    whatItMeasures: 'Whether search engines can successfully access and understand your pages.',
    whyItMatters: 'Technical issues can prevent your pages from appearing in search results entirely, no matter how good your content is.',
    howToInterpret: '80+ means no major access issues. Below 60 indicates problems that may be blocking search engines.',
    type: 'signal',
    technicalTerm: 'Crawl health, indexability, HTML quality',
    dataSource: 'Automated crawl of your site checking for access issues',
  },
  visibility: {
    id: 'visibility',
    label: 'Search Readiness',
    whatItMeasures: 'How prepared your pages are to appear prominently in search results and AI answers.',
    whyItMatters: 'Well-prepared pages are more likely to appear in featured snippets, AI answers, and prominent search positions.',
    howToInterpret: '80+ means strong readiness. Below 60 suggests your pages may be missing elements that help them stand out in search.',
    type: 'signal',
    technicalTerm: 'SERP readiness, answer surface presence, brand navigational strength',
    dataSource: 'Analysis of metadata, structured data, and content formatting',
  },
};

/**
 * Individual signal metrics for the signals summary panel
 */
export const DEO_SIGNAL_METRICS: Record<string, MetricDefinition> = {
  // Crawl & Technical Signals
  crawlHealth: {
    id: 'crawlHealth',
    label: 'Page Accessibility',
    whatItMeasures: 'Percentage of your pages that load successfully when search engines visit.',
    whyItMatters: 'Pages that fail to load cannot appear in search results. Even a few broken pages can hurt your overall visibility.',
    howToInterpret: '95+ is healthy. Below 90 indicates pages that search engines cannot access.',
    type: 'signal',
    technicalTerm: 'Crawl health',
    dataSource: 'HTTP response codes from our automated crawl',
  },
  indexability: {
    id: 'indexability',
    label: 'Search Engine Access',
    whatItMeasures: 'Whether your pages allow search engines to include them in search results.',
    whyItMatters: 'Pages blocked from indexing will never appear in search, even if the content is excellent.',
    howToInterpret: '95+ means most pages can be indexed. Below 90 suggests pages may be accidentally blocked.',
    type: 'signal',
    technicalTerm: 'Indexability',
    dataSource: 'Analysis of robots.txt and meta robots directives',
    limitations: 'Does not guarantee Google will index pages, only that they are allowed to.',
  },
  htmlStructuralQuality: {
    id: 'htmlStructuralQuality',
    label: 'Page Structure',
    whatItMeasures: 'How well-organized your page HTML is for search engines to understand.',
    whyItMatters: 'Well-structured pages help search engines identify the most important content and display it appropriately.',
    howToInterpret: '80+ indicates good structure. Below 60 may cause search engines to miss or misunderstand key content.',
    type: 'signal',
    technicalTerm: 'HTML structural quality',
    dataSource: 'Analysis of heading hierarchy, schema markup, and semantic HTML',
  },
  thinContentQuality: {
    id: 'thinContentQuality',
    label: 'Content Depth',
    whatItMeasures: 'Percentage of pages with sufficient content to be valuable to visitors.',
    whyItMatters: 'Pages with very little content are often filtered out of search results or ranked poorly.',
    howToInterpret: '90+ means most pages have substantial content. Below 70 indicates many thin pages that may hurt rankings.',
    type: 'signal',
    technicalTerm: 'Thin content quality',
    dataSource: 'Word count and content analysis across your pages',
  },
  serpPresence: {
    id: 'serpPresence',
    label: 'Search Result Readiness',
    whatItMeasures: 'How prepared your pages are to display well in search results.',
    whyItMatters: 'Pages with complete titles and descriptions get more clicks from search results.',
    howToInterpret: '90+ means pages are well-prepared. Below 70 indicates missing or incomplete metadata.',
    type: 'signal',
    technicalTerm: 'SERP readiness',
    dataSource: 'Analysis of page titles, meta descriptions, and structured data',
  },
  answerSurfacePresence: {
    id: 'answerSurfacePresence',
    label: 'AI Answer Readiness',
    whatItMeasures: 'How prepared your content is to be cited by AI assistants and answer engines.',
    whyItMatters: 'AI assistants like ChatGPT and Google AI increasingly answer questions directly. Being cited drives traffic and builds trust.',
    howToInterpret: '80+ indicates good AI readiness. Below 60 means your content may not be formatted for AI citation.',
    type: 'signal',
    technicalTerm: 'Answer surface presence',
    dataSource: 'Analysis of Answer Blocks, FAQ content, and structured data',
  },
  brandNavigationalStrength: {
    id: 'brandNavigationalStrength',
    label: 'Brand Searchability',
    whatItMeasures: 'How well your site appears when someone searches directly for your brand name.',
    whyItMatters: 'Customers searching for your brand should find you immediately. Poor brand searchability loses ready-to-buy customers.',
    howToInterpret: '90+ means strong brand presence. Below 70 indicates your brand may be hard to find by name.',
    type: 'signal',
    technicalTerm: 'Brand navigational strength',
    dataSource: 'Analysis of brand name consistency and homepage optimization',
  },
  // Content & Commerce Signals
  contentCoverage: {
    id: 'contentCoverage',
    label: 'Description Coverage',
    whatItMeasures: 'Percentage of products and pages that have descriptions.',
    whyItMatters: 'Products without descriptions are invisible to search engines and AI assistants looking for what you sell.',
    howToInterpret: '95+ is ideal. Below 80 means significant products lack the content needed to be discovered.',
    type: 'signal',
    technicalTerm: 'Content coverage',
    dataSource: 'Count of products/pages with vs. without descriptions',
  },
  contentDepth: {
    id: 'contentDepth',
    label: 'Description Quality',
    whatItMeasures: 'How detailed and comprehensive your product descriptions are.',
    whyItMatters: 'Detailed descriptions help customers make decisions and give search engines more context to match relevant searches.',
    howToInterpret: '80+ indicates thorough descriptions. Below 60 suggests descriptions may be too brief to be helpful.',
    type: 'signal',
    technicalTerm: 'Content depth',
    dataSource: 'Analysis of description length, detail, and keyword usage',
  },
  contentFreshness: {
    id: 'contentFreshness',
    label: 'Content Freshness',
    whatItMeasures: 'How recently your content has been updated.',
    whyItMatters: 'Search engines favor fresh content. Outdated content may rank lower than competitor pages.',
    howToInterpret: '80+ means content is reasonably fresh. Below 60 suggests content may need updating.',
    type: 'signal',
    technicalTerm: 'Content freshness',
    dataSource: 'Last modified dates and content change detection',
  },
  // Entity Signals
  entityCoverage: {
    id: 'entityCoverage',
    label: 'Product Identification',
    whatItMeasures: 'Percentage of products with clear, complete identification (name, brand, category).',
    whyItMatters: 'Products without clear identification are harder for search engines to match with relevant searches.',
    howToInterpret: '90+ means products are well-identified. Below 70 indicates missing product information.',
    type: 'signal',
    technicalTerm: 'Entity coverage',
    dataSource: 'Analysis of product titles, brands, and categories',
  },
  entityAccuracy: {
    id: 'entityAccuracy',
    label: 'Product Data Accuracy',
    whatItMeasures: 'Consistency and correctness of product information across your site.',
    whyItMatters: 'Inconsistent product data confuses both customers and search engines, reducing trust and visibility.',
    howToInterpret: '90+ indicates consistent data. Below 70 suggests conflicting or incorrect product information.',
    type: 'signal',
    technicalTerm: 'Entity accuracy',
    dataSource: 'Cross-reference of product data across pages',
  },
  entityLinkage: {
    id: 'entityLinkage',
    label: 'Product Connections',
    whatItMeasures: 'How well your products are connected to related products, categories, and brand pages.',
    whyItMatters: 'Connected products help customers discover more of what you sell and help search engines understand your catalog.',
    howToInterpret: '80+ shows good connections. Below 60 suggests products may be isolated or poorly categorized.',
    type: 'signal',
    technicalTerm: 'Entity linkage',
    dataSource: 'Analysis of internal links, categories, and related products',
  },
};

/**
 * Health card metrics (issue categories)
 */
export const HEALTH_CARD_METRICS: Record<string, MetricDefinition> = {
  'missing-metadata': {
    id: 'missing-metadata',
    label: 'Missing Page Titles & Descriptions',
    whatItMeasures: 'Pages lacking the titles or descriptions that appear in search results.',
    whyItMatters: 'Pages without titles and descriptions show poorly in search results, getting fewer clicks even when they rank.',
    howToInterpret: 'Low severity is best. High severity means many pages need titles and descriptions added.',
    type: 'signal',
    dataSource: 'Crawl analysis of page metadata',
  },
  'thin-content': {
    id: 'thin-content',
    label: 'Pages with Limited Content',
    whatItMeasures: 'Pages with very little text or substance.',
    whyItMatters: 'Pages with minimal content are often filtered out of search results or ranked below more comprehensive pages.',
    howToInterpret: 'Low severity is best. High severity indicates many pages need more content.',
    type: 'signal',
    dataSource: 'Word count and content analysis',
  },
  'weak-entities': {
    id: 'weak-entities',
    label: 'Unclear Product Information',
    whatItMeasures: 'Products missing clear names, categories, or identifying information.',
    whyItMatters: 'Products without clear identification are harder for search engines to match with customer searches.',
    howToInterpret: 'Low severity is best. High severity means products need clearer identification.',
    type: 'signal',
    technicalTerm: 'Weak entity coverage',
    dataSource: 'Analysis of product titles, headings, and metadata',
  },
  'low-visibility': {
    id: 'low-visibility',
    label: 'Pages Not Search-Ready',
    whatItMeasures: 'Pages that lack the formatting and structure to appear prominently in search.',
    whyItMatters: 'Pages without proper formatting may rank but fail to appear in featured snippets or AI answers.',
    howToInterpret: 'Low severity is best. High severity suggests pages need optimization for better search display.',
    type: 'signal',
    technicalTerm: 'Low visibility readiness',
    dataSource: 'Analysis of structured data and content formatting',
  },
  'crawl-errors': {
    id: 'crawl-errors',
    label: 'Pages with Access Problems',
    whatItMeasures: 'Pages that fail to load or return errors when accessed.',
    whyItMatters: 'Pages with errors cannot appear in search results and create poor experiences for visitors who find broken links.',
    howToInterpret: 'Low severity is best. Any issues should be investigated and fixed promptly.',
    type: 'signal',
    dataSource: 'HTTP response codes from our crawl',
  },
};

/**
 * Overall DEO Score metric definition
 */
export const DEO_SCORE_METRIC: MetricDefinition = {
  id: 'deo-score',
  label: 'Discovery Score',
  whatItMeasures: 'An overall measure of how discoverable your site is across search engines and AI assistants.',
  whyItMatters: 'A higher score means more opportunities for customers to find you through search and AI recommendations.',
  howToInterpret: '80+ is strong discoverability. 60-79 is good with room to improve. Below 60 indicates significant opportunities to increase visibility.',
  type: 'signal',
  technicalTerm: 'DEO Score (Discovery Engine Optimization)',
  dataSource: 'Combines Content Quality, Product Identity, Site Health, and Search Readiness signals.',
  limitations: 'This score measures preparation for discovery, not actual traffic or rankings. Higher scores correlate with better visibility but do not guarantee specific results.',
};

/**
 * Get the metric definition for a given metric ID.
 */
export function getMetricDefinition(metricId: string): MetricDefinition | undefined {
  return (
    DEO_COMPONENT_METRICS[metricId] ||
    DEO_SIGNAL_METRICS[metricId] ||
    HEALTH_CARD_METRICS[metricId] ||
    (metricId === 'deo-score' ? DEO_SCORE_METRIC : undefined)
  );
}

/**
 * Score threshold interpretation for consistent messaging
 */
export interface ScoreInterpretation {
  label: string;
  description: string;
  colorClass: string;
}

export function getScoreInterpretation(score: number | null): ScoreInterpretation {
  if (score === null) {
    return {
      label: 'No data',
      description: 'Run a crawl to calculate this metric.',
      colorClass: 'text-gray-400',
    };
  }
  if (score >= 80) {
    return {
      label: 'Strong',
      description: 'This area is performing well. Monitor to maintain.',
      colorClass: 'text-green-600',
    };
  }
  if (score >= 60) {
    return {
      label: 'Good',
      description: 'Performing adequately with opportunities to improve.',
      colorClass: 'text-yellow-500',
    };
  }
  if (score >= 40) {
    return {
      label: 'Needs work',
      description: 'Below average. Improvements in this area could boost visibility.',
      colorClass: 'text-orange-500',
    };
  }
  return {
    label: 'Needs attention',
    description: 'This area needs improvement to avoid limiting your visibility.',
    colorClass: 'text-red-500',
  };
}
