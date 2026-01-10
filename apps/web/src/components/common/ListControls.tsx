'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * [LIST-SEARCH-FILTER-1] Configuration for ListControls component
 */
export interface ListControlsConfig {
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Enable status filter (optimized/needs_attention) */
  enableStatusFilter?: boolean;
  /** Enable has-draft filter */
  enableHasDraftFilter?: boolean;
}

/**
 * [LIST-SEARCH-FILTER-1] Props for ListControls component
 */
export interface ListControlsProps {
  config: ListControlsConfig;
}

/**
 * [LIST-SEARCH-FILTER-1] Reusable list controls component
 *
 * UX contract:
 * - Inline search input, left-aligned, above the list
 * - Compact filter controls, right-aligned (sm:justify-between layout)
 * - "Clear filters" affordance when filters are active
 *
 * State contract:
 * - No hidden memory: values are derived from URL query params
 * - Updating search/filters updates URL deterministically (router.replace)
 * - Preserves unrelated params (e.g., from=playbook_results)
 * - Search input uses key={currentQ} to force remount when URL param clears
 *
 * Stable test selectors:
 * - data-testid="list-controls-search"
 * - data-testid="list-controls-status"
 * - data-testid="list-controls-has-draft"
 * - data-testid="list-controls-clear"
 */
export function ListControls({ config }: ListControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive current values from URL
  const currentQ = searchParams.get('q') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentHasDraft = searchParams.get('hasDraft') === 'true';

  // Check if any filters are active
  const hasActiveFilters = !!(currentQ || currentStatus || currentHasDraft);

  /**
   * Update URL with new params while preserving unrelated ones
   */
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  /**
   * Handle search input change (on Enter or blur)
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      updateUrl({ q: value || null });
    },
    [updateUrl],
  );

  /**
   * Handle status filter change
   */
  const handleStatusChange = useCallback(
    (value: string) => {
      updateUrl({ status: value === 'all' ? null : value });
    },
    [updateUrl],
  );

  /**
   * Handle has-draft filter change
   */
  const handleHasDraftChange = useCallback(
    (value: string) => {
      updateUrl({ hasDraft: value === 'true' ? 'true' : null });
    },
    [updateUrl],
  );

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    updateUrl({ q: null, status: null, hasDraft: null });
  }, [updateUrl]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between mb-4">
      {/* Search input - left aligned, bounded width */}
      <div className="relative w-full sm:max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {/* key={currentQ} forces remount when URL param changes, clearing stale input value */}
        <input
          key={currentQ}
          data-testid="list-controls-search"
          type="text"
          placeholder={config.searchPlaceholder || 'Search...'}
          defaultValue={currentQ}
          className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onBlur={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchChange((e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>

      {/* Filter controls - right aligned on desktop */}
      <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
        {config.enableStatusFilter && (
          <select
            data-testid="list-controls-status"
            value={currentStatus || 'all'}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="optimized">Optimized</option>
            <option value="needs_attention">Needs attention</option>
          </select>
        )}

        {config.enableHasDraftFilter && (
          <select
            data-testid="list-controls-has-draft"
            value={currentHasDraft ? 'true' : 'all'}
            onChange={(e) => handleHasDraftChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All products</option>
            <option value="true">Has draft pending</option>
          </select>
        )}

        {/* Clear filters button - only show when filters are active */}
        {hasActiveFilters && (
          <button
            data-testid="list-controls-clear"
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center rounded-md px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <svg
              className="h-4 w-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
