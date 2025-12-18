'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';
import type { DeoIssue } from '@engineo/shared';
import { DEO_PILLARS, type DeoPillarId } from '@/lib/deo-pillars';
import { GuardedLink } from '@/components/navigation/GuardedLink';

interface DeoIssuesResponse {
  projectId: string;
  generatedAt: string;
  issues: DeoIssue[];
}

interface DeoScoreResponse {
  projectId: string;
  latestScore: number | null;
  scoreVersion: string | null;
}

export default function DeoOverviewPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [deoIssues, setDeoIssues] = useState<DeoIssuesResponse | null>(null);
  const [deoScore, setDeoScore] = useState<DeoScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [issuesRes, scoreRes] = await Promise.all([
          projectsApi.deoIssues(projectId),
          projectsApi.deoScore(projectId),
        ]);
        setDeoIssues(issuesRes);
        setDeoScore(scoreRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load DEO data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId]);

  // Group issues by pillar
  const issuesByPillar = new Map<DeoPillarId, DeoIssue[]>();
  if (deoIssues?.issues) {
    for (const issue of deoIssues.issues) {
      const pillarId = issue.pillarId;
      if (pillarId) {
        const existing = issuesByPillar.get(pillarId) ?? [];
        existing.push(issue);
        issuesByPillar.set(pillarId, existing);
      }
    }
  }

  const totalIssues = deoIssues?.issues?.length ?? 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">DEO Overview</h1>
        <div className="text-sm text-gray-500">Loading DEO data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">DEO Overview</h1>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">DEO Overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          Discovery Engine Optimization across all pillars. Track your visibility in
          search engines, AI assistants, and discovery platforms.
        </p>
      </div>

      {/* Overall DEO Health Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Overall DEO Health</h2>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {deoScore?.latestScore !== null && deoScore?.latestScore !== undefined
                ? `${Math.round(deoScore.latestScore)}`
                : '--'}
            </div>
            <div className="text-xs text-gray-500">DEO Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalIssues}</div>
            <div className="text-xs text-gray-500">DEO Issues</div>
          </div>
          {deoIssues?.generatedAt && (
            <div className="text-xs text-gray-400">
              Last updated: {new Date(deoIssues.generatedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Top 3 Recommended Actions */}
        {totalIssues > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-700">
              Top Recommended Actions
            </h3>
            <ul className="mt-2 space-y-2">
              {deoIssues?.issues?.slice(0, 3).map((issue) => (
                <li key={issue.id} className="text-sm text-gray-600">
                  <span className="font-medium">{issue.title}</span>
                  {issue.affectedProducts && issue.affectedProducts.length > 0 && (
                    <GuardedLink
                      href={`/projects/${projectId}/products/${issue.affectedProducts[0]}?focus=metadata`}
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      Fix now
                    </GuardedLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Pillar Scorecards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DEO_PILLARS.map((pillar) => {
          const pillarIssues = issuesByPillar.get(pillar.id) ?? [];
          const issueCount = pillarIssues.length;
          const hasCritical = pillarIssues.some((i) => i.severity === 'critical');
          const hasWarning = pillarIssues.some((i) => i.severity === 'warning');

          // Determine status badge
          let statusBadge: { label: string; className: string };
          if (issueCount === 0 && !pillar.comingSoon) {
            statusBadge = {
              label: 'Not analyzed yet',
              className: 'bg-gray-100 text-gray-600',
            };
          } else if (hasCritical) {
            statusBadge = {
              label: 'Needs attention',
              className: 'bg-red-100 text-red-700',
            };
          } else if (hasWarning) {
            statusBadge = {
              label: 'Review recommended',
              className: 'bg-orange-100 text-orange-700',
            };
          } else if (issueCount > 0) {
            statusBadge = {
              label: 'Minor issues',
              className: 'bg-blue-100 text-blue-700',
            };
          } else {
            statusBadge = {
              label: pillar.comingSoon ? 'Coming soon' : 'Not analyzed yet',
              className: 'bg-gray-100 text-gray-600',
            };
          }

          return (
            <div
              key={pillar.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {pillar.shortName}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                {pillar.description}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-gray-900">{issueCount}</span>
                  <span className="ml-1 text-xs text-gray-500">
                    DEO {issueCount === 1 ? 'issue' : 'issues'}
                  </span>
                </div>
                {deoIssues?.generatedAt && (
                  <div className="text-[10px] text-gray-400">
                    {new Date(deoIssues.generatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <GuardedLink
                  href={`/projects/${projectId}/issues?pillar=${pillar.id}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  View issues
                </GuardedLink>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
