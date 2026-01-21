# DEO-UX-REFRESH-1: Products + Insights + Branding UX Refresh - Manual Testing Guide

**Feature:** Products list redesign, product details tabs, GEO report branding, login branding
**Critical Path:** CP-001, CP-003, CP-009, CP-017
**Date:** 2025-12-20

---

> **NOTE: Products List Behavior Superseded**
>
> The Products list test scenarios in this document (Sections 1-2) have been **superseded by PRODUCTS-LIST-2.0**.
> For canonical Products list manual test coverage, see [PRODUCTS-LIST-2.0.md](./PRODUCTS-LIST-2.0.md).
>
> The following Products list behaviors from this document are no longer current:
>
> - Pillar chips and "+N more" in default row view
> - Non-clickable rows (rows are now clickable for progressive disclosure)
> - Metadata status filter/chips
>
> Product details tabs, GEO branding, and login branding coverage in this document remain valid.

---

## Overview

DEO-UX-REFRESH-1 improves UX across multiple surfaces:

1. ~~**Products List**: Single primary CTA per row, issue-by-pillar summary chips~~ **(Superseded by PRODUCTS-LIST-2.0)**
2. **Product Details**: Tab-based navigation replacing scroll anchors, prominent Issues surface
3. **Shared GEO Reports**: Premium branding with print-friendly formatting
4. **Login Page**: Premium branded styling while preserving security

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
   curl -X POST http://localhost:3001/testkit/e2e/seed-first-deo-win
   ```

3. Note the returned `accessToken` and `projectId` for testing.

---

## Test Scenarios

### 1. Products List Row Actions (No Duplicates) - **SUPERSEDED**

> **This section is superseded by [PRODUCTS-LIST-2.0.md](./PRODUCTS-LIST-2.0.md)**. Rows are now clickable for progressive disclosure. See PRODUCTS-LIST-2.0 for current behavior.

~~**URL:** `/projects/:projectId/products`~~

~~| Step | Action | Expected Result |~~
~~|------|--------|-----------------|~~
~~| 1 | Navigate to Products list | Page loads with product rows |~~
~~| 2 | Verify primary CTA | Each row has exactly ONE primary navigation CTA ("Open" or "View details") |~~
~~| 3 | Verify no "Open Workspace" link | No "Open Workspace →" inline link visible |~~
~~| 4 | Verify no "Optimize" button | No purple "Optimize" button visible |~~
~~| 5 | Verify overflow menu | Menu does NOT contain "View details" item |~~
~~| 6 | Click primary CTA | Navigates to `/projects/:id/products/:productId` |~~
~~| 7 | Verify row is NOT clickable | Clicking non-button areas does NOT navigate |~~

---

### 2. Products List Issue Summary Chips - **SUPERSEDED**

> **This section is superseded by [PRODUCTS-LIST-2.0.md](./PRODUCTS-LIST-2.0.md)**. Pillar chips are now only shown in expanded details, not in the default row view. See PRODUCTS-LIST-2.0 for current behavior.

~~**URL:** `/projects/:projectId/products`~~

~~| Step | Action | Expected Result |~~
~~|------|--------|-----------------|~~
~~| 1 | Navigate to Products list with issues | Page loads with products that have DEO issues |~~
~~| 2 | Verify pillar chips | Row shows chips like "Metadata 2", "Search & Intent 1" |~~
~~| 3 | Verify chip cap | Max 3 pillar chips shown, with "+N more" for additional |~~
~~| 4 | Verify total count | Total issue count matches sum of pillar issues |~~
~~| 5 | Verify consistency | Issue count matches what product details will show |~~

---

### 3. Product Details Tab Navigation

**URL:** `/projects/:projectId/products/:productId`

| Step | Action                      | Expected Result                                                           |
| ---- | --------------------------- | ------------------------------------------------------------------------- |
| 1    | Navigate to product details | Page loads with tab bar (not "Jump to" anchors)                           |
| 2    | Verify tab bar styling      | Styled consistently with InsightsSubnav (border + active underline)       |
| 3    | Verify tab order            | Metadata, Answers, Search & Intent, Competitors, GEO, Automations, Issues |
| 4    | Click each tab              | Tab content renders, URL updates with `?tab=<name>`                       |
| 5    | Refresh page with tab param | Same tab remains active on reload                                         |
| 6    | Verify lazy loading         | Only active tab's panel content renders                                   |

---

### 4. Product Details Focus Deep-Links

**URL:** `/projects/:projectId/products/:productId?focus=<value>`

| Step | Action                               | Expected Result                    |
| ---- | ------------------------------------ | ---------------------------------- |
| 1    | Navigate with `?focus=metadata`      | Metadata tab is active (no scroll) |
| 2    | Navigate with `?focus=deo-issues`    | Issues tab is active               |
| 3    | Navigate with `?focus=search-intent` | Search & Intent tab is active      |
| 4    | Navigate with `?focus=competitors`   | Competitors tab is active          |
| 5    | Navigate with `?focus=geo`           | GEO tab is active                  |

---

### 5. Product Details Issue Count Consistency

**URL:** `/projects/:projectId/products/:productId?tab=issues`

| Step | Action                                 | Expected Result                             |
| ---- | -------------------------------------- | ------------------------------------------- |
| 1    | Note issue count in Products list      | E.g., "5 issues" for product                |
| 2    | Navigate to product details Issues tab | Issues tab shows same count "5 issues"      |
| 3    | Verify grouped-by-pillar display       | Issues grouped under pillar headings        |
| 4    | Verify "Fix next" guidance             | Highest-severity issue highlighted with CTA |

---

### 6. Product Details DEO Issues Surface

**URL:** `/projects/:projectId/products/:productId`

| Step | Action                          | Expected Result                                           |
| ---- | ------------------------------- | --------------------------------------------------------- |
| 1    | Navigate to product with issues | Header region shows "X DEO Issues" indicator              |
| 2    | Click "View issues" action      | Issues tab becomes active                                 |
| 3    | Verify Issues tab content       | Lists all issues with pillar grouping                     |
| 4    | Verify "Fix next" CTA           | Routes to most relevant tab (metadata/search-intent/etc.) |

---

### 7. AI CTA Labeling ("(uses AI)")

**URL:** `/projects/:projectId/products/:productId`

| Step | Action                          | Expected Result                                         |
| ---- | ------------------------------- | ------------------------------------------------------- |
| 1    | Navigate to Metadata tab        | "Generate Suggestions (uses AI)" button visible         |
| 2    | Navigate to Answers tab         | "Generate Answers (uses AI)" button visible             |
| 3    | Navigate to Search & Intent tab | "Preview Fix (uses AI)" button visible                  |
| 4    | Navigate to Competitors tab     | "Preview Fix (uses AI)" button visible                  |
| 5    | Navigate to GEO tab             | "Preview Fix (uses AI)" button visible                  |
| 6    | Verify Apply buttons            | "Apply to Shopify" / "Apply Fix" do NOT say "(uses AI)" |

---

### 8. Shared GEO Report Branding

**URL:** `/share/geo-report/:token` (valid token)

| Step | Action                       | Expected Result                          |
| ---- | ---------------------------- | ---------------------------------------- |
| 1    | Open share URL in incognito  | Report loads without login               |
| 2    | Verify EngineO.ai branding   | Logo/wordmark visible in header          |
| 3    | Verify "Shared Report" badge | Blue badge indicates shared state        |
| 4    | Verify "Read-only" badge     | Gray badge indicates read-only           |
| 5    | Verify expiry date           | Expiration date shown in header          |
| 6    | Verify footer                | "Generated by EngineO.ai" footer present |
| 7    | Verify no app navigation     | No sidebar, no project links             |

---

### 9. Shared GEO Report Error States

| Step | Action                | Expected Result                         |
| ---- | --------------------- | --------------------------------------- |
| 1    | Access expired link   | "Link Expired" page with clock icon     |
| 2    | Access revoked link   | "Access Revoked" page with warning icon |
| 3    | Access invalid token  | "Report Not Found" page                 |
| 4    | Verify no report data | Error states show no report content     |

---

### 10. Print/PDF Formatting

**URL:** `/projects/:projectId/insights/geo-insights/export`

| Step | Action                    | Expected Result                                              |
| ---- | ------------------------- | ------------------------------------------------------------ |
| 1    | Click "Print / Save PDF"  | Browser print dialog opens                                   |
| 2    | Verify white background   | Print preview shows white background                         |
| 3    | Verify page margins       | Content has reasonable margins                               |
| 4    | Verify no page-break cuts | KPI cards and sections not split across pages                |
| 5    | Verify header visibility  | "Generated on <date>", "Read-only snapshot" visible in print |
| 6    | Verify disclaimer         | Disclaimer at bottom of PDF                                  |
| 7    | Verify hidden chrome      | Header buttons and share links hidden in print               |

---

### 11. Login Page Branding

**URL:** `/login`

| Step | Action                          | Expected Result                                    |
| ---- | ------------------------------- | -------------------------------------------------- |
| 1    | Navigate to login page          | Page loads with EngineO.ai logo/wordmark           |
| 2    | Verify premium card styling     | Form wrapped in card with border + shadow          |
| 3    | Verify "Sign in" heading        | Accessible heading present                         |
| 4    | Verify form accessibility       | Labels associated with inputs, focus rings visible |
| 5    | Tab through form fields         | Focus states clearly visible                       |
| 6    | Submit with invalid credentials | Error message displays correctly                   |

---

### 12. Login Security Sanitization (No Regression)

**URL:** `/login?password=secret123&email=test@example.com`

| Step | Action                                | Expected Result                                                  |
| ---- | ------------------------------------- | ---------------------------------------------------------------- |
| 1    | Navigate to URL with sensitive params | Redirected to `/login` without params                            |
| 2    | Verify security message               | Amber banner: "For security, we removed sensitive parameters..." |
| 3    | Verify fields empty                   | Email and password fields NOT pre-filled                         |
| 4    | Verify `next` param preserved         | If `?next=X` was present, it remains                             |

---

## Trust Contracts

These invariants MUST be verified:

1. **Single Primary CTA**: Products list rows have exactly one navigation CTA
2. **Issue Count Consistency**: List count matches details count for same product
3. **No Duplicate Navigation**: No "Open Workspace", "Optimize", and "View details" together
4. **AI CTA Labeling**: All AI-triggering buttons include "(uses AI)"
5. **Apply Never Uses AI**: "Apply to Shopify" / "Apply Fix" never labeled with "(uses AI)"
6. **Tab State Persistence**: Tab selection preserved in URL query param
7. **Focus Deep-Link Works**: `?focus=X` maps to correct tab
8. **Print Quality**: PDF has proper margins, no cut-off sections
9. **Branding Consistency**: EngineO.ai logo/wordmark on login and shared reports
10. **Security Preserved**: Login sanitization UX unchanged

---

## Related Documents

- [GEO-EXPORT-1.md](./GEO-EXPORT-1.md) - GEO Export manual testing
- [GEO-INSIGHTS-2.md](./GEO-INSIGHTS-2.md) - GEO Insights manual testing
- [SECURITY-LOGIN-QUERY-PARAMS.md](./SECURITY-LOGIN-QUERY-PARAMS.md) - Login security testing
- [CRITICAL_PATH_MAP.md](../testing/CRITICAL_PATH_MAP.md) - CP-001, CP-003, CP-009, CP-017

---

## Document History

| Version | Date       | Changes                                                                                            |
| ------- | ---------- | -------------------------------------------------------------------------------------------------- |
| 1.0     | 2025-12-20 | Initial manual testing guide for DEO-UX-REFRESH-1                                                  |
| 1.1     | 2025-12-21 | Products list sections (1-2) marked superseded by PRODUCTS-LIST-2.0. Added superseded note at top. |
