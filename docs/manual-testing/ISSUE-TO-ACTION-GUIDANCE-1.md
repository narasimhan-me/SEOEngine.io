# ISSUE-TO-ACTION-GUIDANCE-1 – Manual Testing

> **Feature:** Issue → Playbook Guidance (Guidance-Only, Token-Only, Trust-Preserving)
>
> **Phase:** ISSUE-TO-ACTION-GUIDANCE-1

---

## Overview

- **Purpose of the feature/patch:**
  - Provide deterministic, static mapping from issue types to recommended playbook metadata
  - Display guidance section in RCP Issue Details with playbook recommendations (when available)
  - Add subtle, non-interactive playbook indicator in Issues list
  - Ensure "View playbook" CTA navigates to playbook preview step WITHOUT auto-execution
  - Maintain trust contract: no automatic preview generation, no auto-apply
  - [FIXUP-1] Trust language: non-actionable states use "Automation Guidance" label (no "Recommended" when nothing to recommend)

- **High-level user impact and what "success" looks like:**
  - Users can discover available playbooks for actionable issues directly from the RCP
  - "View playbook" CTA navigates to playbook page at preview step (no AI executed automatically)
  - Blocked and informational issues show calm "No automated action available." message with "Automation Guidance" label
  - Actionable issues with playbook mapping show "Recommended Action" label (since a recommendation is present)
  - Issues list shows subtle indicator (icon) for issues with playbook options
  - No buttons, links, or interactive elements in the indicator — purely informational

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase ISSUE-TO-ACTION-GUIDANCE-1
  - Related: ISSUES-ENGINE-REMOUNT-1, PLAYBOOKS-SHELL-REMOUNT-1, PANEL-DEEP-LINKS-1

- **Related documentation:**
  - docs/testing/CRITICAL_PATH_MAP.md (CP-009: Issue Engine Lite, CP-012: Automation Engine)
  - docs/manual-testing/ISSUES-ENGINE-REMOUNT-1.md
  - docs/manual-testing/PLAYBOOKS-SHELL-REMOUNT-1.md

---

## Preconditions

- **Environment requirements:**
  - [ ] Development server running (`npm run dev` or similar)
  - [ ] Backend API running with valid project and issues data
  - [ ] At least one project with issues of type `missing_seo_title` or `missing_seo_description`

- **Test accounts and sample data:**
  - [ ] Test user account with access to at least one project
  - [ ] Project with actionable issues (isActionableNow=true) of mapped types
  - [ ] Project with blocked issues (isActionableNow=false or undefined)
  - [ ] Project with informational issues (actionability='informational')

- **Required user roles or subscriptions:**
  - [ ] Any plan with issues access (Free tier is sufficient for read-only testing)

---

## Test Scenarios (Happy Path)

### Scenario 1: Issue with Mapping Shows "Recommended Action" in RCP

**ID:** HP-001

**Preconditions:**

- Project has at least one actionable issue of type `missing_seo_title` or `missing_seo_description`

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Find an issue of type `missing_seo_title` or `missing_seo_description` with `isActionableNow=true`
3. Click on the issue row to open RCP
4. Observe the guidance section

**Expected Results:**

- **UI:** RCP displays "Recommended Action" section between "Actionability" and "Affected Assets" (label is "RECOMMENDED ACTION" since a recommendation is present)
- **UI:** Section shows playbook name (e.g., "Fix missing SEO titles")
- **UI:** Section shows one-line description
- **UI:** Section shows "Affects" line with asset scope summary
- **UI:** Section shows "Before you proceed" preconditions list
- **UI:** "View playbook" CTA button is visible (secondary styling, token-only, uses GuardedLink)
- **API:** No API calls for playbook execution on panel open

---

### Scenario 2: Clicking "View playbook" Navigates to Playbook Page

**ID:** HP-002

**Preconditions:**

- RCP is open with issue showing "Recommended action" and "View playbook" CTA

**Steps:**

1. With RCP showing "Recommended action" section, click "View playbook" CTA
2. Observe the navigation
3. Observe the playbook page state

**Expected Results:**

- **UI:** Navigation occurs to `/projects/{projectId}/playbooks/{playbookId}?step=preview&source=entry&returnTo=...&returnLabel=Issues`
- **UI:** Playbook page shows at Step 1 (Preview) — NOT automatically generating preview
- **UI:** No "Generating..." or loading spinner visible for preview content
- **API:** No AI preview generation API call on navigation
- **Trust:** User must explicitly click to generate preview (no auto-AI)

---

### Scenario 3: Blocked Issue Shows "Automation Guidance" with No Recommendation

**ID:** HP-003

**Preconditions:**

- Project has at least one issue where `isActionableNow` is false or undefined

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Find an issue where `isActionableNow !== true` (blocked)
3. Click on the issue row to open RCP
4. Observe the guidance section

**Expected Results:**

- **UI:** RCP displays "Automation Guidance" section (NOT "Recommended Action" — no "Recommended" language when nothing to recommend)
- **UI:** Section shows "No automated action available. Review the Work Canvas for next steps." (calm, neutral text)
- **UI:** No playbook name, description, or CTA visible
- **UI:** No "View playbook" button present

---

### Scenario 4: Informational Issue Shows "Automation Guidance" with No Recommendation

**ID:** HP-004

**Preconditions:**

- Project has at least one issue where `actionability='informational'`

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Find an issue with `actionability='informational'`
3. Click on the issue row to open RCP
4. Observe the guidance section

**Expected Results:**

- **UI:** RCP displays "Automation Guidance" section (NOT "Recommended Action" — no "Recommended" language when nothing to recommend)
- **UI:** Section shows "No automated action available. Review the Work Canvas for next steps." (calm, neutral text)
- **UI:** No playbook name, description, or CTA visible
- **UI:** No "View playbook" button present

---

### Scenario 5: Issues List Shows Subtle Indicator Only (No Buttons)

**ID:** HP-005

**Preconditions:**

- Project has at least one actionable issue of type `missing_seo_title` or `missing_seo_description`

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Find an issue of type `missing_seo_title` or `missing_seo_description` with `isActionableNow=true`
3. Observe the "Issue" column cell for that row

**Expected Results:**

- **UI:** Small icon (lightning bolt) appears next to issue title
- **UI:** Icon has `data-testid="issue-playbook-indicator"` attribute
- **UI:** Icon has `title="Playbook available"` tooltip
- **UI:** Icon is NOT a button/link — no click handler, no navigation on click
- **UI:** Icon is subtle (muted color, small size ~12px)
- **UI:** Clicking the icon does NOT navigate anywhere (may trigger row click → RCP)

---

### Scenario 6: Deep-Link into Issue Panel Shows Same Guidance

**ID:** HP-006

**Preconditions:**

- Project has at least one actionable issue with playbook mapping

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on an actionable issue of type `missing_seo_title` to open RCP
3. Copy the URL from browser address bar
4. Open a new tab and paste the URL
5. Observe the RCP panel in the new tab

**Expected Results:**

- **UI:** RCP opens with the same issue details
- **UI:** "Recommended Action" section shows same playbook guidance
- **UI:** "View playbook" CTA is visible and functional
- **UI:** Deep-link restores complete panel state

---

### Scenario 7: Shopify Embedded Iframe Verification

**ID:** HP-007

**Preconditions:**

- Access to Shopify Admin with EngineO.ai app installed

**Steps:**

1. Open EngineO.ai from within Shopify Admin iframe
2. Navigate to Issues page
3. Click on an actionable issue with playbook mapping
4. Observe the RCP panel
5. Click "View playbook" CTA

**Expected Results:**

- **UI:** RCP displays correctly within iframe (no overflow)
- **UI:** "Recommended Action" section renders without visual issues
- **UI:** "View playbook" CTA navigates correctly within iframe
- **UI:** No horizontal scrolling required
- **UI:** Token-only styling preserved (dark mode safe)

---

## Edge Cases

### EC-001: Issue Without Playbook Mapping (Actionable)

**Description:** Actionable issue that does not have a playbook mapping

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on an actionable issue that is NOT `missing_seo_title` or `missing_seo_description`
3. Observe the "Automation Guidance" section (since unmapped actionable issues render the neutral label)

**Expected Behavior:**

- Section shows "No automated action available."
- No playbook guidance or CTA displayed

---

### EC-002: Issue Type Derived from issue.id Fallback

**Description:** Issue where `type` field is undefined, falls back to `id`

**Steps:**

1. If test data allows, find issue with undefined `type` but `id` matching a mapped type
2. Click to open RCP
3. Observe "Recommended Action" section

**Expected Behavior:**

- Playbook guidance shows correctly using `issue.id` as fallback
- Deterministic: same issue always shows same guidance

---

### EC-003: Multiple Playbook Recommendations (Future)

**Description:** If mapping returns multiple playbooks for one issue type

**Steps:**

1. (Future: extend mapping to return multiple playbooks)
2. Click on issue that maps to multiple playbooks
3. Observe "Recommended Action" section

**Expected Behavior:**

- All recommended playbooks display in section
- Each has its own name, description, affects, preconditions, CTA
- CTAs all navigate to respective playbooks

---

## Error Handling

### ERR-001: No New API Calls for Guidance Mapping

No new API calls are introduced by guidance mapping; issue details may still load via existing RCP read-only fetch; navigation must not trigger preview/estimate/apply calls.

---

## Limits

### LIM-001: N/A

This feature does not have entitlement/quota limits.

---

## Regression

### Areas potentially impacted:

- [ ] **RCP Issue Details:** Existing sections (Summary, Pillar, Severity, Why This Matters, Actionability, Affected Assets, Affected Items) still render correctly
- [ ] **Issues DataTable:** Row click still opens RCP; title click still navigates to fix
- [ ] **Playbooks page:** Navigation from "View playbook" lands correctly at preview step
- [ ] **Deep-links:** PANEL-DEEP-LINKS-1 still works for issues

### Quick sanity checks:

- [ ] RCP issue details load without errors for all issue types
- [ ] Issues list renders without console errors
- [ ] Playbooks page loads correctly from "View playbook" navigation
- [ ] Existing Playwright tests pass (issue-to-fix-path-1.spec.ts, issues-engine-remount-1.spec.ts if any)

---

## Post-Conditions

### Data cleanup steps:

- [ ] No data modifications made (read-only testing)

### Follow-up verification:

- [ ] Verify no console errors in production build
- [ ] Verify Shopify embedded iframe displays correctly

---

## Known Issues

- **Intentionally accepted issues:**
  - Only `missing_seo_title` and `missing_seo_description` have mappings initially. Other issue types show "No automated action available."

- **Out-of-scope items:**
  - Extending mappings to other issue types (future work)
  - Mobile responsive testing (not in scope for this patch)

- **TODOs:**
  - [ ] Run full Playwright test suite after merge
  - [ ] Consider adding automated E2E test for "View playbook" navigation

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
