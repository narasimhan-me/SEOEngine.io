'use client';

import Link from 'next/link';
import { labelFrom, type RouteFrom } from '@/lib/route-context';
import type { ScopeChip } from '@/lib/scope-normalization';

/**
 * [ROUTE-INTEGRITY-1] [SCOPE-CLARITY-1] ScopeBanner Component
 *
 * Minimal UI showing navigation context when arriving from another surface.
 * Provides "Back" and "Clear filters" actions for deterministic navigation.
 *
 * [SCOPE-CLARITY-1] Enhanced with:
 * - chips: Ordered scope chips for explicit scope visibility
 * - wasAdjusted: Show note when conflicting scope params were normalized
 *
 * Test hooks:
 * - data-testid="filter-context-banner" (outer, for existing Issues test compatibility)
 * - data-testid="scope-banner" (nested stable hook)
 * - data-testid="scope-banner-back"
 * - data-testid="scope-banner-clear"
 * - data-testid="scope-chips" (chips container)
 * - data-testid="scope-chip" + data-scope-chip-type="{type}" (each chip)
 * - data-testid="scope-banner-adjusted-note" (adjusted note)
 */

export interface ScopeBannerProps {
  /** Origin context (from URL) - required for banner to render */
  from: RouteFrom | string | null | undefined;
  /** Validated returnTo URL for Back navigation */
  returnTo: string;
  /** Description of what's being shown (fallback if chips not provided) */
  showingText: string;
  /** URL for "Clear filters" action - resets to base route */
  onClearFiltersHref: string;
  /** [SCOPE-CLARITY-1] Ordered scope chips for explicit scope display */
  chips?: ScopeChip[];
  /** [SCOPE-CLARITY-1] True if scope was adjusted during normalization */
  wasAdjusted?: boolean;
}

export function ScopeBanner({
  from,
  returnTo,
  showingText,
  onClearFiltersHref,
  chips,
  wasAdjusted,
}: ScopeBannerProps) {
  // Only render when from is present
  if (!from) {
    return null;
  }

  const sourceLabel = labelFrom(from);

  // Determine what to show: chips if provided, else showingText as single chip
  const displayChips: ScopeChip[] =
    chips && chips.length > 0
      ? chips
      : [{ type: 'pillar' as const, label: showingText }];

  return (
    <div
      data-testid="filter-context-banner"
      className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <div
        data-testid="scope-banner"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        {/* Left: Context info with chips */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-800">Showing:</span>
            {/* [SCOPE-CLARITY-1] Scope chips */}
            <div
              data-testid="scope-chips"
              className="flex flex-wrap items-center gap-2"
            >
              {displayChips.map((chip, index) => (
                <span
                  key={`${chip.type}-${index}`}
                  data-testid="scope-chip"
                  data-scope-chip-type={chip.type}
                  className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 border border-blue-200"
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
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

      {/* [SCOPE-CLARITY-1] Adjusted note when scope was normalized */}
      {wasAdjusted && (
        <div
          data-testid="scope-banner-adjusted-note"
          className="mt-2 text-xs text-blue-600"
        >
          Some filters were adjusted to match the selected scope.
        </div>
      )}
    </div>
  );
}
