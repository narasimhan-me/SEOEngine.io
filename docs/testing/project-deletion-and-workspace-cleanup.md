# EngineO.ai – Manual Testing: Project Deletion & Workspace Cleanup

## Overview

- Validate that deleting a project:
  - Removes or appropriately cleans up related data (integrations, products, crawl results, snapshots).
  - Does not leave inconsistent UI or orphaned records.

## Preconditions

- Test user with at least one project that can be safely deleted.

## Test Scenarios (Happy Path)

### Scenario 1 – Delete Project via UI

1. Open Projects list.
2. Delete a project via its delete control, confirming any dialog as required.

Expected:

- Project disappears from list.
- Attempts to access that project's routes return a safe error or redirect.

## Edge Cases

- Project with active integrations or recent crawls:
  - Ensure associated data is handled according to design (e.g., cascaded deletes).

## Error Handling

- If deletion fails (e.g., DB error), user sees a clear error and project is not half-deleted.

## Regression

- Project deletion should not impact other projects for the same user.

## Post-Conditions

- Confirm any related records (integrations, products, crawls, snapshots) are removed or safely retained per design.

## Known Issues

- Note any known cleanup gaps for future iteration.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
