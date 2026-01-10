# TRUST-ROUTING-1: UX Trust Hardening Manual Testing Guide

**Phase:** TRUST-ROUTING-1
**Status:** Complete
**Date:** 2026-01-06

## Overview

This document provides manual testing procedures for the TRUST-ROUTING-1 phase, which implements UX trust hardening through deterministic routing and context preservation.

---

## Prerequisites

1. Authenticated user with a project containing:
   - Multiple products with SEO issues
   - At least one playbook (missing_seo_title or missing_seo_description)
2. Access to browser developer tools for inspecting URLs and session storage

---

## Test Scenarios

### 1. Preview Navigation Scenarios

#### 1.1 Preview → Product Preview Mode → Back to Preview

**Steps:**
1. Navigate to Playbooks page: `/projects/{projectId}/automation/playbooks`
2. Select a playbook (e.g., "Missing SEO Title")
3. Click "Generate preview" to create a preview
4. Wait for preview samples to appear
5. Click "Open product →" on any preview sample

**Expected Results:**
- URL contains `from=playbook_preview`, `playbookId`, and `returnTo`
- Product page shows "Previewing draft (not applied)" banner (purple)
- Banner shows "Draft vs Current" comparison for the affected field
- Sticky header shows "← Back to preview" link
- Breadcrumb "Preview" link navigates to returnTo

**Steps (continued):**
6. Click "← Back to preview"

**Expected Results:**
- Returns to Playbooks page with same playbook selected
- Preview samples are still visible (not regenerated)
- URL contains `playbookId` parameter

#### 1.2 Preview Expired Behavior

**Steps:**
1. Navigate to Product page with preview context:
   ```
   /projects/{projectId}/products/{productId}?from=playbook_preview&playbookId=missing_seo_title&returnTo=...
   ```
2. Clear session storage (DevTools → Application → Session Storage → Clear)
3. Refresh the page

**Expected Results:**
- Shows "Preview expired — regenerate" banner (amber)
- Banner includes "← Back to preview" button
- Clicking the button navigates to returnTo path

#### 1.3 Tab Navigation Preserves Context

**Steps:**
1. Navigate to Product page with preview context (as in 1.1)
2. Click different tabs (Metadata, Answers, Issues, etc.)

**Expected Results:**
- URL continues to contain `from`, `playbookId`, `returnTo` params
- Tab parameter changes but context params remain
- "← Back to preview" link remains functional in sticky header

### 2. Store Health → Work Queue Validation

#### 2.1 Discoverability Card Multi-Key Routing

**Steps:**
1. Navigate to Store Health: `/projects/{projectId}/store-health`
2. Click the "Discoverability" card

**Expected Results:**
- Navigates to Work Queue
- URL contains `from=store_health` and `actionKeys=FIX_MISSING_METADATA,RESOLVE_TECHNICAL_ISSUES`
- Filter Context Banner visible with:
  - "Showing:" label
  - "Store Health → Work Queue" chip
  - Filter labels for both action types
  - Count line: "X action bundles affecting Y items"
- "Clear filters" button visible

#### 2.2 Trust & Compliance Card Multi-Key Routing

**Steps:**
1. Navigate to Store Health
2. Click the "Trust & Compliance" card

**Expected Results:**
- URL contains `actionKeys=IMPROVE_SEARCH_INTENT,SHARE_LINK_GOVERNANCE`
- Filter Context Banner shows both filter labels

#### 2.3 Clear Filters Functionality

**Steps:**
1. Navigate to Work Queue with filter context (as in 2.1)
2. Click "Clear filters" button

**Expected Results:**
- URL no longer contains `from`, `actionKey`, or `actionKeys` params
- Filter Context Banner disappears
- All Work Queue items now visible (unfiltered)

#### 2.4 Generative Visibility Routes to GEO Insights

**Steps:**
1. Navigate to Store Health
2. Click the "Generative Visibility" card

**Expected Results:**
- Navigates to `/projects/{projectId}/insights/geo-insights` (NOT `?tab=geo`)

### 3. CTA Destination Checklist

#### 3.1 "View Issues" Never Routes to Placeholder Pages

**Steps:**
1. Navigate to Work Queue: `/projects/{projectId}/work-queue`
2. Find any bundle card with "View Issues" CTA
3. Inspect the link href (right-click → Inspect)

**Expected Results:**
- Link href is `/projects/{projectId}/issues` or `/projects/{projectId}/issues?pillar=...`
- Link href is NOT `/projects/{projectId}/metadata`
- Link href is NOT `/projects/{projectId}/performance`
- Link href is NOT `/projects/{projectId}/keywords`
- Link href is NOT `/projects/{projectId}/content`

**Steps (continued):**
4. Click "View Issues"

**Expected Results:**
- Lands on Issues page with issue list (not empty placeholder)
- Pillar filter applied if `?pillar=...` in URL

#### 3.2 GEO Export Routes to GEO Insights

**Steps:**
1. Navigate to Work Queue
2. Find a GEO Export bundle (if present)
3. Click "View Export Options"

**Expected Results:**
- Navigates to `/projects/{projectId}/insights/geo-insights`

### 4. Insights Navigation Sanity Checks

#### 4.1 Only One Primary Navigation Strip

**Steps:**
1. Navigate to Insights: `/projects/{projectId}/insights`

**Expected Results:**
- Primary tab strip visible (Summary, DEO Progress, AI Efficiency, etc.)
- data-testid="insights-subnav" present on primary strip
- No secondary horizontal tab strip for pillars
- Pillar selector is a dropdown control (not tabs)
- data-testid="insights-pillar-filter" present on dropdown

#### 4.2 Pillar Dropdown Navigation

**Steps:**
1. Navigate to any Insights subpage
2. Locate the "Pillar" dropdown
3. Select a different pillar (e.g., "Search & Intent")

**Expected Results:**
- Navigates to corresponding pillar page (e.g., `/projects/{projectId}/keywords`)
- Primary Insights tab strip remains visible
- Pillar dropdown shows new selection

#### 4.3 DEO Progress Page Structure

**Steps:**
1. Navigate to DEO Progress: `/projects/{projectId}/insights/deo-progress`

**Expected Results:**
- Primary Insights subnav visible with "DEO Progress" active
- Pillar dropdown filter visible
- No secondary pillar tab strip

---

## Data-TestID Reference

| Test ID | Component | Purpose |
|---------|-----------|---------|
| `insights-subnav` | InsightsSubnav | Primary Insights tab navigation |
| `insights-pillar-filter` | InsightsPillarsSubnav | Pillar dropdown selector |
| `work-queue-filter-context` | Work Queue Page | Filter context banner |
| `work-queue-clear-filters` | Work Queue Page | Clear filters button |

---

## Troubleshooting

### Preview Context Not Preserved
- Verify session storage contains `automationPlaybookState:{projectId}:{playbookId}`
- Check that product ID matches one in `previewSamples` array

### Filter Context Not Showing
- Verify URL contains `from=store_health` or `actionKey`/`actionKeys` params
- Check that Work Queue items exist for the filtered action keys

### Wrong CTA Destination
- Clear browser cache and reload
- Verify ActionBundleCard.tsx has been updated with TRUST-ROUTING-1 changes

---

## Related Documents

- [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) - Phase TRUST-ROUTING-1 section
- [trust-routing-1.spec.ts](../../apps/web/tests/trust-routing-1.spec.ts) - Playwright E2E tests
- [WORK-QUEUE-1.md](./WORK-QUEUE-1.md) - Work Queue foundations
- [NAV-IA-CONSISTENCY-1.md](./NAV-IA-CONSISTENCY-1.md) - Navigation IA context
