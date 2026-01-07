'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import type { ProjectInsightsResponse } from '@/lib/insights';
import { InsightsSubnav } from '@/components/projects/InsightsSubnav';
import InsightsPillarsSubnav from '@/components/projects/InsightsPillarsSubnav';
import { Sparkline } from '@/components/projects/Sparkline';
// [ISSUE-TO-FIX-PATH-1 FIXUP-2] Import safe title helper to prevent internal ID leakage
import { getSafeInsightsIssueTitle } from '@/lib/issue-to-fix-path';

/**
 * [INSIGHTS-1] Project Insights Dashboard
 *
 * Read-only derived insights page showing:
 * - Overview cards (improved, saved, resolved, next)
 * - DEO Progress trends
 * - Issue resolution metrics
 * - Opportunity signals
 *
 * Trust invariant: This page never triggers AI or mutations.
 */
export default function InsightsPage() {
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
      console.error('[InsightsPage] Failed to fetch insights:', err);
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
        <div className="text-gray-600">Loading insights...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  const { overview, progress, issueResolution, opportunities } = insights;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-600 mt-1">
          Read-only analytics derived from your DEO data. No AI calls, no mutations.
        </p>
      </div>

      {/* Subnav */}
      <InsightsSubnav projectId={projectId} activeTab="overview" />
      <InsightsPillarsSubnav />

      {/* Overview Cards */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Improved Card */}
        <div className="rounded-lg border border-green-100 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-900">Improved</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-700">
              {overview.improved.deoScore.current}
            </span>
            <span className="text-sm text-green-600">
              {overview.improved.deoScore.trend === 'up' && '+'}
              {overview.improved.deoScore.delta} pts
            </span>
          </div>
          <p className="mt-1 text-xs text-green-700">
            DEO Score vs {insights.window.days} days ago
          </p>
        </div>

        {/* Saved Card */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900">Saved</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">
              {overview.saved.aiRunsAvoidedViaReuse}
            </span>
            <span className="text-sm text-blue-600">
              AI runs avoided
            </span>
          </div>
          <p className="mt-1 text-xs text-blue-700">
            {overview.saved.reuseRatePercent}% reuse rate
          </p>
          <p className="mt-2 text-[11px] text-blue-600">
            {overview.saved.trust.invariantMessage}
          </p>
        </div>

        {/* Resolved Card */}
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
          <h3 className="text-sm font-semibold text-purple-900">Resolved</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700">
              {overview.resolved.actionsCount}
            </span>
            <span className="text-sm text-purple-600">
              fixes applied
            </span>
          </div>
          <p className="mt-1 text-xs text-purple-700">
            {overview.resolved.why}
          </p>
        </div>

        {/* Next Opportunity Card */}
        <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
          <h3 className="text-sm font-semibold text-orange-900">Next Opportunity</h3>
          {overview.next ? (
            <>
              <p className="mt-2 text-sm font-medium text-orange-800">
                {overview.next.title}
              </p>
              <p className="mt-1 text-xs text-orange-700">
                {overview.next.why}
              </p>
              <Link
                href={overview.next.href}
                className="mt-2 inline-flex text-xs font-medium text-orange-700 hover:text-orange-900"
              >
                View opportunity &rarr;
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-orange-700">
              No high-priority opportunities found
            </p>
          )}
        </div>
      </section>

      {/* [BILLING-GTM-1] Contextual Upgrade Prompt - appears when quota pressure is high or exhausted */}
      {(overview.saved.quota.usedPercent !== null && overview.saved.quota.usedPercent >= 80) || overview.saved.quota.remaining === 0 ? (
        <section className="mt-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-800">
                  {overview.saved.quota.remaining === 0 ? 'AI Quota Exhausted' : 'AI Quota Running Low'}
                </h3>
                <p className="mt-1 text-sm text-amber-700">
                  You&apos;ve saved {overview.saved.aiRunsAvoidedViaReuse} AI runs via reuse and applied {overview.resolved.actionsCount} fixes this period.
                  {overview.saved.quota.remaining === 0
                    ? ' Your quota has been fully used.'
                    : ` You're at ${overview.saved.quota.usedPercent}% of your monthly limit.`}
                </p>
                <p className="mt-2 text-xs text-amber-600">
                  {overview.saved.trust.invariantMessage}
                </p>
                <Link
                  href="/settings/billing"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900"
                >
                  Upgrade for more AI runs
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* DEO Progress Section */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">DEO Progress</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* DEO Score Trend */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">DEO Score Trend</h3>
            <Sparkline
              data={progress.deoScoreTrend.map(d => ({ x: d.date, y: d.score }))}
              height={120}
              color="#10B981"
            />
          </div>

          {/* Fixes Applied Trend */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Fixes Applied</h3>
            <Sparkline
              data={progress.fixesAppliedTrend.map(d => ({ x: d.date, y: d.count }))}
              height={120}
              color="#6366F1"
            />
          </div>
        </div>

        {/* Open Issues Now */}
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Open Issues</h3>
          <div className="flex gap-6">
            <div className="text-center">
              <span className="block text-2xl font-bold text-red-600">
                {progress.openIssuesNow.critical}
              </span>
              <span className="text-xs text-gray-500">Critical</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-bold text-yellow-600">
                {progress.openIssuesNow.warning}
              </span>
              <span className="text-xs text-gray-500">Warning</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-bold text-blue-600">
                {progress.openIssuesNow.info}
              </span>
              <span className="text-xs text-gray-500">Info</span>
            </div>
            <div className="text-center border-l pl-6">
              <span className="block text-2xl font-bold text-gray-900">
                {progress.openIssuesNow.total}
              </span>
              <span className="text-xs text-gray-500">Total</span>
            </div>
          </div>
        </div>
      </section>

      {/* Issue Resolution Section */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Issue Resolution</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* By Pillar */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">By Pillar</h3>
            <div className="space-y-3">
              {issueResolution.byPillar.map(pillar => (
                <div key={pillar.pillarId} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{pillar.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600">
                      {pillar.resolved} fixed
                    </span>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-sm text-gray-500">
                      {pillar.open} open
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent & High Impact */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">High-Impact Open Issues</h3>
            {issueResolution.openHighImpact.length === 0 ? (
              <p className="text-sm text-gray-500">No high-impact issues open</p>
            ) : (
              <ul className="space-y-2">
                {issueResolution.openHighImpact.slice(0, 5).map(issue => (
                  <li key={issue.issueId} className="flex items-center justify-between">
                    {/* [ISSUE-TO-FIX-PATH-1 FIXUP-2] Use safe title to prevent internal ID leakage */}
                    <span className="text-sm text-gray-700 truncate max-w-[200px]">
                      {getSafeInsightsIssueTitle(issue)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {issue.affectedCount} affected
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Opportunities Section */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Opportunities</h2>
        {opportunities.length === 0 ? (
          <p className="text-sm text-gray-500">No opportunities identified</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map(opp => (
              <Link
                key={opp.id}
                href={opp.href}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-gray-900">{opp.title}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
                    opp.estimatedImpact === 'high' ? 'bg-green-100 text-green-700' :
                    opp.estimatedImpact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {opp.estimatedImpact}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{opp.why}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase">{opp.pillarId}</span>
                  <span className="text-[10px] text-gray-400">|</span>
                  <span className="text-[10px] text-gray-400">{opp.fixType}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-8 border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-500">
          Generated at {new Date(insights.generatedAt).toLocaleString()} |{' '}
          Window: {insights.window.days} days ({insights.window.from} to {insights.window.to})
        </p>
      </footer>
    </div>
  );
}
