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
 * [INSIGHTS-1] Opportunity Signals Page
 *
 * View opportunities for DEO improvement across all pillars.
 */
export default function OpportunitySignalsPage() {
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
      console.error('[OpportunitySignalsPage] Failed to fetch insights:', err);
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

  const { opportunities, overview } = insights;

  // Group opportunities by impact
  const highImpact = opportunities.filter((o) => o.estimatedImpact === 'high');
  const mediumImpact = opportunities.filter(
    (o) => o.estimatedImpact === 'medium'
  );
  const lowImpact = opportunities.filter((o) => o.estimatedImpact === 'low');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Opportunity Signals
        </h1>
        <p className="text-gray-600 mt-1">
          Discover opportunities to improve your DEO score.
        </p>
      </div>

      <InsightsSubnav projectId={projectId} activeTab="opportunity-signals" />
      <InsightsPillarsSubnav />

      {/* Next Best Action */}
      {overview.next && (
        <section className="mt-6">
          <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wide">
                  Recommended Next Action
                </h3>
                <p className="mt-2 text-lg font-bold text-green-800">
                  {overview.next.title}
                </p>
                <p className="mt-1 text-sm text-green-700">
                  {overview.next.why}
                </p>
              </div>
              <Link
                href={overview.next.href}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                Take Action
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Summary Stats */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-center">
          <p className="text-3xl font-bold text-green-700">
            {highImpact.length}
          </p>
          <p className="text-sm text-green-600">High Impact</p>
        </div>
        <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-4 text-center">
          <p className="text-3xl font-bold text-yellow-700">
            {mediumImpact.length}
          </p>
          <p className="text-sm text-yellow-600">Medium Impact</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-3xl font-bold text-gray-600">{lowImpact.length}</p>
          <p className="text-sm text-gray-500">Low Impact</p>
        </div>
      </section>

      {/* High Impact Opportunities */}
      {highImpact.length > 0 && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            High Impact
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highImpact.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </section>
      )}

      {/* Medium Impact Opportunities */}
      {mediumImpact.length > 0 && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
            Medium Impact
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mediumImpact.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </section>
      )}

      {/* Low Impact Opportunities */}
      {lowImpact.length > 0 && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gray-400"></span>
            Low Impact
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lowImpact.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {opportunities.length === 0 && (
        <section className="mt-6">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <p className="mt-4 text-lg font-medium text-gray-900">
              Looking good!
            </p>
            <p className="mt-2 text-sm text-gray-500">
              No major opportunities identified. Keep up the great work!
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: ProjectInsightsResponse['opportunities'][0];
}

function OpportunityCard({ opportunity }: OpportunityCardProps) {
  return (
    <Link
      href={opportunity.href}
      className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-medium text-gray-900">
          {opportunity.title}
        </h4>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
            opportunity.fixType === 'automation'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {opportunity.fixType}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">{opportunity.why}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 uppercase">
          {opportunity.pillarId}
        </span>
        <span className="text-xs text-blue-600 font-medium">View &rarr;</span>
      </div>
    </Link>
  );
}
