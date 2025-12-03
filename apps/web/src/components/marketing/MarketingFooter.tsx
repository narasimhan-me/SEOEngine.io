'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MarketingFooter() {
  const pathname = usePathname();

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Product</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>
                <Link href="/features" className="hover:text-slate-900">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-slate-900">
                  Pricing
                </Link>
              </li>
              <li>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Shopify-focused
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Company</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>
                <Link href="/contact" className="hover:text-slate-900">
                  Contact
                </Link>
              </li>
              <li>
                <span className="cursor-default text-slate-400">
                  Careers (coming soon)
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Support</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>
                <a
                  href="mailto:support@engineo.ai"
                  className="hover:text-slate-900"
                >
                  support@engineo.ai
                </a>
              </li>
              <li>
                <span className="cursor-default text-slate-500">
                  Typical response under 24 hours
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Legal</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>
                <span className="cursor-default text-slate-400">
                  Terms (coming soon)
                </span>
              </li>
              <li>
                <span className="cursor-default text-slate-400">
                  Privacy (coming soon)
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} EngineO.ai. All rights reserved.</p>
          <p className="text-[11px]">
            Built for modern eCommerce teams &amp; Shopify merchants.
          </p>
        </div>
      </div>
    </footer>
  );
}
