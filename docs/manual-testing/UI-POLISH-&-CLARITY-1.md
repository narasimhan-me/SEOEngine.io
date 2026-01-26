# EngineO.ai – Manual Testing: UI-POLISH-&-CLARITY-1

> **Polish-only patch for Design System v1.5 alignment**
>
> This patch contains **styling-only** changes. No behavior, navigation, or logic changes.

---

## Overview

- **Purpose of the feature/patch:**
  - Apply polish-only styling updates to align with Design System v1.5 / EIC v1.5
  - Improve visual hierarchy, spacing, and token compliance across the UI shell
  - Remove any remaining literal palette classes (e.g., `bg-red-500`) in favor of token-only styling

- **High-level user impact and what "success" looks like:**
  - Consistent visual appearance across all pages
  - Dark mode works correctly (no white backgrounds in dark mode)
  - Shopify iframe embedding works without issues
  - All interactive elements have appropriate hover/focus states
  - Spacing and density feel comfortable and consistent

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase UX-POLISH-1: UI Polish & Visual Clarity

- **Related documentation:**
  - DESIGN_SYSTEM_ALIGNMENT.md
  - ENGINEERING_IMPLEMENTATION_CONTRACT.md
  - UI_SHELL_DIRECTIONS.md

---

## Preconditions

- **Environment requirements:**
  - [ ] Development server running (`pnpm dev`)
  - [ ] No special env vars required (styling-only)
  - [ ] Test in both light and dark modes

- **Test accounts and sample data:**
  - [ ] Any authenticated user account
  - [ ] At least one project with products and issues

- **Required user roles or subscriptions:**
  - [ ] Any plan tier (visual changes apply to all users)

---

## Test Scenarios (Happy Path)

### Scenario 1: DataTable Density and Hover States

**ID:** HP-001

**Preconditions:**

- Navigate to any page with a DataTable (e.g., Products list, Issues Engine)

**Steps:**

1. View the DataTable header row
2. View the DataTable body rows
3. Hover over a body row
4. Focus a row using keyboard navigation (Tab + Arrow keys)

**Expected Results:**

- **UI:**
  - Header text uses `text-foreground/80` (slightly muted but readable)
  - Row padding is `py-2.5` (dense) or `py-3.5` (comfortable)
  - Hover state uses `bg-[hsl(var(--surface-raised))]` (not white in dark mode)
  - Focus ring is visible and uses primary color

---

### Scenario 2: DataList Density and Hover States

**ID:** HP-002

**Preconditions:**

- Navigate to any page with a DataList component

**Steps:**

1. View the DataList rows
2. Hover over a row
3. Focus a row using keyboard navigation

**Expected Results:**

- **UI:**
  - Row padding matches DataTable (`py-2.5` or `py-3.5`)
  - Hover state uses `bg-[hsl(var(--surface-raised))]`
  - Focus ring is visible

---

### Scenario 3: ProjectSideNav Active State

**ID:** HP-003

**Preconditions:**

- Navigate to any project page

**Steps:**

1. View the left sidebar navigation
2. Click different nav items to change active state
3. Observe inactive items

**Expected Results:**

- **UI:**
  - Active nav item has a visible accent bar on the left (primary color at 60% opacity)
  - Active nav item has `bg-muted` background and `font-medium`
  - Inactive items use `text-foreground/70` (visible but de-emphasized)
  - Hover state on inactive items shows `bg-muted` and `text-foreground`

---

### Scenario 4: LayoutShell Breadcrumbs

**ID:** HP-004

**Preconditions:**

- Navigate deep into a project (e.g., `/projects/{id}/products`)

**Steps:**

1. View the breadcrumb trail at the top of the page
2. Click a breadcrumb link (e.g., project name)
3. Observe section label display

**Expected Results:**

- **UI:**
  - Breadcrumbs display: `Projects > {Project Name} > {Section}`
  - Breadcrumb separators use `>` with muted foreground color
  - Links use token-only styling (`text-muted-foreground` with `hover:text-foreground`)
  - Current section is not a link (just text with `text-foreground`)

---

### Scenario 5: Right Context Panel Spacing

**ID:** HP-005

**Preconditions:**

- Navigate to a page with RCP support (Products, Issues)

**Steps:**

1. Click the "View details" button on a row to open RCP
2. Observe header padding
3. Observe content padding
4. Observe section separation

**Expected Results:**

- **UI:**
  - Header uses `py-3.5` padding (increased from `py-3`)
  - Content area uses `p-5` padding (increased from `p-4`)
  - Sections are separated with `space-y-5` (increased from `space-y-4`)
  - Overall feel is more spacious and readable

---

### Scenario 6: Issues Engine Token Compliance

**ID:** HP-006

**Preconditions:**

- Navigate to `/projects/{id}/issues`

**Steps:**

1. View severity cards (Critical, Warning, Info)
2. View issue status badges
3. View error/warning banners (if any)
4. View filter buttons

**Expected Results:**

- **UI:**
  - Severity cards use semantic tokens:
    - Critical: `bg-[hsl(var(--danger-background))]` with `text-[hsl(var(--danger-foreground))]`
    - Warning: `bg-[hsl(var(--warning-background))]` with `text-[hsl(var(--warning-foreground))]`
    - Info: `bg-[hsl(var(--info-background))]` with `text-[hsl(var(--info-foreground))]`
  - No literal palette classes (no `bg-red-500`, `text-blue-600`, etc.)
  - All elements work correctly in dark mode

---

### Scenario 7: Dark Mode Verification

**ID:** HP-007

**Preconditions:**

- Toggle to dark mode (via system preference or theme toggle)

**Steps:**

1. Navigate through all modified pages:
   - Products list
   - Issues Engine
   - Product detail
   - Settings pages
2. Observe backgrounds, text colors, and interactive states

**Expected Results:**

- **UI:**
  - No white backgrounds appear unexpectedly
  - All text is readable against backgrounds
  - Hover states use raised surface (not white)
  - Focus rings are visible
  - Semantic colors (danger, warning, success, info) remain distinguishable

---

### Scenario 8: RowStatusChip + ProductTable Health Pill Token Compliance

**ID:** HP-008

**Preconditions:**

- Navigate to `/projects/{id}/products`

**Steps:**

1. View the Products list DataTable
2. Observe the Status column chips
3. Toggle to dark mode
4. Observe the status chips again

**Expected Results:**

- **UI:**
  - Status chips use token-only styling (no literal palette classes like `bg-green-50`, `bg-yellow-50`, etc.)
  - Optimized status uses `--success-background` and `--success-foreground`
  - Needs Attention status uses `--warning-background` and `--warning-foreground`
  - Draft saved status uses `--info-background` and `--info-foreground`
  - Blocked status uses `--danger-background` and `--danger-foreground`
  - All chips readable in both light and dark mode

---

### Scenario 9: ProductIssuesPanel AI Fixable Badge Neutrality

**ID:** HP-009

**Preconditions:**

- Navigate to a product detail page with issues that have AI fixable flag
- Or navigate to `/projects/{id}/products/{productId}?tab=issues`

**Steps:**

1. View the issues list in ProductIssuesPanel
2. Find an issue with "AI fixable" badge
3. Observe the badge styling

**Expected Results:**

- **UI:**
  - AI fixable badge uses neutral token-only styling: `border-border bg-muted text-muted-foreground`
  - Badge is de-emphasized (no purple highlighting)
  - Badge is readable but not visually dominant

---

### Scenario 10: Product Detail Header Action Hierarchy

**ID:** HP-010

**Preconditions:**

- Navigate to a product detail page `/projects/{id}/products/{productId}`

**Steps:**

1. View the sticky header action buttons
2. Observe "Automate this fix" button
3. Observe "Apply to Shopify" button
4. Toggle dark mode and observe again

**Expected Results:**

- **UI:**
  - "Automate this fix" button is secondary (outlined): `border-border bg-[hsl(var(--surface-card))] text-foreground hover:bg-muted`
  - "Apply to Shopify" button is primary success: `bg-[hsl(var(--success))] text-[hsl(var(--primary-foreground))]`
  - Both buttons have proper `focus-visible:ring-*` styling
  - Both buttons are token-only (no `bg-green-600`, `border-gray-300`, etc.)
  - Clear visual hierarchy (Apply is more prominent than Automate)

---

### Scenario 11: Playbooks Rules Block Form Styling

**ID:** HP-011

**Preconditions:**

- Navigate to `/projects/{id}/automation/playbooks`
- Select a playbook and reach the "Generate preview" step

**Steps:**

1. View the "Playbook rules" block
2. Observe the container styling
3. Test the toggle switch
4. Observe the input fields (Find, Replace, Prefix, Suffix, Max length, Forbidden phrases)
5. Focus an input field

**Expected Results:**

- **UI:**
  - Rules block container: `border-border bg-[hsl(var(--surface-card))] p-4`
  - Heading uses `text-foreground`, helper text uses `text-muted-foreground`
  - Toggle switch uses `bg-primary` when enabled, `bg-muted` when disabled
  - Toggle knob uses `bg-background`
  - All inputs: `border-border bg-background text-foreground px-3 py-2` (increased padding)
  - Focus ring: `focus-visible:ring-primary focus-visible:ring-offset-background`
  - All styling is token-only (no `bg-blue-600`, `border-gray-300`, etc.)

---

### Scenario 12: Product Detail Preview + Expired Banners (FIXUP-2)

**ID:** HP-012

**Preconditions:**

- Navigate to a product detail page via Playbooks preview context (`?from=playbook_preview`)

**Steps:**

1. View the preview mode banner (when preview is valid)
2. Simulate expired preview (wait or manipulate session)
3. View the expired banner
4. Toggle dark mode and observe both banner states

**Expected Results:**

- **UI:**
  - Preview mode banner uses INFO tokens: `bg-[hsl(var(--info-background))]`, `text-[hsl(var(--info-foreground))]`, `border-border`
  - Expired banner uses WARNING tokens: `bg-[hsl(var(--warning-background))]`, `text-[hsl(var(--warning-foreground))]`, `border-border`
  - CTA button in expired banner: `bg-[hsl(var(--warning))]`, `text-[hsl(var(--primary-foreground))]`, token focus ring
  - Comparison cards use `border-border bg-[hsl(var(--surface-card))]`
  - Labels use `text-muted-foreground`, values use `text-foreground`
  - No literal purple/amber palette classes
  - Both banners readable in dark mode

---

### Scenario 13: Issue Fix Arrival Callout Token Compliance (FIXUP-2)

**ID:** HP-013

**Preconditions:**

- Navigate to a product detail page via issue fix navigation (`?from=fix_issue`)
- Or directly test different callout variants (actionable, already_compliant, external_fix, diagnostic, anchor_not_found, coming_soon)

**Steps:**

1. Arrive on a product with an actionable fix (highlight anchor visible)
2. Arrive on a product that's already compliant
3. Arrive on a product with an external fix (Shopify admin required)
4. Arrive on a product with a diagnostic issue (no direct fix)
5. Toggle dark mode and observe all callout variants

**Expected Results:**

- **UI:**
  - **Actionable:** `bg-primary/10 border-border text-foreground`
  - **Already compliant:** `bg-[hsl(var(--success-background))] border-border text-[hsl(var(--success-foreground))]`
  - **External fix:** `bg-[hsl(var(--warning-background))] border-border text-[hsl(var(--warning-foreground))]`
  - **Diagnostic:** `bg-[hsl(var(--info-background))] border-border text-[hsl(var(--info-foreground))]`
  - **Anchor not found:** `bg-[hsl(var(--warning-background))] border-border text-[hsl(var(--warning-foreground))]`
  - **Coming soon:** `bg-[hsl(var(--surface-raised))] border-border text-muted-foreground`
  - Highlight outline animation uses `hsl(var(--primary) / 0.5)` and `hsl(var(--primary) / 0.8)`
  - Back button uses `bg-primary text-primary-foreground hover:bg-primary/90`
  - "View related issues" link uses `border-border bg-[hsl(var(--surface-card))] text-foreground hover:bg-muted`
  - No literal palette classes (no `bg-indigo-50`, `border-blue-300`, `rgb(99 102 241)`)

---

### Scenario 14: Playbooks Preview Validity Badge + Sample Cards (FIXUP-2)

**ID:** HP-014

**Preconditions:**

- Navigate to `/projects/{id}/automation/playbooks`
- Select a playbook and generate a preview

**Steps:**

1. Generate a preview (should show "Preview valid" badge)
2. Modify rules to invalidate the preview (should show "Rules changed" badge)
3. Observe the preview sample cards
4. Click "Open product →" link
5. Toggle dark mode

**Expected Results:**

- **UI:**
  - **Preview valid badge:** `border border-border bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]`
  - **Rules changed / Estimate required badges:** `border border-border bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]`
  - **Loading state:** `border-border bg-[hsl(var(--surface-raised))] text-muted-foreground`
  - **Empty state:** `border border-dashed border-border bg-[hsl(var(--surface-raised))] text-muted-foreground`
  - **Sample card container:** `border-border bg-[hsl(var(--surface-raised))]`
  - **Product title:** `text-foreground`
  - **"Open product →" link:** `text-primary hover:text-primary/80`
  - **Before/After labels:** `text-foreground`
  - **Before/After value containers:** `border-border bg-[hsl(var(--surface-card))] text-foreground`
  - **Placeholder text:** `text-muted-foreground/70`
  - No literal palette classes (no `bg-gray-50`, `border-gray-200`, `text-blue-600`)

---

### Scenario 15: Issue Fix Anchors Commented Example Block (FIXUP-3)

**ID:** HP-015

**Preconditions:**

- Open `/Volumes/Seagate Hub/GitHub/EngineO.ai/apps/web/src/lib/issue-fix-anchors.ts` in code editor

**Steps:**

1. Locate the JSDoc comment block for `HIGHLIGHT_CSS` (around line 240-260)
2. Verify the commented CSS example matches the runtime `HIGHLIGHT_CSS` constant

**Expected Results:**

- **Code:**
  - Commented example uses `hsl(var(--primary) / 0.5)` and `hsl(var(--primary) / 0.8)` (not `rgb(99 102 241 / alpha)`)
  - Comment and runtime code are in sync (both use HSL tokens)
  - No raw RGB values in comments

---

### Scenario 16: Product Detail Tab Headers Token Compliance (FIXUP-3)

**ID:** HP-016

**Preconditions:**

- Navigate to a product detail page `/projects/{id}/products/{productId}`
- View each tab: Answers, Search & Intent, Competitors, GEO, Automations, Issues

**Steps:**

1. View the tab section headers (e.g., "Answers (AEO)", "Search & Intent", etc.)
2. View the section subtitles/descriptions
3. View any "Settings" or configuration links within tabs
4. Find an AI diagnostic preview toggle button (if available)
5. Focus the SEO editor field (when issue fix navigation highlights it)
6. Toggle dark mode and observe all elements

**Expected Results:**

- **UI:**
  - Section headers use `text-foreground` (no `text-gray-900`)
  - Section subtitles use `text-muted-foreground` (no `text-gray-600`)
  - Settings links use `text-primary hover:underline` (no `text-blue-600`)
  - AI diagnostic toggle button uses token-only styling:
    - `border-border bg-[hsl(var(--surface-card))] text-foreground hover:bg-muted`
    - `focus-visible:ring-primary focus-visible:ring-offset-background`
  - SEO editor highlight ring uses `ring-primary ring-offset-background` (no `ring-blue-500`)
  - All elements readable in dark mode

---

### Scenario 17: Playbooks Complete Token Compliance (FIXUP-3)

**ID:** HP-017

**Preconditions:**

- Navigate to `/projects/{id}/automation/playbooks`
- Have a playbook available with various states (preview generated, rules changed, etc.)

**Steps:**

1. **Draft status badges:** View status badges showing READY or IN_PROGRESS states
2. **Eligibility badges:** View "Pro / Business" or "Upgrade for bulk automations" badges on playbook cards
3. **Saved preview callout:** Generate a preview, modify rules, observe "Saved preview found" callout
4. **Continue blocked panel:** Trigger a continue blocker state (e.g., rules changed or plan not eligible)
5. **Estimate blockers:** View the estimate panel with blocking reasons (e.g., plan not eligible, AI limit reached)
6. **Draft blocker panels:** View EXPIRED, FAILED, or missing draft status panels
7. **Regenerate/Generate buttons:** Test all Regenerate/Generate preview buttons (amber/primary variants)
8. **Apply inline errors:** Trigger apply errors (RULES_CHANGED, SCOPE_INVALID, DRAFT_NOT_FOUND, DRAFT_EXPIRED)
9. **Apply result summary:** Complete an apply and view results panel
10. **Stopped safely banner:** Stop playbook mid-apply or hit daily limit
11. **Skipped products warning:** Have some products skipped during apply
12. **Status column badges:** View the per-product results table with UPDATED/SKIPPED/LIMIT_REACHED/error statuses
13. **Approval status messages:** Test Editor/Owner approval workflows and observe status messages
14. **Checkbox:** Check the "I understand" confirmation checkbox before apply
15. **Apply button:** Test the main apply button in various states
16. Toggle dark mode and observe all above elements

**Expected Results:**

- **UI:**
  - **Draft status badges:** `bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]` (READY) or `bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]` (IN_PROGRESS)
  - **Eligibility badges:** eligible uses `bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]`, ineligible uses `bg-muted text-muted-foreground`
  - **Saved preview callout:** `bg-[hsl(var(--info-background))] text-[hsl(var(--info-foreground))] border-border`, heading uses `text-foreground`
  - **Continue blocked panel:** `bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))] border-border`
  - **Estimate blockers list:** Inherits parent warning background/foreground
  - **Estimate success message:** `text-[hsl(var(--success-foreground))]`
  - **Draft EXPIRED panel:** `bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))] border-border`, icon `text-[hsl(var(--warning))]`
  - **Draft FAILED panel:** `bg-[hsl(var(--danger-background))] text-[hsl(var(--danger-foreground))] border-border`, icon `text-[hsl(var(--danger))]`
  - **Draft missing panel:** `bg-[hsl(var(--surface-raised))] text-foreground border-border`
  - **Regenerate preview buttons (warning context):** `bg-[hsl(var(--warning))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--warning))]/90`
  - **Retry preview button (danger context):** `bg-[hsl(var(--danger))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--danger))]/90`
  - **Generate preview button (primary):** `bg-primary text-primary-foreground hover:bg-primary/90`
  - **Apply inline error banners:** `bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))] border-border`, icon `text-[hsl(var(--warning))]`
  - **Apply result summary:** `bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))] border-border`
  - **Stopped safely banner:** `bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))] border-border`
  - **Link in stopped banner:** `font-medium underline hover:text-foreground` (no amber-700/900 literals)
  - **Skipped products warning:** Same warning tokens as stopped banner
  - **Status badges (UPDATED):** `bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]`
  - **Status badges (SKIPPED):** `bg-muted text-muted-foreground`
  - **Status badges (LIMIT_REACHED):** `bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]`
  - **Status badges (error):** `bg-[hsl(var(--danger-background))] text-[hsl(var(--danger-foreground))]`
  - **Approval pending/required messages:** `text-[hsl(var(--warning-foreground))]`
  - **Approval approved messages:** `text-[hsl(var(--success-foreground))]`
  - **Checkbox:** `border-border text-primary focus:ring-primary`
  - **Apply button:** `bg-primary text-primary-foreground hover:bg-primary/90`
  - **Generate preview button (hasPreview false):** `bg-primary text-primary-foreground hover:bg-primary/90`
  - **Generate preview button (hasPreview true):** `border-border bg-[hsl(var(--surface-card))] text-foreground hover:bg-muted`
  - **ZERO literal palette classes** in the entire playbooks page (no bg-gray-_, text-blue-_, border-amber-\*, etc.)
  - All elements work correctly in dark mode

---

### Scenario 18: Playbooks AI Usage Callout Token Compliance (FIXUP-4)

**ID:** HP-018

**Preconditions:**

- Navigate to `/projects/{id}/automation/playbooks`
- Have AI usage data available (previewRuns > 0 or draftGenerateRuns > 0)

**Steps:**

1. View the "AI usage this month" callout in the playbooks interface
2. Check the container styling (border, background)
3. Check the title "AI usage this month" styling
4. Check the body text "Previews and drafts generated: X" styling
5. Check the "AI runs avoided (reused): X" line (if present)
6. Check the "Apply uses saved drafts only — no new AI runs." line (if present)
7. Toggle dark mode and repeat all above checks

**Expected Results:**

- **UI:**
  - **Container:** `border border-border bg-[hsl(var(--surface-raised))] p-3` (no purple-100/purple-50 literals)
  - **Title:** `text-xs font-semibold text-foreground` (no text-purple-900 literal)
  - **Body text (counts):** `text-xs text-muted-foreground` (no text-purple-700 literal)
  - **AI runs avoided line:** `text-[hsl(var(--success-foreground))]` (unchanged, success semantic)
  - **Apply uses saved drafts line:** `text-xs text-muted-foreground` (no text-purple-600 literal)
  - **No purple-\* literal palette classes** anywhere in the callout
  - All elements remain readable in dark mode

---

## Edge Cases

### EC-001: Empty States

**Description:** Pages with no data should still display correctly styled empty states

**Steps:**

1. Navigate to Issues Engine with no issues
2. Navigate to Products list with no products

**Expected Behavior:**

- Empty state illustrations and text use token colors
- Success-themed empty states use `--success-background` and `--success-foreground`

---

### EC-002: Long Text Truncation

**Description:** Tables should truncate long text appropriately

**Steps:**

1. Create a product with a very long title
2. View it in the DataTable

**Expected Behavior:**

- Text truncates with ellipsis
- Truncation doesn't break styling
- Full text visible in RCP when opened

---

## Error Handling

### ERR-001: API Error Banners

**Scenario:** Error banners should use token-only styling

**Steps:**

1. Simulate an API error (e.g., disconnect network briefly)

**Expected Behavior:**

- Error banner uses `bg-[hsl(var(--danger-background))]`
- Error text uses `text-[hsl(var(--danger-foreground))]`
- Retry button is visible and styled consistently

---

## Limits

N/A - This is a styling-only patch with no entitlement or quota changes.

---

## Regression

### Areas potentially impacted:

- [ ] **DataTable/DataList components:** Verify all pages using these components render correctly
- [ ] **Navigation sidebar:** Verify active states work on all nav items
- [ ] **RCP content:** Verify all content types (Asset, Issue, User) display with correct spacing
- [ ] **Breadcrumbs:** Verify breadcrumbs display on all routed pages

### Quick sanity checks:

- [ ] Products list loads and displays correctly
- [ ] Issues Engine loads and displays correctly
- [ ] Product detail page loads and displays correctly
- [ ] Dark mode toggle works without layout shifts
- [ ] Keyboard navigation still works in tables

---

## Post-Conditions

### Data cleanup steps:

- No data cleanup needed (styling-only patch)

### Follow-up verification:

- [ ] Run visual regression tests if available
- [ ] Verify build passes without errors

---

## Known Issues

- **Intentionally accepted issues:**
  - None

- **Out-of-scope items:**
  - Behavior changes
  - Navigation changes
  - API integration changes
  - New features

- **TODOs:**
  - [ ] Monitor for any dark mode issues reported by users

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
