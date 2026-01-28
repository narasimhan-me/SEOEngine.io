# Jira Issue: ISSUE-ACTION-DESTINATION-GAPS-1

**Type:** Bug / Tech Debt  
**Priority:** Medium  
**Component:** Issues Engine / Routing / Trust  
**Affects Version:** Post ISSUE-FIX-ROUTE-INTEGRITY-1  
**Labels:** trust, issues-engine, route-integrity, deferred

---

## Summary

Some Issue row actions intentionally fall back to Blocked due to missing or incomplete action destinations (e.g., missing Shopify admin URLs or unsupported asset types). These are not regressions, but known destination gaps that should be addressed to expand fix/open coverage safely.

---

## Background / Context

As part of ISSUE-FIX-ROUTE-INTEGRITY-1, we introduced a strict Issue Action Destination Map to eliminate dead clicks and misleading CTAs.

This phase intentionally chose truthfulness over coverage:

- If a destination cannot be proven reachable → action is blocked.
- No fake "Open" or "Fix" buttons are shown.

As a result, some issue types or asset contexts currently surface Blocked states where future expansion is possible.

This ticket tracks those gaps explicitly so they are not forgotten or misinterpreted as bugs.

---

## Known Gaps (Current Behavior is Correct, but Limited)

### 1. Non-Product Asset Issues (Pages / Collections)

- "Open" action is Blocked unless a valid shopifyAdminUrl is present.
- No internal detail pages exist yet for these asset types.
- Current fallback behavior is intentional.

### 2. Issues without primaryProductId

- "Open" defaults to product workspace when primaryProductId exists.
- Issues lacking this context have no internal fallback and remain Blocked.

### 3. Issue types marked isActionableNow but lacking destination metadata

- Guardrail logs warn in dev mode.
- UI correctly renders Blocked, but coverage can be expanded later by:
  - enriching issue metadata, or
  - adding safe external destinations.

---

## Why This Was Not Addressed in ISSUE-FIX-ROUTE-INTEGRITY-1

- Phase scope explicitly disallowed:
  - Creating new asset detail pages
  - Adding backend fields
  - Guessing destinations
- Trust principle enforced: no action unless reachable now

This ticket exists so future phases can expand coverage deliberately, not accidentally.

---

## Acceptance Criteria (for future resolution)

- Each listed gap is resolved by one of:
  - A verified internal route
  - A verified external Shopify Admin URL
  - Explicit reclassification of the issue as Informational
- No new "Fix" or "Open" CTA is introduced without destination validation.
- Action Destination Map updated accordingly.
- Manual testing doc updated if behavior changes.

---

## Related Phases

- **Completed:** ISSUE-FIX-ROUTE-INTEGRITY-1
- **Upcoming:** ISSUE-FIX-KIND-CLARITY-1
- **Future (potential):** Asset detail surfaces, metadata enrichment

---

## Notes

This is not blocking ISSUE-FIX-KIND-CLARITY-1.  
That phase focuses on semantic clarity of fix types, not expanding destination coverage.
