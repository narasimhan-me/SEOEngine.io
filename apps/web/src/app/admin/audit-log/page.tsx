'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

/**
 * [ADMIN-OPS-1][D8 Audit Log]
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

  if (loading && logs.length === 0) {
    return <p className="text-gray-600">Loading audit log...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h1>
      <p className="text-sm text-gray-500 mb-4">
        Immutable audit records of admin actions.
      </p>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 flex gap-4">
        <select
          value={filters.actionType}
          onChange={(e) =>
            setFilters({ ...filters, actionType: e.target.value })
          }
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Target
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.performedBy.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                    {log.performedByAdminRole}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {log.actionType.replace(/_/g, ' ')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.targetUser?.email ||
                    log.targetProject?.name ||
                    log.targetRunId ||
                    '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages} ({pagination.total}{' '}
            total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.pages, p + 1))
              }
              disabled={currentPage === pagination.pages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
