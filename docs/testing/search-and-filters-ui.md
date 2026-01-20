# EngineO.ai – Manual Testing: Search & Filters (UI)

## Overview

- Validate search and filter UX for:
  - Product search inputs.
  - Issue filters.
  - Quick navigation or filter chips where present.

## Preconditions

- Test project with:
  - Enough products to meaningfully filter/search.
  - Enough issues to filter by severity/type.

## Test Scenarios (Happy Path)

### Scenario 1 – Product Search

1. Open the Products page.
2. Use the search input to find a specific product by name.

Expected:

- Results update to match the search term.
- Clearing the search returns the full list.

### Scenario 2 – Issue Filters

1. Open the Issues view for a project.
2. Apply filters (e.g., by severity or category).

Expected:

- Filtered results correspond to selected filters.
- Removing filters restores the full list.

## Edge Cases

- Empty search query or whitespace only.
- Search terms with special characters.

## Error Handling

- If search/filter request fails, show an error and allow the user to retry or clear filters.

## Limits

- For large result sets, confirm performance is acceptable and feedback remains responsive.

## Regression

- Search and filter changes must not break pagination, tabs, or selection state.

## Post-Conditions

- Reset all filters/search back to default view.

## Known Issues

- Document any partial filter implementations or known gaps in search behavior.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
