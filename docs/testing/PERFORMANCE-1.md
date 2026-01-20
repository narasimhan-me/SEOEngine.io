# PERFORMANCE-1: Discovery-Critical Performance Signals – Manual Testing

> Phase: PERFORMANCE-1
> Testing Priority: High
> Estimated Time: 20-30 minutes

## Prerequisites

1. Local development environment running:
   - API server: `pnpm --filter api dev`
   - Web app: `pnpm --filter web dev`
   - Redis (optional, for queue-based crawls)

2. Test project with Shopify integration connected

3. Access to browser DevTools for inspecting API responses

## Test Cases

### 1. Crawl Signal Detection

**Objective:** Verify that the crawler captures PERFORMANCE-1 signals correctly.

#### 1.1 Render-blocking Resources Detection

**Steps:**

1. Navigate to a project with synced products
2. Trigger a crawl via Settings → Run Crawl
3. Wait for crawl to complete
4. Open DevTools → Network tab
5. Navigate to Technical & Indexability page
6. Inspect the `/projects/{id}/deo-issues` response

**Expected Result:**

- If pages have `<script>` tags in `<head>` without async/defer, should see `render_blocking_resources` issue
- Issue should include `signalType: "render_blocking"`
- Issue should include `pillarId: "technical_indexability"`

**Pass Criteria:**

- [ ] Render-blocking detection works for pages with blocking scripts
- [ ] No false positives for async/defer/module scripts

#### 1.2 Indexability Conflict Detection

**Steps:**

1. If your test site has pages with `noindex` meta or canonical conflicts, verify detection
2. Check crawl results for `NOINDEX`, `META_ROBOTS_NOINDEX`, or `CANONICAL_CONFLICT` issues

**Expected Result:**

- Pages with `<meta name="robots" content="noindex">` flagged
- Pages with `X-Robots-Tag: noindex` header flagged
- Pages with canonical pointing elsewhere flagged

**Pass Criteria:**

- [ ] Noindex meta detection works
- [ ] X-Robots-Tag header detection works (if applicable)
- [ ] Canonical conflict detection works

#### 1.3 Page Weight Detection

**Steps:**

1. Check if any crawled pages have large HTML (>500KB)
2. Look for `LARGE_HTML` or `VERY_LARGE_HTML` issues in crawl results

**Expected Result:**

- Pages with HTML >500KB flagged as LARGE_HTML
- Pages with HTML >1MB flagged as VERY_LARGE_HTML
- `excessive_page_weight` or `slow_initial_response` issues created

**Pass Criteria:**

- [ ] HTML byte calculation is accurate
- [ ] Thresholds correctly applied (500KB, 1MB)

#### 1.4 Mobile Readiness Detection

**Steps:**

1. Check for pages missing viewport meta tag
2. Look for `MISSING_VIEWPORT_META` or `POTENTIAL_MOBILE_LAYOUT_ISSUE` issues

**Expected Result:**

- Pages without `<meta name="viewport">` flagged
- Pages with static viewport widths flagged

**Pass Criteria:**

- [ ] Missing viewport detection works
- [ ] Static viewport detection works

### 2. Issue Builder Verification

**Objective:** Verify that DEO issues are correctly built from crawl signals.

#### 2.1 Issue Type Mapping

**Steps:**

1. Trigger a crawl on a project
2. Call `GET /projects/{id}/deo-issues`
3. Verify PERFORMANCE issues appear with correct structure

**Expected Response Fields:**

```json
{
  "id": "render_blocking_resources",
  "type": "render_blocking_resources",
  "title": "Render-blocking Resources Detected",
  "description": "...",
  "severity": "warning" | "critical",
  "pillarId": "technical_indexability",
  "signalType": "render_blocking",
  "count": <number>,
  "affectedPages": [...]
}
```

**Pass Criteria:**

- [ ] All 5 PERFORMANCE issue types can be generated
- [ ] Severity calculation follows threshold rules
- [ ] affectedPages array populated correctly

#### 2.2 Severity Thresholds

| Issue Type                | Warning Threshold | Critical Threshold |
| ------------------------- | ----------------- | ------------------ |
| render_blocking_resources | ≥3 pages          | ≥5 pages           |
| indexability_conflict     | N/A               | Always critical    |
| slow_initial_response     | >10% pages        | >25% pages         |
| excessive_page_weight     | >5% pages         | >10% pages         |
| mobile_rendering_risk     | >10% pages        | >25% pages         |

**Pass Criteria:**

- [ ] Warning thresholds correctly applied
- [ ] Critical thresholds correctly applied
- [ ] Percentage-based thresholds calculated correctly

### 3. Frontend Scorecard

**Objective:** Verify the Performance for Discovery scorecard displays correctly.

#### 3.1 Scorecard Rendering

**Steps:**

1. Navigate to `/projects/{id}/performance`
2. Verify scorecard component renders
3. Check signal breakdown cards

**Expected Result:**

- "Performance for Discovery" scorecard visible
- Status badge shows Strong/Needs improvement/Risky
- 5 signal cards displayed (one per signal type)
- Each card shows issue count and status

**Pass Criteria:**

- [ ] Scorecard renders without errors
- [ ] Status calculation matches issue data
- [ ] Signal breakdown shows correct counts

#### 3.2 Signal Status Colors

| Status          | Background Color | Text Color |
| --------------- | ---------------- | ---------- |
| ok              | green-50         | green-700  |
| needs_attention | yellow-50        | yellow-700 |
| risky           | red-50           | red-700    |

**Pass Criteria:**

- [ ] Green for OK signals (0 issues)
- [ ] Yellow for needs_attention (1-4 issues)
- [ ] Red for risky (5+ issues or critical)

#### 3.3 Issue List

**Steps:**

1. Scroll down to "Performance Issues" section
2. Verify issues are listed with correct metadata

**Expected Result:**

- Issues displayed with title, description, severity badge
- Count shows number of affected pages
- Severity badges color-coded correctly

**Pass Criteria:**

- [ ] Issues list renders when issues exist
- [ ] Issues list hidden when no issues
- [ ] Severity badges match issue data

### 4. Issues Engine Integration

**Objective:** Verify PERFORMANCE issues appear in Issues Engine.

#### 4.1 Pillar Filtering

**Steps:**

1. Navigate to `/projects/{id}/issues`
2. Filter by "Technical & Indexability" pillar
3. Verify PERFORMANCE issues appear

**Expected Result:**

- PERFORMANCE issues grouped under Technical pillar
- Issue cards show correct labels from `ISSUE_UI_CONFIG`
- Links to fix/details work

**Pass Criteria:**

- [ ] PERFORMANCE issues appear in Issues Engine
- [ ] Correct pillar assignment
- [ ] Issue labels match config

### 5. Edge Cases

#### 5.1 No Performance Issues

**Steps:**

1. Test with a project that has no performance issues
2. Navigate to Performance page

**Expected Result:**

- Scorecard shows "Strong" status
- All signal cards show "OK" with 0 count
- No issues list displayed

**Pass Criteria:**

- [ ] Strong status when no issues
- [ ] All signals show OK
- [ ] No error states

#### 5.2 New Project (No Crawl Data)

**Steps:**

1. Create a new project without running a crawl
2. Navigate to Performance page

**Expected Result:**

- "No Performance Data Available" placeholder shown
- Link to Settings provided
- No scorecard displayed

**Pass Criteria:**

- [ ] Empty state renders correctly
- [ ] No errors when no data

#### 5.3 Mixed Severity Issues

**Steps:**

1. Test with a project that has both warning and critical issues
2. Verify overall status calculation

**Expected Result:**

- If any critical issue exists → "Risky" status
- Multiple warning issues should escalate to "Needs improvement"

**Pass Criteria:**

- [ ] Critical issues correctly escalate overall status
- [ ] Warning accumulation works correctly

## Regression Tests

After completing PERFORMANCE-1, verify these existing features still work:

1. [ ] Existing Technical pillar issues still appear (crawl_health_errors, indexability_problems)
2. [ ] DEO Score still computes correctly
3. [ ] Issues Engine grouping by pillar works
4. [ ] Product-level issues unaffected

## Known Limitations

1. **No Real TTFB Measurement:** HTML size used as proxy for TTFB
2. **No JavaScript Execution Analysis:** Static HTML analysis only
3. **No Core Web Vitals:** CrUX API integration planned for future phase
4. **Render-blocking Heuristic:** May miss some edge cases (inline styles, etc.)

## Troubleshooting

### Issues Not Appearing

1. Verify crawl completed successfully
2. Check API logs for issue builder errors
3. Verify crawl results contain PERFORMANCE-related issues

### Incorrect Issue Counts

1. Check `affectedPages` array in issue response
2. Verify threshold calculations in `deo-issues.service.ts`
3. Check if duplicate URLs being counted

### Scorecard Not Loading

1. Check browser console for errors
2. Verify API returns 200 for `/projects/{id}/deo-issues`
3. Check if project ID is valid

## Sign-off

| Test Area                  | Tester | Date | Pass/Fail |
| -------------------------- | ------ | ---- | --------- |
| Crawl Signal Detection     |        |      |           |
| Issue Builder Verification |        |      |           |
| Frontend Scorecard         |        |      |           |
| Issues Engine Integration  |        |      |           |
| Edge Cases                 |        |      |           |
| Regression Tests           |        |      |           |
