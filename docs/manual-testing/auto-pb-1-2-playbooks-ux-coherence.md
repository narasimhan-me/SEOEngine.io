# Phase AUTO-PB-1.2 – Automation Playbooks UX Coherence & State Safety

> Manual testing checklist for Automation Playbooks v1.2: eligibility gating, state-machine driven wizard, navigation safety, and post-apply results persistence.

---

## Overview

- **Purpose of the feature/patch:**
  - Transform Automation Playbooks into a trust-first, guided wizard with a single source of truth for state, clear eligibility gating, and safe navigation.
  - Eliminate misleading affordances such as enabled Apply/Sync/Updated-products actions when nothing qualifies or a run is still in progress.

- **High-level user impact and what "success" looks like:**
  - Users can never run a playbook when nothing qualifies or when the estimate indicates it cannot proceed.
  - At every moment, there is exactly one primary next step in the wizard, with other actions clearly secondary or disabled.
  - Leaving mid-flow either preserves playbook state or warns explicitly before discarding it.
  - After apply, results remain visible and navigable, including a clear path back from the Products view.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - AUTO-PB-1 – Automation Playbooks v1 (Preview → Estimate → Apply)
  - AUTO-PB-1.1 – Automation Playbooks v1 Hardening (Per-Item Results & Stop-on-Failure)
  - AUTO-PB-1.2 – Playbooks UX Coherence & State Safety

- **Related documentation:**
  - docs/manual-testing/phase-automation-1-playbooks.md
  - docs/manual-testing/auto-pb-1-playbooks-v1.md
  - docs/manual-testing/auto-pb-1-1-playbooks-hardening.md
  - docs/testing/automation-engine-product-automations.md
  - docs/testing/CRITICAL_PATH_MAP.md (CP-012: Automation Engine)

---

## Preconditions

- **Environment requirements:**
  - API server running with database and Prisma schema up to date.
  - Web app (apps/web) running against the same API base URL.
  - E2E mode enabled for Playwright / testkit (ENGINEO_E2E=1) when running automated checks.

- **Test accounts and sample data:**
  - Pro-plan project with products missing SEO metadata (for happy path).
  - Pro-plan project with products that already have complete SEO metadata (zero-eligibility case), ideally seeded via:
    `POST /testkit/e2e/seed-playbook-no-eligible-products`
  - Daily AI usage below any configured limit for the happy path scenarios.

- **Required user roles or subscriptions:**
  - Pro / Business plan – required for bulk apply.

---

## Scenario 1 – Zero-Eligibility Guardrail (Step 0)

**ID:** PB12-001

**Goal:** Verify that when a playbook has no eligible products, the wizard surfaces an eligibility guardrail and disables the rest of the flow.

**Preconditions:**
- [ ] Pro-plan project seeded such that all products already have SEO title and description (no missing metadata).

**Steps:**
1. Log in as the Pro-plan user for the "no-eligible-products" project.
2. Navigate to `/projects/{projectId}/automation/playbooks`.
3. Select the "Fix missing SEO titles" playbook.

**Expected Results:**
- [ ] The wizard shows an eligibility message: "No products currently qualify for this playbook."
- [ ] Steps 2 and 3 (Estimate, Apply) are not visible or interactable.
- [ ] There is no enabled "Generate preview" button.
- [ ] There is no Apply button anywhere.
- [ ] Exactly one primary CTA is visible: "View products that need optimization"
- [ ] Clicking the CTA navigates to `/projects/{projectId}/products`.

---

## Scenario 2 – Step Gating & Single Primary Action (Happy Path)

**ID:** PB12-002

**Goal:** Verify that the Preview → Estimate → Apply flow is correctly gated and only exposes one primary action at a time.

**Preconditions:**
- [ ] Pro-plan project with multiple products missing SEO title and/or description.

**Steps:**
1. Navigate to `/projects/{projectId}/automation/playbooks`.
2. Select "Fix missing SEO titles".
3. Before generating preview, observe the wizard:
   - Step 1: "Generate preview" visible.
   - Step 2: Estimate section locked / de-emphasized.
   - Step 3: Apply section locked / Apply button disabled.
4. Click "Generate preview" and wait for sample preview to render.
5. Observe Step 1:
   - Label shows "Sample preview (up to 3 products)".
   - Preview shows up to 3 products with Before/After content.
   - "Continue to Estimate" now appears as the primary CTA.
6. Click "Continue to Estimate".
7. In Step 2 (Estimate):
   - Verify that Products to update, Estimated tokens, and Plan & daily capacity panels render.
   - Verify only "Continue to Apply" is primary.
8. Click "Continue to Apply".
9. In Step 3 (Apply):
   - Confirm the checkbox is required to enable "Apply playbook".

**Expected Results:**
- [ ] Before preview: "Generate preview" is the only primary blue button. "Continue to Estimate" is not visible/enabled.
- [ ] After preview: "Generate preview" remains available but de-emphasized (secondary). "Continue to Estimate" becomes the primary blue button.
- [ ] In Step 2: Estimate information matches backend expectations for total affected products and plan limits. Only "Continue to Apply" is primary. No Apply button is present in Step 2.
- [ ] In Step 3 pre-apply: Only "Apply playbook" is primary. Apply button remains disabled until the confirmation checkbox is checked and estimate can proceed.

---

## Scenario 3 – Navigation Safety (Leave Mid-Flow)

**ID:** PB12-003

**Goal:** Ensure users are warned before discarding an in-progress preview/estimate and that state is not silently lost.

**Preconditions:**
- [ ] Same as Scenario PB12-002 (happy path project with eligible products).

**Steps:**
1. Run through Step 1 and generate a preview.
2. Click "Continue to Estimate" so the wizard is in the Estimate step.
3. Attempt to navigate away in each of the following ways while still in an in-progress state:
   - Click the "Projects" breadcrumb link at the top.
   - Click the "Activity" tab in the Automation tabs.
   - Attempt to close the browser tab or refresh the page.

**Expected Results:**
- [ ] For in-app navigation (breadcrumbs, Activity tab): A confirmation dialog appears with text similar to: "You have an in-progress playbook preview. Leaving will discard it." Clicking "Cancel" keeps the user on the Playbooks page with preview and estimate intact. Clicking "OK" allows navigation away and discards in-memory wizard state.
- [ ] For browser close/refresh: The standard "leave this page?" prompt appears.

---

## Scenario 4 – Post-Apply Results & Persistence

**ID:** PB12-004

**Goal:** Verify that apply results are clearly presented, that post-apply CTAs are correct, and that results persist across reloads.

**Preconditions:**
- [ ] Same as Scenario PB12-002.

**Steps:**
1. Complete Preview → Estimate → Apply:
   - Generate preview.
   - Continue to Estimate.
   - Continue to Apply.
   - Check the confirmation checkbox and click "Apply playbook".
2. Wait for the run to complete.
3. Observe the UI in the Apply section.
4. Reload the browser tab.
5. Observe the UI again.

**Expected Results:**
- [ ] After completion: The header area shows "Playbook run completed" (or "Playbook stopped safely" for stop-on-failure runs). The summary panel shows updatedCount, skippedCount, attemptedCount / totalAffectedProducts. The per-product results table is available under an expandable "View per-product results" control. Only after completion do the following actions become enabled: "View updated products", "Sync to Shopify", "Return to Automation overview".
- [ ] After reload: The Playbooks page restores the post-apply results state (summary + per-item results) from session storage. The same post-apply CTAs are available and enabled.

---

## Scenario 5 – Back-to-Playbook from Products

**ID:** PB12-005

**Goal:** Confirm that users can safely pivot to the Products view and return to the Playbook results without losing state.

**Preconditions:**
- [ ] A playbook run has completed as in Scenario PB12-004.

**Steps:**
1. From the Playbooks Apply/results section, click "View updated products".
2. On the Products page, observe the top navigation.
3. Click "← Back to Playbook results".

**Expected Results:**
- [ ] Products page shows a "← Back to Playbook results" link or button when reached from Playbooks.
- [ ] Clicking "Back to Playbook results" returns the user to `/projects/{projectId}/automation/playbooks` with: The Playbook results header still visible. Summary and per-item results still present. Post-apply CTAs ("View updated products", "Sync to Shopify", "Return to Automation overview") still enabled.

---

## Scenario 6 – Stop-on-Failure / Limit Reached (Regression)

**ID:** PB12-006

**Goal:** Verify that AUTO-PB-1.1 stop-on-failure semantics and "Stopped safely" UX still work under the new state model.

**Preconditions:**
- [ ] Ability to simulate failure or daily AI limit conditions (via test stubs or controlled environment).

**Steps:**
1. Configure the backend or test environment so that the playbook run stops early (either due to rate-limit / AI_DAILY_LIMIT_REACHED or a synthetic error).
2. Run the playbook via the wizard to completion.

**Expected Results:**
- [ ] The Apply results section shows a "Stopped safely" amber banner with the stopping reason and, where applicable, a link to the product where the run stopped.
- [ ] The per-item results table still shows UPDATED/SKIPPED/FAILED/LIMIT_REACHED statuses per product.
- [ ] Post-apply CTAs are available as in Scenario PB12-004 (View updated products, Sync to Shopify, Return to Automation overview).

---

## Error Handling & Regression Guardrails

**ID:** PB12-007 – Error & Limit Feedback

- [ ] Network errors during preview generation display a toast and keep the wizard in PREVIEW_READY state.
- [ ] Daily AI limit errors during preview generation show a limit toast with upgrade CTA.
- [ ] Network errors during apply reset flowState to APPLY_READY so users can retry.
- [ ] ENTITLEMENTS_LIMIT_REACHED during apply shows a limit toast with upgrade CTA.

---

## E2E Tests (Automated)

The following Playwright tests cover AUTO-PB-1.2 scenarios:

| Test Name | File | Scenario |
|-----------|------|----------|
| Zero-eligibility state shows guardrail and disables wizard flow | apps/web/tests/first-deo-win.spec.ts | PB12-001 |
| Wizard enforces step gating, navigation warning, and post-apply persistence | apps/web/tests/first-deo-win.spec.ts | PB12-002, PB12-003, PB12-004, PB12-005 |

Run E2E tests:
```bash
ENGINEO_E2E=1 pnpm --filter web exec playwright test first-deo-win.spec.ts
```

---

## Sign-off

| Scenario | Tester | Date | Pass/Fail | Notes |
|----------|--------|------|-----------|-------|
| PB12-001 | | | | |
| PB12-002 | | | | |
| PB12-003 | | | | |
| PB12-004 | | | | |
| PB12-005 | | | | |
| PB12-006 | | | | |
| PB12-007 | | | | |
