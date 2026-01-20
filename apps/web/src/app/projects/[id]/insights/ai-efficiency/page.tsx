'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import type { ProjectInsightsResponse } from '@/lib/insights';
import { InsightsSubnav } from '@/components/projects/InsightsSubnav';
import InsightsPillarsSubnav from '@/components/projects/InsightsPillarsSubnav';

/**
 * [INSIGHTS-1] AI Efficiency Page
 *
 * View AI usage metrics, reuse rates, and quota status.
 * Trust invariant: "Apply never uses AI" is prominently displayed.
 */
export default function AiEfficiencyPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [insights, setInsights] = useState<ProjectInsightsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.insights(projectId);
      setInsights(data);
    } catch (err) {
      console.error('[AiEfficiencyPage] Failed to fetch insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchInsights();
  }, [router, fetchInsights]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Failed to load insights'}
        </div>
      </div>
    );
  }

  const { saved } = insights.overview;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Efficiency</h1>
        <p className="text-gray-600 mt-1">
          Track AI usage, reuse rates, and quota consumption.
        </p>
      </div>

      <InsightsSubnav projectId={projectId} activeTab="ai-efficiency" />
      <InsightsPillarsSubnav />

      {/* Trust Banner */}
      <section className="mt-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">
                {saved.trust.invariantMessage}
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                APPLY runs with AI: {saved.trust.applyAiRuns} (should always be
                0)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {/* AI Runs Used */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">AI Runs Used</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {saved.aiRunsUsed}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Preview and draft generation calls
          </p>
        </div>

        {/* Runs Avoided */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
          <h3 className="text-sm font-medium text-blue-700">
            Runs Avoided via Reuse
          </h3>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {saved.aiRunsAvoidedViaReuse}
          </p>
          <p className="mt-1 text-xs text-blue-600">
            Cached results reused instead of new AI calls
          </p>
        </div>

        {/* Reuse Rate */}
        <div className="rounded-lg border border-green-100 bg-green-50 p-6">
          <h3 className="text-sm font-medium text-green-700">Reuse Rate</h3>
          <p className="mt-2 text-3xl font-bold text-green-900">
            {saved.reuseRatePercent}%
          </p>
          <p className="mt-1 text-xs text-green-600">
            Percentage of runs served from cache
          </p>
        </div>
      </section>

      {/* Quota Status */}
      <section className="mt-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Quota Status
            </h3>
            {/* [BILLING-GTM-1] Always-visible billing link */}
            <Link
              href="/settings/billing"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage Plan & Billing &rarr;
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Monthly Limit</span>
              <span className="text-sm font-medium text-gray-900">
                {saved.quota.limit === null ? 'Unlimited' : saved.quota.limit}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Used</span>
              <span className="text-sm font-medium text-gray-900">
                {saved.quota.used}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Remaining</span>
              <span className="text-sm font-medium text-gray-900">
                {saved.quota.remaining === null
                  ? 'Unlimited'
                  : saved.quota.remaining}
              </span>
            </div>
            {saved.quota.usedPercent !== null && (
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Usage</span>
                  <span className="font-medium text-gray-900">
                    {saved.quota.usedPercent}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      saved.quota.usedPercent >= 90
                        ? 'bg-red-500'
                        : saved.quota.usedPercent >= 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(saved.quota.usedPercent, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          {/* [BILLING-GTM-1] Conditional upgrade prompt when quota pressure is high */}
          {(saved.quota.usedPercent !== null &&
            saved.quota.usedPercent >= 80) ||
          saved.quota.remaining === 0 ? (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-800">
                  {saved.quota.remaining === 0
                    ? 'Your AI quota is exhausted for this period.'
                    : `You're at ${saved.quota.usedPercent}% of your monthly limit.`}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  {saved.trust.invariantMessage}
                </p>
                <Link
                  href="/settings/billing"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900"
                >
                  Upgrade for more AI runs
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Efficiency Tips */}
      <section className="mt-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Tips to Improve Efficiency
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500">&#10003;</span>
              <span>
                Use Preview before Apply to validate suggestions without using
                quota
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">&#10003;</span>
              <span>
                Similar content automatically reuses cached AI results
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">&#10003;</span>
              <span>APPLY operations never consume AI quota</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
