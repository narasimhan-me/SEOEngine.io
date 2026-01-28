# EA Tickets in Done State and Their Linked KAN Tickets

*Generated from Jira. Comments are not fetched by the current read script.*

---

## EA-11 — Done
**Title:** ISSUE-FIX-ROUTE-INTEGRITY-1: Make the kind of fix (AI preview, direct/manual fix, guidance-only, blocked) explicit at the point of decision on the Issues page, so users understand what will happen before they click.

**Type:** Idea | **Priority:** High | **Labels:** fix-clarity, frontend-only, issues-engine, no-backend, trust  
**URL:** https://engineo-ai.atlassian.net/browse/EA-11

**Description:** Epic for fix-kind clarity: canonical fix kinds (AI Preview Fix, Direct Fix, Guidance Only, Blocked), frontend-only, copy/labels/tooltips, acceptance criteria, out of scope (no backend, no new routes, no AI execution changes).

**Linked KAN:** None found by [EA-11] in KAN titles (older format).

**Comments:** Not fetched.

---

## EA-13 — Done
**Title:** ISSUE-FIX-KIND-CLARITY-1: Diagnostic vs Fixable Issue CTA Semantics

**Type:** Idea | **Priority:** High | **Labels:** fix-clarity, issues-engine, trust, ui-clarity  
**URL:** https://engineo-ai.atlassian.net/browse/EA-13

**Description:** Overview of fix-kind clarity: distinguish DIAGNOSTIC vs EDIT/AI issues, Review CTA for diagnostic, IssueFixKind type, issueFixActionKind.ts with 4 kinds, Issues page CTA updates, dev-time guardrails. Status: Complete (2026-01-25 FIXUP-3).

**Linked KAN:** None found by [EA-13] in KAN titles.

**Comments:** Not fetched.

---

## EA-14 — Done
**Title:** DRAFT-LIFECYCLE-VISIBILITY-1: Make the draft lifecycle explicit and unmistakable everywhere it appears, so users always know whether a draft exists, is saved, has been applied, and what will happen next.

**Type:** Idea | **Priority:** Medium | **Labels:** draft-lifecycle, frontend-only, issues-engine, no-backend, trust  
**URL:** https://engineo-ai.atlassian.net/browse/EA-14

**Description:** Hard constraints (no backend/schema/AI/bulk/silent auto-apply). Core trust goal: explicit draft lifecycle. Canonical states: NO_DRAFT, GENERATED_UNSAVED, SAVED_NOT_APPLIED, APPLIED. Implementation patches: centralize draft state helper, Issues row indicator, inline preview gating, RCP echo, manual testing doc, regression guardrails.

**Linked KAN:** None found by [EA-14] in KAN titles.

**Comments:** Not fetched.

---

## EA-15 — Done
**Title:** ISSUE-ACTION-DESTINATION-GAPS-1: Known destination gaps that should be addressed to expand fix/open coverage safely.

**Type:** Idea | **Priority:** Medium  
**URL:** https://engineo-ai.atlassian.net/browse/EA-15

**Description:** Tracks known destination gaps (e.g. missing Shopify admin URLs, unsupported asset types) for future expansion; no fake Open/Fix buttons.

**Linked KAN:** None found by [EA-15] in KAN titles.

**Comments:** Not fetched.

---

## EA-18 — Done
**Title:** APPLY-ACTION-GOVERNANCE-1: Harden the "Apply" experience with explicit governance signals across the Issues inline preview flow and shared apply UI, without changing backend behavior.

**Type:** Idea | **Priority:** Medium  
**URL:** https://engineo-ai.atlassian.net/browse/EA-18

**Description:** Apply governance states (CAN_APPLY, CANNOT_APPLY_PERMISSIONS, CANNOT_APPLY_SHOPIFY_SCOPES, CANNOT_APPLY_DRAFT_NOT_SAVED, APPLY_IN_PROGRESS, APPLIED_CONFIRMED). Patches: applyGovernance.ts, Apply button + inline explanation, RCP echo, manual testing doc, regression guardrails.

**Linked KAN:**
- **KAN-13** (Epic, Done): [EA-18] APPLY-ACTION-GOVERNANCE-1 — Full epic with Business Intent, Acceptance Criteria, Scope, UX expectations.
- **KAN-14** (Story, Done): Implement: [EA-18] APPLY-ACTION-GOVERNANCE-1 — Parent KAN-13; PATCH BATCH and verification checklist.

**Comments:** Not fetched.

---

## EA-19 — Done
**Title:** EPIC 13 — ISSUE-FIX-ROUTE-INTEGRITY-1

**Type:** Idea | **Priority:** Medium  
**URL:** https://engineo-ai.atlassian.net/browse/EA-19

**Description:** Ensure every Fix/Open/View action is reachable, truthful, non-deceptive. Problem: dead routes, missing pages, no-op. Goal: complete action or explicit “why not.” In scope: audit CTAs, remove/block invalid actions, blocked states + explanation. Out of scope: new fix logic, new backend, auto-fix. Trust: UI must never lie by implication.

**Linked KAN:**
- **KAN-18** (Epic, Done): [EA-19] EPIC 13 — ISSUE-FIX-ROUTE-INTEGRITY-1 — Business Intent, Goals, Acceptance Criteria, Scope, UX expectations.
- **KAN-20** (Story, Done): Implement: [EA-19] EPIC 13 — ISSUE-FIX-ROUTE-INTEGRITY-1 — Parent KAN-18; PATCH BATCH (docs + acceptance criteria comments).

**Comments:** Not fetched.

---

## EA-20 — Done
**Title:** EPIC 14 — ISSUE-FIX-KIND-CLARITY-1

**Type:** Idea | **Priority:** Medium  
**URL:** https://engineo-ai.atlassian.net/browse/EA-20

**Description:** Clarify what type of fix is offered before action. Problem: users can’t distinguish AI vs rule-based vs template vs guidance. Goal: understand fix type and what happens next. In scope: fix-type labeling, copy, consistency Issue rows + RCP. Out of scope: changing behavior, new fix types. Trust: users must know what they’re agreeing to.

**Linked KAN:**
- **KAN-21** (Epic, Done): [EA-20] EPIC 14 — ISSUE-FIX-KIND-CLARITY-1 — Business Intent, Goals, Acceptance Criteria, Scope, UX expectations.
- **KAN-25** (Story, Done): Implement: [EA-20] EPIC 14 — ISSUE-FIX-KIND-CLARITY-1 — Parent KAN-21; PATCH BATCH stored in reports.

**Comments:** Not fetched.

---

## EA-21 — Done
**Title:** EPIC 15 — DRAFT-LIFECYCLE-VISIBILITY-1

**Type:** Idea | **Priority:** Medium  
**URL:** https://engineo-ai.atlassian.net/browse/EA-21

**Description:** Make draft lifecycle explicit, visible, predictable. Problem: draft state implicit/inferred. Goal: users know if draft exists, saved, pending, applied. In scope: visual indicators, copy, consistency Issues + RCP. Out of scope: backend draft storage, auto-save. Trust: users must never wonder “did my change save?”

**Linked KAN:**
- **KAN-27** (Epic, Done): [EA-21] EPIC 15 — DRAFT-LIFECYCLE-VISIBILITY-1
- **KAN-28** (Story, Done): Implement: [EA-21] EPIC 15 — DRAFT-LIFECYCLE-VISIBILITY-1

**Comments:** Not fetched.

---

## EA-22 — Done
**Title:** EPIC 16 — ERROR-&-BLOCKED-STATE-UX-1

**Type:** Idea | **Priority:** Medium  
**URL:** https://engineo-ai.atlassian.net/browse/EA-22

**Description:** Standardize how errors and blocked states are surfaced. Problem: inconsistent, tooltip-only, silent disables. Goal: blocked as first-class state — visible, explained, actionable. In scope: unified visual language, inline explanations, next steps. Out of scope: permission model, backend validation. Trust: blocked must feel intentional, not broken.

**Linked KAN:**
- **KAN-29** (Epic, Done): [EA-22] EPIC 16 — ERROR-&-BLOCKED-STATE-UX-1
- **KAN-30** (Story, In Review): Implement: [EA-22] EPIC 16 — ERROR-&-BLOCKED-STATE-UX-1

**Comments:** Not fetched.

---

## EA-24 — Done
**Title:** EPIC 18 — KEYBOARD-&-FOCUS-INTEGRITY-1

**Type:** Idea | **Priority:** Medium  
**URL:** https://engineo-ai.atlassian.net/browse/EA-24

**Description:** Ensure predictable keyboard navigation and focus. Problem: inconsistent focus, “glitchy” feel. Goal: deliberate, stable, enterprise-grade. In scope: logical tab order, predictable focus after actions, no focus traps. Out of scope: accessibility overhaul. Trust: predictability builds confidence.

**Linked KAN:**
- **KAN-33** (Epic, Done): [EA-24] EPIC 18 — KEYBOARD-&-FOCUS-INTEGRITY-1
- **KAN-34** (Story, Done): Implement: [EA-24] EPIC 18 — KEYBOARD-&-FOCUS-INTEGRITY-1

**Comments:** Not fetched.

---

## Summary

| EA (Done) | Linked KAN (by title) |
|-----------|------------------------|
| EA-11 | — |
| EA-13 | — |
| EA-14 | — |
| EA-15 | — |
| EA-18 | KAN-13, KAN-14 |
| EA-19 | KAN-18, KAN-20 |
| EA-20 | KAN-21, KAN-25 |
| EA-21 | KAN-27, KAN-28 |
| EA-22 | KAN-29, KAN-30 |
| EA-24 | KAN-33, KAN-34 |

**Note:** Comments are not returned by the current `read-jira-tickets.ts` script. To see comments, use the Jira UI or the Jira REST API comment endpoint.
