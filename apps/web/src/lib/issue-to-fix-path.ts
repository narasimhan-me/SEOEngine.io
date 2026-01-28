/**
 * [ISSUE-TO-FIX-PATH-1] Issue→Fix Path Definitions (Single Source of Truth)
 *
 * This module defines the locked contract for routing users from issues
 * to the exact fix surface where they can resolve them. Ensures deterministic,
 * trust-safe navigation that never strands users on placeholder pages.
 *
 * Key Invariants:
 * 1. Only issues with a known fix surface are actionable
 * 2. Orphan issues (no fix path) render as informational, non-clickable
 * 3. Issue titles/descriptions never expose internal IDs
 * 4. All fix destinations are deterministic (no guessing)
 */

import type { DeoIssue } from '@/lib/deo-issues';
import type { DeoPillarId } from '@/lib/deo-pillars';
// [ISSUE-TO-FIX-PATH-1 FIXUP-1] Import from lib module to avoid circular dependency
import { ISSUE_UI_CONFIG } from '@/lib/issue-ui-config';

// =============================================================================
// Fix Surface Enum (Locked Contract)
// =============================================================================

/**
 * Exactly the allowed fix surfaces where issues can be resolved.
 * DO NOT add surfaces unless they have real fix UI implemented.
 */
export enum IssueFixSurface {
  /** Product workspace → Metadata tab */
  PRODUCT_METADATA = 'product_metadata',
  /** Product workspace → Answers tab */
  PRODUCT_ANSWERS = 'product_answers',
  /** Product workspace → Search & Intent tab */
  PRODUCT_SEARCH_INTENT = 'product_search_intent',
  /** Product workspace → Competitors tab */
  PRODUCT_COMPETITORS = 'product_competitors',
  /** Product workspace → GEO tab */
  PRODUCT_GEO = 'product_geo',
  /** Work Queue page (Action Bundle) */
  WORK_QUEUE = 'work_queue',
  /** External: Shopify admin (manual fix) */
  EXTERNAL_SHOPIFY = 'external_shopify',
}

/**
 * Maps fix surface to product tab ID for routing.
 */
export const FIX_SURFACE_TO_TAB: Partial<Record<IssueFixSurface, string>> = {
  [IssueFixSurface.PRODUCT_METADATA]: 'metadata',
  [IssueFixSurface.PRODUCT_ANSWERS]: 'answers',
  [IssueFixSurface.PRODUCT_SEARCH_INTENT]: 'search-intent',
  [IssueFixSurface.PRODUCT_COMPETITORS]: 'competitors',
  [IssueFixSurface.PRODUCT_GEO]: 'geo',
};

// =============================================================================
// Issue Fix Kind (Semantic Classification)
// =============================================================================

/**
 * [ISSUE-FIX-KIND-CLARITY-1] Semantic classification of how an issue is resolved.
 *
 * EDIT - User edits a field directly (e.g., SEO title, description)
 * AI - User triggers AI generation (e.g., Answers, Playbooks)
 * DIAGNOSTIC - Issue is informational; no direct fix, just review data
 */
export type IssueFixKind = 'EDIT' | 'AI' | 'DIAGNOSTIC';

// =============================================================================
// Issue Fix Path Shape
// =============================================================================

/**
 * Represents a deterministic path from an issue to its fix destination.
 */
export interface IssueFixPath {
  /** The fix surface where this issue can be resolved */
  fixSurface: IssueFixSurface;
  /** Human-readable CTA label (e.g., "Fix in Metadata") */
  ctaLabel: string;
  /** The route path to navigate to (relative, without projectId) */
  routeTarget: string;
  /** The element/section to highlight on arrival (CSS selector or testid) */
  highlightTarget?: string;
  /** Whether this issue can be fixed right now (vs. needs external action) */
  isActionableNow: boolean;
  /**
   * [ISSUE-FIX-NAV-AND-ANCHORS-1] Stable data-testid for the fix module.
   * REQUIRED for in-app actionable destinations. If missing, issue is downgraded to informational.
   */
  fixAnchorTestId?: string;
  /**
   * [ISSUE-FIX-NAV-AND-ANCHORS-1] Short CTA copy for the arrival callout.
   * E.g., "Edit the SEO title below"
   */
  nextActionLabel?: string;
  /**
   * [ISSUE-FIX-KIND-CLARITY-1] Semantic classification of how this issue is resolved.
   * Defaults to 'EDIT' if not specified.
   */
  fixKind?: IssueFixKind;
}

// =============================================================================
// Pillar to Fix Surface Mapping
// =============================================================================

/**
 * Maps DEO pillar IDs to their primary fix surface.
 * This determines where users land when clicking an issue.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _PILLAR_TO_FIX_SURFACE: Record<DeoPillarId, IssueFixSurface> = {
  metadata_snippet_quality: IssueFixSurface.PRODUCT_METADATA,
  content_commerce_signals: IssueFixSurface.PRODUCT_ANSWERS,
  search_intent_fit: IssueFixSurface.PRODUCT_SEARCH_INTENT,
  competitive_positioning: IssueFixSurface.PRODUCT_COMPETITORS,
  technical_indexability: IssueFixSurface.PRODUCT_METADATA,
  offsite_signals: IssueFixSurface.PRODUCT_METADATA,
  media_accessibility: IssueFixSurface.PRODUCT_METADATA,
  local_discovery: IssueFixSurface.PRODUCT_METADATA,
};

/**
 * Maps DEO pillar IDs to the highlight target (testid) on arrival.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _PILLAR_TO_HIGHLIGHT: Partial<Record<DeoPillarId, string>> = {
  metadata_snippet_quality: 'seo-editor-anchor',
  content_commerce_signals: 'answers-tab-anchor',
  search_intent_fit: 'search-intent-tab-anchor',
  competitive_positioning: 'competitors-tab-anchor',
  technical_indexability: 'seo-editor-anchor',
  media_accessibility: 'seo-editor-anchor',
};

// =============================================================================
// Issue Key to Fix Path Mapping (Authoritative)
// =============================================================================

/**
 * Explicit mapping of issue keys to their fix paths.
 * Issues not in this mapping are treated as orphans (informational only).
 */
const ISSUE_FIX_PATH_MAP: Record<string, Omit<IssueFixPath, 'routeTarget'>> = {
  // ==========================================================================
  // Metadata issues → Product Metadata tab
  // [MISSING-METADATA-FIX-SURFACE-INTEGRITY-1] Use seo-editor-anchor (real DOM anchor)
  // Previous testids (product-metadata-seo-*-module) did not exist in DOM, causing "Fix surface not available"
  // ==========================================================================
  missing_seo_title: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'Fix in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'seo-editor-anchor',
    nextActionLabel: 'Edit the SEO title below',
  },
  missing_seo_description: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'Fix in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'seo-editor-anchor',
    nextActionLabel: 'Edit the SEO description below',
  },
  weak_title: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'Fix in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'seo-editor-anchor',
    nextActionLabel: 'Improve the SEO title below',
  },
  weak_description: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'Fix in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'seo-editor-anchor',
    nextActionLabel: 'Improve the SEO description below',
  },
  missing_metadata: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'Fix in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'seo-editor-anchor',
    nextActionLabel: 'Add the missing metadata below',
  },

  // ==========================================================================
  // Content issues → Product Answers tab
  // ==========================================================================
  missing_long_description: {
    fixSurface: IssueFixSurface.PRODUCT_ANSWERS,
    ctaLabel: 'Fix in Answers',
    highlightTarget: 'answers-tab-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-answers-draft-editor-module',
    nextActionLabel: 'Generate or write answer blocks below',
  },
  thin_content: {
    fixSurface: IssueFixSurface.PRODUCT_ANSWERS,
    ctaLabel: 'Fix in Answers',
    highlightTarget: 'answers-tab-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-answers-draft-editor-module',
    nextActionLabel: 'Expand content with answer blocks below',
  },
  low_entity_coverage: {
    fixSurface: IssueFixSurface.PRODUCT_ANSWERS,
    ctaLabel: 'Fix in Answers',
    highlightTarget: 'answers-tab-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-answers-draft-editor-module',
    nextActionLabel: 'Add entity-rich answer blocks below',
  },
  duplicate_product_content: {
    fixSurface: IssueFixSurface.PRODUCT_ANSWERS,
    ctaLabel: 'Fix in Answers',
    highlightTarget: 'answers-tab-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-answers-draft-editor-module',
    nextActionLabel: 'Differentiate content with answer blocks',
  },
  low_product_entity_coverage: {
    fixSurface: IssueFixSurface.PRODUCT_ANSWERS,
    ctaLabel: 'Fix in Answers',
    highlightTarget: 'answers-tab-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-answers-draft-editor-module',
    nextActionLabel: 'Improve entity coverage below',
  },
  product_content_depth: {
    fixSurface: IssueFixSurface.PRODUCT_ANSWERS,
    ctaLabel: 'Fix in Answers',
    highlightTarget: 'answers-tab-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-answers-draft-editor-module',
    nextActionLabel: 'Add depth with answer blocks below',
  },

  // ==========================================================================
  // Search intent issues → Product Search & Intent tab
  // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] Use search-intent-tab-anchor as canonical anchor
  // (specific module testids do not exist in the DOM)
  // ==========================================================================
  answer_surface_weakness: {
    fixSurface: IssueFixSurface.PRODUCT_SEARCH_INTENT,
    ctaLabel: 'Review in Search & Intent',
    highlightTarget: 'search-intent-tab-anchor',
    isActionableNow: true,
    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] Canonical tab anchor (no module-level testid exists)
    fixAnchorTestId: 'search-intent-tab-anchor',
    nextActionLabel: 'Review answer surface analysis below',
  },
  not_answer_ready: {
    fixSurface: IssueFixSurface.PRODUCT_SEARCH_INTENT,
    // [ISSUE-FIX-KIND-CLARITY-1] DIAGNOSTIC: no direct fix, just review
    ctaLabel: 'Review in Search & Intent',
    highlightTarget: 'search-intent-tab-anchor',
    isActionableNow: true,
    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] DIAGNOSTIC issues have no fixAnchorTestId (no scroll/highlight)
    nextActionLabel: 'Review answer readiness analysis below',
    fixKind: 'DIAGNOSTIC',
  },
  weak_intent_match: {
    fixSurface: IssueFixSurface.PRODUCT_SEARCH_INTENT,
    ctaLabel: 'Review in Search & Intent',
    highlightTarget: 'search-intent-tab-anchor',
    isActionableNow: true,
    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] Canonical tab anchor (no module-level testid exists)
    fixAnchorTestId: 'search-intent-tab-anchor',
    nextActionLabel: 'Review search intent match analysis below',
  },

  // ==========================================================================
  // Technical issues → Product Metadata tab (informational - no direct fix UI)
  // ==========================================================================
  indexability_problems: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'View in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-metadata-draft-status-module',
    nextActionLabel: 'Review indexability status below',
  },
  crawl_health_errors: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'View in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-metadata-draft-status-module',
    nextActionLabel: 'Review crawl health status below',
  },
  render_blocking_resources: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'View in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-metadata-draft-status-module',
    nextActionLabel: 'Review render blocking issues below',
  },
  indexability_conflict: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'View in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-metadata-draft-status-module',
    nextActionLabel: 'Review indexability conflict below',
  },
  slow_initial_response: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'View in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-metadata-draft-status-module',
    nextActionLabel: 'Review page speed status below',
  },
  excessive_page_weight: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'View in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-metadata-draft-status-module',
    nextActionLabel: 'Review page weight status below',
  },
  mobile_rendering_risk: {
    fixSurface: IssueFixSurface.PRODUCT_METADATA,
    ctaLabel: 'View in Metadata',
    highlightTarget: 'seo-editor-anchor',
    isActionableNow: true,
    fixAnchorTestId: 'product-metadata-draft-status-module',
    nextActionLabel: 'Review mobile rendering status below',
  },

  // ==========================================================================
  // External fixes (Shopify admin) - informational only
  // ==========================================================================
  missing_product_image: {
    fixSurface: IssueFixSurface.EXTERNAL_SHOPIFY,
    ctaLabel: 'Fix in Shopify',
    isActionableNow: false,
    nextActionLabel: 'Add images in Shopify admin',
  },
  missing_price: {
    fixSurface: IssueFixSurface.EXTERNAL_SHOPIFY,
    ctaLabel: 'Fix in Shopify',
    isActionableNow: false,
    nextActionLabel: 'Set price in Shopify admin',
  },
  missing_category: {
    fixSurface: IssueFixSurface.EXTERNAL_SHOPIFY,
    ctaLabel: 'Fix in Shopify',
    isActionableNow: false,
    nextActionLabel: 'Add category in Shopify admin',
  },
  brand_navigational_weakness: {
    fixSurface: IssueFixSurface.EXTERNAL_SHOPIFY,
    ctaLabel: 'Fix in Shopify',
    isActionableNow: false,
    nextActionLabel: 'Configure brand settings in Shopify',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the issue key from a DeoIssue, preferring type over id.
 */
function getIssueKey(issue: DeoIssue): string {
  return (issue.type as string | undefined) || issue.id;
}

/**
 * Gets the pillar ID for an issue, preferring backend-provided pillarId.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getIssuePillarId(issue: DeoIssue): DeoPillarId | undefined {
  if (issue.pillarId) {
    return issue.pillarId;
  }
  return ISSUE_UI_CONFIG[issue.id]?.pillarId;
}

/**
 * Returns a deterministic fix path for an issue in the PRODUCT workspace context.
 * Returns null if the issue cannot be fixed in a product tab (orphan/external).
 *
 * @param issue - The DEO issue
 * @returns IssueFixPath if actionable in product workspace, null otherwise
 */
export function getIssueFixPathForProduct(
  issue: DeoIssue
): IssueFixPath | null {
  const issueKey = getIssueKey(issue);
  const fixConfig = ISSUE_FIX_PATH_MAP[issueKey];

  // No mapping = orphan issue
  if (!fixConfig) {
    return null;
  }

  // External fixes are not actionable in product workspace
  if (fixConfig.fixSurface === IssueFixSurface.EXTERNAL_SHOPIFY) {
    return null;
  }

  // Work Queue fixes are not actionable in product workspace
  if (fixConfig.fixSurface === IssueFixSurface.WORK_QUEUE) {
    return null;
  }

  // Must have a tab target
  const tab = FIX_SURFACE_TO_TAB[fixConfig.fixSurface];
  if (!tab) {
    return null;
  }

  return {
    ...fixConfig,
    routeTarget: `?tab=${tab}`,
  };
}

/**
 * Returns a deterministic fix path for an issue in the PROJECT context.
 * Includes both product-level fixes and work queue routing.
 * Returns null only if the issue is a true orphan (no deterministic destination).
 *
 * [ISSUE-FIX-ROUTE-INTEGRITY-1] Dev-time guardrail: warns when actionable issues lack mappings.
 *
 * @param issue - The DEO issue
 * @returns IssueFixPath if any fix destination exists, null otherwise
 */
export function getIssueFixPathForProject(
  issue: DeoIssue
): IssueFixPath | null {
  const issueKey = getIssueKey(issue);
  const fixConfig = ISSUE_FIX_PATH_MAP[issueKey];

  // No mapping = orphan issue
  if (!fixConfig) {
    // [ISSUE-FIX-ROUTE-INTEGRITY-1] Dev-time warning for unmapped issues
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV !== 'production' &&
      issue.isActionableNow === true
    ) {
      console.warn(
        `[ISSUE-FIX-ROUTE-INTEGRITY-1] Orphan issue detected: "${issueKey}" has no entry in ISSUE_FIX_PATH_MAP. ` +
          `Users cannot fix this issue. Add a mapping or mark as informational.`
      );
    }
    return null;
  }

  // External fixes are not actionable (no in-app destination)
  if (fixConfig.fixSurface === IssueFixSurface.EXTERNAL_SHOPIFY) {
    return null;
  }

  // Get tab target for product-level fixes
  const tab = FIX_SURFACE_TO_TAB[fixConfig.fixSurface];

  return {
    ...fixConfig,
    routeTarget: tab ? `?tab=${tab}` : '',
  };
}

/**
 * Builds the fully-qualified route for navigating from issues to a fix destination.
 * Includes from, issueId, highlight, and fixAnchor parameters.
 *
 * [ISSUE-TO-FIX-PATH-1 FIXUP-1] Added optional `from` parameter to preserve navigation origin.
 * [ISSUE-FIX-NAV-AND-ANCHORS-1] Added returnTo, returnLabel, and fixAnchor support.
 * [ISSUE-FIX-ROUTE-INTEGRITY-1] Returns null (no href) for unmapped issues to prevent dead clicks.
 *
 * DEV GUARDRAILS (non-production only):
 * - Warns when issue types are not found in ISSUE_FIX_PATH_MAP
 * - Ensures route integrity by surfacing missing mappings during development
 *
 * @param projectId - The project ID
 * @param issue - The DEO issue
 * @param primaryProductId - Optional product ID (uses issue.primaryProductId if not provided)
 * @param from - Optional origin context (e.g., 'issues', 'overview', 'deo', 'product_issues')
 * @param returnTo - Optional returnTo URL for multi-hop navigation
 * @param returnLabel - Optional label for the back link
 * @returns The full route path, or null if no route exists
 */
export function buildIssueFixHref(params: {
  projectId: string;
  issue: DeoIssue;
  primaryProductId?: string;
  from?: string;
  /** [ISSUE-FIX-NAV-AND-ANCHORS-1] ReturnTo URL for back navigation */
  returnTo?: string;
  /** [ISSUE-FIX-NAV-AND-ANCHORS-1] Label for back link */
  returnLabel?: string;
}): string | null {
  const {
    projectId,
    issue,
    primaryProductId,
    from = 'issues',
    returnTo,
    returnLabel,
  } = params;
  const fixPath = getIssueFixPathForProject(issue);

  // No fix path = no href
  if (!fixPath) {
    return null;
  }

  // Determine the product ID
  const productId = primaryProductId || issue.primaryProductId;

  // Helper to build query params consistently
  const buildQueryParams = (tab: string): URLSearchParams => {
    const queryParams = new URLSearchParams();
    queryParams.set('tab', tab);
    queryParams.set('from', from);
    queryParams.set('issueId', issue.id);
    if (fixPath.highlightTarget) {
      queryParams.set('highlight', fixPath.highlightTarget);
    }
    // [ISSUE-FIX-NAV-AND-ANCHORS-1] Add fixAnchor for scroll/highlight
    // [ISSUE-FIX-KIND-CLARITY-1] Skip fixAnchor for DIAGNOSTIC issues (no scroll/highlight needed)
    if (fixPath.fixAnchorTestId && fixPath.fixKind !== 'DIAGNOSTIC') {
      queryParams.set('fixAnchor', fixPath.fixAnchorTestId);
    }
    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1-AUDIT-3] fixKind is NOT passed in URL (derived from config only)
    // [ISSUE-FIX-NAV-AND-ANCHORS-1] Add returnTo navigation context
    if (returnTo) {
      queryParams.set('returnTo', returnTo);
    }
    if (returnLabel) {
      queryParams.set('returnLabel', returnLabel);
    }
    return queryParams;
  };

  // For product-level fixes, need a product ID
  if (
    fixPath.fixSurface !== IssueFixSurface.WORK_QUEUE &&
    fixPath.fixSurface !== IssueFixSurface.EXTERNAL_SHOPIFY
  ) {
    if (!productId) {
      // Fall back to first affected product
      const fallbackProductId = issue.affectedProducts?.[0];
      if (!fallbackProductId) {
        return null;
      }

      const tab = FIX_SURFACE_TO_TAB[fixPath.fixSurface] || 'metadata';
      const queryParams = buildQueryParams(tab);
      return `/projects/${projectId}/products/${fallbackProductId}?${queryParams.toString()}`;
    }

    const tab = FIX_SURFACE_TO_TAB[fixPath.fixSurface] || 'metadata';
    const queryParams = buildQueryParams(tab);
    return `/projects/${projectId}/products/${productId}?${queryParams.toString()}`;
  }

  // Work Queue destination
  if (fixPath.fixSurface === IssueFixSurface.WORK_QUEUE) {
    const queryParams = new URLSearchParams();
    queryParams.set('from', from);
    queryParams.set('issueId', issue.id);
    if (fixPath.fixAnchorTestId) {
      queryParams.set('fixAnchor', fixPath.fixAnchorTestId);
    }
    if (returnTo) {
      queryParams.set('returnTo', returnTo);
    }
    if (returnLabel) {
      queryParams.set('returnLabel', returnLabel);
    }
    return `/projects/${projectId}/work-queue?${queryParams.toString()}`;
  }

  return null;
}

/**
 * [ISSUE-FIX-NAV-AND-ANCHORS-1] Gets the fix path configuration for an issue by ID.
 * Useful for getting nextActionLabel and other metadata without building a full href.
 *
 * @param issueId - The issue ID or type key
 * @returns Fix path config or null if not mapped
 */
export function getIssueFixConfig(
  issueId: string
): Omit<IssueFixPath, 'routeTarget'> | null {
  return ISSUE_FIX_PATH_MAP[issueId] || null;
}

/**
 * Returns a safe, user-friendly title for an issue.
 * NEVER returns internal-looking identifiers.
 *
 * @param issue - The DEO issue
 * @returns Human-readable title, falling back to "Issue detected"
 */
export function getSafeIssueTitle(issue: DeoIssue): string {
  // First, check ISSUE_UI_CONFIG
  const uiConfig = ISSUE_UI_CONFIG[issue.id];
  if (uiConfig?.label) {
    return uiConfig.label;
  }

  // Check if issue.title looks like an internal ID (snake_case, UUIDs, etc.)
  if (issue.title) {
    const looksInternal =
      /^[a-z_]+$/.test(issue.title) || // snake_case
      /^[0-9a-f-]{36}$/i.test(issue.title) || // UUID
      issue.title.includes('_id') ||
      issue.title.length < 5;

    if (!looksInternal) {
      return issue.title;
    }
  }

  // Fallback
  return 'Issue detected';
}

/**
 * Returns a safe, user-friendly description for an issue.
 * NEVER returns internal-looking identifiers.
 *
 * @param issue - The DEO issue
 * @returns Human-readable description, falling back to generic text
 */
export function getSafeIssueDescription(issue: DeoIssue): string {
  // First, check ISSUE_UI_CONFIG
  const uiConfig = ISSUE_UI_CONFIG[issue.id];
  if (uiConfig?.description) {
    return uiConfig.description;
  }

  // Check if issue.description looks valid
  if (issue.description && issue.description.length > 20) {
    return issue.description;
  }

  // Fallback
  return "This issue may affect your store's discoverability. Review and resolve when possible.";
}

/**
 * [ISSUE-TO-FIX-PATH-1 FIXUP-2] Returns a safe title for insights-style issue data.
 * Works with objects that have `issueId` and `title` (from ProjectInsightsResponse).
 *
 * @param issue - Object with issueId and optional title
 * @returns Human-readable title, falling back to "Issue detected"
 */
export function getSafeInsightsIssueTitle(issue: {
  issueId: string;
  title?: string;
}): string {
  // First, check ISSUE_UI_CONFIG using issueId
  const uiConfig = ISSUE_UI_CONFIG[issue.issueId];
  if (uiConfig?.label) {
    return uiConfig.label;
  }

  // Check if title looks like an internal ID (snake_case, UUIDs, etc.)
  if (issue.title) {
    const looksInternal =
      /^[a-z_]+$/.test(issue.title) || // snake_case
      /^[0-9a-f-]{36}$/i.test(issue.title) || // UUID
      issue.title.includes('_id') ||
      issue.title.length < 5;

    if (!looksInternal) {
      return issue.title;
    }
  }

  // Fallback
  return 'Issue detected';
}

/**
 * Checks if an issue is actionable (has a deterministic fix path).
 *
 * @param issue - The DEO issue
 * @returns true if actionable, false if orphan/informational
 */
export function isIssueActionable(issue: DeoIssue): boolean {
  return getIssueFixPathForProject(issue) !== null;
}

/**
 * Checks if an issue is actionable specifically within a product workspace.
 *
 * @param issue - The DEO issue
 * @returns true if actionable in product, false otherwise
 */
export function isIssueActionableInProduct(issue: DeoIssue): boolean {
  return getIssueFixPathForProduct(issue) !== null;
}

/**
 * Gets all actionable issues from a list, filtering out orphans.
 *
 * @param issues - Array of DEO issues
 * @returns Array of actionable issues only
 */
export function getActionableIssues(issues: DeoIssue[]): DeoIssue[] {
  return issues.filter(isIssueActionable);
}

/**
 * Gets all issues actionable in a product workspace.
 *
 * @param issues - Array of DEO issues
 * @returns Array of product-actionable issues only
 */
export function getActionableIssuesForProduct(issues: DeoIssue[]): DeoIssue[] {
  return issues.filter(isIssueActionableInProduct);
}
