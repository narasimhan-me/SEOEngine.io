/**
 * DRAFT-LIFECYCLE-VISIBILITY-1: Draft Lifecycle State Derivation
 *
 * Centralizes canonical draft lifecycle states for Issues Engine.
 * Uses ONLY existing UI signals (no new backend calls, no guesswork).
 *
 * States flow: NO_DRAFT -> GENERATED_UNSAVED -> SAVED_NOT_APPLIED -> APPLIED
 */

/**
 * Canonical draft lifecycle states.
 *
 * - NO_DRAFT: No draft exists for this issue/product
 * - GENERATED_UNSAVED: Draft generated (preview open) but not saved
 * - SAVED_NOT_APPLIED: Draft saved to sessionStorage but not applied to Shopify
 * - APPLIED: Draft has been applied to Shopify
 */
export type DraftLifecycleState =
  | 'NO_DRAFT'
  | 'GENERATED_UNSAVED'
  | 'SAVED_NOT_APPLIED'
  | 'APPLIED';

/**
 * Signals used to derive draft lifecycle state.
 * All signals come from existing UI state - no new backend calls.
 */
export interface DraftLifecycleSignals {
  /** Preview panel is open for this row */
  hasPreviewOpen?: boolean;
  /** Preview has generated value (not yet saved) */
  hasGeneratedValue?: boolean;
  /** Saved draft exists (in sessionStorage or state) */
  hasSavedDraft?: boolean;
  /** Draft has been applied (appliedAt is truthy) */
  hasAppliedSignal?: boolean;
  /** Legacy draft state from existing getDraftState() */
  legacyDraftState?: 'unsaved' | 'saved' | 'applied' | null;
}

/**
 * Derives canonical draft lifecycle state from existing UI signals.
 *
 * Priority order (highest first):
 * 1. APPLIED - if hasAppliedSignal or legacyDraftState === 'applied'
 * 2. SAVED_NOT_APPLIED - if hasSavedDraft or legacyDraftState === 'saved'
 * 3. GENERATED_UNSAVED - if hasPreviewOpen && hasGeneratedValue
 * 4. NO_DRAFT - default
 */
export function deriveDraftLifecycleState(
  signals: DraftLifecycleSignals
): DraftLifecycleState {
  const {
    hasPreviewOpen,
    hasGeneratedValue,
    hasSavedDraft,
    hasAppliedSignal,
    legacyDraftState,
  } = signals;

  // Check APPLIED first (highest priority)
  if (hasAppliedSignal || legacyDraftState === 'applied') {
    return 'APPLIED';
  }

  // Check SAVED_NOT_APPLIED
  if (hasSavedDraft || legacyDraftState === 'saved') {
    return 'SAVED_NOT_APPLIED';
  }

  // Check GENERATED_UNSAVED (preview open with generated value)
  if (hasPreviewOpen && hasGeneratedValue) {
    return 'GENERATED_UNSAVED';
  }

  // Default: no draft
  return 'NO_DRAFT';
}

/**
 * Copy/labels for each draft lifecycle state.
 */
export interface DraftLifecycleCopy {
  /** Full label for display */
  label: string;
  /** Short label for compact display */
  shortLabel: string;
  /** Description for tooltips/help */
  description: string;
}

/**
 * Returns canonical copy for a draft lifecycle state.
 */
export function getDraftLifecycleCopy(
  state: DraftLifecycleState
): DraftLifecycleCopy {
  switch (state) {
    case 'NO_DRAFT':
      return {
        label: 'No draft exists',
        shortLabel: '',
        description: 'No draft has been generated for this issue.',
      };
    case 'GENERATED_UNSAVED':
      return {
        label: 'Draft generated (not saved)',
        shortLabel: 'Draft not saved',
        description:
          'A draft has been generated but not yet saved. Save it to preserve your changes.',
      };
    case 'SAVED_NOT_APPLIED':
      return {
        label: 'Draft saved (not applied)',
        shortLabel: 'Draft saved',
        description:
          'Draft is saved locally. Apply it to Shopify to update your store.',
      };
    case 'APPLIED':
      return {
        label: 'Draft applied',
        shortLabel: 'Applied',
        description: 'This draft has been applied to Shopify.',
      };
  }
}

/**
 * Checks if a saved draft exists in sessionStorage for a given issue/product/field.
 * Uses the existing draft key scheme from the Issues page.
 *
 * @param projectId - Project ID
 * @param issueId - Issue type ID
 * @param productId - Product ID
 * @param fieldLabels - Array of field labels to check (e.g., ['SEO title', 'SEO description'])
 * @returns true if any saved draft exists
 */
export function checkSavedDraftInSessionStorage(
  projectId: string,
  issueId: string,
  productId: string,
  fieldLabels: string[] = ['SEO title', 'SEO description']
): boolean {
  if (typeof window === 'undefined') return false;

  for (const fieldLabel of fieldLabels) {
    const draftKey = `issue_draft:${projectId}:${issueId}:${productId}:${fieldLabel}`;
    const savedDraft = sessionStorage.getItem(draftKey);
    if (savedDraft) {
      return true;
    }
  }

  return false;
}
