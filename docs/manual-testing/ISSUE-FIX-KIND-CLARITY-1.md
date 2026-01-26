# Manual Testing: ISSUE-FIX-KIND-CLARITY-1

> Diagnostic vs Fixable Issue CTA Semantics

## Overview

This phase ensures that DIAGNOSTIC issues (informational, no direct fix available) are semantically distinguished from EDIT/AI issues (actionable with direct fix surface) across all surfaces.

## Prerequisites

- Access to a project with detected issues
- Products with both DIAGNOSTIC issues (e.g., `not_answer_ready`) and EDIT issues (e.g., `missing_seo_title`)
- Or use existing seed: `POST /testkit/e2e/seed-first-deo-win`

---

## IssueFixKind Classification

| fixKind      | Meaning                                   | CTA Wording       | Arrival Callout               |
| ------------ | ----------------------------------------- | ----------------- | ----------------------------- |
| `EDIT`       | User edits a field directly               | "Fix" / "Fix now" | Indigo "You're here to fix:"  |
| `AI`         | User triggers AI generation               | "Fix" / "Fix now" | Indigo "You're here to fix:"  |
| `DIAGNOSTIC` | Informational; review data, no direct fix | "Review"          | Blue "You're here to review:" |

**Known DIAGNOSTIC Issues:**

- `not_answer_ready` - Answer readiness analysis (Search & Intent)

---

## Test Scenarios

### Scenario 1: Issues Engine CTA Wording

**Route:** `/projects/{projectId}/issues`

1. Navigate to the Issues Engine
2. Locate an issue card with `data-fix-kind="DIAGNOSTIC"`
3. **Verify:**
   - [ ] CTA shows "Review" (not "Fix")
   - [ ] CTA has blue styling (`bg-blue-50`)
   - [ ] Card is still clickable (has button role)
4. Locate an issue card with `data-fix-kind="EDIT"`
5. **Verify:**
   - [ ] CTA shows action label (e.g., "Fix with AI", "Open") - NOT "Review"
   - [ ] "Fixes one affected product at a time..." text is shown for AI issues

---

### Scenario 2: DEO Overview CTA Wording

**Route:** `/projects/{projectId}/deo`

1. Navigate to DEO Overview
2. Find "Top Recommended Actions" section
3. For a DIAGNOSTIC issue (if present):
   - **Verify:** CTA link shows "Review" (not "Fix now")
4. For a non-DIAGNOSTIC issue:
   - **Verify:** CTA link shows "Fix now" (not "Review")

---

### Scenario 3: DIAGNOSTIC Arrival Callout (Blue, Not Yellow)

**Route:** `/projects/{projectId}/products/{productId}?from=issues&issueId=not_answer_ready&tab=search-intent`

> [FIXUP-1] NOTE: fixKind is NOT passed in URL. It is derived from issue config only.

1. Navigate to a product with DIAGNOSTIC issue context
2. **Verify:**
   - [ ] Arrival callout banner (`data-testid="issue-fix-context-banner"`) is visible
   - [ ] Banner has blue styling (`bg-blue-50`) NOT yellow (`bg-yellow-50`)
   - [ ] Banner shows "You're here to review:" (not "You're here to fix:")
   - [ ] Banner does NOT show "Fix surface not available" message

---

### Scenario 4: "View related issues" CTA for DIAGNOSTIC

**Route:** `/projects/{projectId}/products/{productId}?from=issues&issueId=not_answer_ready&tab=search-intent`

> [FIXUP-1] NOTE: fixKind is NOT passed in URL. It is derived from issue config only.

1. Navigate to a product with DIAGNOSTIC issue context
2. **Verify:**
   - [ ] Arrival callout shows "View related issues" button (`data-testid="issue-fix-view-related-issues"`)
   - [ ] Clicking the button navigates to Issues Engine: `/projects/{projectId}/issues?mode=detected&pillar={pillarId}`
   - [ ] URL contains `mode=detected` and `pillar=` parameters

---

### Scenario 5: Non-DIAGNOSTIC Arrival Callout (Standard Behavior)

**Route:** `/projects/{projectId}/products/{productId}?from=issues&issueId=missing_seo_title&tab=metadata`

1. Navigate to a product with non-DIAGNOSTIC issue context
2. **Verify:**
   - [ ] Arrival callout shows "You're here to fix:" (not "You're here to review:")
   - [ ] Banner has indigo styling (`bg-indigo-50`) when actionable
   - [ ] "View related issues" CTA is NOT shown

---

### Scenario 6: Products List "Review" CTA for DIAGNOSTIC Issues

> [FIXUP-2] Aggregation CTA wording based on fixNextIsDiagnostic

**Route:** `/projects/{projectId}/products`

**Setup:** Use seed with Product 4 (SEO fields populated; body copy < 80 words so `not_answer_ready` is the deterministic next issue)

1. Navigate to the Products list
2. Locate the row for "Product 4 - DIAGNOSTIC Test"
3. **Verify:**
   - [ ] Row shows "⚠ Needs attention" chip (has actionable issue)
   - [ ] Primary action CTA shows "Review" (NOT "Fix next")
   - [ ] Clicking "Review" navigates to Product detail with `issueId=not_answer_ready&tab=search-intent`

---

### Scenario 7: Work Queue DIAGNOSTIC Banner Wording

> [FIXUP-2] Work Queue issue fix context banner uses fixKind-aware wording

**Route:** `/projects/{projectId}/work-queue?from=issues&issueId=not_answer_ready`

1. Navigate to Work Queue with DIAGNOSTIC issue context
2. **Verify:**
   - [ ] Issue fix context banner (`data-testid="work-queue-issue-fix-context-banner"`) is visible
   - [ ] Banner has `data-fix-kind="DIAGNOSTIC"` attribute
   - [ ] Banner has blue styling (`bg-blue-50`) NOT indigo (`bg-indigo-50`)
   - [ ] Banner shows "You're here to review:" (NOT "You're here to fix:")
   - [ ] Helper line uses "To review this issue:" (NOT "To fix this issue:")

---

## Critical Invariants

1. **DIAGNOSTIC issues NEVER show "Fix surface not available"** - They use the dedicated "diagnostic" callout variant
2. **DIAGNOSTIC CTAs use "Review" wording** - Never "Fix" or "Fix now"
3. **DIAGNOSTIC arrival callout is blue** - Never yellow (anchor_not_found) or indigo (actionable)
4. **fixKind is derived from issue config, not URL** - `getIssueFixConfig()` / `fixPath.fixKind` is the source of truth; URL does not include `fixKind` param
5. **"View related issues" routes to Issues Engine** - NOT to product `?tab=issues`

---

## Test Coverage

- Playwright E2E: `apps/web/tests/issue-fix-kind-clarity-1.spec.ts`
  - IFKC1-001: DIAGNOSTIC issue shows Review CTA in Issues Engine
  - IFKC1-002: Non-DIAGNOSTIC issue shows Fix CTA in Issues Engine
  - IFKC1-003: DIAGNOSTIC arrival callout uses blue styling
  - IFKC1-004: DIAGNOSTIC callout shows View related issues CTA (routes to Issues Engine)
  - IFKC1-005: DEO Overview shows correct CTA for DIAGNOSTIC issues
  - IFKC1-006: [FIXUP-2] Products list shows Review CTA for DIAGNOSTIC-topped product
  - IFKC1-007: [FIXUP-2] Work Queue shows blue review banner for DIAGNOSTIC issueId

- Playwright E2E: `apps/web/tests/list-actions-clarity-1.spec.ts`
  - LAC1-002b: [FIXUP-2] DIAGNOSTIC issue product shows Review CTA (not Fix next)

---

## Notes

- The `fixKind` field defaults to `'EDIT'` if not specified in issue config
- Search & Intent issues use `search-intent-tab-anchor` as canonical anchor (no module-level testids)
- DIAGNOSTIC issues (`not_answer_ready`) have NO `fixAnchorTestId` - no scroll/highlight is performed
- `buildIssueFixHref()` does NOT emit `fixKind` in URL; skips `fixAnchor` for DIAGNOSTIC issues
- All surfaces derive `fixKind` via `getIssueFixConfig(issueType)` or `fixPath.fixKind` - never from URL
- [FIXUP-2] Products list uses `fixNextIsDiagnostic` flag to show "Review" instead of "Fix next"
- [FIXUP-2] Work Queue derives `fixKind` from `getIssueFixConfig(issueIdParam)` for banner wording
- [FIXUP-2] Product 4 in seed has SEO populated + thin content to trigger not_answer_ready as top issue

---

## FIXUP-3: Issues Decision Engine Fix-Action Kinds (2026-01-25)

### Canonical Fix-Action Kinds

| Kind             | Meaning                                  | Issues CTA Label   | Icon             | Sublabel/Tooltip                |
| ---------------- | ---------------------------------------- | ------------------ | ---------------- | ------------------------------- |
| `AI_PREVIEW_FIX` | AI fix with inline preview               | "Review AI fix"    | workflow.ai      | "Preview changes before saving" |
| `DIRECT_FIX`     | Direct navigation to workspace           | "Fix in workspace" | nav.projects     | "Manual changes required"       |
| `GUIDANCE_ONLY`  | Diagnostic/review only, no automatic fix | "Review guidance"  | playbook.content | "No automatic fix available"    |
| `BLOCKED`        | No action reachable in current UI        | "Blocked"          | status.blocked   | "No action available"           |

### Derivation Logic

The fix-action kind is derived from existing signals (no guesswork):

1. Uses `getIssueActionDestinations()` to determine which destinations are reachable
2. Uses `getIssueFixConfig(issueType)?.fixKind` to check for DIAGNOSTIC issues
3. Uses `issue.fixType` and `issue.fixReady` to determine AI preview support

### Test Scenarios (FIXUP-3)

#### Scenario F3-001: AI Preview Issue Shows "Review AI fix"

**Route:** `/projects/{projectId}/issues`

**Setup:** Issue with `fixType='aiFix'`, `fixReady=true`, and `primaryProductId` set

1. Navigate to Issues Engine
2. Locate an issue with AI preview fix
3. **Verify:**
   - [ ] CTA button shows "Review AI fix" (not "Fix now")
   - [ ] Button has AI icon (workflow.ai - sparkle icon)
   - [ ] Title attribute shows "Preview changes before saving"
   - [ ] Click opens inline preview panel (no navigation)
   - [ ] `data-testid="issue-fix-next-button"` preserved

---

#### Scenario F3-002: Direct Fix Issue Shows "Fix in workspace"

**Route:** `/projects/{projectId}/issues`

**Setup:** Issue with `fixType='manualFix'` or non-AI fix destination

1. Navigate to Issues Engine
2. Locate an issue with direct fix (non-AI)
3. **Verify:**
   - [ ] CTA link shows "Fix in workspace" (not "Fix now")
   - [ ] Link has projects icon (nav.projects - inventory icon)
   - [ ] Title attribute shows "Manual changes required"
   - [ ] Click navigates to product workspace
   - [ ] `data-testid="issue-fix-button"` preserved

---

#### Scenario F3-003: Guidance-Only Issue Shows "Review guidance"

**Route:** `/projects/{projectId}/issues`

**Setup:** Issue with `fixKind='DIAGNOSTIC'` or no fix but viewAffected/open available

1. Navigate to Issues Engine
2. Locate a diagnostic or guidance-only issue
3. **Verify:**
   - [ ] CTA link shows "Review guidance"
   - [ ] Link has content icon (playbook.content - article icon)
   - [ ] Title attribute shows "No automatic fix available" or "See affected items"
   - [ ] `data-testid="issue-fix-button"` or `data-testid="issue-view-affected-button"` preserved

---

#### Scenario F3-004: Blocked Issue Shows "Blocked" Chip

**Route:** `/projects/{projectId}/issues`

**Setup:** Issue with no reachable actions

1. Navigate to Issues Engine
2. Locate a blocked issue
3. **Verify:**
   - [ ] "Blocked" chip displayed (not a button/link)
   - [ ] Tooltip shows reason why blocked
   - [ ] `data-testid="issue-blocked-chip"` preserved

---

#### Scenario F3-005: RCP Actionability Shows Fix-Action Kind Sentence

**Route:** `/projects/{projectId}/issues` → click any issue row

1. Navigate to Issues Engine
2. Click on any issue row to open RCP
3. Observe the Actionability section
4. **Verify:**
   - [ ] Actionability section shows one of these sentences in italic:
     - AI: "This issue offers an AI-generated preview. Nothing is applied automatically."
     - Direct: "This fix requires manual changes in the workspace."
     - Guidance: "This issue is guidance-only. No automatic fix is available."
     - Blocked: "No fix action is reachable in the current UI."
   - [ ] No buttons/CTAs/links in the RCP body

---

### Verification Checklist (FIXUP-3)

- [ ] **No misleading "Apply/automation" language** unless the inline preview apply CTA is present and enabled
- [ ] **AI preview CTAs include "Review"** in label (dev-time warning if not)
- [ ] **Direct fix CTAs do NOT include "AI/Apply/Automation"** in label (dev-time warning if they do)
- [ ] **All existing data-testid selectors preserved** (issue-fix-next-button, issue-fix-button, issue-view-affected-button, issue-blocked-chip)
- [ ] **Icons render correctly** via Icon component (workflow.ai, nav.projects, playbook.content)

---

## FIXUP-4: Preview Eligibility + View Affected Label (2026-01-25)

### Changes

1. **AI_PREVIEW_FIX requires inline preview support** - Derivation now checks `isInlineAiPreviewSupportedIssueType()` which uses a centralized allowlist
2. **viewAffected actions labeled as exploration** - "View affected" label instead of "Review guidance" for GUIDANCE_ONLY issues that only have viewAffected destination

### Inline Preview Allowlist

The inline AI preview is only available for these issue types:

| Issue Type               | Inline Preview |
| ------------------------ | -------------- |
| `missing_seo_title`      | ✓ Supported    |
| `missing_seo_description`| ✓ Supported    |
| All other issue types    | ✗ Not supported |

### GUIDANCE_ONLY Label Logic

| Has viewAffected? | Has fix destination? | Label              | Icon           |
| ----------------- | -------------------- | ------------------ | -------------- |
| Yes               | No                   | "View affected"    | nav.projects   |
| Yes/No            | Yes (DIAGNOSTIC)     | "Review guidance"  | playbook.content |

### Test Scenarios (FIXUP-4)

#### Scenario F4-001: AI Fix without Inline Preview Support

**Route:** `/projects/{projectId}/issues`

**Setup:** Issue with `fixType='aiFix'`, `fixReady=true` but NOT in inline preview allowlist

1. Navigate to Issues Engine
2. Locate an AI-fixable issue that is NOT `missing_seo_title` or `missing_seo_description`
3. **Verify:**
   - [ ] CTA does NOT show "Review AI fix" (should show "Fix with AI" link instead)
   - [ ] Click navigates to workspace (does not open inline preview)
   - [ ] Action kind derived is `DIRECT_FIX`, NOT `AI_PREVIEW_FIX`

---

#### Scenario F4-002: View Affected Shows Exploration Label

**Route:** `/projects/{projectId}/issues`

**Setup:** Issue with affected products but no fix destination

1. Navigate to Issues Engine
2. Locate an issue that has `affectedProducts` but no direct fix (viewAffected only)
3. **Verify:**
   - [ ] CTA shows "View affected" (NOT "Review guidance")
   - [ ] Icon is nav.projects (inventory icon)
   - [ ] Tooltip shows "See affected items"
   - [ ] Click navigates to Products list with issue filter

---

### Dev-Time Guardrails (FIXUP-4)

In development mode, console warnings appear when:

1. **AI_PREVIEW_FIX derived but supportsInlineFix is false** - Indicates allowlist drift between `issueFixActionKind.ts` and `page.tsx`

### Verification Checklist (FIXUP-4)

- [ ] **AI preview CTA only shown for supported issue types** (`missing_seo_title`, `missing_seo_description`)
- [ ] **Non-supported AI issues get "Fix with AI" link** (navigates to workspace)
- [ ] **viewAffected-only issues show "View affected"** (exploration label, not guidance)
- [ ] **DIAGNOSTIC issues still show "Review guidance"** (unchanged)
- [ ] **Single source of truth for inline preview support** (`inlineAiPreviewSupport.ts`)
- [ ] **No console warnings in dev mode** (allowlists are aligned)
