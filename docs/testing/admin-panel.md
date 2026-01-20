# EngineO.ai – Manual Testing: Admin Panel

## Overview

- Validate admin-facing UI (if present), including:
  - Overview metrics.
  - User/project listings.
  - Subscription views.

## Preconditions

- Admin user account available.
- Admin routes enabled (e.g., /admin and subroutes).

## Test Scenarios (Happy Path)

### Scenario 1 – Admin Access & Navigation

1. Sign in as admin.
2. Navigate through admin sections (overview, users, projects, subscriptions).

Expected:

- Pages load correctly and show expected data.
- Non-admin users cannot access these routes.

## Edge Cases

- Behavior when there are many users/projects (basic sanity).

## Error Handling

- Admin pages should show clear messages if data is temporarily unavailable.

## Regression

- Admin UI changes must not affect end-user app navigation or permissions.

## Post-Conditions

- Sign out and confirm admin routes are no longer accessible.

## Known Issues

- Document any admin features still stubbed or placeholder-only.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
