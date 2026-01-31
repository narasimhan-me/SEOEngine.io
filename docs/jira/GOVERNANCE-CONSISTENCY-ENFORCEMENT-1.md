# Jira Story: EA-50 — GOVERNANCE-CONSISTENCY-ENFORCEMENT-1

**Type:** Story  
**Priority:** Medium  
**Labels:** governance, trust, cross-surface, copy-only

---

## Summary

Enforce one consistent governance narrative across all surfaces where action is suggested, without introducing new rules or behavior.

---

## Epic Type

Trust & Governance Hardening (Cross-Surface)

---

## Problem (Observed Reality)

EngineO.ai already enforces governance rules correctly, but users encounter those rules unevenly across the product.

Governance is:

- clear on Issue → Draft → Apply flows
- less explicit on:
  - Work Queue summaries
  - Playbook previews
  - AI assistant explanations
  - Secondary panels and helper surfaces

This creates governance drift: Users understand safety in one place, but subconsciously doubt it elsewhere.

---

## User Risk

Users fear invisible power:

- "Is this doing something automatically?"
- "Is this AI changing things without me noticing?"
- "Why does this screen feel different from the other one?"

This fear slows adoption and undermines trust — even when the system is behaving correctly.

---

## Intent (Authoritative)

Enforce one consistent governance narrative across all surfaces where action is suggested, without introducing new rules or behavior.

Governance must feel:

- uniform
- predictable
- boring (in a good way)

The user should never need to "re-learn" trust.

---

## Scope (IN)

- Audit all action-adjacent surfaces:
  - Issues list & details
  - Work Queue items
  - Playbook previews
  - AI assistant explanations
  - Right Context Panel summaries
- Normalize governance language:
  - "Draft first"
  - "Nothing applies without approval"
  - "No automatic live changes"
- Ensure AI assistant never omits governance framing when explaining fixes
- Visual reinforcement where appropriate (badges, micro-copy, placement)

---

## Explicitly OUT of Scope (Hard Line)

- No new governance rules
- No permission changes
- No behavior changes
- No additional confirmation steps
- No rollback or undo language

This Epic does not add safety — it clarifies existing safety.

---

## Acceptance Criteria

- Any surface that suggests an action also communicates governance truth
- Governance language is consistent in wording and tone
- No surface implies background execution or hidden automation
- A user can move between surfaces without feeling a change in "power level"

---

## Definition of Done (UEP)

A user never wonders "does this screen work differently from the last one?"
