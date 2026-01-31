'use client';

import type { ContextDescriptor } from './RightContextPanelProvider';

/**
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Read-only "Action Preview" component.
 * Token-only, calm styling. No links, no buttons.
 *
 * Display only when relevant metadata exists:
 * - primaryActionLabel / secondaryActionLabel (do NOT render as links/buttons)
 * - "Fields affected" only when explicitly provided (do not infer)
 * - "Estimated impact" only when explicitly provided (do not infer)
 * - "Reversibility" only when explicitly provided (do not infer)
 *
 * If no action metadata present: omit section entirely (no clutter).
 */
interface ContextPanelActionPreviewProps {
  descriptor: ContextDescriptor;
}

export function ContextPanelActionPreview({
  descriptor,
}: ContextPanelActionPreviewProps) {
  const metadata = descriptor.metadata || {};

  // Check if any action preview metadata exists
  const hasPrimaryAction = Boolean(metadata.primaryActionLabel);
  const hasSecondaryAction = Boolean(metadata.secondaryActionLabel);
  const hasFieldsAffected = Boolean(metadata.fieldsAffected);
  const hasEstimatedImpact = Boolean(metadata.estimatedImpact);
  const hasReversibility = Boolean(metadata.reversibility);

  const hasAnyActionMetadata =
    hasPrimaryAction ||
    hasSecondaryAction ||
    hasFieldsAffected ||
    hasEstimatedImpact ||
    hasReversibility;

  // Omit section entirely if no action metadata present
  if (!hasAnyActionMetadata) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-border/50 bg-[hsl(var(--surface-card))] p-3"
      data-testid="context-panel-action-preview"
    >
      {/* [EA-31] Quieter heading and tighter spacing for calm supporting panel */}
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1.5">
        Action Preview
      </h4>
      <div className="space-y-1.5">
        {/* Primary action label (read-only text, not a button) */}
        {hasPrimaryAction && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Primary action
            </span>
            <span className="text-sm font-medium text-foreground">
              {metadata.primaryActionLabel}
            </span>
          </div>
        )}

        {/* Secondary action label (read-only text, not a button) */}
        {hasSecondaryAction && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Secondary action
            </span>
            <span className="text-sm text-foreground">
              {metadata.secondaryActionLabel}
            </span>
          </div>
        )}

        {/* Fields affected (only when explicitly provided) */}
        {hasFieldsAffected && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Fields affected
            </span>
            <span className="text-sm text-foreground">
              {metadata.fieldsAffected}
            </span>
          </div>
        )}

        {/* Estimated impact (only when explicitly provided) */}
        {hasEstimatedImpact && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Estimated impact
            </span>
            <span className="text-sm text-foreground">
              {metadata.estimatedImpact}
            </span>
          </div>
        )}

        {/* Reversibility (only when explicitly provided) */}
        {hasReversibility && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Reversibility</span>
            <span className="text-sm text-foreground">
              {metadata.reversibility}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
