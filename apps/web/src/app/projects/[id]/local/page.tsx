'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import { getDeoPillarById } from '@/lib/deo-pillars';
// [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Shell header integration
import { useCenterPaneHeader } from '@/components/layout/CenterPaneHeaderProvider';
import type {
  LocalDiscoveryScorecard,
  LocalSignal,
  LocalGap,
  LocalCoverageStatus,
  LocalApplicabilityStatus,
  LocalSignalType,
  ProjectLocalConfig,
} from '@/lib/local-discovery';
import {
  LOCAL_SIGNAL_LABELS,
  LOCAL_SIGNAL_DESCRIPTIONS,
  LOCAL_GAP_LABELS,
} from '@/lib/local-discovery';
import InsightsPillarsSubnav from '@/components/projects/InsightsPillarsSubnav';

// Coverage status colors and labels
const STATUS_CONFIG: Record<
  LocalCoverageStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  strong: {
    label: 'Strong',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  needs_improvement: {
    label: 'Needs Improvement',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  weak: {
    label: 'Weak',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

// Applicability status display
const APPLICABILITY_CONFIG: Record<
  LocalApplicabilityStatus,
  { label: string; bgColor: string; textColor: string; description: string }
> = {
  applicable: {
    label: 'Local Discovery Enabled',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    description: 'Local discovery optimization is active for this project.',
  },
  not_applicable: {
    label: 'Not Applicable',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    description:
      'Local discovery does not apply to this project. Global stores are not penalized for missing local signals.',
  },
  unknown: {
    label: 'Configuration Needed',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    description:
      'Configure your local settings to enable local discovery optimization.',
  },
};

// Signal type icons (simple emoji-based for now)
const SIGNAL_ICONS: Record<LocalSignalType, string> = {
  location_presence: '📍',
  local_intent_coverage: '🔍',
  local_trust_signals: '⭐',
  local_schema_readiness: '📋',
};

export default function LocalDiscoveryPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<LocalDiscoveryScorecard | null>(
    null
  );
  const [signals, setSignals] = useState<LocalSignal[]>([]);
  const [gaps, setGaps] = useState<LocalGap[]>([]);
  const [config, setConfig] = useState<ProjectLocalConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  const pillar = getDeoPillarById('local_discovery');

  // [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Shell header integration
  const { setHeader } = useCenterPaneHeader();

  const fetchData = useCallback(async () => {
    // Guard against invalid projectId
    if (!projectId || typeof projectId !== 'string') {
      console.warn('[LocalDiscoveryPage] Invalid projectId:', projectId);
      setError('Invalid project ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch project data first
      const projectData = await projectsApi.get(projectId);
      setProjectName(projectData.name);

      // Try to fetch local discovery data - may fail if endpoint not available
      try {
        const localData = await projectsApi.localDiscovery(projectId);
        setScorecard(localData.scorecard);
        setSignals(localData.signals);
        setGaps(localData.gaps);
      } catch (localErr) {
        console.warn(
          '[LocalDiscoveryPage] Local discovery data not available:',
          localErr
        );
        // Set default values for new/unconfigured projects
        setScorecard({
          projectId,
          applicabilityStatus: 'unknown',
          applicabilityReasons: ['no_local_indicators'],
          signalCounts: {
            location_presence: 0,
            local_intent_coverage: 0,
            local_trust_signals: 0,
            local_schema_readiness: 0,
          },
          missingLocalSignalsCount: 0,
          computedAt: new Date().toISOString(),
        });
        setSignals([]);
        setGaps([]);
      }

      // Try to fetch config - may be null for new projects
      try {
        const configData = await projectsApi.localConfig(projectId);
        setConfig(configData);
      } catch (configErr) {
        console.warn(
          '[LocalDiscoveryPage] Local config not available:',
          configErr
        );
        setConfig(null);
      }
    } catch (err) {
      console.error('[LocalDiscoveryPage] Failed to fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const updateConfig = useCallback(
    async (updates: Partial<ProjectLocalConfig>) => {
      try {
        setConfigLoading(true);
        const updatedConfig = await projectsApi.updateLocalConfig(
          projectId,
          updates
        );
        setConfig(updatedConfig);
        // Refetch data to get updated scorecard
        await fetchData();
      } catch (err) {
        console.error('[LocalDiscoveryPage] Failed to update config:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update configuration'
        );
      } finally {
        setConfigLoading(false);
      }
    },
    [projectId, fetchData]
  );

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
      title: 'Local Discovery',
      description:
        pillar?.description ||
        'Optimize for local search queries and geo-intent signals.',
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

  const applicabilityConfig = scorecard
    ? APPLICABILITY_CONFIG[scorecard.applicabilityStatus]
    : APPLICABILITY_CONFIG.unknown;

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

      {/* Applicability Status Banner */}
      <div
        className={`mb-6 rounded-lg border p-4 ${applicabilityConfig.bgColor} ${
          scorecard?.applicabilityStatus === 'applicable'
            ? 'border-blue-200'
            : scorecard?.applicabilityStatus === 'not_applicable'
              ? 'border-gray-200'
              : 'border-orange-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${applicabilityConfig.bgColor} ${applicabilityConfig.textColor}`}
            >
              {applicabilityConfig.label}
            </span>
            <p className={`mt-2 text-sm ${applicabilityConfig.textColor}`}>
              {applicabilityConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* Local Configuration */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Local Configuration
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Configure your local presence settings. Global stores can leave these
          disabled.
        </p>

        <div className="space-y-4">
          {/* Has Physical Location Toggle */}
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <div>
              <span className="text-sm font-medium text-gray-900">
                Has Physical Location
              </span>
              <p className="text-xs text-gray-500">
                Enable if your business has a physical store, showroom, or
                office
              </p>
            </div>
            <input
              type="checkbox"
              checked={config?.hasPhysicalLocation ?? false}
              onChange={(e) =>
                updateConfig({ hasPhysicalLocation: e.target.checked })
              }
              disabled={configLoading}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          {/* Enable Local Discovery Toggle */}
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <div>
              <span className="text-sm font-medium text-gray-900">
                Enable Local Discovery
              </span>
              <p className="text-xs text-gray-500">
                Manually enable local optimization even without physical
                location
              </p>
            </div>
            <input
              type="checkbox"
              checked={config?.enabled ?? false}
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
              disabled={configLoading}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          {/* Service Area Description */}
          {(config?.hasPhysicalLocation || config?.enabled) && (
            <div className="p-3 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Service Area Description
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Describe the geographic area you serve (e.g., &quot;Denver metro
                area&quot;, &quot;Front Range Colorado&quot;)
              </p>
              <input
                type="text"
                value={config?.serviceAreaDescription ?? ''}
                onChange={(e) =>
                  updateConfig({ serviceAreaDescription: e.target.value })
                }
                disabled={configLoading}
                placeholder="e.g., Denver metro area"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Only show scorecard and signals for applicable projects */}
      {scorecard?.applicabilityStatus === 'applicable' && (
        <>
          {/* Project Scorecard */}
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Local Discovery Score
                </h2>
                <p className="text-sm text-gray-500">
                  Based on{' '}
                  {Object.values(scorecard.signalCounts).reduce(
                    (a, b) => a + b,
                    0
                  )}{' '}
                  detected signals
                </p>
              </div>
              <div className="text-right">
                {scorecard.score !== undefined && scorecard.status && (
                  <>
                    <div
                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        STATUS_CONFIG[scorecard.status].bgColor
                      } ${STATUS_CONFIG[scorecard.status].textColor}`}
                    >
                      {scorecard.score}% Overall
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {STATUS_CONFIG[scorecard.status].label}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Signal Type Breakdown */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Signal Coverage
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    'location_presence',
                    'local_intent_coverage',
                    'local_trust_signals',
                    'local_schema_readiness',
                  ] as LocalSignalType[]
                ).map((signalType) => {
                  const count = scorecard.signalCounts[signalType];
                  const hasSignals = count > 0;

                  return (
                    <div
                      key={signalType}
                      className={`rounded-lg border p-4 ${
                        hasSignals
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {SIGNAL_ICONS[signalType]}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            hasSignals ? 'text-green-700' : 'text-gray-700'
                          }`}
                        >
                          {LOCAL_SIGNAL_LABELS[signalType]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {LOCAL_SIGNAL_DESCRIPTIONS[signalType]}
                      </p>
                      <div className="mt-2 flex items-end justify-between">
                        <span
                          className={`text-2xl font-bold ${
                            hasSignals ? 'text-green-700' : 'text-gray-400'
                          }`}
                        >
                          {count}
                        </span>
                        <span className="text-xs text-gray-500">
                          signal{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {scorecard.missingLocalSignalsCount > 0 && (
              <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
                <p className="text-sm text-orange-800">
                  <strong>{scorecard.missingLocalSignalsCount}</strong>{' '}
                  high-impact signal type
                  {scorecard.missingLocalSignalsCount !== 1 ? 's' : ''} missing.
                </p>
              </div>
            )}
          </div>

          {/* Detected Signals */}
          {signals.length > 0 && (
            <div className="mb-8 rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Detected Signals
                </h2>
                <p className="text-sm text-gray-500">
                  Local presence signals found for your project
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {signals.map((signal) => (
                  <div key={signal.id} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {SIGNAL_ICONS[signal.signalType]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {signal.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {signal.description}
                        </p>
                        {signal.url && (
                          <a
                            href={signal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-800"
                          >
                            View source →
                          </a>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {LOCAL_SIGNAL_LABELS[signal.signalType]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gaps / Opportunities */}
          {gaps.length > 0 && (
            <div className="mb-8 rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Opportunities
                </h2>
                <p className="text-sm text-gray-500">
                  Areas to improve your local discovery presence
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {gaps.map((gap) => (
                  <div key={gap.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              gap.severity === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : gap.severity === 'warning'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {gap.severity}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {LOCAL_GAP_LABELS[gap.gapType]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {gap.example}
                        </p>
                        <p className="mt-2 text-xs text-gray-700">
                          <strong>Recommended:</strong> {gap.recommendedAction}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Info for Non-Applicable Projects */}
      {scorecard?.applicabilityStatus === 'not_applicable' && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
          <h3 className="text-sm font-medium text-gray-700">
            No Action Required
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Your project is configured as a global store without local presence.
            This is perfectly fine - your DEO score will not be penalized for
            missing local signals.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            If your business has a physical location or serves specific
            geographic areas, enable local configuration above to unlock local
            discovery optimization.
          </p>
        </div>
      )}

      {/* About Section */}
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">
          About Local Discovery
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          This pillar helps stores with physical presence optimize for local
          search queries and geo-intent signals. Key signal types:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-500">
          <li>
            <strong>📍 Location Presence:</strong> Physical address, contact
            info, store hours
          </li>
          <li>
            <strong>🔍 Local Intent Coverage:</strong> &quot;Near me&quot; and
            city-specific search query coverage
          </li>
          <li>
            <strong>⭐ Local Trust Signals:</strong> Local reviews,
            testimonials, community involvement
          </li>
          <li>
            <strong>📋 Local Schema Readiness:</strong> LocalBusiness structured
            data
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          <strong className="text-green-600">Strong (&gt;70%)</strong>,{' '}
          <strong className="text-yellow-600">
            Needs Improvement (40-70%)
          </strong>
          , or <strong className="text-red-600">Weak (&lt;40%)</strong> based on
          signal coverage.
        </p>
      </div>
    </div>
  );
}
