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

| Step | Action                                       | Expected Result                              |
| ---- | -------------------------------------------- | -------------------------------------------- |
| 1    | Navigate to Products list with seeded issues | Page loads with product rows                 |
| 2    | Find a product with critical severity issues | Health pill shows "Critical" (red)           |
| 3    | Find a product with warning/info issues only | Health pill shows "Needs Attention" (yellow) |
| 4    | Find a product with no issues                | Health pill shows "Healthy" (green)          |
| 5    | Verify no numbers in pills                   | Pills show only text labels, no issue counts |

---

### 2. Recommended Action Determinism

**URL:** `/projects/:projectId/products`

| Step | Action                                   | Expected Result                                                |
| ---- | ---------------------------------------- | -------------------------------------------------------------- |
| 1    | Find a product with metadata issues      | Shows "Fix missing metadata" as recommended action             |
| 2    | Find a product with search intent issues | Shows "Improve search intent" as recommended action            |
| 3    | Find a product with media issues         | Shows "Improve images and accessibility" as recommended action |
| 4    | Verify action is under title             | Recommended action appears as second line under product title  |
| 5    | Verify healthy products                  | Shows "No action needed" for products with no issues           |

**Tie-breaker rules (verify determinism):**

- Severity order: critical > warning > info
- Pillar priority: metadata > search intent > content > technical > media > competitors > off-site > local
- Final tie-breaker: issue.id ascending

---

### 3. Command Bar

**URL:** `/projects/:projectId/products`

| Step | Action                                | Expected Result                                                                |
| ---- | ------------------------------------- | ------------------------------------------------------------------------------ |
| 1    | Navigate to Products list with issues | Command Bar visible at top                                                     |
| 2    | Verify attention count                | Shows "{N} products need attention" where N = Critical + Needs Attention count |
| 3    | Click "Fix in bulk"                   | Navigates to `/projects/:projectId/automation/playbooks`                       |
| 4    | Test with all healthy products        | Shows "All products are healthy" (no "Fix in bulk" button)                     |

---

### 4. Health Filter

**URL:** `/projects/:projectId/products`

| Step | Action                  | Expected Result                                            |
| ---- | ----------------------- | ---------------------------------------------------------- |
| 1    | Verify filter buttons   | Shows: All, Critical, Needs Attention, Healthy with counts |
| 2    | Click "Critical"        | Only Critical products shown                               |
| 3    | Click "Needs Attention" | Only Needs Attention products shown                        |
| 4    | Click "Healthy"         | Only Healthy products shown                                |
| 5    | Click "All"             | All products shown                                         |
| 6    | Verify counts update    | Filter counts reflect actual product health states         |

---

### 5. Sort Options

**URL:** `/projects/:projectId/products`

| Step | Action                          | Expected Result                                    |
| ---- | ------------------------------- | -------------------------------------------------- |
| 1    | Verify default sort             | "Sort by impact" selected by default               |
| 2    | Verify impact order             | Critical first, then Needs Attention, then Healthy |
| 3    | Select "Sort by title"          | Products sorted alphabetically by title            |
| 4    | Switch back to "Sort by impact" | Products return to impact order                    |

---

### 5a. Sort by Impact - Authoritative Ladder

**URL:** `/projects/:projectId/products`

This test verifies the deterministic impact-based sorting ladder.

**Primary Groups (in order):**

- Critical (Group 1)
- Needs Attention (Group 2)
- Healthy (Group 3)

| Step | Action                        | Expected Result                                                  |
| ---- | ----------------------------- | ---------------------------------------------------------------- |
| 1    | Verify Critical always first  | All Critical products appear before any Needs Attention products |
| 2    | Verify Needs Attention second | All Needs Attention products appear before any Healthy products  |
| 3    | Verify Healthy last           | All Healthy products appear at the end of the list               |

**Within Critical (Group 1) - Secondary Ordering:**

| Step | Action                                                                             | Expected Result                                                           |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | Find products with missing SEO title/description                                   | These appear first within Critical                                        |
| 2    | Find products with blocking technical issues (critical severity, technical pillar) | These appear after missing metadata                                       |
| 3    | Find products with both metadata AND search intent issues                          | These appear after blocking technical                                     |
| 4    | Verify higher issue counts first                                                   | Within same category, products with more issues of that type appear first |

**Within Needs Attention (Group 2) - Secondary Ordering:**

| Step | Action                                        | Expected Result                                                           |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | Find products with search intent issues       | These appear first within Needs Attention                                 |
| 2    | Find products with content issues             | These appear after search intent                                          |
| 3    | Find products with suboptimal metadata issues | These appear after content                                                |
| 4    | Verify higher issue counts first              | Within same category, products with more issues of that type appear first |

**Stability Tests:**

| Step | Action                             | Expected Result                                                            |
| ---- | ---------------------------------- | -------------------------------------------------------------------------- |
| 1    | Reload the page multiple times     | Order remains exactly the same (no jitter)                                 |
| 2    | Toggle filters and return to "All" | Order remains exactly the same                                             |
| 3    | Verify action clustering           | Products with same recommended action appear consecutively when applicable |

---

### 6. Progressive Disclosure - Row Click Expands

**URL:** `/projects/:projectId/products`

| Step | Action                                           | Expected Result                              |
| ---- | ------------------------------------------------ | -------------------------------------------- |
| 1    | Click anywhere on a product row (not on buttons) | Row expands to show detail panel             |
| 2    | Click same row again                             | Row collapses                                |
| 3    | Verify expand indicator                          | Chevron icon rotates when expanded           |
| 4    | Verify keyboard navigation                       | Enter/Space on focused row toggles expansion |

---

### 7. Expanded Details Content

**URL:** `/projects/:projectId/products` (expand a row)

| Step | Action                        | Expected Result                                            |
| ---- | ----------------------------- | ---------------------------------------------------------- |
| 1    | Expand a product with issues  | Detail panel shows below row                               |
| 2    | Verify Handle/ID shown        | Product handle or externalId displayed                     |
| 3    | Verify Last synced shown      | Timestamp displayed                                        |
| 4    | Verify Meta title shown       | SEO title or "Not set"                                     |
| 5    | Verify Meta description shown | SEO description or "Not set"                               |
| 6    | Verify "Issues by category"   | Pillar breakdown with counts and clickable links           |
| 7    | Click a pillar issue link     | Navigates to product workspace with `?tab=issues&pillar=X` |

---

### 8. Row Actions

**URL:** `/projects/:projectId/products`

| Step | Action                                         | Expected Result                                         |
| ---- | ---------------------------------------------- | ------------------------------------------------------- |
| 1    | Click "View details" button                    | Navigates to `/projects/:projectId/products/:productId` |
| 2    | Verify "View details" doesn't toggle expansion | Row does NOT expand/collapse on button click            |
| 3    | Verify no "Scan SEO" button by default         | Button not visible when data is fresh                   |
| 4    | Test with stale data (simulate)                | "Rescan" button appears                                 |
| 5    | Click "Rescan" when visible                    | Triggers scan flow with spinner                         |
| 6    | Verify "Rescan" doesn't toggle expansion       | Row does NOT expand/collapse on button click            |

---

### 9. Rescan Button Visibility (Staleness Gating)

**URL:** `/projects/:projectId/products`

| Step | Action                                                        | Expected Result                                          |
| ---- | ------------------------------------------------------------- | -------------------------------------------------------- |
| 1    | Test with fresh crawl data                                    | "Rescan" button NOT visible on any row                   |
| 2    | Simulate stale data (lastCrawledAt older than crawlFrequency) | "Rescan" button visible on all rows                      |
| 3    | Verify pre-crawl state (crawlCount === 0)                     | "Rescan" button NOT visible (no misleading stale signal) |

---

### 10. Pre-Crawl Guard Edge Case

**URL:** `/projects/:projectId/products` (project with crawlCount === 0)

| Step | Action                                          | Expected Result                                     |
| ---- | ----------------------------------------------- | --------------------------------------------------- |
| 1    | Navigate to Products list for uncrawled project | Pre-crawl guardrail banner shown                    |
| 2    | Verify health states                            | All products show "Healthy" (no issues exist yet)   |
| 3    | Verify no "Rescan" buttons                      | No stale data interpretation for uncrawled projects |
| 4    | Click "Continue to products"                    | Banner dismissed, products list visible             |

---

### 11. No Inline Breakdowns in Default Row

**URL:** `/projects/:projectId/products`

| Step | Action                          | Expected Result                                                                   |
| ---- | ------------------------------- | --------------------------------------------------------------------------------- |
| 1    | Observe default row (collapsed) | NO metadata status chip visible                                                   |
| 2    | Observe default row             | NO Title/Description/Alt text indicator chips                                     |
| 3    | Observe default row             | NO issue-by-pillar chips or "+N more"                                             |
| 4    | Observe default row             | NO overflow menu (⋮)                                                              |
| 5    | Verify row content              | Only: image, title, recommended action, health pill, View details, expand chevron |

---

## Bulk-Action Confirmation UX

This section covers the 3-step bulk action flow for "Fix missing metadata".

### 12. Bulk Action Entry Conditions

**URL:** `/projects/:projectId/products`

| Step | Action                               | Expected Result                                                                                                   |
| ---- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1    | Verify bulk action button visibility | "Fix missing metadata (N products)" button only visible when needsAttentionCount > 0 AND sort is "Sort by impact" |
| 2    | Switch to "Sort by title"            | Bulk action button hidden; "View playbooks" link shown instead                                                    |
| 3    | Switch back to "Sort by impact"      | Bulk action button reappears                                                                                      |
| 4    | Test with all healthy products       | No bulk action button (needsAttentionCount = 0)                                                                   |

---

### 13. Step 1 - Selection (No Execution)

**URL:** `/projects/:projectId/products`

| Step | Action                                    | Expected Result                                   |
| ---- | ----------------------------------------- | ------------------------------------------------- |
| 1    | Click "Fix missing metadata (N products)" | Selection context strip appears below Command Bar |
| 2    | Verify context strip content              | Shows action name and product count               |
| 3    | Verify "Review scope" button              | Button visible in selection strip                 |
| 4    | Verify "Clear" button                     | Button visible; clicking clears selection         |
| 5    | Verify no modal opened                    | Modal does NOT open on button click               |
| 6    | Verify no AI called                       | No network request to AI endpoints                |

---

### 14. Step 2 - Preview Modal (Scope Confirmation)

**URL:** `/projects/:projectId/products` (with selection active)

| Step | Action                          | Expected Result                                                                                            |
| ---- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1    | Click "Review scope"            | Modal opens                                                                                                |
| 2    | Verify action summary           | Shows "You're about to generate draft metadata for N products"                                             |
| 3    | Verify product list             | Scrollable list of affected product names                                                                  |
| 4    | Verify fields disclosure        | Shows "Title" and "Description" badges                                                                     |
| 5    | Verify field breakdown          | Shows "Missing title: X products / Missing description: Y products"                                        |
| 6    | Verify AI disclosure            | Shows lightning bolt icon + "This step uses AI to generate drafts. Nothing will be applied automatically." |
| 7    | Verify "Generate drafts" button | Primary action button visible                                                                              |
| 8    | Verify "Cancel" button          | Secondary button closes modal without action                                                               |
| 9    | Cancel and verify state         | Modal closes; selection persists                                                                           |

---

### 15. Step 3a - Draft Generation (Uses AI)

**URL:** `/projects/:projectId/products` (with modal open)

| Step | Action                        | Expected Result                                                                  |
| ---- | ----------------------------- | -------------------------------------------------------------------------------- |
| 1    | Click "Generate drafts"       | Loading spinner appears; button disabled                                         |
| 2    | Wait for completion           | Success message: "X drafts created" (optionally ", Y need attention")            |
| 3    | Verify per-field breakdown    | If both playbooks ran: "Titles: X generated" and "Descriptions: Y generated"     |
| 4    | Verify "Apply updates" button | Button now enabled                                                               |
| 5    | Verify "Review changes" link  | Link to `/projects/:projectId/automation/playbooks?playbookId=missing_seo_title` |
| 6    | Verify apply disclosure       | Shows checkmark + "Apply updates does not use AI."                               |

---

### 16. Step 3b - Apply (No AI)

**URL:** `/projects/:projectId/products` (with drafts ready)

| Step | Action                     | Expected Result                                          |
| ---- | -------------------------- | -------------------------------------------------------- |
| 1    | Click "Apply updates"      | Loading spinner appears                                  |
| 2    | Wait for completion        | Success message: "Applied updates to N products"         |
| 3    | Verify no AI network calls | Apply request does not call AI endpoints                 |
| 4    | Verify "Close" button      | Button text changes from "Cancel" to "Close"             |
| 5    | Close modal                | Modal closes; products list refreshes to reflect changes |

---

### 17. Cancel / Back Out Safely

**URL:** `/projects/:projectId/products`

| Step | Action                           | Expected Result                      |
| ---- | -------------------------------- | ------------------------------------ |
| 1    | Select bulk action, open modal   | Modal visible                        |
| 2    | Click "Cancel" before generating | Modal closes; no drafts generated    |
| 3    | Click X button                   | Same behavior as Cancel              |
| 4    | Verify no side effects           | No AI calls made; no changes applied |
| 5    | Re-open modal                    | Can start fresh                      |

---

### 18. Partial Failure Handling

**URL:** `/projects/:projectId/products` (simulate partial failure)

| Step | Action                             | Expected Result                                   |
| ---- | ---------------------------------- | ------------------------------------------------- |
| 1    | Generate drafts with some failures | Shows "X drafts created, Y need attention"        |
| 2    | Verify "Retry" button              | Button available to retry failed items            |
| 3    | Click "Retry"                      | Re-runs draft generation for failed items only    |
| 4    | Verify "Apply updates" still works | Can apply successful drafts even if some failed   |
| 5    | Verify error details               | Error message displayed in modal (not just toast) |

---

### 19. Copy Rules Compliance

**URL:** `/projects/:projectId/products`

| Step | Action                       | Expected Result                                           |
| ---- | ---------------------------- | --------------------------------------------------------- |
| 1    | Verify bulk button text      | Exactly "Fix missing metadata (N products)"               |
| 2    | Verify generate button text  | Exactly "Generate drafts"                                 |
| 3    | Verify review link text      | Exactly "Review changes"                                  |
| 4    | Verify apply button text     | Exactly "Apply updates"                                   |
| 5    | Verify no disallowed phrases | No "optimize", "boost", "supercharge", "magic" in UI copy |

---

## Regression Checks

### RC-001: Product Workspace Still Loads

| Step | Action                              | Expected Result                              |
| ---- | ----------------------------------- | -------------------------------------------- |
| 1    | Click "View details" on any product | Product workspace page loads correctly       |
| 2    | Verify tabs work                    | All tabs (Metadata, Issues, etc.) functional |
| 3    | Verify back navigation              | Can return to Products list                  |

### RC-002: Issues Engine Links Valid

| Step | Action                       | Expected Result                                              |
| ---- | ---------------------------- | ------------------------------------------------------------ |
| 1    | Expand a product with issues | Issue category links visible                                 |
| 2    | Click a pillar link          | Navigates to product workspace Issues tab with pillar filter |
| 3    | Verify issues display        | Issues for that pillar shown correctly                       |

### RC-003: No AI Labeling Regressions

| Step | Action                        | Expected Result                        |
| ---- | ----------------------------- | -------------------------------------- |
| 1    | Navigate to product workspace | AI-triggering buttons show "(uses AI)" |
| 2    | Verify "View details"         | Does NOT have "(uses AI)" label        |
| 3    | Verify "Rescan"               | Does NOT have "(uses AI)" label        |

### RC-004: Mobile Responsiveness

| Step | Action                       | Expected Result                                 |
| ---- | ---------------------------- | ----------------------------------------------- |
| 1    | View Products list on mobile | Rows stack vertically without horizontal scroll |
| 2    | Verify Command Bar           | Wraps correctly on narrow screens               |
| 3    | Verify filter buttons        | Wrap or scroll horizontally if needed           |
| 4    | Tap row to expand            | Expansion works on touch devices                |

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
8. **Sort by Impact - Deterministic**: Sort uses only Health + existing issue category counts + existing severity flags; no traffic/revenue/AI scoring
9. **Sort by Impact - Stable**: Order is consistent across reloads (no jitter)
10. **No Silent Bulk Apply**: Bulk apply requires explicit user confirmation; no one-click apply
11. **AI Used Only on Generate Drafts**: Draft generation uses AI (with explicit disclosure); Apply does not use AI
12. **Scope Transparency**: Bulk action modal shows full product list and affected fields before any action

---

## Related Documents

- [DEO-UX-REFRESH-1.md](./DEO-UX-REFRESH-1.md) - Prior products list design (superseded for list behavior)
- [GEO-EXPORT-1.md](./GEO-EXPORT-1.md) - GEO Export manual testing
- [CRITICAL_PATH_MAP.md](../testing/CRITICAL_PATH_MAP.md) - CP-003 entry

---

## Document History

| Version | Date       | Changes                                                                                                                                                                         |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2025-12-21 | Initial manual testing guide for PRODUCTS-LIST-2.0                                                                                                                              |
| 1.1     | 2025-12-21 | Added Sort by impact authoritative ladder test scenarios (5a); updated labels from "Sort: Priority/Title" to "Sort by impact/title"; added deterministic/stable trust contracts |
| 1.2     | 2025-12-21 | Added Bulk-Action Confirmation UX section (scenarios 12-19); added trust contracts for no silent bulk apply, AI disclosure, and scope transparency                              |
