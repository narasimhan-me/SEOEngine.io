/**
 * [EA-40: PLAYBOOKS-SHELL-1] Playbook Definitions
 *
 * Static, read-only playbook definitions for educational display.
 * No execution, automation, or mutation capabilities.
 *
 * Trust Contract:
 * - All playbooks are read-only
 * - Viewing playbooks triggers no backend mutations
 * - Playbooks are educational, not actionable
 * - No bulk actions or auto-apply
 */

export type PlaybookCategory =
  | 'content'
  | 'technical'
  | 'visibility'
  | 'entities';

export type PlaybookComplexity = 'simple' | 'moderate' | 'involved';

export interface PlaybookStep {
  /** Step number for display */
  stepNumber: number;
  /** Brief title of this step */
  title: string;
  /** Detailed explanation of what this step involves */
  description: string;
}

/**
 * [EA-42] Automation capability metadata for playbooks that have automation implementations.
 * Read-only information explaining what automation would do - no execution capabilities.
 *
 * Trust Contract:
 * - All fields are informational only
 * - No execution, scheduling, or trigger affordances
 * - Enables users to understand automation scope before any opt-in
 */
export interface AutomationCapabilityMeta {
  /** Whether this playbook has an automation implementation available */
  hasAutomation: true;
  /** Human-readable description of what the automation does when run */
  whatItDoes: string;
  /** Fields or data that would be modified by this automation */
  fieldsAffected: string[];
  /** What this automation explicitly does NOT touch */
  doesNotTouch: string[];
  /** Whether changes can be undone */
  reversible: boolean;
  /** Explanation of reversibility */
  reversibilityNote: string;
  /** Trigger type description (always user-initiated for EA-42) */
  triggerDescription: string;
  /** Human-readable scope description */
  scopeDescription: string;
}

export interface PlaybookDefinition {
  /** Unique identifier for the playbook */
  id: string;
  /** Display title */
  title: string;
  /** Category for grouping */
  category: PlaybookCategory;
  /** Brief one-line summary */
  summary: string;
  /** Detailed explanation of what this playbook represents */
  description: string;
  /** What issues or patterns this playbook addresses */
  addressesPatterns: string[];
  /** Conceptual steps (educational, not executable) */
  steps: PlaybookStep[];
  /** Relative complexity indicator */
  complexity: PlaybookComplexity;
  /** Educational note about when to consider this approach */
  whenToConsider: string;
  /**
   * [EA-42] Optional automation capability metadata.
   * When present, indicates this playbook has automation capabilities.
   * Information is read-only - no execution affordances.
   */
  automationMeta?: AutomationCapabilityMeta;
}

/**
 * Static playbook definitions for read-only display.
 * These represent common fix strategies users can learn about.
 */
export const PLAYBOOK_DEFINITIONS: PlaybookDefinition[] = [
  {
    id: 'content-depth-improvement',
    title: 'Content Depth Improvement',
    category: 'content',
    summary: 'Enhance thin content with comprehensive, valuable information',
    description:
      'This playbook outlines a strategy for identifying and enriching pages that lack sufficient content depth. Thin content can negatively impact how AI systems understand and surface your store in answer experiences.',
    addressesPatterns: [
      'Thin content warnings',
      'Low content coverage scores',
      'Missing product descriptions',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Identify thin content pages',
        description:
          'Review pages flagged with thin content issues. These typically have less than 300 words of meaningful content or lack descriptive information.',
      },
      {
        stepNumber: 2,
        title: 'Research customer questions',
        description:
          'Understand what questions customers commonly ask about these products or topics. This helps ensure added content is genuinely useful.',
      },
      {
        stepNumber: 3,
        title: 'Draft comprehensive content',
        description:
          'Write detailed descriptions, specifications, use cases, and answers to common questions. Focus on clarity and helpfulness.',
      },
      {
        stepNumber: 4,
        title: 'Review and refine',
        description:
          'Ensure the content reads naturally, provides real value, and accurately represents your products or services.',
      },
    ],
    complexity: 'moderate',
    whenToConsider:
      'Consider this approach when you have multiple pages with similar thin content issues, or when improving content depth is a strategic priority.',
  },
  {
    id: 'metadata-standardization',
    title: 'Metadata Standardization',
    category: 'content',
    summary: 'Establish consistent SEO metadata across your store',
    description:
      'This playbook describes a systematic approach to ensuring all pages have complete, well-crafted SEO titles and descriptions. Consistent metadata helps search engines and AI systems understand your content.',
    addressesPatterns: [
      'Missing SEO titles',
      'Missing meta descriptions',
      'Weak or generic metadata',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Audit current metadata',
        description:
          'Review which pages are missing titles or descriptions, and which have generic or auto-generated metadata.',
      },
      {
        stepNumber: 2,
        title: 'Define metadata templates',
        description:
          'Create templates or patterns for different page types (products, collections, informational pages) to ensure consistency.',
      },
      {
        stepNumber: 3,
        title: 'Write unique metadata',
        description:
          'Craft unique, descriptive titles and descriptions for each page. Avoid duplicates and ensure each accurately represents the page content.',
      },
      {
        stepNumber: 4,
        title: 'Validate completeness',
        description:
          'Verify all pages now have appropriate metadata and no gaps remain.',
      },
    ],
    complexity: 'simple',
    whenToConsider:
      'Consider this when you have many pages with missing or weak metadata, especially after adding new products or collections.',
    automationMeta: {
      hasAutomation: true,
      whatItDoes:
        'Generates AI-suggested SEO titles and descriptions for products that are missing this metadata. Suggestions are created as drafts for your review.',
      fieldsAffected: ['SEO Title', 'Meta Description'],
      doesNotTouch: [
        'Product prices',
        'Inventory levels',
        'Product images',
        'Variant data',
        'Collections',
        'Store settings',
      ],
      reversible: true,
      reversibilityNote:
        'All changes are applied as drafts first. You can review, edit, or discard suggestions before they take effect.',
      triggerDescription:
        'User-initiated only. You choose when to generate suggestions and when to apply them.',
      scopeDescription:
        'Targets only products with missing or empty SEO titles/descriptions in your store.',
    },
  },
  {
    id: 'entity-coverage-expansion',
    title: 'Entity Coverage Expansion',
    category: 'entities',
    summary: 'Improve how well your content covers relevant entities',
    description:
      'This playbook explains how to enhance entity coverage in your content. Entities (brands, product types, attributes, concepts) help AI systems understand what your store offers and match it to user queries.',
    addressesPatterns: [
      'Low entity coverage',
      'Missing brand mentions',
      'Weak product attribute coverage',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Identify entity gaps',
        description:
          'Review which important entities (brands, categories, attributes) are underrepresented in your content.',
      },
      {
        stepNumber: 2,
        title: 'Map entities to content',
        description:
          'Determine which pages should mention which entities based on relevance and user intent.',
      },
      {
        stepNumber: 3,
        title: 'Naturally incorporate entities',
        description:
          'Update content to include relevant entities in a natural, helpful way. Avoid keyword stuffing.',
      },
      {
        stepNumber: 4,
        title: 'Verify entity presence',
        description:
          'Confirm that key entities are now properly represented across relevant pages.',
      },
    ],
    complexity: 'moderate',
    whenToConsider:
      'Consider this when AI answer surfaces are not recognizing your products for relevant queries, or when entity coverage scores are low.',
  },
  {
    id: 'technical-health-remediation',
    title: 'Technical Health Remediation',
    category: 'technical',
    summary: 'Address crawl and indexability issues systematically',
    description:
      'This playbook covers a methodical approach to resolving technical issues that prevent search engines and AI crawlers from properly accessing and understanding your content.',
    addressesPatterns: [
      'Crawl errors',
      'Indexability problems',
      'Blocked resources',
      'Slow page responses',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Prioritize by impact',
        description:
          'Review technical issues and prioritize those affecting the most important pages or the largest number of pages.',
      },
      {
        stepNumber: 2,
        title: 'Diagnose root causes',
        description:
          'Understand why each issue occurs. Is it a server configuration, theme code, app conflict, or content issue?',
      },
      {
        stepNumber: 3,
        title: 'Implement fixes',
        description:
          'Address each issue according to its root cause. Some may require theme changes, others may need app adjustments or server configuration.',
      },
      {
        stepNumber: 4,
        title: 'Verify resolution',
        description:
          'After fixes are deployed, verify that the issues no longer appear and pages are properly accessible.',
      },
    ],
    complexity: 'involved',
    whenToConsider:
      'Consider this when technical issues are blocking visibility for important pages, or when crawl health scores are significantly impacting your overall DEO score.',
  },
  {
    id: 'answer-readiness-optimization',
    title: 'Answer Readiness Optimization',
    category: 'visibility',
    summary: 'Prepare content to appear in AI answer experiences',
    description:
      'This playbook outlines strategies for making your content more likely to be surfaced in AI-powered answer experiences. Answer-ready content directly addresses user questions in a clear, structured format.',
    addressesPatterns: [
      'Not answer ready',
      'Answer surface weakness',
      'Weak intent match',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Identify target questions',
        description:
          'Determine what questions your ideal customers are asking that your content should answer.',
      },
      {
        stepNumber: 2,
        title: 'Evaluate current answer-readiness',
        description:
          'Assess whether your content clearly and directly answers these questions in a way AI systems can extract.',
      },
      {
        stepNumber: 3,
        title: 'Structure content for answers',
        description:
          'Reorganize or enhance content to provide clear, concise answers. Use headers, lists, and direct statements.',
      },
      {
        stepNumber: 4,
        title: 'Add supporting context',
        description:
          'Ensure answers are supported by relevant context, credentials, or evidence that builds trust.',
      },
    ],
    complexity: 'moderate',
    whenToConsider:
      'Consider this when your products or content should appear in AI answer experiences but currently do not, or when answer readiness scores are low.',
  },
];

/**
 * Get all playbooks grouped by category
 */
export function getPlaybooksByCategory(): Record<
  PlaybookCategory,
  PlaybookDefinition[]
> {
  const grouped: Record<PlaybookCategory, PlaybookDefinition[]> = {
    content: [],
    technical: [],
    visibility: [],
    entities: [],
  };

  for (const playbook of PLAYBOOK_DEFINITIONS) {
    grouped[playbook.category].push(playbook);
  }

  return grouped;
}

/**
 * Get a single playbook by ID
 */
export function getPlaybookById(id: string): PlaybookDefinition | undefined {
  return PLAYBOOK_DEFINITIONS.find((p) => p.id === id);
}

/**
 * Category display metadata
 */
export const PLAYBOOK_CATEGORY_INFO: Record<
  PlaybookCategory,
  { label: string; description: string }
> = {
  content: {
    label: 'Content',
    description: 'Strategies for improving content quality and depth',
  },
  technical: {
    label: 'Technical',
    description: 'Approaches for resolving technical and crawl issues',
  },
  visibility: {
    label: 'Visibility',
    description: 'Methods for improving presence in search and AI answers',
  },
  entities: {
    label: 'Entities',
    description: 'Techniques for better entity coverage and recognition',
  },
};

/**
 * Complexity display metadata
 */
export const PLAYBOOK_COMPLEXITY_INFO: Record<
  PlaybookComplexity,
  { label: string; description: string }
> = {
  simple: {
    label: 'Simple',
    description: 'Straightforward changes with clear steps',
  },
  moderate: {
    label: 'Moderate',
    description: 'Requires some planning and content work',
  },
  involved: {
    label: 'Involved',
    description: 'May require technical expertise or multiple sessions',
  },
};
