'use client';

import Link from 'next/link';

/**
 * [EA-38] Progress Reinforcement Card
 *
 * Displays factual summaries of what the user has improved, what's safer now,
 * and what value they've gained. Uses calm, confidence-building language
 * with no urgency, pressure, or implied automation.
 *
 * Trust Contract:
 * - All messaging is factual and calm
 * - No exaggeration of progress or value
 * - No urgency language or guilt triggers
 * - No implied automation or authority claims
 */

export interface ProgressReinforcementData {
  /** DEO Score progress */
  deoScore: {
    current: number;
    previous: number;
    delta: number;
  } | null;
  /** Number of products optimized */
  productsOptimized: number;
  /** Number of issues resolved */
  issuesResolved: number;
  /** Products with Answer Blocks */
  productsWithAnswerBlocks: number;
  /** Total products */
  totalProducts: number;
  /** Time window for these metrics (days) */
  windowDays?: number;
}

interface ProgressReinforcementCardProps {
  data: ProgressReinforcementData;
  projectId: string;
}

/**
 * Generates calm, factual progress summary text based on the data.
 * No urgency, no pressure, just factual observations.
 */
function getProgressSummary(data: ProgressReinforcementData): string {
  const improvements: string[] = [];

  if (data.deoScore && data.deoScore.delta > 0) {
    improvements.push(
      `Your Discovery Score has grown from ${data.deoScore.previous} to ${data.deoScore.current}`
    );
  }

  if (data.productsOptimized > 0) {
    const plural = data.productsOptimized === 1 ? 'product has' : 'products have';
    improvements.push(
      `${data.productsOptimized} ${plural} improved SEO metadata`
    );
  }

  if (data.issuesResolved > 0) {
    const plural = data.issuesResolved === 1 ? 'issue has' : 'issues have';
    improvements.push(`${data.issuesResolved} ${plural} been resolved`);
  }

  if (improvements.length === 0) {
    return '';
  }

  return improvements.join('. ') + '.';
}

/**
 * Determines if there's meaningful progress to display.
 */
function hasProgress(data: ProgressReinforcementData): boolean {
  const hasDeoImprovement = data.deoScore && data.deoScore.delta > 0;
  const hasOptimizedProducts = data.productsOptimized > 0;
  const hasResolvedIssues = data.issuesResolved > 0;

  return Boolean(hasDeoImprovement || hasOptimizedProducts || hasResolvedIssues);
}

export function ProgressReinforcementCard({
  data,
  projectId,
}: ProgressReinforcementCardProps) {
  // Only show when there's meaningful progress to reinforce
  if (!hasProgress(data)) {
    return null;
  }

  const progressSummary = getProgressSummary(data);
  const windowLabel = data.windowDays
    ? `over the last ${data.windowDays} days`
    : 'recently';

  return (
    <div
      className="rounded-lg border border-green-100 bg-green-50 p-4 shadow-sm mb-6"
      data-testid="progress-reinforcement-card"
    >
      <div className="flex items-start gap-3">
        {/* Icon - subtle checkmark */}
        <div className="flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-4 w-4 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-green-900">
            Progress you&apos;ve made
          </h3>
          <p className="mt-1 text-xs text-green-800">
            {progressSummary}
          </p>

          {/* Specific improvements list */}
          <ul className="mt-3 space-y-1.5">
            {data.deoScore && data.deoScore.delta > 0 && (
              <li className="flex items-center gap-2 text-xs text-green-700">
                <span className="flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-200 text-green-700 text-[10px] font-medium">
                  +{data.deoScore.delta}
                </span>
                <span>
                  Discovery Score improvement {windowLabel}
                </span>
              </li>
            )}

            {data.productsOptimized > 0 && (
              <li className="flex items-center gap-2 text-xs text-green-700">
                <span className="flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-200 text-green-700 text-[10px] font-medium">
                  {data.productsOptimized}
                </span>
                <span>
                  {data.productsOptimized === 1
                    ? 'product with improved metadata'
                    : 'products with improved metadata'}
                </span>
              </li>
            )}

            {data.issuesResolved > 0 && (
              <li className="flex items-center gap-2 text-xs text-green-700">
                <span className="flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-200 text-green-700 text-[10px] font-medium">
                  {data.issuesResolved}
                </span>
                <span>
                  {data.issuesResolved === 1
                    ? 'issue resolved'
                    : 'issues resolved'}
                </span>
              </li>
            )}

            {data.productsWithAnswerBlocks > 0 && (
              <li className="flex items-center gap-2 text-xs text-green-700">
                <span className="flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-200 text-green-700 text-[10px] font-medium">
                  {data.productsWithAnswerBlocks}
                </span>
                <span>
                  {data.productsWithAnswerBlocks === 1
                    ? 'product ready for AI answers'
                    : 'products ready for AI answers'}
                </span>
              </li>
            )}
          </ul>

          {/* Context footer - calm, factual */}
          <p className="mt-3 text-[11px] text-green-600">
            These improvements help search engines and AI assistants understand your products.
          </p>

          {/* Link to insights - optional, non-pushy */}
          <div className="mt-3">
            <Link
              href={`/projects/${projectId}/insights`}
              className="text-xs font-medium text-green-700 hover:text-green-900"
            >
              View detailed insights
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
