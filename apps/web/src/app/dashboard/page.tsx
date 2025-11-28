'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi, usersApi } from '@/lib/api';
import { isAuthenticated, removeToken } from '@/lib/auth';

interface Project {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [userData, projectsData] = await Promise.all([
          usersApi.me(),
          projectsApi.list(),
        ]);
        setUser(userData);
        setProjects(projectsData);
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          removeToken();
          router.push('/login');
          return;
        }
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = () => {
    removeToken();
    router.push('/login');
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
          <h1 className="text-xl font-bold text-gray-900">SEOEngine.io</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.name ? `, ${user.name}` : ''}!
          </h2>
          <p className="mt-1 text-gray-600">
            Here&apos;s an overview of your SEO projects.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{projects.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Integrations</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">SEO Score</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">--</p>
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Your Projects</h3>
            <Link
              href="/projects"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
          <div className="p-6">
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No projects yet. Create your first project to get started.</p>
                <Link
                  href="/projects"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Project
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {projects.slice(0, 5).map((project) => (
                  <li key={project.id} className="py-4">
                    <Link href={`/projects/${project.id}`} className="block hover:bg-gray-50 -mx-4 px-4 py-2 rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{project.name}</p>
                          <p className="text-sm text-gray-500">{project.domain}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
