# EngineO.ai – Manual Testing: Pricing Page

## Overview

- Validate the public pricing page for:
  - Accurate plan descriptions.
  - Plan selection CTAs and routing.
  - Basic responsive behavior and SEO metadata.

## Preconditions

- Pricing page route available (e.g., /pricing).

## Test Scenarios (Happy Path)

### Scenario 1 – Plan Cards and CTAs

1. Open the pricing page.
2. Verify plans listed (Free/Starter/Pro/Agency, or equivalent).
3. Click primary CTA on each plan where appropriate.

Expected:

- Each plan's CTA routes to the correct signup or upgrade flow.
- Plan features and limits summaries match backend configuration at a high level.

## Edge Cases

- Small viewport: plan cards stack correctly and CTAs remain reachable.

## Error Handling

- Pricing page should degrade gracefully if plan data is static or partially missing (no hard crashes).

## Regression

- Changes to pricing layout or content should not break the core billing flows tested in R1.

## Post-Conditions

- None beyond confirming all pricing CTAs remain aligned with actual plans.

## Known Issues

- Note any placeholder pricing values that differ from real Stripe configuration.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
