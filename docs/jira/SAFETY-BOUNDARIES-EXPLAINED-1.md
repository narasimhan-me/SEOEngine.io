# Jira Story: EA-52 — SAFETY-BOUNDARIES-EXPLAINED-1

**Type:** Story  
**Priority:** Medium  
**Labels:** safety, trust, boundaries, transparency

---

## Summary

Make EngineO.ai's safety boundaries explicit, discoverable, and boringly clear.

---

## Epic Type

Trust Transparency & Boundary Clarity

---

## Problem (Observed Reality)

EngineO.ai behaves safely, but users don't have a single mental model of what the system cannot do.

They know:

- what they see

They don't always know:

- what the system will never do

Fear often comes from imagined capabilities, not real ones.

---

## User Risk

- Overestimating AI power
- Fear of hidden automation
- Hesitation to apply even safe changes

This is a communication gap, not a control gap.

---

## Intent (Authoritative)

Make EngineO.ai's safety boundaries explicit, discoverable, and boringly clear.

Users should know:

- what always requires approval
- what never runs automatically
- what AI cannot control

---

## Scope (IN)

- A clear, human-readable explanation of system boundaries:
  - no auto-apply
  - no background changes
  - no AI-initiated execution
- Centralized narrative that can be referenced from:
  - Apply flows
  - Playbooks
  - AI assistant
- Calm, confident tone (not legal, not defensive)

---

## Explicitly OUT of Scope (Hard Line)

- Rollback
- Undo
- Restore
- Version history
- Emergency controls
- New safety mechanisms

This Epic explains limits — it does not expand them.

---

## Acceptance Criteria

- Users can explain what the system will never do
- Safety boundaries are consistent across the product
- No copy implies reversibility unless it exists
- Safety explanation reduces anxiety, not increases it

---

## Definition of Done (UEP)

Users fear the system less because they understand its limits.
