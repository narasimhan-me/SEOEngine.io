# EngineO.ai – Manual Testing: Toast & Inline Feedback System

## Overview

- Validate the behavior of the toast and inline feedback system, complementing docs/testing/frontend-ux-feedback-and-limits.md.
- Focus on:
  - Toast variants (success, error, info, warning, limit).
  - Positioning and stacking.
  - Persistence rules and auto-dismiss behavior.
  - Accessibility (ARIA live regions).

## Preconditions

- Frontend running with FeedbackProvider integrated.
- Ability to trigger:
  - Successful actions (e.g., save settings).
  - Known error cases (e.g., invalid form input).
  - Entitlement/limit errors (already covered in R1 doc, referenced here).

## Test Scenarios (Happy Path)

### Scenario 1 – Toast Variants and Positioning

1. Trigger a success action (e.g., saving settings).
2. Trigger an error scenario (e.g., forced network failure).
3. Trigger an info or warning toast if available.

Expected:

- Success toast appears with correct color and icon, then auto-dismisses.
- Error toast appears with appropriate styling and longer duration.
- Toasts appear in the expected area of the viewport (e.g., bottom-right on mobile, top-right on desktop).

## Edge Cases

- Multiple toasts triggered quickly:
  - They should stack clearly without overlapping critical UI.

## Error Handling

- If toast rendering fails for any reason, core page functionality should remain intact (graceful degradation).

## Limits

- Toast system should not allow unbounded growth of queued toasts; older ones should auto-dismiss.

## Regression

- Existing feedback flows documented in frontend-ux-feedback-and-limits.md should continue to function identically.

## Post-Conditions

- Ensure there are no lingering toasts after tests complete.

## Known Issues

- Document any pages still using legacy banners or ad-hoc feedback mechanisms.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
