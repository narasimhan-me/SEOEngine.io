# EngineO.ai – Manual Testing: Token Usage Tracking

## Overview

- Validate that token/usage tracking systems:
  - Record AI and relevant API usage events correctly.
  - Can be queried for usage per user/project/day.

## Preconditions

- Environment with token usage tracking enabled.
- Ability to trigger AI usage and other metered actions.

## Test Scenarios (Happy Path)

### Scenario 1 – Recording Usage

1. Trigger several AI suggestions and other metered actions as a test user.

Expected:

- Usage events are recorded with correct:
  - UserId.
  - ProjectId.
  - Feature identifier.
  - Timestamp.

## Edge Cases

- Mixed usage across multiple projects/users – counts remain correct and separated.

## Error Handling

- If usage logging fails, ensure:
  - It fails safely (no user-visible error if the main action succeeds).
  - Logs highlight the failure for later diagnosis.

## Regression

- Changes to token tracking must not affect entitlement enforcement logic already tested in R1/R2.

## Post-Conditions

- Optionally clear or tag test usage records if they should not influence analytics.

## Known Issues

- Note any missing aggregation or reporting endpoints for future analytics work.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
