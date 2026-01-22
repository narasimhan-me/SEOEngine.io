'use client';

import { useEffect, useState, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';

/**
 * [ADMIN-OPS-1][D8 Audit Log]
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4] Migrated to canonical DataTable.
 */
interface AuditLogEntry {
  id: string;
  createdAt: string;
  performedByUserId: string;
  performedByAdminRole: string;
  actionType: string;
  targetUserId: string | null;
  targetProjectId: string | null;
  targetRunId: string | null;
  metadata: Record<string, unknown> | null;
  performedBy: { email: string };
  targetUser: { email: string } | null;
  targetProject: { name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ actionType: '' });

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLog({
        page: currentPage,
        limit: 50,
        actionType: filters.actionType || undefined,
      });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4] Define DataTable columns
  const columns: DataTableColumn<AuditLogEntry & DataTableRow>[] = useMemo(
    () => [
      {
        key: 'time',
        header: 'Time',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'actor',
        header: 'Actor',
        cell: (row) => (
          <span className="text-sm text-foreground">
            {row.performedBy.email}
          </span>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        cell: (row) => (
          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
            {row.performedByAdminRole}
          </span>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        cell: (row) => (
          <span className="text-sm font-medium text-foreground">
            {row.actionType.replace(/_/g, ' ')}
          </span>
        ),
      },
      {
        key: 'target',
        header: 'Target',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.targetUser?.email ||
              row.targetProject?.name ||
              row.targetRunId ||
              '-'}
          </span>
        ),
      },
    ],
    []
  );

  if (loading && logs.length === 0) {
    return <p className="text-muted-foreground">Loading audit log...</p>;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Audit Log</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Immutable audit records of admin actions.
      </p>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4 mb-6 flex gap-4">
        <select
          value={filters.actionType}
          onChange={(e) =>
            setFilters({ ...filters, actionType: e.target.value })
          }
          className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          data-no-row-keydown
        >
          <option value="">All Action Types</option>
          <option value="impersonation">Impersonation</option>
          <option value="quota_reset">Quota Reset</option>
          <option value="plan_override">Plan Override</option>
          <option value="project_resync">Project Resync</option>
          <option value="run_retry">Run Retry</option>
          <option value="admin_role_change">Admin Role Change</option>
        </select>
      </div>

      {/* Audit Log Table - Canonical DataTable */}
      <DataTable columns={columns} rows={logs} hideContextAction={true} />

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages} ({pagination.total}{' '}
            total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.pages, p + 1))
              }
              disabled={currentPage === pagination.pages}
              className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
