# Phase AUTO-UX-NEXT-1 – Next DEO Win: Automation Playbooks Entry

> Manual testing checklist for the "Next DEO Win" card on the Project Overview page and the corresponding banner on the Automation Playbooks page.

---

## Overview

- **Purpose of the feature/patch:**
  - After users complete the First DEO Win checklist (4 steps), guide them to a high-leverage "next DEO win" by promoting Automation Playbooks v1 (missing SEO titles/descriptions) from the Project Overview page.

- **High-level user impact and what "success" looks like:**
  - Users see a clear, actionable "Next DEO win" card once all First DEO Win steps are complete.
  - The card provides plan-aware messaging and shows affected product counts.
  - Clicking "Open Automation Playbooks" navigates to the Playbooks page with a congratulatory banner.
  - No auto-apply behavior; users maintain full control over preview → estimate → apply workflow.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase Automation-1 – Automation Playbooks v1
  - Phase UX-6 – First DEO Win Checklist
  - Phase AUTO-UX-NEXT-1 – Next DEO Win: Automation Playbooks Entry

- **Related documentation:**
  - docs/manual-testing/phase-shop-ux-cta-1-connect-shopify.md
  - docs/manual-testing/phase-shop-ux-cta-2-deo-score-completion.md

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with Automation Playbooks endpoints available.
  - [ ] Web app (apps/web) running against the same API base URL.
  - [ ] At least one project with products that have missing SEO titles or descriptions.

- **Test accounts and sample data:**
  - [ ] Test user with at least one project that:
    - Has a connected source (e.g., Shopify or website).
    - Has completed at least one crawl.
    - Has a valid DEO Score.
    - Has 3 or more products with applied SEO optimizations (to complete checklist).
    - Has some products with missing SEO titles/descriptions (to show affected counts).

- **Required user roles or subscriptions:**
  - [ ] Free plan account (to test upgrade messaging).
  - [ ] Pro or Business plan account (to test full access messaging).

---

## Test Scenarios (Happy Path)

### Scenario 1: Checklist complete → "Next DEO win" card visible

**ID:** HP-001

**Preconditions:**
- [ ] All 4 First DEO Win steps are complete:
  - Connect your store ✅
  - Run your first crawl ✅
  - Review your DEO Score ✅
  - Optimize 3 key products ✅

**Steps:**
1. Navigate to /projects/[id]/overview for the prepared project.
2. Observe the page layout.

**Expected Results:**
- **UI:**
  - [ ] First DEO Win checklist is NOT visible (all steps complete).
  - [ ] "Next DEO win: Fix missing SEO metadata" card is visible.
  - [ ] Card shows purple/violet styling with lightning bolt icon.
  - [ ] Card shows bullet points about preview, estimates, and safe batches.
- **Content:**
  - [ ] Title: "Next DEO win: Fix missing SEO metadata"
  - [ ] Description mentions using Automation Playbooks for bulk fixes.
  - [ ] "Open Automation Playbooks" button is visible.

---

### Scenario 2: Affected products snippet loads successfully

**ID:** HP-002

**Preconditions:**
- [ ] HP-001 completed; "Next DEO win" card is visible.
- [ ] Project has products with missing SEO titles and/or descriptions.

**Steps:**
1. Observe the "Next DEO win" card content.
2. Wait for the affected products snippet to load.

**Expected Results:**
- **UI:**
  - [ ] While loading: "Checking products for missing SEO..." with spinner.
  - [ ] After loading: Shows counts like "Missing SEO titles: X products • Missing descriptions: Y products"
- **Data:**
  - [ ] Counts match the actual number of products missing SEO metadata.

---

### Scenario 3: Clicking "Open Automation Playbooks"

**ID:** HP-003

**Preconditions:**
- [ ] HP-001 completed; "Next DEO win" card is visible.

**Steps:**
1. Click the "Open Automation Playbooks" button.

**Expected Results:**
- **Navigation:**
  - [ ] Browser navigates to /projects/[id]/automation/playbooks?source=next_deo_win
- **Playbooks Page:**
  - [ ] Banner appears at top: "Nice work on your first DEO win"
  - [ ] Banner includes copy about using Playbooks for bulk fixes.
  - [ ] No auto-selection of playbooks; user must still choose.
  - [ ] No auto-apply; user must explicitly run preview → estimate → apply.

---

### Scenario 4: Dismissing the Next DEO Win banner on Playbooks page

**ID:** HP-004

**Preconditions:**
- [ ] HP-003 completed; on Playbooks page with banner visible.

**Steps:**
1. Click the "X" dismiss button on the purple banner.

**Expected Results:**
- **UI:**
  - [ ] Banner disappears immediately.
  - [ ] Banner does not reappear during the same session (without page reload).
- **Functionality:**
  - [ ] Rest of Playbooks page remains fully functional.

---

## Plan-Aware Messaging

### Scenario 5: Free plan user sees upgrade hint

**ID:** PLAN-001

**Preconditions:**
- [ ] User is on Free plan.
- [ ] All 4 First DEO Win steps are complete.

**Steps:**
1. Navigate to /projects/[id]/overview.
2. Observe the "Next DEO win" card.

**Expected Results:**
- **Messaging:**
  - [ ] Card shows: "Available on Pro and Business plans. You can still preview suggestions before upgrading."
- **CTA:**
  - [ ] "Open Automation Playbooks" button is still clickable (not blocked).
- **Playbooks Page:**
  - [ ] User can navigate to Playbooks and preview suggestions.
  - [ ] Apply is blocked per existing playbook gating (shows upgrade messaging).

---

### Scenario 6: Pro/Business plan user sees full access messaging

**ID:** PLAN-002

**Preconditions:**
- [ ] User is on Pro or Business plan.
- [ ] All 4 First DEO Win steps are complete.

**Steps:**
1. Navigate to /projects/[id]/overview.
2. Observe the "Next DEO win" card.

**Expected Results:**
- **Messaging:**
  - [ ] Card shows: "Your plan supports bulk automations with token-aware safeguards."
- **Playbooks Page:**
  - [ ] User can preview, estimate, and apply playbooks (subject to token limits).

---

## Edge Cases

### EC-001: Affected products estimate fails

**Description:** API call for estimate fails, but card should still be usable.

**Steps:**
1. (Simulate) Block or fail the automation playbook estimate API.
2. Navigate to /projects/[id]/overview with checklist complete.

**Expected Behavior:**
- [ ] Card still renders with fallback message: "We'll scan for missing SEO metadata when you open Playbooks."
- [ ] "Open Automation Playbooks" button remains clickable.
- [ ] No error toast or blocking behavior.

---

### EC-002: No products with missing SEO metadata

**Description:** All products have complete SEO metadata.

**Steps:**
1. Ensure all products in the project have SEO titles and descriptions.
2. Navigate to /projects/[id]/overview with checklist complete.

**Expected Behavior:**
- [ ] Affected products snippet shows: "Missing SEO titles: 0 products • Missing descriptions: 0 products"
- [ ] Card still visible and functional (user may want to review or re-run).

---

### EC-003: Checklist incomplete → Card not visible

**Description:** Card should only appear when all 4 steps are complete.

**Steps:**
1. Use a project where only 3 of 4 checklist steps are complete.
2. Navigate to /projects/[id]/overview.

**Expected Behavior:**
- [ ] First DEO Win checklist IS visible (showing incomplete step).
- [ ] "Next DEO win" card is NOT visible.

---

## Regression

### Areas potentially impacted:

- [ ] First DEO Win checklist visibility logic.
- [ ] Project Overview page layout and data fetching.
- [ ] Automation Playbooks page functionality.
- [ ] Billing/entitlements data flow.

### Quick sanity checks:

- [ ] First DEO Win checklist still appears correctly for users who haven't completed all steps.
- [ ] Automation Playbooks page retains existing Preview → Estimate → Apply behavior.
- [ ] Token limits and plan gating work as before on Playbooks page.
- [ ] DEO Score, issues, and other overview sections render correctly.

---

## Post-Conditions

### Data cleanup steps:

- [ ] None required beyond standard test project cleanup (optional).

### Follow-up verification:

- [ ] Confirm no console errors when loading the overview page.
- [ ] Confirm no console errors when navigating to Playbooks via the card.
- [ ] Verify that dismissing the banner doesn't affect other page state.

---

## Known Issues

- **Intentionally accepted issues:**
  - Affected products counts are fetched on every overview page load; no caching implemented.
  - Banner dismissal state is session-only (reappears on page reload with same source param).

- **Out-of-scope items:**
  - Auto-applying playbooks from the overview card.
  - Persisting banner dismissal state across sessions.
  - Adding more playbook types to the "Next DEO win" flow.

- **TODOs:**
  - [ ] Consider adding analytics events for "Next DEO win card viewed" and "Playbooks opened from card".

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Phase AUTO-UX-NEXT-1 Next DEO Win: Automation Playbooks Entry |
