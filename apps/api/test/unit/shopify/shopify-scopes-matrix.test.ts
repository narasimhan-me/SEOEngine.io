/**
 * [SHOPIFY-SCOPES-MATRIX-1] Unit tests for Shopify Scope Matrix
 *
 * Verifies the authoritative capability → scope mapping is correct
 * and that scope computation functions work as expected.
 */

import {
  ShopifyCapability,
  SHOPIFY_SCOPE_MATRIX,
  ALL_SHOPIFY_CAPABILITIES,
  parseShopifyScopesCsv,
  computeShopifyRequiredScopes,
  checkScopeCoverage,
} from '../../../src/shopify/shopify-scopes';

describe('Shopify Scope Matrix (SHOPIFY-SCOPES-MATRIX-1)', () => {
  describe('SHOPIFY_SCOPE_MATRIX', () => {
    it('products_sync requires read_products', () => {
      expect(SHOPIFY_SCOPE_MATRIX.products_sync).toContain('read_products');
    });

    it('products_apply requires write_products', () => {
      expect(SHOPIFY_SCOPE_MATRIX.products_apply).toContain('write_products');
    });

    it('collections_sync requires read_products', () => {
      expect(SHOPIFY_SCOPE_MATRIX.collections_sync).toContain('read_products');
    });

    it('pages_sync requires read_content', () => {
      expect(SHOPIFY_SCOPE_MATRIX.pages_sync).toContain('read_content');
    });

    it('blogs_sync requires read_content', () => {
      expect(SHOPIFY_SCOPE_MATRIX.blogs_sync).toContain('read_content');
    });

    it('themes_read requires read_themes', () => {
      expect(SHOPIFY_SCOPE_MATRIX.themes_read).toContain('read_themes');
    });

    it('ALL_SHOPIFY_CAPABILITIES contains all defined capabilities', () => {
      expect(ALL_SHOPIFY_CAPABILITIES).toContain('products_sync');
      expect(ALL_SHOPIFY_CAPABILITIES).toContain('products_apply');
      expect(ALL_SHOPIFY_CAPABILITIES).toContain('collections_sync');
      expect(ALL_SHOPIFY_CAPABILITIES).toContain('pages_sync');
      expect(ALL_SHOPIFY_CAPABILITIES).toContain('blogs_sync');
      expect(ALL_SHOPIFY_CAPABILITIES).toContain('themes_read');
      expect(ALL_SHOPIFY_CAPABILITIES.length).toBe(6);
    });
  });

  describe('parseShopifyScopesCsv', () => {
    it('parses comma-separated scopes', () => {
      const result = parseShopifyScopesCsv('read_products,write_products');
      expect(result).toEqual(['read_products', 'write_products']);
    });

    it('trims whitespace', () => {
      const result = parseShopifyScopesCsv(' read_products , write_products ');
      expect(result).toEqual(['read_products', 'write_products']);
    });

    it('filters empty strings', () => {
      const result = parseShopifyScopesCsv('read_products,,write_products');
      expect(result).toEqual(['read_products', 'write_products']);
    });

    it('returns empty array for non-string input', () => {
      expect(parseShopifyScopesCsv(null)).toEqual([]);
      expect(parseShopifyScopesCsv(undefined)).toEqual([]);
      expect(parseShopifyScopesCsv(123)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseShopifyScopesCsv('')).toEqual([]);
      expect(parseShopifyScopesCsv('   ')).toEqual([]);
    });
  });

  describe('computeShopifyRequiredScopes', () => {
    it('computes scopes for single capability', () => {
      const result = computeShopifyRequiredScopes(['products_sync']);
      expect(result).toEqual(['read_products']);
    });

    it('computes scopes for multiple capabilities', () => {
      const result = computeShopifyRequiredScopes(['products_sync', 'products_apply']);
      expect(result).toEqual(['read_products', 'write_products']);
    });

    it('deduplicates shared scopes', () => {
      // pages_sync and blogs_sync both require read_content
      const result = computeShopifyRequiredScopes(['pages_sync', 'blogs_sync']);
      expect(result).toEqual(['read_content']);
    });

    it('returns sorted array', () => {
      const result = computeShopifyRequiredScopes([
        'themes_read',
        'products_apply',
        'pages_sync',
        'products_sync',
      ]);
      // Alphabetically: read_content, read_products, read_themes, write_products
      expect(result).toEqual([
        'read_content',
        'read_products',
        'read_themes',
        'write_products',
      ]);
    });

    it('returns empty array for empty capabilities', () => {
      const result = computeShopifyRequiredScopes([]);
      expect(result).toEqual([]);
    });

    it('computes full scope set for all capabilities', () => {
      const result = computeShopifyRequiredScopes(ALL_SHOPIFY_CAPABILITIES as ShopifyCapability[]);
      expect(result).toEqual([
        'read_content',
        'read_products',
        'read_themes',
        'write_products',
      ]);
    });
  });

  describe('checkScopeCoverage', () => {
    it('returns covered:true when all required scopes are granted', () => {
      const granted = ['read_products', 'write_products', 'read_themes'];
      const capabilities: ShopifyCapability[] = ['products_sync', 'products_apply'];
      const result = checkScopeCoverage(granted, capabilities);
      expect(result.covered).toBe(true);
      expect(result.missingScopes).toEqual([]);
    });

    it('returns covered:false with missing scopes when not all are granted', () => {
      const granted = ['read_products'];
      const capabilities: ShopifyCapability[] = ['products_sync', 'products_apply'];
      const result = checkScopeCoverage(granted, capabilities);
      expect(result.covered).toBe(false);
      expect(result.missingScopes).toEqual(['write_products']);
    });

    it('correctly identifies pages_sync missing read_content', () => {
      const granted = ['read_products', 'write_products'];
      const capabilities: ShopifyCapability[] = ['pages_sync'];
      const result = checkScopeCoverage(granted, capabilities);
      expect(result.covered).toBe(false);
      expect(result.missingScopes).toEqual(['read_content']);
    });

    it('handles empty granted scopes', () => {
      const granted: string[] = [];
      const capabilities: ShopifyCapability[] = ['products_sync'];
      const result = checkScopeCoverage(granted, capabilities);
      expect(result.covered).toBe(false);
      expect(result.missingScopes).toEqual(['read_products']);
    });

    it('handles empty capabilities', () => {
      const granted = ['read_products'];
      const capabilities: ShopifyCapability[] = [];
      const result = checkScopeCoverage(granted, capabilities);
      expect(result.covered).toBe(true);
      expect(result.missingScopes).toEqual([]);
    });
  });
});
