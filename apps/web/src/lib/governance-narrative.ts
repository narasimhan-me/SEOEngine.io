/**
 * [KAN-88: EA-50] Governance Narrative Constants
 *
 * Centralized governance messaging for consistent narrative across all surfaces.
 * This module enforces uniform language for the trust contract without introducing
 * new rules or behavior.
 *
 * Trust Contract Principles:
 * - Nothing applies without user approval
 * - No automatic live changes
 * - No background execution or hidden automation
 * - Draft first, then review, then apply
 *
 * LOCKED COPY: Do not modify these strings without Epic-level approval.
 */

/**
 * Core governance phrases used across all action-adjacent surfaces.
 * These exact phrases must be used consistently to avoid governance drift.
 */
export const GOVERNANCE_PHRASES = {
  /** Primary governance reminder for draft workflows */
  DRAFT_FIRST: 'Draft first',
  /** Core approval requirement statement */
  NOTHING_APPLIES_WITHOUT_APPROVAL: 'Nothing applies without approval',
  /** Core automation safety statement */
  NO_AUTOMATIC_LIVE_CHANGES: 'No automatic live changes',
  /** AI boundary for draft generation */
  AI_USED_FOR_DRAFTS_ONLY: 'AI used for drafts only',
  /** AI boundary for apply step */
  AI_NOT_USED_AT_APPLY: 'AI is not used at Apply',
  /** Full AI disclosure for draft generation */
  AI_DRAFT_DISCLOSURE: 'AI used for drafts only · AI is not used at Apply',
  /** No AI involvement indicator */
  DOES_NOT_USE_AI: 'Does not use AI',
  /** User control reminder */
  YOU_DECIDE: 'You decide whether to proceed',
  /** Review before apply reminder */
  REVIEW_BEFORE_APPLY: 'Review and approve before any changes are made',
} as const;

/**
 * Governance micro-copy for different surface contexts.
 * Each surface type has specific messaging that reinforces the trust contract.
 */
export const GOVERNANCE_MICROCOPY = {
  /** Issues list context */
  ISSUES: {
    /** Shown with actionable issues */
    ACTIONABLE_HINT: 'Draft first, then review and apply',
    /** Shown with fix CTAs */
    FIX_CTA_HINT: 'Creates a draft for your review',
  },

  /** Work Queue context */
  WORK_QUEUE: {
    /** Shown with action bundles */
    BUNDLE_HINT: 'Nothing applies without your approval',
    /** Shown with generate drafts CTA */
    GENERATE_HINT: 'AI generates drafts for your review',
    /** Shown with apply CTA */
    APPLY_HINT: 'Applies your approved drafts only',
  },

  /** Playbook preview context */
  PLAYBOOK: {
    /** Educational note for playbook browsing */
    BROWSE_NOTE: 'Browsing this playbook does not trigger any changes to your store',
    /** Execution governance note */
    EXECUTION_NOTE: 'All changes require your explicit approval before applying',
  },

  /** AI Assistant context */
  AI_ASSISTANT: {
    /** Advisory framing for AI suggestions */
    ADVISORY_PREFIX: 'You might consider:',
    /** User control reminder */
    USER_CONTROL: 'You decide whether to proceed—this is guidance only',
    /** Disclaimer for AI-generated content */
    DISCLAIMER: 'This is AI-generated guidance. No action will be taken without your explicit approval.',
  },

  /** Right Context Panel context */
  RCP: {
    /** Action preview governance note */
    ACTION_PREVIEW_NOTE: 'All actions require your review and approval',
    /** Draft state governance note */
    DRAFT_STATE_NOTE: 'Save draft before applying',
  },

  /** Apply button context */
  APPLY: {
    /** Ready state hint */
    READY_HINT: 'Apply saved draft. Does not auto-save or use AI.',
    /** Blocked state hint prefix */
    BLOCKED_PREFIX: 'Cannot apply:',
  },
} as const;

/**
 * Governance badge labels for visual reinforcement.
 */
export const GOVERNANCE_BADGES = {
  /** Draft status badges */
  DRAFT: {
    UNSAVED: 'Draft — not applied',
    SAVED: 'Draft saved — not applied',
    APPLIED: 'Applied',
  },

  /** AI usage badges */
  AI_USAGE: {
    NONE: 'Does not use AI',
    DRAFTS_ONLY: 'AI used for drafts only',
  },

  /** Approval status badges */
  APPROVAL: {
    NOT_REQUIRED: 'No approval required',
    REQUIRED: 'Approval required',
    PENDING: 'Pending approval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  },
} as const;

/**
 * Constructs a governance disclosure string for AI-assisted features.
 * @param includeApplyNote - Whether to include the "AI not used at Apply" note
 */
export function getAiGovernanceDisclosure(includeApplyNote = true): string {
  return includeApplyNote
    ? GOVERNANCE_PHRASES.AI_DRAFT_DISCLOSURE
    : GOVERNANCE_PHRASES.AI_USED_FOR_DRAFTS_ONLY;
}

/**
 * Constructs a governance framing for AI assistant responses.
 * Ensures all AI outputs include appropriate advisory language.
 */
export function frameAiResponse(content: string): string {
  return `${GOVERNANCE_MICROCOPY.AI_ASSISTANT.ADVISORY_PREFIX}\n\n${content}\n\n${GOVERNANCE_MICROCOPY.AI_ASSISTANT.USER_CONTROL}`;
}

/**
 * Gets the appropriate governance note for a surface type.
 */
export function getGovernanceNote(
  surface: 'issues' | 'work_queue' | 'playbook' | 'ai_assistant' | 'rcp' | 'apply'
): string {
  switch (surface) {
    case 'issues':
      return GOVERNANCE_MICROCOPY.ISSUES.ACTIONABLE_HINT;
    case 'work_queue':
      return GOVERNANCE_MICROCOPY.WORK_QUEUE.BUNDLE_HINT;
    case 'playbook':
      return GOVERNANCE_MICROCOPY.PLAYBOOK.EXECUTION_NOTE;
    case 'ai_assistant':
      return GOVERNANCE_MICROCOPY.AI_ASSISTANT.DISCLAIMER;
    case 'rcp':
      return GOVERNANCE_MICROCOPY.RCP.ACTION_PREVIEW_NOTE;
    case 'apply':
      return GOVERNANCE_MICROCOPY.APPLY.READY_HINT;
    default:
      return GOVERNANCE_PHRASES.NOTHING_APPLIES_WITHOUT_APPROVAL;
  }
}
