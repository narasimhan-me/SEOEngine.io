# Manual Testing Checklist: ICONS-LOCAL-LIBRARY-1

**Phase**: ICONS-LOCAL-LIBRARY-1
**Date**: 2026-01-23
**Tester**: ******\_\_\_******

## Purpose

Validate the local SVG icon system implementation. Ensure icons render correctly without CDN dependencies, accessibility is maintained, and no visual regressions occur.

---

## Pre-Test Setup

- [ ] Application is running locally or on staging
- [ ] Browser DevTools available for inspection
- [ ] Network tab open to monitor requests
- [ ] Screen reader available for accessibility testing (optional but recommended)

---

## 1. Offline/No-CDN Verification

### No External Icon Requests

- [ ] Open DevTools Network tab
- [ ] Filter by "fonts.googleapis.com" or "fonts.gstatic.com"
- [ ] Navigate through the app (Dashboard, Projects, Settings, Admin)
- [ ] Confirm NO requests to Google Fonts/CDN for icons
- [ ] Confirm sprite.svg is loaded from `/icons/material-symbols/sprite.svg`

### Offline Functionality

- [ ] Load the app normally
- [ ] Go offline (DevTools > Network > Offline)
- [ ] Refresh the page
- [ ] Confirm icons still render (cached sprite)

---

## 2. Left Rail Icon Adoption

### Icon Rendering

- [ ] Navigate to /dashboard
- [ ] Confirm left rail shows 5 nav items with icons
- [ ] Dashboard icon renders (home)
- [ ] Projects icon renders (inventory_2)
- [ ] Settings icon renders (settings)
- [ ] Help icon renders (campaign)
- [ ] Admin icon renders (admin_panel_settings)

### Icon Alignment

- [ ] Icons are vertically centered within nav items
- [ ] No layout shift when navigating between pages
- [ ] Active state shows primary color treatment

### Accessibility

- [ ] Each nav item has visible tooltip on hover
- [ ] Each nav item has `aria-label` (inspect in DevTools)
- [ ] Icons have `aria-hidden="true"` (decorative)

---

## 3. Search Icon Adoption

### Desktop Command Palette Trigger

- [ ] On desktop (≥768px), search bar is visible in top bar
- [ ] Search icon renders before "Search..." text
- [ ] Icon size is 16px (h-4 w-4)
- [ ] Icon inherits text color (muted-foreground)

### Mobile Command Palette Trigger

- [ ] Resize to mobile (<768px)
- [ ] Search icon button is visible
- [ ] Icon size is 20px (h-5 w-5)
- [ ] Clicking opens command palette

---

## 4. RowStatusChip Icon Adoption

### Icon + Label Rendering

- [ ] Navigate to /projects/[id]/products
- [ ] Find a product with status chips
- [ ] Confirm chips show icon + clean label (no emoji prefix)
- [ ] "Optimized" shows check_circle icon + "Optimized" text
- [ ] "Needs attention" shows warning icon + "Needs attention" text
- [ ] "Draft saved" shows history icon + "Draft saved (not applied)" text
- [ ] "Blocked" shows block icon + "Blocked" text

### Visual Consistency

- [ ] Icons are 16px size
- [ ] Icons inherit chip text color
- [ ] Chips remain compact and readable
- [ ] Dark mode: chips have appropriate contrast

---

## 5. Screen Reader Accessibility

### Decorative Icons

- [ ] Using screen reader, navigate left rail
- [ ] Icons should NOT be announced (aria-hidden)
- [ ] Nav item labels ARE announced via aria-label

### Status Chips

- [ ] Navigate to a product row with status chip
- [ ] Screen reader announces chip text (not icon)

---

## 6. Console Verification

### No Missing Icon Warnings

- [ ] Open DevTools Console
- [ ] Navigate through app (Dashboard, Projects, Settings, Admin)
- [ ] Confirm no errors about missing icons or failed sprite loads
- [ ] No 404 errors for icon assets

---

## Test Results Summary

| Section             | Pass | Fail | Notes |
| ------------------- | ---- | ---- | ----- |
| Offline/No-CDN      |      |      |       |
| Left Rail Icons     |      |      |       |
| Search Icon         |      |      |       |
| RowStatusChip Icons |      |      |       |
| Screen Reader       |      |      |       |
| Console             |      |      |       |

---

## Issues Found

| Issue # | Description | Severity | Screenshot |
| ------- | ----------- | -------- | ---------- |
|         |             |          |            |

---

## Icon Inventory Verification

### Curated Set (33 icons)

- [ ] admin_panel_settings
- [ ] analytics
- [ ] article
- [ ] auto_awesome
- [ ] auto_fix_high (FIXUP-1: viewBox-safe, verify no clipped right edge)
- [ ] award_star
- [ ] block
- [ ] calculate
- [ ] campaign
- [ ] check
- [ ] check_circle
- [ ] data_object
- [ ] deployed_code
- [ ] download
- [ ] error
- [ ] health_and_safety
- [ ] history
- [ ] home
- [ ] hub
- [ ] inventory_2
- [ ] memory
- [ ] monitoring
- [ ] orders
- [ ] preview
- [ ] publish
- [ ] search
- [ ] settings
- [ ] settings_suggest
- [ ] settings_voice
- [ ] target
- [ ] title
- [ ] visibility
- [ ] warning

---

## Sign-Off

- [ ] All critical checks pass
- [ ] No blocking issues identified
- [ ] Ready for phase completion

**Tester Signature**: ******\_\_\_******
**Date**: ******\_\_\_******
