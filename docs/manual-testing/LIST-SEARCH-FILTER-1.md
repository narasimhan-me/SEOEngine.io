# LIST-SEARCH-FILTER-1 Manual Testing Checklist

## Phase Overview

Products list search, filtering by status/draft state, and URL persistence.

## Scope

- Products list page only (reusable ListControls pattern for future lists)
- Server-authoritative filtering
- URL-derived state only (no hidden memory)

## Test Scenarios

### 1. Search by Name

- [ ] Navigate to Products page
- [ ] Enter a product title in the search box
- [ ] Press Enter or blur the input
- [ ] **Expected**: Only products matching the search term (in title) are shown
- [ ] **Expected**: URL contains `?q=<search-term>`

### 2. Search by Handle

- [ ] Enter a product handle (URL slug) in the search box
- [ ] Press Enter
- [ ] **Expected**: Products matching the handle are shown
- [ ] **Expected**: URL contains `?q=<handle-term>`

### 3. Filter by Status: Optimized

- [ ] Click the Status dropdown
- [ ] Select "Optimized"
- [ ] **Expected**: Only products with complete SEO metadata (title 30-60 chars, description 70-155 chars) are shown
- [ ] **Expected**: URL contains `?status=optimized`

### 4. Filter by Status: Needs Attention

- [ ] Click the Status dropdown
- [ ] Select "Needs attention"
- [ ] **Expected**: Products with incomplete or suboptimal SEO metadata are shown
- [ ] **Expected**: URL contains `?status=needs_attention`

### 5. Filter by Draft State

- [ ] Click the Draft Status dropdown
- [ ] Select "Has draft pending"
- [ ] **Expected**: Only products that appear in non-applied AutomationPlaybookDrafts (status READY or PARTIAL, not expired) are shown
- [ ] **Expected**: URL contains `?hasDraft=true`

### 6. Clear Filters

- [ ] Apply one or more filters
- [ ] Click the "Clear" button
- [ ] **Expected**: All filters are removed
- [ ] **Expected**: Full product list is restored
- [ ] **Expected**: URL no longer contains filter params

### 7. URL Persistence

- [ ] Apply filters (e.g., search + status)
- [ ] Copy the URL
- [ ] Open the URL in a new tab/window
- [ ] **Expected**: Filters are restored from URL params
- [ ] **Expected**: Product list shows filtered results

### 8. URL Reload Persistence

- [ ] Apply filters
- [ ] Reload the page (F5 or Ctrl+R)
- [ ] **Expected**: Filters remain applied
- [ ] **Expected**: Search input shows the search term
- [ ] **Expected**: Dropdowns reflect selected filter values

### 9. Empty Filtered State

- [ ] Search for a term that matches no products
- [ ] **Expected**: Empty state shows message "No products match your filters."
- [ ] **Expected**: "Clear filters" link is visible
- [ ] Click "Clear filters"
- [ ] **Expected**: Full product list is restored

### 10. Unfiltered Empty State (No Products)

- [ ] Navigate to a project with no synced products
- [ ] **Expected**: Standard "No products" empty state is shown (not filtered empty state)

## Non-Goals (Not Tested in This Phase)

- Advanced filter builders
- Saved filters
- Pagination (future phase)
- Applying to other list pages (Work Queue, Issues, etc.) - will be extended later

## Test Data Setup

Use `/testkit/e2e/seed-list-search-filter-1` endpoint to create deterministic test data:

- 3 products with known titles and handles
- 1 optimized product (complete SEO)
- 2 needs-attention products (incomplete SEO)
- 1 AutomationPlaybookDraft in READY state targeting 1 product

## Pass Criteria

All scenarios pass with expected behaviors verified.
