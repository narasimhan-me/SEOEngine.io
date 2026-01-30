'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { getEducationalContent, type EducationalContent } from '@/lib/education/contextualEducation';

/**
 * [EA-36: CONTEXTUAL-EDUCATION-1] Inline Learn More Component
 *
 * Provides lightweight, contextual education exactly where questions arise.
 *
 * Trust Contract:
 * - Never blocks user action (purely informational)
 * - Always dismissible/collapsible
 * - Optional - users can complete any action without engaging
 */

interface LearnMoreInlineProps {
  /** The issue key to fetch educational content for */
  issueKey: string;
  /** Pre-fetched content (optional, will lookup if not provided) */
  content?: EducationalContent | null;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

export function LearnMoreInline({
  issueKey,
  content: providedContent,
  defaultExpanded = false,
  compact = false,
}: LearnMoreInlineProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const content = providedContent ?? getEducationalContent(issueKey);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Don't render if no educational content available
  if (!content) {
    return null;
  }

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  if (compact) {
    // Compact inline toggle
    return (
      <div className="mt-1">
        <button
          type="button"
          onClick={toggleExpanded}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={isExpanded}
        >
          <ChevronIcon className="h-3 w-3" />
          <span>{isExpanded ? 'Hide details' : 'Why this matters'}</span>
        </button>
        {isExpanded && (
          <div className="mt-1.5 pl-4 text-[11px] text-muted-foreground space-y-1">
            <p>{content.whyItMatters}</p>
          </div>
        )}
      </div>
    );
  }

  // Full learn more section
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggleExpanded}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        aria-expanded={isExpanded}
      >
        <Lightbulb className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-foreground/70" />
        <ChevronIcon className="h-3 w-3" />
        <span>{isExpanded ? 'Hide explanation' : 'Learn more about this issue'}</span>
      </button>

      {isExpanded && (
        <div className="mt-2 rounded-md border border-border/50 bg-muted/30 p-3 space-y-2">
          {/* Why it matters */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Why this matters
            </p>
            <p className="text-xs text-foreground/90">{content.whyItMatters}</p>
          </div>

          {/* What fixing accomplishes */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              What fixing this accomplishes
            </p>
            <p className="text-xs text-foreground/90">{content.whatFixAccomplishes}</p>
          </div>

          {/* Quick tip (if available) */}
          {content.quickTip && (
            <div className="pt-1 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium">Quick tip:</span> {content.quickTip}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
