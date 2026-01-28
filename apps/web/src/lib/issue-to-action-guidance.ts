/**
 * [ISSUE-TO-ACTION-GUIDANCE-1] Issue → Playbook Guidance Mapping
 *
 * Deterministic, static mapping from issue types to recommended playbook metadata.
 * Used by RCP Issue Details and Issues Engine list to surface playbook guidance
 * without any execution or AI side effects.
 *
 * Design System: v1.5
 * EIC Version: 1.5
 * Trust Contract: Guidance-only, token-only, no auto-execution
 */

import type { PlaybookId } from './playbooks-routing';

/**
 * Fix type classification for user-facing clarity.
 * [ISSUE-FIX-KIND-CLARITY-1] Explicit fix-type labels per EA-20 EPIC 14.
 */
export type FixTypeLabel = 'AI' | 'Template' | 'Guidance' | 'Rule-based';

/**
 * Recommended playbook descriptor with metadata for display in RCP and list views.
 * All fields are static/pre-computed; no runtime evaluation.
 * [ISSUE-FIX-KIND-CLARITY-1] fixTypeLabel and fixTypeDescription are now required per EA-20 EPIC 14.
 */
export interface RecommendedPlaybook {
  /** Canonical playbook ID (must be PlaybookId) */
  playbookId: PlaybookId;
  /** Human-readable playbook name */
  name: string;
  /** One-line description of what this playbook does */
  oneLineWhatItDoes: string;
  /** Asset type and scope summary affected by this playbook */
  affects: string;
  /** Static preconditions (non-speculative, non-evaluated) */
  preconditions: string[];
  /** [ISSUE-FIX-KIND-CLARITY-1] Fix type label for user clarity (required) */
  fixTypeLabel: FixTypeLabel;
  /** [ISSUE-FIX-KIND-CLARITY-1] User-facing description of fix type (required) */
  fixTypeDescription: string;
}

/**
 * [EA-28: ISSUE-EXPLANATION-QUALITY-1] Static mapping from issue type to recommended playbook(s).
 * All guidance uses clear, accessible language.
 * Keys are issue.type values (or issue.id fallback).
 * [FIXUP-1] Copy safety: uses "assets within playbook scope" instead of asserting specific asset types.
 * [ISSUE-FIX-KIND-CLARITY-1] All mappings now include fixTypeLabel and fixTypeDescription per EA-20 EPIC 14.
 */
const ISSUE_TO_PLAYBOOK_MAP: Record<string, RecommendedPlaybook[]> = {
  missing_seo_title: [
    {
      playbookId: 'missing_seo_title',
      name: 'Add search titles',
      oneLineWhatItDoes:
        'Suggests titles for products that are currently missing them.',
      affects: 'Products missing search titles in the current view',
      preconditions: [
        "You'll review all suggestions before any changes are saved.",
        'Nothing is changed until you click Apply.',
        'You can edit suggestions before applying them.',
      ],
      fixTypeLabel: 'AI',
      fixTypeDescription:
        'AI suggests titles for you to review, edit, and approve',
    },
  ],
  missing_seo_description: [
    {
      playbookId: 'missing_seo_description',
      name: 'Add search descriptions',
      oneLineWhatItDoes:
        'Suggests descriptions for products that are currently missing them.',
      affects: 'Products missing search descriptions in the current view',
      preconditions: [
        "You'll review all suggestions before any changes are saved.",
        'Nothing is changed until you click Apply.',
        'You can edit suggestions before applying them.',
      ],
      fixTypeLabel: 'AI',
      fixTypeDescription:
        'AI suggests descriptions for you to review, edit, and approve',
    },
  ],
  not_answer_ready: [
    {
      playbookId: 'not_answer_ready' as PlaybookId,
      name: 'Improve content for AI',
      oneLineWhatItDoes:
        'Shows which products need more detailed content to be recommended by AI assistants.',
      affects: 'Products with brief content in the current view',
      preconditions: [
        'This identifies products that would benefit from more content.',
        'Adding more detail is done manually in your product editor.',
      ],
      fixTypeLabel: 'Guidance',
      fixTypeDescription:
        'Identifies products to improve, with tips on what to add',
    },
  ],
};

/**
 * Get recommended playbooks for a given issue type.
 *
 * @param issueType - The issue type (issue.type ?? issue.id)
 * @returns Array of recommended playbooks, or empty array if no mapping exists
 */
export function getIssueToActionGuidance(
  issueType: string
): RecommendedPlaybook[] {
  return ISSUE_TO_PLAYBOOK_MAP[issueType] ?? [];
}
