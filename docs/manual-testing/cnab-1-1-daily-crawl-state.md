# CNAB-1.1 – Daily Crawl Setup State Consistency

Phase: CNAB-1.1 – Daily Crawl Setup State Consistency
Status: Implementation complete
Scope: UX consistency for daily crawl setup across Overview surfaces

## Overview

CNAB-1.1 ensures consistent state feedback when users enable daily crawls from the Project Overview page. The UI reflects the current setup state (IDLE, SETTING_UP, ENABLED, ERROR) across:

- First DEO Win Status Ribbon
- Auto Crawl card in Diagnostics section

---

## Pre-requisites

- User on a plan that supports auto-crawl (Pro or Business recommended).
- Project with:
  - Connected source.
  - At least one crawl completed.
  - DEO Score computed.
  - 3+ products optimized (to see the First DEO Win ribbon).

---

## 1. First DEO Win Ribbon – Daily Crawl States

Path: /projects/{projectId}/overview

### 1.1 IDLE – Daily crawls not yet enabled

Goal: When daily crawls are not enabled, show a button to set them up.

Setup:

- Ensure project has `autoCrawlEnabled: false` or `crawlFrequency` is not `'DAILY'`.
- Complete the First DEO Win checklist (connect source, run crawl, get DEO score, optimize 3 products).

Steps:

1. Navigate to Project Overview.
2. Confirm the green "First DEO Win" ribbon appears.

Expected:

- Ribbon shows "Set up daily crawls" as a clickable button.
- Clicking the button:
  - Shows "Setting up daily crawls…" with spinner (SETTING_UP state).
  - On success, shows "Daily crawls enabled" with checkmark (ENABLED state).
  - On failure, shows "Retry daily crawls setup" in red (ERROR state).

### 1.2 SETTING_UP – Request in progress

Goal: While the API request is pending, show loading state.

Steps:

1. Click "Set up daily crawls" button.

Expected:

- Button is replaced with "Setting up daily crawls…" text and spinner.
- No duplicate actions can be triggered during this state.

### 1.3 ENABLED – Daily crawls active

Goal: When daily crawls are already enabled, show confirmation.

Setup:

- Project has `autoCrawlEnabled: true` and `crawlFrequency: 'DAILY'`.

Steps:

1. Navigate to Project Overview.

Expected:

- Ribbon shows "Daily crawls enabled" with green checkmark.
- No setup button is visible.

### 1.4 ERROR – Setup failed

Goal: When setup fails, allow retry.

Setup:

- Simulate a failure (e.g., network error or API issue).

Steps:

1. Click "Set up daily crawls" button.
2. Observe failure.

Expected:

- Ribbon shows "Retry daily crawls setup" in red with warning icon.
- Clicking retry attempts the setup again.

---

## 2. Auto Crawl Card – Daily Crawl States

Path: /projects/{projectId}/overview → Diagnostics & system details → Auto Crawl card

### 2.1 ENABLED state

Setup:

- Project has daily crawls enabled.

Steps:

1. Navigate to Project Overview.
2. Expand "Diagnostics & system details".

Expected:

- Auto Crawl card shows:
  - Green checkmark icon.
  - "Enabled (Daily)" text.
  - "Configure" link to project settings.

### 2.2 SETTING_UP state

Steps:

1. Click "Enable daily crawls" button in the Auto Crawl card (if visible).

Expected:

- Shows spinner with "Setting up daily crawls…" text.
- Transitions to ENABLED on success, ERROR on failure.

### 2.3 ERROR state

Setup:

- Trigger a setup failure.

Steps:

1. Observe the Auto Crawl card after failure.

Expected:

- Shows red warning icon.
- "Failed to enable" text.
- "Retry" button to attempt setup again.

### 2.4 IDLE state (Disabled)

Setup:

- Project has `autoCrawlEnabled: false`.

Steps:

1. Navigate to Project Overview.
2. Expand "Diagnostics & system details".

Expected:

- Auto Crawl card shows:
  - Gray X icon.
  - "Disabled" text.
  - "Enable daily crawls" button.
  - "Configure" link to project settings.

---

## 3. Cross-cutting State Consistency Checks

For all surfaces:

- [ ] State is consistent between First DEO Win ribbon and Auto Crawl card.
- [ ] Optimistic UI: SETTING_UP shows immediately on click.
- [ ] Success feedback: Toast notification appears on successful setup.
- [ ] Error feedback: Toast notification appears on failure.
- [ ] State persists correctly after page refresh (based on server data).
- [ ] "Configure" link always navigates to `/projects/{id}/settings`.

---

## Sign-off

| Tester | Date | Result |
| ------ | ---- | ------ |
|        |      |        |
