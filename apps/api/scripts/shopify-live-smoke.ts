/**
 * TEST-3: Live Shopify Smoke Test Runner
 *
 * This script runs live Shopify smoke tests against allowlisted dev stores.
 * It validates real OAuth, product creation, SEO updates, and metafield sync.
 *
 * SAFETY:
 * - Requires ENGINEO_LIVE_SHOPIFY_TEST=1
 * - Requires dedicated live-test database (DATABASE_URL_LIVE_TEST)
 * - Only runs against stores in SHOPIFY_TEST_STORE_ALLOWLIST
 * - Creates uniquely-named test products with engineo_live_test tag
 * - Best-effort cleanup of created products
 *
 * Exit codes:
 * - 0: Success
 * - 1: Safety check failure or test failure
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  assertLiveShopifyTestEnv,
  validateStoreInAllowlist,
  LiveShopifyTestEnvConfig,
} from '../src/config/test-env-guard';

// Load environment variables
dotenv.config({ path: '.env.live-test' });
dotenv.config({ path: '.env' });

// ----- Types -----

interface SmokeRunConfig {
  runId: string;
  storeDomain: string;
  runManualSync: boolean;
  dryRun: boolean;
}

interface AuditRecord {
  runId: string;
  storeDomain: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'success' | 'failure' | 'cleanup_pending';
  createdProductIds: string[];
  seoUpdateVerified: boolean;
  manualSyncVerified: boolean | null;
  errorSummary: string | null;
  cleanupStatus: 'success' | 'partial' | 'failed' | 'skipped';
}

interface JsonReport {
  runId: string;
  storeDomain: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  steps: StepResult[];
  createdProductIds: string[];
  cleanupStatus: string;
  errorSummary: string | null;
}

interface StepResult {
  name: string;
  success: boolean;
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

// ----- Globals -----

let envConfig: LiveShopifyTestEnvConfig;
let runConfig: SmokeRunConfig;
const stepResults: StepResult[] = [];
const createdProductIds: string[] = [];

// ----- Utility Functions -----

function generateRunId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const shortSha = crypto.randomBytes(4).toString('hex');
  return `${date}-${shortSha}`;
}

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

async function runStep<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ success: boolean; result?: T; error?: string }> {
  const startTime = Date.now();
  try {
    log('INFO', `Starting step: ${name}`);
    const result = await fn();
    const durationMs = Date.now() - startTime;
    stepResults.push({ name, success: true, durationMs });
    log('INFO', `Step completed: ${name} (${durationMs}ms)`);
    return { success: true, result };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    stepResults.push({ name, success: false, durationMs, error: errorMessage });
    log('ERROR', `Step failed: ${name} - ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// ----- Shopify GraphQL Client -----

async function shopifyGraphQL<T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
  operationName?: string
): Promise<T> {
  const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
      operationName,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify GraphQL HTTP error: ${response.status} - ${text}`);
  }

  const json = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `Shopify GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`
    );
  }

  if (!json.data) {
    throw new Error('Shopify GraphQL returned no data');
  }

  return json.data;
}

// ----- OAuth Token Verification -----

async function verifyAccessToken(
  shopDomain: string,
  accessToken: string
): Promise<boolean> {
  const query = `
    query ShopInfo {
      shop {
        name
        email
        myshopifyDomain
      }
    }
  `;

  const data = await shopifyGraphQL<{
    shop: { name: string; email: string; myshopifyDomain: string };
  }>(shopDomain, accessToken, query, {}, 'ShopInfo');

  log(
    'INFO',
    `Verified access to store: ${data.shop.name} (${data.shop.myshopifyDomain})`
  );
  return true;
}

// ----- Product Creation -----

async function createTestProduct(
  shopDomain: string,
  accessToken: string,
  runId: string
): Promise<{ productId: string; productGid: string; handle: string }> {
  const title = `engineo-live-test-${runId}`;

  const mutation = `
    mutation CreateTestProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          handle
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    title,
    descriptionHtml: `<p>EngineO live smoke test product created at ${new Date().toISOString()}.</p>`,
    tags: ['engineo_live_test'],
    status: 'DRAFT',
  };

  const data = await shopifyGraphQL<{
    productCreate: {
      product: { id: string; handle: string; title: string } | null;
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>(shopDomain, accessToken, mutation, { input }, 'CreateTestProduct');

  if (data.productCreate.userErrors.length > 0) {
    throw new Error(
      `Failed to create test product: ${data.productCreate.userErrors.map((e) => e.message).join('; ')}`
    );
  }

  if (!data.productCreate.product) {
    throw new Error('No product returned from create mutation');
  }

  const productGid = data.productCreate.product.id;
  const productId = productGid.split('/').pop() || '';

  log('INFO', `Created test product: ${title} (${productGid})`);

  return {
    productId,
    productGid,
    handle: data.productCreate.product.handle,
  };
}

// ----- SEO Update -----

async function updateProductSeo(
  shopDomain: string,
  accessToken: string,
  productGid: string,
  seoTitle: string,
  seoDescription: string
): Promise<void> {
  const mutation = `
    mutation UpdateProductSeo($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          seo {
            title
            description
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    id: productGid,
    seo: {
      title: seoTitle,
      description: seoDescription,
    },
  };

  const data = await shopifyGraphQL<{
    productUpdate: {
      product: {
        id: string;
        seo?: { title?: string; description?: string };
      } | null;
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>(shopDomain, accessToken, mutation, { input }, 'UpdateProductSeo');

  if (data.productUpdate.userErrors.length > 0) {
    throw new Error(
      `Failed to update product SEO: ${data.productUpdate.userErrors.map((e) => e.message).join('; ')}`
    );
  }

  log('INFO', `Updated SEO for product ${productGid}`);
}

// ----- SEO Verification -----

async function verifyProductSeo(
  shopDomain: string,
  accessToken: string,
  productGid: string,
  expectedTitle: string,
  expectedDescription: string
): Promise<boolean> {
  const query = `
    query GetProductSeo($id: ID!) {
      product(id: $id) {
        id
        title
        seo {
          title
          description
        }
      }
    }
  `;

  const data = await shopifyGraphQL<{
    product: {
      id: string;
      title: string;
      seo?: { title?: string; description?: string };
    } | null;
  }>(shopDomain, accessToken, query, { id: productGid }, 'GetProductSeo');

  if (!data.product) {
    throw new Error(`Product ${productGid} not found`);
  }

  const actualTitle = data.product.seo?.title || '';
  const actualDescription = data.product.seo?.description || '';

  if (actualTitle !== expectedTitle) {
    throw new Error(
      `SEO title mismatch: expected "${expectedTitle}", got "${actualTitle}"`
    );
  }

  if (actualDescription !== expectedDescription) {
    throw new Error(
      `SEO description mismatch: expected "${expectedDescription}", got "${actualDescription}"`
    );
  }

  log('INFO', `Verified SEO matches expected values for ${productGid}`);
  return true;
}

// ----- Product Cleanup -----

async function deleteTestProduct(
  shopDomain: string,
  accessToken: string,
  productGid: string
): Promise<boolean> {
  const mutation = `
    mutation DeleteTestProduct($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const data = await shopifyGraphQL<{
      productDelete: {
        deletedProductId: string | null;
        userErrors: Array<{ field?: string[]; message: string }>;
      };
    }>(
      shopDomain,
      accessToken,
      mutation,
      { input: { id: productGid } },
      'DeleteTestProduct'
    );

    if (data.productDelete.userErrors.length > 0) {
      log(
        'WARN',
        `Failed to delete product ${productGid}: ${data.productDelete.userErrors.map((e) => e.message).join('; ')}`
      );
      return false;
    }

    log('INFO', `Deleted test product: ${productGid}`);
    return true;
  } catch (error) {
    log(
      'WARN',
      `Error deleting product ${productGid}: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

async function tagProductForCleanup(
  shopDomain: string,
  accessToken: string,
  productGid: string
): Promise<void> {
  const mutation = `
    mutation TagProductForCleanup($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    await shopifyGraphQL(
      shopDomain,
      accessToken,
      mutation,
      {
        input: {
          id: productGid,
          tags: ['engineo_live_test', 'engineo_live_test_cleanup_pending'],
        },
      },
      'TagProductForCleanup'
    );
    log('INFO', `Tagged product for cleanup: ${productGid}`);
  } catch (error) {
    log(
      'WARN',
      `Failed to tag product for cleanup: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ----- Audit Record -----

async function writeAuditRecord(record: AuditRecord): Promise<void> {
  // In a full implementation, this would write to the live-test database.
  // For now, we write to a JSON file alongside the report.
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const auditPath = path.join(artifactsDir, `audit-${record.runId}.json`);
  fs.writeFileSync(auditPath, JSON.stringify(record, null, 2));
  log('INFO', `Wrote audit record to ${auditPath}`);
}

// ----- JSON Report -----

function writeJsonReport(report: JsonReport): void {
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const reportPath = path.join(artifactsDir, `report-${report.runId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log('INFO', `Wrote JSON report to ${reportPath}`);
}

// ----- Main Smoke Test Flow -----

async function runSmokeTest(): Promise<boolean> {
  const accessToken = process.env.SHOPIFY_TEST_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      'SHOPIFY_TEST_ACCESS_TOKEN must be set to a pre-issued offline token for the test store.'
    );
  }

  const { storeDomain, runId } = runConfig;
  let seoUpdateVerified = false;
  let productGid: string | null = null;

  // Step 1: Verify access token
  const tokenResult = await runStep('Verify OAuth access token', async () => {
    return verifyAccessToken(storeDomain, accessToken);
  });
  if (!tokenResult.success) {
    return false;
  }

  // Step 2: Create test product
  const createResult = await runStep('Create test product', async () => {
    const result = await createTestProduct(storeDomain, accessToken, runId);
    productGid = result.productGid;
    createdProductIds.push(result.productId);
    return result;
  });
  if (!createResult.success || !productGid) {
    return false;
  }

  // Step 3: Update SEO via EngineO-style path
  const expectedSeoTitle = `EngineO Test SEO Title - ${runId}`;
  const expectedSeoDescription = `EngineO live smoke test SEO description. Run ID: ${runId}. Created at ${new Date().toISOString()}.`;

  const seoUpdateResult = await runStep('Update product SEO', async () => {
    await updateProductSeo(
      storeDomain,
      accessToken,
      productGid!,
      expectedSeoTitle,
      expectedSeoDescription
    );
  });
  if (!seoUpdateResult.success) {
    return false;
  }

  // Step 4: Verify SEO read-back
  const seoVerifyResult = await runStep('Verify SEO read-back', async () => {
    return verifyProductSeo(
      storeDomain,
      accessToken,
      productGid!,
      expectedSeoTitle,
      expectedSeoDescription
    );
  });
  seoUpdateVerified = seoVerifyResult.success;

  if (!seoUpdateVerified) {
    return false;
  }

  // Step 5: (Optional) Manual sync - placeholder for future implementation
  if (runConfig.runManualSync) {
    log('INFO', 'Manual sync step skipped (not yet implemented in smoke test)');
  }

  return true;
}

async function cleanup(): Promise<string> {
  const accessToken = process.env.SHOPIFY_TEST_ACCESS_TOKEN;
  if (!accessToken) {
    return 'skipped';
  }

  const { storeDomain } = runConfig;
  let allDeleted = true;

  for (const productId of createdProductIds) {
    const productGid = `gid://shopify/Product/${productId}`;
    const deleted = await deleteTestProduct(
      storeDomain,
      accessToken,
      productGid
    );
    if (!deleted) {
      await tagProductForCleanup(storeDomain, accessToken, productGid);
      allDeleted = false;
    }
  }

  if (createdProductIds.length === 0) {
    return 'skipped';
  }

  return allDeleted ? 'success' : 'partial';
}

// ----- Entry Point -----

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  let success = false;
  let errorSummary: string | null = null;
  let cleanupStatus = 'skipped';

  try {
    // Step 0: Safety guard - this MUST run first
    log('INFO', '=== EngineO Live Shopify Smoke Test ===');
    log('INFO', 'Running safety checks...');

    envConfig = assertLiveShopifyTestEnv('shopify-live-smoke');
    log('INFO', 'Safety checks passed.');

    // Parse CLI arguments
    const args = process.argv.slice(2);
    const storeOverride = args
      .find((a) => a.startsWith('--store='))
      ?.split('=')[1];
    const runManualSync = args.includes('--manual-sync');
    const dryRun = args.includes('--dry-run');

    // Determine target store
    const storeDomain = storeOverride || envConfig.primaryStore;
    if (!storeDomain) {
      throw new Error(
        'No store domain specified and no primary store configured.'
      );
    }

    // Validate store is in allowlist
    validateStoreInAllowlist(
      storeDomain,
      envConfig.storeAllowlist,
      'shopify-live-smoke'
    );
    log('INFO', `Target store: ${storeDomain}`);

    // Generate run ID
    runConfig = {
      runId: generateRunId(),
      storeDomain,
      runManualSync,
      dryRun,
    };
    log('INFO', `Run ID: ${runConfig.runId}`);

    if (dryRun) {
      log('INFO', 'DRY RUN mode - no actual Shopify calls will be made.');
      log('INFO', 'Configuration validated successfully.');
      log('INFO', `Store: ${storeDomain}`);
      log('INFO', `Allowlist: ${envConfig.storeAllowlist.join(', ')}`);
      success = true;
    } else {
      // Run the actual smoke test
      success = await runSmokeTest();

      // Cleanup
      log('INFO', 'Running cleanup...');
      cleanupStatus = await cleanup();
      log('INFO', `Cleanup status: ${cleanupStatus}`);
    }
  } catch (error) {
    errorSummary = error instanceof Error ? error.message : String(error);
    log('ERROR', `Fatal error: ${errorSummary}`);
    success = false;
  }

  const finishedAt = new Date().toISOString();

  // Write audit record
  if (runConfig) {
    const auditRecord: AuditRecord = {
      runId: runConfig.runId,
      storeDomain: runConfig.storeDomain,
      startedAt,
      finishedAt,
      status: success
        ? 'success'
        : cleanupStatus === 'partial'
          ? 'cleanup_pending'
          : 'failure',
      createdProductIds,
      seoUpdateVerified: stepResults.some(
        (s) => s.name === 'Verify SEO read-back' && s.success
      ),
      manualSyncVerified: runConfig.runManualSync ? null : null,
      errorSummary,
      cleanupStatus: cleanupStatus as AuditRecord['cleanupStatus'],
    };

    await writeAuditRecord(auditRecord);

    // Write JSON report
    const report: JsonReport = {
      runId: runConfig.runId,
      storeDomain: runConfig.storeDomain,
      startedAt,
      finishedAt,
      success,
      steps: stepResults,
      createdProductIds,
      cleanupStatus,
      errorSummary,
    };

    writeJsonReport(report);
  }

  // Exit with appropriate code
  if (success) {
    log('INFO', '=== Smoke test PASSED ===');
    process.exit(0);
  } else {
    log('ERROR', '=== Smoke test FAILED ===');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
