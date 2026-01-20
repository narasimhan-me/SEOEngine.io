# Manual Testing: DRAFT-LIST-PARITY-1

> List-Level Draft Review Entrypoint Parity

## Overview

This phase ensures "Review drafts" actions on Pages and Collections list views route to the asset detail Drafts tab (NOT to Work Queue or Playbooks).

## Prerequisites

- Access to a project with connected Shopify store
- At least one page and one collection with `hasDraftPendingApply: true`
- Or use seed endpoint: `POST /testkit/e2e/seed-draft-field-coverage-1`

---

## Locked Routing (Do Not Modify Without Phase Approval)

| Asset Type  | "Review drafts" Routes To                                                            |
| ----------- | ------------------------------------------------------------------------------------ |
| Pages       | `/projects/{projectId}/assets/pages/{pageId}?tab=drafts&from=asset_list`             |
| Collections | `/projects/{projectId}/assets/collections/{collectionId}?tab=drafts&from=asset_list` |

**MUST NOT route to:**

- `/automation/playbooks` (any mode)
- `/work-queue`

---

## Test Scenarios

### Scenario 1: Pages List "Review drafts" Routing

**Route:** `/projects/{projectId}/assets/pages?hasDraft=true`

1. Navigate to Pages list filtered by hasDraft=true
2. Find a row with "Review drafts" action
3. Click "Review drafts"
4. **Verify:**
   - [ ] URL contains `/assets/pages/{pageId}`
   - [ ] URL contains `?tab=drafts`
   - [ ] URL contains `from=asset_list`
   - [ ] URL does NOT contain `/work-queue`
   - [ ] URL does NOT contain `/automation/playbooks`
   - [ ] Drafts tab panel (`data-testid="drafts-tab-panel"`) is visible
   - [ ] Current (live) vs Draft (staged) diff display is visible

---

### Scenario 2: Collections List "Review drafts" Routing

**Route:** `/projects/{projectId}/assets/collections?hasDraft=true`

1. Navigate to Collections list filtered by hasDraft=true
2. Find a row with "Review drafts" action
3. Click "Review drafts"
4. **Verify:**
   - [ ] URL contains `/assets/collections/{collectionId}`
   - [ ] URL contains `?tab=drafts`
   - [ ] URL contains `from=asset_list`
   - [ ] URL does NOT contain `/work-queue`
   - [ ] URL does NOT contain `/automation/playbooks`
   - [ ] Drafts tab panel (`data-testid="drafts-tab-panel"`) is visible
   - [ ] Current (live) vs Draft (staged) diff display is visible

---

### Scenario 3: "View issues" + "Open" Dual Actions (Pages)

**Route:** `/projects/{projectId}/assets/pages`

1. Navigate to Pages list
2. Find a row in "Needs attention" state (has issues but no pending drafts)
3. **Verify:**
   - [ ] Primary action is "View issues" (routes to Issues Engine with filters)
   - [ ] Secondary action is "Open" (routes to asset workspace/detail)
   - [ ] Both actions are visible in the row

---

### Scenario 4: "View issues" + "Open" Dual Actions (Collections)

**Route:** `/projects/{projectId}/assets/collections`

1. Navigate to Collections list
2. Find a row in "Needs attention" state
3. **Verify:**
   - [ ] Primary action is "View issues" (routes to Issues Engine)
   - [ ] Secondary action is "Open" (routes to asset workspace)
   - [ ] Both actions are visible in the row

---

## Parity Verification Checklist

| Feature                                | Pages | Collections |
| -------------------------------------- | ----- | ----------- |
| "Review drafts" routes to asset detail | [ ]   | [ ]         |
| URL contains `tab=drafts`              | [ ]   | [ ]         |
| URL contains `from=asset_list`         | [ ]   | [ ]         |
| Drafts tab panel visible               | [ ]   | [ ]         |
| Diff display visible                   | [ ]   | [ ]         |
| Does NOT route to Work Queue           | [ ]   | [ ]         |
| Does NOT route to Playbooks            | [ ]   | [ ]         |

---

## Seed Endpoint

For automated testing, use:

```
POST /testkit/e2e/seed-draft-field-coverage-1
```

Returns pages and collections with `hasDraftPendingApply: true` that will display "Review drafts" actions.

---

## Notes

- Products already route to Product detail Drafts tab (DRAFT-ENTRYPOINT-UNIFICATION-1)
- This phase extends that behavior to Pages and Collections
- Draft review remains a human-only surface (non-AI boundary preserved)
