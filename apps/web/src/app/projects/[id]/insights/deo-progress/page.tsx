'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import type { ProjectInsightsResponse } from '@/lib/insights';
import { InsightsSubnav } from '@/components/projects/InsightsSubnav';
import InsightsPillarsSubnav from '@/components/projects/InsightsPillarsSubnav';
import { Sparkline } from '@/components/projects/Sparkline';

/**
 * [INSIGHTS-1] DEO Progress Page
 *
 * Detailed view of DEO score trends and component breakdowns.
 */
export default function DeoProgressPage() {
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
      console.error('[DeoProgressPage] Failed to fetch insights:', err);
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

  const { overview, progress } = insights;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">DEO Progress</h1>
        <p className="text-gray-600 mt-1">
          Track your DEO score improvements and component trends.
        </p>
      </div>

      <InsightsSubnav projectId={projectId} activeTab="deo-progress" />
      <InsightsPillarsSubnav />

      {/* Current Score Summary */}
      <section className="mt-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Current DEO Score
              </h2>
              <p className="text-sm text-gray-500">
                Compared to {insights.window.days} days ago
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-gray-900">
                {overview.improved.deoScore.current}
              </span>
              <span
                className={`ml-2 text-lg font-medium ${
                  overview.improved.deoScore.trend === 'up'
                    ? 'text-green-600'
                    : overview.improved.deoScore.trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-500'
                }`}
              >
                {overview.improved.deoScore.trend === 'up' && '+'}
                {overview.improved.deoScore.delta}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Score Trend Chart */}
      <section className="mt-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Score Trend
          </h3>
          <Sparkline
            data={progress.deoScoreTrend.map((d) => ({
              x: d.date,
              y: d.score,
            }))}
            height={200}
            color="#10B981"
            showLabels
          />
        </div>
      </section>

      {/* Component Deltas */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Component Changes
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overview.improved.componentDeltas.map((comp) => (
            <div
              key={comp.componentId}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <h4 className="text-sm font-medium text-gray-700">
                {comp.label}
              </h4>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-900">
                  {comp.current}
                </span>
                <span
                  className={`text-sm font-medium ${
                    comp.trend === 'up'
                      ? 'text-green-600'
                      : comp.trend === 'down'
                        ? 'text-red-600'
                        : 'text-gray-500'
                  }`}
                >
                  {comp.trend === 'up' && '+'}
                  {comp.delta}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Previous: {comp.previous}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Fixes Applied */}
      <section className="mt-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Fixes Applied Over Time
          </h3>
          <Sparkline
            data={progress.fixesAppliedTrend.map((d) => ({
              x: d.date,
              y: d.count,
            }))}
            height={150}
            color="#6366F1"
            showLabels
          />
        </div>
      </section>
    </div>
  );
}
