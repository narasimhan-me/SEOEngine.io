'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi, usersApi } from '@/lib/api';
import { isAuthenticated, removeToken } from '@/lib/auth';
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

/** Row type for DataTable with overview data merged */
interface ProjectRow extends DataTableRow {
  id: string;
  name: string;
  domain: string;
  overview: ProjectOverview | null;
}

/**
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Dashboard page migrated to canonical DataTable.
 * Token-only styling, no legacy gray/white table utilities.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [overviews, setOverviews] = useState<Record<string, ProjectOverview>>(
    {}
  );
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
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('Unauthorized')
        ) {
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
  const projectsWithScans = Object.values(overviews).filter(
    (o) => o.crawlCount > 0
  ).length;
  const avgSeoScore = (() => {
    const scoresWithData = Object.values(overviews)
      .filter((o) => o.avgSeoScore !== null)
      .map((o) => o.avgSeoScore as number);
    if (scoresWithData.length === 0) return null;
    return Math.round(
      scoresWithData.reduce((a, b) => a + b, 0) / scoresWithData.length
    );
  })();

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number | null) => {
    if (score === null) return 'bg-muted text-muted-foreground';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  // Merge projects with overviews for DataTable rows
  const projectRows: ProjectRow[] = useMemo(
    () =>
      projects.slice(0, 5).map((project) => ({
        id: project.id,
        name: project.name,
        domain: project.domain,
        overview: overviews[project.id] ?? null,
      })),
    [projects, overviews]
  );

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Define DataTable columns
  const columns: DataTableColumn<ProjectRow>[] = useMemo(
    () => [
      {
        key: 'project',
        header: 'Project',
        cell: (row) => (
          <Link href={`/projects/${row.id}`} className="block">
            <p className="text-sm font-medium text-foreground">{row.name}</p>
            <p className="text-sm text-muted-foreground">
              {row.domain || 'No domain'}
            </p>
          </Link>
        ),
      },
      {
        key: 'seoScore',
        header: 'SEO Score',
        cell: (row) =>
          row.overview ? (
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getScoreBgColor(row.overview.avgSeoScore)}`}
            >
              {row.overview.avgSeoScore !== null
                ? row.overview.avgSeoScore
                : '--'}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">--</span>
          ),
      },
      {
        key: 'scans',
        header: 'Scans',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.overview?.crawlCount ?? 0}
          </span>
        ),
      },
      {
        key: 'products',
        header: 'Products',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.overview ? (
              <>
                {row.overview.productCount}
                {row.overview.productsWithAppliedSeo > 0 && (
                  <span className="text-green-600 ml-1">
                    ({row.overview.productsWithAppliedSeo} SEO)
                  </span>
                )}
              </>
            ) : (
              '0'
            )}
          </span>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        truncate: false,
        cell: (row) => (
          <Link
            href={`/projects/${row.id}`}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            View →
          </Link>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back{user?.name ? `, ${user.name}` : ''}!
        </h2>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of your SEO projects.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[hsl(var(--surface-card))] p-6 rounded-lg border border-border">
          <h3 className="text-sm font-medium text-muted-foreground">
            Total Projects
          </h3>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {totalProjects}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {projectsWithScans} with scans
          </p>
        </div>
        <div className="bg-[hsl(var(--surface-card))] p-6 rounded-lg border border-border">
          <h3 className="text-sm font-medium text-muted-foreground">
            Active Integrations
          </h3>
          <p className="mt-2 text-3xl font-bold text-foreground">--</p>
          <p className="mt-1 text-sm text-muted-foreground">Coming soon</p>
        </div>
        <div className="bg-[hsl(var(--surface-card))] p-6 rounded-lg border border-border">
          <h3 className="text-sm font-medium text-muted-foreground">
            Avg SEO Score
          </h3>
          <p
            className={`mt-2 text-3xl font-bold ${getScoreColor(avgSeoScore)}`}
          >
            {avgSeoScore !== null ? avgSeoScore : '--'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {avgSeoScore !== null ? 'Across all projects' : 'Run scans to see'}
          </p>
        </div>
      </div>

      {/* Projects Section */}
      <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-medium text-foreground">Your Projects</h3>
          <Link
            href="/projects"
            className="text-sm text-primary hover:text-primary/80"
          >
            View all →
          </Link>
        </div>
        <div className="p-4">
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No projects yet. Create your first project to get started.
              </p>
              <Link
                href="/projects"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90"
              >
                Create Project
              </Link>
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={projectRows}
              hideContextAction={true}
              density="dense"
            />
          )}
        </div>
      </div>
    </div>
  );
}
