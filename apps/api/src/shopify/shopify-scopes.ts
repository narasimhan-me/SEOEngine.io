/**
 * [SHOPIFY-SCOPES-MATRIX-1] Authoritative Shopify Scope Matrix
 *
 * This module defines the canonical mapping of EngineO.ai capabilities to
 * Shopify OAuth scopes. It is the SINGLE SOURCE OF TRUTH for:
 * - Which scopes are required for each capability
 * - Scope list parsing and normalization
 * - Required scope computation for OAuth flows
 *
 * LOCKED CONTRACT:
 * - Do not add scopes without explicit phase approval
 * - All scope changes must be reflected in SHOPIFY_SCOPES_MATRIX.md
 */

/**
 * Canonical EngineO.ai capability identifiers.
 * Each capability maps to one or more Shopify scopes.
 */
export type ShopifyCapability =
  | 'products_sync'
  | 'products_apply'
  | 'collections_sync'
  | 'pages_sync'
  | 'blogs_sync'
  | 'themes_read';

/**
 * Authoritative capability → scope mapping.
 * Each capability lists the exact Shopify scopes it requires.
 *
 * LOCKED: Do not modify without phase approval.
 */
export const SHOPIFY_SCOPE_MATRIX: Record<ShopifyCapability, readonly string[]> = {
  products_sync: ['read_products'],
  products_apply: ['write_products'],
  collections_sync: ['read_products'],
  pages_sync: ['read_content'],
  blogs_sync: ['read_content'],
  themes_read: ['read_themes'],
} as const;

/**
 * All defined capabilities for iteration.
 */
export const ALL_SHOPIFY_CAPABILITIES: readonly ShopifyCapability[] = Object.keys(
  SHOPIFY_SCOPE_MATRIX,
) as ShopifyCapability[];

/**
 * Parse a comma-separated scope string into a normalized array.
 * Handles undefined, empty strings, and whitespace gracefully.
 *
 * @param value - Raw scope string (e.g., "read_products,write_products")
 * @returns Array of trimmed scope strings
 */
export function parseShopifyScopesCsv(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Compute the minimal set of Shopify scopes required for a given set of capabilities.
 * Deduplicates and sorts for deterministic comparison.
 *
 * @param capabilities - Array of capability identifiers
 * @returns Sorted, deduplicated array of required scopes
 */
export function computeShopifyRequiredScopes(capabilities: ShopifyCapability[]): string[] {
  const required = new Set<string>();
  for (const cap of capabilities) {
    const scopes = SHOPIFY_SCOPE_MATRIX[cap];
    if (scopes) {
      for (const scope of scopes) {
        required.add(scope);
      }
    }
  }
  return Array.from(required).sort();
}

/**
 * Check if a granted scope set covers all required scopes for given capabilities.
 *
 * @param grantedScopes - Array of scopes granted by Shopify
 * @param capabilities - Array of capabilities to check
 * @returns Object with missing scopes and whether all are covered
 */
export function checkScopeCoverage(
  grantedScopes: string[],
  capabilities: ShopifyCapability[],
): { covered: boolean; missingScopes: string[] } {
  const required = computeShopifyRequiredScopes(capabilities);
  const granted = new Set(grantedScopes);
  const missingScopes = required.filter((s) => !granted.has(s));
  return {
    covered: missingScopes.length === 0,
    missingScopes,
  };
}
