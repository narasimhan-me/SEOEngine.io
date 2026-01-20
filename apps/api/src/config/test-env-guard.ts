const FORBIDDEN_DB_HOST_SUBSTRINGS = [
  'neon.tech',
  'render.com',
  'aws.neon.tech',
  'supabase.co',
  'rds.amazonaws.com',
];

const SAFE_LOCAL_DB_SUBSTRINGS = ['localhost', '127.0.0.1'];

/**
 * Sanitize a database URL by removing credentials (username:password).
 * Returns a URL safe for logging without exposing secrets.
 */
function sanitizeDbUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = '***';
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    // If URL parsing fails, mask anything that looks like credentials
    return url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  }
}

/**
 * Assert that the current process is running in a safe, isolated test
 * environment before executing any destructive operations against the DB.
 *
 * This is intended to be used by:
 * - Jest / test bootstrap code
 * - Test utilities that reset or migrate the test database
 * - API bootstrap when running in NODE_ENV=test
 */
export function assertTestEnv(context: string = 'unknown'): void {
  const nodeEnv = process.env.NODE_ENV;
  const engineoEnv = process.env.ENGINEO_ENV;

  const dbUrlFromTest = process.env.DATABASE_URL_TEST ?? '';
  const dbUrlFromDefault = process.env.DATABASE_URL ?? '';
  const dbUrl = dbUrlFromTest || dbUrlFromDefault;

  const envSummary = `NODE_ENV=${nodeEnv ?? 'undefined'}, ENGINEO_ENV=${
    engineoEnv ?? 'undefined'
  }`;

  if (!(nodeEnv === 'test' || engineoEnv === 'test')) {
    throw new Error(
      `[TEST ENV GUARD] Expected NODE_ENV or ENGINEO_ENV to be "test" in test mode (context=${context}). ` +
        `Current: ${envSummary}`
    );
  }

  if (!dbUrl) {
    throw new Error(
      `[TEST ENV GUARD] Expected DATABASE_URL_TEST or DATABASE_URL to be set for tests (context=${context}). ` +
        `Current: ${envSummary}`
    );
  }

  const lowerUrl = dbUrl.toLowerCase();

  const hasForbiddenHost = FORBIDDEN_DB_HOST_SUBSTRINGS.some((host) =>
    lowerUrl.includes(host)
  );
  if (hasForbiddenHost) {
    throw new Error(
      `[TEST ENV GUARD] DATABASE_URL appears to point to a managed/prod database host (context=${context}). ` +
        `Refusing to run tests against: ${sanitizeDbUrl(dbUrl)}`
    );
  }

  const isLocalHostBased = SAFE_LOCAL_DB_SUBSTRINGS.some((fragment) =>
    lowerUrl.includes(fragment)
  );
  const hasTestDbName =
    lowerUrl.includes('_test') ||
    lowerUrl.includes('-test') ||
    lowerUrl.includes('testdb');

  if (!isLocalHostBased && !hasTestDbName) {
    throw new Error(
      `[TEST ENV GUARD] DATABASE_URL does not look like a local test database (context=${context}). ` +
        `It should point to localhost/127.0.0.1 or include a test-specific DB name. ` +
        `Current URL: ${sanitizeDbUrl(dbUrl)}`
    );
  }
}

/**
 * Returns the effective database URL for tests, after asserting that the
 * environment is safe. Prefers DATABASE_URL_TEST when available.
 */
export function getTestDatabaseUrl(context: string = 'unknown'): string {
  assertTestEnv(context);

  const dbUrlFromTest = process.env.DATABASE_URL_TEST ?? '';
  const dbUrlFromDefault = process.env.DATABASE_URL ?? '';
  const dbUrl = dbUrlFromTest || dbUrlFromDefault;

  if (!dbUrl) {
    throw new Error(
      `[TEST ENV GUARD] DATABASE_URL_TEST or DATABASE_URL must be set (context=${context}).`
    );
  }

  return dbUrl;
}

/**
 * Returns true when the API is running in E2E mode.
 * In this mode we:
 * - Allow /testkit/e2e/* endpoints.
 * - Stub external calls (Shopify, SEO crawl) to avoid live network.
 */
export function isE2EMode(): boolean {
  return process.env.ENGINEO_E2E === '1';
}

/**
 * Returns true when the API is running in Live Shopify Test mode.
 * In this mode:
 * - Live Shopify OAuth and GraphQL Admin API are allowed against allowlisted dev stores.
 * - A dedicated live-test database is required (DATABASE_URL_LIVE_TEST).
 * - Only test Shopify app keys are permitted (SHOPIFY_API_KEY_TEST, etc).
 */
export function isLiveShopifyTestMode(): boolean {
  return process.env.ENGINEO_LIVE_SHOPIFY_TEST === '1';
}

const PROD_DB_HOST_SUBSTRINGS = [
  'neon.tech',
  'render.com',
  'aws.neon.tech',
  'supabase.co',
  'rds.amazonaws.com',
  'heroku.com',
  'planetscale.com',
  'cockroachlabs.cloud',
];

const SAFE_LIVE_TEST_DB_PATTERNS = [
  'live_test',
  'live-test',
  'livetest',
  '_live_test',
  '-live-test',
];

const PROD_SHOPIFY_KEY_PATTERNS = [
  '_prod',
  '_production',
  '-prod',
  '-production',
];

export interface LiveShopifyTestEnvConfig {
  databaseUrl: string;
  shopifyApiKey: string;
  shopifyApiSecret: string;
  storeAllowlist: string[];
  primaryStore: string | null;
}

/**
 * Assert that the current process is running in a safe Live Shopify Test
 * environment before executing any operations against real Shopify stores
 * or the live-test database.
 *
 * This guard MUST be called at the very start of any live Shopify smoke test
 * runner to ensure:
 * - ENGINEO_LIVE_SHOPIFY_TEST=1 is set.
 * - NODE_ENV is NOT "production".
 * - DATABASE_URL_LIVE_TEST is set and points to a clearly safe live-test database.
 * - SHOPIFY_API_KEY_TEST and SHOPIFY_API_SECRET_TEST are set (not prod keys).
 * - SHOPIFY_TEST_STORE_ALLOWLIST is set and non-empty.
 *
 * On any violation, throws an error and refuses to proceed.
 */
export function assertLiveShopifyTestEnv(
  context: string = 'unknown'
): LiveShopifyTestEnvConfig {
  const errors: string[] = [];

  // 1. Check ENGINEO_LIVE_SHOPIFY_TEST flag
  if (process.env.ENGINEO_LIVE_SHOPIFY_TEST !== '1') {
    errors.push(
      'ENGINEO_LIVE_SHOPIFY_TEST must be set to "1" to run live Shopify tests.'
    );
  }

  // 2. Check NODE_ENV is not production
  if (process.env.NODE_ENV === 'production') {
    errors.push(
      'NODE_ENV must NOT be "production" when running live Shopify tests.'
    );
  }

  // 3. Check DATABASE_URL_LIVE_TEST is set and safe
  const dbUrl = process.env.DATABASE_URL_LIVE_TEST ?? '';
  if (!dbUrl) {
    errors.push(
      'DATABASE_URL_LIVE_TEST must be set to a dedicated live-test database URL.'
    );
  } else {
    const lowerDbUrl = dbUrl.toLowerCase();

    // Check for production database hosts
    const hasProdHost = PROD_DB_HOST_SUBSTRINGS.some((host) =>
      lowerDbUrl.includes(host)
    );
    if (hasProdHost) {
      // If it's a cloud host, it MUST contain a live_test pattern in the path/name
      const hasLiveTestPattern = SAFE_LIVE_TEST_DB_PATTERNS.some((pattern) =>
        lowerDbUrl.includes(pattern)
      );
      if (!hasLiveTestPattern) {
        errors.push(
          `DATABASE_URL_LIVE_TEST appears to point to a cloud database host but does not contain a safe live-test pattern (e.g., "live_test", "live-test"). ` +
            `Current URL: ${sanitizeDbUrl(dbUrl)}`
        );
      }
    }

    // Check URL does not look like main prod database
    if (
      lowerDbUrl.includes('engineo_prod') ||
      lowerDbUrl.includes('engineo-prod') ||
      (lowerDbUrl.includes('engineo') &&
        !SAFE_LIVE_TEST_DB_PATTERNS.some((p) => lowerDbUrl.includes(p)) &&
        !lowerDbUrl.includes('localhost') &&
        !lowerDbUrl.includes('127.0.0.1'))
    ) {
      // Double check it's not a test pattern
      const isSafe =
        SAFE_LIVE_TEST_DB_PATTERNS.some((p) => lowerDbUrl.includes(p)) ||
        lowerDbUrl.includes('localhost') ||
        lowerDbUrl.includes('127.0.0.1');
      if (!isSafe) {
        errors.push(
          `DATABASE_URL_LIVE_TEST appears to point to a production database. ` +
            `It must include a live-test identifier. Current URL: ${sanitizeDbUrl(dbUrl)}`
        );
      }
    }
  }

  // 4. Check Shopify test keys are set
  const shopifyApiKey = process.env.SHOPIFY_API_KEY_TEST ?? '';
  const shopifyApiSecret = process.env.SHOPIFY_API_SECRET_TEST ?? '';

  if (!shopifyApiKey) {
    errors.push(
      'SHOPIFY_API_KEY_TEST must be set to the test/development Shopify app key.'
    );
  } else {
    // Ensure it doesn't look like a prod key
    const lowerKey = shopifyApiKey.toLowerCase();
    if (PROD_SHOPIFY_KEY_PATTERNS.some((p) => lowerKey.includes(p))) {
      errors.push(
        'SHOPIFY_API_KEY_TEST appears to be a production key. Use the test/development app key.'
      );
    }
  }

  if (!shopifyApiSecret) {
    errors.push(
      'SHOPIFY_API_SECRET_TEST must be set to the test/development Shopify app secret.'
    );
  }

  // 5. Check store allowlist
  const storeAllowlistRaw = process.env.SHOPIFY_TEST_STORE_ALLOWLIST ?? '';
  const storeAllowlist = storeAllowlistRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (storeAllowlist.length === 0) {
    errors.push(
      'SHOPIFY_TEST_STORE_ALLOWLIST must be set to a comma-separated list of allowed dev store domains.'
    );
  }

  // Validate each store in allowlist looks like a valid Shopify domain
  for (const store of storeAllowlist) {
    if (!store.includes('.myshopify.com') && !store.includes('.shopify.com')) {
      errors.push(
        `Invalid store domain in SHOPIFY_TEST_STORE_ALLOWLIST: "${store}". ` +
          `Must be a valid Shopify domain (e.g., store-name.myshopify.com).`
      );
    }
  }

  // If any errors, throw and refuse to proceed
  if (errors.length > 0) {
    const errorMessage =
      `[LIVE SHOPIFY TEST GUARD] Refusing to run live Shopify tests (context=${context}).\n` +
      `Violations:\n` +
      errors.map((e) => `  - ${e}`).join('\n');
    throw new Error(errorMessage);
  }

  // Parse primary store
  const primaryStore = process.env.SHOPIFY_TEST_STORE_PRIMARY ?? null;
  if (primaryStore && !storeAllowlist.includes(primaryStore)) {
    throw new Error(
      `[LIVE SHOPIFY TEST GUARD] SHOPIFY_TEST_STORE_PRIMARY "${primaryStore}" ` +
        `is not in SHOPIFY_TEST_STORE_ALLOWLIST. (context=${context})`
    );
  }

  return {
    databaseUrl: dbUrl,
    shopifyApiKey,
    shopifyApiSecret,
    storeAllowlist,
    primaryStore: primaryStore || storeAllowlist[0] || null,
  };
}

/**
 * Validate that a store domain is in the allowlist.
 * Used by the live smoke runner to enforce store restrictions.
 */
export function validateStoreInAllowlist(
  storeDomain: string,
  allowlist: string[],
  context: string = 'unknown'
): void {
  const normalizedStore = storeDomain.toLowerCase().trim();
  const normalizedAllowlist = allowlist.map((s) => s.toLowerCase().trim());

  if (!normalizedAllowlist.includes(normalizedStore)) {
    throw new Error(
      `[LIVE SHOPIFY TEST GUARD] Store "${storeDomain}" is not in the allowlist (context=${context}). ` +
        `Allowed stores: ${allowlist.join(', ')}`
    );
  }
}
