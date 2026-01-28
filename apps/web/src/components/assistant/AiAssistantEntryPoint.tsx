'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import {
  dismissAiAssistantForSession,
  isAiAssistantDismissedForContext,
} from '@/lib/trust-loop/aiAssistantPreferences';

/**
 * [EA-30: AI-ASSIST-ENTRY-POINTS-1] AI Assistant Entry Point Component
 *
 * Displays contextual AI assistance suggestions in a supportive, non-intrusive manner.
 * Key characteristics:
 * - Clearly labeled as "Assistant" or "Help"
 * - Uses optional/suggestive language ("You might consider...", "One option is...")
 * - Visually subordinate to primary user actions
 * - Easily dismissible with single action
 * - Never modifies system state directly
 * - Acknowledges uncertainty when appropriate
 *
 * Only renders after trust loop is complete (gated by parent).
 */

export interface AiAssistantSuggestion {
  /** Unique ID for this suggestion */
  id: string;
  /** Main suggestion text using optional language */
  text: string;
  /** Optional additional context */
  context?: string;
  /** Optional confidence indicator */
  confidence?: 'high' | 'medium' | 'low';
  /** Category for grouping */
  category?: 'understanding' | 'action' | 'learning';
}

interface AiAssistantEntryPointProps {
  /** Project ID for preference tracking */
  projectId: string;
  /** Context ID for session-based dismissal tracking */
  contextId: string;
  /** Title for the assistant section */
  title?: string;
  /** Suggestions to display */
  suggestions: AiAssistantSuggestion[];
  /** Whether to show in collapsed state by default */
  defaultCollapsed?: boolean;
  /** Optional custom CSS class */
  className?: string;
}

/**
 * Get confidence copy with humble language.
 */
function getConfidenceCopy(confidence?: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'This suggestion is based on several indicators';
    case 'medium':
      return 'This may be relevant based on available information';
    case 'low':
      return 'This is one possibility to consider';
    default:
      return '';
  }
}

export function AiAssistantEntryPoint({
  projectId,
  contextId,
  title = 'Assistant',
  suggestions,
  defaultCollapsed = true,
  className = '',
}: AiAssistantEntryPointProps) {
  const [isDismissed, setIsDismissed] = useState(() =>
    isAiAssistantDismissedForContext(projectId, contextId)
  );
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set()
  );

  // Don't render if dismissed for this context
  if (isDismissed) {
    return null;
  }

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(
    (s) => !dismissedSuggestions.has(s.id)
  );

  // Don't render if no suggestions to show
  if (visibleSuggestions.length === 0) {
    return null;
  }

  const handleDismissAll = () => {
    dismissAiAssistantForSession(projectId, contextId);
    setIsDismissed(true);
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions((prev) => new Set(prev).add(suggestionId));
  };

  return (
    <details
      className={`rounded-md border border-border/50 bg-[hsl(var(--surface-card))]/50 ${className}`}
      open={!defaultCollapsed}
      data-testid="ai-assistant-entry-point"
    >
      <summary className="cursor-pointer px-3 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
        <span className="flex items-center gap-1.5">
          <Icon name="workflow.ai" size={16} aria-hidden="true" />
          {title}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDismissAll();
          }}
          className="text-muted-foreground/60 hover:text-muted-foreground p-0.5 rounded text-sm leading-none"
          aria-label="Dismiss assistant suggestions"
          title="Dismiss"
        >
          ×
        </button>
      </summary>

      <div className="border-t border-border/50 px-3 py-2 space-y-2">
        {visibleSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="group relative text-xs text-muted-foreground"
          >
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground/60 mt-0.5 flex-shrink-0">
                •
              </span>
              <div className="flex-1 min-w-0">
                <p className="leading-relaxed">{suggestion.text}</p>
                {suggestion.context && (
                  <p className="mt-1 text-muted-foreground/70 text-[11px]">
                    {suggestion.context}
                  </p>
                )}
                {suggestion.confidence && (
                  <p className="mt-1 text-muted-foreground/60 text-[10px] italic">
                    {getConfidenceCopy(suggestion.confidence)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDismissSuggestion(suggestion.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-muted-foreground p-0.5 rounded transition-opacity text-xs leading-none"
                aria-label="Dismiss this suggestion"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {/* Advisory note */}
        <p className="text-[10px] text-muted-foreground/50 pt-1 border-t border-border/30">
          These are optional suggestions. You know your business best.
        </p>
      </div>
    </details>
  );
}
