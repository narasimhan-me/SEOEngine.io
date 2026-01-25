'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import {
  useRightContextPanel,
  type ContextDescriptor,
} from '@/components/right-context-panel/RightContextPanelProvider';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';

/**
 * [ADMIN-OPS-1] Extended User interface with new fields.
 */
interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  adminRole: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  twoFactorEnabled: boolean;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
  } | null;
  _count: {
    projects: number;
  };
  aiUsageThisMonth: number;
  quotaPercent: number;
  lastActivity: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * [ADMIN-OPS-1][D2 Users Table]
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Migrated to canonical DataTable.
 * Token-only styling; no legacy gray/white table utilities.
 * Uses canonical RCP integration via DataTable's onOpenContext + getRowDescriptor.
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1] RCP integration
  const { openPanel } = useRightContextPanel();

  // Build ContextDescriptor for a user row
  // [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Fixed metadata keys
  const getUserDescriptor = useCallback(
    (user: User & DataTableRow): ContextDescriptor => {
      // Build metadata object, omitting null/undefined optional fields
      const metadata: Record<string, string> = {
        role: user.role,
        accountStatus: user.accountStatus,
        plan: user.subscription?.plan || 'free',
        projectsCount: String(user._count.projects),
        aiUsage: String(user.aiUsageThisMonth),
        // [FIXUP-4] quotaPercent is numeric-only (no % suffix); renderer adds %
        quotaPercent: String(user.quotaPercent),
        // [FIXUP-4] twoFactorEnabled is 'true'/'false' string
        twoFactorEnabled: user.twoFactorEnabled ? 'true' : 'false',
        createdAt: new Date(user.createdAt).toLocaleDateString(),
        lastActivity: new Date(user.lastActivity).toLocaleDateString(),
      };

      // [FIXUP-4] Only include adminRole if present (don't force 'None')
      if (user.adminRole) {
        metadata.adminRole = user.adminRole;
      }

      return {
        kind: 'user',
        id: user.id,
        title: user.email,
        subtitle: user.name || 'No name set',
        openHref: `/admin/users/${user.id}`,
        openHrefLabel: 'Open user details',
        metadata,
      };
    },
    []
  );

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  async function fetchUsers(page: number) {
    setLoading(true);
    try {
      const data = await adminApi.getUsers(page);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Define DataTable columns
  const columns: DataTableColumn<User & DataTableRow>[] = useMemo(
    () => [
      {
        key: 'email',
        header: 'Email',
        cell: (row) => (
          <div>
            <div className="text-sm font-medium text-foreground">
              {row.email}
            </div>
            {row.adminRole && (
              <span className="text-xs text-purple-600">{row.adminRole}</span>
            )}
          </div>
        ),
      },
      {
        key: 'plan',
        header: 'Plan',
        cell: (row) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              row.subscription?.plan === 'enterprise'
                ? 'bg-purple-100 text-purple-800'
                : row.subscription?.plan === 'pro'
                  ? 'bg-blue-100 text-blue-800'
                  : row.subscription?.plan === 'starter'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-muted text-muted-foreground'
            }`}
          >
            {row.subscription?.plan || 'free'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              row.accountStatus === 'ACTIVE'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {row.accountStatus}
          </span>
        ),
      },
      {
        key: 'aiUsage',
        header: 'AI Usage',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.aiUsageThisMonth}
          </span>
        ),
      },
      {
        key: 'quota',
        header: 'Quota %',
        cell: (row) => (
          <div className="flex items-center">
            <div className="w-16 bg-muted rounded-full h-2 mr-2">
              <div
                className={`h-2 rounded-full ${
                  row.quotaPercent >= 90
                    ? 'bg-red-500'
                    : row.quotaPercent >= 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min(row.quotaPercent, 100)}%`,
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {row.quotaPercent}%
            </span>
          </div>
        ),
      },
      {
        key: 'projects',
        header: 'Projects',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row._count.projects}
          </span>
        ),
      },
      {
        key: 'lastActivity',
        header: 'Last Activity',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.lastActivity)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        truncate: false,
        cell: (row) => (
          <Link
            href={`/admin/users/${row.id}`}
            className="text-sm text-primary hover:text-primary/80"
          >
            View
          </Link>
        ),
      },
    ],
    []
  );

  if (loading && users.length === 0) {
    return <p className="text-muted-foreground">Loading users...</p>;
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
      <h1 className="text-2xl font-bold text-foreground mb-6">Users</h1>

      {/* Users Table - Canonical DataTable with RCP integration */}
      <DataTable
        columns={columns}
        rows={users}
        onOpenContext={openPanel}
        getRowDescriptor={getUserDescriptor}
      />

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} users
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
