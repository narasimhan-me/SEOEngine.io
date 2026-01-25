'use client';

/**
 * [DRAFT-FIELD-COVERAGE-1] Page Detail Page with Drafts Tab
 *
 * URL is source of truth for tab state (?tab=overview|drafts).
 * No AI imports/features - this is a detail view for pages.
 * Drafts tab uses AssetDraftsTab (non-AI boundary preserved).
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  useParams,
  useSearchParams,
  useRouter,
  usePathname,
} from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import { AssetDraftsTab } from '@/components/products/AssetDraftsTab';
// [RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-3] Import RCP hook for descriptor hydration
import { useRightContextPanel } from '@/components/right-context-panel/RightContextPanelProvider';

interface PageAsset {
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

type PageDetailTab = 'overview' | 'drafts';

export default function PageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const projectId = params.id as string;
  const pageId = params.pageId as string;

  // Tab state from URL (default: overview)
  const activeTab = useMemo((): PageDetailTab => {
    const tab = searchParams.get('tab');
    if (tab === 'drafts') return 'drafts';
    return 'overview';
  }, [searchParams]);

  // Page state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<PageAsset | null>(null);

  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-3] RCP descriptor hydration
  const {
    isOpen: rcpIsOpen,
    descriptor: rcpDescriptor,
    openPanel: rcpOpenPanel,
  } = useRightContextPanel();

  // Auth check and fetch on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all static pages and find the one matching pageId
        const pages = await projectsApi.crawlPages(projectId, {
          pageType: 'static',
        });
        const foundPage = (pages as PageAsset[]).find(
          (p: PageAsset) => p.id === pageId
        );
        if (!foundPage) {
          setError('Page not found');
          setPage(null);
        } else {
          setPage(foundPage);
        }
      } catch (err) {
        console.error('[DRAFT-FIELD-COVERAGE-1] Failed to fetch page:', err);
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [router, projectId, pageId]);

  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-3] Hydrate RCP descriptor with page title
  // Only runs when panel is open with matching page; does NOT reopen if dismissed
  useEffect(() => {
    if (
      !rcpIsOpen ||
      rcpDescriptor?.kind !== 'page' ||
      rcpDescriptor.id !== pageId ||
      !page
    ) {
      return;
    }
    // Compute display title (page.title or URL pathname as fallback)
    const displayTitle = page.title || new URL(page.url).pathname;
    if (rcpDescriptor.title === displayTitle) {
      return;
    }
    // Enrich descriptor with display title (in-place update, no close/reopen)
    rcpOpenPanel({
      kind: 'page',
      id: pageId,
      title: displayTitle,
      scopeProjectId: projectId,
    });
  }, [rcpIsOpen, rcpDescriptor, pageId, projectId, page, rcpOpenPanel]);

  /**
   * Switch tabs while preserving other URL params
   */
  const handleTabChange = useCallback(
    (newTab: PageDetailTab) => {
      const newParams = new URLSearchParams(searchParams.toString());
      if (newTab === 'overview') {
        newParams.delete('tab');
      } else {
        newParams.set('tab', newTab);
      }
      const qs = newParams.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ''}`);
    },
    [router, pathname, searchParams]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-gray-600">Loading page...</div>
      </div>
    );
  }

  // Error state
  if (error || !page) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-4">
          {error || 'The requested page could not be found.'}
        </p>
        <Link
          href={`/projects/${projectId}/assets/pages`}
          className="text-primary hover:text-primary/80"
        >
          ← Back to Pages
        </Link>
      </div>
    );
  }

  // Extract path from URL for display
  const urlPath = new URL(page.url).pathname;

  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Derive handle from Shopify field or URL path segment
  const displayHandle =
    page.shopifyHandle || urlPath.split('/').pop() || urlPath;

  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Use Shopify updatedAt if present, otherwise scannedAt
  const displayUpdatedAt = page.shopifyUpdatedAt || page.scannedAt;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/assets/pages`}
          className="text-sm text-primary hover:text-primary/80 mb-2 inline-block"
        >
          ← Back to Pages
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          {page.title || urlPath}
        </h1>
        {/* [SHOPIFY-ASSET-SYNC-COVERAGE-1] Display handle and updated timestamp */}
        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
          <span>
            Handle:{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
              {displayHandle}
            </code>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            Updated:{' '}
            {displayUpdatedAt
              ? new Date(displayUpdatedAt).toLocaleString()
              : '-'}
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">{page.url}</p>
      </div>

      {/* [NAV-HIERARCHY-POLISH-1] Tab Bar - token-only entity tabs */}
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex gap-4" aria-label="Tabs">
          <button
            type="button"
            onClick={() => handleTabChange('overview')}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              activeTab === 'overview'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('drafts')}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              activeTab === 'drafts'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Drafts
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <section aria-label="Overview">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Page Details
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Title
              </div>
              <div className="text-gray-900">
                {page.title || (
                  <span className="italic text-gray-400">(empty)</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Meta Description
              </div>
              <div className="text-gray-900">
                {page.metaDescription || (
                  <span className="italic text-gray-400">(empty)</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Status Code
                </div>
                <div className="text-gray-900">{page.statusCode ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Word Count
                </div>
                <div className="text-gray-900">{page.wordCount ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Page Type
                </div>
                <div className="text-gray-900">{page.pageType}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Last Scanned
                </div>
                <div className="text-gray-900">
                  {page.scannedAt
                    ? new Date(page.scannedAt).toLocaleDateString()
                    : '-'}
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
          assetType="pages"
          assetId={pageId}
          currentFieldValues={{
            seoTitle: page.title,
            seoDescription: page.metaDescription,
          }}
        />
      )}
    </div>
  );
}
