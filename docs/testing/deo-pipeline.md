# EngineO.ai – System-Level Manual Testing: DEO Pipeline & Crawl Flow

> Cross-cutting manual tests for crawl triggers, worker execution, status transitions, and crawl error handling.

---

## Overview

- **Purpose of this testing doc:**
  - Validate the complete DEO crawl pipeline from trigger to completion, including manual and automatic crawl initiation, worker execution, status state machine, and error recovery.

- **High-level user impact and what "success" looks like:**
  - Users can trigger crawls manually and via scheduled automation.
  - Crawl status is accurately reflected in the UI throughout the process.
  - Crawl results are persisted and available for DEO scoring.
  - Errors are handled gracefully with clear feedback.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 1.x (Crawl infrastructure)
  - Phase 2.x (DEO scoring pipeline)

- **Related documentation:**
  - `docs/ARCHITECTURE.md` (crawl worker architecture)
  - `docs/API_SPEC.md` (crawl endpoints)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running with crawl worker initialized
  - [ ] Database accessible for crawl result storage
  - [ ] Redis/queue system running (if applicable)
  - [ ] Valid test domains accessible for crawling

- **Test accounts and sample data:**
  - [ ] Projects with valid connected domains
  - [ ] Projects with various crawl states (never crawled, recently crawled, stale)
  - [ ] Test domains with known page counts

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario 1: Manual crawl trigger from Overview page

**ID:** HP-001

**Preconditions:**

- User has a project with a connected domain
- No crawl currently in progress

**Steps:**

1. Navigate to Project Overview
2. Click "Run Crawl" or "Scan Now" button
3. Observe status indicator
4. Wait for crawl completion

**Expected Results:**

- **UI:** Button shows loading state, status changes to "Crawling..."
- **API:** `POST /api/projects/:id/crawl` returns 200/202
- **Database:** CrawlResult record created with status transitions
- **Completion:** Status shows "Complete", results available

---

### Scenario 2: Automatic scheduled crawl execution

**ID:** HP-002

**Preconditions:**

- Project has crawl frequency set (DAILY/WEEKLY/MONTHLY)
- Scheduled time has arrived

**Steps:**

1. Configure project crawl frequency
2. Wait for scheduled trigger (or manually trigger scheduler)
3. Observe crawl execution

**Expected Results:**

- **Worker:** Crawl job picked up and executed
- **Database:** CrawlResult created with `triggeredBy: SCHEDULED`
- **Project:** `lastCrawledAt` updated

---

### Scenario 3: Crawl status transitions

**ID:** HP-003

**Preconditions:**

- Crawl in progress

**Steps:**

1. Trigger a crawl
2. Poll status endpoint or observe UI
3. Track status through: PENDING → RUNNING → COMPLETE

**Expected Results:**

- **Status flow:** PENDING → RUNNING → COMPLETE (or FAILED)
- **Timing:** Each transition logged with timestamp
- **UI:** Status reflected accurately in real-time or on refresh

---

### Scenario 4: Crawl discovers and stores pages

**ID:** HP-004

**Preconditions:**

- Domain has multiple crawlable pages

**Steps:**

1. Trigger crawl on multi-page site
2. Wait for completion
3. Review crawl results

**Expected Results:**

- **Database:** Multiple page records in CrawlResult
- **Metrics:** Page count, crawl duration recorded
- **Data:** Per-page metadata (title, description, status codes) stored

---

## Edge Cases

### EC-001: Crawl on domain with no pages / empty site

**Description:** Target domain returns no crawlable content.

**Steps:**

1. Connect a domain that returns 404 or empty response
2. Trigger crawl

**Expected Behavior:**

- Crawl completes with 0 pages
- Status: COMPLETE (not FAILED)
- User informed of empty result

---

### EC-002: Very large site (1000+ pages)

**Description:** Crawl on site with many pages tests pagination and timeouts.

**Steps:**

1. Trigger crawl on large site
2. Monitor progress
3. Verify completion

**Expected Behavior:**

- Crawl respects page limits per plan
- Progress updates shown
- Completes within timeout or gracefully stops at limit

---

### EC-003: Domain with redirect chains

**Description:** Site has multiple redirects (301/302).

**Steps:**

1. Crawl domain with redirect chains
2. Review results

**Expected Behavior:**

- Final destination pages crawled
- Redirect chain noted in results
- No infinite loops

---

### EC-004: Concurrent crawl requests

**Description:** User triggers crawl while one is already running.

**Steps:**

1. Start a crawl
2. Immediately try to start another

**Expected Behavior:**

- Second request rejected or queued
- Clear message: "Crawl already in progress"
- No duplicate crawl jobs

---

## Error Handling

### ERR-001: Domain unreachable / DNS failure

**Scenario:** Target domain cannot be resolved or connected.

**Steps:**

1. Connect invalid/unreachable domain
2. Trigger crawl

**Expected Behavior:**

- Status: FAILED
- Error message: "Could not reach domain"
- User can retry after fixing domain

---

### ERR-002: HTTP errors (5xx from target)

**Scenario:** Target site returns server errors.

**Steps:**

1. Crawl site returning 500 errors

**Expected Behavior:**

- Individual page errors recorded
- Crawl continues for other pages
- Summary shows error count

---

### ERR-003: Crawl timeout

**Scenario:** Crawl exceeds maximum allowed time.

**Steps:**

1. Trigger crawl on very slow site
2. Wait for timeout

**Expected Behavior:**

- Crawl terminates at timeout
- Status: FAILED or PARTIAL
- Partial results preserved
- User informed of timeout

---

### ERR-004: Worker/queue failure

**Scenario:** Crawl worker crashes or queue is unavailable.

**Steps:**

1. Simulate worker failure during crawl

**Expected Behavior:**

- Status: FAILED
- Error logged for debugging
- Job can be retried
- No data corruption

---

### ERR-005: Database write failure during crawl

**Scenario:** Cannot persist crawl results.

**Steps:**

1. Simulate database unavailability during crawl

**Expected Behavior:**

- Crawl fails gracefully
- Error logged
- User notified of failure
- Can retry when DB available

---

## Limits

### LIM-001: Page limit per crawl by plan

**Scenario:** Verify crawl respects plan-based page limits.

| Plan     | Max Pages |
| -------- | --------- |
| Free     | 50        |
| Pro      | 500       |
| Business | 5000      |

**Steps:**

1. Crawl site with more pages than limit
2. Verify crawl stops at limit

**Expected Behavior:**

- Crawl stops at plan limit
- User informed of limit
- Upgrade prompt shown

---

### LIM-002: Crawl frequency limits

**Scenario:** Verify minimum time between crawls.

**Steps:**

1. Complete a crawl
2. Immediately try to crawl again

**Expected Behavior:**

- Rate limit enforced (e.g., 1 crawl per hour for Free)
- Clear messaging about when next crawl available

---

## Regression

### Areas potentially impacted:

- [ ] **DEO Score computation:** Ensure crawl data feeds into scoring
- [ ] **Issues Engine:** Ensure crawl surfaces DEO issues
- [ ] **Product sync:** Ensure crawl doesn't interfere with product data
- [ ] **Billing:** Ensure crawl limits tied to subscription

### Quick sanity checks:

- [ ] Manual crawl trigger works
- [ ] Crawl results appear in UI
- [ ] DEO Score updates after crawl
- [ ] Status indicators accurate

---

## Post-Conditions

### Data cleanup steps:

- [ ] Delete test crawl results if needed
- [ ] Reset test project crawl states
- [ ] Clear any stuck jobs from queue

### Follow-up verification:

- [ ] Crawl worker healthy
- [ ] Queue processing normally
- [ ] No orphaned crawl jobs

---

## Known Issues

- **Intentionally accepted issues:**
  - Very large sites may take significant time; users should expect delays

- **Out-of-scope items:**
  - JavaScript rendering / SPA crawling (future enhancement)
  - Authenticated page crawling

- **TODOs:**
  - [ ] Add crawl progress streaming to UI
  - [ ] Consider incremental/delta crawls

---

## Approval

| Field              | Value                                             |
| ------------------ | ------------------------------------------------- |
| **Tester Name**    | [Pending]                                         |
| **Date**           | [YYYY-MM-DD]                                      |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed             |
| **Notes**          | Cross-cutting system-level tests for DEO pipeline |
