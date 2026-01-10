/**
 * [ISSUE-TO-FIX-PATH-1 FIXUP-1] Issue UI Configuration
 *
 * Single source of truth for issue display metadata.
 * Moved from IssuesList.tsx to eliminate circular dependencies.
 */

import type { DeoPillarId } from '@/lib/deo-pillars';

/**
 * UI configuration for issue types.
 * Maps issue IDs to human-readable labels, descriptions, and pillar IDs.
 */
export const ISSUE_UI_CONFIG: Record<
  string,
  { label: string; description: string; pillarId: DeoPillarId }
> = {
  // High-level DEO issues
  missing_metadata: {
    label: 'Missing Metadata',
    description:
      'Some pages and products are missing essential metadata like titles or descriptions.',
    pillarId: 'metadata_snippet_quality',
  },
  thin_content: {
    label: 'Thin Content',
    description:
      'Many surfaces have very short content, which weakens depth and ranking potential.',
    pillarId: 'content_commerce_signals',
  },
  low_entity_coverage: {
    label: 'Weak Entity Structure',
    description:
      'Key entities, headings, or product schemas are incomplete or missing.',
    pillarId: 'content_commerce_signals',
  },
  indexability_problems: {
    label: 'Indexability Problems',
    description:
      'Crawl errors or missing HTML basics make some pages hard to index.',
    pillarId: 'technical_indexability',
  },
  answer_surface_weakness: {
    label: 'Low AI Answer Potential',
    description:
      'Pages lack the long-form content and structure needed to power rich answers.',
    pillarId: 'search_intent_fit',
  },
  brand_navigational_weakness: {
    label: 'Weak Brand Navigation',
    description:
      'Canonical navigational pages like /about or /contact are missing or not discoverable.',
    pillarId: 'offsite_signals',
  },
  crawl_health_errors: {
    label: 'Crawl Errors',
    description:
      'A number of pages return HTTP or fetch errors, reducing crawl coverage.',
    pillarId: 'technical_indexability',
  },
  product_content_depth: {
    label: 'Shallow Product Content',
    description:
      'Many products have very short or missing descriptions, limiting their ability to rank and convert.',
    pillarId: 'content_commerce_signals',
  },
  // Issue Engine Lite: Product-focused issues
  missing_seo_title: {
    label: 'Missing SEO Title',
    description:
      'Products without an SEO title are harder for search engines and AI to understand and rank.',
    pillarId: 'metadata_snippet_quality',
  },
  missing_seo_description: {
    label: 'Missing SEO Description',
    description:
      'Products without an SEO description miss rich snippet and click-through optimization.',
    pillarId: 'metadata_snippet_quality',
  },
  weak_title: {
    label: 'Weak Product Title',
    description:
      'Product titles are too short or unoptimized, reducing search visibility.',
    pillarId: 'metadata_snippet_quality',
  },
  weak_description: {
    label: 'Weak Product Description',
    description:
      'Short SEO descriptions limit search snippet quality and fail to convey value.',
    pillarId: 'metadata_snippet_quality',
  },
  missing_long_description: {
    label: 'Missing Long Description',
    description:
      'Products lack detailed descriptions needed for rich search results and AI answers.',
    pillarId: 'content_commerce_signals',
  },
  duplicate_product_content: {
    label: 'Duplicate Product Content',
    description:
      'Multiple products share identical descriptions, hurting rankings and confusing AI.',
    pillarId: 'content_commerce_signals',
  },
  low_product_entity_coverage: {
    label: 'Low Entity Coverage in Product Content',
    description:
      'Products lack the metadata and content depth for strong entity signals.',
    pillarId: 'content_commerce_signals',
  },
  not_answer_ready: {
    label: 'Not Answer-Ready',
    description:
      'Products lack sufficient content to be cited in AI-powered answer experiences.',
    pillarId: 'search_intent_fit',
  },
  weak_intent_match: {
    label: 'Weak Intent Match',
    description:
      'Product metadata may not align well with user search intent.',
    pillarId: 'search_intent_fit',
  },
  missing_product_image: {
    label: 'Missing Product Image',
    description:
      'Products without images have significantly lower engagement and conversion.',
    pillarId: 'media_accessibility',
  },
  missing_price: {
    label: 'Missing Product Price',
    description:
      'Products without price data cannot appear in price-filtered results or shopping feeds.',
    pillarId: 'technical_indexability',
  },
  missing_category: {
    label: 'Missing Product Category/Type',
    description:
      'Products without categories are harder to organize and surface in relevant contexts.',
    pillarId: 'content_commerce_signals',
  },
  // PERFORMANCE-1: Discovery-critical performance issues (Technical pillar)
  render_blocking_resources: {
    label: 'Render-blocking Resources',
    description:
      'Blocking scripts or styles ahead of content can delay first contentful paint for users and crawlers.',
    pillarId: 'technical_indexability',
  },
  indexability_conflict: {
    label: 'Indexability Conflict',
    description:
      'Pages have conflicting indexing directives (e.g., noindex in robots meta or X-Robots-Tag, or canonical pointing elsewhere).',
    pillarId: 'technical_indexability',
  },
  slow_initial_response: {
    label: 'Slow Initial Response',
    description:
      'HTML document is very large, which may indicate slow TTFB or excessive inline content.',
    pillarId: 'technical_indexability',
  },
  excessive_page_weight: {
    label: 'Excessive Page Weight',
    description:
      'Page HTML exceeds recommended size thresholds, potentially slowing crawlers and users.',
    pillarId: 'technical_indexability',
  },
  mobile_rendering_risk: {
    label: 'Mobile Rendering Risk',
    description:
      'Pages may have mobile rendering issues due to missing viewport meta or potential layout problems.',
    pillarId: 'technical_indexability',
  },
};
