'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

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
 * - Compact filter controls, right-aligned
 * - "Clear filters" affordance when filters are active
 *
 * State contract:
 * - No hidden memory: values are derived from URL query params
 * - Updating search/filters updates URL deterministically (router.replace)
 * - Preserves unrelated params (e.g., from=playbook_results)
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
   * Handle search input change (debounced via form submission or blur)
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
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search input - left aligned */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="list-controls-search"
          type="text"
          placeholder={config.searchPlaceholder || 'Search...'}
          defaultValue={currentQ}
          className="pl-9"
          onBlur={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchChange((e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>

      {/* Filter controls - right aligned */}
      <div className="flex gap-2 items-center">
        {config.enableStatusFilter && (
          <Select
            value={currentStatus || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger
              data-testid="list-controls-status"
              className="w-[160px]"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="optimized">Optimized</SelectItem>
              <SelectItem value="needs_attention">Needs attention</SelectItem>
            </SelectContent>
          </Select>
        )}

        {config.enableHasDraftFilter && (
          <Select
            value={currentHasDraft ? 'true' : 'all'}
            onValueChange={handleHasDraftChange}
          >
            <SelectTrigger
              data-testid="list-controls-has-draft"
              className="w-[180px]"
            >
              <SelectValue placeholder="Draft status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              <SelectItem value="true">Has draft pending</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Clear filters button - only show when filters are active */}
        {hasActiveFilters && (
          <Button
            data-testid="list-controls-clear"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
