'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { projectsApi, aiApi } from '@/lib/api';
import type { WorkQueueResponse, WorkQueueActionBundle } from '@/lib/work-queue';
import { buildWorkQueueUrl } from '@/lib/work-queue';
import type { ProjectInsightsResponse } from '@/lib/insights';
import type { IssueCountsSummary } from '@/lib/deo-issues';

/**
 * [STORE-HEALTH-1.0] Store Health Page
 *
 * Decision-only surface showing 6 health cards that route to Work Queue.
 * No preview/generate/apply triggered from this page.
 *
 * Cards (in order):
 * 1. Discoverability (DEO)
 * 2. Generative Visibility (GEO / AEO)
 * 3. Content Quality
 * 4. Technical Readiness
 * 5. Trust & Compliance
 * 6. AI Usage & Quota
 */

type HealthStatus = 'Healthy' | 'Needs Attention' | 'Critical';

interface HealthCard {
  id: string;
  title: string;
  health: HealthStatus;
  summary: string;
  actionLabel: string;
  onClick: () => void;
}

export default function StoreHealthPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workQueue, setWorkQueue] = useState<WorkQueueResponse | null>(null);
  const [insights, setInsights] = useState<ProjectInsightsResponse | null>(null);
  const [aiQuota, setAiQuota] = useState<{ used: number; limit: number | null; remaining: number | null } | null>(null);
  // [COUNT-INTEGRITY-1 PATCH 7] Add countsSummary for click-integrity counts (unused for now, reserved for future features)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [countsSummary, setCountsSummary] = useState<IssueCountsSummary | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // [COUNT-INTEGRITY-1 PATCH 7] Fetch countsSummary for click-integrity counts
      const [wqData, insightsData, quotaData, countsData] = await Promise.all([
        projectsApi.workQueue(projectId),
        projectsApi.insights(projectId).catch(() => null),
        aiApi.getProjectAiUsageQuota(projectId, { action: 'DRAFT_GENERATE' }).catch(() => null),
        projectsApi.issueCountsSummary(projectId).catch(() => null),
      ]);
      setWorkQueue(wqData);
      setInsights(insightsData);
      setCountsSummary(countsData);
      if (quotaData) {
        // Map from AiUsageQuotaEvaluation fields to our internal representation
        setAiQuota({
          used: quotaData.currentMonthAiRuns ?? 0,
          limit: quotaData.policy?.monthlyAiRunsLimit ?? null,
          remaining: quotaData.remainingAiRuns ?? null,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load store health';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper: Get worst health from bundles matching criteria
  const getWorstHealth = (bundles: WorkQueueActionBundle[]): HealthStatus => {
    if (bundles.some((b) => b.health === 'CRITICAL')) return 'Critical';
    if (bundles.some((b) => b.health === 'NEEDS_ATTENTION')) return 'Needs Attention';
    return 'Healthy';
  };

  // Helper: Get action label from top bundle
  const getActionLabel = (bundles: WorkQueueActionBundle[], fallback: string): string => {
    if (bundles.length === 0) return fallback;
    const topBundle = bundles[0];
    return topBundle.recommendedActionLabel || fallback;
  };

  // Derive card data from Work Queue bundles
  const items = workQueue?.items || [];

  // 1. Discoverability (DEO) - FIX_MISSING_METADATA + RESOLVE_TECHNICAL_ISSUES
  const deoBundles = items.filter(
    (b) => b.recommendedActionKey === 'FIX_MISSING_METADATA' ||
           b.recommendedActionKey === 'RESOLVE_TECHNICAL_ISSUES'
  );
  const deoHealth = getWorstHealth(deoBundles);
  // [COUNT-INTEGRITY-1.1 Step 2C] Use canonical "Items affected" semantics with explicit labels
  const deoActionableCount = deoBundles.reduce((sum, b) => sum + b.scopeCount, 0);
  const deoDetectedCount = deoBundles.reduce((sum, b) => sum + (b.scopeDetectedCount ?? b.scopeCount), 0);
  const deoSummary = deoBundles.length > 0
    ? deoActionableCount > 0
      ? deoDetectedCount > deoActionableCount
        ? `${deoActionableCount} items affected (actionable now) · ${deoDetectedCount} total detected across metadata and technical optimization.`
        : `${deoActionableCount} items affected (actionable now) across metadata and technical optimization.`
      : `Informational only · ${deoDetectedCount} items affected (no action required) across metadata and technical optimization.`
    : 'Your store is discoverable with no outstanding issues.';
  const deoAction = getActionLabel(deoBundles, 'View discoverability');

  // 2. Generative Visibility (GEO/AEO) - from insights.geoInsights
  const geoReadinessPercent = insights?.geoInsights?.overview?.productsAnswerReadyPercent ?? 100;
  const geoHealth: HealthStatus = geoReadinessPercent < 50 ? 'Critical' : geoReadinessPercent < 80 ? 'Needs Attention' : 'Healthy';
  const geoSummary = geoHealth === 'Healthy'
    ? 'Your products are ready for AI-powered search experiences.'
    : 'Some products may not appear in AI-generated recommendations.';
  const geoAction = 'Review GEO readiness';

  // 3. Content Quality - OPTIMIZE_CONTENT
  const contentBundles = items.filter((b) => b.recommendedActionKey === 'OPTIMIZE_CONTENT');
  const contentHealth = getWorstHealth(contentBundles);
  const contentSummary = contentBundles.length > 0
    ? `${contentBundles.reduce((sum, b) => sum + b.scopeCount, 0)} products have content that could be improved.`
    : 'Your product content meets quality standards.';
  const contentAction = getActionLabel(contentBundles, 'View content opportunities');

  // 4. Technical Readiness - RESOLVE_TECHNICAL_ISSUES
  const technicalBundles = items.filter((b) => b.recommendedActionKey === 'RESOLVE_TECHNICAL_ISSUES');
  const technicalHealth = getWorstHealth(technicalBundles);
  // [COUNT-INTEGRITY-1.1 Step 2C] Use canonical "Items affected" semantics with explicit labels
  const technicalActionableCount = technicalBundles.reduce((sum, b) => sum + b.scopeCount, 0);
  const technicalDetectedCount = technicalBundles.reduce((sum, b) => sum + (b.scopeDetectedCount ?? b.scopeCount), 0);
  const technicalSummary = technicalBundles.length > 0
    ? technicalActionableCount > 0
      ? technicalDetectedCount > technicalActionableCount
        ? `${technicalActionableCount} items affected (actionable now) · ${technicalDetectedCount} total detected technical issues affecting your store.`
        : `${technicalActionableCount} items affected (actionable now) with technical issues affecting your store.`
      : `Informational only · ${technicalDetectedCount} items affected (no action required) with technical issues.`
    : 'No technical issues detected.';
  const technicalAction = getActionLabel(technicalBundles, 'View technical status');

  // 5. Trust & Compliance - IMPROVE_SEARCH_INTENT + governance
  const trustBundles = items.filter(
    (b) => b.recommendedActionKey === 'IMPROVE_SEARCH_INTENT' ||
           b.recommendedActionKey === 'SHARE_LINK_GOVERNANCE'
  );
  const trustHealth = getWorstHealth(trustBundles);
  const trustSummary = trustBundles.length > 0
    ? 'Review search intent and governance settings.'
    : 'Trust signals and compliance are in good standing.';
  const trustAction = getActionLabel(trustBundles, 'Review trust status');

  // 6. AI Usage & Quota - from quota API
  const aiUsedPercent = aiQuota?.limit ? Math.round((aiQuota.used / aiQuota.limit) * 100) : 0;
  const aiHealth: HealthStatus = aiUsedPercent >= 90 ? 'Critical' : aiUsedPercent >= 70 ? 'Needs Attention' : 'Healthy';
  const aiSummary = aiQuota?.limit
    ? aiHealth === 'Healthy'
      ? 'Your AI usage is within quota limits.'
      : 'AI usage is approaching or at quota limits.'
    : 'AI usage tracking is available.';
  const aiAction = 'View AI usage';

  // [TRUST-ROUTING-1] Build cards array with deterministic multi-key routing
  const cards: HealthCard[] = [
    {
      id: 'discoverability',
      title: 'Discoverability',
      health: deoHealth,
      summary: deoSummary,
      actionLabel: deoAction,
      // [TRUST-ROUTING-1] Route with both FIX_MISSING_METADATA and RESOLVE_TECHNICAL_ISSUES
      onClick: () => router.push(buildWorkQueueUrl(projectId, {
        actionKeys: ['FIX_MISSING_METADATA', 'RESOLVE_TECHNICAL_ISSUES'],
        from: 'store_health',
      })),
    },
    {
      id: 'generative-visibility',
      title: 'Generative Visibility',
      health: geoHealth,
      summary: geoSummary,
      actionLabel: geoAction,
      // [TRUST-ROUTING-1] Fixed: route to /insights/geo-insights instead of ?tab=geo
      onClick: () => router.push(`/projects/${projectId}/insights/geo-insights`),
    },
    {
      id: 'content-quality',
      title: 'Content Quality',
      health: contentHealth,
      summary: contentSummary,
      actionLabel: contentAction,
      onClick: () => router.push(buildWorkQueueUrl(projectId, {
        actionKey: 'OPTIMIZE_CONTENT',
        from: 'store_health',
      })),
    },
    {
      id: 'technical-readiness',
      title: 'Technical Readiness',
      health: technicalHealth,
      summary: technicalSummary,
      actionLabel: technicalAction,
      onClick: () => router.push(buildWorkQueueUrl(projectId, {
        actionKey: 'RESOLVE_TECHNICAL_ISSUES',
        from: 'store_health',
      })),
    },
    {
      id: 'trust-compliance',
      title: 'Trust & Compliance',
      health: trustHealth,
      summary: trustSummary,
      actionLabel: trustAction,
      // [TRUST-ROUTING-1] Route with both IMPROVE_SEARCH_INTENT and SHARE_LINK_GOVERNANCE
      onClick: () => router.push(buildWorkQueueUrl(projectId, {
        actionKeys: ['IMPROVE_SEARCH_INTENT', 'SHARE_LINK_GOVERNANCE'],
        from: 'store_health',
      })),
    },
    {
      id: 'ai-usage',
      title: 'AI Usage & Quota',
      health: aiHealth,
      summary: aiSummary,
      actionLabel: aiAction,
      onClick: () => router.push(`/settings/ai-usage`),
    },
  ];

  // Health pill styling
  const getHealthStyles = (health: HealthStatus): string => {
    switch (health) {
      case 'Critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Needs Attention':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Healthy':
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Store Health</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your store&apos;s optimization status. Click any card to take action.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading store health...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Health cards grid */}
      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={card.onClick}
              className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {/* Health pill */}
              <span
                className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getHealthStyles(card.health)}`}
              >
                {card.health}
              </span>

              {/* Title */}
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{card.title}</h3>

              {/* Summary */}
              <p className="mt-1 flex-1 text-sm text-gray-600">{card.summary}</p>

              {/* Action label */}
              <span className="mt-4 inline-flex items-center text-sm font-medium text-blue-600">
                {card.actionLabel}
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
