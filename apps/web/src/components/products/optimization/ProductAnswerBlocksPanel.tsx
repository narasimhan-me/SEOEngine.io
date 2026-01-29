'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ANSWER_QUESTION_LABELS,
  type AnswerBlockQuestionId,
} from '@/lib/answer-engine';
import { productsApi, ApiError } from '@/lib/api';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { useUnsavedChanges } from '@/components/unsaved-changes/UnsavedChangesProvider';

interface PersistedAnswerBlock {
  id: string;
  questionId: string;
  questionText: string;
  answerText: string;
  confidenceScore: number;
  sourceType: string;
  updatedAt: string;
}

interface ProductAnswerBlocksPanelProps {
  productId: string;
  planId: string | null;
  aeoSyncToShopifyMetafields?: boolean;
  onBlocksLoaded?: (hasBlocks: boolean) => void;
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.8) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
        High confidence
      </span>
    );
  }
  if (confidence >= 0.5) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
        Medium confidence
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
      Low confidence
    </span>
  );
}

export function ProductAnswerBlocksPanel({
  productId,
  planId,
  aeoSyncToShopifyMetafields,
  onBlocksLoaded,
}: ProductAnswerBlocksPanelProps) {
  const feedback = useFeedback();
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Wire into global unsaved changes provider
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [blocks, setBlocks] = useState<PersistedAnswerBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [automationRunning, setAutomationRunning] = useState(false);
  const [syncingToShopify, setSyncingToShopify] = useState(false);
  const [publishingPack, setPublishingPack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const isFreePlan = planId === 'free';

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Sync hasChanges with global provider
  useEffect(() => {
    setHasUnsavedChanges(hasChanges);
    return () => setHasUnsavedChanges(false); // Clean up on unmount
  }, [hasChanges, setHasUnsavedChanges]);

  const loadBlocks = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await productsApi.getAnswerBlocks(productId);
      const items: PersistedAnswerBlock[] = Array.isArray(data)
        ? data.map((block: any) => ({
            id: block.id,
            questionId: block.questionId,
            questionText: block.questionText,
            answerText: block.answerText,
            confidenceScore:
              typeof block.confidenceScore === 'number'
                ? block.confidenceScore
                : 0,
            sourceType: block.sourceType ?? 'generated',
            updatedAt: block.updatedAt,
          }))
        : [];
      setBlocks(items);
      if (onBlocksLoaded) {
        onBlocksLoaded(items.length > 0);
      }
      setHasChanges(false);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error loading Answer Blocks', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to load Answer Blocks. Please try again.';
      setError(message);
      if (onBlocksLoaded) {
        onBlocksLoaded(false);
      }
    } finally {
      setLoading(false);
    }
  }, [productId, onBlocksLoaded]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const handleAnswerChange = (id: string, value: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, answerText: value } : block
      )
    );
    setHasChanges(true);
  };

  const handleSave = useCallback(async () => {
    if (!productId) return;
    try {
      setSaving(true);
      setError(null);
      const payloadBlocks = blocks
        .filter((block) => block.answerText.trim().length > 0)
        .map((block) => ({
          questionId: block.questionId,
          question: block.questionText,
          answer: block.answerText,
          confidence: block.confidenceScore ?? 0.9,
          sourceType: 'userEdited',
          factsUsed: [] as string[],
        }));
      await productsApi.upsertAnswerBlocks(productId, payloadBlocks);
      setHasChanges(false);
      await loadBlocks();
      feedback.showSuccess('Answer Blocks saved successfully.');
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error saving Answer Blocks', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to save Answer Blocks. Please try again.';
      setError(message);
      feedback.showError(message);
    } finally {
      setSaving(false);
    }
  }, [blocks, productId, loadBlocks, feedback]);

  const handleTriggerAutomation = useCallback(async () => {
    if (!productId || isFreePlan) {
      return;
    }
    try {
      setAutomationRunning(true);
      setError(null);
      await productsApi.triggerAnswerBlockAutomation(
        productId,
        'issue_detected'
      );
      feedback.showSuccess(
        'Answer Block automation triggered. Refresh in a moment to see updates.'
      );
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error triggering Answer Block automation', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to trigger Answer Block automation. Please try again.';
      setError(message);
      feedback.showError(message);
    } finally {
      setAutomationRunning(false);
    }
  }, [productId, isFreePlan, feedback]);

  const handleManualSyncToShopify = useCallback(async () => {
    if (!productId) {
      return;
    }
    if (isFreePlan) {
      feedback.showLimit(
        'Shopify Answer Block metafield sync is available on paid plans. Upgrade to enable Answer Block sync.',
        '/settings/billing'
      );
      return;
    }
    try {
      setSyncingToShopify(true);
      setError(null);
      const result: any =
        await productsApi.syncAnswerBlocksToShopify(productId);
      if (!result) {
        feedback.showError(
          'Failed to sync Answer Blocks to Shopify. Please try again.'
        );
        return;
      }
      const status = result.status as string | undefined;
      const reason = result.reason as string | undefined;
      const syncedCount = result.syncedCount as number | undefined;
      if (status === 'succeeded') {
        const countMessage =
          typeof syncedCount === 'number' && syncedCount > 0
            ? `Synced ${syncedCount} Answer Block${
                syncedCount === 1 ? '' : 's'
              } to Shopify metafields.`
            : 'Answer Blocks synced to Shopify metafields.';
        feedback.showSuccess(countMessage);
      } else if (status === 'skipped') {
        if (reason === 'sync_toggle_off') {
          feedback.showInfo(
            'Sync is disabled in Project Settings. Enable "Sync Answer Blocks to Shopify metafields" to allow automatic sync.'
          );
        } else if (reason === 'plan_not_entitled') {
          feedback.showLimit(
            'Your current plan does not include Shopify Answer Block metafield sync. Upgrade to enable this feature.',
            '/settings/billing'
          );
        } else if (reason === 'daily_cap_reached') {
          feedback.showLimit(
            'Daily sync limit reached for Answer Blocks. Try again tomorrow or upgrade your plan for higher limits.',
            '/settings/billing'
          );
        } else {
          feedback.showInfo('Sync was skipped for this product.');
        }
      } else {
        const message =
          (Array.isArray(result.errors) && result.errors.length > 0
            ? result.errors.join(', ')
            : null) ||
          'Failed to sync Answer Blocks to Shopify. Please try again.';
        feedback.showError(message);
      }
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error syncing Answer Blocks to Shopify', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to sync Answer Blocks to Shopify. Please try again.';
      setError(message);
      feedback.showError(message);
    } finally {
      setSyncingToShopify(false);
    }
  }, [productId, isFreePlan, feedback]);


  const handlePublishAnswerPack = useCallback(async () => {
    if (!productId) return;
    if (isFreePlan) {
      feedback.showLimit(
        'Answer Pack publishing is available on paid plans. Upgrade to enable.',
        '/settings/billing'
      );
      return;
    }
    try {
      setPublishingPack(true);
      setError(null);
      await productsApi.publishAnswerPack(productId, {
        complianceMode: 'supplements_us',
        questionCount: 10,
        dryRun: false,
      });
      await loadBlocks();
      feedback.showSuccess(
        'Published Answer Pack: product description overwritten + Answer Blocks updated.'
      );
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error publishing Answer Pack', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to publish Answer Pack. Please try again.';
      setError(message);
      feedback.showError(message);
    } finally {
      setPublishingPack(false);
    }
  }, [productId, isFreePlan, loadBlocks, feedback]);

  const formatUpdatedAt = (value: string) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const planLabel =
    planId === 'pro'
      ? 'Pro plan'
      : planId === 'business'
        ? 'Business plan'
        : planId === 'free'
          ? 'Free plan'
          : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            Answer Blocks (Canonical Answers)
          </h3>
        </div>
        {planLabel && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {planLabel}
          </span>
        )}
      </div>
      <div className="mb-4 flex flex-col gap-2 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md">
          Structured, persistent answers that AI engines can safely reuse. These
          are your source of truth for Answer Engine Optimization (AEO).
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
            Canonical
          </span>
          {aeoSyncToShopifyMetafields && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-blue-700">
              Synced to Shopify
            </span>
          )}
          {!isFreePlan && (
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-indigo-700">
              Automation-Enabled
            </span>
          )}
        </div>
      </div>

      {isFreePlan && (
        <div className="mb-4 rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          Automatic Answer Block generation is not available on the Free plan.
          You can view and edit existing Answer Blocks, or{' '}
          <Link
            href="/settings/billing"
            className="font-semibold underline hover:text-indigo-900"
          >
            upgrade to Pro
          </Link>{' '}
          to enable Answer Block automations for all products.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <svg
            className="h-6 w-6 animate-spin text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">Loading Answer Blocks...</p>
        </div>
      )}

      {!loading && !error && blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6">
          <p className="mb-3 max-w-xs text-center text-sm text-gray-500">
            No canonical answers yet. Review AI Answer previews to identify
            missing facts, then generate Answer Blocks.
          </p>
          <button
            type="button"
            onClick={handleTriggerAutomation}
            disabled={automationRunning || isFreePlan}
            className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              automationRunning || isFreePlan
                ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                : 'border border-transparent bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            {isFreePlan
              ? 'Upgrade to generate Answer Blocks'
              : 'Generate Answer Blocks'}
          </button>
        </div>
      )}

      {!loading && blocks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Persisted answers for key buyer questions.</span>
            <button
              type="button"
              onClick={loadBlocks}
              className="inline-flex items-center rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <svg
                className="mr-1 h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {blocks.map((block) => {
              const label =
                ANSWER_QUESTION_LABELS[
                  block.questionId as AnswerBlockQuestionId
                ] ?? block.questionText;
              const isUserEdited = block.sourceType === 'userEdited';
              return (
                <div
                  key={block.id}
                  className="rounded-md border border-gray-200 bg-white px-3 py-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {label}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {isUserEdited ? 'Edited by you' : 'AI-generated'}
                        {block.updatedAt && (
                          <span className="ml-1 text-gray-400">
                            · Updated {formatUpdatedAt(block.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getConfidenceBadge(block.confidenceScore)}
                      {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Removed questionId display (internal ID) */}
                    </div>
                  </div>
                  <textarea
                    className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={4}
                    value={block.answerText}
                    onChange={(e) =>
                      handleAnswerChange(block.id, e.target.value)
                    }
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex flex-col gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {hasChanges
                ? 'You have unsaved changes to Answer Blocks.'
                : 'Changes are saved and will be used by DEO Score, Issues, and automations.'}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  !hasChanges || saving
                    ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                    : 'border border-transparent bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {saving ? 'Saving…' : 'Save Answer Blocks'}
              </button>
              <button
                type="button"
                onClick={handlePublishAnswerPack}
                disabled={publishingPack || isFreePlan}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  publishingPack || isFreePlan
                    ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                    : 'border border-transparent bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {publishingPack ? 'Publishing…' : 'Publish Answer Pack (Overwrite)'}
              </button>
              <button
                type="button"
                onClick={handleTriggerAutomation}
                disabled={automationRunning || isFreePlan}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  automationRunning || isFreePlan
                    ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg
                  className="mr-2 h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Renamed to "Run Answer Block generation" */}
                {isFreePlan
                  ? 'Generation gated by plan'
                  : 'Run Answer Block generation'}
              </button>
              <button
                type="button"
                onClick={handleManualSyncToShopify}
                disabled={syncingToShopify}
                title="Syncs Answer Blocks to Shopify metafields. Does not change metadata or product content."
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  syncingToShopify
                    ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Renamed to "Sync answers to Shopify" */}
                {syncingToShopify ? 'Syncing…' : 'Sync answers to Shopify'}
              </button>
            </div>
            {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Inline guidance for actions */}
            <div className="mt-2 text-[11px] text-gray-500 space-y-1">
              <p>
                <strong>Generation:</strong> Creates or improves missing/weak
                Answer Blocks in EngineO. Syncs to Shopify only if enabled in
                Settings.
              </p>
              <p>
                <strong>Sync:</strong> Sends Answer Blocks to Shopify
                metafields. Does not change metadata or product content.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
