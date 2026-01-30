'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRightContextPanel } from './RightContextPanelProvider';
import { ContextPanelContentRenderer } from './ContextPanelContentRenderer';

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

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

/**
 * Right Context Panel UI component.
 * [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Simplified autonomous panel:
 * - No pin/width/tab controls (removed)
 * - Fixed default width
 * - Desktop (≥1024px): Part of flex layout, pushes content
 * - Narrow (<1024px): Overlay mode with scrim (container-contained)
 * - Only manual control: Close button (X), ESC key, scrim click
 * - Header external-link is the sole navigation affordance
 *
 * [WORK-CANVAS-ARCHITECTURE-LOCK-1] RCP Contract Lock:
 * - Only close/collapse control remains (no mode switching)
 * - Header external-link is the ONLY navigation affordance
 * - RCP NEVER changes route - it displays context only
 * - Content rhythm: Why this matters → Impact/risk → What can be done → Optional deep detail
 *
 * Z-index: below Command Palette (z-50), above main content.
 */
export function RightContextPanel() {
  const { isOpen, descriptor, activeView, closePanel } = useRightContextPanel();
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

  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Fixed default width (no width toggle)
  const panelWidth = 'w-80';

  return (
    <>
      {/* Scrim for narrow viewports (overlay mode) - container-contained via absolute positioning */}
      <div
        className="absolute inset-0 z-30 bg-foreground/50 lg:hidden"
        onClick={closePanel}
        aria-hidden="true"
      />

      {/* Panel - container-contained in overlay mode, part of flex layout in pinned mode */}
      {/* Z-index 40 to stay below Command Palette (z-50) but above content */}
      {/* [EA-31] Reduced visual weight: quieter border, secondary surface for calm supporting UI */}
      <aside
        ref={panelRef}
        id="right-context-panel"
        role="complementary"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="right-context-panel"
        className={[
          'z-40 flex flex-col border-l border-border/60 bg-[hsl(var(--surface-secondary,var(--surface-raised)))]',
          // Narrow: overlay mode (absolute within container, not viewport-fixed)
          'absolute inset-y-0 right-0 lg:relative lg:inset-auto',
          panelWidth,
          // Desktop: pinned mode (part of flex layout)
          'lg:shrink-0',
        ].join(' ')}
      >
        {/* Panel Header */}
        {/* [UI-POLISH-&-CLARITY-1] Increased header vertical padding */}
        {/* [EA-31] Reduced header emphasis for calm secondary panel presence */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              data-testid="right-context-panel-title"
              className="truncate text-sm font-medium text-foreground/90"
            >
              {descriptor.title}
            </h2>
            {descriptor.subtitle && (
              <p className="truncate text-xs text-muted-foreground/80">
                {descriptor.subtitle}
              </p>
            )}
          </div>
          <div className="ml-2 flex items-center gap-1">
            {/* [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Header external-link is the sole navigation affordance */}
            {descriptor.openHref && (
              <Link
                href={descriptor.openHref}
                title={descriptor.openHrefLabel || 'Open full page'}
                data-testid="right-context-panel-open-full"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </Link>
            )}
            {/* [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Close button is the only manual control */}
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close panel"
              data-testid="right-context-panel-close"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* [RIGHT-CONTEXT-PANEL-AUTONOMY-1] View tabs removed; panel shows Details view only */}
        {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1] No navigation/mode controls - RCP is context display only */}

        {/* Panel Content */}
        {/* [UI-POLISH-&-CLARITY-1] Increased content padding */}
        {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1] Content rhythm: Why this matters → Impact/risk → What can be done → Optional deep detail */}
        <div className="flex-1 overflow-y-auto p-5">
          <ContextPanelContentRenderer
            activeView={activeView}
            descriptor={descriptor}
          />
        </div>
      </aside>
    </>
  );
}
