'use client';

import { useCallback, useEffect, useState } from 'react';

import { productsApi, ApiError } from '@/lib/api';
import type {
  ProductGeoReadinessResponse,
  GeoReadinessSignal,
  GeoIssue,
  GeoFixDraft,
} from '@/lib/geo';
import { getQuestionLabel, getConfidenceBadgeClass } from '@/lib/geo';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

// [DRAFT-CLARITY-AND-ACTION-TRUST-1] Collapsible explainer component
function CollapsibleExplainer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-600">
          {children}
        </div>
      )}
    </div>
  );
}

interface ProductGeoPanelProps {
  productId: string;
}

/**
 * [GEO-FOUNDATION-1] Product GEO Panel
 *
 * Displays GEO readiness signals, citation confidence, and issues
 * for a single product. Supports Preview/Apply flow for fixes.
 */
export function ProductGeoPanel({ productId }: ProductGeoPanelProps) {
  const feedback = useFeedback();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProductGeoReadinessResponse | null>(null);

  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<GeoFixDraft | null>(null);

  const fetchGeoReadiness = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productsApi.getGeoReadiness(productId);
      setData(response);
    } catch (err) {
      console.error('Error fetching GEO readiness:', err);
      setError(err instanceof Error ? err.message : 'Failed to load GEO data');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchGeoReadiness();
  }, [fetchGeoReadiness]);

  const handlePreview = useCallback(
    async (issue: GeoIssue) => {
      if (!issue.questionId) return;

      const key = `${issue.questionId}:${issue.issueType}`;
      try {
        setPreviewLoading(key);

        const response = await productsApi.previewGeoFix(productId, {
          questionId: issue.questionId,
          issueType: issue.issueType,
        });

        setSelectedDraft(response.draft);

        if (response.generatedWithAi) {
          feedback.showSuccess('AI generated improvement preview.');
        } else {
          feedback.showSuccess('Loaded cached preview (no AI used).');
        }
      } catch (err) {
        console.error('Error previewing GEO fix:', err);
        if (err instanceof ApiError && err.code === 'AI_DAILY_LIMIT_REACHED') {
          feedback.showLimit(
            'Daily AI limit reached. Your limit resets tomorrow, or upgrade to continue.',
            '/settings/billing',
          );
        } else {
          feedback.showError(err instanceof Error ? err.message : 'Failed to preview fix');
        }
      } finally {
        setPreviewLoading(null);
      }
    },
    [productId, feedback],
  );

  const handleApply = useCallback(
    async (draft: GeoFixDraft) => {
      try {
        setApplyLoading(draft.id);

        await productsApi.applyGeoFix(productId, { draftId: draft.id });

        feedback.showSuccess('Fix applied successfully. No AI was used.');
        setSelectedDraft(null);

        // Refresh data
        await fetchGeoReadiness();
      } catch (err) {
        console.error('Error applying GEO fix:', err);
        feedback.showError(err instanceof Error ? err.message : 'Failed to apply fix');
      } finally {
        setApplyLoading(null);
      }
    },
    [productId, feedback, fetchGeoReadiness],
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse">
          <div className="h-4 w-32 rounded bg-gray-200"></div>
          <div className="mt-4 space-y-3">
            <div className="h-3 w-full rounded bg-gray-200"></div>
            <div className="h-3 w-3/4 rounded bg-gray-200"></div>
          </div>
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
          onClick={fetchGeoReadiness}
          className="mt-2 text-sm text-red-600 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { evaluation, openDrafts } = data;
  const confidenceLevel = evaluation?.citationConfidence?.level ?? 'low';
  const confidenceReason = evaluation?.citationConfidence?.reason ?? 'No evaluation data available';

  return (
    <div className="space-y-6">
      {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] GEO/AEO Inline Education */}
      <div className="space-y-2">
        <CollapsibleExplainer title="What is GEO?">
          <p>
            Generative Engine Optimization measures how well your content can be understood,
            cited, and reused by AI answer engines.
          </p>
        </CollapsibleExplainer>
        <CollapsibleExplainer title="What is Citation Confidence?">
          <p className="mb-2">
            Citation Confidence indicates how likely AI engines are to cite your content as a trustworthy source.
            This is an estimate, not a guarantee.
          </p>
          <p className="font-medium mb-1">Ways to improve Citation Confidence:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Provide clear, factual answers to common questions</li>
            <li>Use structured data and semantic markup</li>
            <li>Keep content up-to-date and accurate</li>
            <li>Include authoritative sources and citations</li>
            <li>Ensure content is well-organized and scannable</li>
          </ul>
        </CollapsibleExplainer>
      </div>

      {/* Citation Confidence Badge */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Citation Confidence</h3>
            <p className="mt-1 text-xs text-gray-500">{confidenceReason}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getConfidenceBadgeClass(confidenceLevel)}`}
          >
            {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)}
          </span>
        </div>
      </div>

      {/* Readiness Signals */}
      {evaluation?.answerUnits && evaluation.answerUnits.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Readiness Signals</h3>
          <div className="space-y-4">
            {evaluation.answerUnits.map((unit) => (
              <div key={unit.unitId} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="mb-2 text-sm font-medium text-gray-800">
                  {getQuestionLabel(unit.questionId)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {unit.signals.map((signal) => (
                    <SignalBadge key={signal.signal} signal={signal} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GEO Issues */}
      {evaluation?.issues && evaluation.issues.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-700">GEO Issues</h3>
          <div className="space-y-3">
            {evaluation.issues.map((issue, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between rounded-md border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                      issue.severity === 'critical'
                        ? 'bg-red-500'
                        : issue.severity === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                    }`}
                  ></span>
                  <div>
                    <p className="text-sm text-gray-800">{issue.message}</p>
                    {issue.questionId && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Question: {getQuestionLabel(issue.questionId)}
                      </p>
                    )}
                  </div>
                </div>
                {issue.questionId && (
                  <button
                    type="button"
                    onClick={() => handlePreview(issue)}
                    disabled={previewLoading !== null}
                    className="ml-2 rounded-md border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                  >
                    {previewLoading === `${issue.questionId}:${issue.issueType}`
                      ? 'Loading...'
                      : 'Preview Fix (uses AI)'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Issues State */}
      {evaluation?.issues?.length === 0 && evaluation?.answerUnits?.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">
            All readiness signals pass. This product has high citation confidence.
          </p>
        </div>
      )}

      {/* Preview Modal/Drawer */}
      {selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Preview Fix</h3>
              <button
                type="button"
                onClick={() => setSelectedDraft(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Question:</span>{' '}
                {getQuestionLabel(selectedDraft.questionId)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Issue:</span>{' '}
                {selectedDraft.issueType.replace(/_/g, ' ')}
              </p>
            </div>

            {selectedDraft.draftPayload.improvedAnswer && (
              <div className="mb-4">
                <p className="mb-1 text-sm font-medium text-gray-700">Improved Answer:</p>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                  {selectedDraft.draftPayload.improvedAnswer}
                </div>
              </div>
            )}

            {selectedDraft.draftPayload.suggestedStructure && (
              <div className="mb-4">
                <p className="mb-1 text-sm font-medium text-gray-700">Suggested Structure:</p>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                  {selectedDraft.draftPayload.suggestedStructure}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">
                {selectedDraft.generatedWithAi
                  ? 'Generated with AI'
                  : 'Loaded from cache (no AI used)'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDraft(null)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApply(selectedDraft)}
                  disabled={applyLoading !== null}
                  className="rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {applyLoading === selectedDraft.id ? 'Applying...' : 'Apply Fix'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open Drafts (if any) */}
      {openDrafts && openDrafts.length > 0 && !selectedDraft && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-blue-800">Pending Drafts</h3>
          <p className="mb-3 text-xs text-blue-700">
            You have {openDrafts.length} cached draft(s) ready to apply.
          </p>
          <div className="space-y-2">
            {openDrafts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  {getQuestionLabel(draft.questionId)} – {draft.issueType.replace(/_/g, ' ')}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDraft(draft)}
                  className="text-xs font-medium text-blue-600 underline hover:text-blue-800"
                >
                  View & Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SignalBadge({ signal }: { signal: GeoReadinessSignal }) {
  const isPassing = signal.status === 'pass';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
        isPassing ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
      }`}
      title={signal.why}
    >
      {isPassing ? (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {signal.signal.charAt(0).toUpperCase() + signal.signal.slice(1)}
    </span>
  );
}
