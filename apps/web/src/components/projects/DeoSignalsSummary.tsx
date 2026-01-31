import type { DeoScoreSignals } from '@/lib/deo-issues';
import { DEO_SIGNAL_METRICS, getScoreInterpretation } from '@/lib/dashboard-metrics';
import { MetricExplanation } from '@/components/common/MetricExplanation';

interface DeoSignalsSummaryProps {
  signals: DeoScoreSignals | null;
  loading: boolean;
}

// [DASHBOARD-SIGNAL-REWRITE-1] Use centralized metric definitions with clear labels
const crawlSignals = [
  { key: 'crawlHealth' as keyof DeoScoreSignals, metricId: 'crawlHealth' },
  { key: 'indexability' as keyof DeoScoreSignals, metricId: 'indexability' },
  { key: 'htmlStructuralQuality' as keyof DeoScoreSignals, metricId: 'htmlStructuralQuality' },
  { key: 'thinContentQuality' as keyof DeoScoreSignals, metricId: 'thinContentQuality' },
  { key: 'serpPresence' as keyof DeoScoreSignals, metricId: 'serpPresence' },
  { key: 'answerSurfacePresence' as keyof DeoScoreSignals, metricId: 'answerSurfacePresence' },
  { key: 'brandNavigationalStrength' as keyof DeoScoreSignals, metricId: 'brandNavigationalStrength' },
];

const productSignals = [
  { key: 'contentCoverage' as keyof DeoScoreSignals, metricId: 'contentCoverage' },
  { key: 'contentDepth' as keyof DeoScoreSignals, metricId: 'contentDepth' },
  { key: 'contentFreshness' as keyof DeoScoreSignals, metricId: 'contentFreshness' },
  { key: 'entityCoverage' as keyof DeoScoreSignals, metricId: 'entityCoverage' },
  { key: 'entityAccuracy' as keyof DeoScoreSignals, metricId: 'entityAccuracy' },
  { key: 'entityLinkage' as keyof DeoScoreSignals, metricId: 'entityLinkage' },
];

function SignalRow({
  signals,
  signalKey,
  metricId,
}: {
  signals: DeoScoreSignals | null;
  signalKey: keyof DeoScoreSignals;
  metricId: string;
}) {
  const raw = signals?.[signalKey] ?? null;
  const value =
    raw != null ? Math.round(Math.max(0, Math.min(1, raw)) * 100) : null;
  const barPercent = value != null ? `${value}%` : '0%';
  const barColor =
    value == null
      ? 'bg-gray-200'
      : value >= 80
        ? 'bg-green-500'
        : value >= 60
          ? 'bg-yellow-400'
          : value >= 40
            ? 'bg-orange-400'
            : 'bg-red-400';

  const metric = DEO_SIGNAL_METRICS[metricId];
  const interpretation = getScoreInterpretation(value);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs">
          {/* [DASHBOARD-SIGNAL-REWRITE-1] Clear label with explanation */}
          <div className="flex items-center gap-1">
            <span className="text-gray-600">{metric?.label ?? signalKey}</span>
            {metric && (
              <MetricExplanation metric={metric} value={value} mode="inline" size="sm" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] ${interpretation.colorClass}`}>
              {interpretation.label}
            </span>
            <span className="font-medium text-gray-800">
              {value != null ? `${value}` : '--'}
              {value != null && (
                <span className="ml-0.5 text-[10px] text-gray-400">/100</span>
              )}
            </span>
          </div>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: barPercent }}
          />
        </div>
      </div>
    </div>
  );
}

export function DeoSignalsSummary({
  signals,
  loading,
}: DeoSignalsSummaryProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Signal Details</h3>
        {/* [EA-45] Signal type indicator with advisory clarity */}
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
          Advisory Signals
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Individual measurements that feed into your Discovery Score.
        Hover over any signal name to learn what it measures and why it matters.
      </p>
      {/* [EA-45] Trust contract: signals are informational */}
      <p className="mt-1 text-[10px] text-gray-400 italic">
        These are observations, not requirements. Some signals have related playbooks you can explore when ready.
      </p>
      {loading ? (
        <div className="mt-4 text-xs text-gray-500">Loading signals...</div>
      ) : !signals ? (
        <div className="mt-4 text-xs text-gray-500">
          No signals available yet. Run a crawl to measure your site&apos;s discoverability.
        </div>
      ) : (
        <div className="mt-4 space-y-4 text-xs">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Site & Page Signals
            </h4>
            <p className="mb-2 text-[10px] text-gray-400">
              How well search engines can access and understand your pages
            </p>
            <div className="space-y-2">
              {crawlSignals.map((cfg) => (
                <SignalRow
                  key={cfg.key}
                  signals={signals}
                  signalKey={cfg.key}
                  metricId={cfg.metricId}
                />
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Product & Content Signals
            </h4>
            <p className="mb-2 text-[10px] text-gray-400">
              Quality and completeness of your product information
            </p>
            <div className="space-y-2">
              {productSignals.map((cfg) => (
                <SignalRow
                  key={cfg.key}
                  signals={signals}
                  signalKey={cfg.key}
                  metricId={cfg.metricId}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

