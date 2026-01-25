'use client';

import { useCallback } from 'react';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { DataList } from '@/components/tables/DataList';
import { useRightContextPanel } from '@/components/right-context-panel/RightContextPanelProvider';
import type { ContextDescriptor } from '@/components/right-context-panel/RightContextPanelProvider';

// Static placeholder data for DataTable
interface TableRow {
  id: string;
  name: string;
  status: string;
  category: string;
}

const TABLE_ROWS: TableRow[] = [
  { id: 'row-1', name: 'Product Alpha', status: 'Active', category: 'Electronics' },
  { id: 'row-2', name: 'Product Beta', status: 'Pending', category: 'Apparel' },
  { id: 'row-3', name: 'Product Gamma', status: 'Draft', category: 'Home & Garden' },
];

const TABLE_COLUMNS: DataTableColumn<TableRow>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'status', header: 'Status', cell: (row) => row.status, width: 'w-24' },
  { key: 'category', header: 'Category', cell: (row) => row.category },
];

// Static placeholder data for DataList
interface ListRow {
  id: string;
  title: string;
  description: string;
}

const LIST_ROWS: ListRow[] = [
  { id: 'item-1', title: 'Task One', description: 'First task description' },
  { id: 'item-2', title: 'Task Two', description: 'Second task description' },
  { id: 'item-3', title: 'Task Three', description: 'Third task description' },
];

/**
 * Demo page for DataTable and DataList components.
 * Used for manual testing of the canonical table/list system.
 */
export default function TablesListsDemoPage() {
  const { openPanel } = useRightContextPanel();

  // Stable descriptor generators (no changing values)
  const getTableRowDescriptor = useCallback((row: TableRow): ContextDescriptor => ({
    kind: 'product',
    id: row.id,
    title: row.name,
    subtitle: row.category,
    metadata: {
      Status: row.status,
      Type: 'Table Row',
    },
  }), []);

  const getListRowDescriptor = useCallback((row: ListRow): ContextDescriptor => ({
    kind: 'task',
    id: row.id,
    title: row.title,
    subtitle: row.description,
    metadata: {
      Type: 'List Item',
    },
  }), []);

  const handleOpenContext = useCallback((descriptor: ContextDescriptor) => {
    openPanel(descriptor);
  }, [openPanel]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Tables &amp; Lists Demo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Canonical DataTable and DataList components for Design System v1.5.
          Use &quot;View details&quot; (eye icon) to open the Right Context Panel.
        </p>
      </div>

      {/* DataTable Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">DataTable</h2>
        <DataTable
          columns={TABLE_COLUMNS}
          rows={TABLE_ROWS}
          onOpenContext={handleOpenContext}
          getRowDescriptor={getTableRowDescriptor}
          footer={
            <p className="text-xs text-muted-foreground">
              Showing {TABLE_ROWS.length} of {TABLE_ROWS.length} items
            </p>
          }
        />
      </section>

      {/* DataList Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">DataList</h2>
        <DataList
          rows={LIST_ROWS}
          renderRow={(row) => (
            <div>
              <p className="text-sm font-medium text-foreground">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.description}</p>
            </div>
          )}
          onOpenContext={handleOpenContext}
          getRowDescriptor={getListRowDescriptor}
          footer={
            <p className="text-xs text-muted-foreground">
              Showing {LIST_ROWS.length} of {LIST_ROWS.length} items
            </p>
          }
        />
      </section>

      {/* Text Input for ESC-in-input verification */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          ESC Key Test Input
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Focus this input and press ESC to verify the panel does NOT close when
          focus is in an editable element.
        </p>
        <input
          type="text"
          placeholder="Type here and press ESC..."
          className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        />
      </section>

      {/* Keyboard Instructions */}
      <section className="rounded-md border border-border bg-[hsl(var(--surface-raised))] p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Keyboard Navigation
        </h2>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
              Tab
            </kbd>{' '}
            — Enter table/list focus
          </li>
          <li>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
              ↑
            </kbd>{' '}
            /{' '}
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
              ↓
            </kbd>{' '}
            — Move between rows
          </li>
          <li>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
              Enter
            </kbd>{' '}
            /{' '}
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
              Space
            </kbd>{' '}
            — Open RCP for focused row
          </li>
          <li>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
              Esc
            </kbd>{' '}
            — Close RCP (unless focus is in input)
          </li>
        </ul>
      </section>
    </div>
  );
}
