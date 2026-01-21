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
import { ScopeBanner } from '@/components/common/ScopeBanner';
import { ShopifyPermissionNotice } from '@/components/shopify/ShopifyPermissionNotice';
import {
  getReturnToFromCurrentUrl,
  getSafeReturnTo,
} from '@/lib/route-context';
import { getToken } from '@/lib/auth';
import {
  normalizeScopeParams,
  buildClearFiltersHref,
} from '@/lib/scope-normalization';

interface BlogPostAsset {
  id: string;
  title: string | null;
  handle: string | null;
  blogHandle: string | null;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
}

export default function BlogPostsAssetListPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPostAsset[]>([]);
  const [capabilities, setCapabilities] = useState<RoleCapabilities | null>(
    null
  );
  const [syncStatus, setSyncStatus] = useState<{
    lastBlogsSyncAt: string | null;
    shopifyConnected: boolean;
  }>({ lastBlogsSyncAt: null, shopifyConnected: false });
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

  const filterQ = searchParams.get('q') || undefined;
  const hasActiveFilters = !!filterQ;
  const fromParam = searchParams.get('from');

  const currentPathWithQuery = useMemo(() => {
    return getReturnToFromCurrentUrl(pathname, searchParams);
  }, [pathname, searchParams]);

  const validatedReturnTo = useMemo(() => {
    return getSafeReturnTo(searchParams, projectId);
  }, [searchParams, projectId]);

  const normalizedScopeResult = useMemo(() => {
    return normalizeScopeParams(searchParams);
  }, [searchParams]);

  const showingText = useMemo(() => {
    const parts: string[] = [];
    if (filterQ) parts.push(`Search: "${filterQ}"`);
    return parts.length > 0 ? parts.join(' · ') : 'All blog posts';
  }, [filterQ]);

  const fetchBlogPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const crawlPages = await projectsApi.crawlPages(projectId, {
        q: filterQ,
        pageType: 'blog',
      });
      const rows = (crawlPages as any[])
        .filter((p) => p?.shopifyResourceType === 'ARTICLE')
        .map((p) => ({
          id: p.id as string,
          title: (p.title ?? null) as string | null,
          handle: (p.shopifyHandle ?? null) as string | null,
          blogHandle: (p.shopifyBlogHandle ?? null) as string | null,
          url: p.url as string,
          publishedAt: (p.shopifyPublishedAt ?? null) as string | null,
          updatedAt: (p.shopifyUpdatedAt ?? null) as string | null,
        }));
      setBlogPosts(rows);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load blog posts';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, filterQ]);

  const fetchCapabilities = useCallback(async () => {
    try {
      const roleResponse = await projectsApi.getUserRole(projectId);
      setCapabilities(roleResponse.capabilities);
    } catch (err) {
      console.error('Error fetching role:', err);
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

  const fetchSyncStatus = useCallback(async () => {
    try {
      const integrationStatus = await projectsApi.integrationStatus(projectId);
      const shopifyConnected = integrationStatus?.shopify?.connected ?? false;
      if (shopifyConnected) {
        const status = await shopifyApi.getSyncStatus(projectId);
        const scope = await shopifyApi.getMissingScopes(
          projectId,
          'blogs_sync'
        );
        setSyncStatus({
          lastBlogsSyncAt: (status as any).lastBlogsSyncAt ?? null,
          shopifyConnected: true,
        });
        setScopeStatus({
          requiredScopes: (scope as any).requiredScopes ?? [],
          grantedScopes: (scope as any).grantedScopes ?? [],
          missingScopes: (scope as any).missingScopes ?? [],
        });
      } else {
        setSyncStatus({ lastBlogsSyncAt: null, shopifyConnected: false });
        setScopeStatus(null);
      }
    } catch (err) {
      console.error('Error fetching sync status:', err);
      setSyncStatus({ lastBlogsSyncAt: null, shopifyConnected: false });
      setScopeStatus(null);
    }
  }, [projectId]);

  const handleSyncBlogs = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await shopifyApi.syncBlogs(projectId);
      await fetchSyncStatus();
      await fetchBlogPosts();
    } catch {
      setSyncError("We couldn't sync blog posts. Please try again.");
      await fetchSyncStatus();
    } finally {
      setSyncing(false);
    }
  }, [projectId, fetchSyncStatus, fetchBlogPosts]);

  useEffect(() => {
    fetchBlogPosts();
    fetchCapabilities();
    fetchSyncStatus();
  }, [fetchBlogPosts, fetchCapabilities, fetchSyncStatus]);

  const hasMissingScopes = (scopeStatus?.missingScopes?.length ?? 0) > 0;

  const handleReconnectShopify = useCallback(async () => {
    setReconnectError(null);
    setReconnecting(true);

    if (!projectId) {
      setReconnectError(
        "We couldn't start Shopify reconnection because your project ID is missing. Please refresh and try again."
      );
      setReconnecting(false);
      return;
    }

    const token = getToken();
    if (!token) {
      setReconnectError(
        "We couldn't start Shopify reconnection because your session token is missing. Please sign in again, then retry."
      );
      setReconnecting(false);
      return;
    }

    try {
      const result = await shopifyApi.getReconnectUrl(
        projectId,
        'blogs_sync',
        currentPathWithQuery
      );
      const url =
        result && typeof (result as any).url === 'string'
          ? (result as any).url
          : null;
      if (!url) {
        setReconnectError(
          "We couldn't start Shopify reconnection. Please refresh and try again."
        );
        setReconnecting(false);
        return;
      }
      window.location.href = url;
    } catch (err: unknown) {
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

  useEffect(() => {
    if (autoSyncAfterReconnectRef.current) return;
    if (searchParams.get('shopify') !== 'reconnected') return;
    if (searchParams.get('reconnect') !== 'blogs_sync') return;
    if (!syncStatus.shopifyConnected) return;
    if (hasMissingScopes) return;
    if (!(capabilities?.canModifySettings ?? false)) return;

    autoSyncAfterReconnectRef.current = true;
    handleSyncBlogs().finally(() => {
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
    handleSyncBlogs,
    router,
    pathname,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog posts</h1>
          <p className="text-xs text-gray-400 mt-0.5">Shopify Blog posts</p>
          <p className="mt-1 text-sm text-gray-500">
            {blogPosts.length} blog posts • 0 critical • 0 need attention
          </p>
        </div>
        {capabilities?.canModifySettings && (
          <button
            onClick={handleSyncBlogs}
            disabled={
              syncing || !syncStatus.shopifyConnected || hasMissingScopes
            }
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? 'Syncing...' : 'Sync Blog posts'}
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

      {syncStatus.shopifyConnected && (
        <div className="text-sm text-gray-500">
          {syncStatus.lastBlogsSyncAt ? (
            <>
              Last synced:{' '}
              {new Date(syncStatus.lastBlogsSyncAt).toLocaleString()}
            </>
          ) : (
            <>Not yet synced. Click Sync to import blog posts from Shopify.</>
          )}
        </div>
      )}

      {syncError && !hasMissingScopes && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{syncError}</p>
          <button
            type="button"
            onClick={handleSyncBlogs}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      <ScopeBanner
        from={fromParam}
        returnTo={validatedReturnTo || `/projects/${projectId}/assets/blogs`}
        showingText={showingText}
        onClearFiltersHref={buildClearFiltersHref(
          `/projects/${projectId}/assets/blogs`
        )}
        chips={normalizedScopeResult.chips}
        wasAdjusted={normalizedScopeResult.wasAdjusted}
      />

      <ListControls
        config={{
          searchPlaceholder: 'Search by title or handle...',
          enableStatusFilter: false,
          enableHasDraftFilter: false,
        }}
      />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading blog posts...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchBlogPosts}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {blogPosts.length === 0 ? (
            hasActiveFilters ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No blog posts match your search.
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {syncStatus.shopifyConnected && !syncStatus.lastBlogsSyncAt ? (
                  <>
                    <p>Not yet synced.</p>
                    <p className="mt-2">
                      Click &quot;Sync Blog posts&quot; to import blog posts
                      from Shopify.
                    </p>
                  </>
                ) : syncStatus.shopifyConnected &&
                  syncStatus.lastBlogsSyncAt ? (
                  <p>No blog posts found in Shopify for this store.</p>
                ) : (
                  <p>No blog posts found</p>
                )}
              </div>
            )
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Handle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Open
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {blogPosts.map((post) => {
                  const isPublished = !!post.publishedAt;
                  return (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isPublished
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {post.blogHandle && post.handle
                          ? `${post.blogHandle}/${post.handle}`
                          : post.handle || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {post.title || 'Untitled'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {post.updatedAt
                          ? new Date(post.updatedAt).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          data-testid="blog-post-open"
                          href={post.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Open
                        </a>
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
