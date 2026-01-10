'use client';

import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { projectsApi, type RoleCapabilities } from '@/lib/api';
import { ListControls } from '@/components/common/ListControls';
import { RowStatusChip } from '@/components/common/RowStatusChip';
import { ScopeBanner } from '@/components/common/ScopeBanner';
import {
  resolveRowNextAction,
  buildAssetIssuesHref,
  buildReviewDraftsHref,
  type ResolvedRowNextAction,
  type NavigationContext,
} from '@/lib/list-actions-clarity';
import type { WorkQueueRecommendedActionKey } from '@/lib/work-queue';
import { getReturnToFromCurrentUrl, getSafeReturnTo } from '@/lib/route-context';

/**
 * [ASSETS-PAGES-1] [LIST-SEARCH-FILTER-1.1] [LIST-ACTIONS-CLARITY-1] Collections Asset List
 *
 * Displays Shopify collections (/collections/*) with health status and recommended actions.
 * Decision-first UX: one health pill, one action label per row.
 * Bulk actions route to Playbooks.
 *
 * [LIST-SEARCH-FILTER-1.1] Integrated ListControls for search/filter with URL state.
 * [LIST-ACTIONS-CLARITY-1] Uses shared RowStatusChip and resolveRowNextAction.
 */

interface CollectionAsset {
  id: string;
  url: string;
  path: string;
  title: string | null;
  metaDescription: string | null;
  statusCode: number | null;
  wordCount: number | null;
  scannedAt: string;
  health: 'Healthy' | 'Needs Attention' | 'Critical';
  recommendedActionKey: WorkQueueRecommendedActionKey | null;
  recommendedActionLabel: string | null;
  /** [LIST-ACTIONS-CLARITY-1] Server-derived draft pending flag */
  hasDraftPendingApply: boolean;
  /** [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Server-derived: count of actionable issue types (canonical, from DEO issues) */
  actionableNowCount: number;
  /** [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Server-derived: true if draft is blocked (hasDraft AND viewer cannot apply) */
  blockedByApproval: boolean;
}

export default function CollectionsAssetListPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionAsset[]>([]);

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

  // [ROUTE-INTEGRITY-1] Read from context from URL
  const fromParam = searchParams.get('from');

  // [ROUTE-INTEGRITY-1] Compute returnTo for downstream navigation
  const currentPathWithQuery = useMemo(() => {
    return getReturnToFromCurrentUrl(pathname, searchParams);
  }, [pathname, searchParams]);

  // [ROUTE-INTEGRITY-1] Get validated returnTo for back navigation
  const validatedReturnTo = useMemo(() => {
    return getSafeReturnTo(searchParams, projectId);
  }, [searchParams, projectId]);

  // [ROUTE-INTEGRITY-1] Derive showingText for ScopeBanner
  const showingText = useMemo(() => {
    const parts: string[] = [];
    if (filterQ) parts.push(`Search: "${filterQ}"`);
    if (filterStatus) parts.push(`Status: ${filterStatus}`);
    if (filterHasDraft) parts.push('Has draft');
    return parts.length > 0 ? parts.join(' · ') : 'All collections';
  }, [filterQ, filterStatus, filterHasDraft]);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // [LIST-SEARCH-FILTER-1.1] Fetch crawl pages with filters from URL
      const crawlPages = await projectsApi.crawlPages(projectId, {
        q: filterQ,
        status: filterStatus,
        hasDraft: filterHasDraft,
        pageType: 'collection', // Only collections
      });

      // Transform to CollectionAssets with health/actions
      // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Use server-derived actionableNowCount and blockedByApproval
      // Health/action derivation kept for legacy display only; chip uses canonical issue counts
      const collectionAssets: CollectionAsset[] = crawlPages
        .filter((p: { pageType: string }) => p.pageType === 'collection')
        .map((p: { id: string; url: string; path: string; title: string | null; metaDescription: string | null; statusCode: number | null; wordCount: number | null; scannedAt: string; hasDraftPendingApply?: boolean; actionableNowCount?: number; blockedByApproval?: boolean }) => {
          // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Health/action derivation for legacy display only
          // RowStatusChip and resolveRowNextAction use server-derived actionableNowCount
          let health: 'Healthy' | 'Needs Attention' | 'Critical' = 'Healthy';
          let recommendedActionKey: WorkQueueRecommendedActionKey | null = null;
          let recommendedActionLabel: string | null = null;

          // Missing metadata = Critical (legacy health display only)
          if (!p.title || !p.metaDescription) {
            health = 'Critical';
            recommendedActionKey = 'FIX_MISSING_METADATA';
            recommendedActionLabel = 'Fix missing metadata';
          }
          // Technical issues (4xx/5xx status) = Critical (legacy health display only)
          else if (p.statusCode && p.statusCode >= 400) {
            health = 'Critical';
            recommendedActionKey = 'RESOLVE_TECHNICAL_ISSUES';
            recommendedActionLabel = 'Resolve technical issues';
          }
          // Thin content = Needs Attention (legacy health display only)
          else if (p.wordCount !== null && p.wordCount < 300) {
            health = 'Needs Attention';
            recommendedActionKey = 'OPTIMIZE_CONTENT';
            recommendedActionLabel = 'Optimize content';
          }

          return {
            id: p.id,
            url: p.url,
            path: p.path,
            title: p.title,
            metaDescription: p.metaDescription,
            statusCode: p.statusCode,
            wordCount: p.wordCount,
            scannedAt: p.scannedAt,
            health,
            recommendedActionKey,
            recommendedActionLabel,
            // [LIST-ACTIONS-CLARITY-1] Include server-derived draft flag
            hasDraftPendingApply: p.hasDraftPendingApply ?? false,
            // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Use server-derived canonical issue counts and blocked state
            actionableNowCount: p.actionableNowCount ?? 0,
            blockedByApproval: p.blockedByApproval ?? false,
          };
        });

      // Apply actionKey filter if present (from Work Queue click-through)
      const filtered = actionKeyFilter
        ? collectionAssets.filter((c) => c.recommendedActionKey === actionKeyFilter)
        : collectionAssets;

      setCollections(filtered);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load collections';
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
    fetchCollections();
    fetchCapabilities();
  }, [fetchCollections, fetchCapabilities]);

  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Removed bulk selection handlers (handleSelectAll, handleSelectOne, handleBulkFix)
  // Bulk actions now route through Playbooks/Work Queue directly

  // [LIST-SEARCH-FILTER-1.1] Clear filters handler for empty state
  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('status');
    params.delete('hasDraft');
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Compute resolved row actions for each collection
  // Uses real capabilities instead of hardcoded values
  const resolvedActionsById = useMemo(() => {
    const map = new Map<string, ResolvedRowNextAction>();

    // [ROUTE-INTEGRITY-1] Build navigation context for returnTo propagation with from=asset_list
    const navContext: NavigationContext = {
      returnTo: currentPathWithQuery,
      returnLabel: 'Collections',
      from: 'asset_list',
    };

    for (const collection of collections) {
      // For Collections, "View issues" links to Issues Engine filtered by this asset
      const openHref = buildAssetIssuesHref(projectId, 'collections', collection.id, navContext);

      // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Pass server-derived blockedByApproval
      const resolved = resolveRowNextAction({
        assetType: 'collections',
        hasDraftPendingApply: collection.hasDraftPendingApply,
        actionableNowCount: collection.actionableNowCount,
        blockedByApproval: collection.blockedByApproval,
        canRequestApproval: capabilities?.canRequestApproval ?? false,
        fixNextHref: null, // Collections don't have deterministic "Fix next"
        openHref,
        reviewDraftsHref: buildReviewDraftsHref(projectId, 'collections', navContext),
      });

      map.set(collection.id, resolved);
    }

    return map;
  }, [collections, projectId, capabilities, pathname, searchParams]);

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

  // Extract collection handle from path (e.g., /collections/shoes -> shoes)
  const getCollectionHandle = (path: string): string => {
    const match = path.match(/\/collections\/([^/?]+)/);
    return match ? match[1] : path;
  };

  const criticalCount = collections.filter((c) => c.health === 'Critical').length;
  const needsAttentionCount = collections.filter((c) => c.health === 'Needs Attention').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="mt-1 text-sm text-gray-500">
            {collections.length} collections • {criticalCount} critical • {needsAttentionCount} need attention
          </p>
        </div>
        {/* [LIST-ACTIONS-CLARITY-1 FIXUP-1] Removed bulk selection CTA - bulk actions route through Playbooks/Work Queue */}
      </div>

      {/* [ROUTE-INTEGRITY-1] ScopeBanner - show when from context is present */}
      <ScopeBanner
        from={fromParam}
        returnTo={validatedReturnTo || `/projects/${projectId}/assets/collections`}
        showingText={showingText}
        onClearFiltersHref={`/projects/${projectId}/assets/collections`}
      />

      {/* Filter indicator (from Work Queue click-through) */}
      {actionKeyFilter && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <span>Filtered by: {actionKeyFilter.replace(/_/g, ' ').toLowerCase()}</span>
          <button
            onClick={() => router.push(`/projects/${projectId}/assets/collections`)}
            className="font-medium underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* [LIST-SEARCH-FILTER-1.1] ListControls - search and filter */}
      <ListControls
        config={{
          searchPlaceholder: 'Search by handle or title...',
          enableStatusFilter: true,
          enableHasDraftFilter: true,
        }}
      />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading collections...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchCollections}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Collections list */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {collections.length === 0 ? (
            hasActiveFilters ? (
              // [LIST-SEARCH-FILTER-1.1] Filtered empty state
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No collections match your filters.</h3>
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
                No collections found
              </div>
            )
          ) : (
            // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Removed bulk selection checkboxes
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Health
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Handle
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
                {collections.map((collection) => {
                  const resolved = resolvedActionsById.get(collection.id);
                  return (
                    <tr key={collection.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {/* [LIST-ACTIONS-CLARITY-1] Use RowStatusChip */}
                        {resolved?.chipLabel ? (
                          <RowStatusChip chipLabel={resolved.chipLabel} />
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getHealthStyles(collection.health)}`}
                          >
                            {collection.health}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                          {getCollectionHandle(collection.path)}
                        </code>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900">
                        {collection.title || <span className="italic text-gray-400">No title</span>}
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
