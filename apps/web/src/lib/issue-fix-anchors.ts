/**
 * [ISSUE-FIX-NAV-AND-ANCHORS-1] Anchor Scroll/Highlight + Arrival Callout
 *
 * Centralized utilities for scrolling to fix anchors, applying visual highlights,
 * and generating arrival callout messaging.
 *
 * Key Invariants:
 * 1. No hidden state - highlight is applied directly via CSS class
 * 2. Deterministic messaging based on issue state
 * 3. Auto-cleanup of highlight after timeout
 */

import type { IssueFixKind } from './issue-to-fix-path';

// =============================================================================
// Scroll + Highlight
// =============================================================================

/**
 * CSS class applied during highlight animation.
 * Should be defined in global CSS or Tailwind config.
 */
export const HIGHLIGHT_CLASS = 'issue-fix-highlight';

/**
 * Duration of highlight effect in milliseconds.
 */
export const HIGHLIGHT_DURATION_MS = 2000;

/**
 * Result of attempting to scroll to a fix anchor.
 */
export interface ScrollToAnchorResult {
  /** Whether the anchor element was found */
  found: boolean;
  /** The element that was scrolled to (if found) */
  element?: HTMLElement;
}

/**
 * Scrolls to a fix anchor element and applies a temporary highlight.
 *
 * @param fixAnchorTestId - The data-testid of the anchor element
 * @returns Result indicating whether the anchor was found
 */
export function scrollToFixAnchor(params: {
  fixAnchorTestId: string;
}): ScrollToAnchorResult {
  const { fixAnchorTestId } = params;

  // Find element by data-testid
  const element = document.querySelector<HTMLElement>(
    `[data-testid="${fixAnchorTestId}"]`
  );

  if (!element) {
    return { found: false };
  }

  // Scroll element into view
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });

  // Apply highlight class
  element.classList.add(HIGHLIGHT_CLASS);

  // Remove highlight after duration
  setTimeout(() => {
    element.classList.remove(HIGHLIGHT_CLASS);
  }, HIGHLIGHT_DURATION_MS);

  return { found: true, element };
}

/**
 * Removes highlight from an element immediately.
 *
 * @param element - The element to remove highlight from
 */
export function removeHighlight(element: HTMLElement): void {
  element.classList.remove(HIGHLIGHT_CLASS);
}

// =============================================================================
// Arrival Callout Model
// =============================================================================

/**
 * Callout variant types for issue-fix arrival.
 * [ISSUE-FIX-KIND-CLARITY-1] Added 'diagnostic' variant for informational issues.
 */
export type CalloutVariant =
  | 'actionable'
  | 'already_compliant'
  | 'external_fix'
  | 'coming_soon'
  | 'anchor_not_found'
  | 'diagnostic';

/**
 * Input for generating arrival callout content.
 */
export interface ArrivalCalloutInput {
  /** The issue title to display */
  issueTitle: string;
  /** The next action label (e.g., "Edit the SEO title below") */
  nextActionLabel?: string;
  /** Whether the fix anchor was found */
  foundAnchor: boolean;
  /** Whether the issue is still present on this surface */
  issuePresentOnSurface: boolean;
  /** Whether this is an external fix (Shopify admin) */
  isExternalFix?: boolean;
  /** Whether this feature is coming soon */
  isComingSoon?: boolean;
  /** [ISSUE-FIX-KIND-CLARITY-1] Semantic classification of how this issue is resolved */
  fixKind?: IssueFixKind;
}

/**
 * Output from the arrival callout model.
 */
export interface ArrivalCalloutOutput {
  /** The callout variant */
  variant: CalloutVariant;
  /** Primary message (always present) */
  primaryMessage: string;
  /** Secondary message with next action (when actionable) */
  secondaryMessage?: string;
  /** Whether to show a back link */
  showBackLink: boolean;
  /** Whether to show external link (e.g., "Open Shopify") */
  showExternalLink?: boolean;
  /** [ISSUE-FIX-KIND-CLARITY-1] Whether to show "View related issues" link for DIAGNOSTIC */
  showViewRelatedIssues?: boolean;
  /** CSS class for the callout container */
  containerClass: string;
}

/**
 * Generates arrival callout content based on issue state.
 *
 * @param input - The callout input parameters
 * @returns Callout output with messages and styling
 */
export function getArrivalCalloutContent(input: ArrivalCalloutInput): ArrivalCalloutOutput {
  const {
    issueTitle,
    nextActionLabel,
    foundAnchor,
    issuePresentOnSurface,
    isExternalFix,
    isComingSoon,
    fixKind,
  } = input;

  // Coming soon
  if (isComingSoon) {
    return {
      variant: 'coming_soon',
      primaryMessage: `Coming soon: ${issueTitle}`,
      secondaryMessage: 'This fix surface is not yet available. Check back later.',
      showBackLink: true,
      containerClass: 'bg-gray-50 border-gray-200 text-gray-700',
    };
  }

  // External fix (Shopify admin)
  if (isExternalFix) {
    return {
      variant: 'external_fix',
      primaryMessage: `Fix requires Shopify admin: ${issueTitle}`,
      secondaryMessage: nextActionLabel || 'Open Shopify to make this change.',
      showBackLink: true,
      showExternalLink: true,
      containerClass: 'bg-amber-50 border-amber-200 text-amber-800',
    };
  }

  // Issue no longer present (already compliant)
  if (!issuePresentOnSurface) {
    return {
      variant: 'already_compliant',
      primaryMessage: 'No action needed — already compliant',
      secondaryMessage: `The issue "${issueTitle}" is no longer detected on this product.`,
      showBackLink: true,
      containerClass: 'bg-green-50 border-green-200 text-green-700',
    };
  }

  // [ISSUE-FIX-KIND-CLARITY-1] DIAGNOSTIC issues: informational, no direct fix
  // Never show "Fix surface not available" for DIAGNOSTIC issues
  if (fixKind === 'DIAGNOSTIC') {
    return {
      variant: 'diagnostic',
      primaryMessage: `You're here to review: ${issueTitle}`,
      secondaryMessage: nextActionLabel || 'Review the analysis below. No direct fix is available for this issue.',
      showBackLink: true,
      showViewRelatedIssues: true,
      containerClass: 'bg-blue-50 border-blue-200 text-blue-800',
    };
  }

  // Anchor not found (fix surface not available)
  // [ISSUE-FIX-KIND-CLARITY-1] Only show for non-DIAGNOSTIC issues
  if (!foundAnchor) {
    return {
      variant: 'anchor_not_found',
      primaryMessage: `You're here to fix: ${issueTitle}`,
      secondaryMessage: 'Fix surface not available. Use the options below or go back.',
      showBackLink: true,
      containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    };
  }

  // Normal actionable case
  return {
    variant: 'actionable',
    primaryMessage: `You're here to fix: ${issueTitle}`,
    secondaryMessage: nextActionLabel ? `To fix this issue: ${nextActionLabel}` : undefined,
    showBackLink: true,
    containerClass: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  };
}

// =============================================================================
// CSS for Highlight Effect
// =============================================================================

/**
 * CSS styles for the highlight effect.
 * Add this to your global CSS or create a style tag.
 *
 * ```css
 * .issue-fix-highlight {
 *   animation: issue-fix-pulse 2s ease-in-out;
 *   outline: 2px solid rgb(99 102 241 / 0.5);
 *   outline-offset: 4px;
 *   border-radius: 8px;
 * }
 *
 * @keyframes issue-fix-pulse {
 *   0%, 100% {
 *     outline-color: rgb(99 102 241 / 0.5);
 *   }
 *   50% {
 *     outline-color: rgb(99 102 241 / 0.8);
 *   }
 * }
 * ```
 */
export const HIGHLIGHT_CSS = `
.issue-fix-highlight {
  animation: issue-fix-pulse 2s ease-in-out;
  outline: 2px solid rgb(99 102 241 / 0.5);
  outline-offset: 4px;
  border-radius: 8px;
}

@keyframes issue-fix-pulse {
  0%, 100% {
    outline-color: rgb(99 102 241 / 0.5);
  }
  50% {
    outline-color: rgb(99 102 241 / 0.8);
  }
}
`;

/**
 * Injects the highlight CSS into the document head.
 * Call this once on app initialization.
 */
export function injectHighlightStyles(): void {
  // Check if already injected
  if (document.getElementById('issue-fix-highlight-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'issue-fix-highlight-styles';
  style.textContent = HIGHLIGHT_CSS;
  document.head.appendChild(style);
}
