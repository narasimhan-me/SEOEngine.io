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

interface ProjectOverview {
  crawlCount: number;
  issueCount: number;
  avgSeoScore: number | null;
  productCount: number;
  productsWithAppliedSeo: number;
  productsWithAnswerBlocks?: number;
  lastAnswerBlockSyncStatus?: string | null;
  lastAnswerBlockSyncAt?: string | null;
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
  const [overviews, setOverviews] = useState<Record<string, ProjectOverview>>({});
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

        // Fetch overviews for all projects
        if (projectsData.length > 0) {
          const overviewResults = await Promise.all(
            projectsData.map(async (project: Project) => {
              try {
                const overview = await projectsApi.overview(project.id);
                return { id: project.id, overview };
              } catch {
                // Return null overview on error
                return { id: project.id, overview: null };
              }
            })
          );

          const overviewMap: Record<string, ProjectOverview> = {};
          for (const result of overviewResults) {
            if (result.overview) {
              overviewMap[result.id] = result.overview;
            }
          }
          setOverviews(overviewMap);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          removeToken();
          router.push('/login');
          return;
        }
        setError(errorMessage || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Calculate aggregate stats
  const totalProjects = projects.length;
  const projectsWithScans = Object.values(overviews).filter(o => o.crawlCount > 0).length;
  const avgSeoScore = (() => {
    const scoresWithData = Object.values(overviews)
      .filter(o => o.avgSeoScore !== null)
      .map(o => o.avgSeoScore as number);
    if (scoresWithData.length === 0) return null;
    return Math.round(scoresWithData.reduce((a, b) => a + b, 0) / scoresWithData.length);
  })();

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-500';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalProjects}</p>
          <p className="mt-1 text-sm text-gray-500">
            {projectsWithScans} with scans
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Integrations</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">--</p>
          <p className="mt-1 text-sm text-gray-500">Coming soon</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg SEO Score</h3>
          <p className={`mt-2 text-3xl font-bold ${getScoreColor(avgSeoScore)}`}>
            {avgSeoScore !== null ? avgSeoScore : '--'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {avgSeoScore !== null ? 'Across all projects' : 'Run scans to see'}
          </p>
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
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">SEO Score</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Scans</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Products</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.slice(0, 5).map((project) => {
                    const overview = overviews[project.id];
                    return (
                      <tr key={project.id} className="hover:bg-gray-50">
                        <td className="py-4 px-2">
                          <Link href={`/projects/${project.id}`} className="block">
                            <p className="text-sm font-medium text-gray-900">{project.name}</p>
                            <p className="text-sm text-gray-500">{project.domain || 'No domain'}</p>
                          </Link>
                        </td>
                        <td className="py-4 px-2 text-center">
                          {overview ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getScoreBgColor(overview.avgSeoScore)}`}>
                              {overview.avgSeoScore !== null ? overview.avgSeoScore : '--'}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">--</span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className="text-sm text-gray-600">
                            {overview?.crawlCount ?? 0}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className="text-sm text-gray-600">
                            {overview ? (
                              <>
                                {overview.productCount}
                                {overview.productsWithAppliedSeo > 0 && (
                                  <span className="text-green-600 ml-1">
                                    ({overview.productsWithAppliedSeo} SEO)
                                  </span>
                                )}
                              </>
                            ) : (
                              '0'
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
