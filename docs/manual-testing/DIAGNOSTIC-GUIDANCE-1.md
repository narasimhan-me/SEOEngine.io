# Manual Testing: DIAGNOSTIC-GUIDANCE-1

> Diagnostic Guidance Pattern for Issues Outside EngineO.ai Control

---

## Overview

- **Purpose of the feature/patch:**
  - Implements a diagnostic guidance pattern for issues with `actionability === 'informational'` (issues outside EngineO.ai control, such as theme, hosting, or Shopify configuration issues)
  - Ensures these issues are clearly labeled and provide actionable guidance without Fix/Apply CTAs

- **High-level user impact and what "success" looks like:**
  - Users see clear labeling: "Informational — outside EngineO.ai control"
  - Users see explanation text explaining why EngineO.ai cannot fix the issue
  - Users see a "How to address this" guidance block with 4 actionable bullets
  - No Fix, Apply, Fix with AI, or Fix now buttons appear on these issues
  - No dead-click scenarios where clicking leads to silent failures

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase DIAGNOSTIC-GUIDANCE-1

- **Related documentation:**
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-009: Issue Engine Lite)
  - `docs/manual-testing/ISSUE-FIX-KIND-CLARITY-1.md`
  - `docs/manual-testing/COUNT-INTEGRITY-1.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] API and Web servers running locally or on staging
  - [ ] Database seeded with test projects and products
  - [ ] No specific feature flags required

- **Test accounts and sample data:**
  - [ ] Project with connected Shopify store
  - [ ] Products/Pages that trigger technical/indexability issues with `actionability: 'informational'`
  - [ ] Products/Pages that trigger fixable issues (for regression testing)

- **Required user roles or subscriptions:**
  - [ ] Any plan (Free, Pro, or Business)
  - [ ] Any role (OWNER, EDITOR, or VIEWER)

- **Seed endpoint:**
  - N/A — no dedicated seed endpoint. Use existing project data with technical issues.

---

## Test Scenarios (Happy Path)

### Scenario 1: Outside-Control Issue in Issues Engine (Detected Mode)

**ID:** HP-001

**Preconditions:**
- Project has at least one issue with `actionability: 'informational'` (technical/indexability pillar)

**Steps:**
1. Navigate to `/projects/{projectId}/issues`
2. Switch to "Detected" mode (if not already)
3. Filter by "Technical & Indexability" pillar (or find an issue with this type)
4. Locate an issue card with `actionability: 'informational'`

**Expected Results:**
- **UI:**
  - Badge text: **"Informational — outside EngineO.ai control"** (exact phrase)
  - Explanation text visible: **"EngineO.ai cannot directly fix this issue because it depends on your theme, hosting, or Shopify configuration."**
  - "How to address this" block visible with 4 bullets:
    - Check your Shopify theme settings
    - Verify robots.txt and meta tags
    - Use Google Search Console → Pages → Indexing
    - Validate structured data using Rich Results Test
  - **No "Fix", "Fix with AI", "Fix next", "Apply", or "Review" CTA buttons**
  - Card is NOT clickable (no hover state, no cursor pointer)
  - `data-testid="issue-card-informational"` present
  - `data-testid="diagnostic-guidance-block"` present
- **API:** N/A (no API call on card interaction)
- **Logs:** No console errors

---

### Scenario 2: Outside-Control Issue in Overview Modal (IssuesList)

**ID:** HP-002

**Preconditions:**
- Project has at least one issue with `actionability: 'informational'`

**Steps:**
1. Navigate to `/projects/{projectId}/overview`
2. Find the "Issues identified in your project" section (or modal)
3. Locate an issue card with `actionability: 'informational'`

**Expected Results:**
- **UI:**
  - Badge text: **"Informational — outside EngineO.ai control"**
  - Explanation text visible: **"EngineO.ai cannot directly fix this issue because it depends on your theme, hosting, or Shopify configuration."**
  - "How to address this" block visible with 4 bullets
  - **No "Fix →" or "Review →" CTA text**
  - Card is NOT clickable
  - `data-testid="issue-card-informational"` present
  - `data-testid="diagnostic-guidance-block"` present
- **API:** N/A

---

### Scenario 3: Fixable Issues Remain Unchanged (Regression)

**ID:** HP-003

**Preconditions:**
- Project has fixable issues (e.g., missing_seo_title, missing_seo_description)

**Steps:**
1. Navigate to `/projects/{projectId}/issues`
2. Switch to "Actionable" mode
3. Locate an actionable issue (e.g., "Missing SEO title")

**Expected Results:**
- **UI:**
  - "Fix with AI" or "Fix next" CTA is visible
  - Card is clickable (hover state, cursor pointer)
  - No "Informational — outside EngineO.ai control" badge
  - `data-testid="issue-card-actionable"` present
- **API:** N/A

---

## Edge Cases

### EC-001: Mixed Issues List (Both Actionable and Informational)

**Description:** Issues list contains both fixable issues and outside-control issues

**Steps:**
1. Navigate to Issues Engine with pillar filter set to "All pillars"
2. Switch to "Detected" mode to see all issues
3. Scroll through the list

**Expected Behavior:**
- Actionable issues have Fix/Review CTAs and clickable cards
- Outside-control issues have guidance block and no CTAs
- No visual overlap or confusion between the two types

---

### EC-002: Orphan Issue vs Outside-Control Issue

**Description:** Orphan issues (no deterministic fix destination) should show "Informational — no action required", while outside-control issues show "Informational — outside EngineO.ai control"

**Steps:**
1. Find an orphan issue (issue without `actionability: 'informational'` but also without a valid fixHref)
2. Find an outside-control issue (issue with `actionability: 'informational'`)

**Expected Behavior:**
- Orphan issue: Badge says "Informational — no action required", no guidance block
- Outside-control issue: Badge says "Informational — outside EngineO.ai control", guidance block present

---

### EC-003: Frontend Hard-Gate for Outside-Control Issues (FIXUP-1)

**Description:** Outside-control issues must remain non-clickable and non-actionable due to a frontend hard-gate, regardless of backend `isActionableNow` flag value. This ensures the Trust Principle even under inconsistent backend flags.

**Steps:**
1. Navigate to Issues Engine (`/projects/{projectId}/issues`)
2. Locate an issue with `actionability: 'informational'`
3. Attempt to click the issue card
4. Inspect the card element in DevTools

**Expected Behavior:**
- **Badge:** "Informational — outside EngineO.ai control" is present
- **Guidance block:** "How to address this" with 4 bullets is visible
- **No Fix/Apply/Review CTAs:** No actionable buttons rendered
- **Card NOT clickable:** No hover state, no cursor pointer, no navigation on click
- **Test ID:** `data-testid="issue-card-informational"` (never `issue-card-actionable`)
- **fixHref:** null (frontend explicitly sets to null for outside-control issues)
- **isClickableIssue:** false (frontend explicitly gates regardless of backend `isActionableNow`)

**Critical Invariant:**
Even if the backend incorrectly returns `isActionableNow: true` for an outside-control issue, the frontend hard-gate ensures no clickability or navigation occurs.

---

## Error Handling

### ERR-001: No Applicable Issues

**Scenario:** No issues with `actionability: 'informational'` exist in the project

**Steps:**
1. Navigate to Issues Engine for a project without outside-control issues

**Expected Behavior:**
- Normal behavior; no diagnostic guidance blocks rendered
- Actionable issues work as expected

---

## Limits

### LIM-001: N/A

**Scenario:** This feature has no entitlement/quota limits

**Steps:**
- N/A

**Expected Behavior:**
- N/A

---

## Regression

### Areas potentially impacted:

- [ ] **Issues Engine (page.tsx):** Informational card rendering, Fix CTA rendering
- [ ] **IssuesList component:** Card rendering in Overview modal and other surfaces
- [ ] **Fix flows:** Ensure fixable issues still route correctly

### Quick sanity checks:

- [ ] Actionable issues still show "Fix with AI" / "Fix next" CTAs
- [ ] Clicking actionable issue cards navigates to fix flow
- [ ] DIAGNOSTIC issues (fixKind=DIAGNOSTIC) still show "Review" CTA (not affected by this change)
- [ ] No console errors in Issues Engine or Overview pages

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A — no data modifications in this feature

### Follow-up verification:

- [ ] Verify no orphaned UI states
- [ ] Confirm all test scenarios pass

---

## Known Issues

- **Intentionally accepted issues:**
  - The guidance block bullets are static (not dynamically generated based on issue type)

- **Out-of-scope items:**
  - Backend changes to issue builders (this is UI/copy only)
  - New issue types or categories
  - Automated tests for this feature

- **TODOs:**
  - [ ] None

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | [Any additional notes] |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-19 | Initial DIAGNOSTIC-GUIDANCE-1 manual testing guide |
| 1.1 | 2026-01-19 | FIXUP-1: Added EC-003 scenario for frontend hard-gate enforcement. Issues Engine now explicitly gates clickability and fixHref for `actionability === 'informational'` issues, ensuring Trust Principle even under inconsistent backend flags. |
