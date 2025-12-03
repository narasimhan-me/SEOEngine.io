'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function ComingSoonPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/projects');
    }
  }, [router]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: wire this to a real waitlist endpoint
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="text-sm font-semibold tracking-tight">
            <span className="rounded bg-slate-900 px-2 py-1 text-xs font-mono text-slate-300">
              EngineO.ai
            </span>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
            Coming soon
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-16">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300/80">
              Discovery Engine Optimization (DEO)
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              The DEO platform for Shopify brands and modern teams.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300">
              EngineO.ai helps you optimize products, pages, and entities for both search engines
              and AI assistants—so customers can actually find what you sell, wherever they&apos;re
              searching.
            </p>
          </div>

          <div className="grid gap-4 text-sm text-slate-200 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-slate-300">Unified DEO score</p>
              <p className="mt-2 text-xs text-slate-400">
                One score across SEO, AEO, PEO, and VEO to track how discoverable your brand really
                is.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-slate-300">Shopify-native workflows</p>
              <p className="mt-2 text-xs text-slate-400">
                Sync your catalog, audit products in bulk, and push optimized metadata back in a few
                clicks.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-slate-300">AI answer-ready content</p>
              <p className="mt-2 text-xs text-slate-400">
                Generate titles, descriptions, FAQs, and answer blocks that are ready for search and
                AI surfaces.
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <p className="text-xs font-medium text-slate-200">
              Be the first to get access when we launch.
            </p>
            {submitted ? (
              <p className="text-xs text-emerald-300">
                Thanks, you&apos;re on the early access list. We&apos;ll be in touch before public
                launch.
              </p>
            ) : (
              <form
                onSubmit={onSubmit}
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <input
                  type="email"
                  required
                  placeholder="you@brand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <button
                  type="submit"
                  className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Join early access
                </button>
              </form>
            )}
            <p className="text-[11px] text-slate-500">
              No spam. We&apos;ll only email you about the EngineO.ai beta and DEO launch timeline.
            </p>
          </section>

          <footer className="mt-4 border-t border-slate-900 pt-4 text-[11px] text-slate-500">
            Built for Shopify brands, agencies, and modern eCommerce teams preparing for the era of
            discovery engines.
          </footer>
        </div>
      </main>
    </div>
  );
}

