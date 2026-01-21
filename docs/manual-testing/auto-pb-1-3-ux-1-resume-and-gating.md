# AUTO-PB-1.3-UX.1 – Resume & Gating Manual Testing

Author: Narasimhan Mahendrakumar
Phase: AUTO-PB-1.3-UX.1 – Resume, Explain Gating, and Derived State for Automation Playbooks
Status: Implementation Complete (frontend UX only; backend unchanged)

## Overview

AUTO-PB-1.3-UX.1 tightens the Automation Playbooks wizard so that:

- Step readiness (Preview → Estimate → Apply) is derived from persisted artifacts (preview samples, estimate, plan) instead of a volatile `flowState`.
- Users always see why primary CTAs are disabled and how to fix it, with a single recommended next action.
- Returning to the Playbooks page with a saved preview is a first-class, guided state instead of a confusing "preview visible but blocked" limbo.

This patch is strictly UX/frontend; API behavior and backend semantics from AUTO-PB-1.3 remain unchanged.

## Preconditions

- User on a Pro or Business plan (unless explicitly testing the Free-plan gating).
- Project with connected store and products missing SEO titles/descriptions (to ensure non-empty scope).
- Automation Playbooks page: `/projects/{projectId}/automation/playbooks`.

## TC-1 – Resume with valid preview (button enabled)

Goal: Returning to Playbooks with a saved, still-valid preview should let the user continue without regenerating AI.

**Steps:**

1. Navigate to `/projects/{id}/automation/playbooks`.
2. Select a playbook (e.g., "Fix missing SEO descriptions").
3. Click **Generate preview** and wait for sample cards to appear.
4. Ensure the estimate can proceed (check that Step 2 shows no blocking reasons).
5. Navigate away (e.g., to `/projects/{id}/overview`) and then return to Playbooks using navigation or browser Back.

**Expected:**

- Step 1 shows:
  - A blue "Saved preview found" helper above the rules panel.
  - Body text: "This preview is still valid for the current rules and product set."
- Sample preview cards are visible with the last suggestions.
- The small badge next to "Sample preview (up to 3 products)" shows:
  - ✅ `Preview valid`.
- The **Continue to Estimate** button is enabled.
- Clicking **Continue** in the helper or **Continue to Estimate** moves to Step 2 without regenerating AI.

---

## TC-2 – Rules changed after preview (stale preview guardrail)

Goal: A preview that is out of date with respect to rules clearly blocks progression with an explicit "Regenerate preview (uses AI)" path.

**Steps:**

1. With a fresh preview in place (as in TC-1), change any rule field in the "Playbook rules" panel (e.g., update Prefix or Max length).
2. Do not click Generate/Regenerate yet.

**Expected:**

- Step 1 shows:
  - The "Saved preview found" helper (if resuming) now explaining that rules changed.
  - The badge next to "Sample preview…" reads:
    - ⚠️ `Rules changed — preview out of date`.
- The **Continue to Estimate** button is disabled.
- A yellow "Why you can't continue yet" panel appears above the button listing:
  - "Rules changed since this preview. Regenerate preview to continue safely."
- The panel offers a primary CTA:
  - **Regenerate preview (uses AI)**.
- Clicking **Regenerate preview (uses AI)**:
  - Refreshes preview samples.
  - Clears the warning panel for this blocker.
  - Restores the badge to `Preview valid` (assuming estimate can proceed).
  - Re-enables **Continue to Estimate**.

---

## TC-3 – Preview visible, estimate missing (Estimate required flow)

Goal: When preview exists but estimate is missing (e.g., after session restore or transient error), the UI explicitly asks for a recalculated estimate.

**Steps:**

1. Generate a preview and confirm it is valid.
2. Simulate a missing estimate state, for example by:
   - Clearing estimate via a dev tool or causing the estimate call to fail, then reloading with preview present.
3. Reload or navigate back to Playbooks so that preview samples render but Step 2 has no current estimate.

**Expected:**

- Step 1:
  - Shows "Saved preview found".
  - The badge next to "Sample preview…" reads:
    - ⚠️ `Estimate required to continue`.
- The **Continue to Estimate** button is disabled.
- The "Why you can't continue yet" panel lists:
  - "Estimate needed to continue. Recalculate estimate from your current preview."
- The panel includes a CTA:
  - **Recalculate estimate**.
- Clicking **Recalculate estimate**:
  - Fetches a fresh estimate.
  - If `canProceed` is true, the badge switches to `Preview valid` and **Continue to Estimate** becomes enabled.

---

## TC-4 – Plan not eligible (Free plan gating explained)

Goal: On Free plans, gating is explicit and points toward upgrade, even when preview exists.

**Steps:**

1. Use a user on the Free plan (no active subscription).
2. Navigate to Playbooks and generate a preview for a playbook with affected products.
3. Observe Step 1 after preview completes.

**Expected:**

- The badge next to "Sample preview…" does _not_ show `Preview valid` (plan is not eligible).
- The **Continue to Estimate** button is disabled.
- The "Why you can't continue yet" panel lists:
  - "Your current plan doesn't support Automation Playbooks for bulk fixes."
- The panel provides a CTA:
  - **View plans** (navigates to `/settings/billing`).
- No path in this state allows progression into full bulk Apply; the user must upgrade to proceed.

---

## TC-5 – No affected products and other estimate blockers

Goal: When the estimate itself blocks progression (no scope, daily limits, token cap), the disabled state is explained with existing reason mapping.

**Steps:**

1. Case: No affected products.
   - Ensure all products already have SEO metadata for the chosen playbook.
   - Generate a preview (if any sample is still shown from previous runs, rely on that).
2. Case: AI daily limit reached or token cap exceeded.
   - Use existing tools or dev setup to hit the daily AI limit for product optimization.
   - Generate a new preview and let the estimate recalculate.

**Expected:**

- In both cases, when an estimate exists but `canProceed === false`:
  - The "Why you can't continue yet" panel appears above **Continue to Estimate**.
  - The panel lists messages consistent with Step 2's reasons, e.g.:
    - "No products currently match this playbook's criteria."
    - "Daily AI limit reached for product optimization. Try again tomorrow or upgrade your plan."
    - "Estimated token usage would exceed your remaining capacity for today. Reduce scope or try again tomorrow."
- The badge may still show `Preview valid` (rules-wise), but the panel explains why the run itself is blocked.
- **Continue to Estimate** remains disabled until the underlying blocker is resolved (e.g., new issues appear, a new day begins, or plan changes).

---

## Contract Checks – AUTO-PB-1.3-UX.1 Layer

For AUTO-PB-1.3-UX.1 to be considered complete:

- [ ] Any time Step 1 preview cards are visible, a small badge explains whether the preview is valid, stale, or waiting on an estimate.
- [ ] Returning to Playbooks with a saved preview never leaves the user with a visible preview and a silently disabled **Continue to Estimate** button.
- [ ] The "Why you can't continue yet" panel appears whenever the button is disabled, lists blockers in plain language, and offers a single primary CTA to fix the most important one.
- [ ] All CTAs that trigger AI (e.g., **Regenerate preview (uses AI)**) explicitly carry the "(uses AI)" label.
- [ ] No backend behavior or API contracts change; only frontend state derivation, messaging, and navigation are affected.
