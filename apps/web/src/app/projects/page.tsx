'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi } from '@/lib/api';
import { isAuthenticated, removeToken, getToken } from '@/lib/auth';

interface Project {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', domain: '' });
  const [creating, setCreating] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '';
      // Check for auth failures or network errors that suggest invalid/missing auth
      const isAuthOrNetworkError =
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.toLowerCase().includes('load failed') ||
        errorMessage.toLowerCase().includes('failed to fetch') ||
        errorMessage.toLowerCase().includes('network');
      if (isAuthOrNetworkError) {
        removeToken();
        router.push('/login');
        return;
      }
      setError(errorMessage || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    setAuthChecked(true);
    fetchProjects();
  }, [router, fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(newProject),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.code === 'ENTITLEMENTS_LIMIT_REACHED') {
          const plan =
            body && typeof body.plan === 'string' ? body.plan : 'current';
          const allowed =
            body && typeof body.allowed === 'number' ? body.allowed : undefined;

          if (body && typeof body.message === 'string') {
            setError(body.message);
          } else if (allowed !== undefined) {
            const plural = allowed === 1 ? 'project' : 'projects';
            setError(
              `You've reached the ${plan} plan limit (${allowed} ${plural}). Upgrade your plan to create more projects.`,
            );
          } else {
            setError(
              "You've reached your current plan's project limit. Upgrade your plan to create more projects.",
            );
          }

          setShowCreateModal(false);
          setCreating(false);
          return;
        }
        if (res.status === 401) {
          removeToken();
          router.push('/login');
          return;
        }
        throw new Error(body.message || 'Failed to create project');
      }

      const created = await res.json();
      setProjects([created, ...projects]);
      setShowCreateModal(false);
      setNewProject({ name: '', domain: '' });
      // [STORE-HEALTH-1.0] Navigate to the new project's Store Health page
      router.push(`/projects/${created.id}/store-health`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      // Handle network errors by redirecting to login
      const isNetworkError =
        errorMessage.toLowerCase().includes('load failed') ||
        errorMessage.toLowerCase().includes('failed to fetch') ||
        errorMessage.toLowerCase().includes('network');
      if (isNetworkError) {
        removeToken();
        router.push('/login');
        return;
      }
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await projectsApi.delete(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  // Don't render anything until auth is checked - prevents flash of content before redirect
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-gray-600">
            Manage your SEO projects and integrations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {projects.length === 0 ? (
          <div className="text-center py-12 px-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Let&apos;s get your first DEO win
            </h2>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              EngineO will walk you through creating a project, connecting your store or site,
              running your first crawl, and optimizing a few products with AI.
            </p>

            {/* Static checklist preview */}
            <div className="max-w-sm mx-auto mb-6 text-left">
              <div className="space-y-3">
                {[
                  'Create a project and connect a store or site',
                  'Run your first DEO crawl',
                  'See your DEO Score and issues',
                  'Optimize a few products with AI',
                ].map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-gray-300 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    </svg>
                    <span className="text-sm text-gray-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.domain}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Project Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="My Store"
                  />
                </div>
                <div>
                  <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                    Domain
                  </label>
                  <input
                    id="domain"
                    type="text"
                    required
                    value={newProject.domain}
                    onChange={(e) => setNewProject({ ...newProject, domain: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="mystore.com"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
