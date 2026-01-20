# Phase AUTO-PB-1.1 – Automation Playbooks v1 Hardening

> Manual testing checklist for Automation Playbooks v1.1: per-item results, stop-on-failure semantics, preview clarity, and enhanced UX.

---

## Overview

- **Purpose of the feature/patch:**
  - Enhance Automation Playbooks with per-item result tracking, stop-on-failure semantics, clearer preview labels, and improved feedback for partial completions.

- **High-level user impact and what "success" looks like:**
  - Users can see exactly which products were updated, skipped, or failed during playbook execution.
  - When a playbook stops early (due to rate limits, daily limits, or errors), users see a clear "Stopped safely" banner with the product where it stopped.
  - Preview step clearly indicates it shows a sample (up to 3 products).
  - Per-item results are available in an expandable panel after apply.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase AUTO-PB-1 – Automation Playbooks v1 (Preview, Estimate, Apply)
  - Phase AUTO-PB-1.1 – Automation Playbooks v1 Hardening

- **Related documentation:**
  - docs/manual-testing/phase-automation-1-playbooks.md
  - docs/AUTOMATION_ENGINE_SPEC.md
  - docs/ENTITLEMENTS_MATRIX.md
  - docs/testing/automation-engine-product-automations.md

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with database and Prisma schema up to date
  - [ ] Web app running (apps/web) against the same API base URL
  - [ ] Required AI provider env vars set (e.g., AI_API_KEY, AI_PROVIDER)
  - [ ] Shopify sandbox store connected for sync verification

- **Test accounts and sample data:**
  - [ ] Test user on Pro plan with at least one project and Shopify integration
  - [ ] Seeded products for each project:
    - At least 5 products with missing seoTitle
    - At least 5 products with missing seoDescription
    - Products with complete SEO metadata (control group)

- **Required user roles or subscriptions:**
  - [ ] Pro / Business plan – can run Automation Playbooks

---

## Test Scenarios (Happy Path)

### Scenario 1: Per-item results display after successful apply

**ID:** HP-001

**Preconditions:**

- [ ] Pro-plan project with at least 5 products missing seoTitle
- [ ] Daily AI limit not exceeded

**Steps:**

1. Log in as Pro plan user and open the project.
2. Navigate to Automation → Playbooks tab.
3. Select the "Fix missing SEO titles" playbook card.
4. Click "Continue to Estimate", then "Continue to Apply".
5. Check the confirmation checkbox.
6. Click "Apply playbook".
7. Wait for completion.

**Expected Results:**

- [ ] Summary shows updatedCount, skippedCount, attemptedCount / totalAffectedProducts.
- [ ] "View per-product results (N items)" expandable panel is visible.
- [ ] Clicking the panel reveals a table with columns: Product, Status, Message.
- [ ] Each product shows status badge: UPDATED (green), SKIPPED (gray), FAILED (red), or LIMIT_REACHED (amber).
- [ ] Product names are clickable links to the product workspace.

---

### Scenario 2: Preview shows "Sample preview (showing up to 3 products)" label

**ID:** HP-002

**Preconditions:**

- [ ] Pro-plan project with at least 5 products missing seoTitle

**Steps:**

1. Navigate to Automation → Playbooks tab.
2. Select the "Fix missing SEO titles" playbook card.
3. Click "Generate preview".
4. Wait for preview to load.

**Expected Results:**

- [ ] Preview section shows label: "Sample preview (showing up to 3 products)".
- [ ] Up to 3 products are displayed with Before/After comparison.
- [ ] No changes are persisted to the database.

---

### Scenario 3: Stopped safely banner on limit reached

**ID:** HP-003

**Preconditions:**

- [ ] Pro-plan project with 10+ products missing seoTitle
- [ ] Daily AI limit configured to allow only 3 updates

**Steps:**

1. Navigate to Automation → Playbooks tab.
2. Select "Fix missing SEO titles" playbook.
3. Proceed through Preview and Estimate steps.
4. Apply playbook.

**Expected Results:**

- [ ] Playbook stops after 3 products.
- [ ] "Stopped safely" banner (amber) is displayed.
- [ ] Banner text indicates: "Daily AI limit was reached during execution..."
- [ ] Banner shows link to the product where playbook stopped.
- [ ] Summary shows attemptedCount / totalAffectedProducts.
- [ ] Per-item results show UPDATED for processed products, LIMIT_REACHED for the stopping point.

---

### Scenario 4: Stopped safely banner on error

**ID:** HP-004

**Preconditions:**

- [ ] Pro-plan project with products missing seoTitle
- [ ] AI service configured to fail on a specific product (via test stub or network mock)

**Steps:**

1. Apply "Fix missing SEO titles" playbook.
2. Observe behavior when AI service fails mid-run.

**Expected Results:**

- [ ] Playbook stops at the failing product.
- [ ] "Stopped safely" banner is displayed.
- [ ] Banner text shows: "Playbook stopped due to: [error reason]".
- [ ] Link to the product where playbook stopped is displayed.
- [ ] Per-item results show FAILED for the failing product.
- [ ] Products processed before the failure show UPDATED or SKIPPED.

---

### Scenario 5: Feedback messages match new UX

**ID:** HP-005

**Preconditions:**

- [ ] Pro-plan project

**Steps:**

1. Apply playbook with various outcomes:
   - All products updated successfully
   - Some products skipped (already have values)
   - Stopped due to limit
   - Stopped due to error

**Expected Results:**

- [ ] Success: Toast shows "Automation Playbook applied to X product(s)."
- [ ] Partial with limit: Toast shows "Updated X product(s). Daily AI limit reached during execution."
- [ ] Partial with error: Toast shows "Updated X product(s). Playbook stopped early due to an error."
- [ ] No updates with limit: Toast shows "Daily AI limit reached before any products could be updated."
- [ ] No updates with error: Toast shows "Playbook stopped due to an error: [reason]"
- [ ] No updates (no affected): Toast shows "No products were updated by this playbook."

---

## Edge Cases

### EC-001: All products skipped (already have values)

**Description:** Playbook applied but all candidate products already have the field populated.

**Steps:**

1. Ensure all "missing" products now have seoTitle populated.
2. Apply "Fix missing SEO titles" playbook.

**Expected Behavior:**

- [ ] Summary shows updatedCount = 0, skippedCount = N.
- [ ] Per-item results show SKIPPED with message "Skipped: field already had a value."
- [ ] No "Stopped safely" banner (completed normally).

---

### EC-002: Rate limit retry succeeds

**Description:** Initial request hits rate limit but retry succeeds.

**Steps:**

1. Configure AI service to return 429 on first request, then succeed on retry.
2. Apply playbook.

**Expected Behavior:**

- [ ] Product is marked as UPDATED with message "Updated SEO title after retry."
- [ ] Playbook continues to next product.
- [ ] No "Stopped safely" banner if all retries succeed.

---

### EC-003: Rate limit retry exhausted

**Description:** Rate limit persists through all retry attempts.

**Steps:**

1. Configure AI service to return 429 on all requests (no AI_DAILY_LIMIT_REACHED code).
2. Apply playbook.

**Expected Behavior:**

- [ ] Playbook stops after retry exhaustion.
- [ ] "Stopped safely" banner with failureReason = "RATE_LIMIT".
- [ ] Message: "Stopped due to repeated rate limit errors while applying this playbook."

---

### EC-004: Empty results array

**Description:** Apply playbook with no affected products.

**Steps:**

1. Select playbook for an issue type with 0 affected products.
2. Attempt to apply (should be blocked at estimate step).

**Expected Behavior:**

- [ ] Estimate shows totalAffectedProducts = 0.
- [ ] canProceed = false.
- [ ] Apply button disabled.
- [ ] If somehow bypassed, returns empty results array.

---

## Error Handling

### ERR-001: Network failure during apply

**Scenario:** Network drops mid-apply call.

**Expected Behavior:**

- [ ] Frontend shows error toast: "Failed to apply Automation Playbook. Please try again later."
- [ ] User can retry after network recovery.

---

### ERR-002: Backend throws ENTITLEMENTS_LIMIT_REACHED

**Scenario:** Free plan user attempts apply via API bypass.

**Expected Behavior:**

- [ ] 403 response with code: "ENTITLEMENTS_LIMIT_REACHED".
- [ ] Toast shows limit message with upgrade link.

---

## Regression

### Areas potentially impacted:

- [ ] Existing Automation Playbooks v1 functionality (estimate, preview, apply)
- [ ] Issue Engine Lite issue counts
- [ ] Token usage logging
- [ ] Daily AI limit tracking

### Quick sanity checks:

- [ ] Playbooks page loads without errors.
- [ ] Estimate step shows correct product counts and token estimates.
- [ ] Preview generates AI suggestions correctly.
- [ ] Products page reflects applied changes.
- [ ] Issue counts update after playbook apply.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove or archive test projects/users created for testing.
- [ ] Reset any configuration used to force limit conditions.

### Follow-up verification:

- [ ] Re-run Issue Engine Lite to confirm issue counts are correct.
- [ ] Verify token usage logs in database.

---

## Known Issues

- **Intentionally accepted issues:**
  - No undo/rollback mechanism for applied playbooks.
  - Per-item results are not persisted; only shown during session.

- **Out-of-scope items:**
  - Playbook history/audit log.
  - Background/async playbook execution for large catalogs.
  - Granular per-product selection within playbook.

- **TODOs:**
  - [ ] Consider persisting per-item results to database for audit.
  - [ ] Consider adding "Resume from stopped product" functionality.

---

## Approval

| Field              | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| **Tester Name**    | [Pending]                                                      |
| **Date**           | [YYYY-MM-DD]                                                   |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                          |
| **Notes**          | AUTO-PB-1.1 – Automation Playbooks v1 Hardening manual testing |
