'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function MarketingLaunchPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/projects');
    }
  }, [router]);

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:py-24 lg:px-8">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Discovery Engine Optimization (DEO) for modern brands
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              EngineO.ai — The Discovery Engine Optimization (DEO) Platform
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Optimize your brand for search engines and AI assistants using DEO — a unified
              framework combining SEO, AEO, PEO, and VEO. Track your DEO Score, manage entities,
              build answer-ready content, and improve multi-engine visibility.
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
                  <dt className="font-semibold text-foreground">Instant discovery audit</dt>
                  <dd>Scan pages, products, and entities in a few clicks.</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  🤖
                </span>
                <div>
                  <dt className="font-semibold text-foreground">AI metadata &amp; answer content</dt>
                  <dd>
                    Titles, descriptions, alt text, FAQs, and answer blocks generated for you.
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  🛒
                </span>
                <div>
                  <dt className="font-semibold text-foreground">Store &amp; product discovery</dt>
                  <dd>Sync, optimize, and push changes back to Shopify and your site.</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  🚀
                </span>
                <div>
                  <dt className="font-semibold text-foreground">Automated DEO improvements</dt>
                  <dd>Ongoing automations keep your discovery footprint improving.</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Right column: dashboard mock */}
          <div className="flex-1">
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-6 lg:max-w-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">DEO overview</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Live preview
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-primary/10 p-3">
                  <p className="text-[11px] font-medium text-primary">Store Health</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">82</p>
                  <p className="mt-1 text-[11px] text-primary/80">+17 in last 30 days</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">Products optimized</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">134</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">of 500 total</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">Issues fixed</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">312</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">titles, metas &amp; links</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Run full store audit</p>
                    <p className="text-[11px] text-muted-foreground">Scan products, pages &amp; blog posts.</p>
                  </div>
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Scan now
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Apply AI metadata</p>
                    <p className="text-[11px] text-muted-foreground">
                      Approve &amp; publish AI titles in bulk.
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Review
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground">
                Mock data shown. Real dashboards appear after connecting your store.
              </p>
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
            From connection to ongoing Discovery Engine Optimization in four simple steps.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              {
                title: 'Connect your site & store',
                desc: 'Connect Shopify and your main site in a few clicks. No theme edits required.',
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
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{item.desc}</p>
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

