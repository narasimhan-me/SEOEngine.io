/**
 * TEST-3: Unit tests for assertLiveShopifyTestEnv() guard
 *
 * These tests validate that the live Shopify test environment guard
 * correctly refuses to run under unsafe conditions.
 */

import {
  assertLiveShopifyTestEnv,
  validateStoreInAllowlist,
} from '../../src/config/test-env-guard';

describe('TEST-3 – assertLiveShopifyTestEnv()', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env after each test
    process.env = { ...originalEnv };
  });

  function setValidEnv(): void {
    process.env.ENGINEO_LIVE_SHOPIFY_TEST = '1';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL_LIVE_TEST =
      'postgresql://user:pass@localhost:5432/engineo_live_test';
    process.env.SHOPIFY_API_KEY_TEST = 'test_api_key_12345';
    process.env.SHOPIFY_API_SECRET_TEST = 'test_api_secret_67890';
    process.env.SHOPIFY_TEST_STORE_ALLOWLIST =
      'test-store.myshopify.com,dev-store.myshopify.com';
  }

  describe('refuses when ENGINEO_LIVE_SHOPIFY_TEST is missing', () => {
    it('throws when flag is not set', () => {
      setValidEnv();
      delete process.env.ENGINEO_LIVE_SHOPIFY_TEST;

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /ENGINEO_LIVE_SHOPIFY_TEST must be set to "1"/
      );
    });

    it('throws when flag is set to wrong value', () => {
      setValidEnv();
      process.env.ENGINEO_LIVE_SHOPIFY_TEST = 'true';

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /ENGINEO_LIVE_SHOPIFY_TEST must be set to "1"/
      );
    });
  });

  describe('refuses when NODE_ENV is production', () => {
    it('throws when NODE_ENV is production', () => {
      setValidEnv();
      process.env.NODE_ENV = 'production';

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /NODE_ENV must NOT be "production"/
      );
    });
  });

  describe('refuses when DATABASE_URL_LIVE_TEST is missing or prod-like', () => {
    it('throws when DATABASE_URL_LIVE_TEST is not set', () => {
      setValidEnv();
      delete process.env.DATABASE_URL_LIVE_TEST;

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /DATABASE_URL_LIVE_TEST must be set/
      );
    });

    it('throws when DB URL points to Neon without live_test pattern', () => {
      setValidEnv();
      process.env.DATABASE_URL_LIVE_TEST =
        'postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/engineo';

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /does not contain a safe live-test pattern/
      );
    });

    it('throws when DB URL points to Render without live_test pattern', () => {
      setValidEnv();
      process.env.DATABASE_URL_LIVE_TEST =
        'postgresql://user:pass@dpg-xyz.oregon-postgres.render.com/engineo';

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /does not contain a safe live-test pattern/
      );
    });

    it('accepts cloud DB URL with live_test pattern', () => {
      setValidEnv();
      process.env.DATABASE_URL_LIVE_TEST =
        'postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/engineo_live_test';

      expect(() => assertLiveShopifyTestEnv('test')).not.toThrow();
    });

    it('accepts localhost DB URL', () => {
      setValidEnv();
      process.env.DATABASE_URL_LIVE_TEST =
        'postgresql://user:pass@localhost:5432/engineo';

      expect(() => assertLiveShopifyTestEnv('test')).not.toThrow();
    });
  });

  describe('refuses when Shopify keys are missing or prod-like', () => {
    it('throws when SHOPIFY_API_KEY_TEST is not set', () => {
      setValidEnv();
      delete process.env.SHOPIFY_API_KEY_TEST;

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /SHOPIFY_API_KEY_TEST must be set/
      );
    });

    it('throws when SHOPIFY_API_SECRET_TEST is not set', () => {
      setValidEnv();
      delete process.env.SHOPIFY_API_SECRET_TEST;

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /SHOPIFY_API_SECRET_TEST must be set/
      );
    });

    it('throws when API key looks like prod key', () => {
      setValidEnv();
      process.env.SHOPIFY_API_KEY_TEST = 'engineo_prod_api_key';

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /appears to be a production key/
      );
    });
  });

  describe('refuses when SHOPIFY_TEST_STORE_ALLOWLIST is missing or empty', () => {
    it('throws when allowlist is not set', () => {
      setValidEnv();
      delete process.env.SHOPIFY_TEST_STORE_ALLOWLIST;

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /SHOPIFY_TEST_STORE_ALLOWLIST must be set/
      );
    });

    it('throws when allowlist is empty', () => {
      setValidEnv();
      process.env.SHOPIFY_TEST_STORE_ALLOWLIST = '';

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /SHOPIFY_TEST_STORE_ALLOWLIST must be set/
      );
    });

    it('throws when allowlist contains invalid domain', () => {
      setValidEnv();
      process.env.SHOPIFY_TEST_STORE_ALLOWLIST = 'invalid-store.com';

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /Invalid store domain in SHOPIFY_TEST_STORE_ALLOWLIST/
      );
    });
  });

  describe('validates SHOPIFY_TEST_STORE_PRIMARY against allowlist', () => {
    it('throws when primary store is not in allowlist', () => {
      setValidEnv();
      process.env.SHOPIFY_TEST_STORE_PRIMARY = 'other-store.myshopify.com';

      expect(() => assertLiveShopifyTestEnv('test')).toThrow(
        /is not in SHOPIFY_TEST_STORE_ALLOWLIST/
      );
    });

    it('accepts primary store that is in allowlist', () => {
      setValidEnv();
      process.env.SHOPIFY_TEST_STORE_PRIMARY = 'test-store.myshopify.com';

      const config = assertLiveShopifyTestEnv('test');
      expect(config.primaryStore).toBe('test-store.myshopify.com');
    });
  });

  describe('returns correct config on success', () => {
    it('returns parsed config with all values', () => {
      setValidEnv();
      process.env.SHOPIFY_TEST_STORE_PRIMARY = 'dev-store.myshopify.com';

      const config = assertLiveShopifyTestEnv('test');

      expect(config.databaseUrl).toBe(
        'postgresql://user:pass@localhost:5432/engineo_live_test'
      );
      expect(config.shopifyApiKey).toBe('test_api_key_12345');
      expect(config.shopifyApiSecret).toBe('test_api_secret_67890');
      expect(config.storeAllowlist).toEqual([
        'test-store.myshopify.com',
        'dev-store.myshopify.com',
      ]);
      expect(config.primaryStore).toBe('dev-store.myshopify.com');
    });

    it('defaults primary store to first in allowlist when not set', () => {
      setValidEnv();
      delete process.env.SHOPIFY_TEST_STORE_PRIMARY;

      const config = assertLiveShopifyTestEnv('test');
      expect(config.primaryStore).toBe('test-store.myshopify.com');
    });
  });
});

describe('TEST-3 – validateStoreInAllowlist()', () => {
  const allowlist = ['store-one.myshopify.com', 'store-two.myshopify.com'];

  it('does not throw for store in allowlist', () => {
    expect(() =>
      validateStoreInAllowlist('store-one.myshopify.com', allowlist, 'test')
    ).not.toThrow();
  });

  it('handles case-insensitive matching', () => {
    expect(() =>
      validateStoreInAllowlist('STORE-ONE.MYSHOPIFY.COM', allowlist, 'test')
    ).not.toThrow();
  });

  it('throws for store not in allowlist', () => {
    expect(() =>
      validateStoreInAllowlist('other-store.myshopify.com', allowlist, 'test')
    ).toThrow(/is not in the allowlist/);
  });

  it('includes context in error message', () => {
    expect(() =>
      validateStoreInAllowlist(
        'bad-store.myshopify.com',
        allowlist,
        'my-context'
      )
    ).toThrow(/context=my-context/);
  });
});
