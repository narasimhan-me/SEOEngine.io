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
  - Add an inline, single-item AI preview step to Issues Engine Lite "Fix next" actions so DEOs can see the proposed SEO change before applying it, without changing underlying fix behavior or backend endpoints.

- High-level user impact and what "success" looks like:
  - Users see an inline preview panel (no modal) showing what will change (per product, per field) before applying AI fixes.
  - "Fix next" no longer applies changes immediately; it opens a preview with "Apply fix" / "Cancel" options.
  - Preview is ephemeral and not persisted until "Apply fix" is chosen.

- Related phases/sections in IMPLEMENTATION_PLAN.md:
  - Phase UX-7 — Issue Engine Lite
  - Phase UX-7.1 — Microcopy clarification ("Fix next" and per-item scope)
  - Phase UX-7.2 — Inline preview before fix (this document)

- Related documentation:
  - docs/testing/issue-engine-lite.md
  - docs/deo-issues-spec.md
  - docs/ENTITLEMENTS_MATRIX.md
  - docs/TOKEN_USAGE_MODEL.md

---

## Preconditions

- Environment requirements:
  - [ ] Backend API running
  - [ ] Frontend web app running
  - [ ] Database with a project that has Issue Engine Lite metadata issues (missing_seo_title, missing_seo_description)

- Test accounts and sample data:
  - [ ] Pro (or Business) plan user with:
    - Project containing products missing SEO title and/or description
    - At least one crawl completed so Issues Engine Lite has data
  - [ ] Free plan user for blocked/upsell checks (reuse UX-7.1 where applicable)

- Required user roles or subscriptions:
  - [ ] Pro/Business plan required to apply AI fixes
  - [ ] Free plan can view issues but not apply AI fixes

---

## Test Scenarios (Happy Path)

### Scenario 1: Missing SEO title → preview shows correct AI title → apply works

**ID:** UX7.2-HP-001

**Preconditions:**

- [ ] Pro plan user.
- [ ] Project has at least one missing_seo_title issue (Issue Engine Lite) with fixType: 'aiFix' and fixReady: true.

**Steps:**

1. Navigate to /projects/[id]/issues.
2. Locate the missing_seo_title issue card.
3. Click "Fix next".
4. Observe the inline preview panel expanding inside the issue row.
5. Confirm the preview shows:
   - Product name being fixed (or a clear identifier)
   - Field label "SEO title"
   - Current value (or "Missing" if empty)
   - AI-generated "AI preview" value (read-only).
6. Click "Apply fix".

**Expected Results:**

- UI: "Fix next" does not immediately persist changes; it opens the preview panel.
- Preview Panel: Uses a soft/inset style (muted background, border) and is clearly distinct from the main issue body.
- Focus: Keyboard focus moves into the preview panel when it opens.
- On Apply: Panel collapses after apply, and a toast appears:
  - "SEO title applied to '{Product Name}'. {remainingCount} remaining."
- Data: After refreshing/re-scanning issues, the count for missing_seo_title decreases and the product's SEO title is populated.

---

### Scenario 2: Missing SEO description → preview shows correct AI description

**ID:** UX7.2-HP-002

**Preconditions:**

- [ ] Same as Scenario 1, but with a missing_seo_description issue.

**Steps:**

1. On /projects/[id]/issues, locate the missing_seo_description issue.
2. Click "Fix next" to open the inline preview.
3. Inspect the panel content.

**Expected Results:**

- UI: Preview panel states:
  - Product name
  - Field: "SEO description"
  - Current value (or "Missing")
  - AI-generated preview description (read-only).
- On Apply: Behavior matches Scenario 1 with description-specific toast copy:
  - "SEO description applied to '{Product Name}'. {remainingCount} remaining."

---

### Scenario 3: Cancel → no changes persisted

**ID:** UX7.2-HP-003

**Preconditions:**

- [ ] Pro plan user.
- [ ] Issue missing_seo_title or missing_seo_description with AI fix available.

**Steps:**

1. Click "Fix next" on an AI-fixable issue to open the preview panel.
2. Verify preview content renders.
3. Click "Cancel".
4. Refresh the Issues page or re-run Issues Engine for the same project.

**Expected Results:**

- UI: Preview panel collapses when "Cancel" is clicked.
- Toasts: No success or error toast is shown.
- Data: No SEO field changes are persisted (product remains in "missing" state).
- Focus: After cancel, keyboard focus returns to the "Fix next" button for that issue.

---

### Scenario 4: Remaining count decrements after apply

**ID:** UX7.2-HP-004

**Preconditions:**

- [ ] At least two products affected by the same missing_seo_title or missing_seo_description issue.

**Steps:**

1. Note the current count displayed on the issue (number of items affected).
2. Click "Fix next" for that issue and "Apply fix" once.
3. Observe the success toast message containing {remainingCount} remaining.
4. Refresh the Issues page or use "Re-scan Issues".

**Expected Results:**

- Toast: Remaining count in the toast reflects issue.count - 1 for that issue at the time of fix.
- Issues List: After refresh/re-scan, the displayed count for the issue decreases by 1.

---

### Scenario 5: Token limit blocks preview generation

**ID:** UX7.2-HP-005

**Preconditions:**

- [ ] Pro plan user whose daily AI limit for product_optimize (per ENTITLEMENTS) is reached or simulated.
- [ ] Project with AI-fixable metadata issues.

**Steps:**

1. Attempt to click "Fix next" on an AI-fixable issue (missing SEO title or description).

**Expected Results:**

- UI: Inline preview panel does not open when the AI daily limit is reached.
- Toast: Limit toast appears with copy:
  - "Token limit reached. Upgrade to continue fixing products."
- Data: No SEO field changes are applied.

---

### Scenario 6: Regression – "Fix next" without preview no longer exists

**ID:** UX7.2-HP-006

**Preconditions:**

- [ ] Pro plan user with AI-fixable metadata issues.

**Steps:**

1. Inspect AI-fixable issues on /projects/[id]/issues.
2. Click "Fix next".

**Expected Results:**

- Behavior: "Fix next" always opens the inline preview panel first; there is no path where "Fix next" applies AI fixes immediately without preview.
- Consistency: The "Fix next" label and per-product helper text remain consistent with UX-7.1 microcopy ("Fixes one affected product at a time for safe review.").

---

## Edge Cases

### EC-001: Preview generation failure

**Description:** AI provider or preview call fails for an AI-fixable issue.

**Steps:**

1. Simulate an AI provider error (e.g., invalid API key, network failure).
2. Click "Fix next" on an AI-fixable issue.

**Expected Behavior:**

- UI: Inline error message appears inside the preview area (or below helper text) stating:
  - "Couldn't generate a preview. Try again."
- Behavior: No SEO fields are changed; the issue remains unaffected.

---

## Error Handling

### ERR-001: Entitlement or token limit during preview/apply

**Scenario:** User lacks entitlements or hits AI limits while attempting to preview or apply.

**Steps:**

1. For token limit, see Scenario 5.
2. For entitlements (plan gating), attempt to apply a fix from the preview panel while on a Free plan (reusing prior UX-7.1 behavior).

**Expected Behavior:**

- Preview: When blocked by token limits, preview does not open and shows the limit toast.
- Apply: When blocked by entitlements on apply:
  - Toast copy matches UX-7.1:
    - "Upgrade to fix additional products with AI."
  - Preview collapses or remains visible without persisting any changes.

---

## Regression

### Areas potentially impacted:

- [ ] Issue Engine Lite AI fix actions ("Fix next")
- [ ] Issues page filtering and counts
- [ ] Existing product-level AI optimization flows (/ai/product-metadata, product workspace)
- [ ] FeedbackProvider toasts for entitlement and AI limit errors

### Quick sanity checks:

- [ ] Issues page still lists all Issue Engine Lite issue types with correct severities.
- [ ] "Fix next" behavior is consistent across AI-fixable metadata issues.
- [ ] Non-AI fixes (manual/sync) are unaffected.
- [ ] Dashboard "Top blockers" → Issues navigation still works as expected.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Optionally remove or reset any temporary projects/users created specifically to test inline previews.
- [ ] Clear any test configuration that forces AI limit or error conditions.

### Follow-up verification:

- [ ] Re-run existing Issue Engine Lite manual tests (docs/testing/issue-engine-lite.md) to ensure core behavior remains intact.
- [ ] Spot-check that UX-7.1 microcopy (per-item "Fix next") remains consistent after the inline preview changes.

---

## Known Issues

- Intentionally accepted issues:
  - Inline preview relies on existing AI suggestion logic; if suggestions differ slightly from underlying fix behavior, this will be addressed in a future backend phase.

- Out-of-scope items:
  - Bulk preview or bulk fix for multiple products.
  - Modals or non-inline preview surfaces.
  - New backend endpoints or token metering modes beyond existing implementation.

- TODOs:
  - [ ] Consider highlighting which specific product (e.g., "Product 1 of N") is being fixed in the preview panel.

---

## Approval

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| Tester Name    | [Name]                                |
| Date           | [YYYY-MM-DD]                          |
| Overall Status | [ ] Passed / [ ] Blocked / [ ] Failed |
| Notes          | [Any additional notes]                |
