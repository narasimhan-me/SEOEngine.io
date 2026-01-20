# EngineO.ai – Manual Testing: Entitlements Matrix

## Overview

- Validate that the entitlements matrix:
  - Matches documented plan features and limits.
  - Is applied consistently across features that depend on it.

## Preconditions

- Access to plan configuration (e.g., PLANS definition).
- Environment where different plan types (Free/Starter/Pro/Agency) can be assigned to test users.

## Test Scenarios (Happy Path)

### Scenario 1 – Plan-to-Entitlements Mapping

1. For each plan, inspect entitlements configuration.
2. Perform a high-level spot-check by triggering key actions (projects, crawls, AI suggestions).

Expected:

- Behavior aligns with the matrix (no plan can exceed its documented caps via normal UI).

## Edge Cases

- Plan changes or renames – entitlements matrix remains in sync.

## Error Handling

- Misconfigured plans should be caught early (e.g., via logs or sanity checks), not at runtime only.

## Regression

- Future entitlements changes must remain compatible with existing tests and docs.

## Post-Conditions

- Reset any temporary plan changes for test users.

## Known Issues

- Document any ambiguous or TBD limits that need product decisions.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
