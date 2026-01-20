'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

/**
 * [ADMIN-OPS-1][D3 Projects Table]
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

  useEffect(() => {
    fetchProjects(currentPage);
  }, [currentPage]);

  async function fetchProjects(page: number) {
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
  }

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

  if (loading && projects.length === 0) {
    return <p className="text-gray-600">Loading projects...</p>;
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Projects</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Shopify
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                DEO
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Products
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Sync
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Run
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {project.name}
                  </div>
                  <div className="text-xs text-gray-500">{project.domain}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.shopifyStore || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {project.deoScore !== null ? (
                    <span
                      className={`font-medium ${
                        project.deoScore >= 80
                          ? 'text-green-600'
                          : project.deoScore >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {project.deoScore}
                    </span>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.productCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(project.lastSyncTime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {project.lastRunStatus && (
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        project.lastRunStatus === 'SUCCEEDED'
                          ? 'bg-green-100 text-green-800'
                          : project.lastRunStatus === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {project.lastRunStatus}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {project.shopifyStore && (
                    <button
                      onClick={() => handleResync(project.id)}
                      disabled={resyncLoading === project.id}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {resyncLoading === project.id ? 'Syncing...' : 'Resync'}
                    </button>
                  )}
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
