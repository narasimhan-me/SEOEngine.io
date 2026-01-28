/**
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] Issue UI Configuration
 *
 * All issue explanations follow a Fact/Risk/Recommendation structure:
 * - Clear, jargon-free titles accessible to non-SEO users
 * - Descriptions that explain what was detected, why it matters, and what to do
 * - No fear-based or alarmist language
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
    label: 'Pages Missing Titles or Descriptions',
    description:
      "Some pages or products don't have titles or descriptions set. Adding these helps search engines and AI assistants understand and display your content accurately.",
    pillarId: 'metadata_snippet_quality',
  },
  thin_content: {
    label: 'Pages with Limited Content',
    description:
      'Some pages have very little text content. Adding more detail helps visitors find what they need and helps search engines match your pages to relevant searches.',
    pillarId: 'content_commerce_signals',
  },
  low_entity_coverage: {
    label: 'Products Missing Key Information',
    description:
      'Some products are missing clear titles, headings, or category information. Completing this information helps customers and search engines understand what you sell.',
    pillarId: 'content_commerce_signals',
  },
  indexability_problems: {
    label: 'Pages Search Engines Cannot Access',
    description:
      'Some pages are configured in a way that prevents search engines from including them in search results. Reviewing these settings ensures your important pages can be found.',
    pillarId: 'technical_indexability',
  },
  answer_surface_weakness: {
    label: 'Content Not Ready for AI Answers',
    description:
      "Some pages don't have enough structured content for AI assistants to reference when answering customer questions. Adding clear, detailed content improves your chances of being mentioned.",
    pillarId: 'search_intent_fit',
  },
  brand_navigational_weakness: {
    label: 'Key Pages Missing',
    description:
      'Standard pages that customers expect (like About, Contact, or FAQ) are missing or hard to find. Adding these pages builds trust and helps visitors learn about your business.',
    pillarId: 'offsite_signals',
  },
  crawl_health_errors: {
    label: 'Pages with Loading Errors',
    description:
      'Some pages are returning errors when accessed. Fixing these ensures all your content is available to both visitors and search engines.',
    pillarId: 'technical_indexability',
  },
  product_content_depth: {
    label: 'Products with Brief Descriptions',
    description:
      'Some products have very short descriptions. Adding more detail about features, benefits, and uses helps customers make purchase decisions and improves search visibility.',
    pillarId: 'content_commerce_signals',
  },
  // Issue Engine Lite: Product-focused issues
  missing_seo_title: {
    label: 'Products Missing Search Titles',
    description:
      'Some products don't have a title set for search results. Adding descriptive titles helps search engines and AI understand and display your products accurately.',
    pillarId: 'metadata_snippet_quality',
  },
  missing_seo_description: {
    label: 'Products Missing Search Descriptions',
    description:
      'Some products don't have descriptions for search results. Adding clear descriptions helps your products stand out and gives customers key information at a glance.',
    pillarId: 'metadata_snippet_quality',
  },
  weak_title: {
    label: 'Product Titles Could Be Improved',
    description:
      'Some product titles are very short or generic. More descriptive titles help customers understand what you're selling and improve search visibility.',
    pillarId: 'metadata_snippet_quality',
  },
  weak_description: {
    label: 'Product Descriptions Could Be Improved',
    description:
      'Some product descriptions are brief or unclear. Adding more detail about features and benefits helps customers and search engines understand your products better.',
    pillarId: 'metadata_snippet_quality',
  },
  missing_long_description: {
    label: 'Products Missing Detailed Descriptions',
    description:
      'Some products only have brief descriptions. Adding detailed information about features, materials, and uses helps customers and enables AI assistants to recommend your products.',
    pillarId: 'content_commerce_signals',
  },
  duplicate_product_content: {
    label: 'Products with Identical Descriptions',
    description:
      'Multiple products have the same description. Writing unique descriptions for each product helps customers tell them apart and helps search engines show the right product.',
    pillarId: 'content_commerce_signals',
  },
  low_product_entity_coverage: {
    label: 'Products Missing Category or Type',
    description:
      'Some products are missing category information or detailed attributes. Adding this information helps organize your catalog and improves how products appear in search.',
    pillarId: 'content_commerce_signals',
  },
  not_answer_ready: {
    label: 'Products Need More Content for AI',
    description:
      'Some products don't have enough content for AI assistants to reference. Adding detailed descriptions and answering common questions improves your chances of being recommended.',
    pillarId: 'search_intent_fit',
  },
  weak_intent_match: {
    label: 'Product Content May Not Match Searches',
    description:
      'Some product content may not match how customers search for these items. Reviewing and updating the language can help your products appear for relevant searches.',
    pillarId: 'search_intent_fit',
  },
  missing_product_image: {
    label: 'Products Without Images',
    description:
      'Some products don't have images. Adding product photos helps customers see what they're buying and enables your products to appear in image search and shopping results.',
    pillarId: 'media_accessibility',
  },
  missing_price: {
    label: 'Products Without Prices',
    description:
      'Some products don't have price information. Adding prices enables your products to appear in shopping results and comparison searches.',
    pillarId: 'technical_indexability',
  },
  missing_category: {
    label: 'Products Without Categories',
    description:
      'Some products aren't assigned to categories or product types. Organizing products into categories helps customers browse your store and helps search engines understand your catalog.',
    pillarId: 'content_commerce_signals',
  },
  // PERFORMANCE-1: Discovery-critical performance issues (Technical pillar)
  render_blocking_resources: {
    label: 'Pages Slow to Display',
    description:
      'Some pages have code that delays when content appears. This can affect both visitor experience and how thoroughly search engines review your pages.',
    pillarId: 'technical_indexability',
  },
  indexability_conflict: {
    label: 'Conflicting Search Settings',
    description:
      'Some pages have conflicting instructions about whether search engines should include them. Reviewing these settings ensures your pages appear as intended.',
    pillarId: 'technical_indexability',
  },
  slow_initial_response: {
    label: 'Pages Slow to Load',
    description:
      'Some pages take longer than expected to start loading. Improving page speed helps visitors get your content faster and helps search engines review more of your site.',
    pillarId: 'technical_indexability',
  },
  excessive_page_weight: {
    label: 'Pages with Large File Size',
    description:
      'Some pages have unusually large HTML files. Reducing page size can speed up loading for visitors, especially on mobile devices or slower connections.',
    pillarId: 'technical_indexability',
  },
  mobile_rendering_risk: {
    label: 'Pages May Not Display Well on Mobile',
    description:
      'Some pages may not display correctly on mobile devices. Ensuring mobile-friendly display is important since most visitors browse on phones.',
    pillarId: 'technical_indexability',
  },
};
