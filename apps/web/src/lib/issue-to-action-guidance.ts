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
 * Static mapping from issue type to recommended playbook(s).
 * Keys are issue.type values (or issue.id fallback).
 * [FIXUP-1] Copy safety: uses "assets within playbook scope" instead of asserting specific asset types.
 * [ISSUE-FIX-KIND-CLARITY-1] All mappings now include fixTypeLabel and fixTypeDescription per EA-20 EPIC 14.
 */
const ISSUE_TO_PLAYBOOK_MAP: Record<string, RecommendedPlaybook[]> = {
  missing_seo_title: [
    {
      playbookId: 'missing_seo_title',
      name: 'Fix missing SEO titles',
      oneLineWhatItDoes:
        'Generates SEO titles for assets within the playbook scope that are missing them.',
      affects: 'Assets within the current playbook scope missing SEO titles',
      preconditions: [
        'Preview generation may require appropriate permissions.',
        'No changes are applied unless you explicitly proceed to the Apply step.',
        'Draft previews are stored temporarily and can be reviewed before application.',
      ],
      fixTypeLabel: 'AI',
      fixTypeDescription:
        'AI-generated suggestions that you review before applying',
    },
  ],
  missing_seo_description: [
    {
      playbookId: 'missing_seo_description',
      name: 'Fix missing SEO descriptions',
      oneLineWhatItDoes:
        'Generates SEO descriptions for assets within the playbook scope that are missing them.',
      affects:
        'Assets within the current playbook scope missing SEO descriptions',
      preconditions: [
        'Preview generation may require appropriate permissions.',
        'No changes are applied unless you explicitly proceed to the Apply step.',
        'Draft previews are stored temporarily and can be reviewed before application.',
      ],
      fixTypeLabel: 'AI',
      fixTypeDescription:
        'AI-generated suggestions that you review before applying',
    },
  ],
  not_answer_ready: [
    {
      playbookId: 'not_answer_ready' as PlaybookId,
      name: 'Review thin content',
      oneLineWhatItDoes:
        'Provides guidance on enriching thin content to make it answer-ready.',
      affects: 'Assets within the current playbook scope with insufficient content',
      preconditions: [
        'This is a diagnostic issue requiring manual content enrichment.',
        'No automated fix is available; review and manual editing required.',
      ],
      fixTypeLabel: 'Guidance',
      fixTypeDescription:
        'Step-by-step guidance for manual review and improvement',
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
