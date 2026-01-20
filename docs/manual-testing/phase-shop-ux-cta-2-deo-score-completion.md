# Phase SHOP-UX-CTA-2 – DEO Score Step Completion

> Manual testing checklist for marking the "Review your DEO Score" step as complete after closing the DEO Score / issues banner on the Project Overview page.

---

## Overview

- **Purpose of the feature/patch:**
  - Ensure that when a user clicks "View DEO Score" from the First DEO Win checklist, the "Review your DEO Score" step is only marked complete after they close the DEO Score / issues banner (modal), so the checklist reflects real engagement.

- **High-level user impact and what "success" looks like:**
  - Users see their progress increase to 3/4 steps only after they have opened and then closed the DEO Score view.
  - The "Review your DEO Score" step shows its completed state and the progress text updates without requiring a page reload.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase UX-6 – First DEO Win Checklist
  - Phase SHOP-UX-CTA-1 – Connect Shopify CTA Fix
  - Phase SHOP-UX-CTA-2 – DEO Score Step Completion

- **Related documentation:**
  - docs/manual-testing/phase-shop-ux-cta-1-connect-shopify.md
  - docs/manual-testing/phase-shop-ux-cta-1-1-dedup-connect-shopify.md

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with crawl and DEO Score computation enabled.
  - [ ] Web app (apps/web) running against the same API base URL.

- **Test accounts and sample data:**
  - [ ] Test user with at least one project that:
    - Has a connected source (e.g., Shopify or website).
    - Has completed at least one crawl.
    - Has a valid DEO Score.
    - Has fewer than 3 optimized products (so the checklist is still visible).

- **Required user roles or subscriptions:**
  - [ ] Any plan that can run crawls and view DEO Score (Free or higher).

---

## Test Scenarios (Happy Path)

### Scenario 1: Open DEO Score from checklist

**ID:** HP-001

**Preconditions:**

- [ ] Project meets the preconditions above and shows the First DEO Win checklist.
- [ ] "Connect your store" and "Run your first crawl" steps are already completed.

**Steps:**

1. Navigate to /projects/[id]/overview for the prepared project.
2. Locate the First DEO Win checklist.
3. Confirm the "Review your DEO Score" step is currently not marked as completed.
4. Click the "View DEO Score" CTA on that step.

**Expected Results:**

- **UI:**
  - [ ] The page scrolls to the top / DEO Score area.
  - [ ] The DEO Score & issues banner (All Issues modal) opens.
- **Progress:**
  - [ ] The checklist still shows 2 of 4 steps complete while the banner/modal is open.

---

### Scenario 2: Close banner → DEO Score step completes

**ID:** HP-002

**Preconditions:**

- [ ] Continuation of HP-001 with the banner/modal still open.

**Steps:**

1. Close the banner/modal by clicking the "X" close button in the header or clicking on the backdrop.

**Expected Results:**

- **UI:**
  - [ ] The banner/modal closes.
  - [ ] The First DEO Win checklist remains visible.
- **Progress:**
  - [ ] The "Review your DEO Score" step now shows as Completed.
  - [ ] The checklist progress text updates to "3 of 4 steps complete".

---

### Scenario 3: Progress remains correct during the session

**ID:** HP-003

**Preconditions:**

- [ ] HP-002 completed; the DEO Score step is marked complete.

**Steps:**

1. Interact with the page (scroll, open/close other panels such as DEO breakdown or freshness).
2. Optionally re-open and close the issues banner via "View all issues".

**Expected Results:**

- [ ] The "Review your DEO Score" step remains completed.
- [ ] The progress text continues to show 3 of 4 steps complete.

---

## Edge Cases

### EC-001: Closing banner via backdrop vs. close button

**Description:** Ensure both close interactions update the step.

**Steps:**

1. Open the issues banner using "View DEO Score".
2. Close the banner by clicking on the darkened backdrop.
3. Repeat by opening it again and closing via the "X" close icon.

**Expected Behavior:**

- [ ] In both cases, the "Review your DEO Score" step becomes (or remains) completed.
- [ ] Checklist progress reflects 3 of 4 steps complete.

---

### EC-002: Opening issues from "View all issues"

**Description:** Opening the issues banner from the "Top blockers" card should also count as reviewing DEO Score.

**Steps:**

1. With the checklist visible, click "View all issues" in the "Top blockers" card (instead of the checklist CTA).
2. Close the banner using either close method.

**Expected Behavior:**

- [ ] After closing, the "Review your DEO Score" step is marked as completed.
- [ ] Progress shows 3 of 4 steps complete.

---

## Error Handling

### ERR-001: Missing DEO Score data

**Scenario:** Project has no DEO Score yet, but user tries to open the issues banner.

**Steps:**

1. (Setup) Use a project without a DEO Score.
2. Attempt to open the issues banner from either "View DEO Score" or "View all issues".

**Expected Behavior:**

- [ ] UI handles the case gracefully (e.g., shows empty state for issues or score).
- [ ] The checklist only marks "Review your DEO Score" as completed once the banner has actually been opened and closed.

---

## Limits

### LIM-001: Session persistence

**Scenario:** User reloads the page after completing the DEO Score step.

**Steps:**

1. Complete HP-002 so that the DEO Score step is marked complete.
2. Refresh the browser on /projects/[id]/overview.

**Expected Behavior:**

- [ ] Checklist state continues to derive from backend data (integrations, crawls, DEO Score, optimization).
- [ ] It is acceptable if the "Review your DEO Score" step reverts to relying on backend-derived completion rules after a full reload (no new backend persistence is introduced in this phase).

---

## Regression

### Areas potentially impacted:

- [ ] First DEO Win checklist rendering and progress calculation.
- [ ] All Issues banner/modal open/close behavior.
- [ ] "Top blockers" card "View all issues" button.
- [ ] DEO Score card and related sections.

### Quick sanity checks:

- [ ] "Connect your store" and "Run your first crawl" steps still behave and complete as before.
- [ ] "Optimize 3 key products" step is unaffected and completes only after product optimization.
- [ ] Closing the issues banner does not affect unrelated UI (e.g., AEO Status, Answer Blocks, Diagnostics).

---

## Post-Conditions

### Data cleanup steps:

- [ ] None required beyond standard test project cleanup (optional).

### Follow-up verification:

- [ ] Confirm no console errors are thrown when opening/closing the issues banner.
- [ ] Confirm that navigation to other tabs (Products, Issues) from the overview still works as expected.

---

## Known Issues

- **Intentionally accepted issues:**
  - DEO Score review completion is tracked via frontend state only in this phase; deeper analytics remain backend-derived.

- **Out-of-scope items:**
  - Persisting "reviewed" state across sessions in the backend.
  - Redesigning the checklist layout or adding new steps.

- **TODOs:**
  - [ ] Consider adding analytics events for "DEO Score reviewed" in a future phase.

---

## Approval

| Field              | Value                                         |
| ------------------ | --------------------------------------------- |
| **Tester Name**    | [Name]                                        |
| **Date**           | [YYYY-MM-DD]                                  |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed         |
| **Notes**          | Phase SHOP-UX-CTA-2 DEO Score step completion |
