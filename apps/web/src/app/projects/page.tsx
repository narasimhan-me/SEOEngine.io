'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi } from '@/lib/api';
import { isAuthenticated, removeToken } from '@/lib/auth';

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

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchProjects();
  }, [router]);

  const fetchProjects = async () => {
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        removeToken();
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const created = await projectsApi.create(newProject);
      setProjects([created, ...projects]);
      setShowCreateModal(false);
      setNewProject({ name: '', domain: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await projectsApi.delete(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              SEOEngine.io
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">Projects</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No projects yet.</p>
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
      </main>

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
