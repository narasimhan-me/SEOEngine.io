'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { ContextDescriptor } from '@/components/right-context-panel/RightContextPanelProvider';

/**
 * Column definition for DataTable.
 */
export interface DataTableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Header label */
  header: string;
  /** Cell renderer function */
  cell: (row: T) => ReactNode;
  /** Optional: truncate cell content (default: true) */
  truncate?: boolean;
  /** Optional: column width class (Tailwind) */
  width?: string;
}

/**
 * Row definition for DataTable.
 */
export interface DataTableRow {
  /** Unique identifier for the row */
  id: string;
}

/**
 * Props for DataTable component.
 */
export interface DataTableProps<T extends DataTableRow> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Row data */
  rows: T[];
  /** Callback when context action is triggered for a row */
  onOpenContext?: (descriptor: ContextDescriptor) => void;
  /** Function to create a ContextDescriptor from a row */
  getRowDescriptor?: (row: T) => ContextDescriptor;
  /** Density: 'comfortable' (default) or 'dense' */
  density?: 'comfortable' | 'dense';
  /** Optional footer content */
  footer?: ReactNode;
  /** Optional: hide the context action column */
  hideContextAction?: boolean;
  /**
   * Optional: callback when a row is clicked (must NOT navigate).
   * Click is ignored if target is interactive element (a, button, input, textarea, select, [data-no-row-click]).
   */
  onRowClick?: (row: T) => void;
  /**
   * Optional: determines if a row is expanded.
   * When true, renderExpandedContent is called for that row.
   */
  isRowExpanded?: (row: T) => boolean;
  /**
   * Optional: renders expanded content below the row.
   * Only called when isRowExpanded(row) returns true.
   */
  renderExpandedContent?: (row: T) => ReactNode;
  /**
   * Optional: determines Enter/Space key behavior on rows.
   * - 'openContext' (default): triggers onOpenContext + getRowDescriptor (canonical DataTable behavior)
   * - 'rowClick': triggers onRowClick (for progressive disclosure remounts)
   */
  rowEnterKeyBehavior?: 'openContext' | 'rowClick';
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
 * Canonical DataTable component.
 * Token-only styling; dark-mode native; Shopify iframe safe.
 *
 * Row interaction contract:
 * - Row click does NOT navigate and does NOT open RCP
 * - Hover/active/focus states are token-based (never white in dark mode)
 * - Primary contextual action is explicit and right-aligned ("View details" button)
 */
export function DataTable<T extends DataTableRow>({
  columns,
  rows,
  onOpenContext,
  getRowDescriptor,
  density = 'comfortable',
  footer,
  hideContextAction = false,
  onRowClick,
  isRowExpanded,
  renderExpandedContent,
  rowEnterKeyBehavior = 'openContext',
}: DataTableProps<T>) {
  // Initialize focused row to 0 so first row is tabbable when rows exist
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(
    rows.length > 0 ? 0 : -1
  );
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

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

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>, rowIndex: number, row: T) => {
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
          // rowEnterKeyBehavior determines action: 'rowClick' for progressive disclosure, 'openContext' for RCP
          if (rowEnterKeyBehavior === 'rowClick' && onRowClick) {
            onRowClick(row);
          } else if (onOpenContext && getRowDescriptor) {
            onOpenContext(getRowDescriptor(row));
          }
          break;
      }
    },
    [rows.length, onOpenContext, getRowDescriptor, rowEnterKeyBehavior, onRowClick]
  );

  const handleContextClick = useCallback(
    (row: T) => {
      if (onOpenContext && getRowDescriptor) {
        onOpenContext(getRowDescriptor(row));
      }
    },
    [onOpenContext, getRowDescriptor]
  );

  /**
   * Handle row click, ignoring interactive elements.
   * Does NOT navigate - caller controls behavior via onRowClick.
   */
  const handleRowClick = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>, row: T) => {
      if (!onRowClick) return;

      const target = event.target as HTMLElement;
      // Ignore clicks on interactive elements
      if (
        target.closest('a') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.closest('[data-no-row-click]')
      ) {
        return;
      }

      onRowClick(row);
    },
    [onRowClick]
  );

  // Calculate total column count for expanded row colSpan
  const totalColumns = columns.length + (hideContextAction ? 0 : 1);

  return (
    <div className="w-full overflow-hidden rounded-md border border-border">
      <table
        className="w-full border-collapse"
        data-testid="data-table"
      >
        <thead>
          <tr className="border-b border-border bg-[hsl(var(--surface-raised))]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={[
                  paddingClass,
                  'text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                  column.width || '',
                ].join(' ')}
              >
                {column.header}
              </th>
            ))}
            {!hideContextAction && (
              <th
                className={[
                  paddingClass,
                  'w-12 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                ].join(' ')}
              >
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-[hsl(var(--surface-card))]">
          {rows.map((row, rowIndex) => {
            const isExpanded = isRowExpanded?.(row) ?? false;

            return (
              <Fragment key={row.id}>
                <tr
                  ref={(el) => {
                    rowRefs.current[rowIndex] = el;
                  }}
                  tabIndex={focusedRowIndex === rowIndex ? 0 : -1}
                  onFocus={() => setFocusedRowIndex(rowIndex)}
                  onKeyDown={(e) => handleRowKeyDown(e, rowIndex, row)}
                  onClick={(e) => handleRowClick(e, row)}
                  data-testid="data-table-row"
                  data-row-id={row.id}
                  data-expanded={isExpanded}
                  className={[
                    'border-b border-border transition-colors',
                    isExpanded ? '' : 'last:border-b-0',
                    onRowClick ? 'cursor-pointer' : '',
                    'hover:bg-[hsl(var(--menu-hover-bg)/0.14)]',
                    'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
                  ].join(' ')}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        paddingClass,
                        'text-sm text-foreground',
                        column.truncate !== false ? 'truncate' : '',
                        column.width || '',
                      ].join(' ')}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                  {!hideContextAction && (
                    <td className={[paddingClass, 'text-right'].join(' ')}>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => handleContextClick(row)}
                        title="View details"
                        aria-label={`View details for ${row.id}`}
                        data-testid="data-table-open-context"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                      >
                        <ViewDetailsIcon className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
                {/* Expansion row - rendered when isRowExpanded returns true */}
                {isExpanded && renderExpandedContent && (
                  <tr
                    data-testid="data-table-expanded-row"
                    data-row-id={row.id}
                    className="border-b border-border bg-[hsl(var(--surface-raised))] last:border-b-0"
                  >
                    <td colSpan={totalColumns} className="p-0">
                      <div className="px-4 py-3">
                        {renderExpandedContent(row)}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {footer && (
        <div className="border-t border-border bg-[hsl(var(--surface-card))] px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}
