const FORBIDDEN_DB_HOST_SUBSTRINGS = [
  'neon.tech',
  'render.com',
  'aws.neon.tech',
  'supabase.co',
  'rds.amazonaws.com',
];

const SAFE_LOCAL_DB_SUBSTRINGS = ['localhost', '127.0.0.1'];

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
        `Current: ${envSummary}`,
    );
  }

  if (!dbUrl) {
    throw new Error(
      `[TEST ENV GUARD] Expected DATABASE_URL_TEST or DATABASE_URL to be set for tests (context=${context}). ` +
        `Current: ${envSummary}`,
    );
  }

  const lowerUrl = dbUrl.toLowerCase();

  const hasForbiddenHost = FORBIDDEN_DB_HOST_SUBSTRINGS.some((host) =>
    lowerUrl.includes(host),
  );
  if (hasForbiddenHost) {
    throw new Error(
      `[TEST ENV GUARD] DATABASE_URL appears to point to a managed/prod database host (context=${context}). ` +
        `Refusing to run tests against: ${dbUrl}`,
    );
  }

  const isLocalHostBased = SAFE_LOCAL_DB_SUBSTRINGS.some((fragment) =>
    lowerUrl.includes(fragment),
  );
  const hasTestDbName =
    lowerUrl.includes('_test') ||
    lowerUrl.includes('-test') ||
    lowerUrl.includes('testdb');

  if (!isLocalHostBased && !hasTestDbName) {
    throw new Error(
      `[TEST ENV GUARD] DATABASE_URL does not look like a local test database (context=${context}). ` +
        `It should point to localhost/127.0.0.1 or include a test-specific DB name. ` +
        `Current URL: ${dbUrl}`,
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
      `[TEST ENV GUARD] DATABASE_URL_TEST or DATABASE_URL must be set (context=${context}).`,
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
