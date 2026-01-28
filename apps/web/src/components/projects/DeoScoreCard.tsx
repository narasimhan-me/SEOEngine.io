import type { DeoScoreBreakdown } from '@/lib/deo-issues';
import { DEO_SCORE_METRIC, getScoreInterpretation } from '@/lib/dashboard-metrics';
import { MetricExplanation } from '@/components/common/MetricExplanation';

interface DeoScoreCardProps {
  score: DeoScoreBreakdown | null;
  lastComputedAt?: string | null;
  onRunFirstCrawl?: () => void;
}

export function DeoScoreCard({
  score,
  lastComputedAt,
  onRunFirstCrawl,
}: DeoScoreCardProps) {
  const overall = score?.overall ?? null;
  const formattedDate = lastComputedAt
    ? new Date(lastComputedAt).toLocaleString()
    : null;

  const interpretation = getScoreInterpretation(overall);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          {/* [DASHBOARD-SIGNAL-REWRITE-1] Clear label with explanation */}
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-medium text-gray-700">{DEO_SCORE_METRIC.label}</h2>
            <MetricExplanation metric={DEO_SCORE_METRIC} value={overall} mode="inline" size="sm" />
          </div>
          <p className={`mt-2 text-4xl font-semibold ${interpretation.colorClass}`}>
            {overall != null ? `${overall}` : '--'}
            <span className="ml-1 text-base font-normal text-gray-400">
              /100
            </span>
          </p>
          {/* [DASHBOARD-SIGNAL-REWRITE-1] Status label with explanation */}
          {overall != null && (
            <p className={`mt-1 text-xs font-medium ${interpretation.colorClass}`}>
              {interpretation.label}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end">
          {/* [DASHBOARD-SIGNAL-REWRITE-1] Type indicator (Observation) */}
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            Observation
          </span>
          {formattedDate && (
            <span className="mt-2 text-xs text-gray-500">
              Last updated:{' '}
              <span className="font-medium text-gray-700">{formattedDate}</span>
            </span>
          )}
        </div>
      </div>
      {overall == null ? (
        <div className="mt-3">
          {/* [DASHBOARD-SIGNAL-REWRITE-1] Clear explanation of what happens next */}
          <p className="text-xs text-gray-500 mb-2">
            No score yet. Run your first crawl to measure how discoverable your site
            is across search engines and AI assistants.
          </p>
          {onRunFirstCrawl && (
            <button
              onClick={onRunFirstCrawl}
              className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Run first crawl
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3">
          {/* [DASHBOARD-SIGNAL-REWRITE-1] Contextual interpretation */}
          <p className="text-xs text-gray-600">
            {interpretation.description}
          </p>
          <p className="mt-2 text-[11px] text-gray-500">
            Based on Content Quality, Product Identity, Site Health, and Search Readiness.
          </p>
        </div>
      )}
    </div>
  );
}
