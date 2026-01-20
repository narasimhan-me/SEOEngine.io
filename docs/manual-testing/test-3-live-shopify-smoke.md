# TEST-3 – Live Shopify Smoke Test Manual Verification

This document provides step-by-step manual verification for the TEST-3 live Shopify smoke test infrastructure.

---

## Prerequisites

Before running manual verification:

1. You have access to a Shopify Partner account with a development store.
2. You have created a test Shopify app in your Partner dashboard.
3. You have generated an offline access token for the test store.
4. You have access to the GitHub repository settings (for secrets configuration).

---

## 1. Triggering the Workflow via `workflow_dispatch`

### Steps

1. Navigate to the GitHub repository in your browser.
2. Click on **Actions** in the top navigation.
3. In the left sidebar, find **TEST-3 - Live Shopify Smoke Tests**.
4. Click on **Run workflow** dropdown (right side).
5. Configure the inputs:
   - **storeDomain**: (optional) Override target store domain
   - **runManualSync**: (optional) Check to run manual sync step
   - **dryRun**: Check for config validation only (no Shopify calls)
6. Click **Run workflow**.

### Expected Results

- [ ] Workflow appears in the Actions list with status "In progress"
- [ ] Workflow completes within 5 minutes
- [ ] Dry run: completes successfully without Shopify calls
- [ ] Full run: creates test product, updates SEO, verifies read-back, cleans up

---

## 2. Verifying the Nightly Schedule Is Active

### Steps

1. Navigate to **Actions** > **TEST-3 - Live Shopify Smoke Tests**.
2. Check the workflow runs list for scheduled runs.
3. The schedule is `0 3 * * *` (3:00 AM UTC daily).

### Expected Results

- [ ] After midnight UTC, a scheduled run appears automatically
- [ ] Scheduled runs show trigger type as "schedule"
- [ ] No scheduled runs appear on weekends if workflow is paused (if applicable)

---

## 3. Triage Checklist When Workflow Fails

### Step 3.1: Check GitHub Actions Logs

1. Click on the failed workflow run.
2. Expand the **Run live Shopify smoke test** step.
3. Review the console output for error messages.

### Step 3.2: Download and Review Artifacts

1. Scroll to the bottom of the workflow run page.
2. Download **live-smoke-test-artifacts** (on failure) or **live-smoke-test-report** (on success).
3. Extract and review:
   - `audit-<runId>.json` – Full audit record
   - `report-<runId>.json` – Step-by-step results

### Step 3.3: Check Audit Table (if implemented)

If audit records are written to the live-test database:

```sql
SELECT * FROM live_smoke_audit
ORDER BY started_at DESC
LIMIT 10;
```

### Step 3.4: Check Shopify Dev Store Objects

1. Log in to the Shopify Partner dashboard.
2. Navigate to the test store.
3. Go to **Products** and search for `engineo-live-test-`.
4. Check for products tagged `engineo_live_test_cleanup_pending`.

### Common Failure Causes

| Error                                      | Likely Cause               | Resolution                                  |
| ------------------------------------------ | -------------------------- | ------------------------------------------- |
| `ENGINEO_LIVE_SHOPIFY_TEST must be set`    | Missing env var            | Add to GitHub Secrets                       |
| `DATABASE_URL_LIVE_TEST must be set`       | Missing database URL       | Configure secret                            |
| `SHOPIFY_TEST_STORE_ALLOWLIST must be set` | Missing allowlist          | Add comma-separated store list              |
| `is not in the allowlist`                  | Store not allowed          | Add store to allowlist or use allowed store |
| `Shopify GraphQL HTTP error: 401`          | Invalid access token       | Re-generate token                           |
| `Shopify GraphQL HTTP error: 403`          | Insufficient scopes        | Check app permissions                       |
| `SEO title mismatch`                       | Shopify didn't persist SEO | Check product exists and is editable        |

---

## 4. Verify Test Product in Shopify After a Run

### Steps

1. After a successful run, log in to the test Shopify store admin.
2. Navigate to **Products**.
3. Search for `engineo-live-test-<date>`.
4. If cleanup succeeded, no products should remain.
5. If cleanup was partial, look for products tagged `engineo_live_test_cleanup_pending`.

### Expected Results

- [ ] On successful cleanup: No test products remain
- [ ] On partial cleanup: Products are tagged for manual cleanup
- [ ] Test products have correct SEO title/description (during run, before cleanup)

---

## 5. Run Locally (Dry Run)

### Steps

1. Ensure you have the required environment variables in `.env.live-test`:

   ```bash
   ENGINEO_LIVE_SHOPIFY_TEST=1
   DATABASE_URL_LIVE_TEST=postgresql://user:pass@localhost:5432/engineo_live_test
   SHOPIFY_API_KEY_TEST=your_test_key
   SHOPIFY_API_SECRET_TEST=your_test_secret
   SHOPIFY_TEST_STORE_ALLOWLIST=your-store.myshopify.com
   SHOPIFY_TEST_STORE_PRIMARY=your-store.myshopify.com
   SHOPIFY_TEST_ACCESS_TOKEN=shpat_xxx
   ```

2. Run the dry run command:

   ```bash
   pnpm test:shopify:live:dry
   ```

### Expected Results

- [ ] Guard passes all safety checks
- [ ] Logs show "DRY RUN mode"
- [ ] Logs show "Configuration validated successfully"
- [ ] Exit code is 0

---

## 6. Important Safety Notes

**This workflow must ONLY ever run against allowlisted dev stores.**

- The allowlist is enforced by the `assertLiveShopifyTestEnv()` guard.
- Production stores should NEVER be in `SHOPIFY_TEST_STORE_ALLOWLIST`.
- The workflow does NOT run on PRs – only on schedule and manual dispatch.
- If you see test products in a production store, immediately:
  1. Remove the store from the allowlist.
  2. Delete the test products manually.
  3. Investigate how the store was added to the allowlist.

---

## 7. GitHub Secrets Required

Configure these secrets in **Settings** > **Secrets and variables** > **Actions**:

| Secret Name                    | Description                          | Example                                     |
| ------------------------------ | ------------------------------------ | ------------------------------------------- |
| `DATABASE_URL_LIVE_TEST`       | Live-test database connection string | `postgresql://...`                          |
| `SHOPIFY_API_KEY_TEST`         | Test Shopify app API key             | `abc123...`                                 |
| `SHOPIFY_API_SECRET_TEST`      | Test Shopify app API secret          | `shpss_...`                                 |
| `SHOPIFY_TEST_STORE_ALLOWLIST` | Comma-separated dev store domains    | `store1.myshopify.com,store2.myshopify.com` |
| `SHOPIFY_TEST_STORE_PRIMARY`   | Default store to test against        | `store1.myshopify.com`                      |
| `SHOPIFY_TEST_ACCESS_TOKEN`    | Offline access token for test store  | `shpat_...`                                 |

---

## 8. File Locations Reference

| File                                                          | Purpose                            |
| ------------------------------------------------------------- | ---------------------------------- |
| `apps/api/src/config/test-env-guard.ts`                       | `assertLiveShopifyTestEnv()` guard |
| `apps/api/scripts/shopify-live-smoke.ts`                      | Live smoke test runner             |
| `.github/workflows/shopify-live-smoke.yml`                    | CI workflow                        |
| `apps/api/test/integration/live-shopify-test-guard.test.ts`   | Guard unit tests                   |
| `apps/api/test/integration/live-shopify-smoke-runner.test.ts` | Runner tests                       |
| `docs/TESTING.md` (section 12)                                | Full TEST-3 documentation          |
