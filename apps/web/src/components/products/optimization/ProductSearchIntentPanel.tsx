'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  searchIntentApi,
  type ProductSearchIntentResponse,
  type ProductIntentCoverage,
  type IntentFixDraft,
  type SearchIntentType,
  type IntentCoverageStatus,
  type IntentFixDraftType,
  type IntentFixPreviewResponse,
} from '@/lib/api';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

// Intent type labels for display
const INTENT_LABELS: Record<SearchIntentType, string> = {
  transactional: 'Transactional',
  comparative: 'Comparative',
  problem_use_case: 'Problem / Use Case',
  trust_validation: 'Trust / Validation',
  informational: 'Informational',
};

// Coverage status colors and labels
const STATUS_CONFIG: Record<
  IntentCoverageStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  covered: {
    label: 'Covered',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  partial: {
    label: 'Partial',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  weak: {
    label: 'Weak',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  none: { label: 'None', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

interface ProductSearchIntentPanelProps {
  productId: string;
}

export function ProductSearchIntentPanel({
  productId,
}: ProductSearchIntentPanelProps) {
  const feedback = useFeedback();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProductSearchIntentResponse | null>(null);

  // Preview/apply states
  const [previewingQuery, setPreviewingQuery] = useState<{
    intentType: SearchIntentType;
    query: string;
  } | null>(null);
  const [previewDraft, setPreviewDraft] = useState<IntentFixDraft | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyingDraft, setApplyingDraft] = useState(false);

  // Expanded intent type
  const [expandedIntent, setExpandedIntent] = useState<SearchIntentType | null>(
    null
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await searchIntentApi.getProductSearchIntent(productId);
      setData(response);
    } catch (err) {
      console.error('[ProductSearchIntentPanel] Failed to fetch:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load intent coverage'
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePreviewFix = useCallback(
    async (intentType: SearchIntentType, query: string) => {
      try {
        setPreviewLoading(true);
        setPreviewingQuery({ intentType, query });
        setPreviewDraft(null);

        const response: IntentFixPreviewResponse =
          await searchIntentApi.previewIntentFix(productId, {
            intentType,
            query,
            fixType: 'answer_block' as IntentFixDraftType, // Default to Answer Block
          });

        setPreviewDraft(response.draft);

        if (response.generatedWithAi) {
          feedback.showSuccess('AI generated a new fix suggestion.');
        } else {
          feedback.showSuccess('Retrieved cached fix suggestion (no AI call).');
        }
      } catch (err) {
        console.error('[ProductSearchIntentPanel] Preview failed:', err);
        feedback.showError(
          err instanceof Error ? err.message : 'Failed to generate preview'
        );
        setPreviewingQuery(null);
      } finally {
        setPreviewLoading(false);
      }
    },
    [productId, feedback]
  );

  const handleApplyFix = useCallback(async () => {
    if (!previewDraft) return;

    try {
      setApplyingDraft(true);

      await searchIntentApi.applyIntentFix(productId, {
        draftId: previewDraft.id,
        applyTarget: 'ANSWER_BLOCK',
      });

      feedback.showSuccess(
        'Fix applied successfully! Coverage will be recalculated.'
      );

      // Reset preview state
      setPreviewDraft(null);
      setPreviewingQuery(null);

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('[ProductSearchIntentPanel] Apply failed:', err);
      feedback.showError(
        err instanceof Error ? err.message : 'Failed to apply fix'
      );
    } finally {
      setApplyingDraft(false);
    }
  }, [productId, previewDraft, feedback, fetchData]);

  const handleCancelPreview = useCallback(() => {
    setPreviewDraft(null);
    setPreviewingQuery(null);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-8 w-full rounded bg-gray-100" />
          <div className="h-20 w-full rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-2 text-xs font-medium text-red-600 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { coverage, scorecard } = data;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Search & Intent Coverage
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              scorecard.status === 'Good'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {scorecard.overallScore}% coverage
          </span>
        </div>
        {scorecard.missingHighValueIntents > 0 && (
          <p className="mt-1 text-xs text-yellow-600">
            {scorecard.missingHighValueIntents} high-value intent
            {scorecard.missingHighValueIntents !== 1 ? 's' : ''} not covered
          </p>
        )}
      </div>

      {/* Intent Coverage Breakdown */}
      <div className="divide-y divide-gray-100">
        {coverage.map((cov) => (
          <IntentCoverageRow
            key={cov.intentType}
            coverage={cov}
            expanded={expandedIntent === cov.intentType}
            onToggle={() =>
              setExpandedIntent(
                expandedIntent === cov.intentType ? null : cov.intentType
              )
            }
            onPreview={handlePreviewFix}
            previewingQuery={previewingQuery}
            previewLoading={previewLoading}
          />
        ))}
      </div>

      {/* Preview Drawer */}
      {previewDraft && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Preview Fix</h4>
            <button
              type="button"
              onClick={handleCancelPreview}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            {previewDraft.draftType === 'answer_block' &&
              previewDraft.draftPayload.question && (
                <>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-500">
                      Question
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {previewDraft.draftPayload.question}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Answer
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {previewDraft.draftPayload.answer}
                    </p>
                  </div>
                </>
              )}
            {previewDraft.draftType === 'content_snippet' &&
              previewDraft.draftPayload.snippet && (
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Content Snippet
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {previewDraft.draftPayload.snippet}
                  </p>
                </div>
              )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyFix}
              disabled={applyingDraft}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {applyingDraft ? 'Applying...' : 'Apply as Answer Block'}
            </button>
            {!previewDraft.generatedWithAi && (
              <span className="text-xs text-gray-500">
                (Cached - no AI used)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface IntentCoverageRowProps {
  coverage: ProductIntentCoverage;
  expanded: boolean;
  onToggle: () => void;
  onPreview: (intentType: SearchIntentType, query: string) => void;
  previewingQuery: { intentType: SearchIntentType; query: string } | null;
  previewLoading: boolean;
}

function IntentCoverageRow({
  coverage,
  expanded,
  onToggle,
  onPreview,
  previewingQuery,
  previewLoading,
}: IntentCoverageRowProps) {
  const statusConfig = STATUS_CONFIG[coverage.coverageStatus];
  const isHighValue =
    coverage.intentType === 'transactional' ||
    coverage.intentType === 'comparative';

  return (
    <div className="px-4 py-3">
      {/* Row Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {INTENT_LABELS[coverage.intentType]}
          </span>
          {isHighValue && (
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
              High Value
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
          >
            {coverage.score}%
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Missing Queries */}
          {coverage.missingQueries.length > 0 && (
            <div>
              <h5 className="mb-1.5 text-xs font-medium text-red-600">
                Missing Coverage ({coverage.missingQueries.length})
              </h5>
              <div className="space-y-1.5">
                {coverage.missingQueries.slice(0, 5).map((query) => (
                  <QueryItem
                    key={query}
                    query={query}
                    status="missing"
                    intentType={coverage.intentType}
                    onPreview={onPreview}
                    isPreviewing={
                      previewingQuery?.intentType === coverage.intentType &&
                      previewingQuery?.query === query
                    }
                    isLoading={previewLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Weak Queries */}
          {coverage.weakQueries.length > 0 && (
            <div>
              <h5 className="mb-1.5 text-xs font-medium text-orange-600">
                Weak Coverage ({coverage.weakQueries.length})
              </h5>
              <div className="space-y-1.5">
                {coverage.weakQueries.slice(0, 5).map((query) => (
                  <QueryItem
                    key={query}
                    query={query}
                    status="weak"
                    intentType={coverage.intentType}
                    onPreview={onPreview}
                    isPreviewing={
                      previewingQuery?.intentType === coverage.intentType &&
                      previewingQuery?.query === query
                    }
                    isLoading={previewLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Covered Queries */}
          {coverage.coveredQueries.length > 0 && (
            <div>
              <h5 className="mb-1.5 text-xs font-medium text-green-600">
                Covered ({coverage.coveredQueries.length})
              </h5>
              <div className="space-y-1">
                {coverage.coveredQueries.slice(0, 3).map((query) => (
                  <div
                    key={query}
                    className="flex items-center gap-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700"
                  >
                    <svg
                      className="h-3 w-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="truncate">&quot;{query}&quot;</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {coverage.missingQueries.length === 0 &&
            coverage.weakQueries.length === 0 &&
            coverage.coveredQueries.length === 0 && (
              <p className="text-xs text-gray-500">
                No queries analyzed for this intent type.
              </p>
            )}
        </div>
      )}
    </div>
  );
}

interface QueryItemProps {
  query: string;
  status: 'missing' | 'weak';
  intentType: SearchIntentType;
  onPreview: (intentType: SearchIntentType, query: string) => void;
  isPreviewing: boolean;
  isLoading: boolean;
}

function QueryItem({
  query,
  status,
  intentType,
  onPreview,
  isPreviewing,
  isLoading,
}: QueryItemProps) {
  const bgColor = status === 'missing' ? 'bg-red-50' : 'bg-orange-50';
  const textColor = status === 'missing' ? 'text-red-700' : 'text-orange-700';

  return (
    <div
      className={`flex items-center justify-between rounded ${bgColor} px-2 py-1.5`}
    >
      <span className={`text-xs ${textColor} truncate pr-2`}>
        &quot;{query}&quot;
      </span>
      <button
        type="button"
        onClick={() => onPreview(intentType, query)}
        disabled={isLoading}
        className="flex-shrink-0 rounded bg-white px-2 py-0.5 text-[10px] font-medium text-blue-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {isPreviewing && isLoading ? 'Loading...' : 'Preview Fix (uses AI)'}
      </button>
    </div>
  );
}

export default ProductSearchIntentPanel;
