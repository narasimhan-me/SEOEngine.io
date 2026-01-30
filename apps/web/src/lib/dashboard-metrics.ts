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
 * [EA-45] Signal category for distinguishing signal vs action vs automation.
 * - 'observation': Pure signal measurement (advisory only)
 * - 'guidance': Signal with related playbook/guidance available
 * - 'action': User-initiated action recommendation
 * - 'automation': System-managed capability (informational only)
 */
export type SignalCategory = 'observation' | 'guidance' | 'action' | 'automation';

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
  /**
   * [EA-45] Signal category for visual/textual separation.
   * Defaults to 'observation' if not specified.
   */
  signalCategory?: SignalCategory;
  /**
   * [EA-45] Related playbook ID if this signal has associated guidance.
   * Informational only - does not trigger any actions.
   */
  relatedPlaybookId?: string;
  /**
   * [EA-45] Advisory nature statement shown in tooltips.
   * Explicitly states this signal is informational, not prescriptive.
   */
  advisoryNote?: string;
}

/**
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] DEO Score component metrics
 * All explanations use clear, accessible language without jargon.
 */
export const DEO_COMPONENT_METRICS: Record<string, MetricDefinition> = {
  content: {
    id: 'content',
    label: 'Content Quality',
    whatItMeasures: 'How complete and detailed your product descriptions and page content are.',
    whyItMatters: 'Detailed content helps search engines and AI assistants understand what you sell and show your pages to people looking for products like yours.',
    howToInterpret: '80+ means your content is thorough. Below 60 means some products may need more detailed descriptions.',
    type: 'signal',
    technicalTerm: 'Content coverage, depth, and freshness',
    dataSource: 'Analysis of your product titles, descriptions, and page content',
  },
  entities: {
    id: 'entities',
    label: 'Product Information',
    whatItMeasures: 'How clearly your products are identified with consistent names, categories, and details.',
    whyItMatters: 'Clear, consistent product information helps both customers and search engines understand exactly what each product is.',
    howToInterpret: '80+ means your product information is clear. Below 60 suggests some products may have incomplete or inconsistent details.',
    type: 'signal',
    technicalTerm: 'Entity coverage, accuracy, and linkage',
    dataSource: 'Analysis of product titles, categories, and structured data',
  },
  technical: {
    id: 'technical',
    label: 'Site Accessibility',
    whatItMeasures: 'Whether search engines can successfully access and understand all your pages.',
    whyItMatters: 'Pages that search engines can\'t access won\'t appear in search results. Keeping your site accessible ensures all your content can be found.',
    howToInterpret: '80+ means your site is fully accessible. Below 60 means some pages may have access issues worth reviewing.',
    type: 'signal',
    technicalTerm: 'Crawl health, indexability, HTML quality',
    dataSource: 'Automated scan of your site checking for access issues',
  },
  visibility: {
    id: 'visibility',
    label: 'Search Readiness',
    whatItMeasures: 'How well your pages are set up to appear in search results and AI-powered answers.',
    whyItMatters: 'Pages with complete titles, descriptions, and structured content are more likely to appear prominently when customers search.',
    howToInterpret: '80+ means your pages are well-prepared. Below 60 suggests adding titles, descriptions, or structured content could help.',
    type: 'signal',
    technicalTerm: 'SERP readiness, answer surface presence, brand navigational strength',
    dataSource: 'Analysis of titles, descriptions, and content structure',
  },
};

/**
 * Individual signal metrics for the signals summary panel
 * [EA-45] Updated with signalCategory and relatedPlaybookId for playbook/guidance integration
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
    signalCategory: 'guidance',
    relatedPlaybookId: 'technical-health-remediation',
    advisoryNote: 'This is an observation. You decide if and when to take action.',
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
    signalCategory: 'guidance',
    relatedPlaybookId: 'answer-readiness-optimization',
    advisoryNote: 'This is an observation. You decide if and when to take action.',
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
    signalCategory: 'guidance',
    relatedPlaybookId: 'content-depth-improvement',
    advisoryNote: 'This is an observation. You decide if and when to take action.',
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
    signalCategory: 'guidance',
    relatedPlaybookId: 'entity-coverage-expansion',
    advisoryNote: 'This is an observation. You decide if and when to take action.',
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
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] Health card metrics
 * Non-alarmist language that empowers users to take action.
 */
export const HEALTH_CARD_METRICS: Record<string, MetricDefinition> = {
  'missing-metadata': {
    id: 'missing-metadata',
    label: 'Pages Missing Titles & Descriptions',
    whatItMeasures: "Pages that don't have titles or descriptions set for search results.",
    whyItMatters: "Pages with titles and descriptions look better in search results and give customers a clear preview of what they'll find.",
    howToInterpret: 'Fewer issues is better. The count shows how many pages would benefit from adding titles and descriptions.',
    type: 'signal',
    dataSource: 'Scan of page titles and descriptions',
  },
  'thin-content': {
    id: 'thin-content',
    label: 'Pages with Brief Content',
    whatItMeasures: 'Pages that have relatively little text content.',
    whyItMatters: 'Pages with more detailed content can better answer customer questions and are more likely to appear for relevant searches.',
    howToInterpret: 'Fewer issues is better. The count shows pages that may benefit from additional content.',
    type: 'signal',
    dataSource: 'Content analysis across your pages',
  },
  'weak-entities': {
    id: 'weak-entities',
    label: 'Products with Incomplete Information',
    whatItMeasures: 'Products that may be missing names, categories, or other identifying details.',
    whyItMatters: "Complete product information helps customers find what they're looking for and helps search engines show your products for relevant searches.",
    howToInterpret: 'Fewer issues is better. The count shows products that could use more complete information.',
    type: 'signal',
    technicalTerm: 'Weak entity coverage',
    dataSource: 'Analysis of product titles, categories, and details',
  },
  'low-visibility': {
    id: 'low-visibility',
    label: 'Pages That Could Be More Visible',
    whatItMeasures: 'Pages that may be missing elements that help them stand out in search results.',
    whyItMatters: 'Pages with complete structured content are more likely to appear prominently in search results and AI-powered answers.',
    howToInterpret: 'Fewer issues is better. The count shows pages that could be enhanced for better search visibility.',
    type: 'signal',
    technicalTerm: 'Low visibility readiness',
    dataSource: 'Analysis of content structure and formatting',
  },
  'crawl-errors': {
    id: 'crawl-errors',
    label: 'Pages with Access Issues',
    whatItMeasures: 'Pages that returned errors when we tried to access them.',
    whyItMatters: "Pages that can't be accessed won't appear in search results. Fixing access issues ensures all your content is available.",
    howToInterpret: 'Zero issues is ideal. Any errors are worth investigating to ensure your content is accessible.',
    type: 'signal',
    dataSource: 'Response codes from our site scan',
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
