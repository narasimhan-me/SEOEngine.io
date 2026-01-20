# EngineO.ai – Manual Testing: Shopify Landing Page

## Overview

- Validate the dedicated Shopify landing page for:
  - Correct messaging and positioning for Shopify merchants.
  - CTA routing to signup/install flows.
  - Basic mobile responsiveness and SEO metadata.

## Preconditions

- Marketing site running with a Shopify-specific landing route (e.g., /shopify).

## Test Scenarios (Happy Path)

### Scenario 1 – Shopify-specific CTAs

1. Open the Shopify landing page.
2. Click primary CTA (e.g., "Start for Shopify" or "Install app").

Expected:

- CTA routes to the appropriate signup/install entry point for Shopify users.
- No generic or mismatched CTAs (e.g., referencing non-Shopify flows).

### Scenario 2 – Messaging & Layout

1. Quickly scan headings, subheadings, and key bullets.

Expected:

- Copy is clearly targeted at Shopify merchants.
- Page layout renders correctly on desktop and mobile.

## Edge Cases

- Very narrow viewport: long headlines wrap without breaking layout.

## Error Handling

- Landing page should render even if backend is temporarily unavailable.

## Regression

- Changes to this page must not break other marketing pages or the main signup flow.

## Post-Conditions

- None beyond verifying page remains functional.

## Known Issues

- Note any outdated plan or feature references that should be updated later.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
