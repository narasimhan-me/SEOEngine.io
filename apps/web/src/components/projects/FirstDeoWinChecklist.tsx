'use client';

/**
 * Returns the appropriate CTA label for the "Connect your store" step.
 * - If storeDomain is available: "Connect {domain}"
 * - Otherwise: "Connect Shopify"
 */
function getConnectStoreCtaLabel(storeDomain?: string): string {
  if (storeDomain) {
    return `Connect ${storeDomain}`;
  }
  return 'Connect Shopify';
}

interface FirstDeoWinChecklistProps {
  projectName?: string;
  hasConnectedSource: boolean;
  hasRunCrawl: boolean;
  hasDeoScore: boolean;
  hasOptimizedThreeProducts: boolean;
  /** Whether the user has completed the "Review your DEO Score" step */
  hasReviewedDeoScore?: boolean;
  /** The Shopify store domain (e.g. "my-store.myshopify.com") for personalized CTA */
  storeDomain?: string;
  /** True when the OAuth connection flow is in progress */
  connectingSource?: boolean;
  onConnectSource: () => void;
  onRunFirstCrawl: () => void;
  onViewScoreAndIssues: () => void;
  onGoToProducts: () => void;
}

interface Step {
  id: string;
  label: string;
  description: string;
  done: boolean;
  ctaLabel: string;
  onAction: () => void;
}

export function FirstDeoWinChecklist({
  projectName,
  hasConnectedSource,
  hasRunCrawl,
  hasDeoScore,
  hasOptimizedThreeProducts,
  hasReviewedDeoScore,
  storeDomain,
  connectingSource,
  onConnectSource,
  onRunFirstCrawl,
  onViewScoreAndIssues,
  onGoToProducts,
}: FirstDeoWinChecklistProps) {
  const deoScoreStepDone = hasReviewedDeoScore ?? hasDeoScore;
  const steps: Step[] = [
    {
      id: 'connect_source',
      label: 'Connect your store',
      description:
        'Connect your Shopify store to crawl products and apply optimizations.',
      done: hasConnectedSource,
      ctaLabel: getConnectStoreCtaLabel(storeDomain),
      onAction: onConnectSource,
    },
    {
      id: 'run_first_crawl',
      label: 'Run your first crawl',
      description:
        'Run a crawl to discover pages, products, and surface DEO issues.',
      done: hasRunCrawl,
      ctaLabel: 'Run crawl',
      onAction: onRunFirstCrawl,
    },
    {
      id: 'review_deo_score',
      label: 'Review your DEO Score',
      description:
        'Review your DEO Score and top issues to understand your baseline.',
      done: deoScoreStepDone,
      ctaLabel: 'View DEO Score',
      onAction: onViewScoreAndIssues,
    },
    {
      id: 'optimize_three_products',
      label: 'Optimize 3 key products',
      description:
        'Apply AI-powered SEO optimizations to at least 3 key products.',
      done: hasOptimizedThreeProducts,
      ctaLabel: 'Optimize products',
      onAction: onGoToProducts,
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;

  const firstIncompleteIndex = steps.findIndex((step) => !step.done);

  // Show completion message briefly before hiding
  if (completedCount === steps.length) {
    return (
      <div
        className="rounded-lg border border-green-100 bg-green-50 p-4 shadow-sm mb-6"
        data-testid="first-deo-win-complete"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-green-900">
              First DEO win complete
            </p>
            <p className="mt-0.5 text-xs text-green-700">
              You&apos;ve taken the foundational steps to improve your site&apos;s discoverability.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm mb-6">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">First DEO win</h3>
        {projectName && (
          <p className="text-xs text-gray-500">for {projectName}</p>
        )}
      </div>

      <p className="text-xs text-gray-600 mb-3">
        Follow these steps to get your first DEO win. You can do this in about
        10 minutes.
      </p>

      <p className="text-xs font-medium text-gray-700 mb-4">
        {completedCount} of {steps.length} steps complete
      </p>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const isInProgress = !step.done && index === firstIncompleteIndex;
          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Status indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {step.done ? (
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  </svg>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${step.done ? 'text-gray-500' : 'text-gray-900'}`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  {step.done
                    ? 'Completed'
                    : isInProgress
                      ? 'In progress'
                      : 'Not started'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {step.description}
                </p>
              </div>

              {/* Action button */}
              <div className="flex-shrink-0">
                {step.done ? (
                  <button
                    onClick={step.onAction}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View
                  </button>
                ) : (
                  <button
                    onClick={step.onAction}
                    disabled={step.id === 'connect_source' && connectingSource}
                    className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {step.id === 'connect_source' && connectingSource
                      ? 'Connecting…'
                      : step.ctaLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
