# EngineO.ai – Manual Testing: Marketing Homepage

## Overview

- Validate the public marketing homepage for:
  - CTA functionality.
  - Navigation.
  - Basic mobile responsiveness.
  - SEO metadata (title, description, OG tags).

## Preconditions

- Marketing site deployed or running locally.
- Access to:
  - / (homepage).
  - Login and signup routes.

## Test Scenarios (Happy Path)

### Scenario 1 – CTAs and Navigation

1. Open the homepage.
2. Click primary CTA (e.g., "Start Free") → verify navigation to signup.
3. Click secondary CTAs (e.g., "Login", "Learn more") → verify correct destinations.

Expected:

- All CTAs route correctly.
- No broken links or 404s.

### Scenario 2 – SEO Metadata

1. Inspect page <title> and meta description.
2. Inspect OpenGraph tags (if configured).

Expected:

- Title and description match intended marketing copy.
- OG tags reference the correct image and summary.

## Edge Cases

- Small viewport: confirm hero layout and CTAs remain visible and usable.

## Error Handling

- Homepage should not depend on backend availability; if backend is down, page should still render basic content.

## Regression

- Changes to marketing homepage must not break redirect logic for authenticated users (if such logic exists).

## Post-Conditions

- None specific beyond ensuring page remains accessible.

## Known Issues

- Note any placeholder content that still needs copy/visual refinement.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
