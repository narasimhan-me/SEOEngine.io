# EngineO.ai – Manual Testing: Modal & Dialog Behavior

## Overview

- Validate all modal and dialog interactions, including:
  - Confirmation dialogs.
  - Multi-step dialogs.
  - Escape-key and outside-click handling.

## Preconditions

- Frontend running.
- Ability to:
  - Delete a project or item (with confirmation).
  - Open any multi-step modal flows (if present).

## Test Scenarios (Happy Path)

### Scenario 1 – Confirmation Dialog

1. Initiate an action that requires confirmation (e.g., delete project/item).
2. Confirm the action.

Expected:

- Modal appears with clear title, body, and actions (Confirm / Cancel).
- On confirm:
  - Action completes.
  - Modal closes.
  - Appropriate toast/feedback appears.

### Scenario 2 – Cancel / Dismiss Behavior

1. Open the same confirmation dialog.
2. Cancel via:
   - Cancel button.
   - Escape key.
   - Clicking outside the modal (if supported).

Expected:

- No destructive action is taken.
- Modal closes reliably.

## Edge Cases

- Modal opened on small screens:
  - Content remains accessible and scrollable.
- Multiple modals prevented (no unintended stacking).

## Error Handling

- If the underlying action fails, error feedback should appear while the modal closes or remains in a clear error state.

## Limits

- Confirm modals are keyboard accessible and focus is trapped while open.

## Regression

- Modal behavior should not interfere with global navigation or background scrolling more than intended.

## Post-Conditions

- All dialogs should be closed and no overlay should remain.

## Known Issues

- Note any dialogs lacking keyboard or screen-reader affordances for follow-up work.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
