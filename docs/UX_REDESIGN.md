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

