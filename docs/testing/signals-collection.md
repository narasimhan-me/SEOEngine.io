# EngineO.ai – System-Level Manual Testing: DEO Signals Collection

> Cross-cutting manual tests for DEO signals extraction after crawls, bounds and ranges, missing data tolerance, and logging.

---

## Overview

- **Purpose of this testing doc:**
  - Validate the DEO signals collection process that extracts metrics from crawl results and product data to feed into DEO score computation.

- **High-level user impact and what "success" looks like:**
  - Signals are accurately extracted from crawl and product data.
  - Missing or incomplete data is handled gracefully.
  - Signal values fall within expected bounds.
  - Signals are available for DEO score computation.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 2.x (DEO scoring pipeline)
  - Phase 1.x (Crawl infrastructure)

- **Related documentation:**
  - `docs/ARCHITECTURE.md` (signals extraction)
  - `docs/API_SPEC.md` (signals endpoints)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database with crawl results and product data
  - [ ] At least one completed crawl for test project

- **Test accounts and sample data:**
  - [ ] Projects with completed crawls
  - [ ] Projects with synced products
  - [ ] Projects with various data completeness levels

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario 1: Signals extracted after successful crawl

**ID:** HP-001

**Preconditions:**

- Project has completed crawl with valid page data

**Steps:**

1. Complete a crawl
2. Trigger DEO score computation (or wait for auto-compute)
3. Fetch signals via API or inspect database

**Expected Results:**

- **Signals:** All expected signal types populated
- **Values:** Within valid ranges (0-100 or defined bounds)
- **Database:** DeoSignals record created/updated

---

### Scenario 2: Signals include crawl-derived metrics

**ID:** HP-002

**Preconditions:**

- Crawl completed with page metadata

**Steps:**

1. Review signals after crawl
2. Verify crawl-derived signals present

**Expected Results:**

- **Signals include:**
  - Page count
  - Pages with meta descriptions
  - Pages with proper titles
  - Technical health indicators
  - Schema/structured data presence

---

### Scenario 3: Signals include product-derived metrics

**ID:** HP-003

**Preconditions:**

- Project has synced products

**Steps:**

1. Sync products from Shopify
2. Trigger signals collection
3. Review product-derived signals

**Expected Results:**

- **Signals include:**
  - Product count
  - Products with SEO titles
  - Products with descriptions
  - Products with images

---

### Scenario 4: Signals update on re-crawl

**ID:** HP-004

**Preconditions:**

- Project has previous signals from earlier crawl

**Steps:**

1. Make changes to site (add pages, fix issues)
2. Run new crawl
3. Compare signals before/after

**Expected Results:**

- **Signals:** Updated to reflect new crawl data
- **History:** Previous signals preserved in snapshots
- **Delta:** Changes reflected accurately

---

## Edge Cases

### EC-001: Signals with no crawl data

**Description:** Project has no crawl results yet.

**Steps:**

1. Create new project
2. Attempt to fetch signals before any crawl

**Expected Behavior:**

- Signals endpoint returns empty/null gracefully
- No errors thrown
- UI shows "No data yet" state

---

### EC-002: Signals with no product data

**Description:** Project has crawl but no synced products.

**Steps:**

1. Run crawl without syncing products
2. Fetch signals

**Expected Behavior:**

- Crawl-derived signals present
- Product-derived signals zero or N/A
- Score computation handles partial data

---

### EC-003: Signals at boundary values

**Description:** Test signal values at 0%, 100%, and edge cases.

**Steps:**

1. Create scenarios with:
   - Perfect site (all pages have titles, descriptions)
   - Empty site (no content)
   - Mixed site

**Expected Behavior:**

- 100% signals when all criteria met
- 0% signals when no criteria met
- No values outside 0-100 range

---

### EC-004: Large dataset signals collection

**Description:** Signals from project with many pages/products.

**Steps:**

1. Project with 1000+ pages or products
2. Trigger signals collection
3. Verify performance and accuracy

**Expected Behavior:**

- Signals computed within reasonable time
- No timeout or memory issues
- Accurate aggregation

---

## Error Handling

### ERR-001: Database read failure during collection

**Scenario:** Cannot read crawl/product data for signals.

**Steps:**

1. Simulate database unavailability
2. Trigger signals collection

**Expected Behavior:**

- Collection fails gracefully
- Error logged
- Previous signals preserved
- Retry possible

---

### ERR-002: Malformed crawl data

**Scenario:** Crawl result contains unexpected/corrupted data.

**Steps:**

1. Introduce malformed data in crawl results
2. Trigger signals collection

**Expected Behavior:**

- Malformed records skipped
- Valid data still processed
- Warning logged
- Partial signals available

---

### ERR-003: Signals computation timeout

**Scenario:** Very large dataset causes computation to exceed limits.

**Steps:**

1. Large project triggers signals collection
2. Monitor for timeout

**Expected Behavior:**

- Timeout handled gracefully
- Partial results or retry
- Error logged

---

## Limits

### LIM-001: Signal value bounds

**Scenario:** All signals must be within defined ranges.

**Expected Behavior:**

- Percentage signals: 0-100
- Count signals: 0 to positive integer
- No NaN or undefined values in final output

---

### LIM-002: Data freshness requirements

**Scenario:** Signals should reflect recent data.

**Expected Behavior:**

- Signals tied to specific crawl timestamp
- Stale signals identifiable
- Re-computation available on demand

---

## Regression

### Areas potentially impacted:

- [ ] **DEO Score computation:** Ensure signals feed correctly into scoring
- [ ] **Crawl pipeline:** Ensure crawl completion triggers signals
- [ ] **API responses:** Ensure signals endpoint returns expected format
- [ ] **UI display:** Ensure signals summary renders correctly

### Quick sanity checks:

- [ ] Signals populated after crawl
- [ ] Signal values within bounds
- [ ] Signals API returns data
- [ ] Score uses current signals

---

## Post-Conditions

### Data cleanup steps:

- [ ] Reset test project signals if needed
- [ ] Clear test crawl data

### Follow-up verification:

- [ ] Signals consistent with crawl data
- [ ] No orphaned signal records

---

## Known Issues

- **Intentionally accepted issues:**
  - First signals may take longer as baseline is established

- **Out-of-scope items:**
  - Historical signal trending/graphs
  - Signal comparison between projects

- **TODOs:**
  - [ ] Add signal validation layer
  - [ ] Consider caching frequently-accessed signals

---

## Approval

| Field              | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| **Tester Name**    | [Pending]                                               |
| **Date**           | [YYYY-MM-DD]                                            |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                   |
| **Notes**          | Cross-cutting system-level tests for signals collection |
