'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import type { ProjectInsightsResponse } from '@/lib/insights';
import { InsightsSubnav } from '@/components/projects/InsightsSubnav';

/**
 * [GEO-INSIGHTS-2] GEO Insights Page
 *
 * Displays GEO-specific metrics: answer readiness, intent coverage,
 * reuse efficiency, and trust trajectory. All data is read-only.
 */
export default function GeoInsightsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState<ProjectInsightsResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const fetchInsights = async () => {
      try {
        setLoading(true);
        const data = await projectsApi.insights(projectId);
        setInsights(data);
      } catch (err) {
        console.error('Error fetching insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to load insights');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [router, projectId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading GEO insights...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded border border-red-400 bg-red-100 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const geo = insights?.geoInsights;

  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm">
        <ol className="flex items-center gap-2 text-muted-foreground">
          <li>
            <Link href="/projects" className="hover:text-foreground">
              Projects
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/projects/${projectId}/overview`} className="hover:text-foreground">
              Project
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/projects/${projectId}/insights`} className="hover:text-foreground">
              Insights
            </Link>
          </li>
          <li>/</li>
          <li className="text-foreground">GEO Insights</li>
        </ol>
      </nav>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">GEO Insights</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/insights/geo-insights/export`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/10 bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Report
          </Link>
        </div>
      </div>

      <InsightsSubnav projectId={projectId} activeTab="geo-insights" />

      <div className="mt-6 space-y-8">
        {/* Overview Cards */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Answer Ready */}
            <div className="rounded-lg border border-border/10 bg-card p-4 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground">Answer Ready</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {geo?.overview.productsAnswerReadyPercent ?? 0}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground/70">
                {geo?.overview.productsAnswerReadyCount ?? 0} of {geo?.overview.productsTotal ?? 0} products
              </div>
            </div>

            {/* Total Answers */}
            <div className="rounded-lg border border-border/10 bg-card p-4 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground">Total Answers</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {geo?.overview.answersTotal ?? 0}
              </div>
              <div className="mt-1 text-xs text-muted-foreground/70">
                {geo?.overview.answersMultiIntentCount ?? 0} serve multiple intents
              </div>
            </div>

            {/* Reuse Rate */}
            <div className="rounded-lg border border-border/10 bg-card p-4 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground">Reuse Rate</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {geo?.overview.reuseRatePercent ?? 0}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground/70">
                Answers covering multiple intents
              </div>
            </div>

            {/* Trust Trajectory */}
            <div className="rounded-lg border border-border/10 bg-card p-4 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground">Improved Products</div>
              <div className="mt-1 text-2xl font-bold text-green-600 dark:text-green-500">
                {geo?.overview.trustTrajectory?.improvedProducts ?? 0}
              </div>
              <div className="mt-1 text-xs text-muted-foreground/70">
                {geo?.overview.trustTrajectory?.improvedEvents ?? 0} improvement events
              </div>
            </div>
          </div>

          {geo?.overview.whyThisMatters && (
            <p className="mt-3 text-sm text-muted-foreground">{geo.overview.whyThisMatters}</p>
          )}
        </section>

        {/* Attribution Readiness Distribution */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Attribution Readiness</h2>
          <div className="rounded-lg border border-border/10 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-green-500"></span>
                <span className="text-sm text-foreground">High: {geo?.overview.confidenceDistribution.high ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-yellow-500"></span>
                <span className="text-sm text-foreground">Medium: {geo?.overview.confidenceDistribution.medium ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-destructive"></span>
                <span className="text-sm text-foreground">Low: {geo?.overview.confidenceDistribution.low ?? 0}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Attribution readiness reflects how well your content is structured for potential extraction by answer engines.
              These are internal signals, not guarantees of external citation.
            </p>
          </div>
        </section>

        {/* Intent Coverage */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Intent Coverage</h2>
          <div className="rounded-lg border border-border/10 bg-card p-4 shadow-sm">
            <div className="space-y-3">
              {geo?.coverage.byIntent.map((intent) => (
                <div key={intent.intentType} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{intent.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {intent.productsCovered}/{intent.productsTotal} products
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {intent.coveragePercent}% coverage
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {geo?.coverage.gaps && geo.coverage.gaps.length > 0 && (
              <div className="mt-4 border-t border-border/10 pt-4">
                <h3 className="text-sm font-medium text-foreground">Coverage Gaps</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Intent types with no product coverage yet:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {geo.coverage.gaps.map((gap) => (
                    <span
                      key={gap}
                      className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
                    >
                      {gap.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {geo?.coverage.whyThisMatters && (
              <p className="mt-3 text-sm text-muted-foreground">{geo.coverage.whyThisMatters}</p>
            )}
          </div>
        </section>

        {/* Reuse Insights */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Answer Reuse</h2>
          <div className="rounded-lg border border-border/10 bg-card p-4 shadow-sm">
            {geo?.reuse.topReusedAnswers && geo.reuse.topReusedAnswers.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Top Reused Answers</h3>
                {geo.reuse.topReusedAnswers.map((answer) => (
                  <div key={answer.answerBlockId} className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={answer.href}
                        className="text-sm font-medium text-signal hover:underline"
                      >
                        {answer.productTitle}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{answer.questionText}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {answer.mappedIntents.length} intents served
                      </span>
                      {answer.potentialIntents.length > answer.mappedIntents.length && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          +{answer.potentialIntents.length - answer.mappedIntents.length} potential
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No multi-intent answers yet.</p>
            )}

            {geo?.reuse.couldBeReusedButArent && geo.reuse.couldBeReusedButArent.length > 0 && (
              <div className="mt-4 border-t border-border/10 pt-4">
                <h3 className="text-sm font-medium text-foreground">Could Be Reused</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  These answers have potential but are blocked by readiness signals:
                </p>
                <ul className="mt-2 space-y-2">
                  {geo.reuse.couldBeReusedButArent.map((answer) => (
                    <li key={answer.answerBlockId} className="text-sm text-muted-foreground">
                      <Link
                        href={answer.href}
                        className="font-medium text-signal hover:underline"
                      >
                        {answer.productTitle}
                      </Link>
                      <span className="ml-1">—</span>
                      <span className="ml-1 text-xs text-muted-foreground/70">
                        Blocked by: {answer.blockedBySignals.join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {geo?.reuse.whyThisMatters && (
              <p className="mt-3 text-sm text-muted-foreground">{geo.reuse.whyThisMatters}</p>
            )}
          </div>
        </section>

        {/* Trust Signals */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Trust Signals</h2>
          <div className="rounded-lg border border-border/10 bg-card p-4 shadow-sm">
            {geo?.trustSignals.topBlockers && geo.trustSignals.topBlockers.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-foreground">Top Blockers</h3>
                <ul className="mt-2 space-y-2">
                  {geo.trustSignals.topBlockers.map((blocker, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{blocker.label}</span>
                      <span className="text-muted-foreground">{blocker.affectedProducts} products</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {geo?.trustSignals.avgTimeToImproveHours != null && (
              <div className="mb-4">
                <span className="text-sm text-muted-foreground">
                  Avg. time to improve:{' '}
                  <span className="font-medium text-foreground">{geo?.trustSignals.avgTimeToImproveHours}h</span>
                </span>
              </div>
            )}

            {geo?.trustSignals.mostImproved && geo.trustSignals.mostImproved.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground">Most Improved</h3>
                <ul className="mt-2 space-y-2">
                  {geo.trustSignals.mostImproved.map((product) => (
                    <li key={product.productId} className="flex items-center justify-between text-sm">
                      <Link
                        href={product.href}
                        className="text-signal hover:underline"
                      >
                        {product.productTitle}
                      </Link>
                      <span className="text-muted-foreground">
                        {product.issuesResolvedCount} issues resolved
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {geo?.trustSignals.whyThisMatters && (
              <p className="mt-3 text-sm text-muted-foreground">{geo.trustSignals.whyThisMatters}</p>
            )}
          </div>
        </section>

        {/* GEO Opportunities */}
        {geo?.opportunities && geo.opportunities.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">GEO Opportunities</h2>
            <div className="space-y-3">
              {geo.opportunities.map((opp) => (
                <Link
                  key={opp.id}
                  href={opp.href}
                  className="block rounded-lg border border-border/10 bg-card p-4 shadow-sm transition-colors hover:border-signal/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">{opp.title}</h3>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs ${opp.category === 'coverage'
                              ? 'bg-blue-500/10 text-blue-500'
                              : opp.category === 'reuse'
                                ? 'bg-purple-500/10 text-purple-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                        >
                          {opp.category}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{opp.why}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${opp.estimatedImpact === 'high'
                          ? 'bg-green-500/10 text-green-500'
                          : opp.estimatedImpact === 'medium'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {opp.estimatedImpact} impact
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
