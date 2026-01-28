import type { DeoScoreBreakdown } from '@/lib/deo-issues';
import { DEO_COMPONENT_METRICS, getScoreInterpretation } from '@/lib/dashboard-metrics';
import { MetricExplanation } from '@/components/common/MetricExplanation';

interface DeoComponentBreakdownProps {
  score: DeoScoreBreakdown | null;
}

export function DeoComponentBreakdown({ score }: DeoComponentBreakdownProps) {
  // [DASHBOARD-SIGNAL-REWRITE-1] Use centralized metric definitions
  const components = [
    { key: 'content' as const, metric: DEO_COMPONENT_METRICS.content },
    { key: 'entities' as const, metric: DEO_COMPONENT_METRICS.entities },
    { key: 'technical' as const, metric: DEO_COMPONENT_METRICS.technical },
    { key: 'visibility' as const, metric: DEO_COMPONENT_METRICS.visibility },
  ];

  const getColor = (value: number | null | undefined) => {
    if (value == null) return 'bg-gray-100 text-gray-500';
    if (value >= 80) return 'bg-green-50 text-green-700';
    if (value >= 60) return 'bg-yellow-50 text-yellow-700';
    if (value >= 40) return 'bg-orange-50 text-orange-700';
    return 'bg-red-50 text-red-700';
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Score Breakdown</h3>
        {/* [DASHBOARD-SIGNAL-REWRITE-1] Type indicator */}
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
          Observations
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Four areas that determine how easily customers can discover you.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {components.map(({ key, metric }) => {
          const value = score?.[key] ?? null;
          const color = getColor(value);
          const interpretation = getScoreInterpretation(value);
          return (
            <div
              key={key}
              className="rounded-md border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-center justify-between">
                {/* [DASHBOARD-SIGNAL-REWRITE-1] Label with inline explanation */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">
                    {metric.label}
                  </span>
                  <MetricExplanation metric={metric} value={value} mode="inline" size="sm" />
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}
                >
                  {value != null ? `${value}/100` : '--'}
                </span>
              </div>
              {/* [DASHBOARD-SIGNAL-REWRITE-1] Contextual status */}
              <p className={`mt-1 text-[11px] ${interpretation.colorClass}`}>
                {interpretation.label}
              </p>
              {/* [DASHBOARD-SIGNAL-REWRITE-1] Brief explanation always visible */}
              <p className="mt-1 text-[10px] text-gray-500 line-clamp-2">
                {metric.whatItMeasures}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
