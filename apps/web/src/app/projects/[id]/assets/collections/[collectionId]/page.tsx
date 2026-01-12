'use client';

/**
 * [DRAFT-FIELD-COVERAGE-1] Collection Detail Page with Drafts Tab
 *
 * URL is source of truth for tab state (?tab=overview|drafts).
 * No AI imports/features - this is a detail view for collections.
 * Drafts tab uses AssetDraftsTab (non-AI boundary preserved).
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import { AssetDraftsTab } from '@/components/products/AssetDraftsTab';

interface CollectionAsset {
  id: string;
  url: string;
  title: string | null;
  metaDescription: string | null;
  pageType: string;
  statusCode: number | null;
  wordCount: number | null;
  scannedAt: string;
  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Shopify identity fields
  shopifyHandle?: string | null;
  shopifyUpdatedAt?: string | null;
}

type CollectionDetailTab = 'overview' | 'drafts';

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const projectId = params.id as string;
  const collectionId = params.collectionId as string;

  // Tab state from URL (default: overview)
  const activeTab = useMemo((): CollectionDetailTab => {
    const tab = searchParams.get('tab');
    if (tab === 'drafts') return 'drafts';
    return 'overview';
  }, [searchParams]);

  // Collection state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<CollectionAsset | null>(null);

  // Auth check and fetch on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const fetchCollection = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all collection pages and find the one matching collectionId
        const collections = await projectsApi.crawlPages(projectId, { pageType: 'collection' });
        const foundCollection = (collections as CollectionAsset[]).find((c: CollectionAsset) => c.id === collectionId);
        if (!foundCollection) {
          setError('Collection not found');
          setCollection(null);
        } else {
          setCollection(foundCollection);
        }
      } catch (err) {
        console.error('[DRAFT-FIELD-COVERAGE-1] Failed to fetch collection:', err);
        setError(err instanceof Error ? err.message : 'Failed to load collection');
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [router, projectId, collectionId]);

  /**
   * Switch tabs while preserving other URL params
   */
  const handleTabChange = useCallback((newTab: CollectionDetailTab) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (newTab === 'overview') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', newTab);
    }
    const qs = newParams.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  }, [router, pathname, searchParams]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-gray-600">Loading collection...</div>
      </div>
    );
  }

  // Error state
  if (error || !collection) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Collection Not Found</h1>
        <p className="text-gray-600 mb-4">{error || 'The requested collection could not be found.'}</p>
        <Link
          href={`/projects/${projectId}/assets/collections`}
          className="text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Collections
        </Link>
      </div>
    );
  }

  // Extract path from URL for display
  const urlPath = new URL(collection.url).pathname;

  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Derive handle from Shopify field or URL path segment
  const displayHandle = collection.shopifyHandle || urlPath.split('/').pop() || urlPath;

  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Use Shopify updatedAt if present, otherwise scannedAt
  const displayUpdatedAt = collection.shopifyUpdatedAt || collection.scannedAt;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/assets/collections`}
          className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
        >
          ← Back to Collections
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          {collection.title || urlPath}
        </h1>
        {/* [SHOPIFY-ASSET-SYNC-COVERAGE-1] Display handle and updated timestamp */}
        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
          <span>Handle: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{displayHandle}</code></span>
          <span className="text-gray-300">|</span>
          <span>Updated: {displayUpdatedAt ? new Date(displayUpdatedAt).toLocaleString() : '-'}</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">{collection.url}</p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-4" aria-label="Tabs">
          <button
            type="button"
            onClick={() => handleTabChange('overview')}
            className={`py-2 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('drafts')}
            className={`py-2 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'drafts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Drafts
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <section aria-label="Overview">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Collection Details</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Title
              </div>
              <div className="text-gray-900">
                {collection.title || <span className="italic text-gray-400">(empty)</span>}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Meta Description
              </div>
              <div className="text-gray-900">
                {collection.metaDescription || <span className="italic text-gray-400">(empty)</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Status Code
                </div>
                <div className="text-gray-900">{collection.statusCode ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Word Count
                </div>
                <div className="text-gray-900">{collection.wordCount ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Page Type
                </div>
                <div className="text-gray-900">{collection.pageType}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Last Scanned
                </div>
                <div className="text-gray-900">
                  {collection.scannedAt ? new Date(collection.scannedAt).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* [DRAFT-FIELD-COVERAGE-1] Drafts Tab - Conditionally mounted */}
      {activeTab === 'drafts' && (
        <AssetDraftsTab
          projectId={projectId}
          assetType="collections"
          assetId={collectionId}
          currentFieldValues={{
            seoTitle: collection.title,
            seoDescription: collection.metaDescription,
          }}
        />
      )}
    </div>
  );
}
