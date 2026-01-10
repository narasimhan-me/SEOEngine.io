/**
 * [ISSUE-FIX-NAV-AND-ANCHORS-1] Navigation Context & ReturnTo Validation
 *
 * Single source of truth for multi-hop navigation in the Issue→Fix flow.
 * Ensures safe navigation with no open redirect vulnerabilities.
 *
 * Key Invariants:
 * 1. returnTo URLs must be project-scoped (same projectId)
 * 2. No protocol schemes allowed (no http:, https:, javascript:)
 * 3. No path traversal allowed (no .., //)
 * 4. External URLs are always rejected
 */

// =============================================================================
// From Context Enum (Navigation Origin)
// =============================================================================

/**
 * Valid navigation origins for the Issue→Fix flow.
 * Used to derive default back labels and track navigation chain.
 */
export type FromContext =
  | 'store_health'
  | 'work_queue'
  | 'issues'
  | 'products'
  | 'pages'
  | 'collections'
  | 'overview'
  | 'deo'
  | 'product_issues'
  | 'playbook_preview'
  | 'playbook_results'
  | 'asset_list'
  | 'issues_engine'
  | 'playbook';

/**
 * Human-readable labels for navigation origins.
 */
export const FROM_CONTEXT_LABELS: Record<FromContext, string> = {
  store_health: 'Store Health',
  work_queue: 'Work Queue',
  issues: 'Issues',
  products: 'Products',
  pages: 'Pages',
  collections: 'Collections',
  overview: 'Overview',
  deo: 'DEO Overview',
  product_issues: 'Product Issues',
  playbook_preview: 'Playbook Preview',
  playbook_results: 'Playbook Results',
  asset_list: 'Asset list',
  issues_engine: 'Issues Engine',
  playbook: 'Playbooks',
};

/**
 * Default back routes for each navigation origin.
 */
export const FROM_CONTEXT_ROUTES: Record<FromContext, (projectId: string) => string> = {
  store_health: (projectId) => `/projects/${projectId}/store-health`,
  work_queue: (projectId) => `/projects/${projectId}/work-queue`,
  issues: (projectId) => `/projects/${projectId}/issues`,
  products: (projectId) => `/projects/${projectId}/products`,
  pages: (projectId) => `/projects/${projectId}/assets/pages`,
  collections: (projectId) => `/projects/${projectId}/assets/collections`,
  overview: (projectId) => `/projects/${projectId}/overview`,
  deo: (projectId) => `/projects/${projectId}/deo`,
  product_issues: (projectId) => `/projects/${projectId}/issues`,
  playbook_preview: (projectId) => `/projects/${projectId}/automation/playbooks`,
  playbook_results: (projectId) => `/projects/${projectId}/automation/playbooks`,
  asset_list: (projectId) => `/projects/${projectId}/products`,
  issues_engine: (projectId) => `/projects/${projectId}/issues`,
  playbook: (projectId) => `/projects/${projectId}/automation/playbooks`,
};

// =============================================================================
// ReturnTo Validation
// =============================================================================

/**
 * Validates a returnTo URL for safe navigation.
 *
 * Security checks:
 * - No protocol schemes (http:, https:, javascript:, data:, etc.)
 * - No double slashes (//)
 * - No path traversal (..)
 * - No encoded traversal (%2e%2e, %2f%2f)
 * - Must start with /projects/{projectId}/
 * - Must not reference a different project
 *
 * @param projectId - The current project ID
 * @param returnTo - The returnTo URL to validate
 * @returns Type guard indicating if returnTo is safe
 */
export function isValidReturnTo(projectId: string, returnTo: string | null | undefined): returnTo is string {
  if (!returnTo || typeof returnTo !== 'string') {
    return false;
  }

  // Trim and normalize
  const normalized = returnTo.trim();

  // Must have content
  if (normalized.length === 0) {
    return false;
  }

  // Reject protocol schemes (case-insensitive)
  const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(normalized);
  if (hasProtocol) {
    return false;
  }

  // Reject double slashes (protocol-relative URLs or path issues)
  if (normalized.includes('//')) {
    return false;
  }

  // Reject path traversal (literal and encoded)
  if (normalized.includes('..')) {
    return false;
  }

  // Check for URL-encoded traversal patterns
  const decoded = decodeURIComponent(normalized).toLowerCase();
  if (decoded.includes('..') || decoded.includes('//')) {
    return false;
  }

  // Must be a relative path starting with /
  if (!normalized.startsWith('/')) {
    return false;
  }

  // Must be within the current project
  const projectPrefix = `/projects/${projectId}/`;
  if (!normalized.startsWith(projectPrefix)) {
    // Allow exact /projects/{projectId} without trailing slash
    if (normalized !== `/projects/${projectId}`) {
      return false;
    }
  }

  // Reject if it references a different project ID
  const projectPattern = /^\/projects\/([^/?#]+)/;
  const match = normalized.match(projectPattern);
  if (match && match[1] !== projectId) {
    return false;
  }

  return true;
}

/**
 * Extracts and validates returnTo context from search params.
 *
 * @param projectId - The current project ID
 * @param searchParams - URLSearchParams from the current URL
 * @returns Validated navigation context with safe fallbacks
 */
export function getValidatedReturnTo(
  projectId: string,
  searchParams: URLSearchParams | null
): {
  returnTo?: string;
  returnLabel?: string;
  from?: FromContext;
} {
  if (!searchParams) {
    return {};
  }

  const returnTo = searchParams.get('returnTo');
  const returnLabel = searchParams.get('returnLabel');
  const from = searchParams.get('from') as FromContext | null;

  const result: {
    returnTo?: string;
    returnLabel?: string;
    from?: FromContext;
  } = {};

  // Validate returnTo
  if (isValidReturnTo(projectId, returnTo)) {
    result.returnTo = returnTo;
  }

  // Include returnLabel only if returnTo is valid
  if (result.returnTo && returnLabel && typeof returnLabel === 'string' && returnLabel.length > 0) {
    // Sanitize returnLabel (max 50 chars, no HTML)
    result.returnLabel = returnLabel.slice(0, 50).replace(/<[^>]*>/g, '');
  }

  // Validate from context
  if (from && from in FROM_CONTEXT_LABELS) {
    result.from = from;
  }

  return result;
}

/**
 * Builds URLSearchParams entries for returnTo navigation.
 *
 * @param params - Navigation parameters
 * @returns URLSearchParams with returnTo, returnLabel, and from
 */
export function buildReturnToParams(params: {
  projectId: string;
  currentPathWithQuery: string;
  from: FromContext;
  returnLabel?: string;
}): URLSearchParams {
  const { projectId, currentPathWithQuery, from, returnLabel } = params;

  const searchParams = new URLSearchParams();

  // Only include returnTo if it passes validation
  if (isValidReturnTo(projectId, currentPathWithQuery)) {
    searchParams.set('returnTo', currentPathWithQuery);
  }

  // Set from context
  searchParams.set('from', from);

  // Set returnLabel (derive from 'from' if not provided)
  const label = returnLabel || `Back to ${FROM_CONTEXT_LABELS[from]}`;
  searchParams.set('returnLabel', label);

  return searchParams;
}

/**
 * Gets the default back link when returnTo is invalid or missing.
 *
 * @param projectId - The current project ID
 * @param fallback - The fallback destination type
 * @returns Object with href and label for the back link
 */
export function getDefaultBackLink(
  projectId: string,
  fallback: 'issues' | 'products' | 'work_queue' | 'store_health'
): { href: string; label: string } {
  const route = FROM_CONTEXT_ROUTES[fallback](projectId);
  const label = `Back to ${FROM_CONTEXT_LABELS[fallback]}`;

  return { href: route, label };
}

/**
 * Builds a complete back link from navigation context.
 *
 * Priority:
 * 1. Valid returnTo URL with returnLabel
 * 2. Default route derived from 'from' context
 * 3. Fallback route
 *
 * @param params - Navigation parameters
 * @returns Object with href and label for the back link
 */
export function buildBackLink(params: {
  projectId: string;
  returnTo?: string;
  returnLabel?: string;
  from?: FromContext;
  fallback: 'issues' | 'products' | 'work_queue' | 'store_health';
}): { href: string; label: string } {
  const { projectId, returnTo, returnLabel, from, fallback } = params;

  // Priority 1: Valid returnTo
  if (isValidReturnTo(projectId, returnTo)) {
    const label = returnLabel || (from ? `Back to ${FROM_CONTEXT_LABELS[from]}` : 'Go back');
    return { href: returnTo, label };
  }

  // Priority 2: Derive from 'from' context
  if (from && from in FROM_CONTEXT_ROUTES) {
    return {
      href: FROM_CONTEXT_ROUTES[from](projectId),
      label: `Back to ${FROM_CONTEXT_LABELS[from]}`,
    };
  }

  // Priority 3: Use fallback
  return getDefaultBackLink(projectId, fallback);
}

/**
 * Appends returnTo params to an existing URL.
 *
 * @param baseUrl - The base URL to append to
 * @param params - Navigation parameters to add
 * @returns URL string with returnTo params appended
 */
export function appendReturnToParams(
  baseUrl: string,
  params: {
    projectId: string;
    currentPathWithQuery: string;
    from: FromContext;
    returnLabel?: string;
  }
): string {
  const returnParams = buildReturnToParams(params);

  // Parse existing URL
  const hasQueryString = baseUrl.includes('?');

  if (hasQueryString) {
    // Append to existing query string
    return `${baseUrl}&${returnParams.toString()}`;
  } else {
    // Add new query string
    return `${baseUrl}?${returnParams.toString()}`;
  }
}

/**
 * Gets the current page URL with query params for use as returnTo.
 *
 * @param pathname - Current pathname
 * @param searchParams - Current search params
 * @returns Full path with query string
 */
export function getCurrentPathWithQuery(
  pathname: string,
  searchParams: URLSearchParams | null
): string {
  if (!searchParams || searchParams.toString() === '') {
    return pathname;
  }

  // Exclude returnTo-related params and 'from' to prevent circular references and returnTo chains
  const cleanParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (!['returnTo', 'returnLabel', 'from'].includes(key)) {
      cleanParams.set(key, value);
    }
  });

  const queryString = cleanParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
