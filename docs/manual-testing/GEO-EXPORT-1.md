# GEO-EXPORT-1: GEO Report Export & Share Links - Manual Testing Guide

**Feature:** GEO Report export and shareable links
**Critical Path:** Extends CP-016, CP-017
**Date:** 2025-12-20

---

## Overview

GEO-EXPORT-1 enables users to export GEO readiness reports as printable PDFs and share them via time-bound, revocable links. All exports are read-only snapshots that never trigger AI operations.

---

## Prerequisites

### Test Environment Setup

1. Start API and web servers:

   ```bash
   pnpm --filter api dev
   pnpm --filter web dev
   ```

2. Seed test data:

   ```bash
   curl -X POST http://localhost:3001/testkit/e2e/seed-geo-insights-2
   ```

3. Note the returned `accessToken` and `projectId` for testing.

---

## Test Scenarios

### 1. Export Report CTA

**URL:** `/projects/:projectId/insights/geo-insights`

| Step | Action                        | Expected Result                                           |
| ---- | ----------------------------- | --------------------------------------------------------- |
| 1    | Navigate to GEO Insights page | Page loads with "Export Report" button in header          |
| 2    | Click "Export Report" button  | Navigates to `/projects/:id/insights/geo-insights/export` |

---

### 2. Export Page Layout

**URL:** `/projects/:projectId/insights/geo-insights/export`

| Step | Action                  | Expected Result                                                        |
| ---- | ----------------------- | ---------------------------------------------------------------------- |
| 1    | Navigate to export page | Report loads with project name and generated date                      |
| 2    | Verify header buttons   | "Print / Save PDF" and "Create Share Link" buttons visible             |
| 3    | Verify overview section | Shows Answer Ready %, Total Answers, Reuse Rate, Attribution Readiness |
| 4    | Verify intent coverage  | Lists all 5 intent types with coverage percentages                     |
| 5    | Verify opportunities    | Lists opportunities with category and impact badges                    |
| 6    | Verify disclaimer       | Bottom of report shows disclaimer text                                 |

**Expected Disclaimer Text:**
"These metrics reflect internal content readiness signals. Actual citations by AI systems depend on many factors outside your control."

---

### 3. Print/PDF Export

| Step | Action                          | Expected Result                                                       |
| ---- | ------------------------------- | --------------------------------------------------------------------- |
| 1    | Click "Print / Save PDF" button | Browser print dialog opens                                            |
| 2    | Select "Save as PDF"            | PDF is generated with report content                                  |
| 3    | Verify PDF layout               | Header buttons and share links section hidden, report content visible |
| 4    | Check disclaimer in PDF         | Disclaimer appears at bottom of exported PDF                          |

---

### 4. Share Link Creation

| Step | Action                           | Expected Result                                              |
| ---- | -------------------------------- | ------------------------------------------------------------ |
| 1    | Click "Create Share Link" button | Button shows "Creating..." state                             |
| 2    | Wait for completion              | Share Links section appears with new link                    |
| 3    | Verify link status               | Shows "ACTIVE" badge                                         |
| 4    | Verify expiry date               | Shows date ~14 days in future                                |
| 5    | Verify share URL                 | URL format: `http://localhost:3000/share/geo-report/{token}` |

---

### 5. Share Link Copy

| Step | Action                             | Expected Result                       |
| ---- | ---------------------------------- | ------------------------------------- |
| 1    | Click "Copy" button on active link | Link copied to clipboard, alert shown |
| 2    | Paste in new browser tab           | URL is correctly pasted               |

---

### 6. Share Link Revocation

| Step | Action                            | Expected Result                  |
| ---- | --------------------------------- | -------------------------------- |
| 1    | Click "Revoke" on active link     | Confirmation dialog appears      |
| 2    | Confirm revocation                | Link status changes to "REVOKED" |
| 3    | Copy and Revoke buttons disappear | Only status badge visible        |

---

### 7. Public Share View - Valid

**URL:** `/share/geo-report/:token` (use token from created link)

| Step | Action                             | Expected Result                                |
| ---- | ---------------------------------- | ---------------------------------------------- |
| 1    | Open share URL in incognito window | Report loads without login                     |
| 2    | Verify badges                      | "Shared Report" and "Read-only" badges visible |
| 3    | Verify expiry display              | Shows expiration date                          |
| 4    | Verify report content              | Overview, coverage, opportunities visible      |
| 5    | Verify disclaimer                  | Disclaimer appears at bottom                   |
| 6    | Check for internal links           | No clickable links to app routes               |

---

### 8. Public Share View - Expired

| Step | Action                                         | Expected Result                                   |
| ---- | ---------------------------------------------- | ------------------------------------------------- |
| 1    | Wait for link to expire (or use expired token) | "Link Expired" error page                         |
| 2    | Verify error message                           | "Please request a new link from the report owner" |
| 3    | Verify no report content                       | Report data not visible                           |

---

### 9. Public Share View - Revoked

| Step | Action                      | Expected Result                    |
| ---- | --------------------------- | ---------------------------------- |
| 1    | Access a revoked link's URL | "Access Revoked" error page        |
| 2    | Verify error message        | Explains link was revoked by owner |
| 3    | Verify no report content    | Report data not visible            |

---

### 10. Public Share View - Not Found

| Step | Action                                        | Expected Result               |
| ---- | --------------------------------------------- | ----------------------------- |
| 1    | Navigate to `/share/geo-report/invalid-token` | "Report Not Found" error page |
| 2    | Verify error message                          | Generic not-found message     |

---

### 11. Read-Only Invariants

**Critical:** Export and share operations never trigger AI or mutations.

| Step | Action                    | Expected Result                             |
| ---- | ------------------------- | ------------------------------------------- |
| 1    | Open DevTools Network tab | Monitor all requests                        |
| 2    | Load export page          | Only GET requests for report assembly       |
| 3    | Create share link         | Single POST request for share link creation |
| 4    | View public share         | Only GET request for share view             |
| 5    | Verify no AI calls        | No requests to `/ai/` endpoints             |

---

### 12. Export-Safe Data Validation

| Step | Action                                    | Expected Result                             |
| ---- | ----------------------------------------- | ------------------------------------------- |
| 1    | Open DevTools Network tab                 | Monitor API responses                       |
| 2    | Call `/projects/:id/geo-reports/assemble` | Verify response shape                       |
| 3    | Check for internal IDs                    | No `id` fields in opportunities             |
| 4    | Check for hrefs                           | No `href` fields in opportunities           |
| 5    | Check labels                              | Human-readable labels (not raw issue types) |

---

## Trust Contracts

These invariants MUST be verified:

1. **Read-Only Export**: Export page never triggers AI or mutations
2. **Time-Bound Links**: Share links expire after 14 days
3. **Revocable**: Revoked links return "revoked" status
4. **Export-Safe**: No internal IDs, hrefs, or raw issue dumps
5. **Hedged Language**: "Attribution readiness" not "citation confidence"
6. **Disclaimer Present**: Always shows disclaimer on exports and shares

---

## API Endpoints for Testing

### Assemble Report (Authenticated)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/projects/$PROJECT_ID/geo-reports/assemble
```

### Create Share Link (Authenticated)

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Share"}' \
  http://localhost:3001/projects/$PROJECT_ID/geo-reports/share-links
```

### List Share Links (Authenticated)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/projects/$PROJECT_ID/geo-reports/share-links
```

### Revoke Share Link (Authenticated)

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/projects/$PROJECT_ID/geo-reports/share-links/$LINK_ID
```

### View Public Share (No Auth)

```bash
curl http://localhost:3001/public/geo-reports/$SHARE_TOKEN
```

---

## Related Documents

- [GEO_EXPORT.md](../GEO_EXPORT.md) - GEO Export technical documentation
- [GEO_INSIGHTS.md](../GEO_INSIGHTS.md) - GEO Insights derivation
- [GEO-INSIGHTS-2.md](./GEO-INSIGHTS-2.md) - GEO Insights manual testing
- [CRITICAL_PATH_MAP.md](../testing/CRITICAL_PATH_MAP.md) - CP-016, CP-017

---

## Document History

| Version | Date       | Changes                                       |
| ------- | ---------- | --------------------------------------------- |
| 1.0     | 2025-12-20 | Initial manual testing guide for GEO-EXPORT-1 |
