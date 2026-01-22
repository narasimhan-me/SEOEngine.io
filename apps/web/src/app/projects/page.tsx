'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi } from '@/lib/api';
import { isAuthenticated, removeToken, getToken } from '@/lib/auth';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';

interface Project {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Projects list page migrated to canonical DataTable.
 * Token-only styling, no legacy gray/white table utilities.
 */
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
              `You've reached the ${plan} plan limit (${allowed} ${plural}). Upgrade your plan to create more projects.`
            );
          } else {
            setError(
              "You've reached your current plan's project limit. Upgrade your plan to create more projects."
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create project';
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

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Define DataTable columns
  const columns: DataTableColumn<Project & DataTableRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        cell: (row) => (
          <Link
            href={`/projects/${row.id}`}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            {row.name}
          </Link>
        ),
      },
      {
        key: 'domain',
        header: 'Domain',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{row.domain}</span>
        ),
      },
      {
        key: 'created',
        header: 'Created',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        truncate: false,
        cell: (row) => (
          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/projects/${row.id}`}
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              View
            </Link>
            <button
              onClick={() => handleDeleteProject(row.id)}
              className="text-sm font-medium text-destructive hover:text-destructive/80"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Don't render anything until auth is checked - prevents flash of content before redirect
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your SEO projects and integrations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90"
        >
          + New Project
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Projects Table - Canonical DataTable */}
      {projects.length === 0 ? (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] text-center py-12 px-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Let&apos;s get your first DEO win
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            EngineO will walk you through creating a project, connecting your
            store or site, running your first crawl, and optimizing a few
            products with AI.
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
                    className="h-5 w-5 text-muted-foreground/50 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  </svg>
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={projects}
          hideContextAction={true}
        />
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md border border-border">
            <h2 className="text-lg font-medium text-foreground mb-4">
              Create New Project
            </h2>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-foreground"
                  >
                    Project Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="My Store"
                  />
                </div>
                <div>
                  <label
                    htmlFor="domain"
                    className="block text-sm font-medium text-foreground"
                  >
                    Domain
                  </label>
                  <input
                    id="domain"
                    type="text"
                    required
                    value={newProject.domain}
                    onChange={(e) =>
                      setNewProject({ ...newProject, domain: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="mystore.com"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50"
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
