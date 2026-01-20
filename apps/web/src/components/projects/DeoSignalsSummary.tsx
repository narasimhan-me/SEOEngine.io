import type { DeoScoreSignals } from '@/lib/deo-issues';

interface DeoSignalsSummaryProps {
  signals: DeoScoreSignals | null;
  loading: boolean;
}

interface SignalRowConfig {
  key: keyof DeoScoreSignals;
  label: string;
}

const crawlSignals: SignalRowConfig[] = [
  { key: 'crawlHealth', label: 'Crawl health' },
  { key: 'indexability', label: 'Indexability' },
  { key: 'htmlStructuralQuality', label: 'HTML structural quality' },
  { key: 'thinContentQuality', label: 'Thin content quality' },
  { key: 'serpPresence', label: 'SERP readiness' },
  { key: 'answerSurfacePresence', label: 'Answer surface readiness' },
  { key: 'brandNavigationalStrength', label: 'Brand navigational strength' },
];

const productSignals: SignalRowConfig[] = [
  { key: 'contentCoverage', label: 'Content coverage' },
  { key: 'contentDepth', label: 'Content depth' },
  { key: 'contentFreshness', label: 'Content freshness' },
  { key: 'entityCoverage', label: 'Entity coverage' },
  { key: 'entityAccuracy', label: 'Entity accuracy' },
  { key: 'entityLinkage', label: 'Entity linkage' },
];

function renderSignalRow(
  signals: DeoScoreSignals | null,
  config: SignalRowConfig
) {
  const raw = signals?.[config.key] ?? null;
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

  return (
    <div key={config.key} className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">{config.label}</span>
          <span className="font-medium text-gray-800">
            {value != null ? `${value}` : '--'}
            {value != null && (
              <span className="ml-0.5 text-[10px] text-gray-400">/100</span>
            )}
          </span>
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
      <h3 className="text-sm font-medium text-gray-700">DEO Signals Summary</h3>
      <p className="mt-1 text-xs text-gray-500">
        Key crawl and product signals used to compute the DEO Score.
      </p>
      {loading ? (
        <div className="mt-4 text-xs text-gray-500">Loading DEO signals...</div>
      ) : !signals ? (
        <div className="mt-4 text-xs text-gray-500">
          No DEO signals available yet. Run a crawl and recompute the DEO Score
          to populate this section.
        </div>
      ) : (
        <div className="mt-4 space-y-4 text-xs">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Crawl Signals
            </h4>
            <div className="space-y-2">
              {crawlSignals.map((cfg) => renderSignalRow(signals, cfg))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Product Signals
            </h4>
            <div className="space-y-2">
              {productSignals.map((cfg) => renderSignalRow(signals, cfg))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
