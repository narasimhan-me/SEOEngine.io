'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { projectsApi } from '@/lib/api';
import { buildWorkQueueUrl } from '@/lib/work-queue';
import type { WorkQueueRecommendedActionKey } from '@/lib/work-queue';

/**
 * [ASSETS-PAGES-1] Collections Asset List
 *
 * Displays Shopify collections (/collections/*) with health status and recommended actions.
 * Decision-first UX: one health pill, one action label per row.
 * Bulk actions route to Playbooks.
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
}

export default function CollectionsAssetListPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get filter from URL (from Work Queue click-through)
  const actionKeyFilter = searchParams.get('actionKey') as WorkQueueRecommendedActionKey | null;

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch crawl pages and filter to collections
      const crawlPages = await projectsApi.crawlPages(projectId);

      // Filter to only collections
      const collectionAssets: CollectionAsset[] = crawlPages
        .filter((p: { pageType: string }) => p.pageType === 'collection')
        .map((p: { id: string; url: string; path: string; title: string | null; metaDescription: string | null; statusCode: number | null; wordCount: number | null; scannedAt: string }) => {
          // Derive health and action from collection state
          let health: 'Healthy' | 'Needs Attention' | 'Critical' = 'Healthy';
          let recommendedActionKey: WorkQueueRecommendedActionKey | null = null;
          let recommendedActionLabel: string | null = null;

          // Missing metadata = Critical
          if (!p.title || !p.metaDescription) {
            health = 'Critical';
            recommendedActionKey = 'FIX_MISSING_METADATA';
            recommendedActionLabel = 'Fix missing metadata';
          }
          // Technical issues (4xx/5xx status) = Critical
          else if (p.statusCode && p.statusCode >= 400) {
            health = 'Critical';
            recommendedActionKey = 'RESOLVE_TECHNICAL_ISSUES';
            recommendedActionLabel = 'Resolve technical issues';
          }
          // Thin content = Needs Attention
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
          };
        });

      // Apply actionKey filter if present
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
  }, [projectId, actionKeyFilter]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleSelectAll = () => {
    if (selectedIds.size === collections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(collections.map((c) => c.id)));
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
    // Route to Work Queue with COLLECTIONS scope filter
    router.push(buildWorkQueueUrl(projectId, {
      actionKey: 'FIX_MISSING_METADATA',
      scopeType: 'COLLECTIONS',
    }));
  };

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
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkFix}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Fix missing metadata ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Filter indicator */}
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === collections.length && collections.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
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
              {collections.map((collection) => (
                <tr key={collection.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(collection.id)}
                      onChange={() => handleSelectOne(collection.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getHealthStyles(collection.health)}`}
                    >
                      {collection.health}
                    </span>
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
                    {collection.recommendedActionLabel ? (
                      <button
                        onClick={() => router.push(buildWorkQueueUrl(projectId, {
                          actionKey: collection.recommendedActionKey!,
                          scopeType: 'COLLECTIONS',
                        }))}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {collection.recommendedActionLabel}
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {collections.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No collections found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
