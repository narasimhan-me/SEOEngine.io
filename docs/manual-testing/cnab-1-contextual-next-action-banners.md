# CNAB-1 – Contextual Next-Action Banners

Phase: CNAB-1 – Contextual Next-Action Banners
Status: Implementation complete
Scope: UX-only (banners, copy, and CTA wiring – no backend changes)

## Overview

CNAB-1 introduces contextual "What should I do next?" banners on key DEO surfaces so users always have a clear, safe primary action after completing (or before starting) a flow.
Each banner must:

- Explain what just happened / where the user is.
- Present exactly one primary CTA.
- Make the effect of clicking that CTA obvious and safe.

This manual test verifies banner visibility, copy, CTAs, and state transitions across:

- Automation Playbooks
- Project Overview
- Products list
- Product detail / optimization

---

## Pre-requisites

- User on a plan that can use Automation Playbooks (Pro or Business recommended).
- Project with:
  - Connected store and synced products.
  - Products missing SEO titles and/or descriptions.
  - DEO score computed at least once.

---

## 1. Automation Playbooks – CNAB States

Path: /projects/{projectId}/automation/playbooks

### 1.1 NO_RUN_WITH_ISSUES – Initial state

Goal: When issues exist but no playbook has run yet, show a banner that clearly points to the next action.

Setup:
- Ensure at least one of:
  - Some products missing SEO descriptions.
  - Some products missing SEO titles.
- Do not run any playbook apply in this session.

Steps:
1. Navigate to /projects/{id}/automation/playbooks.
2. Confirm products and issues have loaded (Playbooks cards show non-zero "Affected products").

Expected:
- CNAB banner is visible above the Playbooks tabs with:
  - Headline: "Next step: Fix missing SEO metadata".
  - Body mentions safely generating missing SEO descriptions with a preview-first flow.
  - Exactly one primary CTA button:
    - Label: "Preview missing SEO descriptions".
  - Secondary CTA:
    - Label: "How Automation Playbooks work".
- Clicking the primary CTA:
  - Selects the "Fix missing SEO descriptions" playbook.
  - Triggers preview generation (or moves the wizard to preview-ready for that playbook).
  - Leaves the banner either dismissed or ready to transition based on updated state.

### 1.2 DESCRIPTIONS_DONE_TITLES_REMAIN

Goal: After successfully fixing descriptions, guide the user to titles.

Setup:
- Project with:
  - Some products missing SEO titles.
  - Some products missing SEO descriptions.

Steps:
1. On the Playbooks page, run the missing_seo_description playbook through preview → estimate → apply so that it updates at least one product.
2. Wait for the apply step to complete and the page to refresh its state.

Expected:
- CNAB banner appears with:
  - Headline: "SEO descriptions updated — next, fix titles".
  - Primary CTA: "Preview missing SEO titles".
  - Secondary CTA: "View updated products".
- Clicking the primary CTA:
  - Selects the "Fix missing SEO titles" playbook.
  - Triggers preview for titles (sample products).
  - Prepares Step 1 for titles without re-running descriptions.
- Clicking "View updated products":
  - Navigates to /projects/{id}/products?from=playbook_results.

### 1.3 TITLES_DONE_DESCRIPTIONS_REMAIN

Goal: Mirror of 1.2 when titles are done but descriptions remain.

Setup:
- Project with:
  - Some products missing SEO descriptions.
  - Some products missing SEO titles.

Steps:
1. Run the missing_seo_title playbook through apply with at least one product updated.
2. Return to the Playbooks page after completion.

Expected:
- CNAB banner appears with:
  - Headline: "SEO titles updated — next, fix descriptions".
  - Primary CTA: "Preview missing SEO descriptions".
  - Secondary CTA: "View updated products".
- Primary CTA behavior:
  - Selects the descriptions playbook and prepares/starts preview.

### 1.4 ALL_DONE – Everything resolved

Goal: When both playbooks report 0 affected products, guide users to safe "what now?" actions.

Setup:
- Ensure both playbooks show 0 affected products (either:
  - Run both playbooks successfully, or
  - Manually fix SEO so no products qualify).

Steps:
1. Navigate to Playbooks.

Expected:
- CNAB banner appears with:
  - Headline: "SEO metadata is up to date".
  - Primary CTA: "Sync changes to Shopify".
  - Secondary CTA: "Explore other optimizations".
- Clicking the primary CTA:
  - Triggers Shopify products sync.
  - Shows a success toast when the sync call succeeds.
- After the sync, refreshing the page still shows "all done" without claiming outstanding work.

### 1.5 Dismissal & state transitions

Steps:
1. For any CNAB state, click the X (close) button.

Expected:
- Banner disappears and remains hidden for the current session view.
- If underlying state changes (e.g., more issues appear) and you reload:
  - Banner re-evaluates based on current state.

---

## 2. Project Overview – "Your next DEO win" CNAB

Path: /projects/{projectId}/overview

Setup:
- Project has:
  - Connected source.
  - At least one crawl.
  - DEO score computed.
  - Products missing SEO metadata (titles or descriptions).

Steps:
1. Navigate to Project Overview.

Expected:
- CNAB banner (NextDeoWinCard) near the top with:
  - Headline: "Next DEO win: Fix missing SEO metadata".
  - Primary CTA: "Open Automation Playbooks".
- Primary CTA:
  - Navigates to /projects/{id}/automation/playbooks?source=next_deo_win.

Completion behavior:
- Once all products have SEO metadata:
  - CNAB banner no longer appears (or shows 0 affected products).

---

## 3. Products List – "Some products need optimization" CNAB

Path: /projects/{projectId}/products

Setup:
- Project with at least one product-related DEO issue (issues that reference product IDs).
- At least one crawl has been run.

Steps:
1. Navigate to the Products page.

Expected:
- CNAB banner above the header with:
  - Headline: "Some products need optimization".
  - Body: Shows issue count and links to Automation Playbooks.
  - Link to Automation Playbooks in the body text.

No-conflict behavior:
- If there are no product issues:
  - CNAB banner does not appear.
- If no crawl has been run:
  - Pre-crawl guardrail banner appears instead (not the CNAB optimization banner).

---

## 4. Product Detail / Optimization – "Optimization suggestions available" CNAB

Path: /projects/{projectId}/products/{productId}

Setup:
- Select a product that:
  - Has DEO issues, and/or
  - Has status 'missing-metadata' or 'needs-optimization'.

Steps:
1. Navigate to the product optimization page.

Expected:
- CNAB banner appears near the top of the page with:
  - Headline: "Optimization suggestions available".
  - Body: Explains issue count (if any) or mentions missing/incomplete SEO metadata.
  - Guidance to use AI suggestions below.

Completion behavior:
- After applying SEO changes and the product status changes to 'optimized', refreshing the page may hide the banner when no suggestions/issues remain.

---

## 5. Cross-cutting CNAB Contract Checks

For all CNABs:

- [ ] Exactly one primary CTA per banner, styled as the most prominent action.
- [ ] Secondary CTAs (when present) are clearly secondary, non-destructive, and do not compete visually with the primary action.
- [ ] No CNAB claims "all done" while issues remain on the same surface.
- [ ] CNABs do not contradict the Preview → Estimate → Apply trust contract:
  - No CTA implicitly applies changes without preview/estimate.
  - No CTA suggests bulk changes outside the current, validated scope.

---

## Sign-off

| Tester | Date | Result |
|--------|------|--------|
| | | |
