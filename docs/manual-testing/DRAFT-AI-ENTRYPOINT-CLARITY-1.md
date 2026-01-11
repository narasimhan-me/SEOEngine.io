# DRAFT-AI-ENTRYPOINT-CLARITY-1 Manual Testing

**Phase:** DRAFT-AI-ENTRYPOINT-CLARITY-1
**Feature:** AI Boundary Notes at Draft Workflow Surfaces
**Date:** 2026-01-10

## Overview

This document covers manual testing for DRAFT-AI-ENTRYPOINT-CLARITY-1, which adds explicit AI boundary labeling at draft workflow surfaces. The boundary notes provide transparency about AI usage at each step:

- **Review surfaces**: "Review & edit (no AI on this step)" - clarifies human-only review
- **Generate surfaces**: "AI used for drafts only · AI is not used at Apply" - discloses AI usage

## Locked Statements

- **Locked Copy**: The boundary note text is locked and must not be modified without phase approval
- **Review mode**: "Review & edit (no AI on this step)" with person icon
- **Generate mode**: "AI used for drafts only" with lightbulb icon + "AI is not used at Apply"

## Prerequisites

1. User logged in with OWNER role
2. Project with connected Shopify store
3. At least one product with pending draft (status READY or PARTIAL)
4. Products without drafts (for generation flow)

## Test Scenarios

### 1. Product Drafts Tab - Review Boundary Note

**Steps:**
1. Navigate to Products list (`/projects/{projectId}/products`)
2. Find a product with "🟡 Draft saved (not applied)" chip
3. Click "Review drafts" action button
4. Observe the Drafts tab panel

**Expected:**
- Navigates to Product detail page with Drafts tab selected
- AI boundary note is visible below the "Drafts" heading
- Note displays: "Review & edit (no AI on this step)"
- Note has person icon (gray)
- Note has `data-testid="draft-ai-boundary-note"` and `data-mode="review"`

### 2. Playbooks Draft Review - Review Boundary Note

**Steps:**
1. Navigate to Pages or Collections list
2. Find an asset with "🟡 Draft saved (not applied)" chip
3. Click "Review drafts" action button
4. Observe the Draft Review panel

**Expected:**
- Navigates to `/automation/playbooks?mode=drafts&assetType=...&assetId=...`
- AI boundary note is visible below the ScopeBanner
- Note displays: "Review & edit (no AI on this step)"
- Note has person icon (gray)
- Note has `data-testid="draft-ai-boundary-note"` and `data-mode="review"`

### 3. Playbooks Generation - Generate Boundary Note

**Steps:**
1. Navigate to Playbooks page (`/projects/{projectId}/automation/playbooks`)
2. Select a playbook with eligible items
3. Observe Step 1 section

**Expected:**
- AI boundary note is visible below the "Generate preview (uses AI)" button
- Note displays: "AI used for drafts only · AI is not used at Apply"
- Note has lightbulb icon (indigo)
- Note has `data-testid="draft-ai-boundary-note"` and `data-mode="generate"`

### 3a. [FIXUP-1] Work Queue Generation CTA - Generate Boundary Note

**Steps:**
1. Navigate to Work Queue (`/projects/{projectId}/work-queue`)
2. Locate an action bundle card with "Generate Drafts" or "Generate Full Drafts" CTA
3. Observe the boundary note below the CTA

**Expected:**
- AI boundary note is visible below the generation CTA
- Note displays: "AI used for drafts only · AI is not used at Apply"
- Note has lightbulb icon (indigo)
- Note has `data-testid="draft-ai-boundary-note"` and `data-mode="generate"`
- Note appears ONLY on cards with generation CTAs (not review or apply CTAs)

### 4. Review Boundary Note Content Verification

**Steps:**
1. Navigate to any review surface (Product Drafts tab or Playbooks Draft Review)
2. Inspect the boundary note content

**Expected:**
- Visible text: "Review & edit (no AI on this step)"
- On larger screens (sm+): Additional context "— AI may have been used earlier to generate drafts. Editing and approval are manual."
- Text is styled subtly (gray, small font size)
- No warning/error styling (informational only)

### 5. Generate Boundary Note Content Verification

**Steps:**
1. Navigate to Playbooks generation page
2. Inspect the boundary note content

**Expected:**
- Visible text: "AI used for drafts only · AI is not used at Apply"
- Text is styled subtly (gray, small font size)
- No warning/error styling (informational only)

## Data Attributes Verification

The boundary note component includes test hooks for E2E automation:

| Attribute | Review Mode | Generate Mode |
|-----------|-------------|---------------|
| `data-testid` | `draft-ai-boundary-note` | `draft-ai-boundary-note` |
| `data-mode` | `review` | `generate` |

## Visual Style Verification

- **Review icon**: Person silhouette (gray-400)
- **Generate icon**: Lightbulb (indigo-400)
- **Text color**: Gray-500
- **Font size**: Extra small (text-xs)
- **Layout**: Flex with gap, centered items

## Test Data Setup

For E2E testing, use the seed endpoint:
```
POST /testkit/e2e/seed-draft-ai-entrypoint-clarity-1
```

This creates:
- Product with pending draft (for review boundary testing)
- Product without draft (for generate boundary testing)

## Related Documents

- [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) - Phase documentation
- [DRAFT-ENTRYPOINT-UNIFICATION-1.md](./DRAFT-ENTRYPOINT-UNIFICATION-1.md) - Product Drafts tab
- [DRAFT-REVIEW-ISOLATION-1.md](./DRAFT-REVIEW-ISOLATION-1.md) - Non-AI boundary contract
- [DRAFT-EDIT-INTEGRITY-1.md](./DRAFT-EDIT-INTEGRITY-1.md) - Inline edit feature
