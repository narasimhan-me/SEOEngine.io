'use client';

import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { projectsApi, type RoleCapabilities } from '@/lib/api';
import { buildWorkQueueUrl } from '@/lib/work-queue';
import { ListControls } from '@/components/common/ListControls';
import { RowStatusChip } from '@/components/common/RowStatusChip';
import {
  resolveRowNextAction,
  buildAssetIssuesHref,
  buildReviewDraftsHref,
  type ResolvedRowNextAction,
  type NavigationContext,
} from '@/lib/list-actions-clarity';
import type { WorkQueueRecommendedActionKey } from '@/lib/work-queue';

/**
 * [ASSETS-PAGES-1] [LIST-SEARCH-FILTER-1.1] [LIST-ACTIONS-CLARITY-1] Pages Asset List
 *
 * Displays Shopify pages (/pages/*) with health status and recommended actions.
 * Decision-first UX: one health pill, one action label per row.
 * Bulk actions route to Playbooks.
 *
 * [LIST-SEARCH-FILTER-1.1] Integrated ListControls for search/filter with URL state.
 * [LIST-ACTIONS-CLARITY-1] Uses shared RowStatusChip and resolveRowNextAction.
 */

interface PageAsset {
  id: string;
  url: string;
  path: string;
  title: string | null;
  metaDescription: string | null;
  pageType: 'home' | 'collection' | 'blog' | 'static' | 'misc';
  statusCode: number | null;
  wordCount: number | null;
  scannedAt: string;
  health: 'Healthy' | 'Needs Attention' | 'Critical';
  recommendedActionKey: WorkQueueRecommendedActionKey | null;
  recommendedActionLabel: string | null;
  /** [LIST-ACTIONS-CLARITY-1] Server-derived draft pending flag */
  hasDraftPendingApply: boolean;
  /** [LIST-ACTIONS-CLARITY-1] Count of actionable issues */
  actionableNowCount: number;
}

export default function PagesAssetListPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PageAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Role capabilities state
  const [capabilities, setCapabilities] = useState<RoleCapabilities | null>(null);

  // Get filter from URL (from Work Queue click-through)
  const actionKeyFilter = searchParams.get('actionKey') as WorkQueueRecommendedActionKey | null;

  // [LIST-SEARCH-FILTER-1.1] Extract filter params from URL
  const filterQ = searchParams.get('q') || undefined;
  const filterStatus = searchParams.get('status') as 'optimized' | 'needs_attention' | undefined;
  const filterHasDraft = searchParams.get('hasDraft') === 'true' || undefined;

  // Check if any filters are active (for empty state)
  const hasActiveFilters = !!(filterQ || filterStatus || filterHasDraft);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // [LIST-SEARCH-FILTER-1.1] Fetch crawl pages with filters from URL
      const crawlPages = await projectsApi.crawlPages(projectId, {
        q: filterQ,
        status: filterStatus,
        hasDraft: filterHasDraft,
        pageType: 'static', // Only static pages (not collections)
      });

      // Transform to PageAssets with health/actions
      const pageAssets: PageAsset[] = crawlPages
        .filter((p: { pageType: string }) => p.pageType === 'static' || p.pageType === 'misc' || p.pageType === 'blog')
        .map((p: { id: string; url: string; path: string; title: string | null; metaDescription: string | null; pageType: 'home' | 'collection' | 'blog' | 'static' | 'misc'; statusCode: number | null; wordCount: number | null; scannedAt: string; hasDraftPendingApply?: boolean }) => {
          // Derive health and action from page state
          let health: 'Healthy' | 'Needs Attention' | 'Critical' = 'Healthy';
          let recommendedActionKey: WorkQueueRecommendedActionKey | null = null;
          let recommendedActionLabel: string | null = null;
          let actionableNowCount = 0;

          // Missing metadata = Critical
          if (!p.title || !p.metaDescription) {
            health = 'Critical';
            recommendedActionKey = 'FIX_MISSING_METADATA';
            recommendedActionLabel = 'Fix missing metadata';
            actionableNowCount++;
          }
          // Technical issues (4xx/5xx status) = Critical
          else if (p.statusCode && p.statusCode >= 400) {
            health = 'Critical';
            recommendedActionKey = 'RESOLVE_TECHNICAL_ISSUES';
            recommendedActionLabel = 'Resolve technical issues';
            actionableNowCount++;
          }
          // Thin content = Needs Attention
          else if (p.wordCount !== null && p.wordCount < 300) {
            health = 'Needs Attention';
            recommendedActionKey = 'OPTIMIZE_CONTENT';
            recommendedActionLabel = 'Optimize content';
            actionableNowCount++;
          }

          return {
            id: p.id,
            url: p.url,
            path: p.path,
            title: p.title,
            metaDescription: p.metaDescription,
            pageType: p.pageType,
            statusCode: p.statusCode,
            wordCount: p.wordCount,
            scannedAt: p.scannedAt,
            health,
            recommendedActionKey,
            recommendedActionLabel,
            // [LIST-ACTIONS-CLARITY-1] Include server-derived draft flag
            hasDraftPendingApply: p.hasDraftPendingApply ?? false,
            actionableNowCount,
          };
        });

      // Apply actionKey filter if present (from Work Queue click-through)
      const filtered = actionKeyFilter
        ? pageAssets.filter((p) => p.recommendedActionKey === actionKeyFilter)
        : pageAssets;

      setPages(filtered);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load pages';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, actionKeyFilter, filterQ, filterStatus, filterHasDraft]);

  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Fetch user role capabilities
  const fetchCapabilities = useCallback(async () => {
    try {
      const roleResponse = await projectsApi.getUserRole(projectId);
      setCapabilities(roleResponse.capabilities);
    } catch (err) {
      console.error('Error fetching role:', err);
      // Default to permissive if fetch fails
      setCapabilities({
        canView: true,
        canGenerateDrafts: true,
        canRequestApproval: true,
        canApprove: true,
        canApply: true,
        canModifySettings: true,
        canManageMembers: true,
        canExport: true,
      });
    }
  }, [projectId]);

  useEffect(() => {
    fetchPages();
    fetchCapabilities();
  }, [fetchPages, fetchCapabilities]);

  const handleSelectAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map((p) => p.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkFix = () => {
    // Route to Work Queue with PAGES scope filter
    router.push(buildWorkQueueUrl(projectId, {
      actionKey: 'FIX_MISSING_METADATA',
      scopeType: 'PAGES',
    }));
  };

  // [LIST-SEARCH-FILTER-1.1] Clear filters handler for empty state
  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('status');
    params.delete('hasDraft');
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Compute resolved row actions for each page
  // Uses real capabilities instead of hardcoded values
  const resolvedActionsById = useMemo(() => {
    const map = new Map<string, ResolvedRowNextAction>();

    // Build navigation context for returnTo propagation
    const currentPathWithQuery = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const navContext: NavigationContext = {
      returnTo: currentPathWithQuery,
      returnLabel: 'Pages',
    };

    for (const page of pages) {
      // For Pages, "View issues" links to Issues Engine filtered by this asset
      const openHref = buildAssetIssuesHref(projectId, 'pages', page.id, navContext);

      const resolved = resolveRowNextAction({
        assetType: 'pages',
        hasDraftPendingApply: page.hasDraftPendingApply,
        actionableNowCount: page.actionableNowCount,
        canApply: capabilities?.canApply ?? true,
        canRequestApproval: capabilities?.canRequestApproval ?? false,
        fixNextHref: null, // Pages don't have deterministic "Fix next"
        openHref,
        reviewDraftsHref: buildReviewDraftsHref(projectId, 'pages', navContext),
      });

      map.set(page.id, resolved);
    }

    return map;
  }, [pages, projectId, capabilities, pathname, searchParams]);

  const getHealthStyles = (health: string): string => {
    switch (health) {
      case 'Critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Needs Attention':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Healthy':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const criticalCount = pages.filter((p) => p.health === 'Critical').length;
  const needsAttentionCount = pages.filter((p) => p.health === 'Needs Attention').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pages.length} pages • {criticalCount} critical • {needsAttentionCount} need attention
          </p>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkFix}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Fix missing metadata ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Filter indicator (from Work Queue click-through) */}
      {actionKeyFilter && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <span>Filtered by: {actionKeyFilter.replace(/_/g, ' ').toLowerCase()}</span>
          <button
            onClick={() => router.push(`/projects/${projectId}/assets/pages`)}
            className="font-medium underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* [LIST-SEARCH-FILTER-1.1] ListControls - search and filter */}
      <ListControls
        config={{
          searchPlaceholder: 'Search by path or title...',
          enableStatusFilter: true,
          enableHasDraftFilter: true,
        }}
      />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading pages...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchPages}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Pages list */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {pages.length === 0 ? (
            hasActiveFilters ? (
              // [LIST-SEARCH-FILTER-1.1] Filtered empty state
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pages match your filters.</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
                <div className="mt-4">
                  <button
                    onClick={handleClearFilters}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            ) : (
              // Unfiltered empty state
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No pages found
              </div>
            )
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === pages.length && pages.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Health
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Path
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pages.map((page) => {
                  const resolved = resolvedActionsById.get(page.id);
                  return (
                    <tr key={page.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(page.id)}
                          onChange={() => handleSelectOne(page.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {/* [LIST-ACTIONS-CLARITY-1] Use RowStatusChip */}
                        {resolved?.chipLabel ? (
                          <RowStatusChip chipLabel={resolved.chipLabel} />
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getHealthStyles(page.health)}`}
                          >
                            {page.health}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                          {page.path}
                        </code>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900">
                        {page.title || <span className="italic text-gray-400">No title</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {/* [LIST-ACTIONS-CLARITY-1] Use resolved actions */}
                        {resolved?.primaryAction ? (
                          <Link
                            href={resolved.primaryAction.href}
                            className="font-medium text-blue-600 hover:text-blue-800"
                            data-testid="row-primary-action"
                          >
                            {resolved.primaryAction.label}
                          </Link>
                        ) : resolved?.helpText ? (
                          <span className="text-gray-500" data-testid="row-help-text">{resolved.helpText}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                        {resolved?.secondaryAction && (
                          <Link
                            href={resolved.secondaryAction.href}
                            className="ml-3 text-gray-600 hover:text-gray-800"
                            data-testid="row-secondary-action"
                          >
                            {resolved.secondaryAction.label}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
