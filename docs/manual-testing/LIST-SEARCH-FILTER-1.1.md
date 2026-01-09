# LIST-SEARCH-FILTER-1.1 Manual Testing Checklist

## Phase Overview
Pages and Collections list search, filtering by status/draft state, and URL persistence.
Extends the ListControls pattern from LIST-SEARCH-FILTER-1 (Products).

## Scope
- Pages list page (/projects/:projectId/assets/pages)
- Collections list page (/projects/:projectId/assets/collections)
- Server-authoritative filtering
- URL-derived state only (no hidden memory)

---

## Pages List (/projects/:projectId/assets/pages)

### 1. Search by Title/Path
- [ ] Navigate to Pages list
- [ ] Enter a page title or path in the search box
- [ ] Press Enter or blur the input
- [ ] **Expected**: Only pages matching the search term are shown
- [ ] **Expected**: URL contains `?q=<search-term>`

### 2. Filter by Status: Optimized
- [ ] Click the Status dropdown
- [ ] Select "Optimized"
- [ ] **Expected**: Only pages with complete SEO metadata (title 30-60 chars, description 70-155 chars) are shown
- [ ] **Expected**: URL contains `?status=optimized`

### 3. Filter by Status: Needs Attention
- [ ] Click the Status dropdown
- [ ] Select "Needs attention"
- [ ] **Expected**: Pages with incomplete or suboptimal SEO metadata are shown
- [ ] **Expected**: URL contains `?status=needs_attention`

### 4. Filter by Draft State
- [ ] Click the Draft Status dropdown
- [ ] Select "Has draft pending"
- [ ] **Expected**: Only pages that appear in non-applied AutomationPlaybookDrafts (status READY or PARTIAL, not expired) are shown
- [ ] **Expected**: URL contains `?hasDraft=true`

### 5. Clear Filters
- [ ] Apply one or more filters
- [ ] Click the "Clear" button
- [ ] **Expected**: All filters are removed
- [ ] **Expected**: Full page list is restored
- [ ] **Expected**: URL no longer contains `q`, `status`, or `hasDraft` params

### 6. Empty Filtered State
- [ ] Search for a term that matches no pages
- [ ] **Expected**: Empty state shows exact message: "No pages match your filters."
- [ ] **Expected**: "Clear filters" link is visible
- [ ] Click "Clear filters"
- [ ] **Expected**: Full page list is restored

### 7. URL Persistence on Reload
- [ ] Apply filters (e.g., search + status)
- [ ] Reload the page (F5 or Ctrl+R)
- [ ] **Expected**: Filters remain applied
- [ ] **Expected**: Search input shows the search term
- [ ] **Expected**: Dropdowns reflect selected filter values

---

## Collections List (/projects/:projectId/assets/collections)

### 1. Search by Title/Handle
- [ ] Navigate to Collections list
- [ ] Enter a collection title or handle in the search box
- [ ] Press Enter or blur the input
- [ ] **Expected**: Only collections matching the search term are shown
- [ ] **Expected**: URL contains `?q=<search-term>`

### 2. Filter by Status: Optimized
- [ ] Click the Status dropdown
- [ ] Select "Optimized"
- [ ] **Expected**: Only collections with complete SEO metadata (title 30-60 chars, description 70-155 chars) are shown
- [ ] **Expected**: URL contains `?status=optimized`

### 3. Filter by Status: Needs Attention
- [ ] Click the Status dropdown
- [ ] Select "Needs attention"
- [ ] **Expected**: Collections with incomplete or suboptimal SEO metadata are shown
- [ ] **Expected**: URL contains `?status=needs_attention`

### 4. Filter by Draft State
- [ ] Click the Draft Status dropdown
- [ ] Select "Has draft pending"
- [ ] **Expected**: Only collections that appear in non-applied AutomationPlaybookDrafts (status READY or PARTIAL, not expired) are shown
- [ ] **Expected**: URL contains `?hasDraft=true`

### 5. Clear Filters
- [ ] Apply one or more filters
- [ ] Click the "Clear" button
- [ ] **Expected**: All filters are removed
- [ ] **Expected**: Full collection list is restored
- [ ] **Expected**: URL no longer contains `q`, `status`, or `hasDraft` params

### 6. Empty Filtered State
- [ ] Search for a term that matches no collections
- [ ] **Expected**: Empty state shows exact message: "No collections match your filters."
- [ ] **Expected**: "Clear filters" link is visible
- [ ] Click "Clear filters"
- [ ] **Expected**: Full collection list is restored

### 7. URL Persistence on Reload
- [ ] Apply filters (e.g., search + status)
- [ ] Reload the page (F5 or Ctrl+R)
- [ ] **Expected**: Filters remain applied
- [ ] **Expected**: Search input shows the search term
- [ ] **Expected**: Dropdowns reflect selected filter values

---

## Non-Goals (Not Tested in This Phase)
- Bulk actions from list pages
- Saved filters
- Layout redesign
- Pagination
- Work Queue or Issues list filtering (future phases)

## Test Data Setup
Use `/testkit/e2e/seed-list-search-filter-1-1` endpoint to create deterministic test data:
- 3 pages with known titles and paths
- 3 collections with known titles and handles
- 1 optimized page, 2 needs-attention pages
- 1 optimized collection, 2 needs-attention collections
- AutomationPlaybookDrafts targeting 1 page and 1 collection for hasDraft filter

## Pass Criteria
All scenarios pass with expected behaviors verified.
