/**
 * [ROUTE-INTEGRITY-1] Shared Route Context Utilities
 *
 * Single source of truth for from + returnTo URL construction.
 * Eliminates bespoke string concat at callsites.
 *
 * Key exports:
 * - RouteFrom: Type alias for FromContext
 * - encodeReturnTo: URL-encode a returnTo path
 * - withRouteContext: Append route context params to any href
 * - getSafeReturnTo: Extract validated returnTo from searchParams
 * - labelFrom: Get human-readable label for a from context
 * - getReturnToFromCurrentUrl: Build returnTo from current URL (stripping context params)
 */

import {
  type FromContext,
  FROM_CONTEXT_LABELS,
  getValidatedReturnTo,
} from './issue-fix-navigation';

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Route origin context - alias for FromContext for clearer naming at callsites.
 */
export type RouteFrom = FromContext;

// =============================================================================
// URL Encoding
// =============================================================================

/**
 * URL-encode a returnTo path for safe query param inclusion.
 */
export function encodeReturnTo(path: string): string {
  return encodeURIComponent(path);
}

// =============================================================================
// Route Context Builder
// =============================================================================

export interface RouteContextParams {
  from: RouteFrom;
  returnTo: string;
  pillar?: string;
  assetType?: string;
  assetId?: string;
  issueType?: string;
  mode?: string;
}

/**
 * Append route context params to an existing href.
 * Preserves existing query params already in href.
 *
 * @param href - Base URL (may already contain query params)
 * @param ctx - Route context params to append
 * @returns URL with route context appended
 */
export function withRouteContext(href: string, ctx: RouteContextParams): string {
  // Parse existing URL parts
  const hasQuery = href.includes('?');
  const [basePath, existingQuery] = hasQuery ? href.split('?', 2) : [href, ''];

  // Build params from existing query
  const params = new URLSearchParams(existingQuery);

  // Add route context params
  params.set('from', ctx.from);
  params.set('returnTo', ctx.returnTo);

  // Add optional params if provided
  if (ctx.pillar) params.set('pillar', ctx.pillar);
  if (ctx.assetType) params.set('assetType', ctx.assetType);
  if (ctx.assetId) params.set('assetId', ctx.assetId);
  if (ctx.issueType) params.set('issueType', ctx.issueType);
  if (ctx.mode) params.set('mode', ctx.mode);

  return `${basePath}?${params.toString()}`;
}

// =============================================================================
// Safe ReturnTo Extraction
// =============================================================================

/**
 * Get safe validated returnTo from search params.
 * Returns null if projectId is not available or returnTo is invalid.
 *
 * @param searchParams - URLSearchParams from current URL
 * @param projectId - Current project ID for validation
 * @returns Validated returnTo string or null
 */
export function getSafeReturnTo(
  searchParams: URLSearchParams | null,
  projectId?: string
): string | null {
  if (!searchParams || !projectId) {
    return null;
  }

  const validated = getValidatedReturnTo(projectId, searchParams);
  return validated.returnTo ?? null;
}

// =============================================================================
// Label Helpers
// =============================================================================

/**
 * Get human-readable label for a from context.
 * Falls back to the raw from value if not found in labels map.
 *
 * @param from - The from context value
 * @returns Human-readable label
 */
export function labelFrom(from: RouteFrom | string | null | undefined): string {
  if (!from) return '';

  // Check if it's a known context
  if (from in FROM_CONTEXT_LABELS) {
    return FROM_CONTEXT_LABELS[from as FromContext];
  }

  // Fallback: capitalize and replace underscores
  return from
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// Current URL Helpers
// =============================================================================

/**
 * Build a returnTo value from the current URL, stripping context params.
 * Strips: from, returnTo, returnLabel to prevent circular references.
 *
 * @param pathname - Current pathname
 * @param searchParams - Current search params
 * @returns Clean path with query (excludes context params)
 */
export function getReturnToFromCurrentUrl(
  pathname: string,
  searchParams: URLSearchParams | null
): string {
  if (!searchParams || searchParams.toString() === '') {
    return pathname;
  }

  // Build clean params, excluding context-related keys
  const cleanParams = new URLSearchParams();
  const excludeKeys = new Set(['from', 'returnTo', 'returnLabel']);

  searchParams.forEach((value, key) => {
    if (!excludeKeys.has(key)) {
      cleanParams.set(key, value);
    }
  });

  const queryString = cleanParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
