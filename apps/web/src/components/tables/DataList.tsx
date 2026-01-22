'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { ContextDescriptor } from '@/components/right-context-panel/RightContextPanelProvider';

/**
 * Row definition for DataList.
 */
export interface DataListRow {
  /** Unique identifier for the row */
  id: string;
}

/**
 * Props for DataList component.
 */
export interface DataListProps<T extends DataListRow> {
  /** Row data */
  rows: T[];
  /** Row renderer function */
  renderRow: (row: T) => ReactNode;
  /** Callback when context action is triggered for a row */
  onOpenContext?: (descriptor: ContextDescriptor) => void;
  /** Function to create a ContextDescriptor from a row */
  getRowDescriptor?: (row: T) => ContextDescriptor;
  /** Density: 'comfortable' (default) or 'dense' */
  density?: 'comfortable' | 'dense';
  /** Optional footer content */
  footer?: ReactNode;
  /** Optional: hide the context action */
  hideContextAction?: boolean;
}

function ViewDetailsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

/**
 * Canonical DataList component for list-style rows.
 * Token-only styling; dark-mode native; Shopify iframe safe.
 *
 * Row interaction contract:
 * - Row click does NOT navigate and does NOT open RCP
 * - Hover/active/focus states are token-based (never white in dark mode)
 * - Primary contextual action is explicit and right-aligned ("View details" button)
 */
export function DataList<T extends DataListRow>({
  rows,
  renderRow,
  onOpenContext,
  getRowDescriptor,
  density = 'comfortable',
  footer,
  hideContextAction = false,
}: DataListProps<T>) {
  // Initialize focused row to 0 so first row is tabbable when rows exist
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(
    rows.length > 0 ? 0 : -1
  );
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Clamp focus index when row count changes
  useEffect(() => {
    if (rows.length === 0) {
      if (focusedRowIndex !== -1) setFocusedRowIndex(-1);
      return;
    }
    if (focusedRowIndex < 0 || focusedRowIndex > rows.length - 1) {
      setFocusedRowIndex(0);
    }
  }, [rows.length, focusedRowIndex]);

  const paddingClass = density === 'dense' ? 'px-3 py-2' : 'px-4 py-3';

  /**
   * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Check if event target is an interactive element.
   * When true, row keyboard handling should be skipped to allow native element behavior.
   */
  const isInteractiveElement = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    // Interactive elements: a, button, input, textarea, select, [contenteditable], [data-no-row-keydown]
    return !!(
      target.closest('a') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('[contenteditable]') ||
      target.closest('[data-no-row-keydown]')
    );
  }, []);

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, rowIndex: number, row: T) => {
      // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Skip row handling for interactive elements
      // This prevents DataList from hijacking Enter/Arrow on links/buttons/selects inside rows
      if (isInteractiveElement(event.target)) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (rowIndex < rows.length - 1) {
            setFocusedRowIndex(rowIndex + 1);
            rowRefs.current[rowIndex + 1]?.focus();
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (rowIndex > 0) {
            setFocusedRowIndex(rowIndex - 1);
            rowRefs.current[rowIndex - 1]?.focus();
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (onOpenContext && getRowDescriptor) {
            onOpenContext(getRowDescriptor(row));
          }
          break;
      }
    },
    [rows.length, onOpenContext, getRowDescriptor, isInteractiveElement]
  );

  const handleContextClick = useCallback(
    (row: T) => {
      if (onOpenContext && getRowDescriptor) {
        onOpenContext(getRowDescriptor(row));
      }
    },
    [onOpenContext, getRowDescriptor]
  );

  return (
    <div
      className="w-full overflow-hidden rounded-md border border-border"
      data-testid="data-list"
    >
      <div className="divide-y divide-border bg-[hsl(var(--surface-card))]">
        {rows.map((row, rowIndex) => (
          <div
            key={row.id}
            ref={(el) => {
              rowRefs.current[rowIndex] = el;
            }}
            tabIndex={focusedRowIndex === rowIndex ? 0 : -1}
            onFocus={() => setFocusedRowIndex(rowIndex)}
            onKeyDown={(e) => handleRowKeyDown(e, rowIndex, row)}
            data-testid="data-list-row"
            data-row-id={row.id}
            className={[
              paddingClass,
              'flex items-center gap-4 transition-colors',
              'hover:bg-[hsl(var(--menu-hover-bg)/0.14)]',
              'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
            ].join(' ')}
          >
            <div className="min-w-0 flex-1">{renderRow(row)}</div>
            {!hideContextAction && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => handleContextClick(row)}
                title="View details"
                aria-label={`View details for ${row.id}`}
                data-testid="data-list-open-context"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                <ViewDetailsIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {footer && (
        <div className="border-t border-border bg-[hsl(var(--surface-card))] px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}
