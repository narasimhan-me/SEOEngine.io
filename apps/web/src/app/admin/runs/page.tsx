'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';

/**
 * [ADMIN-OPS-1][D4 Runs Explorer]
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Migrated to canonical DataTable.
 */
interface Run {
  id: string;
  projectId: string;
  playbookId: string;
  runType: string;
  status: string;
  aiUsed: boolean;
  reused: boolean;
  createdAt: string;
  project: {
    name: string;
    user: { email: string };
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminRunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    runType: '',
    status: '',
    aiUsed: '',
  });

  useEffect(() => {
    fetchRuns();
  }, [currentPage, filters]);

  async function fetchRuns() {
    setLoading(true);
    try {
      const data = await adminApi.getRuns({
        page: currentPage,
        limit: 20,
        runType: filters.runType || undefined,
        status: filters.status || undefined,
        aiUsed:
          filters.aiUsed === 'true'
            ? true
            : filters.aiUsed === 'false'
              ? false
              : undefined,
      });
      setRuns(data.runs);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
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

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Define DataTable columns
  const columns: DataTableColumn<Run & DataTableRow>[] = useMemo(
    () => [
      {
        key: 'project',
        header: 'Project',
        cell: (row) => (
          <div>
            <div className="text-sm font-medium text-foreground">
              {row.project.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.project.user.email}
            </div>
          </div>
        ),
      },
      {
        key: 'runType',
        header: 'Run Type',
        cell: (row) => (
          <span className="text-sm text-foreground">{row.runType}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => (
          <span
            className={`inline-flex px-2 py-1 text-xs rounded-full ${
              row.status === 'SUCCEEDED'
                ? 'bg-green-100 text-green-800'
                : row.status === 'FAILED'
                  ? 'bg-red-100 text-red-800'
                  : row.status === 'RUNNING'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-muted text-muted-foreground'
            }`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: 'aiUsed',
        header: 'AI Used',
        cell: (row) =>
          row.aiUsed ? (
            <span className="text-sm text-orange-600">Yes</span>
          ) : (
            <span className="text-sm text-muted-foreground">No</span>
          ),
      },
      {
        key: 'reused',
        header: 'Reused',
        cell: (row) =>
          row.reused ? (
            <span className="text-sm text-green-600">Yes</span>
          ) : (
            <span className="text-sm text-muted-foreground">No</span>
          ),
      },
      {
        key: 'created',
        header: 'Created',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        truncate: false,
        cell: (row) => (
          <Link
            href={`/admin/runs/${row.id}`}
            className="text-sm text-primary hover:text-primary/80"
          >
            View
          </Link>
        ),
      },
    ],
    []
  );

  if (loading && runs.length === 0) {
    return <p className="text-muted-foreground">Loading runs...</p>;
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
      <h1 className="text-2xl font-bold text-foreground mb-6">Runs</h1>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4 mb-6 flex gap-4">
        <select
          value={filters.runType}
          onChange={(e) => setFilters({ ...filters, runType: e.target.value })}
          className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          data-no-row-keydown
        >
          <option value="">All Run Types</option>
          <option value="PREVIEW_GENERATE">Preview Generate</option>
          <option value="DRAFT_GENERATE">Draft Generate</option>
          <option value="APPLY">Apply</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          data-no-row-keydown
        >
          <option value="">All Statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="RUNNING">Running</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="FAILED">Failed</option>
          <option value="STALE">Stale</option>
        </select>
        <select
          value={filters.aiUsed}
          onChange={(e) => setFilters({ ...filters, aiUsed: e.target.value })}
          className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          data-no-row-keydown
        >
          <option value="">AI Used: Any</option>
          <option value="true">AI Used: Yes</option>
          <option value="false">AI Used: No</option>
        </select>
      </div>

      {/* Runs Table - Canonical DataTable */}
      <DataTable columns={columns} rows={runs} hideContextAction={true} />

      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 hover:bg-muted"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.pages, p + 1))
              }
              disabled={currentPage === pagination.pages}
              className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
