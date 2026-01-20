# ISSUE-TO-FIX-PATH-1 – Manual Testing Guide

> **Trust-Critical UX Hardening for Issue→Fix Path**

---

## Overview

- **Purpose of the feature/patch:**
  - Formalizes the Issue→Fix Path contract ensuring users are NEVER stranded on placeholder pages when clicking issue CTAs
  - Creates a single source of truth for issue routing (`issue-to-fix-path.ts`)
  - Ensures orphan issues (no deterministic fix destination) are marked as informational, not actionable
  - Provides context banners when navigating from issues to fix surfaces

- **High-level user impact and what "success" looks like:**
  - Clicking any issue CTA lands on a visible fix surface with context banner
  - Issue counts reflect ONLY actionable issues (not orphans)
  - Orphan issues display "Informational — no action required" badge
  - No internal IDs leaked in issue titles/descriptions

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - ISSUE-TO-FIX-PATH-1 (Trust-Critical UX Hardening)

- **Related documentation:**
  - `apps/web/src/lib/issue-to-fix-path.ts` - Single source of truth
  - `apps/web/src/lib/issue-ui-config.ts` - Issue UI configuration (FIXUP-1: moved from component)

---

## FIXUP-1 Updates (Circular Import + Orphan/Dead-End Fix)

The following refinements were made in FIXUP-1:

1. **ISSUE_UI_CONFIG moved to lib module** (`/lib/issue-ui-config.ts`)
   - Eliminates circular import between `issue-to-fix-path.ts` and `IssuesList.tsx`
   - Re-exported from `IssuesList.tsx` for backward compatibility

2. **Issue-fix mode triggers on `issueId` alone**
   - No longer requires `from=issues` query param
   - Product and Work Queue pages show fix context banner when `issueId` is present

3. **Overview Top blockers shows actionable issues only**
   - Uses `buildIssueFixHref({ projectId, issue, from: 'overview' })` for routing
   - Non-actionable issues excluded from display

4. **DEO page uses actionable issues only**
   - "Top Recommended Actions" and pillar scorecards count actionable issues only
   - Pillar status badges reflect actionable issue severity

5. **Project Issues page counts actionable-only**
   - Severity counts (Critical, Warning, Info) filter by actionable status

6. **`buildIssueFixHref` accepts `from` parameter**
   - Origin context preserved in URL: `from=overview`, `from=deo`, `from=issues`

---

## FIXUP-2 Updates (Trust Hardening: Dead-Click Prevention + ID Leakage)

The following refinements were made in FIXUP-2:

1. **Href-based actionability on Project Issues page**
   - Actionability is now determined by `buildIssueFixHref() !== null` instead of `isIssueActionable()`
   - Single computation pattern: `fixHref` is computed once and reused for both actionability check and navigation
   - Trust invariant: If `fixHref` is truthy, clicking MUST navigate (no dead-ends)

2. **`handleIssueClick(href: string)` accepts pre-validated href**
   - No re-computation inside handler
   - Guaranteed navigation on click

3. **Internal ID leakage prevention**
   - Overview "Top Products to Fix" reasons now use `getSafeIssueTitle(issue)` instead of `issue.title`
   - Performance page issues list uses `getSafeIssueTitle()` and `getSafeIssueDescription()`
   - ContentDeoInsightsPanel and ProductDeoInsightsPanel use safe helpers in fallback
   - Insights page "High-Impact Open Issues" uses `getSafeInsightsIssueTitle()`
   - Issue Resolution page uses `getSafeInsightsIssueTitle()` for both recent and high-impact lists

4. **New helper: `getSafeInsightsIssueTitle()`**
   - Works with insights-style issue data (`{ issueId, title }` format)
   - Same internal-ID detection logic as `getSafeIssueTitle()`
   - Falls back to "Issue detected" if title looks like internal ID

---

## Preconditions

- **Environment requirements:**
  - [ ] Local development server running (`npm run dev`)
  - [ ] Backend API running
  - [ ] Database seeded with test project + issues

- **Test accounts and sample data:**
  - [ ] Test user with project containing DEO issues
  - [ ] Project with products that have issues (metadata, content, etc.)

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user (Free, Pro, or Business)

---

## Test Scenarios (Happy Path)

### Scenario 1: Issue Click-Through Validation (Overview → Product Fix Banner + Highlight)

**ID:** HP-001

**Preconditions:**

- Project has at least one product with actionable DEO issues
- Issues visible on Overview page "Top blockers" section

**Steps:**

1. Navigate to project Overview page (`/projects/{projectId}/overview`)
2. Locate the "Top blockers" or issue summary section
3. Click on an issue link (only actionable issues are shown)

**Expected Results:**

- **UI:**
  - Lands on Product workspace with correct tab selected (Metadata, Answers, Search & Intent, etc.)
  - `data-testid="issue-fix-context-banner"` visible at top of tab content
  - Banner shows "You're here to fix: {Issue title}"
  - "Back to Issues" link present in banner
  - Highlight target (if applicable) scrolled into view
- **URL:** Contains `from=overview&issueId={issueId}&tab={correctTab}` (FIXUP-1: origin preserved)

---

### Scenario 2: Issues Page Behavior (Orphan Suppression + Informational Labeling)

**ID:** HP-002

**Preconditions:**

- Project has both actionable and orphan issues (if possible)

**Steps:**

1. Navigate to project Issues page (`/projects/{projectId}/issues`)
2. Observe issue cards

**Expected Results:**

- **Actionable issues:**
  - Have `data-testid="issue-card-actionable"`
  - Clickable (button role, hover affordance)
  - Display severity badge
  - No "Informational" badge
- **Orphan issues (if present):**
  - Have `data-testid="issue-card-informational"`
  - NOT clickable (no button role, no hover)
  - Display "Informational — no action required" badge
  - Still show severity and description

---

### Scenario 3: Context Routing Validation (issueId Triggers Banner on Product + Work Queue)

**ID:** HP-003

**Preconditions:**

- Project has issues

**Note:** [FIXUP-3] The issue-fix context banner triggers when `issueId` is present in the URL. The `from` parameter is optional and preserves navigation origin context but is NOT required for banner visibility.

**Steps (Product):**

1. Manually navigate to: `/projects/{projectId}/products/{productId}?issueId={validIssueId}&tab=metadata`
2. Observe the page

**Expected Results:**

- **UI:**
  - Issue fix context banner visible (triggered by `issueId` presence)
  - Banner text: "You're here to fix: {Issue title}"
  - "Back to Issues" link present
- **Optional:** Adding `from=issues` or `from=overview` preserves origin context but doesn't affect banner visibility

**Steps (Work Queue):**

1. Manually navigate to: `/projects/{projectId}/work-queue?issueId={issueId}`
2. Observe the page

**Expected Results:**

- **UI:**
  - `data-testid="work-queue-issue-fix-context-banner"` visible (triggered by `issueId` alone)
  - Banner text: "You're here to fix: {Issue title}"
  - "Back to Issues" link present

---

### Scenario 4: Product Issue Count Parity (Badge == Actionable Rows)

**ID:** HP-004

**Preconditions:**

- Product has DEO issues (some actionable, potentially some not)

**Steps:**

1. Navigate to product workspace (`/projects/{projectId}/products/{productId}`)
2. Note the count in the Issues tab badge (`data-testid="product-issues-tab-count"`)
3. Click on the Issues tab
4. Count the actionable issue rows (`data-testid="product-issue-row-actionable"`)

**Expected Results:**

- **UI:** Tab badge count EQUALS number of actionable rows displayed
- **Header:** `data-testid="product-issues-actionable-count"` shows same number

---

### Scenario 5: Tile Actionability Checklist (No Clickable Affordance Without Deterministic Fix)

**ID:** HP-005

**Preconditions:**

- Project Issues page loaded

**Steps:**

1. Navigate to Issues page
2. For each issue card, verify:
   - If `data-testid="issue-card-actionable"`: clicking navigates somewhere
   - If `data-testid="issue-card-informational"`: clicking does nothing

**Expected Results:**

- **Actionable cards:** Navigate to fix destination on click
- **Informational cards:** No navigation, no cursor:pointer, no role="button"

---

## Edge Cases

### EC-001: Issue with No Primary Product

**Description:** Issue exists but has no primaryProductId or affectedProducts

**Steps:**

1. Find or create an issue without product association

**Expected Behavior:**

- Issue appears as informational (no fix path can be determined)
- No crash or error

---

### EC-002: Deep Link with Invalid Issue ID

**Description:** URL contains issueId that doesn't exist in current product's issues

**Steps:**

1. Navigate to: `/projects/{projectId}/products/{productId}?from=issues&issueId=nonexistent`

**Expected Behavior:**

- Page loads without error
- No fix context banner shown (issue not found)
- Product workspace functions normally

---

## Error Handling

### ERR-001: Missing Issue UI Config

**Scenario:** Issue ID not in ISSUE_UI_CONFIG mapping

**Steps:**

1. Backend returns issue with ID not mapped in frontend config

**Expected Behavior:**

- `getSafeIssueTitle` returns fallback "Issue detected"
- `getSafeIssueDescription` returns generic description
- No internal ID exposed to user

---

## Limits

N/A - This feature is about routing, not quotas.

---

## Regression

### Areas potentially impacted:

- [ ] **Issues Page:** Verify existing filter/sort functionality still works
- [ ] **Product Workspace:** Verify tab navigation unaffected
- [ ] **Work Queue:** Verify existing filter context banner still works
- [ ] **ProductIssuesPanel:** Verify issue grouping by pillar still works

### Quick sanity checks:

- [ ] Issues page loads without errors
- [ ] Product workspace Issues tab shows issues
- [ ] Clicking actionable issues navigates correctly
- [ ] Work Queue loads without errors

---

## Post-Conditions

### Data cleanup steps:

- [ ] No persistent changes made by this feature (routing only)

### Follow-up verification:

- [ ] Re-run HP-001 through HP-005 on a second project to confirm consistency

---

## Known Issues

- **Intentionally accepted issues:**
  - External fixes (Shopify admin) return null from buildIssueFixHref and are treated as non-actionable

- **Out-of-scope items:**
  - Work Queue bundle routing (beyond the context banner)
  - Creating new issue fix destinations

- **TODOs:**
  - [ ] Add more issue types to ISSUE_FIX_PATH_MAP as new fix surfaces are implemented

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
