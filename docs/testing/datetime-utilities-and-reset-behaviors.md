# EngineO.ai – Manual Testing: Date/Time Utilities & Reset Behaviors

## Overview

- Validate date/time-related utilities and reset behaviors, especially for:
  - Daily AI usage resets.
  - Other per-day or per-period counters.

## Preconditions

- Environment where:
  - Current date/time can be controlled or simulated (test/staging), or tests can be run over day boundaries.

## Test Scenarios (Happy Path)

### Scenario 1 – Daily AI Limit Reset

1. Reach the daily AI suggestion limit.
2. Wait for or simulate the start of a new counted day (e.g., UTC midnight).
3. Attempt new AI suggestions.

Expected:

- Counters reset as expected and allow new usage.

## Edge Cases

- Time zone boundaries – confirm logic is consistently using UTC (or documented behavior).

## Error Handling

- Misalignment between system clock and expected reset time should not produce permanent lockouts.

## Regression

- Date/time utility changes must not alter previously correct limit behavior.

## Post-Conditions

- Restore any modified time configuration and ensure counters reflect real current day.

## Known Issues

- Document any ambiguous rules (e.g., partial days or grace periods) to clarify later.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
