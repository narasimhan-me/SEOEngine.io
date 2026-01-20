# Phase Automation-1 – Automation Playbooks v1 (Preview → Estimate → Apply)

> Manual testing checklist for Automation Playbooks v1: bulk AI fixes for missing SEO metadata with preview, estimate, and explicit apply.

---

## Overview

- **Purpose of the feature/patch:**
  - Introduce Automation Playbooks for fixing missing SEO titles and missing SEO descriptions in bulk, with safe, user-approved flows.

- **High-level user impact and what "success" looks like:**
  - DEOs can see which products are impacted, preview AI suggestions on a small sample, understand approximate token impact, and then explicitly apply bulk fixes without surprises or silent background automation.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase Automation-1 – Automation Playbooks v1 (Preview → Estimate → Apply)
  - Phases AE-1 / AE-2 – Automation Engine Foundations & Product Automations
  - Phase UX-7 – Issues Engine Lite (product-focused issues and AI fixes)

- **Related documentation:**
  - docs/AUTOMATION_ENGINE_SPEC.md
  - docs/ENTITLEMENTS_MATRIX.md
  - docs/TOKEN_USAGE_MODEL.md
  - docs/testing/automation-engine-product-automations.md
  - docs/testing/ai-systems.md
  - docs/testing/token-usage-tracking.md

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with database and Prisma schema up to date (including TokenUsage model)
  - [ ] Web app running (apps/web) against the same API base URL
  - [ ] Required AI provider env vars set (e.g., AI_API_KEY, AI_PROVIDER)
  - [ ] Shopify sandbox store connected for sync verification

- **Test accounts and sample data:**
  - [ ] Test user on Free plan with at least one project and Shopify integration
  - [ ] Test user on Pro plan with at least one project and Shopify integration
  - [ ] (Optional) Test user on Business plan for higher-volume checks
  - [ ] Seeded products for each project:
    - Products with missing seoTitle
    - Products with missing seoDescription
    - Products with complete SEO metadata (control group)

- **Required user roles or subscriptions:**
  - [ ] Free plan – can view Automation Playbooks, but bulk apply should be gated
  - [ ] Pro / Business – can run Automation Playbooks for missing SEO titles/descriptions

---

## Test Scenarios (Happy Path)

### Scenario 1: Preview accuracy for missing SEO titles

**ID:** HP-001

**Preconditions:**

- [ ] Pro-plan project with at least 5 products missing seoTitle
- [ ] At least 3 such products have meaningful title / description content to generate suggestions

**Steps:**

1. Log in as Pro plan user and open the project.
2. Navigate to Automation → Playbooks tab.
3. Select the "Fix missing SEO titles" playbook card.
4. Click "Generate preview".
5. Observe the preview panel for sample products.

**Expected Results:**

- [ ] Preview shows up to 3 affected products (sample).
- [ ] Each preview row displays Before (current seoTitle, possibly empty) and After (AI-suggested title).
- [ ] AI suggestions are non-empty for products with sufficient source data.
- [ ] No data is persisted; re-loading products shows original values.

---

### Scenario 2: Estimate accuracy for missing SEO titles

**ID:** HP-002

**Preconditions:**

- [ ] Pro-plan project with multiple products missing seoTitle

**Steps:**

1. After preview, click "Continue to Estimate".
2. Observe the Estimate panel.

**Expected Results:**

- [ ] "Products to update" count matches issue count for missing_seo_title.
- [ ] "Estimated token usage (approx)" is approximately 400 tokens × affected products.
- [ ] "Plan & daily capacity" displays current plan (Pro/Business) and daily AI limit usage.
- [ ] canProceed is true if no blocking reasons exist.

---

### Scenario 3: Apply playbook with confirmation

**ID:** HP-003

**Preconditions:**

- [ ] Estimate shows canProceed = true
- [ ] User is on the Apply step

**Steps:**

1. Click "Continue to Apply".
2. Check the confirmation checkbox acknowledging the bulk write.
3. Click "Apply playbook".
4. Wait for completion.

**Expected Results:**

- [ ] Progress indicator / "Applying…" state is shown.
- [ ] After completion, summary shows updated count, skipped count.
- [ ] Toast confirms success: "Automation Playbook applied to X product(s)."
- [ ] Refreshing Products page confirms seoTitle is now populated for previously missing products.

---

### Scenario 4: Free plan gating

**ID:** HP-004

**Preconditions:**

- [ ] Logged in as Free plan user

**Steps:**

1. Navigate to Automation → Playbooks.
2. Select "Fix missing SEO titles".
3. Attempt to click "Generate preview" or "Continue to Estimate".

**Expected Results:**

- [ ] UI shows "Upgrade to Pro to unlock bulk automations" messaging.
- [ ] Preview button is disabled or returns gating toast.
- [ ] Backend estimate returns reasons: ['plan_not_eligible'].
- [ ] Backend apply returns ENTITLEMENTS_LIMIT_REACHED error.

---

### Scenario 5: Daily limit blocking

**ID:** HP-005

**Preconditions:**

- [ ] Pro-plan project
- [ ] Daily AI limit (product_optimize) nearly exhausted or exceeded

**Steps:**

1. Navigate to Automation → Playbooks.
2. Select "Fix missing SEO titles".
3. Attempt to generate preview or apply.

**Expected Results:**

- [ ] If generating preview hits limit, toast: "Daily AI limit reached…"
- [ ] Estimate shows reasons: ['ai_daily_limit_reached'] or ['token_cap_would_be_exceeded'].
- [ ] Apply returns limitReached: true in result or throws AI_DAILY_LIMIT_REACHED.

---

### Scenario 6: Token usage logging

**ID:** HP-006

**Preconditions:**

- [ ] Pro-plan project
- [ ] Database access to inspect TokenUsage table

**Steps:**

1. Apply a playbook successfully (e.g., missing SEO titles for 5 products).
2. Query TokenUsage table for the user.

**Expected Results:**

- [ ] New TokenUsage row(s) with source = 'automation_playbook:missing_seo_title'.
- [ ] Amount approximately equals 400 × updatedCount.

---

## Edge Cases

### EC-001: No affected products

**Description:** Playbook selected but no products match criteria (all seoTitle already set).

**Steps:**

1. Select "Fix missing SEO titles" playbook.
2. Observe Estimate step.

**Expected Behavior:**

- [ ] Estimate shows totalAffectedProducts = 0.
- [ ] reasons includes 'no_affected_products'.
- [ ] canProceed = false; Apply is disabled.

---

### EC-002: Partial completion due to limit

**Description:** Mid-run daily limit reached.

**Steps:**

1. Configure daily limit such that only 2 out of 5 products can be fixed.
2. Apply playbook.

**Expected Behavior:**

- [ ] Apply returns updated = 2, skipped = 3, limitReached = true.
- [ ] Toast indicates partial completion.
- [ ] TokenUsage logged only for the 2 completed products.

---

### EC-003: Preview generation blocked by limit

**Description:** User attempts preview but limit is already reached.

**Steps:**

1. Exhaust daily AI limit via other product_optimize actions.
2. Click "Generate preview" on Playbooks page.

**Expected Behavior:**

- [ ] Preview fails with AI_DAILY_LIMIT_REACHED.
- [ ] Appropriate toast and error message displayed.

---

## Error Handling

### ERR-001: AI provider failure during apply

**Scenario:** AI provider call fails for one product mid-run.

**Steps:**

1. Simulate AI provider failure for a specific product (e.g., via stubbing).
2. Apply playbook.

**Expected Behavior:**

- [ ] Failed product is counted as skipped.
- [ ] Apply continues for remaining products (graceful degradation).
- [ ] Final result shows updated + skipped counts.

---

### ERR-002: Network failure during apply

**Scenario:** Network drops mid-apply.

**Steps:**

1. Simulate network failure during playbook apply.

**Expected Behavior:**

- [ ] Frontend shows error toast: "Failed to apply Automation Playbook. Please try again later."
- [ ] Backend logs error with context.
- [ ] Partial data may be written; user can re-run to catch remaining.

---

## Regression

### Areas potentially impacted:

- [ ] Issue Engine Lite issue counts (should update after playbook apply)
- [ ] Product SEO fields (should reflect AI-generated values)
- [ ] AI entitlements and daily limits (should decrement correctly)
- [ ] Token usage logging (new TokenUsage model)

### Quick sanity checks:

- [ ] Issues page shows reduced count for missing_seo_title after playbook apply.
- [ ] Products page shows new SEO titles/descriptions.
- [ ] Entitlements daily usage incremented by number of products fixed.
- [ ] TokenUsage table has new rows with correct source and amount.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove or archive test projects/users created for playbook testing.
- [ ] Reset any configuration used to force limit conditions.

### Follow-up verification:

- [ ] Re-run Issue Engine Lite to confirm issue counts are correct.
- [ ] Spot-check product SEO fields in Shopify sandbox after sync.

---

## Known Issues

- **Intentionally accepted issues:**
  - Playbooks only support missing_seo_title and missing_seo_description in v1.
  - No undo/rollback mechanism for applied playbooks.

- **Out-of-scope items:**
  - Playbooks for other issue types (weak_title, weak_description, etc.).
  - Scheduling or auto-run of playbooks.
  - Granular per-product selection within playbook.

- **TODOs:**
  - [ ] Consider adding playbook history/audit log.
  - [ ] Consider adding batch size configuration for large catalogs.

---

## Approval

| Field              | Value                                                       |
| ------------------ | ----------------------------------------------------------- |
| **Tester Name**    | [Pending]                                                   |
| **Date**           | [YYYY-MM-DD]                                                |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                       |
| **Notes**          | Automation Playbooks v1 (Phase Automation-1) manual testing |
