# EngineO.ai v1 – Shopify-Only Launch Scope Manual Testing

> Manual testing guide for the EngineO.ai v1 launch, focused exclusively on Shopify product catalogs.

---

## Overview

- **Purpose of the feature/patch:**
  - Define and verify the complete v1 launch scope for EngineO.ai, focused on Shopify product catalogs
  - Validate DEO Score, Answer Engine (AEO v1), Issues Engine (Lite), Automation Engine v1, Dashboard UX, and Product Workspace UX

- **High-level user impact and what "success" looks like:**
  - Shopify merchants can connect their store and sync products
  - Products receive DEO Scores with Answerability components
  - Issues are detected and surfaced for products
  - Automations generate and optionally auto-apply metadata and Answer Blocks
  - Users on different tiers experience appropriate limits and capabilities

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 2.x (Shopify integration)
  - Phase 2.x–3.x (DEO Score)
  - Phases AE-1.x–AE-1.2 (Answer Engine)
  - Phase 3B, UX-7, UX-8 (Issues Engine)
  - Phases AE-1, AE-2, AUE-1 (Automation Engine)
  - Phase 7 (Dashboard)
  - Phase UX-2 (Product Workspace)
  - v1 Shopify-Only Launch Scope section

- **Related documentation:**
  - `docs/ANSWER_ENGINE_SPEC.md`
  - `docs/AUTOMATION_ENGINE_SPEC.md`
  - `docs/deo-score-spec.md`
  - `docs/deo-issues-spec.md`
  - `docs/ENTITLEMENTS_MATRIX.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running on `http://localhost:3001`
  - [ ] Frontend running on `http://localhost:3000`
  - [ ] PostgreSQL database accessible
  - [ ] AI provider configured (`AI_API_KEY`, `AI_PROVIDER` env vars)
  - [ ] Stripe test mode configured (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
  - [ ] Shopify app configured (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`)

- **Test accounts and sample data:**
  - [ ] Test user on Free plan (no subscription)
  - [ ] Test user on Pro plan ($29/mo subscription)
  - [ ] Test user on Business plan ($99/mo subscription)
  - [ ] Test Shopify development store with 10+ products
  - [ ] Products with varying metadata completeness (some with SEO, some without)

- **Required user roles or subscriptions:**
  - [ ] Free: default (no active subscription)
  - [ ] Pro: active Stripe subscription with `plan: 'pro'`
  - [ ] Business: active Stripe subscription with `plan: 'business'`

---

## Test Scenarios (Happy Path)

### Scenario 1: Shopify Store Connection and Product Sync

**ID:** HP-001

**Preconditions:**
- User logged in with any tier
- Shopify development store available

**Steps:**
1. Navigate to Projects → Create New Project
2. Enter project name and Shopify store domain
3. Click "Connect Shopify" to initiate OAuth
4. Complete Shopify OAuth approval
5. Click "Sync Products"

**Expected Results:**
- **UI:** Products list populates with synced Shopify products
- **API:** `POST /shopify/sync` returns `{ synced: N, created: N, updated: 0 }`
- **Logs:** Server logs show successful sync and any automation triggers

---

### Scenario 2: DEO Score Computation with Answerability

**ID:** HP-002

**Preconditions:**
- Project with synced Shopify products
- At least one product with sufficient data for Answerability detection

**Steps:**
1. Navigate to Project Overview page
2. Observe DEO Score summary widget
3. Click into a product to view Product Workspace
4. Check DEO Score badge and Answerability indicator

**Expected Results:**
- **UI:** DEO Score displays (0-100), Answerability status shows ("Answer-ready" / "Partially ready" / "Needs answers")
- **API:** `GET /projects/:id` returns `deoScore` and `answerabilityStatus` fields
- **Logs:** No errors in score computation

---

### Scenario 3: Answer Engine v1 – Answer Block Generation

**ID:** HP-003

**Preconditions:**
- Product with sufficient description content
- User on Pro or Business plan (for full AEO coverage)

**Steps:**
1. Navigate to Product Workspace → AEO / Answers tab
2. View Answerability status and question coverage
3. Click "Generate Answers" for the product
4. Wait for AI generation to complete

**Expected Results:**
- **UI:** Answer Blocks display for applicable questions with confidence scores
- **API:** `POST /ai/product-answers` returns `ProductAnswersResponse`
- **Logs:** AI usage recorded in `AiUsageEvent`

---

### Scenario 4: Issues Engine v1 (Lite) – Issue Detection

**ID:** HP-004

**Preconditions:**
- Products synced with varying metadata quality
- Some products missing SEO title/description

**Steps:**
1. Navigate to Project → Issues page
2. Observe issue counts by severity
3. Filter by severity (Critical, Warning, Info)
4. Click an issue to view details

**Expected Results:**
- **UI:** Issues list with severity badges, "Fix with AI" buttons for AI-fixable issues
- **API:** Issues computed from Product + CrawlResult data
- **Logs:** No errors in issue computation

---

### Scenario 5: Automation Engine v1 – New Product Metadata Auto-Generation

**ID:** HP-005

**Preconditions:**
- User on Pro or Business plan
- New product added to Shopify store (missing SEO fields)

**Steps:**
1. Click "Sync Products" in EngineO.ai
2. Wait for sync to complete
3. Navigate to the newly synced product
4. Check if SEO fields were auto-applied

**Expected Results:**
- **UI (Pro/Business):** Product shows auto-applied SEO title and description
- **UI (Free):** Product shows pending suggestion, not auto-applied
- **API:** `AutomationSuggestion` created with `applied: true` (Pro/Business) or `applied: false` (Free)
- **Logs:** `[Automation] Auto-applied metadata for new product...` (Pro/Business)

---

### Scenario 6: Dashboard Overview v1

**ID:** HP-006

**Preconditions:**
- Project with synced products, computed DEO scores, detected issues

**Steps:**
1. Navigate to Dashboard
2. Observe DEO Score summary widget
3. Observe Issues summary cards
4. Observe Automation overview section

**Expected Results:**
- **UI:** DEO Score with Answerability indicator, issue counts by severity, recent automation runs
- **API:** Dashboard aggregates data from multiple endpoints
- **Logs:** No errors

---

### Scenario 7: Product Workspace v1 – Full Feature Walkthrough

**ID:** HP-007

**Preconditions:**
- Product with DEO score, issues, and automation suggestions

**Steps:**
1. Navigate to Product Workspace
2. Check header: DEO Score badge, Issue badges
3. Switch to AEO / Answers tab
4. Switch to Automations tab
5. Review AI suggestions panel

**Expected Results:**
- **UI:** All tabs functional, data loads correctly, "Apply to Shopify" actions visible
- **API:** Relevant endpoints return expected data
- **Logs:** No errors

---

## Edge Cases

### EC-001: Free Plan Product Limit (50 products)

**Description:** Free plan user attempts to sync more than 50 products

**Steps:**
1. Connect Shopify store with 60+ products on Free plan
2. Trigger product sync

**Expected Behavior:**
- Only first 50 products synced
- Warning message about product limit
- Upgrade prompt displayed

---

### EC-002: Free Plan AEO Limit (1 product)

**Description:** Free plan user attempts Answer Block generation for multiple products

**Steps:**
1. Generate answers for first product (succeeds)
2. Attempt to generate answers for second product

**Expected Behavior:**
- Second product shows limit reached message
- Upgrade prompt for Pro/Business

---

### EC-003: Daily AI Limit Exhaustion

**Description:** User exhausts daily AI usage limit (10 for Free)

**Steps:**
1. Use AI suggestions until limit reached
2. Attempt additional AI action

**Expected Behavior:**
- "Daily AI limit reached" message
- Suggestion to wait until reset or upgrade

---

### EC-004: Product with Insufficient Data for Answerability

**Description:** Product has minimal title/description, insufficient for Answer Block generation

**Steps:**
1. Sync product with only title "Widget" and no description
2. View Answerability status

**Expected Behavior:**
- Answerability status: "Needs answers"
- Most questions marked as "cannot_answer"
- No hallucinated content generated

---

## Error Handling

### ERR-001: Shopify API Failure During Sync

**Scenario:** Shopify API returns error during product sync

**Steps:**
1. Simulate API failure (invalid token or network issue)
2. Trigger product sync

**Expected Behavior:**
- Error toast: "Failed to sync products from Shopify"
- Sync status shows failed
- Existing products not corrupted

---

### ERR-002: AI Provider Unavailable

**Scenario:** AI provider (Gemini/OpenAI) unavailable or returns error

**Steps:**
1. Trigger AI suggestion generation
2. AI provider fails

**Expected Behavior:**
- Error toast: "Unable to generate suggestions. Please try again."
- No partial data saved
- Retry available

---

### ERR-003: Stripe Webhook Failure

**Scenario:** Subscription update fails to process

**Steps:**
1. User upgrades plan
2. Stripe webhook fails to process

**Expected Behavior:**
- User sees pending status
- Admin notification for manual intervention
- Graceful degradation (user retains previous plan until resolved)

---

## Limits

### LIM-001: Free Plan Product Limit (50)

**Scenario:** Free plan user with 50 products tries to sync more

**Steps:**
1. Sync 50 products
2. Add 51st product to Shopify
3. Re-sync

**Expected Behavior:**
- New product not synced
- Warning about limit
- Upgrade prompt

---

### LIM-002: Pro Plan Product Limit (2,000)

**Scenario:** Pro plan user approaching 2,000 products

**Steps:**
1. Sync close to 2,000 products
2. Attempt to exceed

**Expected Behavior:**
- Warning when approaching limit
- Hard stop at 2,000
- Upgrade prompt for Business

---

### LIM-003: Free Plan AI Usage Limit (10/day)

**Scenario:** Free user exhausts 10 daily AI suggestions

**Steps:**
1. Use 10 AI suggestions
2. Attempt 11th

**Expected Behavior:**
- "Daily limit reached" message
- Shows reset time (UTC midnight)
- Upgrade prompt

---

### LIM-004: Free Plan Automation Scope

**Scenario:** Free user expects Answer Block automations

**Steps:**
1. Sync new product on Free plan
2. Check automation behavior

**Expected Behavior:**
- Only metadata automation (suggestion only, no auto-apply)
- No Answer Block auto-generation
- Clear messaging about Pro/Business features

---

## Regression

### Areas potentially impacted:

- [ ] **Shopify OAuth flow:** Verify connection still works after any auth changes
- [ ] **DEO Score computation:** Verify scores compute correctly after Answerability integration
- [ ] **Existing automation suggestions:** Verify crawl-triggered automations still work
- [ ] **Product sync:** Verify existing products update correctly
- [ ] **Billing/Entitlements:** Verify tier enforcement

### Quick sanity checks:

- [ ] Can create new project and connect Shopify
- [ ] Products sync successfully
- [ ] DEO Score displays on Dashboard and Product Workspace
- [ ] Issues detected and displayed
- [ ] AI suggestions generate without errors
- [ ] Plan limits enforced correctly

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test projects
- [ ] Delete test products
- [ ] Cancel test Stripe subscriptions
- [ ] Disconnect test Shopify stores

### Follow-up verification:

- [ ] Confirm database has no orphaned records
- [ ] Verify AI usage events are logged correctly
- [ ] Check automation logs for any errors

---

## Known Issues

- **Intentionally accepted issues:**
  - Non-Shopify integrations not tested (out of v1 scope)
  - Scheduled automations limited to daily cadence only
  - Answer Block persistence not fully implemented (AE-1.2 is ephemeral)

- **Out-of-scope items:**
  - CMS integrations (WordPress, Webflow)
  - Video/VEO features
  - Advanced scheduling for automations
  - Multi-week automation cadences

- **TODOs:**
  - [ ] Test Shopify App Store submission flow
  - [ ] Test production Stripe webhook handling
  - [ ] Validate performance with 10,000 products (Business tier)

---

## Tier-Specific Test Matrix

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Products per project | 50 | 2,000 | 10,000 |
| AEO Answer Blocks | 1 product | All products | All products |
| AI suggestions/day | 10 | Higher | Higher |
| Metadata automation | Suggestions only | Auto-apply | Auto-apply |
| Answer Block automation | No | Yes | Yes |
| Scheduled automations | No | Yes | Yes |
| API access | No | No | Yes |

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | v1 Shopify-Only Launch Scope manual testing |
