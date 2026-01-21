# EngineO.ai – Manual Testing: Features Pages

## Overview

- Validate any "Features" or product tour pages for:
  - Correct coverage of main capabilities (DEO Score, Issues, Optimize, etc.).
  - CTA routing back into signup or app.
  - Basic SEO/meta and responsive layout.

## Preconditions

- Features route(s) available (e.g., /features).

## Test Scenarios (Happy Path)

### Scenario 1 – Features Content & CTAs

1. Open the features page.
2. Read section headings and bullet points for major features.
3. Click any CTAs (e.g., "Start free", "See pricing").

Expected:

- Content is coherent and up to date with current product capabilities.
- CTAs route to appropriate marketing or signup pages.

## Edge Cases

- Check a small viewport and confirm sections stack correctly.

## Error Handling

- Page should render even if other marketing content fails to load (e.g., image CDN issues).

## Regression

- Adding new features or renaming existing ones should not leave references broken or inconsistent here.

## Post-Conditions

- None beyond ensuring navigation back to homepage/pricing works.

## Known Issues

- Note any sections marked as "coming soon" that may require future updates.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
