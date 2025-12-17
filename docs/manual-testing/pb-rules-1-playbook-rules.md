# PB-RULES-1 – Playbook Rules v1 (Batch-Level Controls)

Author: Narasimhan Mahendrakumar
Phase: PB-RULES-1 – Playbook Rules (Find/Replace + Prefix/Suffix + Length Guardrails + Forbidden Phrases)
Status: Design implemented on frontend; backend draft persistence/rulesHash validation to follow AUTO-PB-1.3.

## Overview

PB-RULES-1 introduces batch-level "Playbook rules" that shape AI drafts for Automation Playbooks, while preserving the Preview → Estimate → Apply trust contract.

Rules are:

- Explicit – visible in the wizard, not hidden config.
- Scoped – applied per playbook run, not global.
- Safe – they never apply silently to Shopify; Apply is still an explicit step.

This manual test focuses on:

- Rules editing and visibility.
- Preview regeneration when rules change.
- Estimate & Apply messaging about rules.
- Stale preview guardrails (Continue disabled when rules and preview are out of sync).

> Note: Full backend rule persistence and rulesHash enforcement (no extra AI at Apply, 409 on rules changes) will be verified once AUTO-PB-1.3 Preview Drafts are live. This doc concentrates on the web UX behavior introduced in PB-RULES-1.

---

## Pre-requisites

- User on a plan that can use Automation Playbooks (Pro/Business).
- Project with:
  - Connected store.
  - Products missing SEO titles and/or descriptions.

Paths used:

- Playbooks: /projects/{projectId}/automation/playbooks

Playbooks covered:

- missing_seo_title
- missing_seo_description

---

## 1. Rules Panel Visibility & Defaults (Step 1)

Goal: The Playbook rules panel is visible, compact, and off by default until the user edits rules.

Steps:

1. Navigate to /projects/{id}/automation/playbooks.
2. Select the "Fix missing SEO titles" playbook (if not already selected).

Expected:

- Step 1 ("Preview changes") shows a "Playbook rules" panel above the preview samples.
- Panel contents:
  - Toggle label: "Use rules for this run".
  - Inputs:
    - Find
    - Replace
    - Prefix
    - Suffix
    - Max length
    - Forbidden phrases (textarea – one per line).
  - Helper copy explains:
    - "Rules shape the AI drafts you preview and apply."
    - "Rules do not change Shopify until you Apply."
- Initial state:
  - Use rules for this run toggle is OFF.
  - All inputs are empty.
  - No rule warnings are shown in preview (until rules exist and preview has run).

---

## 2. Editing Rules Auto-Enables the Toggle

Goal: Editing any rule field automatically turns on "Use rules for this run".

Steps:

1. With the rules toggle OFF, type a value into any rule field. For example:
   - Find: AI
2. Click elsewhere (blur the input).

Expected:

- The "Use rules for this run" toggle flips to ON.
- RulesVersion (internal) increments (visible indirectly via preview stale behavior; no UI counter).
- No preview changes yet until you click "Generate preview".

---

## 3. Rules Applied to Preview – Find/Replace + Prefix/Suffix + Max Length

Goal: Preview output clearly reflects the configured rules.

Setup:

1. In the Playbook rules panel:
   - Toggle ON (or rely on auto-enable from editing).
   - Set:
     - Prefix: `EngineO | `
     - Suffix: ` | Official Store`
     - Max length: `60`
2. Optionally, set:
   - Find: AI
   - Replace: EngineO

Steps:

1. Click Generate preview on Step 1.
2. Wait for sample products to appear.

Expected:

- For the selected playbook field (e.g., SEO title):
  - After (AI suggestion) shows values that:
    - Have the configured prefix at the start and suffix at the end (where length allows).
    - Have occurrences of AI replaced with EngineO (case-insensitive, unless caseSensitive is later toggled on).
    - Are trimmed to the configured Max length (60 chars) when necessary.
- If a suggestion was trimmed:
  - The preview card shows:
    - "Rules applied: Trimmed to max length."

---

## 4. Forbidden Phrases – Warning Behavior

Goal: Forbidden phrases are detected and flagged in preview, but not removed in v1.

Setup:

1. In the rules panel:
   - Forbidden phrases:
     ```
     click here
     best ever
     ```
2. Leave existing prefix/suffix/max length rules in place.

Steps:

1. Click Generate preview.
2. Inspect After (AI suggestion) text for each sample product.

Expected:

- If any suggestion contains click here or best ever (case-insensitive):
  - The suggestion text remains unchanged (phrases are not removed).
  - The preview card shows:
    - "Rules applied: Forbidden phrase detected."
- If no suggestion contains a forbidden phrase:
  - No forbidden phrase warning is shown.

---

## 5. Rules Change After Preview – Stale Preview Guardrail

Goal: When rules change after preview, the UI forces a regenerate before moving on to Estimate.

Setup:

1. Generate a preview with some rules configured (as in previous sections).
2. Ensure Step 1 shows sample preview and "Continue to Estimate" is currently enabled.

Steps:

1. Change one of the rule fields, e.g.:
   - Update Max length from 60 to 40.
2. Observe Step 1 area, without regenerating preview.

Expected:

- A yellow warning appears under the preview:
  - "Rules changed — regenerate preview to see updated suggestions."
- A button labeled "Regenerate preview (uses AI)" appears in the warning box.
- "Continue to Estimate" is now disabled.

Steps (regenerate):

1. Click "Regenerate preview (uses AI)".

Expected after regenerate:

- Preview samples refresh.
- Warning box disappears.
- "Continue to Estimate" becomes enabled again (assuming estimate.canProceed is true).

---

## 6. Rules Transparency – Estimate Step

Goal: Step 2 clearly indicates whether rules are in effect without overwhelming detail.

Steps:

1. With rules configured and a fresh preview in place, click Continue to Estimate.
2. On Step 2 ("Estimate impact & tokens"), scroll to the summary text.

Expected:

- A small text line appears in Step 2, e.g.:
  - Rules: Find/Replace, Prefix, Max length
  - The labels reflect which rule types are enabled:
    - Find/Replace
    - Prefix
    - Suffix
    - Max length
    - Forbidden phrases
- If no rules are enabled (rules toggle OFF, all fields empty):
  - The line reads: Rules: None.

---

## 7. Apply Step – Rules Confirmation & Warnings

Goal: Step 3 reminds the user that drafts were generated with rules, and surfaces any preview-level warnings.

Steps:

1. From Step 2, proceed to Step 3 ("Apply playbook").

Expected:

- If rules are enabled:
  - A line under the introductory copy reads:
    - "These drafts were generated using your Playbook rules."
- If any preview sample had rule warnings (trimmed / forbidden phrase detected):
  - A yellow notice appears:
    - "Some suggestions were trimmed or flagged to fit your rules. Review the preview before applying."
- If rules are disabled:
  - No rules-specific copy appears on Step 3.

> Note: In the current implementation, Apply still uses the existing backend path. Full "use stored drafts + rulesHash" behavior will be validated once AUTO-PB-1.3 Preview Drafts are implemented.

---

## 8. Persistence – Rules Across Navigation (Session)

Goal: Rules and their impact survive navigation/reload within the session, consistent with the existing Playbooks state persistence.

Steps:

1. Configure rules and generate a preview.
2. Navigate to Products or Overview using the breadcrumbs, then use browser Back to return to Playbooks.

Expected:

- Selected playbook is preserved.
- Rules panel shows previous values (find, replace, prefix, suffix, max length, forbidden phrases).
- Preview samples and estimate rehydrate from sessionStorage (subject to existing AUTO-PB-1.2 behavior).

Refresh check:

1. Refresh the Playbooks page (F5 / Cmd+R).

Expected:

- Rules panel retains values.
- Playbook wizard state restores as before (preview/estimate/apply) in line with existing session restore behavior.

---

## 9. Contract Checks – PB-RULES-1 UX Layer

For PB-RULES-1 to be considered UX-complete:

- [ ] Rules panel is visible on Step 1 and compact (does not dominate the wizard).
- [ ] Editing any rule field auto-enables "Use rules for this run".
- [ ] Preview output visibly reflects rules (prefix/suffix, find/replace, max length trimming).
- [ ] Forbidden phrases are warned on (preview), not silently removed.
- [ ] Changing rules after preview clearly marks the preview as stale, disables "Continue to Estimate", and requires a regenerate.
- [ ] Step 2 clearly indicates whether rules are active and which types are applied.
- [ ] Step 3 reminds the user that drafts were generated with rules, and surfaces warnings when applicable.
- [ ] Rules and wizard state persist through navigation and reload within a session.

Backend enforcement (rulesHash, drafts, 409 PLAYBOOK_RULES_CHANGED) will be validated in a follow-up once AUTO-PB-1.3 Preview Drafts are live and wired to PB-RULES-1.
