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
export const SHOPIFY_SCOPE_MATRIX: Record<
  ShopifyCapability,
  readonly string[]
> = {
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
export const ALL_SHOPIFY_CAPABILITIES: readonly ShopifyCapability[] =
  Object.keys(SHOPIFY_SCOPE_MATRIX) as ShopifyCapability[];

/**
 * [SHOPIFY-SCOPE-IMPLICATIONS-1] Scope implication rules for coverage checks.
 *
 * Shopify write scopes implicitly grant read access. For missing-scope detection
 * and messaging, we treat write_X as satisfying read_X to prevent false warnings.
 *
 * Example: User has write_products but not read_products explicitly.
 * Without implication: "Missing read_products" (false positive)
 * With implication: No warning (correct behavior)
 *
 * IMPORTANT: These implications are for COVERAGE CHECKS ONLY.
 * The actual OAuth scopes requested/stored are unchanged.
 */
export const SHOPIFY_SCOPE_IMPLICATIONS: Record<string, string[]> = {
  // write_products grants read_products access
  write_products: ['read_products'],
  // write_content grants read_content access (future-proofing)
  write_content: ['read_content'],
  // write_themes grants read_themes access (future-proofing)
  write_themes: ['read_themes'],
} as const;

/**
 * [SHOPIFY-SCOPE-IMPLICATIONS-1] Expand granted scopes with implied scopes.
 *
 * Returns a new set containing the original granted scopes plus any
 * scopes that are implicitly granted (e.g., write_products ⇒ read_products).
 *
 * @param grantedScopes - Raw scopes granted by Shopify
 * @returns Expanded set including implied scopes
 */
export function expandGrantedScopesWithImplications(
  grantedScopes: string[]
): Set<string> {
  const expanded = new Set(grantedScopes);
  for (const scope of grantedScopes) {
    const implied = SHOPIFY_SCOPE_IMPLICATIONS[scope];
    if (implied) {
      for (const impliedScope of implied) {
        expanded.add(impliedScope);
      }
    }
  }
  return expanded;
}

/**
 * [SHOPIFY-SCOPE-PARSE-ROBUSTNESS-1] Parse scope value into a normalized array.
 *
 * Supports multiple input formats for backward compatibility with legacy DB storage:
 * - Comma-separated string: "read_products,write_products"
 * - Whitespace-separated string: "read_products write_products"
 * - Mixed delimiters: "read_products, write_products read_content"
 * - JSON array (from Prisma Json field): ["read_products", "write_products"]
 * - Array with mixed elements: ["read_products", " write_products ", "", "read_content"]
 *
 * Returns [] for null, undefined, numbers, plain objects, or other non-parseable inputs.
 *
 * @param value - Raw scope value (string, string[], or unknown)
 * @returns Array of trimmed, non-empty scope strings
 */
export function parseShopifyScopesCsv(value: unknown): string[] {
  // Handle string input: split on commas and/or whitespace
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    // Split on any combination of commas and whitespace
    return trimmed
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Handle array input (legacy JSON array format from Prisma Json field)
  if (Array.isArray(value)) {
    const result: string[] = [];
    for (const element of value) {
      if (typeof element === 'string') {
        // Each string element may itself contain delimiters, so parse recursively
        const parsed = parseShopifyScopesCsv(element);
        result.push(...parsed);
      }
      // Skip non-string elements silently
    }
    return result;
  }

  // Return empty for null, undefined, numbers, objects, etc.
  return [];
}

/**
 * Compute the minimal set of Shopify scopes required for a given set of capabilities.
 * Deduplicates and sorts for deterministic comparison.
 *
 * @param capabilities - Array of capability identifiers
 * @returns Sorted, deduplicated array of required scopes
 */
export function computeShopifyRequiredScopes(
  capabilities: ShopifyCapability[]
): string[] {
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
 * [SHOPIFY-SCOPE-IMPLICATIONS-1] Uses implication-aware expansion:
 * write_products satisfies read_products, so no false "missing read_products" warnings.
 *
 * @param grantedScopes - Array of scopes granted by Shopify
 * @param capabilities - Array of capabilities to check
 * @returns Object with missing scopes and whether all are covered
 */
export function checkScopeCoverage(
  grantedScopes: string[],
  capabilities: ShopifyCapability[]
): { covered: boolean; missingScopes: string[] } {
  const required = computeShopifyRequiredScopes(capabilities);
  // [SHOPIFY-SCOPE-IMPLICATIONS-1] Expand granted scopes with implied scopes
  const effectiveGranted = expandGrantedScopesWithImplications(grantedScopes);
  const missingScopes = required.filter((s) => !effectiveGranted.has(s));
  return {
    covered: missingScopes.length === 0,
    missingScopes,
  };
}
