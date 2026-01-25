# Jira Issue: ISSUE-FIX-KIND-CLARITY-1

**Type:** Task  
**Priority:** Medium  
**Component:** Issues Engine / UI / Trust  
**Affects Version:** Post ISSUE-FIX-ROUTE-INTEGRITY-1  
**Labels:** trust, issues-engine, ui-clarity, semantic-clarity

---

## Summary

Eliminate semantic ambiguity in Issue row actions by making the "kind" of fix explicit at the point of decision, without adding new flows or backend changes.

---

## Background / Context

As part of ISSUE-FIX-ROUTE-INTEGRITY-1, we introduced strict routing and action destination validation. However, the current UI does not clearly communicate WHAT kind of fix will happen when a user clicks "Fix".

Users cannot answer at a glance:
- Is this AI-generated or rule/template-based?
- Will this take me to a preview, a configuration screen, or guidance?
- Am I applying something now, or reviewing first?

This phase addresses semantic clarity only—no behavior changes, no new flows, no backend changes.

---

## Hard Constraints

- NO backend/schema changes.
- NO AI execution changes.
- NO bulk actions.
- Do NOT reopen or redesign locked shell / work-canvas / RCP architecture.
- Preserve existing routing and action destination logic from ISSUE-FIX-ROUTE-INTEGRITY-1.

---

## Core Trust Rule

- The UI must clearly communicate WHAT kind of fix this is BEFORE the user clicks.
- The UI must never imply automation, AI, or application unless it is true and reachable.

---

## Objective

Eliminate semantic ambiguity in Issue row actions by making the "kind" of fix explicit at the point of decision, without adding new flows.

Users must be able to answer, at a glance:
- Is this AI-generated or rule/template-based?
- Will this take me to a preview, a configuration screen, or guidance?
- Am I applying something now, or reviewing first?

---

## Scope

Issues Decision Engine page only (no new pages).

Changes limited to:
- Labels
- Secondary text
- Icons
- Tooltips
- Micro-copy
- Optional sublabels inside action buttons

NO new buttons. NO new navigation.

---

## Fix Kinds (Canonical)

Introduce the following canonical fix kinds (frontend-only classification):

### 1. AI_PREVIEW_FIX
- **Meaning:** AI will generate a preview; nothing is applied automatically.
- **Example label:**
  - Primary: "Review AI fix"
  - Secondary (small text or tooltip): "Preview changes before saving"
- **Icon:** AI / sparkle (from local icon set)

### 2. DIRECT_FIX
- **Meaning:** User is routed to an existing internal UI where they manually apply changes.
- **Example label:**
  - Primary: "Fix in workspace"
  - Secondary: "Manual changes required"
- **Icon:** wrench / edit

### 3. GUIDANCE_ONLY
- **Meaning:** No direct fix available; user receives instructions or context.
- **Example label:**
  - Primary: "View guidance"
  - Secondary: "No automatic fix available"
- **Icon:** info / book

### 4. BLOCKED (already exists; do not redesign)
- **Meaning:** Action is not reachable in current context.
- **Label remains "Blocked".**

---

## Implementation Patches

### PATCH 1 — Derive fix kind per Issue row (frontend-only)

Add a small helper (co-located with issueActionDestinations) that derives a `fixKind` for each issue row using existing data:
- Presence of AI preview route → AI_PREVIEW_FIX
- Presence of direct internal fix route without preview → DIRECT_FIX
- No fix route but informational content → GUIDANCE_ONLY
- No route at all → BLOCKED

Do NOT introduce new backend fields.
Do NOT add heuristics based on guesswork; use existing routing/destination signals only.

### PATCH 2 — Update Issue row Fix CTA labels to reflect fix kind

In:
- apps/web/src/app/projects/[id]/issues/page.tsx

Update the primary Fix action rendering to:
- Change the visible label based on `fixKind`
- Add a small secondary line or tooltip explaining what will happen next
- Keep data-testids unchanged
- Keep disabled gating unchanged

Examples:
- AI_PREVIEW_FIX → "Review AI fix"
- DIRECT_FIX → "Fix in workspace"
- GUIDANCE_ONLY → Replace Fix button with "View guidance" action (uses existing Open/View logic)
- BLOCKED → No Fix; show Blocked chip (existing behavior)

### PATCH 3 — Iconography and affordance alignment

- Use existing local icons only.
- Add fix-kind-specific icons next to the Fix action (or inside the button).
- Icons must reinforce meaning, not decorate.

### PATCH 4 — Right Context Panel consistency

Ensure the RCP header or first section reflects the same fix kind language:
- If Issue row says "Review AI fix", RCP should echo:
  - "This issue has an AI-generated fix preview."
- If "Fix in workspace", RCP should state:
  - "This fix requires manual changes in the workspace."

No new RCP sections. Copy-only alignment.

### PATCH 5 — Manual testing documentation

Create:
- docs/manual-testing/ISSUE-FIX-KIND-CLARITY-1.md

Include:
- At least one example for each fix kind:
  - AI preview issue
  - Direct fix issue
  - Guidance-only issue
  - Blocked issue
- Verification that:
  - Labels match behavior
  - No misleading automation language exists
  - Clicking the CTA leads to the expected flow

Update:
- IMPLEMENTATION_PLAN.md with this phase and reference the new manual testing doc.

### PATCH 6 — Regression guardrails

Add a lightweight dev-time warning:
- If fixKind === AI_PREVIEW_FIX but label does not include "Review"
- If fixKind === DIRECT_FIX but label implies AI or automation

Do NOT fail production builds.

---

## Definition of Done

- Every Issue row Fix action clearly communicates its fix kind before click.
- No Fix action implies AI, automation, or application unless true.
- Behavior is unchanged; only clarity is improved.
- Manual testing doc exists and is linked in IMPLEMENTATION_PLAN.md.
- No new routes, backend changes, or bulk actions introduced.

---

## Notes to Implementer

- Keep changes incremental and localized.
- Favor clarity over cleverness.
- If in doubt, make the action MORE conservative, not more powerful.

---

## Related Phases

- **Completed:** ISSUE-FIX-ROUTE-INTEGRITY-1
- **Future (potential):** ISSUE-ACTION-DESTINATION-GAPS-1
