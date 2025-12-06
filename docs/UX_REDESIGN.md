# Products Page UX Redesign (Phase UX-1)

This document captures the UX decisions and implementation notes for the Products page redesign in the web app (`apps/web`).

The goal is to replace the wide, horizontally scrollable table with a compact, responsive row-card layout that is easier to scan and works well on all screen sizes.

## Objectives

- Remove horizontal scrolling from the Products page.
- Show only key, high-signal information in the main list.
- Provide an expandable detail view for deeper metadata per product.
- Preserve existing functionality (sync, SEO scan, AI suggestions, Shopify apply).

## Layout Overview

### Main Layout

- The page continues to:
  - Gate access with auth.
  - Fetch products via `productsApi.list(projectId)`.
  - Fetch Shopify integration status via `/projects/:id/integration-status`.
  - Offer a top-level **Sync Products** button.
- The list content area is now handled by `ProductTable` instead of a `<table>`.

### Row Structure

Each product row is a clickable card-like `<div>` with three main zones:

1. **Left Section**
   - Product image thumbnail (40×40) when `imageUrls` is present.
   - Placeholder icon when no image is available.
   - Primary line: product title (truncated, bold).
   - Secondary line: Shopify external ID (dimmed text).

2. **Middle Section**
   - **Status chip** derived from current metadata:
     - **Optimized** – SEO title & description present, within recommended length ranges.
     - **Needs optimization** – metadata present but incomplete or length out of range.
     - **Missing metadata** – no SEO title and no SEO description.
   - **DEO micro indicators** (text/icons only; no backend changes):
     - Title indicator (green/red dot depending on `seoTitle` presence).
     - Description indicator (green/red dot depending on `seoDescription` presence).
     - Alt text indicator (neutral – placeholder until alt coverage is tracked).
   - **Scan SEO** pill button:
     - Calls the existing `seoScanApi.scanProduct(productId)` action.
     - Shows a spinning icon while scanning the selected product.

3. **Right Section**
   - **Optimize** primary button:
     - Calls the existing `aiApi.suggestProductMetadata(productId)` handler.
     - Opens the existing AI suggestion modal.
     - Shows a loading spinner while a suggestion is in progress for that product.
   - **Overflow menu (⋮)**:
     - `View details` – toggles the expanded detail panel for that row.
     - `Sync` – invokes the existing project-level `handleSyncProducts` function.
     - `Edit` – disabled placeholder (future enhancement).
     - `Remove` – disabled placeholder (future enhancement).

The entire row is responsive:

- `flex-col` on small screens, stacking sections vertically.
- `sm:flex-row` on larger screens with `justify-between` and `gap-*` utilities.
- No horizontal scrolling; long text is truncated with `truncate` and `min-w-0`.

## Detail Panel

Expanded detail content is rendered by `ProductDetailPanel` directly below the row card when it is expanded.

The panel surfaces secondary information that previously lived in table columns or would not fit in a compact row:

- **Meta title** – from `seoTitle` (or “Not set”).
- **Meta description** – from `seoDescription` (or “Not set”).
- **Alt text coverage** – placeholder text (no product-level alt data yet).
- **Issues** – placeholder text (“No issue data attached to products yet”).
- **Last synced** – formatted `lastSyncedAt`.
- **Last optimized** – placeholder (“Not available”) until backed by real data.
- **URL** – placeholder (URL is not stored on `Product` records today).

The panel uses a simple `grid` layout (`md:grid-cols-2`) with a soft gray background to distinguish it from the main row.

## Filters

The Products list now includes a simple filter bar implemented entirely on the client:

- Filters:
  - **All**
  - **Needs Optimization**
  - **Optimized**
  - **Missing Metadata**
- Filter state is local to `ProductTable`.
- Filter counts are computed from the loaded `products` array using the same status logic that drives the status chip.
- The active filter is highlighted with a filled pill; others use a subtle gray background.

No new API endpoints are introduced; filtering is done against the in-memory product list returned by `productsApi.list`.

## Component Boundaries

- `apps/web/src/lib/products.ts`
  - Defines the shared `Product` interface used by the Products page and components.

- `apps/web/src/components/products/ProductTable.tsx`
  - Owns filter state, expanded-row state, and status classification.
  - Renders the filter bar and list of `ProductRow` components.
  - Accepts callbacks for scan, optimize, and sync; does not perform data fetching.

- `apps/web/src/components/products/ProductRow.tsx`
  - Renders a single product row card.
  - Handles overflow menu, scan button, optimize button, and toggling expansion.
  - Uses inline SVG icons consistent with existing design patterns.

- `apps/web/src/components/products/ProductDetailPanel.tsx`
  - Renders the expanded metadata/details surface beneath a row.
  - Currently uses placeholders for fields not present on the `Product` model.

- `apps/web/src/app/projects/[id]/products/page.tsx`
  - Remains the data/behavior controller:
    - Auth guard.
    - Loads products and project integration status.
    - Handles sync, scan, and AI suggestion actions.
    - Owns the AI suggestion modal and “Apply to Shopify” behavior.
  - Delegates display of the products list to `ProductTable`.

## Constraints & Non-Goals

- **No backend changes**
  - No Prisma schema changes.
  - No new endpoints or modifications to `productsApi` or `shopifyApi`.
  - No changes to DEO scoring or crawlers.

- **UX-only changes**
  - All new behavior is implemented in the Next.js frontend using existing APIs.
  - Tailwind is used for layout and styling; no new CSS frameworks are introduced.

- **Future hooks**
  - The detail panel and overflow menu are designed so that real alt coverage, URL, issues, and per-product edit/remove actions can be wired in later without structural changes.

---

# Product Optimization Workspace (Phase UX-2)

This phase adds a dedicated per-product optimization screen for Shopify products, complementing the Products list redesign from UX-1.

## Purpose

Provide a full-screen workspace for optimizing individual product SEO metadata with AI assistance and DEO insights.

## Layout

The workspace uses a responsive 3-panel layout:

### Left Panel (260px on desktop)
- **Product Overview Panel**
  - Product thumbnail (40×40)
  - Product title (bold, truncated)
  - Shopify handle / external ID
  - Price (formatted with currency)
  - Shopify status
  - Last synced timestamp
  - Last optimized timestamp
  - Status chip (Optimized / Needs optimization / Missing metadata)

### Center Panel (flexible width)
- **AI Suggestions Panel**
  - Generate AI-powered SEO suggestions
  - Display suggested title with character count (X/60)
  - Display suggested description with character count (X/155)
  - "Apply to editor" buttons for each suggestion
  - Regenerate button

- **SEO Metadata Editor**
  - Meta title input with character counter and guidance (Ideal: 50-60 chars)
  - Meta description textarea with character counter (Ideal: 140-155 chars)
  - Handle field (read-only)
  - Alt text placeholder (future phase)
  - "Reset to Shopify data" button
  - "Apply to Shopify" button

### Right Panel (260px on desktop)
- **DEO / SEO Insights Panel**
  - Content depth (word count with label: Very short/Short/Moderate/Rich)
  - Metadata completeness (SEO title and description presence indicators)
  - Thin content warning (when applicable)
  - Overall status summary
  - Coming soon section (crawl health, indexability, entity coverage, SERP visibility)

## Navigation

- Breadcrumb trail: Projects → [Project Name] → Products → [Product Title]
- Back link to Products list
- Route: `/projects/[id]/products/[productId]`

## User Flows

1. **AI → Editor → Shopify Flow**
   - User clicks "Generate Suggestions" in AI panel
   - AI returns suggested title and description
   - User clicks "Apply to editor" for each field (or both)
   - User modifies suggestions in the editor as needed
   - User clicks "Apply to Shopify" to push changes

2. **Manual Edit Flow**
   - User edits title/description directly in the editor
   - User clicks "Apply to Shopify" to push changes

3. **Reset Flow**
   - User clicks "Reset to Shopify data" to restore original values

## Dependencies

- Reuses existing `aiApi.suggestProductMetadata` for AI suggestions
- Reuses existing `shopifyApi.updateProductSeo` for Shopify updates
- No backend changes required

## Component Structure

```
apps/web/src/components/products/optimization/
├── index.ts                      # Barrel exports
├── ProductOptimizationLayout.tsx # 3-panel responsive layout
├── ProductOverviewPanel.tsx      # Left panel content
├── ProductAiSuggestionsPanel.tsx # AI suggestions with apply buttons
├── ProductSeoEditor.tsx          # Title/description editor
└── ProductDeoInsightsPanel.tsx   # DEO/SEO insights
```

Page route:
```
apps/web/src/app/projects/[id]/products/[productId]/page.tsx
```

## Responsive Behavior

- **Mobile** (`<1024px`): Vertical stack (flex-col), all panels full width
- **Desktop** (`≥1024px`): 3-column grid with sticky side panels

Side panels use `lg:sticky lg:top-4` so they remain visible while scrolling the center content.

## Extended Product Interface

Added optional fields to `Product` interface in `apps/web/src/lib/products.ts`:

```typescript
interface Product {
  // ... existing fields
  handle?: string | null;
  price?: number | null;
  currency?: string | null;
  shopifyStatus?: string | null;
  lastOptimizedAt?: string | null;
}
```

These fields are populated if available from the backend but gracefully degrade if not present.

## Constraints & Non-Goals

- **No backend changes**: All functionality uses existing APIs
- **No Prisma schema changes**: New Product fields are optional and frontend-only for now
- **Complements UX-1**: Works alongside the Products list, accessed via row click or direct URL

---

# Products Mobile Layout Fixes (Phase UX-1.1)

This phase addresses mobile responsiveness issues in the Products page and related navigation, making the interface usable on phones without horizontal scrolling.

## Goals

- Make the Products list usable on mobile devices (phones)
- Hide sidebar navigation on mobile and expose it via a slide-over drawer
- Stack product cards vertically on small screens with full-width action buttons
- Eliminate horizontal scrolling under normal usage conditions

## Sidebar Navigation

### Project Layout (`apps/web/src/app/projects/[id]/layout.tsx`)

- Converted to a client component to manage drawer state
- On mobile (`<md`): Sidebar hidden by default, "Menu" button shows at the top
- On tablet/desktop (`≥md`): Side-by-side layout preserved unchanged
- Drawer slides in from the left with a dark overlay backdrop
- Clicking a nav link closes the drawer automatically

### Admin Layout (`apps/web/src/app/admin/layout.tsx`)

- Same drawer pattern as Project Layout
- "Admin navigation" label with "Menu" button on mobile
- Side-by-side layout on larger screens

### SideNav Components

- `ProjectSideNav` and `AdminSideNav` updated with optional `onNavigate` prop
- When rendered in drawer, calling `onNavigate` closes the drawer on link click
- Width adjusted: `w-full max-w-xs md:w-48` for responsive drawer width

## Product Cards

### `ProductRow.tsx` Mobile Stacking

On mobile (`<sm`):
1. **Header section**: Thumbnail + title (2-line clamp) + handle + status chip under title
2. **Metadata indicators**: Title/Description/Alt text badges in one row
3. **Actions section**:
   - Optimize button: Full width with comfortable tap target
   - Scan SEO + Overflow menu: Below Optimize in a secondary row

On tablet/desktop (`≥sm`):
- Horizontal 3-zone layout preserved
- Status chip and Scan SEO button in middle section (hidden on mobile)

### Layout Patterns

```
Mobile (<640px):
┌─────────────────────────────────┐
│ [img] Title line 1              │
│       Title line 2 (if needed)  │
│       handle-or-id              │
│       [Status chip]             │
├─────────────────────────────────┤
│ [•Title] [•Desc] [•Alt]         │
├─────────────────────────────────┤
│ [    Optimize (full width)    ] │
│ [Scan SEO]              [⋮]     │
└─────────────────────────────────┘

Desktop (≥640px):
┌──────────────┬─────────────────────────┬──────────────┐
│ [img] Title  │ [Status] [Scan SEO]     │ [Optimize][⋮]│
│       handle │ [•Title][•Desc][•Alt]   │              │
└──────────────┴─────────────────────────┴──────────────┘
```

## Horizontal Scroll Prevention

### Products Page Container

- Root container: `overflow-x-hidden` to prevent any horizontal scroll
- Products list wrapper: `overflow-hidden md:overflow-visible`
- Header row: `flex-col sm:flex-row` stacking with full-width Sync button on mobile
- Long text truncated with `truncate` and `min-w-0` where applicable

## Component Updates

| File | Changes |
|------|---------|
| `apps/web/src/app/projects/[id]/layout.tsx` | Client component + mobile drawer |
| `apps/web/src/app/admin/layout.tsx` | Mobile drawer pattern |
| `apps/web/src/components/layout/ProjectSideNav.tsx` | `onNavigate` prop, responsive width |
| `apps/web/src/components/layout/AdminSideNav.tsx` | `onNavigate` prop, responsive width |
| `apps/web/src/components/products/ProductRow.tsx` | Mobile stacking, split actions |
| `apps/web/src/app/projects/[id]/products/page.tsx` | Responsive header, overflow-x-hidden |

## Breakpoints Used

- `sm` (640px): Product cards switch from stacked to horizontal
- `md` (768px): Sidebar drawer hidden, side-by-side layout shown

## Constraints

- **Responsive-only changes**: No backend or API changes
- **Desktop/tablet unchanged**: Layouts remain visually identical on larger screens
- **No new dependencies**: Uses Tailwind responsive utilities only

---

# Issues UI Integration (Phase UX-4)

This phase surfaces DEO issues from the Phase 3B Issues Engine across the EngineO.ai web app, providing actionable visibility into issues affecting pages and products.

## Purpose

Connect the backend DEO Issues Engine (`GET /projects/:id/deo-issues`) to the frontend, displaying aggregated issue data in three key locations:

1. **Project Overview** – Summary card + full issues list modal
2. **Products List** – Per-product issue badges
3. **Product Optimization Workspace** – Detailed issues in DEO Insights panel

## Components Created

### `apps/web/src/components/issues/`

| Component | Description |
|-----------|-------------|
| `IssueBadge.tsx` | Compact badge showing issue count with severity-based coloring (critical=red, warning=orange, info=blue) |
| `IssuesSummaryCard.tsx` | Summary card for Overview page with Critical/Warning/Info counts and "View All Issues" button |
| `IssuesList.tsx` | Expandable list of issue categories with affected pages/products; maps issue IDs to friendly labels via `ISSUE_UI_CONFIG` |

### Issue ID to Label Mapping

The `ISSUE_UI_CONFIG` object in `IssuesList.tsx` provides user-friendly labels and descriptions:

```typescript
export const ISSUE_UI_CONFIG: Record<string, { label: string; description: string }> = {
  'missing_meta_title': { label: 'Missing Meta Title', description: '...' },
  'missing_meta_description': { label: 'Missing Meta Description', description: '...' },
  'thin_content': { label: 'Thin Content', description: '...' },
  // ... additional issue types
};
```

## Integration Points

### 1. Project Overview (`/projects/[id]/overview`)

- **IssuesSummaryCard** in right column showing:
  - Count by severity (Critical / Warning / Info)
  - Loading skeleton while fetching
  - Error state with retry
  - Empty state when no issues
- **"View All Issues"** button opens modal with full `IssuesList`
- Data fetched via `projectsApi.deoIssues(projectId)`

### 2. Products List (`/projects/[id]/products`)

- **IssueBadge** on each `ProductRow` showing issue count for that product
- Badge color reflects highest severity issue affecting the product
- Issues filtered to `affectedProducts` containing the product ID
- `ProductTable` receives `productIssues` prop and builds `issuesByProductId` map

### 3. Product Optimization Workspace (`/projects/[id]/products/[productId]`)

- **ProductDeoInsightsPanel** updated with new "DEO Issues" section
- Shows issues specifically affecting the current product
- Each issue displays with severity-based styling and description

## API Integration

Uses existing endpoint from Phase 3B:

```typescript
// apps/web/src/lib/api.ts
export const projectsApi = {
  // ... existing methods
  deoIssues: (id: string) => fetchWithAuth(`/projects/${id}/deo-issues`),
};
```

Response type:
```typescript
interface DeoIssuesResponse {
  issues: DeoIssue[];
}

interface DeoIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  count: number;
  affectedPages?: { url: string; pageId: string }[];
  affectedProducts?: { title: string; productId: string }[];
}
```

## State Management

Each page manages its own issues state:

```typescript
const [deoIssues, setDeoIssues] = useState<DeoIssue[]>([]);
const [deoIssuesLoading, setDeoIssuesLoading] = useState(false);
const [deoIssuesError, setDeoIssuesError] = useState<string | null>(null);
```

Issues are fetched alongside other page data using `Promise.all` for parallel loading.

## Severity Color Scheme

Consistent across all components:

| Severity | Background | Border | Text |
|----------|------------|--------|------|
| Critical | `bg-red-50` | `border-red-200` | `text-red-700` |
| Warning | `bg-yellow-50` | `border-yellow-200` | `text-yellow-700` |
| Info | `bg-blue-50` | `border-blue-200` | `text-blue-700` |

## Constraints

- **Frontend-only**: Consumes existing `GET /projects/:id/deo-issues` endpoint
- **No backend changes**: All changes in `apps/web`
- **Graceful degradation**: Handles loading, error, and empty states
- **Type-safe**: Uses shared `DeoIssue` and `DeoIssuesResponse` types from `@engineo/shared`

---

# Row-Level Navigation + Workspace Access (Phase UX-5)

This phase upgrades the Products list UX so that opening the Product Optimization Workspace is intuitive and fast, without relying solely on the "Optimize" button or overflow menu.

## Goals

- Make each product card clearly clickable to open the workspace.
- Expose a visible "Open Workspace" action near the product title.
- Keep Optimize as a primary action, but no longer the only navigation path.
- Preserve existing Issues UI and optimization flows.

## Scope

- **Files touched (frontend only):**
  - `apps/web/src/components/products/ProductRow.tsx`
  - `apps/web/src/components/products/ProductTable.tsx`
  - `apps/web/src/app/projects/[id]/products/page.tsx`
- **No backend changes:**
  - No new endpoints or schema fields.
  - No DEO scoring or Issues Engine changes.

## Row Behavior

### Clickable Row Card

- Entire `ProductRow` card is now clickable and navigates to the Product Optimization Workspace:
  - Route: `/projects/[projectId]/products/[productId]`.
- Click handling rules:
  - Clicks on buttons, menus, or elements marked with `data-no-row-click` do **not** trigger navigation.
  - Row uses `role="button"`, `tabIndex={0}`, and keyboard handling (Enter/Space) for accessibility.
- Visual feedback:
  - Light hover background (`hover:bg-gray-50`) and shadow.
  - Pressed/active state (`active:bg-gray-100`).

### Visible "Open Workspace" Link

- Under the product title/handle, `ProductRow` renders a small tertiary link:
  - Label: `Open Workspace →`
  - Styling: blue text with hover underline, consistent with other links.
  - Uses `next/link` to navigate directly to the workspace route.
- On mobile, the link appears in the stacked header section so it remains close to the primary content and above the full-width Optimize button.

### Optimize Button Semantics

- Optimize button still triggers the AI suggestions flow (existing behavior).
- It also effectively serves as another way to reach the workspace, since the workspace hosts the optimization modal/editor.
- Implementation-wise:
  - `onOptimize` remains wired to AI suggestions and modal behavior.
  - Row-level navigation is now independent of Optimize, so future phases can repurpose Optimize for richer flows without breaking navigation.

### Overflow Menu

- Overflow menu (`⋮`) contents:
  - `View details` – toggles the expanded `ProductDetailPanel` below the row.
  - `Sync` – invokes existing project-level sync handler.
  - `Edit` – disabled placeholder (future).
  - `Remove` – disabled placeholder (future).
- **Open Workspace** is no longer inside the overflow menu; it is exposed as a visible link next to the header.
- All overflow actions are marked with `data-no-row-click` so they never trigger row-level navigation.

## Mobile Interaction

- On small screens:
  - Tapping anywhere on the row card (excluding buttons/menus) opens the workspace.
  - Optimize button remains full-width at the bottom of the card.
  - "Open Workspace" link appears near the product title in the stacked layout for clear discoverability.
  - Overflow menu behavior is unchanged aside from the removal of "Open Workspace" from the menu.
- These changes respect the existing UX-1.1 constraints:
  - No new horizontal scroll.
  - Tap targets remain large and non-overlapping.

## Component Notes

- `ProductRow.tsx`
  - Adds row-level click and keyboard handlers using `next/navigation`’s `useRouter`.
  - Adds the "Open Workspace" link under the product header.
  - Updates hover/active styles for the row container.
  - Tags interactive controls (Optimize, Scan SEO, overflow trigger, menu actions) with `data-no-row-click`.
  - Keeps the expanded `ProductDetailPanel` behavior driven by the overflow "View details" action.

- `ProductTable.tsx`
  - Continues to own filter state and expansion state.
  - Still passes `onToggle` to `ProductRow` for detail panel toggling via the overflow menu.
  - Existing issue badge mapping and filter logic remain unchanged.

- `projects/[id]/products/page.tsx`
  - No structural changes beyond ensuring routing and imports continue to work with the updated row navigation.

## Constraints & Non-Goals

- Frontend-only phase; no API or Prisma changes.
- Does not alter Product Optimization Workspace layout or logic (UX-2).
- Does not modify DEO Issues UI integration (UX-4); issue badges and product-level issues remain intact.
- Focused solely on navigation and interaction semantics for the Products list.

---

# Content Pages Tab + Content Workspace (Phases UX-Content-1 & UX-Content-2)

These phases introduce a first-class UX for all non-product content pages discovered by the crawler (collections, blogs, static pages, home, and landing pages), parallel to the existing Products list + Product Optimization Workspace.

## Goals

- Surface all non-product URLs discovered by the crawler in a dedicated Content area.
- Attach DEO status, issues, and crawl health to each page.
- Provide a per-page Content Optimization Workspace for metadata tuning with AI suggestions.
- Keep the UX consistent with the Products list and Product Optimization Workspace so users can switch between products and content seamlessly.

## Content Pages List (UX-Content-1)

### Navigation

- The existing Content entry in ProjectSideNav links to the new route: `/projects/[id]/content`.
- Route file: `apps/web/src/app/projects/[id]/content/page.tsx`.

### Data Source

- Uses a new backend endpoint: `GET /projects/:id/crawl-pages`.
- Endpoint returns all CrawlResult rows for the project excluding product URLs.
- Each row includes a computed `pageType` field:
  - `home` – `/`
  - `collection` – `/collections/*`
  - `blog` – `/blogs/*` or `/blog/*`
  - `static` – `/pages/*` or canonical navigational paths like `/about`, `/contact`, `/faq`, `/support`, `/shipping`
  - `misc` – any other non-product URL.

### Row Layout

Each content page is rendered as a compact card-style row:

- **Left:** Page type pill + URL path (e.g. `/collections/summer`), with optional truncated title under the path.
- **Middle:** Status chip derived from metadata and crawl issues (e.g. Indexed, Missing Metadata, Thin Content, Error).
- **Right:** Issue badge (via `IssueBadge`) showing count + severity, last crawled timestamp, and an optional AI indicator when suggestions have been generated.

- Entire row is clickable and navigates to the Content Workspace route: `/projects/[projectId]/content/[pageId]` (UX-Content-2).
- Links and buttons inside the row (e.g. "Open Workspace →" text link) are marked to opt out of row-level click behavior, matching the Products list pattern.

### DEO Issues Integration

- The list view also consumes the existing `GET /projects/:id/deo-issues` endpoint.
- For each page, the UI aggregates `DeoIssue.affectedPages` entries to compute:
  - Issue count for that URL/path.
  - Highest severity (critical / warning / info) to feed into `IssueBadge`.

## Content Workspace (UX-Content-2)

### Route & Layout

- Route: `/projects/[id]/content/[pageId]` where `pageId` corresponds to the underlying `CrawlResult.id`.
- File: `apps/web/src/app/projects/[id]/content/[pageId]/page.tsx`.
- Uses a 3-panel layout mirroring the Product Optimization Workspace:

### Left Panel – Page Overview

- URL and path.
- Page type (home / collection / blog / static / misc).
- Title, H1, meta description (read-only view of current values).
- Word count and basic crawl status.
- Last crawled timestamp.
- Screenshot placeholder area for a future phase.

### Center Panel – AI Suggestions & Editor

- Calls the existing AI metadata endpoint (via `aiApi.suggestMetadata(crawlResultId)`).
- Surfaces:
  - Suggested title.
  - Suggested meta description.
  - An editable H1 field (defaulted from the suggestion or existing H1).
  - An optional summary / intro paragraph field (initially empty or derived from existing content when available).
- Users can:
  - Copy suggested fields to clipboard.
  - Apply suggestions into the editable fields before using them in their CMS.
  - Manually edit all fields even without AI suggestions.
- "Apply to Shopify" is treated as a future enhancement for pages/collections; in this phase, the primary action is copy-to-clipboard.

### Right Panel – DEO Insights & Issues

- Consumes project-level deo-issues data and filters per page URL.
- Shows:
  - Thin content heuristics (word count thresholds).
  - Missing metadata indicators (title / description / H1).
  - Basic entity structure hints (presence of title + H1).
  - Answer-surface readiness (word count + heading presence).
  - Crawl health status (HTTP status and key crawl issues).
- Uses the same visual language as `ProductDeoInsightsPanel` (chips, labels, and colored indicators).

## Mobile Behavior

### Content List

- Rows stack vertically on small screens (`flex-col`) with:
  - Path + page type on the first line.
  - Status chip and issue badge on the second line.
  - Last crawled and AI indicator on the third line.
- No horizontal scrolling; long paths and titles are truncated with `truncate` + `min-w-0`.

### Workspace

- Panels stack vertically on mobile (Left → Center → Right).
- Center panel remains scrollable with a sticky AI header (section title and actions pinned at the top) to keep the "Generate Suggestions" controls visible.
- On desktop, the layout mirrors the 3-panel product workspace with sticky side panels where appropriate.

## Constraints & Non-Goals

### No Prisma schema changes

- Reuses existing `CrawlResult` model; `pageType` classification is computed in the backend and returned via the crawl-pages endpoint.

### Minimal backend additions

- Adds `GET /projects/:id/crawl-pages` to expose non-product crawl results with `pageType`.
- Does not change crawl logic, queues, or DEO scoring.

### Out of scope for this phase

- Direct editing or publishing of Shopify pages or blog posts.
- Applying metadata back to Shopify Pages/Blog/Collections APIs (placeholder for a later phase).
- Deep HTML editing or full content rewriting beyond basic metadata and summaries.
- Performance metrics (CWV) visualizations inside the workspace.
