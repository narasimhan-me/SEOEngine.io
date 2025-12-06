# EngineO.ai Marketing Routes & Structure

This document tracks the public marketing surface for EngineO.ai, including the universal homepage and vertical landing pages.

## 1. Universal Homepage

**Route:** `/`
**File:** `apps/web/src/app/(marketing)/page.tsx`
**Layout:** `apps/web/src/app/(marketing)/layout.tsx` with MarketingNavbar and MarketingFooter.

**Homepage positioning:**

- **Primary message:** "Optimize any website for search & AI discovery."
- EngineO.ai is the Discovery Engine Optimization (DEO) platform, combining SEO, AEO, PEO, and VEO.
- Designed to work for ecommerce, SaaS, content-driven sites, and blogs.

**Key sections:**

1. **Hero** — universal DEO positioning and primary CTA.
2. **DEO components** — Content, Entities, Technical, Visibility.
3. **Issues Engine** — high-impact issue detection and grouping.
4. **Optimization Workspaces** — Product and Content workspaces.
5. **Supported Platforms** — ecommerce, CMS, headless/custom.
6. **Who it's for** — ecommerce, SaaS/B2B, publishers, agencies.
7. **CTA** — Start free / Talk to the founder.

---

## 2. Vertical Landing Pages — Shopify Edition

**Route:** `/shopify`
**File:** `apps/web/src/app/(marketing)/shopify/page.tsx`

**Purpose:**

- Speak directly to Shopify merchants without making the main homepage Shopify-only.
- Highlight product optimization, collections/blog support, and DEO benefits in the Shopify context.
- Drive ecommerce-focused conversions (Start Free / Connect Your Store).

**Sections:**

### Shopify Hero
- **Heading:** "EngineO.ai for Shopify".
- **Subheading:** "Optimize your products, collections, pages & blogs for search and AI — automatically."
- Copy explains connection to the Shopify store, full-store crawl, DEO issues, and AI-powered fixes.
- **CTAs:** Start Free (`/signup`) and Connect Your Store (`/login`).

### Why Shopify Stores Need DEO (not SEO)
- Explains that customers search across Google, TikTok, YouTube, ChatGPT, Shopping AI, and retail AI engines.
- Lists the DEO pillars: Content, Entities, Technical health, Visibility signals, Answer-surface readiness.
- Emphasizes that this goes beyond traditional SEO apps.

### Deep Crawl of Your Shopify Store
- Details coverage: product pages, collections, home, blogs, About/Contact/Policies, and SEO liquid-generated pages.
- Clarifies that DEO signals are computed for the entire storefront, not just products.

### Product Optimization Workspace (Shopify Edition)
Shopify-focused workspace with:
- Product-level DEO score.
- AI-generated titles & descriptions.
- Alt text + metadata analysis.
- Thin content detection and missing metadata fixes.
- Shopify SEO sync and per-product issues.

Highlights strengths: AI Metadata Generator, DEO-driven insights, Shopify sync, variant-aware crawling, mobile/desktop UX.

### Collection & Blog Optimization (Content Workspace)
Describes support for:
- Collection page optimization.
- Blog post metadata optimization.
- Home page insights and landing page DEO.

Positions EngineO.ai against Shopify SEO apps by covering the full content surface.

### Issues Engine for Shopify
Explains detection of:
- Missing product metadata.
- Thin/duplicate descriptions.
- Weak entity structure.
- Broken links and crawl failures.
- Low visibility readiness, weak navigation, and answer-surface gaps.

Each issue links to the relevant workspace for fixes.

### Auto-Crawl + Auto-Recompute (Shopify Edition)
- Nightly store crawl and automatic DEO scoring.
- Automatic issue updates and Shopify metadata drift detection.
- Trendlines noted as "coming soon".
- Reinforces that merchants never have to rescan manually.

### Supported Shopify Themes, Apps, & Stacks
Works with:
- Any Shopify theme.
- Online Store 2.0.
- Hydrogen storefronts.
- Headless Shopify and custom Liquid templates.
- Shopify Markets.
- Shopify Flow (future automation phases).

### Shopify-Specific FAQ
Answers:
- Does EngineO.ai modify my theme?
- Does it affect store speed?
- Do I need theme access?
- Can it optimize blogs and collections?
- How is it better than SEO apps in the Shopify App Store?

Clarifies that DEO optimizes for both search engines and AI engines.

### Final CTA
- Restates value: DEO Score, issues list, AI-powered product fixes, collection/page metadata, and automated daily updates.
- **CTAs:** Start Free (`/signup`) and Connect Your Store (`/login`).

---

## 3. Pricing Page

**Route:** `/pricing`
**File:** `apps/web/src/app/(marketing)/pricing/page.tsx`

**Purpose:**

- Present clear, simple pricing for EngineO.ai.
- Align pricing with DEO value (projects, crawled pages, Issues Engine, workspaces, automation).
- Provide obvious upgrade paths from Free → Pro → Business.

**Sections:**

### Pricing Hero
- **Heading:** "Simple pricing for every website."
- **Subheading:** "Choose a plan that grows with your business."
- **CTAs:**
  - Start Free → `/signup`
  - Contact Sales → `/contact`

### Three-tier pricing

Plans implemented via `PricingTable`:

**Free — $0/mo**
- 1 project
- 100 crawled pages
- Weekly crawl
- DEO Score (v1)
- Critical issues only
- Product Workspace (1 product)
- Content Workspace (view-only)
- 5 AI suggestions per month
- CTA: Start Free (`/signup`)

**Pro — $29/mo (Most Popular)**
- 5 projects
- 5,000 crawled pages
- Daily crawl
- Full Issues Engine
- Full Product Workspace
- Full Content Workspace
- Unlimited AI suggestions
- Shopify SEO sync
- DEO Trends (coming soon)
- Priority support
- CTA: Get Pro (`/signup`)

**Business — $99/mo**
- 20 projects
- 25,000 crawled pages
- Hourly crawl scheduling (coming soon)
- Team roles
- API access
- Audit exports
- Dedicated account manager
- CTA: Contact Sales (`/contact`)

**Optional Enterprise**
- Custom pricing
- CTA: Book Demo (`/contact`)

### Feature comparison table
- One table row per key capability (projects, crawled pages, crawl frequency, Issues Engine, Product Workspace, Content Workspace, AI suggestions, Shopify SEO sync, DEO Trends, support level).
- Columns: Free, Pro, Business.
- Values match the bullets above.

### Pricing FAQs

Implemented via `PricingFAQ` with common questions:
- Free plan behavior.
- Impact on themes / site code.
- Whether a developer is required.
- How AI suggestions / usage works.
- Cancellation and plan changes.
- Discounts for agencies and annual billing.

### Final CTA
- Copy: "Ready to improve your visibility across search & AI? Start Free Today."
- CTA button: Start Free (`/signup`).
- Secondary CTA: Talk to Sales (`/contact`).

---

## 4. Navigation

- Marketing navbar (`MarketingNavbar.tsx`) includes a **Shopify** link pointing to `/shopify`.
- Shopify link is visible on desktop nav and in the mobile menu.
- Homepage remains universal; Shopify-specific details live on the `/shopify` vertical page.
