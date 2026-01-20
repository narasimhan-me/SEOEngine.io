# EngineO.ai – Manual Testing: Plan Definitions

## Overview

- Validate that plan definitions (names, descriptions, key limits) are:
  - Consistent across backend, frontend, and marketing.
  - Correctly tied to Stripe price IDs (where applicable).

## Preconditions

- Access to:
  - Plan configuration in code.
  - Pricing page.
  - Billing settings in the app.

## Test Scenarios (Happy Path)

### Scenario 1 – Cross-Surface Consistency

1. For each plan:
   - Compare backend config, pricing page content, and in-app billing display.

Expected:

- Names and basic limits match.
- No plan appears in one place but not another, unless explicitly intentional.

## Edge Cases

- Placeholder plans or future tiers clearly labeled as such.

## Error Handling

- If a plan is misconfigured, surfaces should fail gracefully and log clear errors rather than presenting nonsense to users.

## Regression

- Changing plan copy or names should be coordinated across all surfaces and tested using this doc.

## Post-Conditions

- None beyond confirming consistency.

## Known Issues

- Document any known temporary discrepancies and planned fix phases.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
