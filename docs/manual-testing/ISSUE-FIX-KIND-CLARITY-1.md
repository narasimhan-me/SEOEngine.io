# Manual Testing: ISSUE-FIX-KIND-CLARITY-1

> Diagnostic vs Fixable Issue CTA Semantics

## Overview

This phase ensures that DIAGNOSTIC issues (informational, no direct fix available) are semantically distinguished from EDIT/AI issues (actionable with direct fix surface) across all surfaces.

## Prerequisites

- Access to a project with detected issues
- Products with both DIAGNOSTIC issues (e.g., `not_answer_ready`) and EDIT issues (e.g., `missing_seo_title`)
- Or use existing seed: `POST /testkit/e2e/seed-first-deo-win`

---

## IssueFixKind Classification

| fixKind | Meaning | CTA Wording | Arrival Callout |
|---------|---------|-------------|-----------------|
| `EDIT` | User edits a field directly | "Fix" / "Fix now" | Indigo "You're here to fix:" |
| `AI` | User triggers AI generation | "Fix" / "Fix now" | Indigo "You're here to fix:" |
| `DIAGNOSTIC` | Informational; review data, no direct fix | "Review" | Blue "You're here to review:" |

**Known DIAGNOSTIC Issues:**
- `not_answer_ready` - Answer readiness analysis (Search & Intent)

---

## Test Scenarios

### Scenario 1: Issues Engine CTA Wording

**Route:** `/projects/{projectId}/issues`

1. Navigate to the Issues Engine
2. Locate an issue card with `data-fix-kind="DIAGNOSTIC"`
3. **Verify:**
   - [ ] CTA shows "Review" (not "Fix")
   - [ ] CTA has blue styling (`bg-blue-50`)
   - [ ] Card is still clickable (has button role)
4. Locate an issue card with `data-fix-kind="EDIT"`
5. **Verify:**
   - [ ] CTA shows action label (e.g., "Fix with AI", "Open") - NOT "Review"
   - [ ] "Fixes one affected product at a time..." text is shown for AI issues

---

### Scenario 2: DEO Overview CTA Wording

**Route:** `/projects/{projectId}/deo`

1. Navigate to DEO Overview
2. Find "Top Recommended Actions" section
3. For a DIAGNOSTIC issue (if present):
   - **Verify:** CTA link shows "Review" (not "Fix now")
4. For a non-DIAGNOSTIC issue:
   - **Verify:** CTA link shows "Fix now" (not "Review")

---

### Scenario 3: DIAGNOSTIC Arrival Callout (Blue, Not Yellow)

**Route:** `/projects/{projectId}/products/{productId}?from=issues&issueId=not_answer_ready&tab=search-intent`

> [FIXUP-1] NOTE: fixKind is NOT passed in URL. It is derived from issue config only.

1. Navigate to a product with DIAGNOSTIC issue context
2. **Verify:**
   - [ ] Arrival callout banner (`data-testid="issue-fix-context-banner"`) is visible
   - [ ] Banner has blue styling (`bg-blue-50`) NOT yellow (`bg-yellow-50`)
   - [ ] Banner shows "You're here to review:" (not "You're here to fix:")
   - [ ] Banner does NOT show "Fix surface not available" message

---

### Scenario 4: "View related issues" CTA for DIAGNOSTIC

**Route:** `/projects/{projectId}/products/{productId}?from=issues&issueId=not_answer_ready&tab=search-intent`

> [FIXUP-1] NOTE: fixKind is NOT passed in URL. It is derived from issue config only.

1. Navigate to a product with DIAGNOSTIC issue context
2. **Verify:**
   - [ ] Arrival callout shows "View related issues" button (`data-testid="issue-fix-view-related-issues"`)
   - [ ] Clicking the button navigates to Issues Engine: `/projects/{projectId}/issues?mode=detected&pillar={pillarId}`
   - [ ] URL contains `mode=detected` and `pillar=` parameters

---

### Scenario 5: Non-DIAGNOSTIC Arrival Callout (Standard Behavior)

**Route:** `/projects/{projectId}/products/{productId}?from=issues&issueId=missing_seo_title&tab=metadata`

1. Navigate to a product with non-DIAGNOSTIC issue context
2. **Verify:**
   - [ ] Arrival callout shows "You're here to fix:" (not "You're here to review:")
   - [ ] Banner has indigo styling (`bg-indigo-50`) when actionable
   - [ ] "View related issues" CTA is NOT shown

---

## Critical Invariants

1. **DIAGNOSTIC issues NEVER show "Fix surface not available"** - They use the dedicated "diagnostic" callout variant
2. **DIAGNOSTIC CTAs use "Review" wording** - Never "Fix" or "Fix now"
3. **DIAGNOSTIC arrival callout is blue** - Never yellow (anchor_not_found) or indigo (actionable)
4. **fixKind is NOT passed via URL** - It is derived from `getIssueFixConfig()` only (URL param is non-authoritative, spoofable)
5. **"View related issues" routes to Issues Engine** - NOT to product `?tab=issues`

---

## Test Coverage

- Playwright E2E: `apps/web/tests/issue-fix-kind-clarity-1.spec.ts`
  - IFKC1-001: DIAGNOSTIC issue shows Review CTA in Issues Engine
  - IFKC1-002: Non-DIAGNOSTIC issue shows Fix CTA in Issues Engine
  - IFKC1-003: DIAGNOSTIC arrival callout uses blue styling
  - IFKC1-004: DIAGNOSTIC callout shows View related issues CTA (routes to Issues Engine)
  - IFKC1-005: DEO Overview shows correct CTA for DIAGNOSTIC issues

---

## Notes

- The `fixKind` field defaults to `'EDIT'` if not specified in issue config
- Search & Intent issues use `search-intent-tab-anchor` as canonical anchor (no module-level testids)
- DIAGNOSTIC issues (`not_answer_ready`) have NO `fixAnchorTestId` - no scroll/highlight is performed
- `buildIssueFixHref()` skips adding `fixAnchor` param for DIAGNOSTIC issues (no scroll/highlight needed)
- Issues Engine derives `fixKind` via `getIssueFixConfig(issueType)` - never from URL
