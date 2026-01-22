'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  useRightContextPanel,
  type PanelView,
} from './RightContextPanelProvider';
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

function PinIcon({
  className,
  isPinned,
}: {
  className?: string;
  isPinned: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={isPinned ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 2v8m0 0l4-4m-4 4l-4-4M5 10h14v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4zM12 16v6" />
    </svg>
  );
}

function WidthIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" />
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

const VIEW_TABS: { id: PanelView; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'history', label: 'History' },
  { id: 'help', label: 'Help' },
];

/**
 * Right Context Panel UI component.
 * Renders a slide-in panel on the right side of the layout.
 * - Desktop (≥1024px): Pinned mode, pushes content
 * - Narrow (<1024px): Overlay mode with scrim (container-contained, not viewport-fixed)
 *
 * Z-index: below Command Palette (z-50), above main content.
 */
export function RightContextPanel() {
  const {
    isOpen,
    descriptor,
    activeView,
    widthMode,
    isPinned,
    closePanel,
    setActiveView,
    togglePinned,
    toggleWidthMode,
  } = useRightContextPanel();
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

  const panelWidth = widthMode === 'wide' ? 'w-96 lg:w-[28rem]' : 'w-80';

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
      <aside
        ref={panelRef}
        id="right-context-panel"
        role="complementary"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="right-context-panel"
        className={[
          'z-40 flex flex-col border-l border-border bg-[hsl(var(--surface-raised))]',
          // Narrow: overlay mode (absolute within container, not viewport-fixed)
          'absolute inset-y-0 right-0 lg:relative lg:inset-auto',
          panelWidth,
          // Desktop: pinned mode (part of flex layout)
          'lg:shrink-0',
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
          <div className="ml-2 flex items-center gap-1">
            {/* Open full page action */}
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
            {/* Width toggle */}
            <button
              type="button"
              onClick={toggleWidthMode}
              title={widthMode === 'default' ? 'Expand panel' : 'Shrink panel'}
              data-testid="right-context-panel-width-toggle"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <WidthIcon className="h-4 w-4" />
            </button>
            {/* Pin toggle */}
            <button
              type="button"
              onClick={togglePinned}
              aria-pressed={isPinned}
              title={isPinned ? 'Unpin panel' : 'Pin panel'}
              data-testid="right-context-panel-pin-toggle"
              className={[
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isPinned
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              <PinIcon className="h-4 w-4" isPinned={isPinned} />
            </button>
            {/* Close button */}
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

        {/* View Tabs */}
        <div className="flex border-b border-border">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              data-testid={`right-context-panel-tab-${tab.id}`}
              className={[
                'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                activeView === tab.id
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <ContextPanelContentRenderer
            activeView={activeView}
            descriptor={descriptor}
          />
        </div>
      </aside>
    </>
  );
}
