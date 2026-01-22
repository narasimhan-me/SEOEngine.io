'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';

/**
 * [ADMIN-OPS-1][D3 Projects Table]
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4] Migrated to canonical DataTable.
 */
interface Project {
  id: string;
  name: string;
  domain: string;
  user: { id: string; email: string };
  shopifyStore: string | null;
  deoScore: number | null;
  productCount: number;
  lastSyncTime: string | null;
  lastRunStatus: string | null;
  lastRunTime: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [resyncLoading, setResyncLoading] = useState<string | null>(null);

  const fetchProjects = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const data = await adminApi.getProjects(page);
      setProjects(data.projects);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects(currentPage);
  }, [currentPage, fetchProjects]);

  async function handleResync(projectId: string) {
    if (
      !confirm(
        'Trigger safe resync for this project? This will NOT trigger any AI work.'
      )
    ) {
      return;
    }
    setResyncLoading(projectId);
    try {
      await adminApi.resyncProject(projectId);
      alert('Resync initiated successfully');
      fetchProjects(currentPage);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resync');
    } finally {
      setResyncLoading(null);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4] Define DataTable columns
  const columns: DataTableColumn<Project & DataTableRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.user.email}
          </span>
        ),
      },
      {
        key: 'project',
        header: 'Project',
        cell: (row) => (
          <div>
            <div className="text-sm font-medium text-foreground">
              {row.name}
            </div>
            <div className="text-xs text-muted-foreground">{row.domain}</div>
          </div>
        ),
      },
      {
        key: 'shopify',
        header: 'Shopify',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.shopifyStore || '-'}
          </span>
        ),
      },
      {
        key: 'deo',
        header: 'DEO',
        cell: (row) =>
          row.deoScore !== null ? (
            <span
              className={`text-sm font-medium ${
                row.deoScore >= 80
                  ? 'text-green-600'
                  : row.deoScore >= 60
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {row.deoScore}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          ),
      },
      {
        key: 'products',
        header: 'Products',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.productCount}
          </span>
        ),
      },
      {
        key: 'lastSync',
        header: 'Last Sync',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.lastSyncTime)}
          </span>
        ),
      },
      {
        key: 'lastRun',
        header: 'Last Run',
        cell: (row) =>
          row.lastRunStatus ? (
            <span
              className={`inline-flex px-2 py-1 text-xs rounded-full ${
                row.lastRunStatus === 'SUCCEEDED'
                  ? 'bg-green-100 text-green-800'
                  : row.lastRunStatus === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {row.lastRunStatus}
            </span>
          ) : null,
      },
      {
        key: 'actions',
        header: 'Actions',
        cell: (row) =>
          row.shopifyStore ? (
            <button
              onClick={() => handleResync(row.id)}
              disabled={resyncLoading === row.id}
              className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
            >
              {resyncLoading === row.id ? 'Syncing...' : 'Resync'}
            </button>
          ) : null,
      },
    ],
    [resyncLoading]
  );

  if (loading && projects.length === 0) {
    return <p className="text-muted-foreground">Loading projects...</p>;
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
      <h1 className="text-2xl font-bold text-foreground mb-6">Projects</h1>

      {/* Projects Table - Canonical DataTable */}
      <DataTable columns={columns} rows={projects} hideContextAction={true} />

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
