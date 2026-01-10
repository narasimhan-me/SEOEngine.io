'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';

/**
 * [ADMIN-OPS-1][D4 Runs Explorer]
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
        aiUsed: filters.aiUsed === 'true' ? true : filters.aiUsed === 'false' ? false : undefined,
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

  if (loading && runs.length === 0) {
    return <p className="text-gray-600">Loading runs...</p>;
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Runs</h1>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 flex gap-4">
        <select
          value={filters.runType}
          onChange={(e) => setFilters({ ...filters, runType: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Run Types</option>
          <option value="PREVIEW_GENERATE">Preview Generate</option>
          <option value="DRAFT_GENERATE">Draft Generate</option>
          <option value="APPLY">Apply</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
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
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">AI Used: Any</option>
          <option value="true">AI Used: Yes</option>
          <option value="false">AI Used: No</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Run Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Used</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reused</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {runs.map((run) => (
              <tr key={run.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{run.project.name}</div>
                  <div className="text-xs text-gray-500">{run.project.user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{run.runType}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    run.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' :
                    run.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    run.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {run.aiUsed ? <span className="text-orange-600">Yes</span> : 'No'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {run.reused ? <span className="text-green-600">Yes</span> : 'No'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/admin/runs/${run.id}`} className="text-blue-600 hover:text-blue-800">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages}
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
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
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
