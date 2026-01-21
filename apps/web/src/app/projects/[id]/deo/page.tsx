'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { projectsApi } from '@/lib/api';
import type { DeoIssue } from '@/lib/deo-issues';
import type { ProjectOffsiteCoverage } from '@/lib/offsite-signals';
import { DEO_PILLARS, type DeoPillarId } from '@/lib/deo-pillars';
import { GuardedLink } from '@/components/navigation/GuardedLink';
import InsightsPillarsSubnav from '@/components/projects/InsightsPillarsSubnav';
// [ISSUE-TO-FIX-PATH-1 FIXUP-1] Import deterministic routing helpers
// [ISSUE-FIX-KIND-CLARITY-1] Import getIssueFixConfig for fixKind-aware CTA
import {
  buildIssueFixHref,
  getSafeIssueTitle,
  getIssueFixConfig,
} from '@/lib/issue-to-fix-path';

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
  const [offsiteScorecard, setOffsiteScorecard] =
    useState<ProjectOffsiteCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [issuesRes, scoreRes, offsiteRes] = await Promise.all([
          projectsApi.deoIssues(projectId),
          projectsApi.deoScore(projectId),
          projectsApi.offsiteScorecard(projectId).catch(() => null), // Don't fail if offsite not available
        ]);
        setDeoIssues(issuesRes);
        setDeoScore(scoreRes);
        setOffsiteScorecard(offsiteRes);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load DEO data'
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId]);

  // [ISSUE-TO-FIX-PATH-1 FIXUP-1] Group ACTIONABLE issues by pillar only
  // Non-actionable (orphan/external) issues should not drive pillar status badges or counts
  const actionableIssuesByPillar = useMemo(() => {
    const map = new Map<DeoPillarId, DeoIssue[]>();
    if (!deoIssues?.issues) return map;
    for (const issue of deoIssues.issues) {
      const pillarId = issue.pillarId;
      if (
        pillarId &&
        buildIssueFixHref({ projectId, issue, from: 'deo' }) !== null
      ) {
        const existing = map.get(pillarId) ?? [];
        existing.push(issue);
        map.set(pillarId, existing);
      }
    }
    return map;
  }, [deoIssues?.issues, projectId]);

  // [ISSUE-TO-FIX-PATH-1 FIXUP-1] Total actionable issues count for header
  const totalActionableIssues = useMemo(() => {
    if (!deoIssues?.issues) return 0;
    return deoIssues.issues.filter(
      (issue) => buildIssueFixHref({ projectId, issue, from: 'deo' }) !== null
    ).length;
  }, [deoIssues?.issues, projectId]);

  // [ISSUE-TO-FIX-PATH-1 FIXUP-1] Flat list of actionable issues for Top Recommended Actions
  const actionableIssuesList = useMemo(() => {
    if (!deoIssues?.issues) return [];
    return deoIssues.issues.filter(
      (issue) => buildIssueFixHref({ projectId, issue, from: 'deo' }) !== null
    );
  }, [deoIssues?.issues, projectId]);

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
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">DEO Overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          Discovery Engine Optimization across all pillars. Track your
          visibility in search engines, AI assistants, and discovery platforms.
        </p>
      </div>

      <InsightsPillarsSubnav />

      {/* Overall DEO Health Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Overall DEO Health
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {deoScore?.latestScore !== null &&
              deoScore?.latestScore !== undefined
                ? `${Math.round(deoScore.latestScore)}`
                : '--'}
            </div>
            <div className="text-xs text-gray-500">DEO Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {totalActionableIssues}
            </div>
            <div className="text-xs text-gray-500">Actionable Issues</div>
          </div>
          {deoIssues?.generatedAt && (
            <div className="text-xs text-gray-400">
              Last updated: {new Date(deoIssues.generatedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* [ISSUE-TO-FIX-PATH-1 FIXUP-1] Top 3 Recommended Actions (actionable only) */}
        {actionableIssuesList.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-700">
              Top Recommended Actions
            </h3>
            <ul className="mt-2 space-y-2">
              {actionableIssuesList.slice(0, 3).map((issue) => {
                const href = buildIssueFixHref({
                  projectId,
                  issue,
                  from: 'deo',
                });
                const safeTitle = getSafeIssueTitle(issue);
                // [ISSUE-FIX-KIND-CLARITY-1] Use "Review" for DIAGNOSTIC issues, "Fix now" otherwise
                const fixConfig = getIssueFixConfig(issue.type || issue.id);
                const ctaLabel =
                  fixConfig?.fixKind === 'DIAGNOSTIC' ? 'Review' : 'Fix now';
                return (
                  <li key={issue.id} className="text-sm text-gray-600">
                    <span className="font-medium">{safeTitle}</span>
                    {href && (
                      <GuardedLink
                        href={href}
                        className="ml-2 text-blue-600 hover:underline"
                        data-testid="deo-overview-issue-cta"
                      >
                        {ctaLabel}
                      </GuardedLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Pillar Scorecards Grid */}
      {/* [ISSUE-TO-FIX-PATH-1 FIXUP-1] Use actionable issues only for pillar status/counts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DEO_PILLARS.map((pillar) => {
          const pillarIssues = actionableIssuesByPillar.get(pillar.id) ?? [];
          const issueCount = pillarIssues.length;
          const hasCritical = pillarIssues.some(
            (i) => i.severity === 'critical'
          );
          const hasWarning = pillarIssues.some((i) => i.severity === 'warning');

          // Special handling for off-site signals pillar
          const isOffsitePillar = pillar.id === 'offsite_signals';
          const offsiteStatus = offsiteScorecard?.status;

          // Determine status badge
          let statusBadge: { label: string; className: string };
          if (isOffsitePillar && offsiteStatus) {
            // Use off-site scorecard status
            if (offsiteStatus === 'Low') {
              statusBadge = {
                label: 'Low',
                className: 'bg-red-100 text-red-700',
              };
            } else if (offsiteStatus === 'Medium') {
              statusBadge = {
                label: 'Medium',
                className: 'bg-yellow-100 text-yellow-700',
              };
            } else {
              statusBadge = {
                label: 'Strong',
                className: 'bg-green-100 text-green-700',
              };
            }
          } else if (issueCount === 0 && !pillar.comingSoon) {
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

              {/* Off-site specific info */}
              {isOffsitePillar && offsiteScorecard && (
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {offsiteScorecard.overallScore}
                    </span>
                    <span className="text-gray-500">/100 presence</span>
                  </div>
                  <div className="text-gray-500">
                    {offsiteScorecard.totalSignals} signals ·{' '}
                    {offsiteScorecard.highImpactGaps} gaps
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-gray-900">
                    {issueCount}
                  </span>
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

              <div className="mt-3 flex items-center justify-between">
                <GuardedLink
                  href={`/projects/${projectId}/issues?pillar=${pillar.id}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  View issues
                </GuardedLink>
                {isOffsitePillar && (
                  <GuardedLink
                    href={`/projects/${projectId}/backlinks`}
                    className="text-xs font-medium text-gray-600 hover:text-gray-800"
                  >
                    Go to workspace
                  </GuardedLink>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
