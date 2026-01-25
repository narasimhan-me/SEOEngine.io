'use client';

import type { ContextDescriptor } from './RightContextPanelProvider';

/**
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Optional, collapsed-by-default AI hints section.
 * Token-only styling, no links, no chat UI.
 *
 * Render only when:
 * - There are issues (issuesCount > 0) OR
 * - Action preview exists (primaryActionLabel or secondaryActionLabel present)
 *
 * Copy is non-prescriptive and truthful (no auto-generation, no implied execution).
 */
interface ContextPanelAiAssistHintsProps {
  descriptor: ContextDescriptor;
  /** Optional count of issues; when provided, affects render condition */
  issuesCount?: number;
}

export function ContextPanelAiAssistHints({
  descriptor,
  issuesCount = 0,
}: ContextPanelAiAssistHintsProps) {
  const metadata = descriptor.metadata || {};

  // Check if action preview exists
  const hasActionPreview = Boolean(
    metadata.primaryActionLabel || metadata.secondaryActionLabel
  );

  // Only render when there are issues OR action preview exists
  const shouldRender = issuesCount > 0 || hasActionPreview;

  if (!shouldRender) {
    return null;
  }

  return (
    <details
      className="rounded-md border border-border bg-[hsl(var(--surface-card))]"
      data-testid="context-panel-ai-assist-hints"
    >
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
        AI Assistance
      </summary>
      <div className="border-t border-border px-3 py-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          AI assistance may be available in the main workspace for draft
          generation.
        </p>
        {issuesCount > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            {issuesCount} issue{issuesCount !== 1 ? 's' : ''} detected. Review
            issues in the main workspace to explore fix options.
          </p>
        )}
      </div>
    </details>
  );
}
