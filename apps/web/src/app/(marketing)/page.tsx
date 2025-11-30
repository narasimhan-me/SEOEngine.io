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
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-blue-50/40 to-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:py-24 lg:px-8">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              AI SEO for Shopify &amp; eCommerce
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              AI-powered SEO for Shopify &amp; eCommerce — on autopilot.
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              SEOEngine.io scans your store, fixes technical issues, writes
              metadata, optimizes products, and tracks performance — so you can
              focus on growth, not spreadsheets.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Start free — no credit card
              </Link>
              <Link
                href="/features"
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                Learn how it works &rarr;
              </Link>
            </div>

            <dl className="mt-6 grid gap-4 text-xs text-slate-600 sm:grid-cols-2 sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-600">
                  🔍
                </span>
                <div>
                  <dt className="font-semibold text-slate-800">Instant SEO audit</dt>
                  <dd>Scan pages &amp; products in a few clicks.</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-600">
                  🤖
                </span>
                <div>
                  <dt className="font-semibold text-slate-800">AI metadata optimization</dt>
                  <dd>Titles, descriptions &amp; alt text generated for you.</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-600">
                  🛒
                </span>
                <div>
                  <dt className="font-semibold text-slate-800">Shopify product SEO</dt>
                  <dd>Sync, optimize, and push changes back to Shopify.</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-600">
                  🚀
                </span>
                <div>
                  <dt className="font-semibold text-slate-800">Automated improvements</dt>
                  <dd>Weekly automation to keep SEO moving.</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Right column: dashboard mock */}
          <div className="flex-1">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:max-w-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">SEO overview</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Live preview
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-[11px] font-medium text-blue-700">SEO health</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">82</p>
                  <p className="mt-1 text-[11px] text-blue-800">+17 in last 30 days</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-700">Products optimized</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">134</p>
                  <p className="mt-1 text-[11px] text-slate-500">of 500 total</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-700">Issues fixed</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">312</p>
                  <p className="mt-1 text-[11px] text-slate-500">titles, metas &amp; links</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Run full store audit</p>
                    <p className="text-[11px] text-slate-500">Scan products, pages &amp; blog posts.</p>
                  </div>
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Scan now
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Apply AI metadata</p>
                    <p className="text-[11px] text-slate-500">Approve &amp; publish AI titles in bulk.</p>
                  </div>
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                    Review
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-slate-500">
                Mock data shown. Real dashboards appear after connecting your store.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Built for modern eCommerce teams &amp; Shopify merchants
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-6">
            {['Shop brands', 'Agencies', 'DTC founders'].map((label) => (
              <div
                key={label}
                className="flex h-10 w-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-400"
              >
                {label}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Real customer logos &amp; stories coming soon — join as an early adopter.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            How SEOEngine.io works
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            From connection to automation in four simple steps.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              {
                title: 'Connect your store',
                desc: 'One-click Shopify integration. No theme edits required.',
                step: 'Step 1',
              },
              {
                title: 'AI scans everything',
                desc: 'Products, pages, metadata, speed & more are analyzed.',
                step: 'Step 2',
              },
              {
                title: 'Auto-optimize',
                desc: 'Fix issues, generate metadata, alt text, schema & more.',
                step: 'Step 3',
              },
              {
                title: 'Grow & track',
                desc: 'Monitor SEO health, rankings, and improvements over time.',
                step: 'Step 4',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-xs text-slate-600">{item.desc}</p>
                <span className="absolute right-4 top-4 text-xs font-semibold text-slate-300">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core features overview */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Everything you need to automate SEO — without a full team.
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                AI automation for technical SEO, content, products, and monitoring in one workspace.
              </p>
            </div>
            <Link
              href="/features"
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              View all features &rarr;
            </Link>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">AI SEO Automation</h3>
              <p className="mt-2 text-xs text-slate-600">
                Detect issues, generate metadata, and apply fixes in bulk.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li>• Fix missing titles, meta descriptions &amp; H1s</li>
                <li>• Auto-generate alt tags &amp; optimize images</li>
                <li>• Detect broken links &amp; structure schema</li>
                <li>• Internal linking suggestions for key pages</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Shopify Product Optimization</h3>
              <p className="mt-2 text-xs text-slate-600">
                Sync products, optimize metadata, and push changes back to Shopify.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li>• Product &amp; variant sync</li>
                <li>• AI-written product titles &amp; descriptions</li>
                <li>• Collection page &amp; schema automation</li>
                <li>• Auto-apply approved SEO updates</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Content Intelligence + AI Writer</h3>
              <p className="mt-2 text-xs text-slate-600">
                Plan, write, and optimize content for search with your brand voice.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li>• Keyword research &amp; clustering</li>
                <li>• AI blog &amp; landing page generation</li>
                <li>• Product description enhancer</li>
                <li>• Brand tone &amp; style learning</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Performance &amp; Monitoring</h3>
              <p className="mt-2 text-xs text-slate-600">
                Track rankings, traffic, and SEO health in one place.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li>• SEO health score &amp; issue trends</li>
                <li>• Rank tracking &amp; Search Console integration</li>
                <li>• Crawl health &amp; speed insights</li>
                <li>• Weekly email reports &amp; summaries</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Early-adopter testimonials placeholder */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Help shape the future of automated SEO.
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            We&apos;re onboarding early adopters now. Real case studies and numbers will be published soon.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              '"Beta feedback coming soon — reserve your spot as an early adopter."',
              '"Designed to replace multiple SEO tools with one AI-powered workspace."',
              '"Join now and influence the roadmap for Shopify & eCommerce SEO automation."',
            ].map((quote, i) => (
              <figure
                key={i}
                className="flex flex-col justify-between rounded-2xl border border-dashed border-slate-200 bg-white p-4"
              >
                <p className="text-xs text-slate-700">{quote}</p>
                <figcaption className="mt-4 text-[11px] text-slate-500">
                  Early Adopter Program
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-500">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center text-white sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to put your SEO on autopilot?
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Connect your store, run your first audit, and generate AI metadata in minutes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
            >
              Start free today
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-blue-100 hover:text-white"
            >
              View pricing &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
