/**
 * NON-AI BOUNDARY: Draft Review is human-only. Do not import aiApi or add AI generation actions here.
 *
 * [DRAFT-REVIEW-ISOLATION-1] Isolated Asset Drafts Tab Component
 * [DRAFT-FIELD-COVERAGE-1] Generalized from ProductDraftsTab to support Products, Pages, and Collections
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

/**
 * [DRAFT-FIELD-COVERAGE-1] Asset type for draft review
 */
type AssetType = 'products' | 'pages' | 'collections';

/**
 * [DRAFT-DIFF-CLARITY-1] Current field values for diff display
 * Keyed by field name (seoTitle, seoDescription)
 */
interface CurrentFieldValues {
  seoTitle?: string | null;
  seoDescription?: string | null;
}

interface AssetDraftsTabProps {
  projectId: string;
  assetType: AssetType;
  assetId: string;
  /** [DRAFT-DIFF-CLARITY-1] Current/live field values for diff display */
  currentFieldValues?: CurrentFieldValues;
}

/**
 * [DRAFT-FIELD-COVERAGE-1] Field label map by asset type
 * Products: seoTitle → "SEO Title", seoDescription → "SEO Description"
 * Pages: seoTitle → "Page Title", seoDescription → "Meta Description"
 * Collections: seoTitle → "Collection Title", seoDescription → "Meta Description"
 */
const FIELD_LABEL_MAP: Record<AssetType, Record<string, string>> = {
  products: {
    seoTitle: 'SEO Title',
    seoDescription: 'SEO Description',
  },
  pages: {
    seoTitle: 'Page Title',
    seoDescription: 'Meta Description',
  },
  collections: {
    seoTitle: 'Collection Title',
    seoDescription: 'Meta Description',
  },
};

/**
 * Asset Drafts Tab - Non-AI Draft Review
 *
 * Displays pending drafts for the asset with inline edit capability.
 * Fetches drafts on mount (standard conditional tab behavior).
 * [DRAFT-DIFF-CLARITY-1] Shows Current (live) vs Draft (staged) diff for each item.
 * [DRAFT-FIELD-COVERAGE-1] Supports Products, Pages, and Collections asset types.
 */
export function AssetDraftsTab({ projectId, assetType, assetId, currentFieldValues }: AssetDraftsTabProps) {
  const feedback = useFeedback();

  // [DRAFT-FIELD-COVERAGE-1] Asset-specific label
  const assetLabel = assetType === 'products' ? 'product' : assetType === 'pages' ? 'page' : 'collection';

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
    if (!assetId) {
      return;
    }

    const fetchDrafts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await projectsApi.listAutomationPlaybookDraftsForAsset(projectId, {
          assetType,
          assetId,
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
  }, [projectId, assetType, assetId]);

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

  const handleSaveEdit = useCallback(async (draftId: string, itemIndex: number, fieldName?: string) => {
    // [DRAFT-DIFF-CLARITY-1] Empty draft save confirmation
    // If Draft (staged) is empty AND Current (live) is non-empty, require confirmation
    if (editValue.trim() === '' && fieldName && currentFieldValues) {
      const currentValue = fieldName === 'seoTitle'
        ? currentFieldValues.seoTitle
        : currentFieldValues.seoDescription;

      if (currentValue && currentValue.trim() !== '') {
        const confirmed = window.confirm(
          'Saving an empty draft will clear this field when applied.\n\nAre you sure you want to save an empty draft?'
        );
        if (!confirmed) {
          return; // User canceled - do not persist changes
        }
      }
    }

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
  }, [projectId, editValue, feedback, currentFieldValues]);

  /**
   * [DRAFT-FIELD-COVERAGE-1] Get field label based on asset type
   */
  const getFieldLabel = useCallback((field: string): string => {
    return FIELD_LABEL_MAP[assetType]?.[field] || field;
  }, [assetType]);

  /**
   * [DRAFT-FIELD-COVERAGE-1] Build empty state CTA href based on asset type
   */
  const getViewIssuesHref = useCallback((): string => {
    if (assetType === 'products') {
      return `/projects/${projectId}/products/${assetId}?tab=issues`;
    }
    // Pages and collections route to Issues Engine with asset filter
    return `/projects/${projectId}/issues?assetType=${assetType}&assetId=${assetId}`;
  }, [projectId, assetType, assetId]);

  return (
    <section aria-label="Drafts" data-testid="drafts-tab-panel">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Drafts</h2>
      {/* [DRAFT-AI-ENTRYPOINT-CLARITY-1] Human-only review boundary note */}
      <DraftAiBoundaryNote mode="review" />
      <p className="mb-3 text-xs text-gray-500">
        Review and edit pending drafts for this {assetLabel}. Save changes before applying.
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
                          ? `${getFieldLabel('seoTitle')} Suggestion`
                          : `${getFieldLabel('seoDescription')} Suggestion`}
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
                  {/* [DRAFT-DIFF-CLARITY-1] Shows Current (live) vs Draft (staged) diff */}
                  {draft.filteredItems.length > 0 && (
                    <div className="mt-3 space-y-4">
                      {draft.filteredItems.map((item, idx) => {
                        const hasCanonicalShape = item.field !== undefined;
                        const legacyItem = item as any;
                        const itemIndex = item.itemIndex ?? idx;
                        const editKey = `${draft.id}-${itemIndex}`;
                        const isEditing = editingItem === editKey;
                        const draftValue = item.finalSuggestion || item.rawSuggestion || '';

                        if (hasCanonicalShape) {
                          // [DRAFT-DIFF-CLARITY-1] Get current/live value for diff display
                          const liveValue = item.field === 'seoTitle'
                            ? (currentFieldValues?.seoTitle || '')
                            : (currentFieldValues?.seoDescription || '');

                          // [DRAFT-DIFF-CLARITY-1] Determine empty draft messaging
                          // - No draft generated yet: both raw and final are empty
                          // - Draft will clear this field: rawSuggestion non-empty but finalSuggestion empty (explicitly cleared)
                          const noDraftGenerated = !item.rawSuggestion && !item.finalSuggestion;
                          const draftWillClear = !item.finalSuggestion && item.rawSuggestion && liveValue;

                          return (
                            <div
                              key={itemIndex}
                              data-testid={`drafts-tab-item-${draft.id}-${itemIndex}`}
                              className="rounded-lg border border-gray-200 bg-white p-4 text-sm"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="font-semibold text-gray-900">
                                  {getFieldLabel(item.field)}
                                </div>
                                {!isEditing && (
                                  <button
                                    type="button"
                                    data-testid={`drafts-tab-item-edit-${draft.id}-${itemIndex}`}
                                    onClick={() => handleStartEdit(draft.id, itemIndex, draftValue)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>

                              {/* [DRAFT-DIFF-CLARITY-1] Current (live) block */}
                              <div
                                data-testid="draft-diff-current"
                                className="rounded bg-gray-50 p-3 mb-3"
                              >
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  Current (live)
                                </div>
                                <div className="text-gray-700">
                                  {liveValue || <span className="italic text-gray-400">(empty)</span>}
                                </div>
                              </div>

                              {/* [DRAFT-DIFF-CLARITY-1] Draft (staged) block */}
                              <div
                                data-testid="draft-diff-draft"
                                className="rounded bg-indigo-50 p-3"
                              >
                                <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
                                  Draft (staged)
                                </div>

                                {isEditing ? (
                                  <div>
                                    <textarea
                                      data-testid={`drafts-tab-item-input-${draft.id}-${itemIndex}`}
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-full rounded border border-indigo-300 p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                                        onClick={() => handleSaveEdit(draft.id, itemIndex, item.field)}
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
                                    <div className="text-gray-900">
                                      {noDraftGenerated ? (
                                        <span className="italic text-gray-500">No draft generated yet</span>
                                      ) : draftWillClear ? (
                                        <span className="text-amber-600">Draft will clear this field when applied</span>
                                      ) : (
                                        draftValue || <span className="italic text-gray-400">(empty)</span>
                                      )}
                                    </div>
                                    {item.ruleWarnings && item.ruleWarnings.length > 0 && (
                                      <div className="mt-1 text-xs text-amber-600">
                                        Warnings: {item.ruleWarnings.join(', ')}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        } else {
                          // Legacy shape - read only (no diff UI)
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
                No drafts saved for this {assetLabel}.
              </h3>
              <div className="mt-6">
                {/* Primary CTA: View issues - switches to Issues tab or Issues Engine */}
                <Link
                  href={getViewIssuesHref()}
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

export default AssetDraftsTab;
