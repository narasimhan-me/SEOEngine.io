'use client';

import {
  useParams,
  useSearchParams,
  useRouter,
  usePathname,
} from 'next/navigation';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { projectsApi, shopifyApi, type RoleCapabilities } from '@/lib/api';
import { ListControls } from '@/components/common/ListControls';
import { RowStatusChip } from '@/components/common/RowStatusChip';
import { ScopeBanner } from '@/components/common/ScopeBanner';
import { EmptyState } from '@/components/common/EmptyState';
import { EmptyStatePresets } from '@/lib/empty-state-contract';
import { ShopifyPermissionNotice } from '@/components/shopify/ShopifyPermissionNotice';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';
import {
  resolveRowNextAction,
  buildAssetIssuesHref,
  buildAssetWorkspaceHref,
  buildAssetDraftsTabHref,
  type ResolvedRowNextAction,
  type NavigationContext,
} from '@/lib/list-actions-clarity';
import type { WorkQueueRecommendedActionKey } from '@/lib/work-queue';
import {
  getReturnToFromCurrentUrl,
  getSafeReturnTo,
} from '@/lib/route-context';
import { getToken } from '@/lib/auth';
// [SCOPE-CLARITY-1] Import scope normalization utilities
import {
  normalizeScopeParams,
  buildClearFiltersHref,
} from '@/lib/scope-normalization';

/**
 * [ASSETS-PAGES-1] [LIST-SEARCH-FILTER-1.1] [LIST-ACTIONS-CLARITY-1] Pages Asset List
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4] Migrated to canonical DataTable.
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
  /** [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Server-derived: count of actionable issue types (canonical, from DEO issues) */
  actionableNowCount: number;
  /** [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Server-derived: true if draft is blocked (hasDraft AND viewer cannot apply) */
  blockedByApproval: boolean;
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

  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Role capabilities state
  const [capabilities, setCapabilities] = useState<RoleCapabilities | null>(
    null
  );

  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Sync status state
  const [syncStatus, setSyncStatus] = useState<{
    lastPagesSyncAt: string | null;
    shopifyConnected: boolean;
  }>({ lastPagesSyncAt: null, shopifyConnected: false });
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [scopeStatus, setScopeStatus] = useState<{
    requiredScopes: string[];
    grantedScopes: string[];
    missingScopes: string[];
  } | null>(null);
  const autoSyncAfterReconnectRef = useRef(false);

  // Get filter from URL (from Work Queue click-through)
  const actionKeyFilter = searchParams.get(
    'actionKey'
  ) as WorkQueueRecommendedActionKey | null;

  // [LIST-SEARCH-FILTER-1.1] Extract filter params from URL
  const filterQ = searchParams.get('q') || undefined;
  const filterStatus = searchParams.get('status') as
    | 'optimized'
    | 'needs_attention'
    | undefined;
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

  // [SCOPE-CLARITY-1] Normalize scope params using canonical normalization
  const normalizedScopeResult = useMemo(() => {
    return normalizeScopeParams(searchParams);
  }, [searchParams]);

  // [ROUTE-INTEGRITY-1] Derive showingText for ScopeBanner
  const showingText = useMemo(() => {
    const parts: string[] = [];
    if (filterQ) parts.push(`Search: "${filterQ}"`);
    if (filterStatus) parts.push(`Status: ${filterStatus}`);
    if (filterHasDraft) parts.push('Has draft');
    return parts.length > 0 ? parts.join(' · ') : 'All pages';
  }, [filterQ, filterStatus, filterHasDraft]);

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
      // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Use server-derived actionableNowCount and blockedByApproval
      // Health/action derivation kept for legacy display only; chip uses canonical issue counts
      const pageAssets: PageAsset[] = crawlPages
        .filter(
          (p: { pageType: string }) =>
            p.pageType === 'static' ||
            p.pageType === 'misc' ||
            p.pageType === 'blog'
        )
        .map(
          (p: {
            id: string;
            url: string;
            path: string;
            title: string | null;
            metaDescription: string | null;
            pageType: 'home' | 'collection' | 'blog' | 'static' | 'misc';
            statusCode: number | null;
            wordCount: number | null;
            scannedAt: string;
            hasDraftPendingApply?: boolean;
            actionableNowCount?: number;
            blockedByApproval?: boolean;
          }) => {
            // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Health/action derivation for legacy display only
            // RowStatusChip and resolveRowNextAction use server-derived actionableNowCount
            let health: 'Healthy' | 'Needs Attention' | 'Critical' = 'Healthy';
            let recommendedActionKey: WorkQueueRecommendedActionKey | null =
              null;
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
              pageType: p.pageType,
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
          }
        );

      // Apply actionKey filter if present (from Work Queue click-through)
      const filtered = actionKeyFilter
        ? pageAssets.filter((p) => p.recommendedActionKey === actionKeyFilter)
        : pageAssets;

      setPages(filtered);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load pages';
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

  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const integrationStatus = await projectsApi.integrationStatus(projectId);
      const shopifyConnected = integrationStatus?.shopify?.connected ?? false;

      if (shopifyConnected) {
        const status = await shopifyApi.getSyncStatus(projectId);
        const scope = await shopifyApi.getMissingScopes(
          projectId,
          'pages_sync'
        );
        setSyncStatus({
          lastPagesSyncAt: status.lastPagesSyncAt,
          shopifyConnected: true,
        });
        setScopeStatus({
          requiredScopes: scope.requiredScopes ?? [],
          grantedScopes: scope.grantedScopes ?? [],
          missingScopes: scope.missingScopes ?? [],
        });
      } else {
        setSyncStatus({ lastPagesSyncAt: null, shopifyConnected: false });
        setScopeStatus(null);
      }
    } catch (err) {
      console.error('Error fetching sync status:', err);
      setSyncStatus({ lastPagesSyncAt: null, shopifyConnected: false });
      setScopeStatus(null);
    }
  }, [projectId]);

  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Sync pages handler
  const handleSyncPages = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await shopifyApi.syncPages(projectId);
      await fetchSyncStatus();
      await fetchPages();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setSyncError(message);
      await fetchSyncStatus();
    } finally {
      setSyncing(false);
    }
  }, [projectId, fetchSyncStatus, fetchPages]);

  useEffect(() => {
    fetchPages();
    fetchCapabilities();
    fetchSyncStatus();
  }, [fetchPages, fetchCapabilities, fetchSyncStatus]);

  const hasMissingScopes = (scopeStatus?.missingScopes?.length ?? 0) > 0;

  const handleReconnectShopify = useCallback(async () => {
    console.log('[Reconnect] handleReconnectShopify called');
    setReconnectError(null);
    setReconnecting(true);
    if (!projectId) {
      console.log('[Reconnect] No projectId');
      setReconnectError(
        "We couldn't start Shopify reconnection because your project ID is missing. Please refresh and try again."
      );
      setReconnecting(false);
      return;
    }
    const token = getToken();
    if (!token) {
      console.log('[Reconnect] No token');
      setReconnectError(
        "We couldn't start Shopify reconnection because your session token is missing. Please sign in again, then retry."
      );
      setReconnecting(false);
      return;
    }
    try {
      console.log('[Reconnect] Calling getReconnectUrl...');
      const result = await shopifyApi.getReconnectUrl(
        projectId,
        'pages_sync',
        currentPathWithQuery
      );
      console.log('[Reconnect] getReconnectUrl result:', result);
      const url =
        result && typeof (result as any).url === 'string'
          ? (result as any).url
          : null;
      if (!url) {
        console.log('[Reconnect] No URL in result');
        setReconnectError(
          "We couldn't start Shopify reconnection. Please refresh and try again."
        );
        setReconnecting(false);
        return;
      }
      console.log('[Reconnect] Redirecting to:', url);
      window.location.href = url;
    } catch (err: unknown) {
      console.error('[Reconnect] Error:', err);
      // Prevent fetchWithAuth's automatic redirect to login for 403 errors
      // A 403 here means the user lacks OWNER permission, not that they're unauthenticated
      const message =
        err instanceof Error && err.message
          ? err.message
          : "We couldn't start Shopify reconnection. Please sign in again, then retry.";
      setReconnectError(message);
      setReconnecting(false);
    }
  }, [projectId, currentPathWithQuery]);

  const handleSignInAgain = useCallback(() => {
    router.push(`/login?next=${encodeURIComponent(currentPathWithQuery)}`);
  }, [router, currentPathWithQuery]);

  // [SHOPIFY-SCOPE-RECONSENT-UX-1] After reconnect return, auto-attempt the previously blocked sync.
  useEffect(() => {
    if (autoSyncAfterReconnectRef.current) return;
    if (searchParams.get('shopify') !== 'reconnected') return;
    if (searchParams.get('reconnect') !== 'pages_sync') return;
    if (!syncStatus.shopifyConnected) return;
    if (hasMissingScopes) return;
    if (!(capabilities?.canModifySettings ?? false)) return;
    autoSyncAfterReconnectRef.current = true;
    handleSyncPages().finally(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('shopify');
      params.delete('reconnect');
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    });
  }, [
    searchParams,
    syncStatus.shopifyConnected,
    hasMissingScopes,
    capabilities,
    handleSyncPages,
    router,
    pathname,
  ]);

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

  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Compute resolved row actions for each page
  // Uses real capabilities instead of hardcoded values
  const resolvedActionsById = useMemo(() => {
    const map = new Map<string, ResolvedRowNextAction>();

    // [ROUTE-INTEGRITY-1] Build navigation context for returnTo propagation with from=asset_list
    const navContext: NavigationContext = {
      returnTo: currentPathWithQuery,
      returnLabel: 'Pages',
      from: 'asset_list',
    };

    for (const page of pages) {
      // [DRAFT-LIST-PARITY-1] Build separate hrefs for asset detail and Issues Engine
      const openHref = buildAssetWorkspaceHref(
        projectId,
        'pages',
        page.id,
        navContext
      );
      const issuesHref = buildAssetIssuesHref(
        projectId,
        'pages',
        page.id,
        navContext
      );

      // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Pass server-derived blockedByApproval
      // [DRAFT-LIST-PARITY-1] Pass issuesHref for "View issues" + "Open" dual actions
      // [DRAFT-LIST-PARITY-1] reviewDraftsHref now routes to asset detail Drafts tab (NOT Playbooks)
      const resolved = resolveRowNextAction({
        assetType: 'pages',
        hasDraftPendingApply: page.hasDraftPendingApply,
        actionableNowCount: page.actionableNowCount,
        blockedByApproval: page.blockedByApproval,
        canRequestApproval: capabilities?.canRequestApproval ?? false,
        fixNextHref: null, // Pages don't have deterministic "Fix next"
        openHref,
        issuesHref,
        reviewDraftsHref: buildAssetDraftsTabHref(
          projectId,
          'pages',
          page.id,
          navContext
        ),
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
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const criticalCount = pages.filter((p) => p.health === 'Critical').length;
  const needsAttentionCount = pages.filter(
    (p) => p.health === 'Needs Attention'
  ).length;

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4] Define DataTable columns
  const columns: DataTableColumn<PageAsset & DataTableRow>[] = useMemo(
    () => [
      {
        key: 'health',
        header: 'Health',
        cell: (row) => {
          const resolved = resolvedActionsById.get(row.id);
          return resolved?.chipLabel ? (
            <RowStatusChip
              chipLabel={resolved.chipLabel}
              blockedReason={resolved.blockedReason}
              nextStep={resolved.nextStep}
              blockerCategory={resolved.blockerCategory}
            />
          ) : (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getHealthStyles(row.health)}`}
            >
              {row.health}
            </span>
          );
        },
      },
      {
        key: 'path',
        header: 'Path',
        cell: (row) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
            {row.path}
          </code>
        ),
      },
      {
        key: 'title',
        header: 'Title',
        truncate: true,
        cell: (row) =>
          row.title ? (
            <span className="text-sm text-foreground">{row.title}</span>
          ) : (
            <span className="text-sm italic text-muted-foreground">
              No title
            </span>
          ),
      },
      {
        key: 'action',
        header: 'Action',
        cell: (row) => {
          const resolved = resolvedActionsById.get(row.id);
          return (
            <div className="flex items-center gap-3">
              {resolved?.primaryAction ? (
                <Link
                  href={resolved.primaryAction.href}
                  className="font-medium text-primary hover:text-primary/80"
                  data-testid="row-primary-action"
                >
                  {resolved.primaryAction.label}
                </Link>
              ) : resolved?.helpText ? (
                <span
                  className="text-muted-foreground"
                  data-testid="row-help-text"
                >
                  {resolved.helpText}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              {resolved?.secondaryAction && (
                <Link
                  href={resolved.secondaryAction.href}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="row-secondary-action"
                >
                  {resolved.secondaryAction.label}
                </Link>
              )}
            </div>
          );
        },
      },
    ],
    [resolvedActionsById, getHealthStyles]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          {/* [SHOPIFY-ASSET-SYNC-COVERAGE-1] Label under heading */}
          <p className="text-xs text-gray-400 mt-0.5">Shopify Pages</p>
          <p className="mt-1 text-sm text-gray-500">
            {pages.length} pages • {criticalCount} critical •{' '}
            {needsAttentionCount} need attention
          </p>
        </div>
        {/* [SHOPIFY-ASSET-SYNC-COVERAGE-1] Sync button (OWNER-only) */}
        {/* [SHOPIFY-ASSET-SYNC-COVERAGE-1-FIXUP-1] Visible but disabled when Shopify not connected */}
        {capabilities?.canModifySettings && (
          <button
            onClick={handleSyncPages}
            disabled={
              syncing || !syncStatus.shopifyConnected || hasMissingScopes
            }
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Syncing...
              </>
            ) : (
              'Sync Pages'
            )}
          </button>
        )}
      </div>

      {!syncStatus.shopifyConnected && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p>Shopify is not connected for this project.</p>
          <Link
            href={`/projects/${projectId}/settings#integrations`}
            className="mt-2 inline-flex text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Connect Shopify in Project Settings
          </Link>
        </div>
      )}

      {/* [SHOPIFY-SCOPE-RECONSENT-UX-1] Permission notice when required scopes are missing */}
      {syncStatus.shopifyConnected && hasMissingScopes && (
        <ShopifyPermissionNotice
          missingScopes={scopeStatus?.missingScopes ?? []}
          canReconnect={capabilities?.canModifySettings ?? false}
          onReconnect={handleReconnectShopify}
          learnMoreHref="/help/shopify-permissions"
          errorMessage={reconnectError}
          onSignInAgain={handleSignInAgain}
          isReconnecting={reconnecting}
        />
      )}

      {/* [SHOPIFY-ASSET-SYNC-COVERAGE-1] Sync status line */}
      {syncStatus.shopifyConnected && (
        <div className="text-sm text-gray-500">
          {syncStatus.lastPagesSyncAt ? (
            <>
              Last synced:{' '}
              {new Date(syncStatus.lastPagesSyncAt).toLocaleString()}
            </>
          ) : (
            <>Not yet synced. Click Sync to import from Shopify.</>
          )}
        </div>
      )}

      {/* [SHOPIFY-ASSET-SYNC-COVERAGE-1] Sync error */}
      {syncError && !hasMissingScopes && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {syncError}
        </div>
      )}

      {/* [ROUTE-INTEGRITY-1] [SCOPE-CLARITY-1] ScopeBanner - show when from context is present */}
      {/* Uses normalized scope chips for explicit scope display */}
      <ScopeBanner
        from={fromParam}
        returnTo={validatedReturnTo || `/projects/${projectId}/assets/pages`}
        showingText={showingText}
        onClearFiltersHref={buildClearFiltersHref(
          `/projects/${projectId}/assets/pages`
        )}
        chips={normalizedScopeResult.chips}
        wasAdjusted={normalizedScopeResult.wasAdjusted}
      />

      {/* Filter indicator (from Work Queue click-through) */}
      {actionKeyFilter && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <span>
            Filtered by: {actionKeyFilter.replace(/_/g, ' ').toLowerCase()}
          </span>
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
        <>
          {pages.length === 0 ? (
            hasActiveFilters ? (
              <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))]">
                <EmptyState
                  {...EmptyStatePresets.filteredNoResults('pages')}
                  onAction={handleClearFilters}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))]">
                {syncStatus.shopifyConnected && !syncStatus.lastPagesSyncAt ? (
                  <EmptyState
                    {...EmptyStatePresets.neverSynced('pages')}
                    message="Click 'Sync Pages' to import pages from Shopify."
                  />
                ) : syncStatus.shopifyConnected &&
                  syncStatus.lastPagesSyncAt ? (
                  <EmptyState
                    category="initial"
                    icon="document"
                    title="No pages found"
                    message="No pages found in Shopify for this store."
                  />
                ) : (
                  <EmptyState
                    category="initial"
                    icon="document"
                    title="No pages found"
                    message="Connect Shopify and sync to see your pages."
                  />
                )}
              </div>
            )
          ) : (
            // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4] Canonical DataTable
            <DataTable
              columns={columns}
              rows={pages}
              hideContextAction={true}
            />
          )}
        </>
      )}
    </div>
  );
}
