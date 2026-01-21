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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="text-sm font-semibold tracking-tight">
            <span className="rounded bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
              EngineO.ai
            </span>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Coming soon
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-16">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Discovery Engine Optimization (DEO)
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              The DEO platform for Shopify brands and modern teams.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              EngineO.ai helps you optimize products, pages, and entities for
              both search engines and AI assistants—so customers can actually
              find what you sell, wherever they&apos;re searching.
            </p>
          </div>

          <div className="grid gap-4 text-sm text-foreground sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <p className="text-xs font-semibold text-foreground">
                Unified DEO score
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                One score across SEO, AEO, PEO, and VEO to track how
                discoverable your brand really is.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <p className="text-xs font-semibold text-foreground">
                Shopify-native workflows
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Sync your catalog, audit products in bulk, and push optimized
                metadata back in a few clicks.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/60 p-4">
              <p className="text-xs font-semibold text-foreground">
                AI answer-ready content
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Generate titles, descriptions, FAQs, and answer blocks that are
                ready for search and AI surfaces.
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <p className="text-xs font-medium text-foreground">
              Be the first to get access when we launch.
            </p>
            {submitted ? (
              <p className="text-xs text-primary">
                Thanks, you&apos;re on the early access list. We&apos;ll be in
                touch before public launch.
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
                  className="h-10 flex-1 rounded-md border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Join early access
                </button>
              </form>
            )}
            <p className="text-[11px] text-muted-foreground">
              No spam. We&apos;ll only email you about the EngineO.ai beta and
              DEO launch timeline.
            </p>
          </section>

          <footer className="mt-4 border-t border-border pt-4 text-[11px] text-muted-foreground">
            Built for Shopify brands, agencies, and modern eCommerce teams
            preparing for the era of discovery engines.
          </footer>
        </div>
      </main>
    </div>
  );
}
