# EngineO.ai – Manual Testing: Navigation & Layout System

## Overview

- Validate global navigation and layout behavior across the app, including:
  - Sidebar navigation.
  - Project switching.
  - Settings navigation.
- Ensure users can reliably reach all major areas without broken links or confusing states.

## Preconditions

- Frontend running with authenticated access for a test user.
- At least one workspace/project created.
- If applicable, multiple projects so project switching can be exercised.

## Test Scenarios (Happy Path)

### Scenario 1 – Primary Navigation Flow

1. Sign in as a test user.
2. Use the main navigation elements to visit:
   - Dashboard (if present).
   - Projects list.
   - Project Overview.
   - Products.
   - Settings.
3. Switch between sections several times.

Expected:

- Navigation links work and route to the correct pages.
- Layout (header/sidebar) remains consistent and stable.
- No unexpected full-page reloads or blank states.

### Scenario 2 – Project Switching

1. With multiple projects available, switch between them via the Projects list or sidebar.
2. Open each project's Overview and Products pages.

Expected:

- The correct project name and data appear for each page.
- Breadcrumbs and titles update appropriately.

## Edge Cases

- Very small viewport (mobile) – sidebar collapse/expand behavior.
- Long project names – ensure layout doesn't break or overflow.

## Error Handling

- If a route fails to load (e.g., 404/500), user sees a friendly error page with a way back to a safe location (e.g., Projects).

## Limits

- Confirm navigation remains responsive even when many projects exist (basic sanity).

## Regression

- Changes to navigation/layout should not:
  - Break deep links.
  - Hide or remove critical routes (Projects, Settings, etc.).

## Post-Conditions

- Sign out and confirm user is returned to the appropriate public page.

## Known Issues

- Document any known layout quirks or routes still in development.

## Approval

| Tester | Date | Environment | Status | Notes |
| ------ | ---- | ----------- | ------ | ----- |
|        |      |             |        |       |
