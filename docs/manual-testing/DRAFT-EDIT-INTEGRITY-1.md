# DRAFT-EDIT-INTEGRITY-1 Manual Testing Checklist

## Phase Overview

Ensures Draft Review mode allows users to edit draft content before approval/apply.
Server draft is source of truth - no autosave, explicit save required.

**Trust Principle:** "If we present a draft for review, the user must be able to edit it safely before approval/apply."

## Scope

- Draft Review mode (`/automation/playbooks?mode=drafts&...`)
- Inline edit mode per draft item
- Save/Cancel controls
- Server persistence

---

## Locked UX Contract

### 1. Edit is per-draft-item, not global

- Each draft item has its own Edit button
- Only one item can be edited at a time
- Editing does not affect other items

### 2. Clear "Save" semantics

- Editable textarea/input
- "Save changes" button
- "Cancel" button (revert to last saved server value)
- Inline success/error feedback
- **No auto-save-on-type**

### 3. Server draft is source of truth

- Draft Review shows server draft content
- Editing updates server draft content
- After save, UI re-renders from server response
- **No sessionStorage "draft" allowed**

### 4. Permissions respected

- OWNER/EDITOR can edit drafts
- VIEWER cannot edit (Edit button not shown or disabled)
- Apply remains blocked by existing rules

---

## Test Scenarios

### 1. Products List → Draft Review → Edit → Save

- [ ] Navigate to /projects/:projectId/products
- [ ] Find row with "🟡 Draft saved (not applied)" chip
- [ ] Click "Review drafts" primary action
- [ ] **Assert Draft Review panel** (`data-testid="draft-review-panel"`) is visible
- [ ] **Assert Edit button** visible on draft item (e.g., `data-testid="draft-item-edit-*"`)
- [ ] Click Edit button
- [ ] **Assert input/textarea** appears (`data-testid="draft-item-input-*"`)
- [ ] **Assert Save changes button** visible (`data-testid="draft-item-save-*"`)
- [ ] **Assert Cancel button** visible (`data-testid="draft-item-cancel-*"`)
- [ ] Enter new text in the input
- [ ] Click "Save changes"
- [ ] **Assert input disappears** (edit mode exited)
- [ ] **Assert new text visible** in the draft item display
- [ ] **Refresh page (F5)**
- [ ] **Assert new text persists** after reload (server persisted)

### 2. Edit → Cancel

- [ ] Navigate to Draft Review mode as above
- [ ] Click Edit on a draft item
- [ ] Enter different text
- [ ] Click "Cancel"
- [ ] **Assert input disappears**
- [ ] **Assert original text restored** (not the canceled text)
- [ ] **Assert no server request was made** (check network tab or console)

### 3. Error Handling

- [ ] Simulate server error (e.g., disconnect network, or use invalid project)
- [ ] Click Save changes
- [ ] **Assert inline error message** appears below input
- [ ] **Assert edit mode remains active** (user can retry or cancel)

### 4. Permission: VIEWER Cannot Edit

- [ ] Log in as VIEWER role
- [ ] Navigate to Draft Review mode
- [ ] **Assert Edit button is NOT visible** for draft items
- [ ] (If Edit button shown, it should be disabled with tooltip: "You don't have permission to edit drafts.")

### 5. Multiple Items - Only One Editable at a Time

- [ ] Navigate to Draft Review with multiple draft items
- [ ] Click Edit on first item
- [ ] **Assert first item is in edit mode**
- [ ] Click Edit on second item (if available)
- [ ] **Assert first item exits edit mode** (optional: depends on implementation)
- [ ] **Assert second item enters edit mode**

---

## API Endpoint Testing

### PATCH /projects/:id/automation-playbooks/drafts/:draftId/items/:itemIndex

**Request:**

```
PATCH /projects/:id/automation-playbooks/drafts/:draftId/items/0
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "Updated SEO description text"
}
```

**Response (200 OK):**

```json
{
  "draftId": "...",
  "itemIndex": 0,
  "updatedItem": {
    "productId": "...",
    "field": "seoDescription",
    "rawSuggestion": "...",
    "finalSuggestion": "Updated SEO description text",
    "ruleWarnings": []
  },
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Validation:**

- [ ] Returns 404 if draft not found
- [ ] Returns 403 if user is VIEWER (cannot edit)
- [ ] Returns 403 if draft belongs to different project
- [ ] Returns 409 if draft is already applied
- [ ] Returns 409 if draft is expired
- [ ] Returns 400 if itemIndex is out of range
- [ ] Updates `updatedAt` on the draft

---

## Test Data Setup

Use `/testkit/e2e/seed-list-actions-clarity-1` endpoint (same as DRAFT-ROUTING-INTEGRITY-1):

```bash
curl -X POST http://localhost:3001/testkit/e2e/seed-list-actions-clarity-1
```

Returns:

- `projectId`
- `accessToken` (OWNER)
- `draftPendingProductId`

---

## Playwright E2E Test

Test ID: `LAC1-009: Draft item can be edited and saved`

Located in: `apps/web/tests/list-actions-clarity-1.spec.ts`

---

## Pass Criteria

1. Edit button visible on each draft item (for authorized users)
2. Clicking Edit shows input with current value
3. Save persists to server (survives page reload)
4. Cancel reverts to last saved value without server request
5. Error shown inline on save failure (edit mode remains active)
6. VIEWER cannot edit
7. No autosave behavior
