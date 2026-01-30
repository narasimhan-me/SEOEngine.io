'use client';

import { BookOpen, Bot, ChevronRight } from 'lucide-react';
import type { PlaybookDefinition } from '@/lib/playbooks/playbookDefinitions';
import { PLAYBOOK_COMPLEXITY_INFO } from '@/lib/playbooks/playbookDefinitions';

/**
 * [EA-40: PLAYBOOKS-SHELL-1] Playbook Card
 * [EA-42] Extended to indicate automation availability
 *
 * Read-only card displaying a playbook summary.
 * Clicking expands to show full details - no execution occurs.
 *
 * Trust Contract:
 * - Purely informational display
 * - No actions triggered on click (only view expansion)
 * - Educational presentation
 * - Automation indicator is informational only
 */

interface PlaybookCardProps {
  playbook: PlaybookDefinition;
  onSelect: (playbookId: string) => void;
  isSelected: boolean;
}

export function PlaybookCard({
  playbook,
  onSelect,
  isSelected,
}: PlaybookCardProps) {
  const complexityInfo = PLAYBOOK_COMPLEXITY_INFO[playbook.complexity];

  return (
    <button
      type="button"
      onClick={() => onSelect(playbook.id)}
      className={`
        w-full text-left p-4 rounded-lg border transition-colors
        ${
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/50 hover:bg-card/80'
        }
      `}
      aria-expanded={isSelected}
      aria-label={`View details for ${playbook.title} playbook`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 mt-0.5">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">
              {playbook.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {playbook.summary}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                  ${
                    playbook.complexity === 'simple'
                      ? 'bg-green-500/10 text-green-600'
                      : playbook.complexity === 'moderate'
                        ? 'bg-yellow-500/10 text-yellow-600'
                        : 'bg-orange-500/10 text-orange-600'
                  }
                `}
              >
                {complexityInfo.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {playbook.steps.length} steps
              </span>
              {/* [EA-42] Automation available indicator - informational only */}
              {playbook.automationMeta && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                  title="Automation available for this playbook"
                >
                  <Bot className="h-3 w-3" />
                  Automation
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight
          className={`
            h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform
            ${isSelected ? 'rotate-90' : ''}
          `}
        />
      </div>
    </button>
  );
}
