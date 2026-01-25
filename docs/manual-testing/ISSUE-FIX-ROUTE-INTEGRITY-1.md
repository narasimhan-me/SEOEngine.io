# ISSUE-FIX-ROUTE-INTEGRITY-1 – Manual Testing

> **Feature:** Issues Decision Engine: No Dead Clicks
>
> **Phase:** ISSUE-FIX-ROUTE-INTEGRITY-1

---

## Overview

- **Purpose of the feature/patch:**
  - Eliminate "dead clicks" in Issues Engine by enforcing truthful CTAs
  - Implement destination map as source of truth for issue action availability
  - Explicit blocked states when actions are unavailable
  - No fake "Fix" buttons that lead nowhere

- **High-level user impact and what "success" looks like:**
  - Every clickable action in Issues list leads to a valid, implemented destination
  - Blocked issues show explicit "Blocked" state with reason tooltip
  - External links (Shopify admin) open in new tab with proper attributes
  - Internal links navigate successfully (no 404s) and preserve returnTo context
  - Row click opens RCP; action controls do not bubble to row click

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase ISSUE-FIX-ROUTE-INTEGRITY-1

- **Related documentation:**
  - docs/testing/CRITICAL_PATH_MAP.md (CP-009: Issue Engine Lite)
  - docs/manual-testing/ISSUES-ENGINE-REMOUNT-1.md

---

## Preconditions

- **Environment requirements:**
  - [ ] Development server running (`npm run dev` or similar)
  - [ ] Backend API running with valid project and issues data
  - [ ] At least one project with detected issues (actionable, blocked, informational)

- **Test accounts and sample data:**
  - [ ] Test user account with access to at least one project
  - [ ] Project with mixed issue types:
    - AI-fixable issues (missing SEO title/description)
    - Manual fix issues (product workspace routing)
    - Diagnostic issues (review-only)
    - Blocked issues (not actionable in context)
    - Informational issues (outside control)
    - Issues with affected products (for View affected routing)
    - Issues with Shopify admin URLs (for external Open)

- **Required user roles or subscriptions:**
  - [ ] Any plan with issues access (Free tier sufficient for route integrity testing)

---

## Test Scenarios (Happy Path)

### Scenario 1: Actionable Issue Shows Fix CTA (AI Preview)

**ID:** HP-001

**Preconditions:**

- Project has AI-fixable issues (e.g., missing SEO title)

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Locate an actionable issue with AI fix
3. Observe the Actions column
4. Click the "Fix now" button

**Expected Results:**

- **UI:** "Fix now" button present with `data-testid="issue-fix-next-button"`
- **UI:** Button shows primary styling (blue background)
- **UI:** Click opens inline preview panel (does NOT open RCP)
- **API:** Preview panel loads AI-generated fix
- **No 404:** Navigation does not occur (preview opens inline)

---

### Scenario 2: Actionable Issue Shows Fix CTA (Direct Navigation)

**ID:** HP-002

**Preconditions:**

- Project has manual fix issues (product workspace routing)

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Locate an actionable issue with manual fix
3. Observe the Actions column
4. Click the "Fix now" link

**Expected Results:**

- **UI:** "Fix now" link present with `data-testid="issue-fix-button"` (note: nested `data-testid="issue-card-cta"` span exists for backward compatibility)
- **UI:** Link shows muted styling (gray background)
- **UI:** Click navigates to product workspace
- **No 404:** Destination page loads successfully
- **Context:** `returnTo` param preserved in URL (for back navigation)

---

### Scenario 3: View Affected CTA Routes to Products List

**ID:** HP-003

**Preconditions:**

- Project has issues with affected products but no direct fix route

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Locate an issue with "View affected" CTA
3. Click the "View affected" link
4. Observe destination URL

**Expected Results:**

- **UI:** "Review" link present with `data-testid="issue-view-affected-button"` (note: nested `data-testid="issue-card-cta"` span exists for backward compatibility; title attribute shows "View affected")
- **UI:** Click navigates to `/projects/{projectId}/products?issueType={issueType}`
- **No 404:** Products list loads successfully filtered by issueType
- **Context:** `returnTo` param preserved for back navigation

---

### Scenario 4: External Open CTA (Shopify Admin)

**ID:** HP-004

**Preconditions:**

- Project has issues with Shopify admin URL available

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Locate an issue with "Open" CTA (external)
3. Observe link attributes
4. Click the "Open" link

**Expected Results:**

- **UI:** "Open" link present with `data-testid="issue-open-button"`
- **UI:** External link icon visible
- **UI:** Link has `target="_blank"` and `rel="noopener noreferrer"` attributes
- **Behavior:** Click opens Shopify admin in new tab
- **Security:** Opener reference not available (noopener enforced)

---

### Scenario 5: Internal Open CTA (Product Workspace)

**ID:** HP-005

**Preconditions:**

- Project has issues with primaryProductId but no Shopify admin URL

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Locate an issue with "Open" CTA (internal)
3. Click the "Open" link

**Expected Results:**

- **UI:** "Open" link present with `data-testid="issue-open-button"`
- **UI:** No external link icon
- **UI:** Click navigates to `/projects/{projectId}/products/{productId}`
- **No 404:** Product workspace loads successfully
- **Context:** `returnTo` param preserved

---

### Scenario 6: Blocked Issue Shows Explicit Blocked State

**ID:** HP-006

**Preconditions:**

- Project has blocked issues (not actionable in context)

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Locate a blocked issue in the "Blocked" section
3. Observe the Actions column
4. Hover over the "Blocked" chip

**Expected Results:**

- **UI:** "Blocked" chip present with `data-testid="issue-blocked-chip"`
- **UI:** Chip shows muted styling (gray background, non-clickable)
- **UI:** No "Fix" or "View affected" CTAs present
- **UI:** Hover shows tooltip with reason: "Not actionable in this context"

---

### Scenario 7: Informational Issue Shows Explicit Blocked State

**ID:** HP-007

**Preconditions:**

- Project has informational issues (outside control)

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Locate an informational issue in the "Informational" section
3. Observe the Actions column
4. Hover over the "Blocked" chip

**Expected Results:**

- **UI:** "Blocked" chip present with `data-testid="issue-blocked-chip"`
- **UI:** No "Fix" CTAs present
- **UI:** Hover shows tooltip with reason: "Outside EngineO.ai control"

---

### Scenario 8: Row Click Opens RCP (Not Actions)

**ID:** HP-008

**Preconditions:**

- Project has at least one issue

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on a row (outside any action buttons)
3. Observe RCP opens
4. Click on an action button within another row
5. Observe action executes (not RCP)

**Expected Results:**

- **UI:** Row click opens RCP with issue details (verify via `data-testid="right-context-panel"`)
- **UI:** Action button click does NOT open RCP (RCP remains closed)
- **UI:** RCP can be closed via `data-testid="right-context-panel-close"` button
- **Behavior:** Action buttons have `data-no-row-click` attribute
- **Behavior:** Action clicks do not trigger row click (implementation uses data-no-row-click + table click-guard)

---

### Scenario 9: Diagnostic Issue Shows Review CTA

**ID:** HP-009

**Preconditions:**

- Project has diagnostic issues (review-only)

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Locate a diagnostic issue
3. Observe the Actions column
4. Click the "Review" link

**Expected Results:**

- **UI:** "Review" link present (not "Fix now")
- **UI:** Link navigates to diagnostic destination
- **No 404:** Destination page loads successfully
- **Context:** `returnTo` param preserved

---

## Edge Cases

### EC-001: Issue Missing Fix Destination (Mapping Gap)

**Description:** Actionable issue has no valid fix destination

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Open browser console
3. Locate an actionable issue with no fix route implemented
4. Observe console warnings

**Expected Behavior:**

- **UI:** "Blocked" chip displayed
- **UI:** Tooltip shows: "Fix destination not available in current UI"
- **Console:** Warning logged (dev mode only): "Mapping gap for issue {issueId}"
- **No crash:** Page remains functional

---

### EC-002: Invalid returnTo Parameter

**Description:** returnTo parameter is malformed or missing

**Steps:**

1. Manually navigate to `/projects/{projectId}/products?returnTo=invalid`
2. Navigate back using returnTo link

**Expected Behavior:**

- **Fallback:** returnTo handled gracefully (fallback to issues list)
- **No crash:** No JavaScript errors

---

## Error Handling

### ERR-001: Navigation to Non-Existent Product

**Scenario:** Issue references productId that doesn't exist

**Steps:**

1. Simulate issue with invalid primaryProductId
2. Click "Open" action

**Expected Behavior:**

- **Fallback:** 404 page displayed (Next.js default)
- **No crash:** Application remains functional

---

## Limits

### LIM-001: N/A

This feature does not have entitlement/quota limits.

---

## Regression

### Areas potentially impacted:

- [ ] **Issues Engine filters:** Pillar, severity, mode filters still work correctly
- [ ] **Preview/Draft/Apply flow:** AI-fix-now expansion rows still function
- [ ] **RCP system:** Row click still opens RCP (action clicks do not)
- [ ] **Deep-links:** URL params still work for panel restoration

### Quick sanity checks:

- [ ] AI preview flow still works (inline expansion)
- [ ] Guarded navigation still prompts for unsaved changes
- [ ] Blocked issues section renders correctly
- [ ] Informational issues section renders correctly
- [ ] Existing Playwright tests pass

---

## Known Destinations

### Fix Routes (Internal)

- **AI fix (inline preview):** Opens inline expansion panel within Issues page
- **AI fix (direct):** `/projects/{projectId}/products/{productId}?from=issues_engine&returnTo=...`
- **Manual fix:** `/projects/{projectId}/products/{productId}?from=issues_engine&returnTo=...`
- **Sync fix:** `/projects/{projectId}/products?action=sync`
- **Diagnostic:** `/projects/{projectId}/products/{productId}?from=issues_engine&returnTo=...`

### View Affected Routes (Internal)

- **Products list filtered:** `/projects/{projectId}/products?from=issues_engine&returnTo=...&issueType={issueType}`

### Open Routes

- **Internal (product workspace):** `/projects/{projectId}/products/{productId}?from=issues_engine&returnTo=...`
- **External (Shopify admin):** `{issue.shopifyAdminUrl}` (target="_blank", rel="noopener noreferrer")

---

## Post-Conditions

### Data cleanup steps:

- [ ] No data modifications made (read-only testing)

### Follow-up verification:

- [ ] Verify no console errors in production build
- [ ] Verify no "mapping gap" warnings in production

---

## Known Issues

- **Intentionally accepted issues:**
  - N/A

- **Out-of-scope items:**
  - Bulk actions (not in scope for this patch)
  - Mobile responsive testing (not in scope)

- **TODOs:**
  - [ ] Run full Playwright test suite after merge

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
