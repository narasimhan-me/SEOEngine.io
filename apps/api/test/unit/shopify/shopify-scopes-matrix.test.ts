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
  SHOPIFY_SCOPE_IMPLICATIONS,
  parseShopifyScopesCsv,
  computeShopifyRequiredScopes,
  checkScopeCoverage,
  expandGrantedScopesWithImplications,
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

  /**
   * [SHOPIFY-SCOPE-IMPLICATIONS-1] Scope Implication Tests
   *
   * Shopify write scopes implicitly grant read access. These tests verify:
   * - write_products satisfies read_products requirement
   * - read_products does NOT satisfy write_products requirement (no reverse implication)
   *
   * TRUST INVARIANT: No false "missing read_X" warnings when write_X is granted.
   */
  describe('Scope Implications (SHOPIFY-SCOPE-IMPLICATIONS-1)', () => {
    describe('SHOPIFY_SCOPE_IMPLICATIONS', () => {
      it('write_products implies read_products', () => {
        expect(SHOPIFY_SCOPE_IMPLICATIONS.write_products).toContain('read_products');
      });

      it('write_content implies read_content', () => {
        expect(SHOPIFY_SCOPE_IMPLICATIONS.write_content).toContain('read_content');
      });

      it('write_themes implies read_themes', () => {
        expect(SHOPIFY_SCOPE_IMPLICATIONS.write_themes).toContain('read_themes');
      });
    });

    describe('expandGrantedScopesWithImplications', () => {
      it('expands write_products to include read_products', () => {
        const expanded = expandGrantedScopesWithImplications(['write_products']);
        expect(expanded.has('write_products')).toBe(true);
        expect(expanded.has('read_products')).toBe(true);
      });

      it('expands write_content to include read_content', () => {
        const expanded = expandGrantedScopesWithImplications(['write_content']);
        expect(expanded.has('write_content')).toBe(true);
        expect(expanded.has('read_content')).toBe(true);
      });

      it('expands write_themes to include read_themes', () => {
        const expanded = expandGrantedScopesWithImplications(['write_themes']);
        expect(expanded.has('write_themes')).toBe(true);
        expect(expanded.has('read_themes')).toBe(true);
      });

      it('does not add false implications for read scopes', () => {
        const expanded = expandGrantedScopesWithImplications(['read_products']);
        expect(expanded.has('read_products')).toBe(true);
        expect(expanded.has('write_products')).toBe(false);
      });

      it('handles multiple scopes with mixed implications', () => {
        const expanded = expandGrantedScopesWithImplications([
          'write_products',
          'read_themes',
        ]);
        expect(expanded.has('write_products')).toBe(true);
        expect(expanded.has('read_products')).toBe(true); // implied
        expect(expanded.has('read_themes')).toBe(true);
        expect(expanded.has('write_themes')).toBe(false); // not implied
      });

      it('handles empty array', () => {
        const expanded = expandGrantedScopesWithImplications([]);
        expect(expanded.size).toBe(0);
      });
    });

    describe('checkScopeCoverage with implications', () => {
      /**
       * CRITICAL TEST: write_products satisfies read_products for collections_sync
       *
       * collections_sync requires read_products. If user has write_products,
       * they implicitly have read_products access, so no missing scope warning.
       */
      it('write_products satisfies read_products requirement for collections_sync', () => {
        const granted = ['write_products'];
        const capabilities: ShopifyCapability[] = ['collections_sync'];
        const result = checkScopeCoverage(granted, capabilities);
        expect(result.covered).toBe(true);
        expect(result.missingScopes).toEqual([]);
      });

      /**
       * CRITICAL TEST: write_products satisfies read_products for products_sync
       */
      it('write_products satisfies read_products requirement for products_sync', () => {
        const granted = ['write_products'];
        const capabilities: ShopifyCapability[] = ['products_sync'];
        const result = checkScopeCoverage(granted, capabilities);
        expect(result.covered).toBe(true);
        expect(result.missingScopes).toEqual([]);
      });

      /**
       * REGRESSION TEST: read_products does NOT satisfy write_products
       *
       * products_apply requires write_products. Having read_products alone
       * should NOT satisfy this requirement (no reverse implication).
       */
      it('read_products does NOT satisfy write_products requirement for products_apply', () => {
        const granted = ['read_products'];
        const capabilities: ShopifyCapability[] = ['products_apply'];
        const result = checkScopeCoverage(granted, capabilities);
        expect(result.covered).toBe(false);
        expect(result.missingScopes).toEqual(['write_products']);
      });

      /**
       * Combined test: write_products covers both sync and apply capabilities
       */
      it('write_products covers both products_sync and products_apply', () => {
        const granted = ['write_products'];
        const capabilities: ShopifyCapability[] = ['products_sync', 'products_apply'];
        const result = checkScopeCoverage(granted, capabilities);
        expect(result.covered).toBe(true);
        expect(result.missingScopes).toEqual([]);
      });

      /**
       * write_content satisfies read_content for pages_sync and blogs_sync
       */
      it('write_content satisfies read_content requirement for pages_sync', () => {
        const granted = ['write_content'];
        const capabilities: ShopifyCapability[] = ['pages_sync'];
        const result = checkScopeCoverage(granted, capabilities);
        expect(result.covered).toBe(true);
        expect(result.missingScopes).toEqual([]);
      });

      it('write_content satisfies read_content requirement for blogs_sync', () => {
        const granted = ['write_content'];
        const capabilities: ShopifyCapability[] = ['blogs_sync'];
        const result = checkScopeCoverage(granted, capabilities);
        expect(result.covered).toBe(true);
        expect(result.missingScopes).toEqual([]);
      });

      /**
       * write_themes satisfies read_themes for themes_read capability
       */
      it('write_themes satisfies read_themes requirement for themes_read', () => {
        const granted = ['write_themes'];
        const capabilities: ShopifyCapability[] = ['themes_read'];
        const result = checkScopeCoverage(granted, capabilities);
        expect(result.covered).toBe(true);
        expect(result.missingScopes).toEqual([]);
      });
    });
  });
});
