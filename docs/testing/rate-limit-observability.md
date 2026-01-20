# EngineO.ai – Manual Testing: Rate-Limit Observability

## Overview

- Validate observability around rate limits, including:
  - Visibility into rate-limited events (e.g., AI, Shopify, internal APIs).
  - Clear logs or dashboards for identifying limit issues.

## Preconditions

- Environment where rate limits can be simulated or reached safely.
- Access to logs or dashboards capturing rate-limit events.

## Test Scenarios (Happy Path)

### Scenario 1 – Hitting a Known Limit

1. Repeatedly trigger an action known to have a limit (e.g., AI suggestions) until limit is reached.

Expected:

- Observability surfaces show rate-limit events with:
  - Timestamp.
  - Feature or endpoint affected.
  - Plan or context where applicable.

## Edge Cases

- Many repeated limit hits – observability remains performant and readable.

## Error Handling

- No silent failures; hitting limits should always correspond to observable logs/events.

## Regression

- Observability additions must not materially slow down the main API.

## Post-Conditions

- Reset or clear any test-specific metrics if appropriate.

## Known Issues

- Note any missing metrics or dashboards that would improve diagnosis.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
