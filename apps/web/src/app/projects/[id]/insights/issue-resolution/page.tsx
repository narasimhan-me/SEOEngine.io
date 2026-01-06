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
 * [INSIGHTS-1] Issue Resolution Page
 *
 * View issue resolution metrics by pillar, recent fixes, and high-impact issues.
 */
export default function IssueResolutionPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [insights, setInsights] = useState<ProjectInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.insights(projectId);
      setInsights(data);
    } catch (err) {
      console.error('[IssueResolutionPage] Failed to fetch insights:', err);
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

  const { issueResolution, progress } = insights;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Issue Resolution</h1>
        <p className="text-gray-600 mt-1">
          Track issue resolution progress across all pillars.
        </p>
      </div>

      <InsightsSubnav projectId={projectId} activeTab="issue-resolution" />
      <InsightsPillarsSubnav />

      {/* Summary Stats */}
      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{progress.openIssuesNow.total}</p>
          <p className="text-sm text-gray-500">Total Open</p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{progress.openIssuesNow.critical}</p>
          <p className="text-sm text-red-700">Critical</p>
        </div>
        <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{progress.openIssuesNow.warning}</p>
          <p className="text-sm text-yellow-700">Warning</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{progress.openIssuesNow.info}</p>
          <p className="text-sm text-blue-700">Info</p>
        </div>
      </section>

      {/* Average Time to Fix */}
      {issueResolution.avgTimeToFixHours !== null && (
        <section className="mt-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-500">Average Time to Fix</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {issueResolution.avgTimeToFixHours < 24
                ? `${issueResolution.avgTimeToFixHours.toFixed(1)} hours`
                : `${(issueResolution.avgTimeToFixHours / 24).toFixed(1)} days`}
            </p>
          </div>
        </section>
      )}

      {/* By Pillar */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolution by Pillar</h3>
        <div className="space-y-3">
          {issueResolution.byPillar.map(pillar => {
            const resolvedPercent = pillar.total > 0
              ? Math.round((pillar.resolved / pillar.total) * 100)
              : 0;
            return (
              <div key={pillar.pillarId} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{pillar.label}</span>
                  <span className="text-sm text-gray-500">
                    {pillar.resolved} / {pillar.total} fixed
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${resolvedPercent}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>{resolvedPercent}% resolved</span>
                  <span>{pillar.open} open</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Fixes */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Resolved</h3>
        {issueResolution.topRecent.length === 0 ? (
          <p className="text-sm text-gray-500">No recent resolutions</p>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {issueResolution.topRecent.map(issue => (
              <div key={issue.issueId} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                  <p className="text-xs text-gray-500">{issue.pillarId}</p>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(issue.resolvedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* High Impact Open */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">High-Impact Open Issues</h3>
        {issueResolution.openHighImpact.length === 0 ? (
          <p className="text-sm text-gray-500">No high-impact issues open</p>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {issueResolution.openHighImpact.map(issue => (
              <div key={issue.issueId} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                  <p className="text-xs text-gray-500">{issue.pillarId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {issue.severity}
                  </span>
                  <span className="text-xs text-gray-500">{issue.affectedCount} affected</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Link
            href={`/projects/${projectId}/issues`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all issues &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
