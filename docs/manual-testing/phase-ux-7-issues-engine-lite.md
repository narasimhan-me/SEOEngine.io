# EngineO.ai – Manual Testing Template

> This is the single source of truth for manual testing structure.
>
> - Claude must clone this template (not edit it directly) when creating per-feature or per-patch manual testing docs.
> - Per-feature docs should live under docs/manual-testing/ with descriptive filenames.
> - All sections must remain present in cloned docs (even if marked "N/A").
> - Claude should adapt the content to the specific patch but preserve the section ordering.

---

## Overview

- Purpose of the feature/patch:
  - Validate Issue Engine Lite (Phase UX-7) end-to-end, including the Issues page, severity filtering, and one-click AI fix actions for missing SEO title/description with proper plan gating and AI limit behavior.

- High-level user impact and what "success" looks like:
  - Free users can see Issues Engine Lite, but AI "Fix now" actions are gated with clear upgrade messaging.
  - Pro/Business users can run "Fix now" for missing_seo_title and missing_seo_description, with SEO fields populated and issues updated.
  - AI token limits and entitlements correctly block overuse, with clear "token limit reached" feedback.
  - Permission checks prevent users from fixing issues on projects they do not own.
  - Dashboard Top blockers and Issues navigation continue to behave correctly.

- Related phases/sections in IMPLEMENTATION_PLAN.md:
  - Phase UX-7 — Issue Engine Lite (Issue list + fix actions)
  - Phase UX-8 — Issue Engine Full (rich metadata; context only)
  - Phase 1.7–1.11 — AI infrastructure, limits, and FeedbackProvider

- Related documentation:
  - docs/testing/issue-engine-lite.md
  - docs/deo-issues-spec.md
  - docs/ENTITLEMENTS_MATRIX.md
  - docs/TOKEN_USAGE_MODEL.md

---

## Preconditions

- Environment requirements:
  - [ ] Backend API running (apps/api)
  - [ ] Frontend web app running (apps/web)
  - [ ] Test database seeded or prepared with Shopify-connected projects and products

- Test accounts and sample data:
  - [ ] Free plan user with at least one project and products that trigger missing_seo_title and missing_seo_description issues
  - [ ] Pro plan user with similar project setup
  - [ ] Optional Business plan user (for parity checks)
  - [ ] At least one crawl completed so Issues Engine Lite has data

- Required user roles or subscriptions:
  - [ ] Free plan: verify read-only Issues and gated AI fix actions
  - [ ] Pro/Business plan: verify one-click AI fixes and token limit behavior

---

## Test Scenarios (Happy Path)

### Scenario 1: Free plan sees issues but Fix now is disabled/upsell

**ID:** UX7-HP-001

**Preconditions:**

- [ ] Logged in as Free plan user.
- [ ] Project has Issues Engine Lite issues including missing_seo_title and/or missing_seo_description.

**Steps:**

1. Navigate to /projects/[id]/issues for the Free-plan project.
2. Confirm that the issue list shows product-focused issues (including missing SEO title/description).
3. Locate any issue with fixType: 'aiFix' and fixReady: true (e.g., missing_seo_title).
4. Attempt to click "Fix next" for that issue.

**Expected Results:**

- UI: Issues page shows the list of issues with severity badges and counts.
- UI: For AI-fixable issues, either "Fix next" is not available or, when clicked, shows an upgrade-style toast:
  - Message indicates that AI-powered SEO fixes are available on Pro/Business plans.
  - Toast uses limit/upsell styling with an Upgrade CTA linking to /settings/billing.
- Behavior: Underlying AI fix endpoint is not allowed to perform writes for Free plans (ENTITLEMENTS_LIMIT_REACHED).

---

### Scenario 2: Pro plan – Fix now generates missing SEO title

**ID:** UX7-HP-002

**Preconditions:**

- [ ] Logged in as Pro plan user.
- [ ] Project has a product with missing_seo_title detected by Issues Engine Lite (Issue Engine response includes missing_seo_title with fixType: 'aiFix' and fixReady: true).

**Steps:**

1. Navigate to /projects/[id]/issues.
2. Find the missing_seo_title issue card.
3. Click "Fix next" for that issue.
4. Wait for the loading state to complete.
5. Re-open the affected product in the Products workspace and inspect the SEO title.
6. Optionally, re-run the Issues page (Re-scan Issues) or refresh to confirm the missing SEO title issue count is reduced.

**Expected Results:**

- UI: "Fix next" button shows a spinner ("Fixing…") while the request is in flight.
- UI: On success, a toast appears: "SEO title generated for one product. X remaining."
- Backend: The /ai/product-metadata/fix-from-issue endpoint:
  - Validates project ownership.
  - Uses EntitlementsService to enforce daily AI limits for product_optimize.
  - Calls existing metadata generator logic (AiService.generateMetadata).
  - Persists a non-empty seoTitle for the product.
- Data: Product's seoTitle field is now populated with the AI-generated title.
- Issues: missing_seo_title issue count decreases after refresh/re-scan.

---

### Scenario 3: Pro plan – Fix now generates missing SEO description

**ID:** UX7-HP-003

**Preconditions:**

- [ ] Same as Scenario 2, but with a product triggering missing_seo_description.

**Steps:**

1. Navigate to /projects/[id]/issues.
2. Find the missing_seo_description issue card.
3. Click "Fix next".
4. After completion, inspect the product's SEO description in the Product workspace.

**Expected Results:**

- UI: "Fix next" behaves as above with an appropriate success toast (e.g., "SEO description generated for one product. X remaining.").
- Backend: AI fix endpoint:
  - Persists a non-empty seoDescription for the product.
  - Uses the same entitlement and AI limit logic as for titles.
- Issues: missing_seo_description issue count decreases after re-scan.

---

### Scenario 4: Token limit reached blocks fix

**ID:** UX7-HP-004

**Preconditions:**

- [ ] Pro plan user.
- [ ] Daily AI limit for product_optimize configured and reachable.

**Steps:**

1. Use product optimization or issue-based "Fix next" actions until AI_DAILY_LIMIT_REACHED is triggered (or simulate via configuration).
2. Attempt "Fix next" for missing_seo_title or missing_seo_description on Issues page.

**Expected Results:**

- UI: A toast appears: "Token limit reached. Upgrade to continue fixing products."
- UI: Toast uses limit styling with an Upgrade link to /settings/billing.
- Backend: Endpoint responds with AI_DAILY_LIMIT_REACHED (HTTP 429); no SEO fields are changed.
- Behavior: Subsequent "Fix next" attempts for the same day are blocked similarly.

---

### Scenario 5: Permission test – cannot fix another project's product

**ID:** UX7-HP-005

**Preconditions:**

- [ ] At least two users (User A and User B) with separate projects.
- [ ] User A has a project with Issues Engine Lite data; User B should not own that project.

**Steps:**

1. As User A (Pro plan), confirm Issues appear for a project.
2. As User B (Pro or Free), attempt to call the AI fix endpoint for a product in User A's project (via UI or direct API call).

**Expected Results:**

- Backend: AI fix endpoint returns a permission error (Forbidden) when user does not own the product's project.
- UI: If triggered from UI, surfaces a clear error toast and does not update any SEO fields.
- Data: No unauthorized SEO changes occur on User A's products.

---

### Scenario 6: Regression – Dashboard Top blockers still works and links correctly

**ID:** UX7-HP-006

**Preconditions:**

- [ ] Project with Top blockers on the Overview dashboard.

**Steps:**

1. Navigate to /projects/[id]/overview.
2. Confirm "Top blockers" section renders the top 3 issues.
3. Click "View all issues" from the dashboard.

**Expected Results:**

- UI: "Top blockers" continues to render with severity and outcome-style descriptions.
- Navigation: "View all issues" still navigates to /projects/[id]/issues.
- Behavior: Issue selection and severity filters on the Issues page behave as before; new "Fix now" wiring does not break dashboard flows.

---

## Edge Cases

### EC-001: Already fixed SEO field

**Description:** The issue says missing_seo_title, but the product's seoTitle is already set (e.g., fixed manually).

**Steps:**

1. Manually set seoTitle on a product that still has a missing_seo_title issue cached.
2. Click "Fix next" on the corresponding issue.

**Expected Behavior:**

- Backend: AI fix endpoint returns updated: false with reason: 'already_has_value'.
- UI: Shows an info toast indicating no changes were applied because the field is already set.
- Issues: After re-scan, missing_seo_title issue disappears.

---

### EC-002: No usable AI suggestion

**Description:** AI generates an empty or unusable title/description for the product.

**Steps:**

1. In a controlled environment, force AI to return empty strings (e.g., via stubbing).
2. Run "Fix next" for missing_seo_description.

**Expected Behavior:**

- Backend: Returns updated: false with reason: 'no_suggestion'.
- UI: Shows an info toast: AI could not generate a usable suggestion for this field.
- Data: Product SEO fields remain unchanged.

---

## Error Handling

### ERR-001: AI provider failure

**Scenario:** AI provider call fails (network error or provider-side error) during "Fix next".

**Steps:**

1. Simulate AI provider failure when the fix endpoint calls metadata generation.
2. Click "Fix next" for missing_seo_title.

**Expected Behavior:**

- UI: Shows a clear error toast: "Failed to run AI fix. Please try again."
- Backend: Logs the error under [AI][IssueAiFix] fix_product_metadata.failed with context (userId, projectId, productId, issueType).
- Data: No partial or corrupted SEO values are persisted.

---

## Regression

### Areas potentially impacted:

- [ ] DEO Issues API (GET /projects/:id/deo-issues)
- [ ] Issues Engine Lite issue computation for metadata issues
- [ ] Products page issue badges and navigation to Issues page
- [ ] Product SEO editor flows and AI product metadata suggestions
- [ ] AI entitlements and daily AI limit handling (shared product_optimize feature)

### Quick sanity checks:

- [ ] Issues page still lists all 12 Issue Engine Lite issue types with correct severities and counts.
- [ ] Severity filters (All/Critical/Warning/Info) still work.
- [ ] "Fix manually" and "Sync" buttons still navigate to the correct surfaces.
- [ ] AI product metadata suggestions (/ai/product-metadata) for the Product workspace still work as before.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove or archive any temporary projects/users created for Issue Engine Lite testing.
- [ ] Reset any flags or configuration used to force AI failures or limit conditions.

### Follow-up verification:

- [ ] Re-run docs/testing/issue-engine-lite.md to ensure all core Issue Engine Lite behaviors still pass.
- [ ] Spot-check that Issue Engine Full (UX-8) metadata fields (category, whyItMatters, etc.) remain present and correct.

---

## Known Issues

- Intentionally accepted issues:
  - None identified; update this section if any UX tradeoffs (e.g., only one primary product per issue) are explicitly accepted.

- Out-of-scope items:
  - AI fix actions for other issue types (weak_title, weak_description, etc.) beyond missing_seo_title and missing_seo_description.
  - Bulk fix actions or batch operations.
  - Automatic Shopify sync as part of the Fix now flow.

- TODOs:
  - [ ] Consider surfacing richer context (e.g., sample affected products) alongside "Fix now" in future UX phases.

---

## Approval

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| Tester Name    | [Name]                                |
| Date           | [YYYY-MM-DD]                          |
| Overall Status | [ ] Passed / [ ] Blocked / [ ] Failed |
| Notes          | [Any additional notes]                |
