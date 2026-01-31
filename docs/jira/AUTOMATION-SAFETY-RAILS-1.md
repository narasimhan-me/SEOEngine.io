# Jira Epic: EA-44 — AUTOMATION-SAFETY-RAILS-1

**Type:** Epic  
**Priority:** High  
**Labels:** automation, safety-rails, phase-e, trust

---

## Summary

Add system-level safety rails around automation.

---

## Problem

Even with confirmation, automation needs systemic guardrails.

---

## User Risk

Over-application, unexpected scope, or entitlement misuse.

---

## Intent

Add system-level safety rails around automation.

---

## Scope (IN)

- Entitlement checks
- Scope limits
- Guard conditions before execution

---

## Explicitly OUT of scope (HARD LINE)

- Auto-escalation
- Self-healing automation
- Background retries

---

## Acceptance Criteria

- Automation cannot exceed declared scope
- Safety failures block execution clearly
- Errors explain why automation didn't run

---

## Notes

Phase E. Guardrails only; no auto-escalation or retries.
