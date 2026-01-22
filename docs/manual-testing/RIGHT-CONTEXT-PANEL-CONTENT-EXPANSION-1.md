# EngineO.ai – RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1 Manual Testing

> **Derived from:** `docs/MANUAL_TESTING_TEMPLATE.md`

---

## Overview

- **Purpose of the feature/patch:**
  - Expand Right Context Panel (RCP) content for asset kinds (product, page, collection) with read-only contextual information including entity summary, issue drilldown, action preview, and AI assist hints.
  - Enforce "header external-link only" rule: no in-body navigation links inside the panel.

- **High-level user impact and what "success" looks like:**
  - Users see enriched, scannable information in the RCP when viewing product/page/collection rows.
  - Issues are grouped by UX category (Metadata, Content, Search Intent, Technical) with severity badges.
  - All navigation happens via the header external-link; no clickable links inside panel body.
  - RCP remains secondary; does not affect canvas behavior.
  - Shopify iframe safe (no overflow, scroll contained).

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1
  - Phase RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 (foundation)

- **Related documentation:**
  - `docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md`
  - `docs/RIGHT_CONTEXT_PANEL_CONTRACT.md`
  - `docs/manual-testing/RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] Development server running (`npm run dev` in apps/web)
  - [ ] API server running with valid test data
  - [ ] At least one project with products containing issues

- **Test accounts and sample data:**
  - [ ] Authenticated user with project access
  - [ ] Project with mixed product health states (Healthy, Needs Attention, Critical)
  - [ ] Products with and without issues

- **Required user roles or subscriptions:**
  - [ ] Any authenticated role (OWNER, EDITOR, VIEWER) can view RCP content

---

## Test Scenarios (Happy Path)

### Scenario 1: Asset Summary Renders for Product

**ID:** HP-001

**Preconditions:**

- User is on Products list page under `/projects/[id]/products`
- At least one product exists

**Steps:**

1. Click the eye icon on a product row to open RCP
2. Observe the Details tab content

**Expected Results:**

- **UI:** Entity Summary section displays:
  - Type: "Product"
  - Status: Shows statusLabel from row (e.g., "Needs attention", "Healthy", "Draft saved")
  - Last synced: Date string or "Not available"
  - Last applied: Date string or "Not available"
- **API:** No additional API calls for summary (uses descriptor metadata)
- **Logs:** N/A

---

### Scenario 2: Issue Drilldown - Loading and Populated State

**ID:** HP-002

**Preconditions:**

- Product has issues associated with it

**Steps:**

1. Open RCP for a product with issues
2. Observe Issue Drilldown section

**Expected Results:**

- **UI:**
  - If in-memory issues provided: renders immediately without loading state
  - If fetching: shows "Loading issues..." then populates
  - Issues grouped by UX category (Metadata, Content, Search Intent, Technical, Other)
  - Each issue shows title, severity badge, and "Why this matters" line
  - Severity badges are readable, neutral (token-only styling), and differentiate by label text (Critical / Needs Attention / Informational) - not by raw color
- **API:** `projectsApi.assetIssues()` called if no in-memory issues
- **Logs:** N/A

---

### Scenario 3: Issue Drilldown - Empty State

**ID:** HP-003

**Preconditions:**

- Product has no issues (Healthy state)

**Steps:**

1. Open RCP for a healthy product with zero issues

**Expected Results:**

- **UI:** Shows "No issues for this item." message
- **API:** N/A if in-memory issues are provided (including empty); otherwise fetch completes with empty issues array
- **Logs:** N/A

---

### Scenario 4: Pillar-to-Category Mapping Correctness

**ID:** HP-004

**Preconditions:**

- Products with issues from different pillars

**Steps:**

1. Open RCP for products with various pillar issues
2. Verify category groupings

**Expected Results:**

- **UI:**
  - `metadata_snippet_quality` → "Metadata" category
  - `search_intent_fit` → "Search Intent" category
  - `technical_indexability` → "Technical" category
  - `content_commerce_signals`, `media_accessibility`, `competitive_positioning`, `offsite_signals`, `local_discovery` → "Content" category
  - Unknown/missing pillarId → "Other" category
- **API:** N/A
- **Logs:** N/A

---

### Scenario 5: "Why this matters" Uses Server-Provided Fields

**ID:** HP-005

**Preconditions:**

- Issues with `whyItMatters` field set
- Issues with only `description` field

**Steps:**

1. Open RCP for products with various issue types
2. Check "Why this matters" line for each issue

**Expected Results:**

- **UI:**
  - If issue has `whyItMatters`: displays that value
  - If no `whyItMatters`: displays truncated `description` (1-line clamp)
  - Never shows fabricated/invented copy
- **API:** N/A
- **Logs:** N/A

---

### Scenario 6: Action Preview Shows Only When Metadata Present

**ID:** HP-006

**Preconditions:**

- Product with resolved actions (primaryActionLabel/secondaryActionLabel set)
- Product without resolved actions

**Steps:**

1. Open RCP for product with action labels
2. Open RCP for product without action labels

**Expected Results:**

- **UI:**
  - With action labels: Action Preview section visible showing "Primary action" and/or "Secondary action" as text (NOT buttons/links)
  - Without action labels: Action Preview section not rendered (no clutter)
  - "Fields affected", "Estimated impact", "Reversibility" only shown when explicitly provided in metadata
- **API:** N/A
- **Logs:** N/A

---

### Scenario 7: AI Assist Hints Collapsible and Non-Intrusive

**ID:** HP-007

**Preconditions:**

- Product with issues

**Steps:**

1. Open RCP for product with issues
2. Locate AI Assist Hints section

**Expected Results:**

- **UI:**
  - Section is collapsed by default (uses native `<details>` element)
  - Summary shows "AI Assistance"
  - Expanded content shows non-prescriptive copy: "AI assistance may be available in the main workspace for draft generation."
  - If issues exist: shows issue count
  - No chat UI, no links, no auto-generation triggers
- **API:** N/A
- **Logs:** N/A

---

### Scenario 8: Shopify Embedded Iframe Check

**ID:** HP-008

**Preconditions:**

- EngineO running in Shopify Admin iframe (or simulated with `embedded=1` param)

**Steps:**

1. Open RCP in Shopify embedded context
2. Scroll within RCP content

**Expected Results:**

- **UI:**
  - No overflow outside panel boundaries
  - Scroll contained within RCP
  - Panel does not break iframe layout
- **API:** N/A
- **Logs:** N/A

---

### Scenario 9: No In-Body Navigation Links

**ID:** HP-009

**Preconditions:**

- Any RCP view (Details, Recommendations, History, Help)

**Steps:**

1. Open RCP for any product/user/work_item
2. Inspect all views (Details, Recommendations, History, Help tabs)

**Expected Results:**

- **UI:**
  - Header external-link (openHref) is the ONLY navigation affordance
  - NO "Open full page" links inside panel body
  - Help view shows "Visit the Help Center for general documentation." as plain text (no link)
  - No clickable links anywhere in panel body
- **API:** N/A
- **Logs:** N/A

---

### Scenario 10: RCP Remains Secondary - No Canvas Behavior Changes

**ID:** HP-010

**Preconditions:**

- Products list page

**Steps:**

1. Interact with product rows (click, expand, navigate)
2. Open/close RCP
3. Verify main canvas functionality unaffected

**Expected Results:**

- **UI:**
  - Row click expands/collapses row detail (unchanged)
  - Row actions (Fix next, View issues, etc.) work as before
  - RCP open/close does not affect canvas scrolling or selection
  - Table filters and sorting work normally
- **API:** N/A
- **Logs:** N/A

---

## Edge Cases

### EC-001: Descriptor Changes Mid-Flight

**Description:** User rapidly switches between products while issues are loading

**Steps:**

1. Open RCP for Product A (with slow network)
2. Before issues load, open RCP for Product B
3. Wait for responses

**Expected Behavior:**

- Product A's issues are discarded (stale response)
- Product B's issues are displayed
- No stale data mismatch

---

### EC-002: Project Context Mismatch

**Description:** RCP opened with descriptor from different project

**Steps:**

1. Open RCP for a product
2. Navigate to a different project (without closing RCP)

**Expected Behavior:**

- Shows "Unavailable in this project context." message
- No stale data from previous project

---

### EC-003: Empty Metadata Fields

**Description:** Product with minimal/missing metadata

**Steps:**

1. Open RCP for product with no SEO title, no description, no issues

**Expected Behavior:**

- Entity Summary shows "Not available" for missing timestamps
- Issue Drilldown shows "No issues for this item."
- Action Preview section not rendered
- AI Assist Hints not rendered (no issues AND no action preview)

---

## Error Handling

### ERR-001: Issues API Failure

**Scenario:** Asset issues API returns error

**Steps:**

1. Simulate API error for assetIssues endpoint
2. Open RCP for a product

**Expected Behavior:**

- Issue Drilldown shows error message (red text)
- Other sections (Summary, Action Preview) render normally
- Panel remains usable

---

## Limits

### LIM-001: Large Number of Issues

**Scenario:** Product with many issues (50+)

**Steps:**

1. Open RCP for product with many issues

**Expected Behavior:**

- All issues render in scrollable container
- Panel scroll contained within boundaries
- No performance degradation

---

## Regression

### Areas potentially impacted:

- [ ] **Products list:** Row expansion, actions, filters unchanged
- [ ] **RCP header:** External-link still works
- [ ] **Other RCP kinds (user, work_item):** Still render correctly
- [ ] **Admin users page:** RCP still works for user descriptors

### Quick sanity checks:

- [ ] Products list loads and displays correctly
- [ ] Row click expands product details
- [ ] Eye icon opens RCP
- [ ] RCP close button works
- [ ] ESC key closes RCP (when not in input)
- [ ] Help tab shows stub content (no link)

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup required (read-only feature)

### Follow-up verification:

- [ ] Verify no console errors during testing

---

## Known Issues

- **Intentionally accepted issues:**
  - AI Assist Hints copy is non-prescriptive placeholder

- **Out-of-scope items:**
  - Page/Collection RCP integration (separate scope)
  - Editing/actions inside panel (read-only only)
  - Real AI chat integration

- **TODOs:**
  - [ ] None at this time

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
