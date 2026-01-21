import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Product</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href="/features" className="hover:text-foreground">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground">
                  Pricing
                </Link>
              </li>
              <li>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Shopify-focused
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Company</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
              <li>
                <span className="cursor-default text-muted-foreground/60">
                  Careers (coming soon)
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Support</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <a
                  href="mailto:support@engineo.ai"
                  className="hover:text-foreground"
                >
                  support@engineo.ai
                </a>
              </li>
              <li>
                <span className="cursor-default text-muted-foreground/80">
                  Typical response under 24 hours
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <span className="cursor-default text-muted-foreground/60">
                  Terms (coming soon)
                </span>
              </li>
              <li>
                <span className="cursor-default text-muted-foreground/60">
                  Privacy (coming soon)
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} EngineO.ai. All rights reserved.
          </p>
          <p className="text-[11px]">
            Built for modern eCommerce teams &amp; Shopify merchants.
          </p>
        </div>
      </div>
    </footer>
  );
}
