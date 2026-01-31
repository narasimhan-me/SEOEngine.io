/**
 * [EA-49: AI-ADVISORY-ONLY-1] AI Advisory Badge Component
 *
 * Visual indicator that content is AI-generated guidance, not a directive.
 * Used throughout the UI to clearly distinguish AI explanations from execution controls.
 *
 * Trust Contract:
 * - Clearly labels AI-generated content
 * - Reinforces advisory-only nature of AI outputs
 * - Visually distinct from action buttons
 */

import React from 'react';

export interface AIAdvisoryBadgeProps {
  /** Optional additional CSS classes */
  className?: string;
  /** Whether to show the full disclaimer or just the label */
  showDisclaimer?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * Badge component that clearly marks content as AI-generated guidance.
 * Visually distinct from execution controls per EA-49 trust contract.
 */
export function AIAdvisoryBadge({
  className = '',
  showDisclaimer = false,
  size = 'sm',
}: AIAdvisoryBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium ${sizeClasses}`}
        data-testid="ai-advisory-badge"
        role="status"
        aria-label="AI-generated guidance"
      >
        <svg
          className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        AI Guidance
      </span>
      {showDisclaimer && (
        <span
          className="text-xs text-gray-500 italic"
          data-testid="ai-advisory-disclaimer"
        >
          Advisory only — you decide whether to act
        </span>
      )}
    </div>
  );
}

export default AIAdvisoryBadge;
