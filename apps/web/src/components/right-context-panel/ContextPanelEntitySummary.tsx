'use client';

import type { ContextDescriptor } from './RightContextPanelProvider';

/**
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Read-only "Contextual Summary" component for asset kinds.
 * Token-only styling, no links, no buttons.
 *
 * Display (compact, scannable):
 * - Type (Product/Page/Collection derived from descriptor.kind or metadata.entityType)
 * - Status (string from metadata.statusLabel OR metadata.chipLabel OR metadata.shopifyStatus; never infer if absent)
 * - Last synced timestamp (from metadata.lastSynced, fallback "Not available")
 * - Last applied timestamp (from metadata.lastApplied, fallback "Not available")
 */
interface ContextPanelEntitySummaryProps {
  descriptor: ContextDescriptor;
}

export function ContextPanelEntitySummary({
  descriptor,
}: ContextPanelEntitySummaryProps) {
  const metadata = descriptor.metadata || {};

  // Derive entity type from metadata.entityType or descriptor.kind
  const entityType =
    metadata.entityType ||
    (descriptor.kind === 'product'
      ? 'Product'
      : descriptor.kind === 'page'
        ? 'Page'
        : descriptor.kind === 'collection'
          ? 'Collection'
          : descriptor.kind);

  // Derive status from metadata (locked vocabulary, never infer)
  const status =
    metadata.statusLabel ||
    metadata.chipLabel ||
    metadata.shopifyStatus ||
    null;

  // Timestamps
  const lastSynced = metadata.lastSynced || 'Not available';
  const lastApplied = metadata.lastApplied || 'Not available';

  return (
    <div
      className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3"
      data-testid="context-panel-entity-summary"
    >
      <div className="space-y-2">
        {/* Type + Status row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Type
          </span>
          <span className="text-sm text-foreground">{entityType}</span>
        </div>

        {/* Status (only if present) */}
        {status && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {status}
            </span>
          </div>
        )}

        {/* Last synced */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Last synced
          </span>
          <span className="text-sm text-foreground">{lastSynced}</span>
        </div>

        {/* Last applied */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Last applied
          </span>
          <span className="text-sm text-foreground">{lastApplied}</span>
        </div>
      </div>
    </div>
  );
}
