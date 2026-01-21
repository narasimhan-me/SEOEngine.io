# EngineO.ai – Manual Testing: Worker Health Indicators

## Overview

- Validate any worker health indicators (dashboards, endpoints) for:
  - Reporting worker liveness.
  - Reporting queue lag or backlog.

## Preconditions

- Worker processes running and consuming jobs.
- Health/check endpoints or dashboards available for workers.

## Test Scenarios (Happy Path)

### Scenario 1 – Normal Operation

1. With workers running, open the worker health UI or endpoint.

Expected:

- Workers reported as healthy.
- Queue depth and processing metrics (if any) look normal.

## Edge Cases

- Temporarily stop one worker and observe health indicator changes.

## Error Handling

- Health endpoints should clearly indicate degraded status without crashing.

## Regression

- Worker health tracking must not interfere with the workers' ability to process jobs.

## Post-Conditions

- Restart any workers stopped for testing and verify health returns to normal.

## Known Issues

- Document any gaps in worker metrics for later improvements.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
