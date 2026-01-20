'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function MarketingHomePage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/projects');
    }
  }, [router]);

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:py-24 lg:px-8">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Discovery Engine Optimization (DEO) for modern brands
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Optimize any website for search & AI discovery.
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              EngineO.ai is the Discovery Engine Optimization (DEO) platform
              that unifies SEO, AEO, PEO, and VEO so any site — ecommerce, SaaS,
              content, or blog — can be optimized for search results and AI
              answers from one place.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Start free — no credit card
              </Link>
              <Link
                href="/features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Learn how EngineO.ai works &rarr;
              </Link>
            </div>

            <dl className="mt-6 grid gap-4 text-xs text-muted-foreground sm:grid-cols-2 sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  🔍
                </span>
                <div>
                  <dt className="font-semibold text-foreground">
                    Instant discovery audit
                  </dt>
                  <dd>Scan pages, products, and entities in a few clicks.</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  🤖
                </span>
                <div>
                  <dt className="font-semibold text-foreground">
                    AI metadata &amp; answer content
                  </dt>
                  <dd>
                    Titles, descriptions, alt text, FAQs, and answer blocks
                    generated for you.
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  🛒
                </span>
                <div>
                  <dt className="font-semibold text-foreground">
                    Store, site &amp; content discovery
                  </dt>
                  <dd>
                    Sync, optimize, and push changes back to your storefronts,
                    sites, and content — across ecommerce, SaaS, and media.
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  🚀
                </span>
                <div>
                  <dt className="font-semibold text-foreground">
                    Automated DEO improvements
                  </dt>
                  <dd>
                    Ongoing automations keep your discovery footprint improving.
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Right column: dashboard mock */}
          <div className="flex-1">
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-6 lg:max-w-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  DEO Summary
                </h3>
                <span className="rounded-full bg-signal/10 px-2 py-0.5 text-xs font-medium text-signal">
                  Live preview
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-primary/10 p-3">
                  <p className="text-[11px] font-medium text-primary">
                    Store Health
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    82
                  </p>
                  <p className="mt-1 text-[11px] text-primary/80">
                    +17 in last 30 days
                  </p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Products optimized
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    134
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    of 500 total
                  </p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Issues fixed
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    312
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    titles, metas &amp; links
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Run full store audit
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Scan products, pages &amp; blog posts.
                    </p>
                  </div>
                  <span className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Scan now
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Apply AI metadata
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Approve &amp; publish AI titles in bulk.
                    </p>
                  </div>
                  <span className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Review
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground">
                Mock data shown. Real dashboards appear after connecting your
                sites and data sources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DEO components */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            What DEO optimizes
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            EngineO.ai looks at your discovery footprint across four pillars so
            you can see where to improve first.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-border bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground">Content</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Page copy, product descriptions, and answer-ready content that
                determine how well you explain what you do.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Entities
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Brands, products, services, and topics that AI assistants and
                search engines use to understand your business.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Technical
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Crawl health, indexability, and on-page structure that determine
                whether you&apos;re even eligible to show up.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Visibility
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                How often you appear across search results, answer boxes, AI
                assistants, and other discovery surfaces.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Issues Engine */}
      <section className="border-b border-border bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Issues Engine: see what to fix first
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            EngineO.ai turns crawls, DEO signals, and product data into an
            actionable Issues Engine so you always know where to focus.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Metadata &amp; thin content
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Missing titles and descriptions, short product copy, and weak
                landing pages surfaced in one place — with counts and examples.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Crawl, indexability &amp; answer gaps
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Broken pages, HTTP errors, missing H1s, and weak answer surfaces
                flagged before they hurt search and AI visibility.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Prioritized, not overwhelming
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Issues are grouped and prioritized so you can fix a handful of
                high-impact problems instead of wading through endless audits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Optimization Workspaces */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Optimization workspaces you can actually live in
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Instead of generic forms, EngineO.ai gives you dedicated workspaces
            for each surface that matters.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Product Optimization Workspace
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                See DEO signals, issues, and AI suggestions for each product in
                one place. Approve titles and descriptions, then push updates
                back to your storefront.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Content Optimization Workspace
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Optimize landing pages, blog posts, docs, and static pages with
                AI metadata, DEO insights, and thin-content checks tailored to
                each URL.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="border-b border-border bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Works with the stack you already have
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            EngineO.ai is designed to sit above your existing ecommerce, CMS,
            and web stack — not replace it.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Ecommerce
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Online stores running on modern platforms — from Shopify and
                WooCommerce to headless storefronts — can plug into DEO scoring
                and product workspaces.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                CMS &amp; marketing sites
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Blogs, docs, and marketing pages powered by WordPress, Webflow,
                headless CMSs, or custom Next.js apps get the same DEO audits
                and content workspaces.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Headless &amp; custom
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Bring your own APIs, data sources, and multi-brand sites.
                EngineO.ai focuses on crawl results and entities, not a single
                platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for + CTA */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Who EngineO.ai is for
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                EngineO.ai is built for teams who need to keep multiple surfaces
                discoverable without adding headcount.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Ecommerce &amp; retail brands
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Optimize products, collections, and content to win discovery
                    across search, marketplaces, and AI assistants.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    SaaS &amp; B2B teams
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Make docs, feature pages, and solution content easier to
                    find for both humans and AI copilots.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Publishers &amp; media
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Keep high-value content, hubs, and evergreen articles tuned
                    for search and answer surfaces.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Agencies &amp; partners
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Standardize DEO audits, workspaces, and reporting across
                    multiple clients without building your own tooling.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-2xl border border-border bg-muted p-6">
              <h3 className="text-lg font-semibold text-foreground">
                Ready to make your brand discoverable everywhere?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Start with a single project, connect your sites, and see your
                DEO issues, workspaces, and scores in one place — in under an
                hour.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Get started with EngineO.ai
                </Link>
                <Link
                  href="/contact"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Talk to the founder &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            How EngineO.ai works
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            From connection to ongoing Discovery Engine Optimization in four
            simple steps.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              {
                title: 'Connect your site & store',
                desc: 'Connect your store, CMS, or website in a few clicks. No theme edits required.',
                step: 'Step 1',
              },
              {
                title: 'Run a DEO discovery scan',
                desc: 'Pages, products, entities, and metadata are analyzed for search and AI visibility.',
                step: 'Step 2',
              },
              {
                title: 'Apply AI-powered fixes',
                desc: 'Generate and approve metadata, FAQs, schema, and answer-ready content in bulk.',
                step: 'Step 3',
              },
              {
                title: 'Monitor visibility & improve',
                desc: 'Track your DEO score and keep your discovery footprint improving over time.',
                step: 'Step 4',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="relative rounded-2xl border border-border bg-background p-4 shadow-sm"
              >
                <div className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.desc}
                </p>
                <span className="absolute right-4 top-4 text-xs font-semibold text-muted-foreground/30">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
