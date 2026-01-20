# INSIGHTS-1: Project Insights Dashboard - Manual Testing Guide

**Feature:** Read-only derived insights dashboard
**Critical Path:** CP-016
**Date:** 2025-12-19

---

## Overview

The Project Insights Dashboard provides read-only analytics computed from existing project data. It displays DEO progress, AI efficiency metrics, issue resolution stats, and opportunity signals without triggering any AI operations or mutations.

---

## Prerequisites

### Test Environment Setup

1. Start API and web servers:

   ```bash
   pnpm --filter api dev
   pnpm --filter web dev
   ```

2. Seed test data using the insights seed endpoint:

   ```bash
   curl -X POST http://localhost:3001/testkit/e2e/seed-insights-1
   ```

3. Note the returned `accessToken` and `projectId` for testing.

---

## Test Scenarios

### 1. Insights API Endpoint

**Endpoint:** `GET /projects/:projectId/insights`

| Step | Action                                         | Expected Result                                                                                           |
| ---- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | Call insights endpoint with valid auth         | Returns 200 with `ProjectInsightsResponse`                                                                |
| 2    | Verify response structure                      | Contains `projectId`, `generatedAt`, `window`, `overview`, `progress`, `issueResolution`, `opportunities` |
| 3    | Verify `overview.saved.trust.invariantMessage` | Contains "Apply never uses AI"                                                                            |
| 4    | Verify `overview.saved.trust.applyAiRuns`      | Equals 0                                                                                                  |
| 5    | Call endpoint without auth                     | Returns 401 Unauthorized                                                                                  |
| 6    | Call with invalid projectId                    | Returns 404 Not Found                                                                                     |

**cURL Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/projects/$PROJECT_ID/insights
```

---

### 2. Insights Overview Page

**URL:** `/projects/:projectId/insights`

| Step | Action                         | Expected Result                                                                            |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| 1    | Navigate to insights page      | Page loads with overview cards                                                             |
| 2    | Verify "Improved" card         | Shows DEO score with delta and trend indicator                                             |
| 3    | Verify "Saved" card            | Shows AI runs used/avoided and reuse rate                                                  |
| 4    | Verify "Resolved" card         | Shows actions count with explanation                                                       |
| 5    | Verify "Next Opportunity" card | Shows recommended next action with link                                                    |
| 6    | Verify subnav tabs             | Shows Overview, DEO Progress, AI Efficiency, Issue Resolution, Opportunities, GEO Insights |

---

### 3. DEO Progress Page

**URL:** `/projects/:projectId/insights/deo-progress`

| Step | Action                         | Expected Result                                         |
| ---- | ------------------------------ | ------------------------------------------------------- |
| 1    | Navigate to DEO Progress tab   | Page loads with DEO trends                              |
| 2    | Verify sparkline visualization | Shows DEO score trend over time                         |
| 3    | Verify component deltas        | Lists each component with current/previous/delta values |
| 4    | Verify open issues breakdown   | Shows critical/warning/info counts                      |
| 5    | Verify fixes applied trend     | Shows daily fix counts by pillar                        |

---

### 4. AI Efficiency Page

**URL:** `/projects/:projectId/insights/ai-efficiency`

| Step | Action                           | Expected Result                            |
| ---- | -------------------------------- | ------------------------------------------ |
| 1    | Navigate to AI Efficiency tab    | Page loads with AI metrics                 |
| 2    | Verify trust invariant display   | Shows "Apply never uses AI" prominently    |
| 3    | Verify `applyAiRuns = 0` display | Confirms zero AI runs for apply operations |
| 4    | Verify AI runs used count        | Shows total AI runs consumed               |
| 5    | Verify reuse rate                | Shows percentage of runs avoided via cache |
| 6    | Verify quota display             | Shows limit/used/remaining if applicable   |

---

### 5. Issue Resolution Page

**URL:** `/projects/:projectId/insights/issue-resolution`

| Step | Action                           | Expected Result                            |
| ---- | -------------------------------- | ------------------------------------------ |
| 1    | Navigate to Issue Resolution tab | Page loads with issue metrics              |
| 2    | Verify by-pillar breakdown       | Shows open/resolved/total for each pillar  |
| 3    | Verify avg time to fix           | Shows hours (or null if no data)           |
| 4    | Verify recently resolved list    | Shows recent fixes with timestamps         |
| 5    | Verify high-impact open issues   | Shows critical issues with affected counts |

---

### 6. Opportunity Signals Page

**URL:** `/projects/:projectId/insights/opportunity-signals`

| Step | Action                                | Expected Result                    |
| ---- | ------------------------------------- | ---------------------------------- |
| 1    | Navigate to Opportunities tab         | Page loads with opportunity list   |
| 2    | Verify opportunities sorted by impact | High > Medium > Low                |
| 3    | Verify opportunity cards              | Shows title, why, pillar, fix type |
| 4    | Click opportunity link                | Navigates to relevant fix page     |

---

### 7. Navigation Integration

| Step | Action                       | Expected Result                        |
| ---- | ---------------------------- | -------------------------------------- |
| 1    | Check ProjectSideNav         | "Insights" link appears after Products |
| 2    | Click Insights in sidenav    | Navigates to insights overview         |
| 3    | Verify subnav tab navigation | Each tab navigates to correct subpage  |
| 4    | Verify active tab styling    | Current tab shows blue border/text     |

---

### 8. Read-Only Invariants

**Critical:** Verify the dashboard never triggers AI or mutations.

| Step | Action                                          | Expected Result                   |
| ---- | ----------------------------------------------- | --------------------------------- |
| 1    | Monitor network requests while viewing insights | No POST/PUT/PATCH requests made   |
| 2    | Check database after viewing                    | No new records created            |
| 3    | Verify no AI queue jobs triggered               | No automation or AI runs enqueued |
| 4    | Refresh page multiple times                     | Same data returned (cached)       |

---

## Trust Contracts

These invariants MUST be verified:

1. **Read-Only Only**: The insights endpoint and pages NEVER trigger AI operations or database mutations
2. **Cached Data**: Uses `*ReadOnly` service methods that don't recompute offsite/local issues
3. **Trust Display**: AI Efficiency page shows "Apply never uses AI" with `applyAiRuns = 0`
4. **No Side Effects**: Page views cannot trigger automations or AI calls

---

## Test Data Seeded by `seed-insights-1`

The E2E seed endpoint creates:

- User with OWNER role
- Project with Shopify integration
- 5 DeoScoreSnapshot records (7-day trend)
- AiUsageTracking records (runs used)
- AutomationPlaybookRun records (APPLY runs with aiUsed=false)
- ProjectOffsiteCoverage (cached offsite data)
- ProjectLocalCoverage (cached local data)

---

## Related Documents

- [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) - INSIGHTS-1 phase details
- [CRITICAL_PATH_MAP.md](../testing/CRITICAL_PATH_MAP.md) - CP-016 entry
- [insights.ts](../../apps/web/src/lib/insights.ts) - TypeScript types
- [GEO-INSIGHTS-2.md](./GEO-INSIGHTS-2.md) - GEO Insights testing guide
- [GEO_FOUNDATION.md](../GEO_FOUNDATION.md) - GEO concepts

---

## Document History

| Version | Date       | Changes                                                    |
| ------- | ---------- | ---------------------------------------------------------- |
| 1.0     | 2025-12-19 | Initial manual testing guide for INSIGHTS-1                |
| 1.1     | 2025-12-19 | Added GEO Insights tab to subnav, linked GEO documentation |
