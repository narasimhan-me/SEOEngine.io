# LIST-ACTIONS-CLARITY-1 Manual Testing Checklist

## Phase Overview
Unified row chips and actions across Products, Pages, and Collections lists.
Provides consistent visual vocabulary and actionable links for each asset state.

**[LIST-ACTIONS-CLARITY-1 FIXUP-1]** Extended with:
- Real viewer capabilities (canApply, canRequestApproval) from API
- Collections list full support
- Blocked state for EDITOR role
- True per-asset filtering in Issues Engine
- **Bulk removal**: No bulk selection UI on any list page (compliance/safety hardening)
- Server-derived row fields: `actionableNowCount`, `blockedByApproval`

**[LIST-ACTIONS-CLARITY-1-CORRECTNESS-1]** Canonical issue counts:
- `actionableNowCount` now derived from canonical DEO issues (via DeoIssuesService)
- Removes SEO-heuristic-based actionability from UI
- `blockedByApproval` is server-derived: `hasDraft AND !viewerCanApply`
- Products API uses `__fullAffectedAssetKeys` for accurate per-product counts
- Crawl Pages/Collections endpoint adds canonical issue counts per URL

## Scope
- Products list page (/projects/:projectId/products)
- Pages list page (/projects/:projectId/assets/pages)
- Collections list page (/projects/:projectId/assets/collections)
- Issues Engine asset-filtered mode (/projects/:projectId/issues?assetType=...&assetId=...)
- Shared RowStatusChip component
- Shared resolveRowNextAction resolver

---

## Locked Chip Labels (EXACT VOCABULARY WITH EMOJIS)

| Chip Label | Color | Meaning |
|------------|-------|---------|
| ✅ Optimized | Green | No actionable issues, no pending drafts |
| ⚠ Needs attention | Yellow | Has actionable issues, no pending drafts |
| 🟡 Draft saved (not applied) | Blue | Has pending draft (can be applied by OWNER) |
| ⛔ Blocked | Red | Has pending draft but viewer cannot apply (EDITOR + governance) |

**IMPORTANT**: These chip labels are the EXACT strings displayed in the UI, including emojis.

---

## Locked Action Labels

| Action Label | Destination | When Shown |
|--------------|-------------|------------|
| Fix next | Issue→Fix deep link (Products) | Needs attention (Products) - routes to fix surface |
| View issues | Issues Engine (filtered) | Needs attention (Pages/Collections) |
| Review drafts | Work Queue | Draft saved (OWNER can apply) |
| Request approval | Approval flow | Blocked (EDITOR with canRequestApproval) |
| View approval status | Approval status | Blocked (EDITOR without canRequestApproval) |
| Open | Asset detail page | Secondary action |

**[FIXUP-1]**: "Fix next" now routes to the issue fix surface (product workspace), NOT the Issues list.

---

## Products List (/projects/:projectId/products)

### 1. Optimized Product Row
- [ ] Product with complete SEO (title 30-60 chars, description 70-155 chars) and no pending draft
- [ ] **Expected**: Green "Optimized" chip
- [ ] **Expected**: "No action needed" help text instead of primary action
- [ ] **Expected**: "Open" secondary action linking to product workspace

### 2. Needs Attention Product Row
- [ ] Product with incomplete SEO (missing title or description, or length outside optimal range)
- [ ] **Expected**: Yellow "⚠ Needs attention" chip
- [ ] **Expected**: "Fix next" primary action routes to the Issue→Fix deep link (product workspace fix surface), preserving returnTo
- [ ] **Expected**: "Open" secondary action

### 3. Draft Saved Product Row
- [ ] Product appearing in a non-applied AutomationPlaybookDraft (status READY or PARTIAL)
- [ ] **Expected**: Blue "🟡 Draft saved (not applied)" chip
- [ ] **Expected**: "Review drafts" primary action linking to Work Queue
- [ ] **Expected**: "Open" secondary action

---

## Pages List (/projects/:projectId/assets/pages)

### 1. Optimized Page Row
- [ ] Page with complete SEO metadata (title 30-60 chars, description 70-155 chars)
- [ ] **Expected**: Green "Optimized" chip
- [ ] **Expected**: "No action needed" help text
- [ ] **Expected**: "Open" secondary action (links to Issues filtered by page)

### 2. Needs Attention Page Row
- [ ] Page with incomplete SEO metadata
- [ ] **Expected**: Yellow "Needs attention" chip
- [ ] **Expected**: "View issues" primary action (links to Issues filtered by page)
- [ ] **Expected**: No redundant "Open" secondary action

### 3. Draft Saved Page Row
- [ ] Page appearing in a non-applied AutomationPlaybookDraft
- [ ] **Expected**: Blue "Draft saved (not applied)" chip
- [ ] **Expected**: "Review drafts" primary action (links to Work Queue)
- [ ] **Expected**: "Open" secondary action

---

## Collections List (/projects/:projectId/assets/collections)

### 1. Optimized Collection Row
- [ ] Collection with complete SEO metadata
- [ ] **Expected**: Green "Optimized" chip
- [ ] **Expected**: "No action needed" help text
- [ ] **Expected**: "Open" secondary action

### 2. Needs Attention Collection Row
- [ ] Collection with incomplete SEO metadata
- [ ] **Expected**: Yellow "Needs attention" chip
- [ ] **Expected**: "View issues" primary action (links to Issues filtered by collection)
- [ ] **Expected**: No redundant "Open" secondary action

### 3. Draft Saved Collection Row
- [ ] Collection appearing in a non-applied AutomationPlaybookDraft
- [ ] **Expected**: Blue "Draft saved (not applied)" chip
- [ ] **Expected**: "Review drafts" primary action
- [ ] **Expected**: "Open" secondary action

---

## Issues Engine Asset-Filtered Mode

### 1. Asset Filter Display
- [ ] Navigate to Issues with ?assetType=products&assetId=<id>
- [ ] **Expected**: Filter context banner shows "Filtered by Asset"
- [ ] **Expected**: Banner shows asset type and truncated asset ID
- [ ] **Expected**: "Clear filters" button removes asset filter params

### 2. Asset Filter Functionality
- [ ] Apply asset filter for a product with known issues
- [ ] **Expected**: Only issues affecting that specific product are shown
- [ ] For pages/collections: Only issues affecting that specific asset are shown

### 3. Return Navigation
- [ ] Click "View issues" from Products list row
- [ ] **Expected**: URL includes returnTo and returnLabel params
- [ ] **Expected**: Back link returns to Products list

---

## Blocked State Testing (FIXUP-1)

### 1. EDITOR Sees Blocked Chip
- [ ] Log in as EDITOR user (use editorAccessToken from seed)
- [ ] Navigate to Products list with draft-pending product
- [ ] **Expected**: Red "⛔ Blocked" chip on draft-pending row
- [ ] **Expected**: "Request approval" primary action (if canRequestApproval)

### 2. OWNER Sees Draft Saved (Not Blocked)
- [ ] Log in as OWNER user (use accessToken from seed)
- [ ] Navigate to Products list with draft-pending product
- [ ] **Expected**: Blue "🟡 Draft saved (not applied)" chip
- [ ] **Expected**: "Review drafts" primary action

---

## Test Data Setup
Use `/testkit/e2e/seed-list-actions-clarity-1` endpoint to create deterministic test data:
- 3 products: optimized, needs attention, draft pending
- 3 pages: optimized, needs attention, draft pending
- 3 collections: optimized, needs attention, draft pending
- AutomationPlaybookDrafts for draft pending states
- EDITOR user token for Blocked state testing
- Governance policy enabled (requireApprovalForApply: true)

Returns:
- `accessToken` (OWNER)
- `editorAccessToken` (EDITOR)
- `optimizedProductId`, `needsAttentionProductId`, `draftPendingProductId`
- `optimizedPageId`, `needsAttentionPageId`, `draftPendingPageId`
- `optimizedCollectionId`, `needsAttentionCollectionId`, `draftPendingCollectionId`

---

## Bulk Removal Verification (FIXUP-1)

### 1. No Bulk Selection UI
- [ ] **Products list**: No checkboxes in table headers or rows
- [ ] **Pages list**: No checkboxes in table headers or rows
- [ ] **Collections list**: No checkboxes in table headers or rows

### 2. No Bulk Action CTAs
- [ ] **Products command bar**: No "Generate drafts" or "Fix all" buttons
- [ ] **Products command bar**: "View playbooks" link routes to Playbooks page
- [ ] **Pages header**: No bulk action button
- [ ] **Collections header**: No bulk action button

---

## Non-Goals (Not Tested in This Phase)
- Full approval workflow (submit, review, approve)
- Real-time draft sync
- Bulk actions via Work Queue/Playbooks (tested separately)

---

## Pass Criteria
All scenarios pass with expected chip labels, action labels, and navigation destinations verified.
Blocked state verified for EDITOR role with governance enabled.
