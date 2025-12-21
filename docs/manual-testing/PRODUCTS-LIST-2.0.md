# PRODUCTS-LIST-2.0: Decision-First Products List - Manual Testing Guide

**Feature:** Frontend-only, decision-first Products list redesign
**Critical Path:** CP-003 (Product Optimize)
**Date:** 2025-12-21

---

## Overview

PRODUCTS-LIST-2.0 redesigns the Products list to be decision-first:
1. **Health pill per row** (3 states: Healthy, Needs Attention, Critical - no numbers)
2. **Recommended action per row** (single, deterministic based on severity + pillar priority)
3. **Progressive disclosure** (details only on expand, no inline breakdowns by default)
4. **No always-visible "Scan SEO"**; "Rescan" only when data is stale
5. **Command Bar** with "{N} products need attention" and "Fix in bulk" CTA

---

## Prerequisites

### Test Environment Setup

1. Start API and web servers:
   ```bash
   pnpm --filter api dev
   pnpm --filter web dev
   ```

2. Seed test data with products and issues:
   ```bash
   curl -X POST http://localhost:3001/testkit/e2e/seed-first-deo-win
   ```

3. Note the returned `accessToken` and `projectId` for testing.

---

## Test Scenarios

### 1. Health Pill Correctness

**URL:** `/projects/:projectId/products`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Products list with seeded issues | Page loads with product rows |
| 2 | Find a product with critical severity issues | Health pill shows "Critical" (red) |
| 3 | Find a product with warning/info issues only | Health pill shows "Needs Attention" (yellow) |
| 4 | Find a product with no issues | Health pill shows "Healthy" (green) |
| 5 | Verify no numbers in pills | Pills show only text labels, no issue counts |

---

### 2. Recommended Action Determinism

**URL:** `/projects/:projectId/products`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find a product with metadata issues | Shows "Fix missing metadata" as recommended action |
| 2 | Find a product with search intent issues | Shows "Improve search intent" as recommended action |
| 3 | Find a product with media issues | Shows "Improve images and accessibility" as recommended action |
| 4 | Verify action is under title | Recommended action appears as second line under product title |
| 5 | Verify healthy products | Shows "No action needed" for products with no issues |

**Tie-breaker rules (verify determinism):**
- Severity order: critical > warning > info
- Pillar priority: metadata > search intent > content > technical > media > competitors > off-site > local
- Final tie-breaker: issue.id ascending

---

### 3. Command Bar

**URL:** `/projects/:projectId/products`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Products list with issues | Command Bar visible at top |
| 2 | Verify attention count | Shows "{N} products need attention" where N = Critical + Needs Attention count |
| 3 | Click "Fix in bulk" | Navigates to `/projects/:projectId/automation/playbooks` |
| 4 | Test with all healthy products | Shows "All products are healthy" (no "Fix in bulk" button) |

---

### 4. Health Filter

**URL:** `/projects/:projectId/products`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify filter buttons | Shows: All, Critical, Needs Attention, Healthy with counts |
| 2 | Click "Critical" | Only Critical products shown |
| 3 | Click "Needs Attention" | Only Needs Attention products shown |
| 4 | Click "Healthy" | Only Healthy products shown |
| 5 | Click "All" | All products shown |
| 6 | Verify counts update | Filter counts reflect actual product health states |

---

### 5. Sort Options

**URL:** `/projects/:projectId/products`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify default sort | "Sort: Priority" selected by default |
| 2 | Verify priority order | Critical first, then Needs Attention, then Healthy |
| 3 | Select "Sort: Title" | Products sorted alphabetically by title |
| 4 | Switch back to Priority | Products return to priority order |

---

### 6. Progressive Disclosure - Row Click Expands

**URL:** `/projects/:projectId/products`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click anywhere on a product row (not on buttons) | Row expands to show detail panel |
| 2 | Click same row again | Row collapses |
| 3 | Verify expand indicator | Chevron icon rotates when expanded |
| 4 | Verify keyboard navigation | Enter/Space on focused row toggles expansion |

---

### 7. Expanded Details Content

**URL:** `/projects/:projectId/products` (expand a row)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Expand a product with issues | Detail panel shows below row |
| 2 | Verify Handle/ID shown | Product handle or externalId displayed |
| 3 | Verify Last synced shown | Timestamp displayed |
| 4 | Verify Meta title shown | SEO title or "Not set" |
| 5 | Verify Meta description shown | SEO description or "Not set" |
| 6 | Verify "Issues by category" | Pillar breakdown with counts and clickable links |
| 7 | Click a pillar issue link | Navigates to product workspace with `?tab=issues&pillar=X` |

---

### 8. Row Actions

**URL:** `/projects/:projectId/products`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "View details" button | Navigates to `/projects/:projectId/products/:productId` |
| 2 | Verify "View details" doesn't toggle expansion | Row does NOT expand/collapse on button click |
| 3 | Verify no "Scan SEO" button by default | Button not visible when data is fresh |
| 4 | Test with stale data (simulate) | "Rescan" button appears |
| 5 | Click "Rescan" when visible | Triggers scan flow with spinner |
| 6 | Verify "Rescan" doesn't toggle expansion | Row does NOT expand/collapse on button click |

---

### 9. Rescan Button Visibility (Staleness Gating)

**URL:** `/projects/:projectId/products`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Test with fresh crawl data | "Rescan" button NOT visible on any row |
| 2 | Simulate stale data (lastCrawledAt older than crawlFrequency) | "Rescan" button visible on all rows |
| 3 | Verify pre-crawl state (crawlCount === 0) | "Rescan" button NOT visible (no misleading stale signal) |

---

### 10. Pre-Crawl Guard Edge Case

**URL:** `/projects/:projectId/products` (project with crawlCount === 0)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Products list for uncrawled project | Pre-crawl guardrail banner shown |
| 2 | Verify health states | All products show "Healthy" (no issues exist yet) |
| 3 | Verify no "Rescan" buttons | No stale data interpretation for uncrawled projects |
| 4 | Click "Continue to products" | Banner dismissed, products list visible |

---

### 11. No Inline Breakdowns in Default Row

**URL:** `/projects/:projectId/products`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe default row (collapsed) | NO metadata status chip visible |
| 2 | Observe default row | NO Title/Description/Alt text indicator chips |
| 3 | Observe default row | NO issue-by-pillar chips or "+N more" |
| 4 | Observe default row | NO overflow menu (⋮) |
| 5 | Verify row content | Only: image, title, recommended action, health pill, View details, expand chevron |

---

## Regression Checks

### RC-001: Product Workspace Still Loads

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "View details" on any product | Product workspace page loads correctly |
| 2 | Verify tabs work | All tabs (Metadata, Issues, etc.) functional |
| 3 | Verify back navigation | Can return to Products list |

### RC-002: Issues Engine Links Valid

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Expand a product with issues | Issue category links visible |
| 2 | Click a pillar link | Navigates to product workspace Issues tab with pillar filter |
| 3 | Verify issues display | Issues for that pillar shown correctly |

### RC-003: No AI Labeling Regressions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to product workspace | AI-triggering buttons still show "(uses AI)" |
| 2 | Verify "View details" | Does NOT have "(uses AI)" label |
| 3 | Verify "Rescan" | Does NOT have "(uses AI)" label |

### RC-004: Mobile Responsiveness

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View Products list on mobile | Rows stack vertically without horizontal scroll |
| 2 | Verify Command Bar | Wraps correctly on narrow screens |
| 3 | Verify filter buttons | Wrap or scroll horizontally if needed |
| 4 | Tap row to expand | Expansion works on touch devices |

---

## Trust Contracts

These invariants MUST be verified:

1. **Health Pills - No Numbers**: Health pill shows only "Healthy", "Needs Attention", or "Critical" - never issue counts
2. **Single Recommended Action**: Each row shows exactly one recommended action, deterministically chosen
3. **Progressive Disclosure**: Default row shows only essential info; details require expansion
4. **No Always-Visible Scan**: "Rescan" only appears when data is stale
5. **Command Bar Accuracy**: "{N} products need attention" count matches Critical + Needs Attention filter counts
6. **Deep Links Work**: Pillar links in expanded details navigate to correct product workspace tab/filter
7. **Pre-Crawl Safety**: Products with crawlCount === 0 show "Healthy" without implying issues were checked

---

## Related Documents

- [DEO-UX-REFRESH-1.md](./DEO-UX-REFRESH-1.md) - Prior products list design (superseded for list behavior)
- [GEO-EXPORT-1.md](./GEO-EXPORT-1.md) - GEO Export manual testing
- [CRITICAL_PATH_MAP.md](../testing/CRITICAL_PATH_MAP.md) - CP-003 entry

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-21 | Initial manual testing guide for PRODUCTS-LIST-2.0 |
