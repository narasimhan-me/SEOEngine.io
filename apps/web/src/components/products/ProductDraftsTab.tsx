/**
 * NON-AI BOUNDARY: Draft Review is human-only. Do not import aiApi or add AI generation actions here.
 *
 * [DRAFT-REVIEW-ISOLATION-1] Isolated Product Drafts Tab Component
 *
 * This module is intentionally isolated from AI-related code to enforce the locked statement:
 * "Draft Review stays human-only; AI is never invoked during Draft Review/Approval/Apply."
 *
 * FORBIDDEN IMPORTS (enforced by guard test draft-review-isolation-1.spec.ts):
 * - aiApi
 * - ProductAiSuggestionsPanel
 * - suggestProductMetadata
 * - generateProductAnswers
 * - AI_DAILY_LIMIT_REACHED
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

import { projectsApi, type AssetScopedDraftsResponse } from '@/lib/api';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
// [DRAFT-AI-ENTRYPOINT-CLARITY-1] AI boundary note for human-only review surface
import { DraftAiBoundaryNote } from '@/components/common/DraftAiBoundaryNote';

interface ProductDraftsTabProps {
  projectId: string;
  productId: string;
}

/**
 * Product Drafts Tab - Non-AI Draft Review
 *
 * Displays pending drafts for the product with inline edit capability.
 * Fetches drafts on mount (standard conditional tab behavior).
 */
export function ProductDraftsTab({ projectId, productId }: ProductDraftsTabProps) {
  const feedback = useFeedback();

  // Drafts data state
  const [draftsData, setDraftsData] = useState<AssetScopedDraftsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state: `${draftId}-${itemIndex}`
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch drafts on mount
  useEffect(() => {
    if (!productId) {
      return;
    }

    const fetchDrafts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await projectsApi.listAutomationPlaybookDraftsForAsset(projectId, {
          assetType: 'products',
          assetId: productId,
        });
        setDraftsData(data);
      } catch (err) {
        console.error('[DRAFT-REVIEW-ISOLATION-1] Failed to fetch drafts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load drafts');
      } finally {
        setLoading(false);
      }
    };

    fetchDrafts();
  }, [projectId, productId]);

  // Edit handlers
  const handleStartEdit = useCallback((draftId: string, itemIndex: number, currentValue: string) => {
    const editKey = `${draftId}-${itemIndex}`;
    setEditingItem(editKey);
    setEditValue(currentValue);
    setEditError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingItem(null);
    setEditValue('');
    setEditError(null);
  }, []);

  const handleSaveEdit = useCallback(async (draftId: string, itemIndex: number) => {
    setEditSaving(true);
    setEditError(null);

    try {
      const response = await projectsApi.updateDraftItem(projectId, draftId, itemIndex, editValue);

      // Update local state with the server response
      // [DRAFT-ENTRYPOINT-UNIFICATION-1-FIXUP-1] Use item.itemIndex for stable matching
      // (filteredItems is a subset; idx may not equal item.itemIndex)
      setDraftsData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          drafts: prev.drafts.map((draft) => {
            if (draft.id !== draftId) return draft;
            return {
              ...draft,
              updatedAt: response.updatedAt,
              filteredItems: draft.filteredItems.map((item, idx) => {
                // Use item.itemIndex for stable comparison; fall back to idx if absent
                const itemServerIndex = item.itemIndex ?? idx;
                if (itemServerIndex !== itemIndex) return item;
                return {
                  ...item,
                  finalSuggestion: editValue,
                };
              }),
            };
          }),
        };
      });

      // Exit edit mode
      setEditingItem(null);
      setEditValue('');
      feedback.showSuccess('Draft saved successfully');
    } catch (err) {
      console.error('[DRAFT-REVIEW-ISOLATION-1] Failed to save draft edit:', err);
      setEditError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  }, [projectId, editValue, feedback]);

  return (
    <section aria-label="Drafts" data-testid="drafts-tab-panel">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Drafts</h2>
      {/* [DRAFT-AI-ENTRYPOINT-CLARITY-1] Human-only review boundary note */}
      <DraftAiBoundaryNote mode="review" />
      <p className="mb-3 text-xs text-gray-500">
        Review and edit pending drafts for this product. Save changes before applying.
      </p>

      {/* Loading state */}
      {loading && (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-gray-600">Loading drafts...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Draft list or empty state */}
      {!loading && !error && (
        <>
          {draftsData && draftsData.drafts.length > 0 ? (
            <div data-testid="drafts-tab-list" className="space-y-4">
              {draftsData.drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {draft.playbookId === 'missing_seo_title'
                          ? 'SEO Title Suggestion'
                          : 'SEO Description Suggestion'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Status: {draft.status} · Updated:{' '}
                        {new Date(draft.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        draft.status === 'READY'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {draft.status}
                    </span>
                  </div>
                  {/* Render draft items with inline edit */}
                  {draft.filteredItems.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {draft.filteredItems.map((item, idx) => {
                        const hasCanonicalShape = item.field !== undefined;
                        const legacyItem = item as any;
                        const itemIndex = item.itemIndex ?? idx;
                        const editKey = `${draft.id}-${itemIndex}`;
                        const isEditing = editingItem === editKey;
                        const currentValue = item.finalSuggestion || item.rawSuggestion || '';

                        if (hasCanonicalShape) {
                          return (
                            <div
                              key={itemIndex}
                              data-testid={`drafts-tab-item-${draft.id}-${itemIndex}`}
                              className="rounded bg-gray-50 p-3 text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-700">
                                  {item.field === 'seoTitle' ? 'Title' : 'Description'}
                                </div>
                                {!isEditing && (
                                  <button
                                    type="button"
                                    data-testid={`drafts-tab-item-edit-${draft.id}-${itemIndex}`}
                                    onClick={() => handleStartEdit(draft.id, itemIndex, currentValue)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="mt-2">
                                  <textarea
                                    data-testid={`drafts-tab-item-input-${draft.id}-${itemIndex}`}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-full rounded border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    rows={item.field === 'seoDescription' ? 4 : 2}
                                    disabled={editSaving}
                                  />
                                  {editError && (
                                    <div className="mt-1 text-xs text-red-600">{editError}</div>
                                  )}
                                  <div className="mt-2 flex gap-2">
                                    <button
                                      type="button"
                                      data-testid={`drafts-tab-item-save-${draft.id}-${itemIndex}`}
                                      onClick={() => handleSaveEdit(draft.id, itemIndex)}
                                      disabled={editSaving}
                                      className="inline-flex items-center rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                      {editSaving ? 'Saving...' : 'Save changes'}
                                    </button>
                                    <button
                                      type="button"
                                      data-testid={`drafts-tab-item-cancel-${draft.id}-${itemIndex}`}
                                      onClick={handleCancelEdit}
                                      disabled={editSaving}
                                      className="inline-flex items-center rounded bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="mt-1 text-gray-900">
                                    {item.finalSuggestion || item.rawSuggestion || '(No suggestion)'}
                                  </div>
                                  {item.ruleWarnings && item.ruleWarnings.length > 0 && (
                                    <div className="mt-1 text-xs text-amber-600">
                                      Warnings: {item.ruleWarnings.join(', ')}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        } else {
                          // Legacy shape - read only
                          return (
                            <div key={idx} data-testid={`drafts-tab-item-${draft.id}-${idx}`} className="space-y-2">
                              {legacyItem.suggestedTitle && (
                                <div className="rounded bg-gray-50 p-3 text-sm">
                                  <div className="font-medium text-gray-700">Title</div>
                                  <div className="mt-1 text-gray-900">{legacyItem.suggestedTitle}</div>
                                </div>
                              )}
                              {legacyItem.suggestedDescription && (
                                <div className="rounded bg-gray-50 p-3 text-sm">
                                  <div className="font-medium text-gray-700">Description</div>
                                  <div className="mt-1 text-gray-900">{legacyItem.suggestedDescription}</div>
                                </div>
                              )}
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div
              data-testid="drafts-tab-empty"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center"
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No drafts saved for this product.
              </h3>
              <div className="mt-6">
                {/* Primary CTA: View issues - switches to Issues tab */}
                <Link
                  href={`/projects/${projectId}/products/${productId}?tab=issues`}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  View issues
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default ProductDraftsTab;
