'use client';

import { useState, useRef, useCallback } from 'react';
import { getEducationalContent } from '@/lib/education/contextualEducation';

/**
 * [EA-36: CONTEXTUAL-EDUCATION-1] Issue Explanation Tooltip
 *
 * Provides quick contextual explanation on hover/focus.
 * Non-blocking, optional, and instantly dismissible.
 *
 * Trust Contract:
 * - Never blocks user action
 * - Appears on hover/focus, disappears on leave/blur
 * - Purely informational
 */

interface IssueExplanationTooltipProps {
  /** The issue key to fetch explanation for */
  issueKey: string;
  /** Size of the help icon */
  size?: 'sm' | 'md';
  /** Optional custom content override */
  customContent?: string;
}

export function IssueExplanationTooltip({
  issueKey,
  size = 'sm',
  customContent,
}: IssueExplanationTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const content = customContent ?? getEducationalContent(issueKey)?.whyItMatters;

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    // Small delay before hiding to allow moving to tooltip
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  }, []);

  const keepVisible = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Don't render if no content available
  if (!content) {
    return null;
  }

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex items-center text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        aria-label="Learn more about this issue"
      >
        <span className={`${iconSize} inline-flex items-center justify-center`}>?</span>
      </button>

      {isVisible && (
        <div
          role="tooltip"
          onMouseEnter={keepVisible}
          onMouseLeave={hideTooltip}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 max-w-[90vw]"
        >
          <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
            <p className="text-xs text-popover-foreground leading-relaxed">
              {content}
            </p>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-border" />
          </div>
        </div>
      )}
    </span>
  );
}
