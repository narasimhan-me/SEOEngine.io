# Jira Issue: ISSUE-FIX-ROUTE-INTEGRITY-1: ISSUE-FIX-KIND-CLARITY-1

**Type:** Epic  
**Priority:** High  
**Component:** Issues Engine / Trust / UX Semantics  
**Labels:** trust, issues-engine, fix-clarity, no-backend, frontend-only

---

## Epic Summary

ISSUE-FIX-ROUTE-INTEGRITY-1: Make the kind of fix (AI preview, direct/manual fix, guidance-only, blocked) explicit at the point of decision on the Issues page, so users understand what will happen before they click.

---

## Problem Statement

After ISSUE-FIX-ROUTE-INTEGRITY-1, all Issue actions are now truthful and reachable, but the UI still suffers from semantic ambiguity:
- "Fix" does not communicate how the fix works
- Users cannot tell:
  - AI preview vs manual edit vs guidance-only
  - whether anything will be applied automatically
- This creates hesitation and erodes trust, especially for first-time users

---

## Goal / Intent

Before clicking any Issue action, the user must be able to answer:
- Is this AI-generated or not?
- Will I review first or act immediately?
- Am I applying anything, or just navigating?

This Epic improves clarity only — not power, not automation.

---

## Scope (Strict)

✅ Frontend-only
✅ Copy, labels, icons, tooltips
✅ Issues Decision Engine + Right Context Panel alignment
❌ No backend/schema changes
❌ No new routes
❌ No AI execution changes
❌ No bulk actions

---

## Canonical Fix Kinds (Contract)

The UI must classify every Issue into one of the following fix kinds:

### 1. AI Preview Fix
- AI generates a preview; nothing is auto-applied

### 2. Direct Fix (Manual)
- User is routed to an existing workspace to manually edit/apply

### 3. Guidance Only
- No fix available; user receives instructions/context

### 4. Blocked
- Action is not reachable in current context

This classification is frontend-derived only, using existing routing signals.

---

## Acceptance Criteria (Epic-Level)

- Every Issue row Fix action clearly communicates its fix kind before click
- No Fix CTA implies:
  - automation
  - AI
  - application
unless it is true
- Issues table and Right Context Panel use consistent language
- Existing routing and behavior remain unchanged
- Manual testing documentation exists
- IMPLEMENTATION_PLAN.md is updated to reference this phase

---

## Out of Scope (Explicit)

- Expanding fix coverage
- Creating new asset detail pages
- Introducing new automation
- Changing issue prioritization logic

---

## Dependencies

- ✅ ISSUE-FIX-ROUTE-INTEGRITY-1 (completed)
- ⏭ ISSUE-ACTION-DESTINATION-GAPS-1 (tracked separately; not blocking)

---

## Implementation Notes (for agent pulling the Epic)

- Supervisor prompt already exists for this Epic
- Changes are expected in:
  - Issues page action rendering
  - Small helper to derive fix kind
  - RCP copy alignment
  - Manual testing docs
- Favor conservative language over optimistic language

---

## Definition of Done

- All Issue actions clearly communicate fix kind
- No misleading "Fix" labels remain
- Manual testing doc exists and is linked
- No trust regressions introduced
