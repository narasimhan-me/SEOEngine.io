'use client';

import { useEffect, useRef } from 'react';
import { useRightContextPanel } from './RightContextPanelProvider';

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Right Context Panel UI component.
 * Renders a slide-in panel on the right side of the layout.
 * - Desktop (≥1024px): Pinned mode, pushes content
 * - Narrow (<1024px): Overlay mode with scrim (container-contained, not viewport-fixed)
 */
export function RightContextPanel() {
  const { isOpen, descriptor, closePanel } = useRightContextPanel();
  const panelRef = useRef<HTMLElement>(null);
  const titleId = 'right-context-panel-title';

  // Focus the panel when it opens
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !descriptor) {
    return null;
  }

  return (
    <>
      {/* Scrim for narrow viewports (overlay mode) - container-contained via absolute positioning */}
      <div
        className="absolute inset-0 z-40 bg-foreground/50 lg:hidden"
        onClick={closePanel}
        aria-hidden="true"
      />

      {/* Panel - container-contained in overlay mode, part of flex layout in pinned mode */}
      <aside
        ref={panelRef}
        id="right-context-panel"
        role="complementary"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="right-context-panel"
        className={[
          'z-50 flex flex-col border-l border-border bg-[hsl(var(--surface-raised))]',
          // Narrow: overlay mode (absolute within container, not viewport-fixed)
          'absolute inset-y-0 right-0 w-80 lg:relative lg:inset-auto',
          // Desktop: pinned mode (part of flex layout)
          'lg:w-80 lg:shrink-0',
        ].join(' ')}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              data-testid="right-context-panel-title"
              className="truncate text-sm font-semibold text-foreground"
            >
              {descriptor.title}
            </h2>
            {descriptor.subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {descriptor.subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close panel"
            data-testid="right-context-panel-close"
            className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Placeholder content showing descriptor info */}
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Kind
              </p>
              <p className="mt-1 text-sm text-foreground">{descriptor.kind}</p>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                ID
              </p>
              <p className="mt-1 text-sm text-foreground">{descriptor.id}</p>
            </div>
            {descriptor.metadata &&
              Object.entries(descriptor.metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {key}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{value}</p>
                </div>
              ))}
          </div>
        </div>
      </aside>
    </>
  );
}
