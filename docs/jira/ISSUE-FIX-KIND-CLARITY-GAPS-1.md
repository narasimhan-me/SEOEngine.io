# Jira Issue: ISSUE-FIX-KIND-CLARITY-GAPS-1

**Type:** Bug / Trust Debt  
**Priority:** Medium  
**Component:** Issues Engine / Fix Semantics  
**Affects Version:** Post ISSUE-FIX-KIND-CLARITY-1  
**Labels:** trust, issues-engine, fix-kind, semantics, frontend-only

---

## Summary

Two semantic gaps remain after ISSUE-FIX-KIND-CLARITY-1 that can cause misleading fix expectations in edge cases. These are not regressions, but trust clarity gaps that should be addressed to prevent future confusion.

---

## Context

ISSUE-FIX-KIND-CLARITY-1 successfully introduced canonical fix kinds:
- AI Preview Fix
- Direct Fix
- Guidance Only
- Blocked

However, review identified two cases where derivation or labeling can diverge from actual behavior, which could erode trust if left unaddressed.

This ticket explicitly captures those gaps so they can be fixed deliberately in a follow-up patch.

---

## Finding 1 — AI_PREVIEW_FIX derivation is too broad

### Current Behavior

AI_PREVIEW_FIX is derived when:
- `fixType === 'aiFix'`
- `fixReady === true`
- `primaryProductId` exists

This does not verify whether the issue actually supports the inline AI preview UI.

### Risk

Some AI-fix issues may:
- Be labeled "Review AI fix"
- But actually navigate to another surface (no preview)

This creates a semantic trust violation:

The UI promises a preview, but the user is routed instead.

### Expected Behavior

AI_PREVIEW_FIX should be used only when the inline AI preview experience is truly available for that issue kind.

If inline preview is not supported:
- The fix kind should fall back to DIRECT_FIX or GUIDANCE_ONLY, depending on destination.

### Notes
- This is a frontend-only correction.
- Must reuse the same condition already used by the Issues UI to decide whether inline preview is shown.
- No backend changes required.

---

## Finding 2 — "View affected" path is mislabeled as guidance

### Current Behavior

When the best available action is `viewAffected` (navigates to a filtered list of affected items):
- The CTA label is "Review guidance"

### Issue

This action is not guidance:
- It navigates to a concrete list of affected entities.
- Labeling it as guidance blurs the distinction between:
  - Informational guidance
  - Exploratory data views

### Expected Behavior

When the primary action is `viewAffected`:
- CTA label should reflect exploration, not instruction.

Examples (choose one):
- "View affected"
- "Review affected items"

This change is copy-only and does not alter routing.

---

## Why This Was Deferred

- ISSUE-FIX-KIND-CLARITY-1 prioritized establishing the canonical fix-kind system
- These findings are edge cases, not systemic failures
- They do not block progression to DRAFT-LIFECYCLE-VISIBILITY-1

This ticket exists to ensure they are not forgotten.

---

## Acceptance Criteria

- AI_PREVIEW_FIX is assigned only when inline preview is actually available
- No issue is labeled "Review AI fix" unless preview is shown
- "View affected" actions are no longer labeled as guidance
- No behavior, routing, or backend changes introduced
- Manual testing updated if labels change

---

## Related Work

- **Completed:** ISSUE-FIX-KIND-CLARITY-1
- **In progress / Next:** DRAFT-LIFECYCLE-VISIBILITY-1

---

## Notes for Supervisor

This ticket is suitable for:
- A small, isolated PATCH BATCH
- Frontend-only changes
- Low risk, high trust payoff
