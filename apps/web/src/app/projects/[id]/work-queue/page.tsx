'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { projectsApi } from '@/lib/api';
import type {
  WorkQueueResponse,
  WorkQueueTab,
  WorkQueueBundleType,
  WorkQueueRecommendedActionKey,
  WorkQueueScopeType,
} from '@/lib/work-queue';
import { WORK_QUEUE_ACTION_LABELS } from '@/lib/work-queue';
import { ActionBundleCard } from '@/components/work-queue/ActionBundleCard';
import { WorkQueueTabs } from '@/components/work-queue/WorkQueueTabs';
// [ISSUE-TO-FIX-PATH-1 FIXUP-1] Import from lib module
import { ISSUE_UI_CONFIG } from '@/lib/issue-ui-config';

/**
 * [WORK-QUEUE-1] Work Queue Page
 *
 * Displays derived action bundles with tab-based filtering.
 * Bundles are sorted by state priority, health, impact rank.
 *
 * [STORE-HEALTH-1.0] Supports actionKey and bundleType filters from URL
 * for click-through routing from Store Health page.
 *
 * [ASSETS-PAGES-1] Supports scopeType filter from URL for filtering by asset type.
 *
 * [TRUST-ROUTING-1] Added visible filter context UI and multi-key filtering support.
 */
export default function WorkQueuePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<WorkQueueResponse | null>(null);

  // Get filter params from URL
  const currentTab = (searchParams.get('tab') as WorkQueueTab) || undefined;
  const bundleType = (searchParams.get('bundleType') as WorkQueueBundleType) || undefined;
  const actionKey = (searchParams.get('actionKey') as WorkQueueRecommendedActionKey) || undefined;
  // [TRUST-ROUTING-1] Parse actionKeys (comma-separated multi-key filter)
  const actionKeysParam = searchParams.get('actionKeys');
  const actionKeys: WorkQueueRecommendedActionKey[] = useMemo(() => {
    if (!actionKeysParam) return [];
    return actionKeysParam.split(',').filter(Boolean) as WorkQueueRecommendedActionKey[];
  }, [actionKeysParam]);
  const scopeType = (searchParams.get('scopeType') as WorkQueueScopeType) || undefined;
  const highlightBundleId = searchParams.get('bundleId') || undefined;
  // [TRUST-ROUTING-1] Read from context param
  const fromContext = searchParams.get('from');
  // [ISSUE-TO-FIX-PATH-1] Read issueId from search params
  const issueIdParam = searchParams.get('issueId');

  const fetchWorkQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // [TRUST-ROUTING-1] If actionKeys has multiple keys, fetch unfiltered and filter client-side
      // If single actionKey is present, use API filtering
      const data = await projectsApi.workQueue(projectId, {
        tab: currentTab,
        bundleType,
        actionKey: actionKeys.length === 0 ? actionKey : undefined, // Only use API filter for single key
        scopeType,
      });
      setResponse(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load work queue';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, currentTab, bundleType, actionKey, actionKeys.length, scopeType]);

  useEffect(() => {
    fetchWorkQueue();
  }, [fetchWorkQueue]);

  // [TRUST-ROUTING-1] Clear all filters and navigate to unfiltered Work Queue
  const handleClearFilters = () => {
    router.push(`/projects/${projectId}/work-queue`);
  };

  const handleTabChange = (tab: WorkQueueTab | undefined) => {
    // Preserve actionKey, bundleType, scopeType, bundleId, actionKeys, and from when changing tabs
    const newParams = new URLSearchParams();
    if (tab) newParams.set('tab', tab);
    if (bundleType) newParams.set('bundleType', bundleType);
    if (actionKeysParam) {
      newParams.set('actionKeys', actionKeysParam);
    } else if (actionKey) {
      newParams.set('actionKey', actionKey);
    }
    if (scopeType) newParams.set('scopeType', scopeType);
    if (highlightBundleId) newParams.set('bundleId', highlightBundleId);
    if (fromContext) newParams.set('from', fromContext);
    const query = newParams.toString();
    router.push(`/projects/${projectId}/work-queue${query ? `?${query}` : ''}`);
  };

  // [TRUST-ROUTING-1] Check if any filter context is active
  const hasFilterContext = fromContext === 'store_health' || actionKeys.length > 0 || !!actionKey;

  // [ISSUE-TO-FIX-PATH-1 FIXUP-1] Trigger issue fix mode on issueId only (not requiring from=issues)
  const isIssueFixMode = !!issueIdParam;

  // [ISSUE-TO-FIX-PATH-1] Get safe issue title for display
  const issueTitle = useMemo(() => {
    if (!issueIdParam) return null;
    // Try to get title from ISSUE_UI_CONFIG
    const uiConfig = ISSUE_UI_CONFIG[issueIdParam];
    if (uiConfig?.label) return uiConfig.label;
    // Fallback
    return 'Issue detected';
  }, [issueIdParam]);

  // [TRUST-ROUTING-1] Build filter labels for display
  const filterLabels: string[] = useMemo(() => {
    if (actionKeys.length > 0) {
      return actionKeys.map((k) => WORK_QUEUE_ACTION_LABELS[k] || k);
    }
    if (actionKey) {
      return [WORK_QUEUE_ACTION_LABELS[actionKey] || actionKey];
    }
    return [];
  }, [actionKeys, actionKey]);

  const tabs: { key: WorkQueueTab; label: string }[] = [
    { key: 'Critical', label: 'Critical' },
    { key: 'NeedsAttention', label: 'Needs Attention' },
    { key: 'PendingApproval', label: 'Pending Approval' },
    { key: 'DraftsReady', label: 'Drafts Ready' },
    { key: 'AppliedRecently', label: 'Applied Recently' },
  ];

  // [TRUST-ROUTING-1] Apply client-side filtering for multi-key actionKeys
  const rawItems = response?.items || [];
  const items = useMemo(() => {
    if (actionKeys.length === 0) {
      return rawItems;
    }
    // Client-side filter to those matching any of the specified action keys
    return rawItems.filter((bundle) => actionKeys.includes(bundle.recommendedActionKey));
  }, [rawItems, actionKeys]);

  // [TRUST-ROUTING-1] Calculate bundle counts for explainability
  const totalBundleCount = items.length;
  const totalAffectedItems = useMemo(() => {
    return items.reduce((sum, bundle) => sum + bundle.scopeCount, 0);
  }, [items]);

  // [ISSUE-TO-FIX-PATH-1] Scroll to first bundle and apply highlight on initial load
  useEffect(() => {
    if (!isIssueFixMode || loading) return;

    // Auto-scroll to first bundle card or highlighted bundle
    setTimeout(() => {
      const targetId = highlightBundleId || items[0]?.bundleId;
      if (targetId) {
        const element = document.querySelector(`[data-bundle-id="${targetId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 200);
  }, [isIssueFixMode, loading, highlightBundleId, items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Prioritized action items derived from your store&apos;s optimization status.
          </p>
        </div>
        {response?.viewer && (
          <div className="text-sm text-gray-500">
            Role: <span className="font-medium">{response.viewer.role}</span>
            {response.viewer.isMultiUserProject && (
              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                Multi-user
              </span>
            )}
          </div>
        )}
      </div>

      {/* [ISSUE-TO-FIX-PATH-1] Issue Fix Context Banner */}
      {isIssueFixMode && issueTitle && !loading && (
        <div
          data-testid="work-queue-issue-fix-context-banner"
          className="rounded-lg border border-indigo-200 bg-indigo-50 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-indigo-900">
                You're here to fix: {issueTitle}
              </h3>
              <p className="mt-1 text-xs text-indigo-800">
                Review the action bundles below to address this issue.
              </p>
              <div className="mt-3">
                <Link
                  href={`/projects/${projectId}/issues`}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  ← Back to Issues
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* [TRUST-ROUTING-1] Filter Context Banner */}
      {hasFilterContext && !loading && (
        <div
          className="rounded-lg border border-blue-200 bg-blue-50 p-4"
          data-testid="work-queue-filter-context"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900">Showing:</span>
                {fromContext === 'store_health' && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Store Health → Work Queue
                  </span>
                )}
              </div>
              {filterLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {filterLabels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-800"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {/* [TRUST-ROUTING-1] Count explainability */}
              <p className="mt-2 text-xs text-blue-700">
                {totalBundleCount} action bundle{totalBundleCount !== 1 ? 's' : ''} affecting{' '}
                {totalAffectedItems} item{totalAffectedItems !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
              data-testid="work-queue-clear-filters"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <WorkQueueTabs
        tabs={tabs}
        currentTab={currentTab}
        onTabChange={handleTabChange}
      />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading work queue...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchWorkQueue}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {currentTab === 'AppliedRecently'
              ? 'No recently applied actions'
              : 'All caught up!'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {currentTab === 'AppliedRecently'
              ? 'Actions you apply will appear here for 7 days.'
              : 'No action items in this category. Check other tabs or come back later.'}
          </p>
        </div>
      )}

      {/* Bundle cards */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((bundle) => (
            <div key={bundle.bundleId} data-bundle-id={bundle.bundleId}>
              <ActionBundleCard
                bundle={bundle}
                projectId={projectId}
                viewer={response?.viewer}
                isHighlighted={bundle.bundleId === highlightBundleId}
                onRefresh={fetchWorkQueue}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
