'use client';

import { usePathname } from 'next/navigation';
import type { ContextDescriptor } from './RightContextPanelProvider';
import { shouldShowAiAssistant } from '@/lib/trust-loop/trustLoopState';
import {
  isAiAssistantVisible,
  dismissAiAssistantForSession,
  isAiAssistantDismissedForContext,
} from '@/lib/trust-loop/aiAssistantPreferences';
import { useState } from 'react';
import { Icon } from '@/components/icons';

/**
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Optional, collapsed-by-default AI hints section.
 * [EA-30: AI-ASSIST-ENTRY-POINTS-1] Updated with trust loop gating and dismissibility.
 *
 * Token-only styling, no links, no chat UI.
 *
 * Render only when:
 * - Trust loop is complete (user has established trust)
 * - User has not dismissed AI assistant
 * - There are issues (issuesCount > 0) OR action preview exists
 *
 * Copy is non-prescriptive, uses supportive language, and is easily dismissible.
 */
interface ContextPanelAiAssistHintsProps {
  descriptor: ContextDescriptor;
  /** Optional count of issues; when provided, affects render condition */
  issuesCount?: number;
}

/**
 * Extract project ID from pathname if under /projects/[id]/...
 */
function extractProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export function ContextPanelAiAssistHints({
  descriptor,
  issuesCount = 0,
}: ContextPanelAiAssistHintsProps) {
  const pathname = usePathname();
  const projectId = extractProjectIdFromPath(pathname);
  const contextId = `rcp-ai-hints-${descriptor.kind}-${descriptor.id}`;

  const [isDismissed, setIsDismissed] = useState(() =>
    projectId ? isAiAssistantDismissedForContext(projectId, contextId) : false
  );

  const metadata = descriptor.metadata || {};

  // Check if action preview exists
  const hasActionPreview = Boolean(
    metadata.primaryActionLabel || metadata.secondaryActionLabel
  );

  // [EA-30] Trust loop gate: only show after user has completed at least one cycle
  const trustLoopComplete = projectId ? shouldShowAiAssistant(projectId) : false;

  // [EA-30] User preference gate: respect user's visibility preference
  const userPrefVisible = projectId ? isAiAssistantVisible(projectId) : true;

  // Only render when:
  // 1. Trust loop is complete
  // 2. User preference allows visibility
  // 3. Not dismissed for this context
  // 4. There are issues OR action preview exists
  const shouldRender =
    trustLoopComplete &&
    userPrefVisible &&
    !isDismissed &&
    (issuesCount > 0 || hasActionPreview);

  if (!shouldRender) {
    return null;
  }

  const handleDismiss = () => {
    if (projectId) {
      dismissAiAssistantForSession(projectId, contextId);
      setIsDismissed(true);
    }
  };

  return (
    <details
      className="rounded-md border border-border/50 bg-[hsl(var(--surface-card))]/50"
      data-testid="context-panel-ai-assist-hints"
    >
      <summary className="cursor-pointer px-3 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
        <span className="flex items-center gap-1.5">
          <Icon name="status.info" size={14} aria-hidden="true" />
          Assistant
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDismiss();
          }}
          className="text-muted-foreground/60 hover:text-muted-foreground p-0.5 rounded"
          aria-label="Dismiss assistant suggestions"
          title="Dismiss"
        >
          <Icon name="action.close" size={12} aria-hidden="true" />
        </button>
      </summary>
      <div className="border-t border-border/50 px-3 py-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          You might find AI assistance helpful in the main workspace for
          exploring draft options.
        </p>
        {issuesCount > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            {issuesCount} issue{issuesCount !== 1 ? 's' : ''} detected. You can
            review these in the main workspace to explore potential fixes when
            you're ready.
          </p>
        )}
        {/* [EA-30] Advisory note */}
        <p className="mt-2 text-[10px] text-muted-foreground/60">
          These are optional suggestions. You remain in control of all changes.
        </p>
      </div>
    </details>
  );
}
