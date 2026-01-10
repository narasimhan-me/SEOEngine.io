'use client';

import Link from 'next/link';
import { labelFrom, type RouteFrom } from '@/lib/route-context';

/**
 * [ROUTE-INTEGRITY-1] ScopeBanner Component
 *
 * Minimal UI showing navigation context when arriving from another surface.
 * Provides "Back" and "Clear filters" actions for deterministic navigation.
 *
 * Test hooks:
 * - data-testid="filter-context-banner" (outer, for existing Issues test compatibility)
 * - data-testid="scope-banner" (nested stable hook)
 * - data-testid="scope-banner-back"
 * - data-testid="scope-banner-clear"
 */

export interface ScopeBannerProps {
  /** Origin context (from URL) - required for banner to render */
  from: RouteFrom | string | null | undefined;
  /** Validated returnTo URL for Back navigation */
  returnTo: string;
  /** Description of what's being shown (e.g., "Filtered by pillar: Metadata") */
  showingText: string;
  /** URL for "Clear filters" action - resets to base route */
  onClearFiltersHref: string;
}

export function ScopeBanner({
  from,
  returnTo,
  showingText,
  onClearFiltersHref,
}: ScopeBannerProps) {
  // Only render when from is present
  if (!from) {
    return null;
  }

  const sourceLabel = labelFrom(from);

  return (
    <div
      data-testid="filter-context-banner"
      className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <div
        data-testid="scope-banner"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        {/* Left: Context info */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-blue-800">
            <span className="font-medium">Showing:</span> {showingText}
          </span>
          <span className="text-blue-700">
            <span className="font-medium">Source:</span> {sourceLabel}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Link
            href={returnTo}
            data-testid="scope-banner-back"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg
              className="mr-1.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </Link>
          <Link
            href={onClearFiltersHref}
            data-testid="scope-banner-clear"
            className="inline-flex items-center rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Clear filters
          </Link>
        </div>
      </div>
    </div>
  );
}
