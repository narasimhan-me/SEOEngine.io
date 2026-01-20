# EngineO.ai – Manual Testing: Pagination & Tabs

## Overview

- Validate pagination and tab behaviors across:
  - Products lists.
  - Issues and Content tabs.
  - Any other tabbed navigation surfaces.

## Preconditions

- Test project with:
  - Enough products or items to require multiple pages.
  - Pages or issues for tabbed views.

## Test Scenarios (Happy Path)

### Scenario 1 – Products Pagination

1. Open the Products page for a project with many products.
2. Navigate through multiple pages using pagination controls.

Expected:

- Page counts and current page indicators are correct.
- Navigating pages updates the list without breaking filters or selections.

### Scenario 2 – Tabs Navigation

1. Open any view with tabs (e.g., issues/content tabs).
2. Switch between tabs repeatedly.

Expected:

- Content updates correctly on each tab.
- Active tab styling is clear.

## Edge Cases

- Direct deep-linking to a specific page or tab (if supported).
- Very high page numbers (last page).

## Error Handling

- If pagination request fails, show clear error and allow retry without losing context.

## Limits

- Confirm pagination controls remain usable on smaller viewports.

## Regression

- Sorting and filtering should continue to work together with pagination and tabs.

## Post-Conditions

- Return to first page/tab with no residual weird state.

## Known Issues

- Note any tab sets that still require full page reloads or have inconsistent styling.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
