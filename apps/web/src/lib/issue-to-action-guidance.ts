/**
 * [ISSUE-TO-ACTION-GUIDANCE-1] Issue → Playbook Guidance Mapping
 * [EA-49: AI-ADVISORY-ONLY-1] AI strictly advisory - never decides or executes
 *
 * Deterministic, static mapping from issue types to recommended playbook metadata.
 * Used by RCP Issue Details and Issues Engine list to surface playbook guidance
 * without any execution or AI side effects.
 *
 * Design System: v1.5
 * EIC Version: 1.5
 * Trust Contract: Guidance-only, token-only, no auto-execution
 *
 * [EA-49] AI Advisory Contract:
 * - AI provides explanations and guidance ONLY
 * - AI NEVER initiates execution or makes autonomous decisions
 * - All AI outputs must be clearly framed as advisory
 * - User retains full control over all execution decisions
 */

import type { PlaybookId } from './playbooks-routing';
// [KAN-88: EA-50] Import centralized governance narrative
import { GOVERNANCE_PHRASES, GOVERNANCE_MICROCOPY } from '@/lib/governance-narrative';

/**
 * [EA-49] AI Advisory framing constants for consistent language across all AI outputs.
 * [KAN-88: EA-50] Re-exports from centralized governance narrative for backward compatibility.
 * These ensure AI guidance is clearly labeled as advisory, not directive.
 */
export const AI_ADVISORY_FRAMING = {
  /** Prefix for AI explanations to clarify advisory nature */
  EXPLANATION_PREFIX: 'Based on the current data, here\'s what this playbook does:',
  /** Prefix for AI recommendations to maintain suggestive framing */
  RECOMMENDATION_PREFIX: GOVERNANCE_MICROCOPY.AI_ASSISTANT.ADVISORY_PREFIX,
  /** Suffix reminder that user controls execution */
  USER_CONTROL_REMINDER: GOVERNANCE_MICROCOPY.AI_ASSISTANT.USER_CONTROL,
  /** Disclaimer for all AI-generated guidance */
  ADVISORY_DISCLAIMER: GOVERNANCE_MICROCOPY.AI_ASSISTANT.DISCLAIMER,
  /** Label for AI-generated content */
  AI_GENERATED_LABEL: 'AI Guidance',
  /** Framing for "Is this right for me?" responses */
  SUITABILITY_PREFIX: 'Here are some factors to consider when deciding if this is right for your situation:',
} as const;

/**
 * [EA-49] Type for AI advisory response structure.
 * Ensures all AI guidance follows the advisory-only contract.
 */
export interface AIAdvisoryResponse {
  /** The advisory content (explanation or guidance) */
  content: string;
  /** Whether this is an explanation, recommendation, or suitability assessment */
  responseType: 'explanation' | 'recommendation' | 'suitability';
  /** Timestamp of when guidance was generated */
  generatedAt: string;
  /** Always true - AI never initiates execution */
  isAdvisoryOnly: true;
  /** Always false - user must take explicit action */
  triggersExecution: false;
}

/**
 * [EA-49] Creates a properly framed AI advisory response.
 * Ensures all AI outputs follow the advisory-only contract.
 */
export function createAIAdvisoryResponse(
  content: string,
  responseType: AIAdvisoryResponse['responseType']
): AIAdvisoryResponse {
  return {
    content,
    responseType,
    generatedAt: new Date().toISOString(),
    isAdvisoryOnly: true,
    triggersExecution: false,
  };
}

/**
 * [EA-49] Wraps AI-generated content with appropriate advisory framing.
 * Ensures users understand the content is guidance, not a directive.
 */
export function frameAsAdvisory(
  content: string,
  responseType: AIAdvisoryResponse['responseType']
): string {
  const prefix = responseType === 'explanation'
    ? AI_ADVISORY_FRAMING.EXPLANATION_PREFIX
    : responseType === 'suitability'
    ? AI_ADVISORY_FRAMING.SUITABILITY_PREFIX
    : AI_ADVISORY_FRAMING.RECOMMENDATION_PREFIX;

  return `${prefix}\n\n${content}\n\n${AI_ADVISORY_FRAMING.USER_CONTROL_REMINDER}`;
}

/**
 * Fix type classification for user-facing clarity.
 * [ISSUE-FIX-KIND-CLARITY-1] Explicit fix-type labels per EA-20 EPIC 14.
 */
export type FixTypeLabel = 'AI' | 'Template' | 'Guidance' | 'Rule-based';

/**
 * Recommended playbook descriptor with metadata for display in RCP and list views.
 * All fields are static/pre-computed; no runtime evaluation.
 * [ISSUE-FIX-KIND-CLARITY-1] fixTypeLabel and fixTypeDescription are now required per EA-20 EPIC 14.
 * [EA-41: ISSUE-TO-ACTION-GUIDANCE-1] whyThisHelps provides plain-English explanation.
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
  /** [EA-41] Plain-English explanation of why this action helps address the issue */
  whyThisHelps: string;
  /**
   * [EA-47] "What would happen if automated" explanation in future/conditional tense.
   * Describes potential automation outcomes without triggering action.
   * Must use conditional language (e.g., "would", "could", "if enabled").
   */
  automationOutcomeExplanation?: string;
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
      whyThisHelps:
        'Search titles help your products appear in search results with clear, relevant descriptions. Without them, search engines may display generic text that doesn\'t attract clicks.',
      automationOutcomeExplanation:
        'If you chose to run this playbook, AI would generate title suggestions for each product missing a search title. These suggestions would appear as drafts for your review—nothing would be applied to your store until you explicitly approve each change.',
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
      whyThisHelps:
        'Search descriptions give potential customers a preview of your product before they click. A compelling description can improve click-through rates from search results.',
      automationOutcomeExplanation:
        'If you chose to run this playbook, AI would generate description suggestions for each product missing a search description. These suggestions would appear as drafts for your review—nothing would be applied to your store until you explicitly approve each change.',
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
      whyThisHelps:
        'AI assistants like ChatGPT and Google AI Overviews recommend products based on their content quality. Products with detailed, structured information are more likely to be surfaced in AI-generated recommendations.',
      automationOutcomeExplanation:
        'This playbook provides guidance only—it would identify products that could benefit from richer content and offer suggestions for what to add. No automated changes would be made; all content improvements would be done manually by you.',
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
