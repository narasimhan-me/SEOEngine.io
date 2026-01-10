# ZERO-AFFECTED-SUPPRESSION-1: Zero-Eligible Action Surface Suppression Manual Testing Guide

> Canonical structure: MANUAL_TESTING_TEMPLATE.md

## Overview

- **Purpose of the feature/patch:**
  Prevent dead-end "action" affordances when the system has 0 eligible items, by suppressing Work Queue automation tiles and replacing Playbooks apply flows with a calm empty state.
- **High-level user impact and what "success" looks like:**
  Users never see primary action CTAs for 0-eligible automation/playbook actions.
  Users never enter Preview → Estimate → Apply flows when nothing can be applied.
  Copy is consistent and calm: "No eligible items right now".
- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase ZERO-AFFECTED-SUPPRESSION-1
- **Related documentation:**
  - CRITICAL_PATH_MAP.md (CP-008, CP-012)
  - MANUAL_TESTING_TEMPLATE.md
---

## Preconditions

- **Environment requirements:**
  - Local dev environment running (web + API)
  - E2E mode available for seed endpoints (optional for fast verification)
- **Test accounts and sample data:**
  - Project with 0 eligible products for Playbooks (all products have SEO title/description)
  - (Optional) A stale Automation Playbook draft exists in DB from a prior run
- **Required user roles or subscriptions:**
  - Pro/Business plan (Playbooks eligible)
  - OWNER role recommended for full surface visibility
---

## Test Scenarios (Happy Path)

### Scenario 1: Work Queue suppresses 0-eligible automation tiles

**ID:** HP-001

**Preconditions:**
- A project exists where Playbooks eligibility is 0, and a prior draft may exist.

**Steps:**
1. Navigate to /projects/{projectId}/work-queue.
2. Check Needs Attention tab.
3. Check Drafts Ready tab.
4. Check Pending Approval tab.

**Expected Results:**
- No automation/playbook bundle appears as an actionable tile when eligible count is 0.
- No primary CTAs appear for the suppressed item (no "Generate…", "Apply…", "Request approval", etc.).

---

### Scenario 2: Playbooks shows empty state at 0 eligible

**ID:** HP-002

**Preconditions:**
- Project has 0 eligible products for the selected playbook (e.g., missing SEO title/description playbooks).

**Steps:**
1. Navigate to /projects/{projectId}/automation/playbooks?playbookId=missing_seo_title.
2. Verify the page loads without errors.

**Expected Results:**
- Empty state title is shown: "No eligible items right now".
- Empty state copy includes: "No eligible items right now".
- Preview/Estimate/Apply stepper is not shown.
- "Continue to Apply" and "Apply playbook" CTAs are not shown.
- Primary CTA exists: "View products that need optimization".
- Secondary CTA (if present) is accurate (e.g., "Sync from Shopify" triggers a sync).

---

## Edge Cases

### EC-001: Viewer role

**Description:** Viewer opens Playbooks at 0 eligible.

**Steps:**
1. Log in as VIEWER.
2. Navigate to the playbook URL with 0 eligible.

**Expected Behavior:**
- Same empty state shown.
- No apply/draft generation CTAs appear.

---

### EC-002: Applied Recently still shows meaningful "View Results"

**Description:** An automation was applied recently, but eligibility is now 0.

**Steps:**
1. Navigate to /projects/{projectId}/work-queue?tab=AppliedRecently.
2. Locate any applied automation bundles.

**Expected Behavior:**
- "View Results" remains available for applied bundles.
- No "Apply" / "Generate" CTAs appear when eligibility is 0.

---

## Error Handling

### ERR-001: Shopify sync failure from empty state

**Scenario:** Sync action fails (network/API error).

**Steps:**
1. From the 0-eligible empty state, click "Sync from Shopify".

**Expected Behavior:**
- Error shown via existing UI feedback pattern.
- User remains on the Playbooks page; no apply semantics appear.

---

### ERR-002: Validation Errors

**Scenario:** N/A

**Steps:**
1. N/A

**Expected Behavior:**
- N/A

---

### ERR-003: Permission Failures

**Scenario:** VIEWER/unauthorized user attempts to access apply semantics (should not be possible at 0 eligible).

**Steps:**
1. Log in as VIEWER.
2. Navigate to the Playbooks page for a 0-eligible playbook.

**Expected Behavior:**
- No apply/draft generation CTAs appear.
- UI remains calm and informational.

---

## Limits

### LIM-001: N/A

**Scenario:** N/A (trust hardening only; no new limits introduced).

**Steps:**
1. N/A

**Expected Behavior:**
- N/A

---

### LIM-002: N/A

**Scenario:** N/A

**Steps:**
1. N/A

**Expected Behavior:**
- N/A

---

## Regression

### Areas potentially impacted:

- [ ] Work Queue: Other bundle types still render and route correctly.
- [ ] Playbooks: Eligible flows still show stepper and allow Preview → Estimate → Apply.
- [ ] AUTO-PB-1.1: Results UI still works when apply completes.

### Quick sanity checks:

- [ ] Run an eligible playbook (non-zero affected) and confirm Step 1/2/3 flow is unchanged.
- [ ] Verify Work Queue issue-derived bundles (ASSET_OPTIMIZATION) still show detected/actionable semantics correctly.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test records (projects, products, users) if created locally

### Follow-up verification:

- [ ] Confirm no dead-end CTAs are reachable from Work Queue for 0-eligible automation actions

---

## Known Issues

- **Intentionally accepted issues:**
  - N/A
- **Out-of-scope items:**
  - No new Work Queue sections added (History/Informational).
  - No changes to detection logic or playbook eligibility computation.
- **TODOs:**
  - N/A
