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
- 5 AI suggestions per day
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

## 4. Vertical Landing Pages — Websites / CMS Edition

**Route:** `/websites`
**File:** `apps/web/src/app/(marketing)/websites/page.tsx`

**Purpose:**

- Speak directly to non-ecommerce website owners (WordPress, Webflow, static sites, documentation sites, blogs, SaaS marketing sites).
- Reinforce that DEO is not just for product catalogs — it applies to every crawlable page.
- Highlight Content Workspace, full-site crawling, and AI-powered metadata generation for blog/page content.

**Sections:**

### Websites Hero

- **Heading:** "EngineO.ai for WordPress, Webflow, and Every Website."
- **Subheading:** "Optimize all your pages, blogs, documentation, and landing pages for search & AI — automatically."
- Copy explains full-site crawling, visibility issues detection, AI-powered fixes for titles/descriptions/metadata/content depth/entity structure.
- Notes: "Works with any CMS. No plugins required."
- **CTAs:** Start Free (`/signup`) and Try Demo (`/contact`).

### Why DEO Matters for All Websites (not just ecommerce)

- Explains that search is no longer the only discovery channel.
- AI assistants, chatbots, and answer engines rely on: Structured content, Entities, Metadata, Crawlability, Semantic clarity.
- EngineO.ai helps any website become discoverable across: Google, ChatGPT, Gemini, Perplexity, AI agents, Vertical search systems.
- DEO is the new foundation of visibility.

### Full-Site Crawling

- EngineO.ai analyzes all URLs: Home page, About/Contact/Pricing, Blog index + blog posts, Documentation pages, Landing pages, Category/tag taxonomies, Custom routes.
- No plugin or script required — just enter your domain.

### Content Workspace (Non-Ecommerce Edition)

A dedicated workspace for optimizing any page:

- Extracted metadata (Title, H1, Description).
- AI-generated suggestions.
- Content depth analysis.
- Entity + semantic structure insights.
- Answer-surface readiness.
- Crawl health indicators.
- Per-page DEO issues.

This is the equivalent of your Product Workspace — but built for all website types.

### Issues Engine for Content Sites

EngineO.ai detects the issues that most CMS sites struggle with:

- Thin content.
- Missing or duplicate metadata.
- Weak H1/H2 structure.
- Low entity coverage.
- Weak internal linking.
- Indexability problems.
- Navigation gaps.
- Dead or redirected URLs.

Each issue links to the affected pages → workspace → fix.

### AI-Powered Metadata Generation

Generate optimized:

- Titles.
- Meta descriptions.
- H1 headings.
- Page summaries.
- Entity-rich intros.

AI suggestions are tuned for both search engines AND AI models.

### Supported Platforms

Works with every platform:

**Website & blog CMS:**

- WordPress, Webflow, Wix, Squarespace, Ghost, HubSpot CMS, Drupal, Blogger.

**Modern headless frameworks:**

- Next.js, Remix, Astro, Gatsby, Nuxt, SvelteKit, Custom frameworks.

**Custom sites:**

- Static sites, Server-rendered apps, Hybrid architectures.

If your website is crawlable, EngineO.ai can analyze it and surface DEO insights.

### Websites FAQ

Answers:

- Do I need a plugin for WordPress or Webflow? → No — EngineO.ai crawls your public site directly.
- Can it optimize blog metadata? → Yes — blog posts are first-class in the Content Workspace.
- Does it rewrite my actual page content? → No — it generates recommendations. You stay in control.
- How often does it crawl my site? → Depending on your plan, daily, weekly, or custom schedule.

### Final CTA

- Copy: "Ready to make your website visible across search & AI?"
- **CTAs:** Start Free (`/signup`) and Talk to the founder (`/contact`).

---

## 5. Product Tour / Features Page

**Route:** `/features`
**File:** `apps/web/src/app/(marketing)/features/page.tsx`

**Purpose:**

- Provide a full, storytelling-style walkthrough of the EngineO.ai platform.
- Explain DEO (Discovery Engine Optimization), DEO Score, crawling, Issues Engine, and Workspaces.
- Bridge ecommerce (Shopify / products) and general websites (WordPress, Webflow, custom).
- Act as a high-intent conversion page from organic and paid traffic.

**Sections:**

### Product Tour Hero

- **Heading:** "A complete visibility engine for your entire website."
- Copy: "EngineO.ai crawls your site, analyzes signals, detects issues, computes a DEO Score, and gives you AI-powered workflows to fix anything blocking your visibility."
- "One platform. Every page. All your discovery signals."
- **CTAs:** Start Free (`/signup`) and Try Demo (`/contact`).

### What EngineO.ai Actually Does + DEO Score

Implemented via `ProductTourDEOSection`:

- Clarifies that EngineO.ai is not an SEO tool, but a DEO platform for the search + AI era.
- Steps: Crawls your entire website, Extracts visibility signals, Computes a DEO Score, Detects issues, Generates AI fixes, Automates rescans and recompute, Helps you optimize products/pages/blogs/collections.
- Shows four DEO components: Content Quality, Entities & Semantic Signals, Technical Health, Visibility Strength.
- Emphasizes that the DEO Score is a single number representing site-wide visibility.
- Includes a placeholder visualization for a DEO Score dial/card.

### Full-Site Crawling Engine

Implemented via `ProductTourCrawlSection`:

- Lists URL types crawled: product pages, collections/categories, blog posts, landing pages, home, documentation, custom routes, hub pages, navigation pages.
- Copy: "We crawl your entire website automatically. No setup. No plugins. No code."
- Includes a "Crawl graph" visual placeholder card.

### Issues Engine

Implemented via `ProductTourIssuesSection`:

- Issues detected: Missing metadata, Thin content, Weak structure, Answer-surface gaps, Low entity coverage, Crawl failures, Navigation gaps, Shallow product content, Broken links.
- Each issue explains: What it is, Why it matters, How to fix it, Which pages/products are affected.
- CTA button: "View all issues" leading into the app.

### Product Optimization Workspace

Implemented via `ProductTourProductWorkspace`:

- For ecommerce stores: Product overview, AI metadata suggestions, SEO + DEO insights, Shopify sync, Variant-aware crawling, Issue badges, Optimization history (future).
- Includes a screenshot placeholder for the Product Workspace.

### Content Optimization Workspace

Implemented via `ProductTourContentWorkspace`:

- For all non-product pages: Title + description editing, AI suggestions, Thin content detector, Entity structure insights, Crawl health, Page-level issue list.
- Support for: WordPress, Webflow, Wix, Squarespace, Ghost, Custom sites.
- Includes a screenshot placeholder for the Content Workspace.

### DEO Automation

Implemented via `ProductTourAutomation`:

- Copy: "Your website changes. Your visibility shouldn't break."
- EngineO.ai automates: Scheduled crawls, DEO recompute, Issue re-evaluation, Drift detection (Shopify metadata changes), Trend snapshots (coming soon).

### Supported Platforms

Implemented via `ProductTourPlatforms`:

- Small section linking out to the Websites / CMS vertical page.
- Platforms listed: WordPress, Webflow, Wix, Squarespace, Shopify, Ghost, Custom, Static headless sites.
- CTA: "View supported platforms" linking to `/websites`.

### DEO vs SEO

Implemented via `ProductTourSEOComparison`:

- Clarifies: SEO focuses on keywords and SERP ranking. DEO focuses on visibility across search engines, AI assistants, and answer engines.
- EngineO.ai evaluates: Discovery surface, Entity relevance, Answer readiness, Crawl accessibility.
- Positions EngineO.ai as the visibility layer for the AI era.

### Final CTA

Implemented via `ProductTourCTASection`:

- Copy: "Everything you need to understand and improve your website. Get your DEO Score, issues, and AI-powered fixes in minutes."
- CTA button: Start Free (`/signup`).

---

## 6. "What Is DEO?" Education Page

**Route:** `/deo`
**File:** `apps/web/src/app/(marketing)/deo/page.tsx`

**Purpose:**

- Establish EngineO.ai as the category leader and definitive source for DEO (Discovery Engine Optimization).
- Educate visitors on what DEO is, why it matters, and how it differs from traditional SEO.
- Provide a long-form educational resource that can rank for "What is DEO" queries and serve as a canonical reference.

**Sections:**

### DEO Hero

- **Heading:** "What is DEO?"
- **Subheading:** "Discovery Engine Optimization is SEO + AEO + PEO + VEO."
- Short copy defining DEO as the practice of optimizing websites for discovery across search engines, AI assistants, and answer engines.
- Visual placeholder for DEO diagram.
- **CTAs:** See your DEO Score (`/signup`) and Learn More (anchor to next section).

### Why DEO Exists

- Copy explaining that traditional SEO was built for a world where Google was the only discovery channel.
- Lists new discovery surfaces: ChatGPT, Gemini, Perplexity, voice assistants, in-app AI, vertical search systems.
- Positions DEO as the framework for multi-channel visibility.

### The Four DEO Pillars

Lists the four optimization layers that make up DEO:

1. **Content Quality** — deep, unique, authoritative content.
2. **Entities & Semantics** — structured data, schema, entity linkage.
3. **Technical Health** — crawlability, speed, indexability, mobile-readiness.
4. **Visibility Signals** — mentions, citations, answer-surface appearance.

### How AI "Sees" Your Website

- Explains that AI models and retrieval systems extract entities, evaluate structure, and score answer-worthiness.
- Notes that traditional SEO metrics (backlinks, keyword density) are less relevant than semantic clarity and entity coverage.
- Positions DEO as the framework for AI-age visibility.

### DEO Results

Lists outcomes from implementing DEO:

- Higher organic traffic.
- Increased AI citations and mentions.
- Improved answer-surface presence.
- More consistent brand visibility across platforms.

### DEO vs SEO Comparison Table

A side-by-side comparison:

- SEO: Keyword-focused → DEO: Entity & structure-focused.
- SEO: SERP-only → DEO: Multi-platform discoverability.
- SEO: Optimizes a few pages → DEO: Optimizes entire site.
- SEO: Manual audits → DEO: Automated crawling & signals.
- SEO: Human-written metadata → DEO: AI-suggested metadata.
- SEO: Rank-based → DEO: Visibility-based.

### How EngineO.ai Implements DEO

- Full-site crawl and signal extraction.
- DEO Score as the universal visibility metric.
- Issues Engine for clear, actionable problem detection.
- AI Optimization Workspaces — one for products, one for all content pages.
- Automation layer — daily crawling, recompute, issue updates.
- CMS-agnostic — works with Shopify, WordPress, Webflow, SaaS sites, blogs, custom stacks.

### Who DEO Is For

Lists target audiences:

- SaaS companies.
- Ecommerce brands.
- Publishers & bloggers.
- Agencies.
- Local businesses.
- Documentation-heavy sites.
- Any website with more than ~10 pages.

Positions DEO as the visibility foundation for the AI era.

### DEO FAQs

Answers:

- Is DEO meant to replace SEO? → No — it expands SEO to include AI and non-SERP discovery systems.
- Does DEO help with AI visibility? → Yes — DEO measures and improves answer-surface potential.
- Do I need technical skills? → No — EngineO.ai automates most DEO evaluation.
- Is DEO only for big websites? → No — DEO benefits any website with content meant to be found.

### Final CTA

- **Heading:** "Ready to see your DEO Score?"
- Copy: "Get your visibility analysis and AI-powered fixes in seconds."
- **CTA:** Start Free (`/signup`).

---

## 7. Navigation

- Marketing navbar (`MarketingNavbar.tsx`) includes **Shopify** and **Websites** links.
- Both vertical links are visible on desktop nav and in the mobile menu.
- Homepage remains universal; vertical-specific details live on `/shopify` and `/websites` pages.
