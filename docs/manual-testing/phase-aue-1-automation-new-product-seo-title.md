# Phase AUE-1 – Automation Engine: New Product SEO Title Auto-Generation

> Manual testing guide for the first immediate automation rule: `AUTO_GENERATE_METADATA_ON_NEW_PRODUCT`.

---

## Overview

Phase AUE-1 implements:

1. **ShopifyModule** updated to import ProjectsModule for AutomationService access
2. **ShopifyService** triggers automation when new products are synced
3. **AutomationService.runNewProductSeoTitleAutomation** – Immediate automation rule
4. **Plan-aware auto-apply** – Pro/Business auto-applies, Free creates suggestions only
5. **E2E tests** covering all scenarios

---

## Prerequisites

- [ ] Backend API running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:3000`
- [ ] AI provider configured (AI_API_KEY and AI_PROVIDER env vars)
- [ ] Test project with Shopify integration
- [ ] User accounts on Free, Pro, and Business plans (or ability to modify subscription)

---

## Test Scenarios

### Scenario 1: New product sync triggers automation (Free plan)

**Steps:**

1. Log in as a Free plan user
2. Navigate to Projects → Select project with Shopify integration
3. Go to Integrations → Shopify
4. Add a NEW product to your Shopify store with:
   - Title: "Test Automation Product"
   - Description: "A great product for testing automation features."
   - NO SEO title set
   - NO SEO description set
5. Click "Sync Products" in EngineO.ai

**Expected Results:**

- [ ] Sync completes successfully
- [ ] New product appears in Products list
- [ ] `AutomationSuggestion` created in database (check Automation Activity page)
- [ ] Suggestion has `source: 'automation_new_product_v1'`
- [ ] Suggestion has `applied: false`
- [ ] Product's seoTitle and seoDescription remain NULL (not auto-applied)
- [ ] Server logs show: `[Automation] Created suggestion for new product ... (Free plan: manual apply required)`

**Verification:**

```sql
SELECT * FROM "AutomationSuggestion"
WHERE source = 'automation_new_product_v1'
ORDER BY "generatedAt" DESC LIMIT 1;
```

---

### Scenario 2: New product sync triggers automation (Pro plan)

**Steps:**

1. Log in as a Pro plan user (or upgrade test user to Pro)
2. Navigate to Projects → Select project with Shopify integration
3. Add a NEW product to Shopify with:
   - Title: "Premium Widget Pro"
   - Description: "High-quality widget with advanced features."
   - NO SEO title set
   - NO SEO description set
4. Click "Sync Products" in EngineO.ai

**Expected Results:**

- [ ] Sync completes successfully
- [ ] New product appears in Products list
- [ ] `AutomationSuggestion` created in database
- [ ] Suggestion has `applied: true` and `appliedAt` populated
- [ ] Product's seoTitle and seoDescription are populated
- [ ] Server logs show: `[Automation] Auto-applied metadata for new product ... (AUTO_GENERATE_METADATA_ON_NEW_PRODUCT)`

**Verification:**

```sql
SELECT id, "seoTitle", "seoDescription" FROM "Product"
WHERE title = 'Premium Widget Pro';

SELECT * FROM "AutomationSuggestion"
WHERE applied = true
ORDER BY "appliedAt" DESC LIMIT 1;
```

---

### Scenario 3: Product with existing SEO fields skips automation

**Steps:**

1. Add a NEW product to Shopify with:
   - Title: "Pre-Optimized Product"
   - SEO Title: "Pre-Optimized Product | Best Quality"
   - SEO Description: "Shop our best product now."
2. Sync products in EngineO.ai

**Expected Results:**

- [ ] Sync completes successfully
- [ ] Product appears with existing SEO fields preserved
- [ ] NO `AutomationSuggestion` created for this product
- [ ] Server logs show: `[Automation] Skipping new product automation for ...: SEO fields already populated`

---

### Scenario 4: Daily AI limit enforcement

**Steps:**

1. Use a Free plan account with limited daily AI usage
2. Exhaust the daily AI limit by generating suggestions/answers
3. Add a NEW product to Shopify
4. Sync products in EngineO.ai

**Expected Results:**

- [ ] Sync completes successfully (automation doesn't block sync)
- [ ] NO `AutomationSuggestion` created
- [ ] Server logs show: `[Automation] Skipping new product automation for ...: daily AI limit reached`
- [ ] `AiUsageEvent` count has reached the daily limit

---

### Scenario 5: Automation failure doesn't block sync

**Steps:**

1. Temporarily disable AI provider (e.g., set invalid API key)
2. Add a NEW product to Shopify
3. Sync products in EngineO.ai

**Expected Results:**

- [ ] Sync completes successfully
- [ ] New product appears in Products list
- [ ] Server logs show warning: `[ShopifySync] Automation failed for new product ...: ...`
- [ ] No crash or error displayed to user

---

### Scenario 6: AI usage is recorded

**Steps:**

1. Note the current AI usage count for the user
2. Add a NEW product to Shopify
3. Sync products in EngineO.ai

**Expected Results:**

- [ ] `AiUsageEvent` created with:
  - `feature: 'automation_new_product'`
  - `projectId` matching the synced project
  - `userId` matching the current user
- [ ] AI usage count incremented by 1

**Verification:**

```sql
SELECT * FROM "AiUsageEvent"
WHERE feature = 'automation_new_product'
ORDER BY "createdAt" DESC LIMIT 1;
```

---

### Scenario 7: Updating existing product doesn't trigger automation

**Steps:**

1. Sync products to ensure an existing product is in the database
2. Update that product in Shopify (change title or description)
3. Sync products again in EngineO.ai

**Expected Results:**

- [ ] Sync completes successfully
- [ ] Product updated, but NO new `AutomationSuggestion` created
- [ ] Server logs do NOT show automation being triggered for this product

---

## E2E Test Verification

Run the automated e2e tests:

```bash
cd apps/api
pnpm test:e2e -- --grep "Automation New Product SEO Title"
```

**Expected Results:**

- [ ] All 6 tests pass:
  - Creates suggestion for missing SEO
  - Skips when SEO populated
  - Records AI usage
  - Auto-applies for Pro plan
  - Does not auto-apply for Free
  - Handles non-existent product

---

## Automation Activity Page Verification

1. Navigate to Projects → [Project] → Automation
2. Verify the Automation Activity page displays:
   - [ ] Summary stats updated with new suggestions
   - [ ] Applied suggestions show in "Applied" section (Pro/Business)
   - [ ] Pending suggestions show in "Pending" section (Free)
   - [ ] Each suggestion shows `source: automation_new_product_v1`

---

## Regression Checklist

- [ ] Existing Shopify sync functionality works (products sync correctly)
- [ ] Manual product optimization (AI SEO Suggestions) still works
- [ ] AE-2.1 auto-apply behavior unchanged (crawl-triggered automations)
- [ ] Answer Engine generation still works
- [ ] DEO Score computation unaffected
- [ ] Entitlements enforcement works for other features

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Pending]                             |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | Phase AUE-1 manual testing            |
