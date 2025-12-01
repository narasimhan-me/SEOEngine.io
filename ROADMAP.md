# EngineO.ai – Product Roadmap (MVP → 12 Months)

This roadmap is divided into **phases** and **time horizons**.  
Timeline assumes a small team (1–3 devs) and may be adjusted as needed.

---

## Phase 1 – Foundation (Month 1)

**Goals:**

- Monorepo structure.
- Basic frontend + backend.
- User auth.
- Projects.

**Deliverables:**

- Next.js 14 app scaffolded (`apps/web`).
- NestJS API scaffolded (`apps/api`).
- Shared TypeScript config and ESLint/Prettier.
- Prisma + Postgres connected.
- Auth:
  - `/auth/signup`
  - `/auth/login`
  - `/users/me`
- Projects CRUD:
  - `/projects` endpoints + UI.
- Simple dashboard with project list.

---

## Phase 2 – Shopify Connection (Month 2)

**Goals:**

- Allow users to connect a Shopify store to a project.
- Store Shopify credentials securely.

**Deliverables:**

- `ShopifyStore` model in DB.
- Shopify OAuth install flow:
  - `/shopify/install`
  - `/shopify/callback`
- Project detail page that shows connection status.
- Basic error handling for failed installs.

---

## Phase 3 – Basic SEO Scan (Month 2–3)

**Goals:**

- Crawl at least the homepage of the site.
- Show basic SEO issues.

**Deliverables:**

- `CrawlResult` model.
- `/seo-scan/start` endpoint.
- `/seo-scan/results` endpoint.
- Simple heuristics:
  - Detect missing title, description, H1, thin content.
- UI for:
  - “Run SEO Scan” on project page.
  - Table of crawl results.
  - Simple per-page SEO score.

---

## Phase 4 – AI Metadata (Month 3–4)

**Goals:**

- Integrate AI to propose SEO titles and meta descriptions.

**Deliverables:**

- AI provider integration (OpenAI/Gemini).
- `AiModule` with `generateMetadata` and `generateProductMetadata`.
- `/ai/metadata` endpoint (for CrawlResult).
- UI for:
  - “Suggest Metadata” button per crawled URL.
  - Modal showing before/after.

---

## Phase 5 – Shopify Product SEO (Month 4–5)

**Goals:**

- Fetch product catalog from Shopify.
- Generate SEO suggestions for product pages.

**Deliverables:**

- `Product` model in DB.
- `/shopify/sync-products` endpoint.
- `/projects/[id]/products` page with product table.
- `/ai/product-metadata` endpoint.
- UI for per-product SEO suggestions.

---

## Phase 6 – Apply SEO to Shopify (Month 5–6)

**Goals:**

- Push SEO changes back to Shopify product data.

**Deliverables:**

- `/shopify/update-product-seo` endpoint.
- Integration with Shopify Admin API updates.
- UI:
  - “Apply to Shopify” button for AI suggestions.
  - Show applied SEO state.

---

## Phase 7 – Dashboard & Reporting (Month 6–7)

**Goals:**

- Give merchants a single overview of SEO health.

**Deliverables:**

- `/projects/:id/overview` endpoint.
- `/dashboard` with project-level summary cards.
- Project page showing:
  - SEO score.
  - Last scan date.
  - Number of issues.
  - Synced products.
- Weekly email report (nice-to-have).

---

## Phase 8 – Hardening & Performance (Month 7–8)

**Goals:**

- Improve reliability and performance.
- Introduce background jobs.

**Deliverables:**

- Redis + queue for long-running scans and syncs.
- Rate limiting for AI and crawl endpoints.
- Error monitoring (Sentry/Datadog).
- Improved test coverage:
  - Unit tests for services.
  - E2E tests for key flows.

---

## Phase 9 – Content Engine (Month 8–10)

**Goals:**

- Add AI content generation features.

**Deliverables:**

- AI blog post generator.
- AI collection description generator.
- Simple content templates.
- UI for generating, editing, and scheduling content.

---

## Phase 10 – Growth & Expansion (Month 10–12)

**Goals:**

- Multi-platform support and advanced SEO features.

**Possible Deliverables:**

- WooCommerce integration.
- BigCommerce integration.
- Advanced internal linking suggestions.
- Backlink monitoring (via external APIs).
- Local SEO features (Google Business Profile optimization).
- More granular role-based access control and team accounts.

---

END OF ROADMAP
