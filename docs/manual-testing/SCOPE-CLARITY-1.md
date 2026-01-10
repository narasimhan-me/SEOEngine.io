# SCOPE-CLARITY-1: Explicit Scope Chips + Normalization

## Overview

This feature enhances the ScopeBanner to show explicit scope chips instead of plain text descriptions, and introduces canonical scope normalization rules to prevent hidden filter stacking.

---

## Key Concepts

### Canonical Scope Keys

The URL is the single source of truth. These are the ONLY scope keys we emit:

- `pillar` - DEO pillar ID (e.g., `metadata_snippet_quality`)
- `assetType` - Asset type: `products`, `pages`, `collections`
- `assetId` - Specific asset identifier
- `issueType` - Issue type key (e.g., `missing_seo_title`)
- `mode` - View mode: `actionable` or `detected`

### Priority Rules (LOCKED)

When conflicting params are present, normalization applies priority rules:

1. **Asset scope** (assetType + assetId both present) → Keep only asset; drop issueType, pillar, mode
2. **Issue type scope** (issueType present) → Keep issueType (+ mode if present); drop pillar
3. **Pillar scope** (pillar present) → Keep pillar (+ mode if present)
4. **Mode alone** → Keep mode

### ScopeChip Interface

```typescript
interface ScopeChip {
  type: 'pillar' | 'asset' | 'issueType' | 'mode';
  label: string;
}
```

---

## Manual Testing Checklist

### Prerequisites

- Logged in as OWNER or EDITOR role
- Project with products/pages/collections that have SEO issues

---

## Test 1: Pillar Chip Rendering

### Steps

1. Navigate to Store Health → Click a health card (e.g., Discoverability)
2. Verify landing on Issues Engine with URL params including `pillar=metadata_snippet_quality`
3. Verify ScopeBanner shows a chip with:
   - `data-testid="scope-chip"`
   - `data-scope-chip-type="pillar"`
   - Label contains "Pillar: Metadata Snippet Quality"

### Expected Result

- Pillar chip is visible with blue styling
- Chip has correct test hooks for automation

---

## Test 2: Mode Chip Rendering

### Steps

1. Navigate to Issues Engine with `?mode=actionable`
2. Verify ScopeBanner shows a mode chip with:
   - `data-scope-chip-type="mode"`
   - Label: "Actionable"
3. Change URL to `?mode=detected`
4. Verify chip updates to "Detected"

### Expected Result

- Mode chip renders correctly for both modes
- Chip updates when URL changes

---

## Test 3: Multiple Chips (Pillar + Mode)

### Steps

1. Navigate to Issues Engine with `?pillar=metadata_snippet_quality&mode=detected`
2. Verify both chips are visible:
   - Pillar chip first
   - Mode chip second
3. Verify chips container has `data-testid="scope-chips"`

### Expected Result

- Both chips render in correct order
- Chips are styled consistently

---

## Test 4: Priority Normalization (issueType > pillar)

### Steps

1. Navigate to Issues Engine with conflicting params:
   `?issueType=missing_seo_title&pillar=metadata_snippet_quality`
2. Verify:
   - issueType chip IS visible
   - pillar chip is NOT visible (dropped by normalization)
   - "adjusted" note appears (`data-testid="scope-banner-adjusted-note"`)
3. **[SCOPE-CLARITY-1 FIXUP-1/FIXUP-2]** Verify the Pillar filter UI:
   - The "All" pillar filter button (`data-testid="pillar-filter-all"`) has `aria-pressed="true"`
   - The "Metadata Snippet Quality" pillar button (`data-testid="pillar-filter-metadata_snippet_quality"`) has `aria-pressed="false"`
   - The dropped pillar param does NOT affect the page's filter state

### Expected Result

- Only issueType chip renders (pillar was dropped)
- User sees note that scope was adjusted
- **[SCOPE-CLARITY-1 FIXUP-1/FIXUP-2]** Pillar filter UI remains on "All pillars" (the dropped pillar is not applied), verifiable via `aria-pressed` attributes

---

## Test 5: Clear Filters Removes All Scope

### Steps

1. Navigate to Issues Engine with `?pillar=metadata_snippet_quality&mode=actionable`
2. Click "Clear filters" button
3. Verify URL is `/projects/{id}/issues` with NO scope params
4. Verify ScopeBanner is hidden (no `from` param)

### Expected Result

- All scope params removed from URL
- ScopeBanner disappears (requires `from` to render)

---

## Test 6: Banner Hidden Without From Context

### Steps

1. Navigate directly to `/projects/{id}/issues?pillar=metadata_snippet_quality` (no `from` param)
2. Verify ScopeBanner is NOT visible

### Expected Result

- ScopeBanner only renders when `from` param is present
- Scope chips are not shown without navigation context

---

## Test Hooks Reference

| Element | Test ID | Additional Attributes |
|---------|---------|----------------------|
| Chips container | `scope-chips` | - |
| Individual chip | `scope-chip` | `data-scope-chip-type="{type}"` |
| Adjusted note | `scope-banner-adjusted-note` | - |
| Outer banner | `filter-context-banner` | - |
| Inner banner | `scope-banner` | - |
| Back button | `scope-banner-back` | - |
| Clear filters | `scope-banner-clear` | - |
| Pillar filter: All | `pillar-filter-all` | `aria-pressed="{true\|false}"` |
| Pillar filter: Specific | `pillar-filter-{pillar.id}` | `aria-pressed="{true\|false}"` |

---

## Code References

- Normalization: `apps/web/src/lib/scope-normalization.ts`
- ScopeBanner: `apps/web/src/components/common/ScopeBanner.tsx`
- Route context: `apps/web/src/lib/route-context.ts`
- E2E tests: `apps/web/tests/scope-clarity-1.spec.ts`

---

## Surfaces Using ScopeBanner + Chips

1. Issues Engine (`/projects/{id}/issues`)
2. Playbooks (`/projects/{id}/automation/playbooks`)
3. Product Detail (`/projects/{id}/products/{productId}`)
4. Products List (`/projects/{id}/products`)
5. Pages List (`/projects/{id}/assets/pages`)
6. Collections List (`/projects/{id}/assets/collections`)

---

## Related Features

- **ROUTE-INTEGRITY-1**: Deterministic deep links + ScopeBanner foundation
- **COUNT-INTEGRITY-1**: Click-integrity filters (actionKey, scopeType)
- **LIST-ACTIONS-CLARITY-1**: Asset list row actions with from=asset_list
