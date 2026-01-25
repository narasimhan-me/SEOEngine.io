'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import { getDeoPillarById } from '@/lib/deo-pillars';
import type { DeoIssue, PerformanceSignalType } from '@/lib/deo-issues';
import InsightsPillarsSubnav from '@/components/projects/InsightsPillarsSubnav';
// [ISSUE-TO-FIX-PATH-1 FIXUP-2] Import safe title/description helpers to prevent internal ID leakage
import {
  getSafeIssueTitle,
  getSafeIssueDescription,
} from '@/lib/issue-to-fix-path';
// [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Shell header integration
import { useCenterPaneHeader } from '@/components/layout/CenterPaneHeaderProvider';

// PERFORMANCE-1 signal types for filtering
const PERFORMANCE_SIGNAL_TYPES: PerformanceSignalType[] = [
  'render_blocking',
  'indexability_risk',
  'ttfb_proxy',
  'page_weight_risk',
  'mobile_readiness',
];

// PERFORMANCE-1 issue types
const PERFORMANCE_ISSUE_TYPES = [
  'render_blocking_resources',
  'indexability_conflict',
  'slow_initial_response',
  'excessive_page_weight',
  'mobile_rendering_risk',
];

// Status configuration for display
type PerformanceStatus = 'Strong' | 'Needs improvement' | 'Risky';

const STATUS_CONFIG: Record<
  PerformanceStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  Strong: {
    label: 'Strong',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  'Needs improvement': {
    label: 'Needs Improvement',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  Risky: {
    label: 'Risky',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

// Signal display configuration
const SIGNAL_CONFIG: Record<
  PerformanceSignalType,
  { label: string; description: string; icon: string }
> = {
  render_blocking: {
    label: 'Render-blocking Resources',
    description: 'Scripts/styles blocking initial render',
    icon: '⏳',
  },
  indexability_risk: {
    label: 'Indexability',
    description: 'Noindex, canonical conflicts',
    icon: '🔍',
  },
  ttfb_proxy: {
    label: 'Initial Response',
    description: 'Large HTML indicating slow TTFB',
    icon: '⚡',
  },
  page_weight_risk: {
    label: 'Page Weight',
    description: 'Excessive HTML document size',
    icon: '📦',
  },
  mobile_readiness: {
    label: 'Mobile Readiness',
    description: 'Viewport and layout issues',
    icon: '📱',
  },
};

interface PerformanceScorecard {
  status: PerformanceStatus;
  issuesAffectingDiscovery: number;
  signals: {
    signalType: PerformanceSignalType;
    status: 'ok' | 'needs_attention' | 'risky';
    issueCount: number;
  }[];
}

/**
 * Compute a performance scorecard from DEO issues.
 * This is a heuristic based on the number and severity of performance-related issues.
 */
function computePerformanceScorecard(issues: DeoIssue[]): PerformanceScorecard {
  // Filter to PERFORMANCE-1 issues (either by signalType or issue type)
  const performanceIssues = issues.filter(
    (issue) =>
      (issue.signalType &&
        PERFORMANCE_SIGNAL_TYPES.includes(
          issue.signalType as PerformanceSignalType
        )) ||
      (issue.type && PERFORMANCE_ISSUE_TYPES.includes(issue.type))
  );

  // Map issue types to signal types
  const issueTypeToSignal: Record<string, PerformanceSignalType> = {
    render_blocking_resources: 'render_blocking',
    indexability_conflict: 'indexability_risk',
    slow_initial_response: 'ttfb_proxy',
    excessive_page_weight: 'page_weight_risk',
    mobile_rendering_risk: 'mobile_readiness',
  };

  // Build signal status map
  const signalStats = new Map<
    PerformanceSignalType,
    { count: number; hasCritical: boolean }
  >();

  for (const signalType of PERFORMANCE_SIGNAL_TYPES) {
    signalStats.set(signalType, { count: 0, hasCritical: false });
  }

  for (const issue of performanceIssues) {
    // Determine signal type from issue
    let signalType: PerformanceSignalType | undefined;
    if (
      issue.signalType &&
      PERFORMANCE_SIGNAL_TYPES.includes(
        issue.signalType as PerformanceSignalType
      )
    ) {
      signalType = issue.signalType as PerformanceSignalType;
    } else if (issue.type && issueTypeToSignal[issue.type]) {
      signalType = issueTypeToSignal[issue.type];
    }

    if (signalType) {
      const stats = signalStats.get(signalType)!;
      stats.count += issue.count;
      if (issue.severity === 'critical') {
        stats.hasCritical = true;
      }
    }
  }

  // Build signals array
  const signals = PERFORMANCE_SIGNAL_TYPES.map((signalType) => {
    const stats = signalStats.get(signalType)!;
    let status: 'ok' | 'needs_attention' | 'risky' = 'ok';
    if (stats.hasCritical || stats.count >= 5) {
      status = 'risky';
    } else if (stats.count > 0) {
      status = 'needs_attention';
    }
    return {
      signalType,
      status,
      issueCount: stats.count,
    };
  });

  // Compute overall status
  const totalIssues = performanceIssues.reduce(
    (sum, issue) => sum + issue.count,
    0
  );
  const hasCritical = performanceIssues.some(
    (issue) => issue.severity === 'critical'
  );
  const riskySignals = signals.filter((s) => s.status === 'risky').length;

  let status: PerformanceStatus = 'Strong';
  if (hasCritical || riskySignals >= 2 || totalIssues >= 10) {
    status = 'Risky';
  } else if (riskySignals >= 1 || totalIssues >= 3) {
    status = 'Needs improvement';
  }

  return {
    status,
    issuesAffectingDiscovery: totalIssues,
    signals,
  };
}

export default function TechnicalPerformancePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<PerformanceScorecard | null>(null);
  const [performanceIssues, setPerformanceIssues] = useState<DeoIssue[]>([]);

  const pillar = getDeoPillarById('technical_indexability');

  // [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Shell header integration
  const { setHeader } = useCenterPaneHeader();

  const fetchData = useCallback(async () => {
    if (!projectId || typeof projectId !== 'string') {
      console.warn('[TechnicalPerformancePage] Invalid projectId:', projectId);
      setError('Invalid project ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch project data and DEO issues in parallel
      const [projectData, issuesData] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.deoIssues(projectId),
      ]);

      setProjectName(projectData.name);

      // Filter issues to technical pillar and compute scorecard
      const technicalIssues = issuesData.issues.filter(
        (issue: DeoIssue) => issue.pillarId === 'technical_indexability'
      );

      // Further filter to PERFORMANCE-1 specific issues
      const perfIssues = technicalIssues.filter(
        (issue: DeoIssue) =>
          (issue.signalType &&
            PERFORMANCE_SIGNAL_TYPES.includes(
              issue.signalType as PerformanceSignalType
            )) ||
          (issue.type && PERFORMANCE_ISSUE_TYPES.includes(issue.type))
      );

      setPerformanceIssues(perfIssues);
      setScorecard(computePerformanceScorecard(technicalIssues));
    } catch (err) {
      console.error('[TechnicalPerformancePage] Failed to fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  // [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Set shell header
  useEffect(() => {
    setHeader({
      breadcrumbs: `Projects > ${projectName || projectId} > Insights`,
      title: 'Technical & Indexability',
      description:
        pillar?.description ||
        'Monitor crawl health, indexability status, page weight, and discovery-critical performance signals.',
    });
  }, [setHeader, projectName, projectId, pillar?.description]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="h-32 w-full rounded bg-gray-100" />
        <div className="h-64 w-full rounded bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const statusConfig = scorecard ? STATUS_CONFIG[scorecard.status] : null;

  return (
    <div>
      {/* [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] In-canvas breadcrumbs and header removed - shell header owns these */}

      <InsightsPillarsSubnav />

      {/* Why It Matters */}
      {pillar?.whyItMatters && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-blue-900">Why It Matters</h3>
          <p className="mt-1 text-sm text-blue-800">{pillar.whyItMatters}</p>
        </div>
      )}

      {/* Scorecard */}
      {scorecard && statusConfig ? (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Performance for Discovery
              </h2>
              <p className="text-sm text-gray-500">
                Signals that affect crawlability, rendering, and user-perceived
                speed
              </p>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
              >
                {statusConfig.label}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {scorecard.issuesAffectingDiscovery} issue
                {scorecard.issuesAffectingDiscovery !== 1 ? 's' : ''} affecting
                discovery
              </p>
            </div>
          </div>

          {/* Signal Breakdown */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">
              Signal Breakdown
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scorecard.signals.map((signal) => {
                const config = SIGNAL_CONFIG[signal.signalType];
                const signalStatus = signal.status;
                const bgColor =
                  signalStatus === 'ok'
                    ? 'bg-green-50 border-green-200'
                    : signalStatus === 'needs_attention'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200';
                const textColor =
                  signalStatus === 'ok'
                    ? 'text-green-700'
                    : signalStatus === 'needs_attention'
                      ? 'text-yellow-700'
                      : 'text-red-700';

                return (
                  <div
                    key={signal.signalType}
                    className={`rounded-lg border p-4 ${bgColor}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <span className={`text-sm font-medium ${textColor}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {config.description}
                    </p>
                    <div className="mt-2 flex items-end justify-between">
                      <span className={`text-2xl font-bold ${textColor}`}>
                        {signal.issueCount}
                      </span>
                      <span className="text-xs text-gray-500">
                        {signalStatus === 'ok'
                          ? 'OK'
                          : signalStatus === 'needs_attention'
                            ? 'Needs attention'
                            : 'Risky'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Issues Summary */}
          {scorecard.issuesAffectingDiscovery > 0 && (
            <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
              <p className="text-sm text-orange-800">
                <strong>{scorecard.issuesAffectingDiscovery}</strong>{' '}
                performance issue
                {scorecard.issuesAffectingDiscovery !== 1 ? 's' : ''} may affect
                how search engines and AI systems discover and render your
                content.
              </p>
              <Link
                href={`/projects/${projectId}/issues?pillar=technical_indexability`}
                className="mt-1 inline-block text-sm font-medium text-orange-700 hover:text-orange-900"
              >
                View Technical Issues →
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* No Data State */
        <div className="mb-8 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
          <h3 className="text-sm font-medium text-gray-700">
            No Performance Data Available
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Performance signals will appear here once your site has been
            crawled. Run a crawl to detect render-blocking resources,
            indexability issues, and page weight concerns.
          </p>
          <Link
            href={`/projects/${projectId}/settings`}
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Go to Settings →
          </Link>
        </div>
      )}

      {/* Performance Issues List */}
      {performanceIssues.length > 0 && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Performance Issues
          </h2>
          <div className="space-y-3">
            {performanceIssues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-md border border-gray-200 p-3 text-sm text-gray-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {/* [ISSUE-TO-FIX-PATH-1 FIXUP-2] Use safe title to prevent internal ID leakage */}
                      <span className="font-semibold">
                        {getSafeIssueTitle(issue)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          issue.severity === 'critical'
                            ? 'border border-red-200 bg-red-50 text-red-700'
                            : issue.severity === 'warning'
                              ? 'border border-orange-200 bg-orange-50 text-orange-700'
                              : 'border border-blue-200 bg-blue-50 text-blue-700'
                        }`}
                      >
                        {issue.severity === 'critical'
                          ? 'Critical'
                          : issue.severity === 'warning'
                            ? 'Warning'
                            : 'Info'}
                      </span>
                    </div>
                    {/* [ISSUE-TO-FIX-PATH-1 FIXUP-2] Use safe description to prevent internal ID leakage */}
                    <p className="mt-1 text-xs text-gray-500">
                      {getSafeIssueDescription(issue)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {issue.count} page{issue.count !== 1 ? 's' : ''} affected
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={`/projects/${projectId}/issues?pillar=technical_indexability`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <span className="text-2xl">🔍</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                View All Technical Issues
              </p>
              <p className="text-xs text-gray-500">
                See indexability, crawl, and performance issues
              </p>
            </div>
          </Link>
          <Link
            href={`/projects/${projectId}/crawl`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <span className="text-2xl">🔄</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Run New Crawl</p>
              <p className="text-xs text-gray-500">
                Re-scan pages for fresh performance data
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Score Model Info */}
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">
          About Performance for Discovery
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          The Performance for Discovery score is a heuristic based on signals
          that affect how search engines and AI systems can crawl, render, and
          index your pages:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-500">
          <li>
            <strong className="text-gray-700">Render-blocking resources</strong>{' '}
            — Scripts/styles in &lt;head&gt; without async/defer
          </li>
          <li>
            <strong className="text-gray-700">Indexability conflicts</strong> —
            noindex directives, canonical mismatches
          </li>
          <li>
            <strong className="text-gray-700">Large HTML</strong> — Documents
            &gt;500KB may indicate slow TTFB
          </li>
          <li>
            <strong className="text-gray-700">Excessive page weight</strong> —
            Documents &gt;1MB are problematic
          </li>
          <li>
            <strong className="text-gray-700">Mobile readiness</strong> —
            Missing viewport meta, layout issues
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Status thresholds:{' '}
          <strong className="text-green-600">Strong (0-2 issues)</strong>,{' '}
          <strong className="text-yellow-600">
            Needs Improvement (3-9 issues)
          </strong>
          , or{' '}
          <strong className="text-red-600">
            Risky (10+ issues or critical)
          </strong>
        </p>
      </div>
    </div>
  );
}
