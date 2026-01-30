/**
 * [EA-36: CONTEXTUAL-EDUCATION-1] Contextual Education Content Registry
 *
 * Provides lightweight, inline educational content for DEO issues.
 * All content is self-contained within the product - no external dependencies.
 *
 * Trust Contract:
 * - Education never blocks user action
 * - Guidance is optional, not mandatory
 * - Users can complete any action without engaging with educational content
 */

export interface EducationalContent {
  /** Short explanation of why this issue matters */
  whyItMatters: string;
  /** Brief explanation of what fixing this accomplishes */
  whatFixAccomplishes: string;
  /** Optional: Quick tip for addressing the issue */
  quickTip?: string;
}

/**
 * Educational content registry keyed by issue key.
 * Content is kept brief and actionable - not long-form tutorials.
 */
export const CONTEXTUAL_EDUCATION: Record<string, EducationalContent> = {
  // Content issues
  missing_seo_title: {
    whyItMatters: 'Page titles are the first thing users see in search results. Without one, search engines may generate a less compelling title automatically.',
    whatFixAccomplishes: 'A clear, descriptive title helps users understand what your page offers before they click.',
    quickTip: 'Include your main keyword naturally within 60 characters.',
  },
  missing_seo_description: {
    whyItMatters: 'Meta descriptions appear below titles in search results. They help users decide whether to click through to your page.',
    whatFixAccomplishes: 'A well-written description can improve click-through rates from search results.',
    quickTip: 'Summarize the page value in 155 characters or less.',
  },
  weak_title: {
    whyItMatters: 'Generic or unclear titles make it harder for search engines and users to understand your page\'s purpose.',
    whatFixAccomplishes: 'A stronger title better communicates your page\'s unique value.',
  },
  weak_description: {
    whyItMatters: 'Vague descriptions don\'t give users a compelling reason to visit your page over competitors.',
    whatFixAccomplishes: 'A clearer description helps users understand exactly what they\'ll find.',
  },
  thin_content: {
    whyItMatters: 'Pages with limited content may not provide enough value for search engines to rank them well.',
    whatFixAccomplishes: 'Adding substantive content helps establish your page as a valuable resource.',
    quickTip: 'Focus on answering the questions your audience is actually asking.',
  },
  missing_long_description: {
    whyItMatters: 'Products without detailed descriptions leave questions unanswered for both shoppers and search engines.',
    whatFixAccomplishes: 'Comprehensive descriptions help customers make confident purchase decisions.',
  },
  duplicate_product_content: {
    whyItMatters: 'Duplicate content across products can confuse search engines about which page to show.',
    whatFixAccomplishes: 'Unique descriptions help each product page stand on its own merits.',
  },

  // Entity issues
  low_entity_coverage: {
    whyItMatters: 'AI systems look for clear entity information to understand what your content is about.',
    whatFixAccomplishes: 'Better entity coverage helps AI systems accurately represent your content.',
    quickTip: 'Mention key concepts, brands, and topics explicitly in your content.',
  },
  low_product_entity_coverage: {
    whyItMatters: 'Products need clear attributes (brand, category, features) for AI systems to surface them appropriately.',
    whatFixAccomplishes: 'Richer product entities improve how AI shopping assistants present your products.',
  },
  product_content_depth: {
    whyItMatters: 'Shallow product content doesn\'t answer the detailed questions shoppers ask AI assistants.',
    whatFixAccomplishes: 'Deeper content helps AI systems provide comprehensive answers about your products.',
  },

  // Answerability issues
  answer_surface_weakness: {
    whyItMatters: 'AI assistants prefer content that directly answers questions in a clear, structured way.',
    whatFixAccomplishes: 'More answerable content increases your chances of being cited in AI responses.',
    quickTip: 'Structure content with clear headings that match common questions.',
  },
  not_answer_ready: {
    whyItMatters: 'Content that doesn\'t directly address user questions may be skipped by AI systems.',
    whatFixAccomplishes: 'Answer-ready content is more likely to be surfaced by AI assistants.',
  },
  weak_intent_match: {
    whyItMatters: 'When content doesn\'t match what users are searching for, it\'s less likely to appear in results.',
    whatFixAccomplishes: 'Better intent alignment helps your content reach the right audience.',
  },

  // Technical issues
  indexability_problems: {
    whyItMatters: 'If search engines can\'t index your pages, they won\'t appear in search results at all.',
    whatFixAccomplishes: 'Fixing indexability issues ensures your content can be discovered.',
  },
  crawl_health_errors: {
    whyItMatters: 'Crawl errors prevent search engines from accessing and understanding your content.',
    whatFixAccomplishes: 'Resolving crawl errors ensures search engines can see all your content.',
  },
  render_blocking_resources: {
    whyItMatters: 'Resources that block rendering slow down how quickly users see your content.',
    whatFixAccomplishes: 'Faster rendering improves user experience and can positively impact rankings.',
  },
  indexability_conflict: {
    whyItMatters: 'Conflicting indexability signals confuse search engines about whether to index your page.',
    whatFixAccomplishes: 'Clear, consistent signals help search engines index your content correctly.',
  },
  slow_initial_response: {
    whyItMatters: 'Slow server response times frustrate users and can hurt your search rankings.',
    whatFixAccomplishes: 'Faster response times improve user experience across the board.',
  },
  excessive_page_weight: {
    whyItMatters: 'Heavy pages load slowly, especially on mobile devices with limited bandwidth.',
    whatFixAccomplishes: 'Lighter pages load faster and provide a better experience for all users.',
  },
  mobile_rendering_risk: {
    whyItMatters: 'Most searches happen on mobile. Pages that don\'t render well on mobile lose potential visitors.',
    whatFixAccomplishes: 'Mobile-friendly pages reach more of your audience effectively.',
  },
};

/**
 * Get educational content for an issue by its key.
 * Returns null if no educational content is available.
 */
export function getEducationalContent(issueKey: string): EducationalContent | null {
  return CONTEXTUAL_EDUCATION[issueKey] ?? null;
}

/**
 * Check if educational content is available for an issue.
 */
export function hasEducationalContent(issueKey: string): boolean {
  return issueKey in CONTEXTUAL_EDUCATION;
}
