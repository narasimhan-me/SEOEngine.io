import Link from 'next/link';
import type { DeoScoreSignals } from '@/lib/deo-issues';
import {
  HEALTH_CARD_TO_WORK_QUEUE_MAP,
  buildWorkQueueUrl,
} from '@/lib/work-queue';
import { HEALTH_CARD_METRICS } from '@/lib/dashboard-metrics';
import { MetricExplanation } from '@/components/common/MetricExplanation';

interface ProjectHealthCardsProps {
  signals: DeoScoreSignals | null;
  projectId: string;
}

/**
 * [DASHBOARD-SIGNAL-REWRITE-1] Health cards with clear explanations.
 */
export function ProjectHealthCards({
  signals,
  projectId,
}: ProjectHealthCardsProps) {
  const s = signals ?? {};

  const missingMetadataSeverity = 1 - (s.contentCoverage ?? 0);
  const thinContentSeverity = 1 - (s.thinContentQuality ?? 0);
  const weakEntitySeverity = 1 - (s.entityCoverage ?? 0);
  const lowVisibilitySeverity = 1 - (s.serpPresence ?? 0);
  const crawlErrorSeverity = 1 - (s.crawlHealth ?? 0);

  // [DASHBOARD-SIGNAL-REWRITE-1] Cards with centralized metric definitions
  const cards = [
    {
      key: 'missing-metadata',
      severity: missingMetadataSeverity,
      metric: HEALTH_CARD_METRICS['missing-metadata'],
    },
    {
      key: 'thin-content',
      severity: thinContentSeverity,
      metric: HEALTH_CARD_METRICS['thin-content'],
    },
    {
      key: 'weak-entities',
      severity: weakEntitySeverity,
      metric: HEALTH_CARD_METRICS['weak-entities'],
    },
    {
      key: 'low-visibility',
      severity: lowVisibilitySeverity,
      metric: HEALTH_CARD_METRICS['low-visibility'],
    },
    {
      key: 'crawl-errors',
      severity: crawlErrorSeverity,
      metric: HEALTH_CARD_METRICS['crawl-errors'],
    },
  ];

  // [DASHBOARD-SIGNAL-REWRITE-1] Clear, non-alarming status labels
  const getStatusLabel = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    if (v < 0.2) return 'Healthy';
    if (v < 0.4) return 'Some gaps';
    if (v < 0.7) return 'Needs work';
    return 'Priority';
  };

  const getStatusColor = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    if (v < 0.2) return 'bg-green-50 text-green-700 border-green-100';
    if (v < 0.4) return 'bg-yellow-50 text-yellow-700 border-yellow-100';
    if (v < 0.7) return 'bg-orange-50 text-orange-700 border-orange-100';
    return 'bg-red-50 text-red-700 border-red-100';
  };

  const getWorkQueueUrl = (cardKey: string) => {
    const mapping = HEALTH_CARD_TO_WORK_QUEUE_MAP[cardKey];
    if (mapping) {
      return buildWorkQueueUrl(projectId, {
        tab: mapping.tab,
        actionKey: mapping.actionKey,
      });
    }
    return buildWorkQueueUrl(projectId);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Issue Categories</h3>
        {/* [DASHBOARD-SIGNAL-REWRITE-1] Type indicator */}
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
          Observations
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Areas where improvements could increase your discoverability.
        Click any card to see specific items to address.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const severity = card.severity ?? 0;
          const label = getStatusLabel(severity);
          const color = getStatusColor(severity);
          const workQueueUrl = getWorkQueueUrl(card.key);

          return (
            <Link
              key={card.key}
              href={workQueueUrl}
              className={`flex flex-col rounded-md border p-3 text-xs transition-all hover:ring-2 hover:ring-blue-300 ${color}`}
            >
              <div className="flex items-center justify-between">
                {/* [DASHBOARD-SIGNAL-REWRITE-1] Clear label with inline explanation */}
                <div className="flex items-center gap-1">
                  <span className="font-medium">{card.metric.label}</span>
                  <MetricExplanation metric={card.metric} mode="inline" size="sm" />
                </div>
                <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-semibold">
                  {label}
                </span>
              </div>
              {/* [DASHBOARD-SIGNAL-REWRITE-1] Clear description of what this measures */}
              <p className="mt-1 text-[11px] opacity-80">{card.metric.whatItMeasures}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
