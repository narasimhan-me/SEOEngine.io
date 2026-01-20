# BLOGS-ASSET-SYNC-COVERAGE-1 — Manual Testing

> Clone of MANUAL_TESTING_TEMPLATE.md (structure preserved).

---

## Overview

- Purpose of the feature/patch:
  - Ensure Shopify Blog Posts (Articles) are ingested into EngineO.ai and visible in the Blog posts asset list.
  - Display Published/Draft status based on `shopifyPublishedAt` field (null = draft).
  - Track `lastBlogsSyncAt` timestamp for sync status display.
- High-level user impact and what "success" looks like:
  - After sync, users can see Shopify Blog articles in EngineO.ai.
  - UI clearly distinguishes "never synced" vs "synced but empty" and shows last sync time.
  - Published articles show green "Published" badge; unpublished drafts show gray "Draft" badge.
- Related phases/sections in docs/IMPLEMENTATION_PLAN.md:
  - Phase BLOGS-ASSET-SYNC-COVERAGE-1
- Related documentation:
  - CRITICAL_PATH_MAP.md (CP-006 Shopify Sync)
  - SHOPIFY_SCOPES_MATRIX.md (`blogs_sync` capability requires `read_content`)
  - shopify-integration.md

---

## Preconditions

- Environment requirements:
  - API + Web running
  - Shopify connected to the target project
  - Shopify scopes include `read_content` (required for blogs_sync)
- Test accounts and sample data:
  - A project connected to a Shopify store that contains:
    - Blog articles: at least 2–3 articles (some published, some draft)
- Required user roles or subscriptions:
  - OWNER role (required to trigger sync)
  - VIEWER role (optional) to confirm read-only sync-status visibility

---

## Test Scenarios (Happy Path)

### Scenario 1: Blog posts sync imports Shopify Articles and shows last sync time

ID: HP-001

Steps:

1. Go to Assets → Blog posts for a Shopify-connected project.
2. If empty and never synced, confirm the page shows "Not yet synced…" guidance.
3. Click "Sync Blog posts".
4. Confirm Blog posts list contains articles from the store.
5. Confirm a "Last synced: …" line is visible.
6. Confirm each row shows handle in `{blogHandle}/{articleHandle}` format (e.g., "news/welcome-post"), title, and Updated timestamp columns.

Expected Results:

- UI: Blog posts list populates; last sync line updates after sync.
- Handle column displays blog/article handle format (e.g., "news/welcome-post").
- API: Sync endpoint returns `{ fetched, upserted, completedAt }`; sync-status returns `lastBlogsSyncAt`.

---

### Scenario 2: Published vs Draft status badges display correctly

ID: HP-002

Steps:

1. After syncing, inspect the blog posts list.
2. For articles with a `publishedAt` timestamp, verify green "Published" badge.
3. For articles without a `publishedAt` timestamp (null), verify gray "Draft" badge.

Expected Results:

- UI: Published articles show "Published" badge with green styling.
- UI: Draft articles show "Draft" badge with gray styling.
- This is determined by the `shopifyPublishedAt` field stored during sync.

---

### Scenario 3: Open links navigate to external Shopify URLs

ID: HP-003

Steps:

1. After syncing, click "Open" link on any blog post row.
2. Verify the link opens in a new tab.
3. Verify the URL is the actual Shopify storefront URL for that article.

Expected Results:

- Link opens in new tab (`target="_blank"`).
- URL matches the article's `url` field from Shopify.

---

## Edge Cases

### EC-001: Never synced vs synced-but-empty messaging

Description: Ensure the empty state is not interpreted as a broken integration.

Steps:

1. Open Blog posts list before ever syncing.
2. Confirm "Not yet synced…" messaging appears.
3. Trigger sync on a store with zero blog articles.

Expected Behavior:

- Never synced: "Not yet synced. Click Sync…"
- Synced but empty: "No blog posts found in Shopify for this store."

---

### EC-002: Search filtering on blog posts

Description: Verify search functionality works on blog posts.

Steps:

1. After syncing blog posts, enter a search term in the search box.
2. Verify the list filters to matching titles/handles.
3. Clear search and verify all posts return.

Expected Behavior:

- Search filters blog posts by title or handle.
- Empty search result shows "No blog posts match your search."

---

## Error Handling

### ERR-001: Missing Shopify scope for Blogs (read_content)

Scenario: Store token does not include `read_content`.

Steps:

1. Connect Shopify with only `read_products,write_products` scopes.
2. Navigate to Assets → Blog posts.
3. Observe the permission notice.

Expected Behavior:

- Structured permission notice with "Reconnect Shopify" CTA is shown.
- Notice mentions "Blog posts" in the list of affected features.
- Sync Blog posts button is disabled.
- Reconnect is explicit and user-initiated; no automatic OAuth redirects.

---

### ERR-002: Reconnect flow for blogs_sync capability

Scenario: User clicks "Reconnect Shopify" on Blog posts page.

Steps:

1. On Blog posts page with missing `read_content` scope, click "Reconnect Shopify".
2. Complete OAuth flow.
3. Return to Blog posts page.

Expected Behavior:

- OAuth redirect requests `read_content` scope.
- On return (`?shopify=reconnected&reconnect=blogs_sync`), auto-sync triggers.
- Blog posts populate after successful sync.

---

### ERR-003: Permission Failures

Scenario: Non-OWNER attempts to trigger sync.

Steps:

1. Log in as EDITOR/VIEWER.
2. Attempt sync.

Expected Behavior:

- API returns 403; UI remains stable and communicates lack of permission.
- Sync button is disabled for non-OWNER roles.

---

## Limits

### LIM-001: N/A

---

## Regression

### Areas potentially impacted:

- [ ] CP-006 Shopify Sync: existing Pages/Collections sync still works
- [ ] Assets Pages/Collections list routing still correct
- [ ] Scope reconnect flow still works for pages_sync capability

### Quick sanity checks:

- [ ] Products list still loads
- [ ] Pages sync still works
- [ ] Collections sync still works
- [ ] Existing Pages/Collections Playbooks + Draft Review routes still work

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A (no manual cleanup required unless using test stores)

### Follow-up verification:

- [ ] Confirm no unexpected deletes occurred

---

## Known Issues

- Intentionally accepted issues:
  - Metadata-only ingestion; no article body/content stored.
  - No SEO editing or draft generation for blog posts (read-only visibility).
- Out-of-scope items:
  - Any apply/edit functionality for Blog posts.
  - Blog-level sync (we sync articles, not blog metadata).
- TODOs:
  - N/A
