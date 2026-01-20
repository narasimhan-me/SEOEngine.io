# EngineO.ai – System-Level Manual Testing: Sync Status & Progress Feedback

> Cross-cutting manual tests for in-UI status indicators, partial failure UX, long-running sync behavior, and hard failure handling.

---

## Overview

- **Purpose of this testing doc:**
  - Validate sync status indicators, progress feedback, and error communication across all sync operations (product sync, metadata sync, crawl).

- **High-level user impact and what "success" looks like:**
  - Users always know the current sync status.
  - Progress is visible for long-running operations.
  - Partial failures are clearly communicated.
  - Hard failures are recoverable.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - All sync-related phases
  - Phase UX-6 (Onboarding feedback)

- **Related documentation:**
  - `docs/testing/frontend-ux-feedback-and-limits.md` (general UX patterns)
  - `docs/ARCHITECTURE.md` (sync architecture)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Shopify store connected
  - [ ] Products and crawl data available

- **Test accounts and sample data:**
  - [ ] Projects in various sync states
  - [ ] Large catalogs for long sync testing

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with connected store

---

## Test Scenarios (Happy Path)

### Scenario 1: Product sync shows progress indicator

**ID:** HP-001

**Preconditions:**

- Shopify connected with products

**Steps:**

1. Click "Sync Products"
2. Observe UI during sync
3. Wait for completion

**Expected Results:**

- **Button:** Shows loading/spinner state
- **Progress:** "Syncing..." or progress indicator visible
- **Completion:** Success message with counts
- **UI:** Products list updates

---

### Scenario 2: Crawl shows status progression

**ID:** HP-002

**Preconditions:**

- Project with crawlable domain

**Steps:**

1. Start crawl
2. Observe status changes
3. Wait for completion

**Expected Results:**

- **Status:** PENDING → RUNNING → COMPLETE shown
- **UI:** Status badge updates in real-time or on poll
- **Completion:** Results available, status shows "Complete"

---

### Scenario 3: SEO apply shows confirmation

**ID:** HP-003

**Preconditions:**

- AI suggestion ready to apply

**Steps:**

1. Click "Apply to Shopify"
2. Observe feedback
3. Note completion

**Expected Results:**

- **Loading:** Button shows applying state
- **Success:** Toast/message confirms apply
- **Product:** Updated status indicator

---

### Scenario 4: Bulk operation shows batch progress

**ID:** HP-004

**Preconditions:**

- Multiple items selected for bulk operation

**Steps:**

1. Select 10 products
2. Bulk apply AI suggestions
3. Observe progress

**Expected Results:**

- **Progress:** "3 of 10 complete" or progress bar
- **Updates:** Real-time progress updates
- **Completion:** Summary of results

---

## Edge Cases

### EC-001: Page refresh during sync

**Description:** User refreshes page while sync in progress.

**Steps:**

1. Start long sync operation
2. Refresh browser page
3. Return to sync page

**Expected Behavior:**

- Sync continues in background
- Refreshed page shows current status
- No duplicate sync started
- Progress resumes where left off (or shows current state)

---

### EC-002: Navigate away during sync

**Description:** User navigates to different page during sync.

**Steps:**

1. Start sync
2. Navigate to different section
3. Return to sync page

**Expected Behavior:**

- Sync continues
- Status accurate when returning
- No disruption to operation

---

### EC-003: Very long-running sync (> 60 seconds)

**Description:** Sync takes extended time.

**Steps:**

1. Large catalog sync
2. Monitor for extended period

**Expected Behavior:**

- Progress updates continue
- No timeout on UI side
- User can do other tasks
- Completion eventually shown

---

### EC-004: Multiple concurrent syncs

**Description:** User triggers multiple sync types simultaneously.

**Steps:**

1. Start product sync
2. Start crawl while sync running
3. Observe both

**Expected Behavior:**

- Both operations proceed (or queued)
- Independent status for each
- No conflicts or data corruption
- Both complete successfully

---

## Error Handling

### ERR-001: Partial sync failure feedback

**Scenario:** Some items in batch fail.

**Steps:**

1. Bulk operation with some failures
2. Observe completion message

**Expected Behavior:**

- Summary: "8 succeeded, 2 failed"
- Failed items identifiable
- Retry option for failures
- Successful items not repeated

---

### ERR-002: Complete sync failure

**Scenario:** Entire sync operation fails.

**Steps:**

1. Trigger sync when backend has issues

**Expected Behavior:**

- Error message shown
- Reason if available
- Retry button
- Previous data preserved

---

### ERR-003: Network disconnect during sync

**Scenario:** Connection lost mid-sync.

**Steps:**

1. Start sync
2. Disconnect network
3. Observe behavior

**Expected Behavior:**

- Error detected and shown
- "Network error" message
- Retry when connection restored
- Sync can resume or restart

---

### ERR-004: Timeout error feedback

**Scenario:** Sync times out.

**Steps:**

1. Very slow sync hits timeout

**Expected Behavior:**

- Timeout message shown
- Partial results if any
- Can retry
- Clear about what completed

---

## Limits

### LIM-001: Status polling frequency

**Scenario:** How often UI checks status.

**Expected Behavior:**

- Reasonable polling interval (e.g., 2-5 seconds)
- No excessive API calls
- Real-time feel without overload

---

### LIM-002: Progress detail level

**Scenario:** Granularity of progress updates.

**Expected Behavior:**

- Count-based for discrete items
- Percentage for continuous operations
- Consistent across similar operations

---

## Regression

### Areas potentially impacted:

- [ ] **Product sync:** Status during sync
- [ ] **Crawl:** Status transitions
- [ ] **SEO apply:** Apply feedback
- [ ] **Global toast system:** Toast notifications

### Quick sanity checks:

- [ ] Sync button shows loading
- [ ] Success message appears
- [ ] Error shows retry option
- [ ] Progress visible for long operations

---

## Post-Conditions

### Data cleanup steps:

- [ ] Complete any in-progress syncs
- [ ] Clear stuck sync states if any

### Follow-up verification:

- [ ] No orphaned sync jobs
- [ ] UI reflects accurate states

---

## Known Issues

- **Intentionally accepted issues:**
  - Status polling may have slight delay vs. real-time

- **Out-of-scope items:**
  - WebSocket real-time updates (future enhancement)
  - Sync history/audit log

- **TODOs:**
  - [ ] Consider WebSocket for real-time updates
  - [ ] Add sync history view

---

## Approval

| Field              | Value                                                     |
| ------------------ | --------------------------------------------------------- |
| **Tester Name**    | [Pending]                                                 |
| **Date**           | [YYYY-MM-DD]                                              |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                     |
| **Notes**          | Cross-cutting system-level tests for sync status feedback |
