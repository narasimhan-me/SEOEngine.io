# EngineO.ai – Manual Testing: Background Job Dashboard

## Overview

- Validate any background job dashboard or queue monitoring surfaces for:
  - Listing of jobs (pending, active, failed, completed).
  - Ability to inspect job details (where supported).

## Preconditions

- Job dashboard or admin view implemented and accessible to an admin/test user.
- Background jobs (e.g., crawls, DEO recomputes, sync jobs) running in the environment.

## Test Scenarios (Happy Path)

### Scenario 1 – Job Visibility

1. Trigger several jobs (crawls, syncs, etc.).
2. Open the job dashboard.

Expected:

- Jobs appear with correct status and timestamps.
- Basic filtering or sorting (if implemented) works as expected.

## Edge Cases

- Large number of jobs – dashboard still loads and remains usable.

## Error Handling

- If the dashboard cannot reach the job backend, show a friendly message, not a crash.

## Regression

- Dashboard changes should not impact worker behavior itself (read-only interface).

## Post-Conditions

- If any manual job replays are triggered during testing, ensure they are cleaned up or clearly labeled.

## Known Issues

- Note any missing job fields or filters needed for effective operations.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
