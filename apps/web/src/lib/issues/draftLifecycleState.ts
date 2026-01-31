/**
 * DRAFT-LIFECYCLE-VISIBILITY-1: Draft Lifecycle State Derivation
 *
 * Centralizes canonical draft lifecycle states for Issues Engine.
 * Uses ONLY existing UI signals (no new backend calls, no guesswork).
 *
 * States flow: NO_DRAFT -> GENERATED_UNSAVED -> SAVED_NOT_APPLIED -> APPLIED
 *
 * [FIXUP-1] Hardened derivation:
 *   - APPLIED requires explicit hasAppliedSignal (no legacy elevation)
 *   - NO_DRAFT has displayable shortLabel for RCP echo
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
 * 1. APPLIED - ONLY if hasAppliedSignal === true (trust guard: requires explicit apply-completion)
 * 2. SAVED_NOT_APPLIED - if hasSavedDraft or legacyDraftState === 'saved'
 * 3. GENERATED_UNSAVED - if hasPreviewOpen && hasGeneratedValue
 * 4. NO_DRAFT - default
 *
 * [FIXUP-1] Conservative APPLIED derivation: legacyDraftState === 'applied' alone is NOT
 * sufficient to elevate to APPLIED; requires explicit hasAppliedSignal to prevent premature
 * "Applied" display without a confirmed apply-completion signal.
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

  // [FIXUP-1] Check APPLIED first (highest priority) - ONLY with explicit apply signal
  if (hasAppliedSignal === true) {
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
      // [FIXUP-1] shortLabel is displayable so RCP can render "Draft: No draft exists"
      return {
        label: 'No draft exists',
        shortLabel: 'No draft exists',
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
      // [KAN-86] Success copy reinforces completion without urgency
      return {
        label: 'Draft applied',
        shortLabel: 'Applied',
        description: 'This draft has been applied to Shopify. Your store is updated.',
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

/**
 * [DRAFT-LIFECYCLE-VISIBILITY-1] Counts total pending drafts in sessionStorage for a project.
 * Scans all sessionStorage keys matching the draft key pattern for the given project.
 *
 * @param projectId - Project ID to scan for drafts
 * @returns Count of unique issue/product combinations with saved drafts
 */
export function countPendingDraftsInSessionStorage(projectId: string): number {
  if (typeof window === 'undefined') return 0;

  const prefix = `issue_draft:${projectId}:`;
  const seenCombinations = new Set<string>();

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(prefix)) {
      // Extract issueId:productId from key pattern: issue_draft:{projectId}:{issueId}:{productId}:{fieldLabel}
      const parts = key.split(':');
      if (parts.length >= 4) {
        const combination = `${parts[2]}:${parts[3]}`; // issueId:productId
        seenCombinations.add(combination);
      }
    }
  }

  return seenCombinations.size;
}
