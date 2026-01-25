# Jira Issue: DRAFT-LIFECYCLE-VISIBILITY-1

**Type:** Task  
**Priority:** Medium  
**Component:** Issues Engine / UI / Trust  
**Affects Version:** Post ISSUE-FIX-KIND-CLARITY-1  
**Labels:** trust, issues-engine, draft-lifecycle, frontend-only, no-backend

---

## Summary

Make the draft lifecycle explicit and unmistakable everywhere it appears, so users always know whether a draft exists, is saved, has been applied, and what will happen next.

---

## Hard Constraints (Non-Negotiable)

- NO backend or schema changes.
- NO AI execution changes.
- NO bulk actions.
- NO silent auto-apply.
- Do NOT reopen or redesign locked shell / work-canvas / RCP architecture.
- Preserve routing, destination mapping, and fix-kind clarity introduced in prior phases.
- "Apply" language only when action is reachable and user-initiated.

---

## Core Trust Goal

Make the draft lifecycle explicit and unmistakable everywhere it appears.

A user must always know:
- Whether a draft exists
- Whether it is generated but unsaved
- Whether it is saved (pending apply)
- Whether it has been applied
- What will happen next if they click

If state is ambiguous, default to conservative language and disabled actions.

---

## Objective

Surface a clear, consistent, and user-comprehensible draft lifecycle across:
- Issues Decision Engine (table rows + inline preview strip)
- Right Context Panel (issue details)

Without changing behavior.

---

## Scope

Frontend-only. Copy, labels, micro-states, chips/badges, tooltips, and small inline indicators.

NO new pages. NO new flows.

---

## Canonical Draft States (UI Contract)

Derive from existing client/server signals only:

### 1. NO_DRAFT
- No draft exists
- No apply possible

### 2. GENERATED_UNSAVED
- Preview exists
- Not persisted
- Apply must be disabled

### 3. SAVED_NOT_APPLIED
- Persisted draft exists
- Apply is available

### 4. APPLIED
- Draft has been applied
- No further apply action

---

## Implementation Patches

### PATCH 1 — Centralize draft state derivation helper

Create (or extend) a helper near existing draft logic, e.g.:
- `apps/web/src/lib/drafts/draftLifecycleState.ts`

Export:
- `deriveDraftLifecycleState(inputSignals) -> DraftLifecycleState`
- `getDraftLifecycleCopy(state) -> { label, shortLabel, description }`

Input signals must come ONLY from what the UI already has:
- `hasPreview` / `previewGenerated`
- `getDraftState()` (existing)
- any existing apply result flag already present in UI state

Do NOT add backend calls.
Do NOT invent state.

### PATCH 2 — Issues table row: subtle draft state indicator

In:
- `apps/web/src/app/projects/[id]/issues/page.tsx`

Add a small, non-action indicator in the row (near Actions column or beneath the Fix CTA) WHEN a draft exists:
- GENERATED_UNSAVED → "Draft not saved"
- SAVED_NOT_APPLIED → "Draft saved"
- APPLIED → "Applied"
NO indicator for NO_DRAFT.

Rules:
- Must not look clickable.
- Must not compete with the primary CTA.
- Must not introduce a new button.

### PATCH 3 — Inline preview strip: enforce state-driven gating + copy

Where the inline preview actions exist (Generate/Save/Apply):
- **GENERATED_UNSAVED:**
  - Apply disabled
  - Tooltip: "Save draft before applying"

- **SAVED_NOT_APPLIED:**
  - Apply enabled
  - Label stays "Apply saved draft to Shopify"

- **APPLIED:**
  - Remove Apply action
  - Show non-interactive confirmation "Applied"

- **NO_DRAFT:**
  - No apply controls shown

Do NOT change existing handlers; only align copy/visibility to state.

### PATCH 4 — Right Context Panel: echo the same draft lifecycle state

In the issue details panel component (where actionability is shown):
- Add a single line (copy only) that reflects draft lifecycle state using `getDraftLifecycleCopy()`.

Examples:
- "No draft exists"
- "Draft generated (not saved)"
- "Draft saved (not applied)"
- "Draft applied"

No new panel sections; keep it tight.

### PATCH 5 — Manual testing doc + Implementation Plan

Create:
- `docs/manual-testing/DRAFT-LIFECYCLE-VISIBILITY-1.md`

Include explicit test cases for:
- Each canonical state
- Apply enable/disable rules
- No silent transitions
- Consistency between Issues table + inline preview + RCP

Update:
- `docs/IMPLEMENTATION_PLAN.md`

Add this phase with a link to the manual testing doc.

### PATCH 6 — Dev-time regression guardrails (non-fatal)

Add console warnings in dev when:
- Apply is enabled but derived state != SAVED_NOT_APPLIED
- UI shows "Applied" state without an apply completion signal
- Any mismatch between inline preview state and row indicator state

---

## Definition of Done

- Draft lifecycle is explicit and consistent in Issues + RCP.
- Apply is never ambiguous; always gated.
- No behavior changes; only visibility/clarity improvements.
- Manual testing doc exists + IMPLEMENTATION_PLAN.md updated.
- No new routes, no backend changes, no bulk actions.

---

## Notes to Implementer

- Prefer conservative UX. If unsure, disable and explain.
- Keep changes incremental and localized.
- Preserve existing data-testids; add new ones only if strictly needed for Playwright stability.

---

## Related Phases

- **Completed:** ISSUE-FIX-ROUTE-INTEGRITY-1
- **Completed:** ISSUE-FIX-KIND-CLARITY-1
- **Future (potential):** ISSUE-ACTION-DESTINATION-GAPS-1
