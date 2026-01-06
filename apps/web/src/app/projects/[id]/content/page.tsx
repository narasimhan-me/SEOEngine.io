'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue, DeoIssueSeverity } from '@/lib/deo-issues';
import { DEO_PILLARS } from '@/lib/deo-pillars';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import type { ContentPage, ContentStatus, PageType } from '@/lib/content';
import { getContentStatus } from '@/lib/content';
import { ContentRow } from '@/components/content/ContentRow';
import { GuardedLink } from '@/components/navigation/GuardedLink';

const CONTENT_PILLAR = DEO_PILLARS.find((p) => p.id === 'content_commerce_signals')!;

type StatusFilter = 'all' | ContentStatus;
type PageTypeFilter = 'all' | PageType;

export default function ContentListPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [deoIssues, setDeoIssues] = useState<DeoIssue[]>([]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pageTypeFilter, setPageTypeFilter] = useState<PageTypeFilter>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch project info, crawl pages, and issues in parallel
      const [projectData, pagesData, issuesResponse] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.crawlPages(projectId),
        projectsApi.deoIssues(projectId).catch(() => ({ issues: [] })),
      ]);

      setProjectName(projectData.name);
      setPages(pagesData as ContentPage[]);
      setDeoIssues((issuesResponse.issues as DeoIssue[]) ?? []);
    } catch (err) {
      console.error('Error fetching content pages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content pages');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [projectId, router, fetchData]);

  // Build a map of issues by page URL for quick lookup
  const issuesByPageUrl = useMemo(() => {
    const map = new Map<string, { count: number; maxSeverity: DeoIssueSeverity | null }>();

    for (const issue of deoIssues) {
      for (const affectedUrl of issue.affectedPages ?? []) {
        const existing = map.get(affectedUrl);
        const currentMax = existing?.maxSeverity ?? null;
        let newMax: DeoIssueSeverity | null = currentMax;

        // Determine highest severity (critical > warning > info)
        if (issue.severity === 'critical') {
          newMax = 'critical';
        } else if (issue.severity === 'warning' && currentMax !== 'critical') {
          newMax = 'warning';
        } else if (issue.severity === 'info' && !currentMax) {
          newMax = 'info';
        }

        map.set(affectedUrl, {
          count: (existing?.count ?? 0) + 1,
          maxSeverity: newMax,
        });
      }
    }

    return map;
  }, [deoIssues]);

  // Calculate status counts
  const statusCounts = useMemo(
    () =>
      pages.reduce(
        (acc, page) => {
          const status = getContentStatus(page);
          acc[status] += 1;
          acc.all += 1;
          return acc;
        },
        {
          all: 0,
          healthy: 0,
          'missing-metadata': 0,
          'thin-content': 0,
          error: 0,
        } as Record<StatusFilter, number>,
      ),
    [pages],
  );

  // Calculate page type counts
  const pageTypeCounts = useMemo(
    () =>
      pages.reduce(
        (acc, page) => {
          acc[page.pageType] += 1;
          acc.all += 1;
          return acc;
        },
        {
          all: 0,
          home: 0,
          collection: 0,
          blog: 0,
          static: 0,
          misc: 0,
        } as Record<PageTypeFilter, number>,
      ),
    [pages],
  );

  // Filter pages
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const status = getContentStatus(page);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesPageType = pageTypeFilter === 'all' || page.pageType === pageTypeFilter;
      return matchesStatus && matchesPageType;
    });
  }, [pages, statusFilter, pageTypeFilter]);

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'healthy', label: 'Healthy' },
    { id: 'missing-metadata', label: 'Missing Metadata' },
    { id: 'thin-content', label: 'Thin Content' },
    { id: 'error', label: 'Errors' },
  ];

  const pageTypeFilters: { id: PageTypeFilter; label: string }[] = [
    { id: 'all', label: 'All Types' },
    { id: 'home', label: 'Home' },
    { id: 'collection', label: 'Collections' },
    { id: 'blog', label: 'Blogs' },
    { id: 'static', label: 'Static' },
    { id: 'misc', label: 'Other' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-48 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and optimize your website content pages
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}/store-health`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {projectName}
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-bold text-gray-900">{CONTENT_PILLAR.label}</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {CONTENT_PILLAR.description}
          </p>
        </div>
      </div>

      {/* Pillar Context */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">
          About this DEO Pillar
        </h3>
        <p className="mt-2 text-sm text-gray-600">{CONTENT_PILLAR.whyItMatters}</p>
        <p className="mt-3 text-xs text-gray-500">
          Content-related DEO issues are tracked under this pillar. View them in the{' '}
          <GuardedLink
            href={`/projects/${projectId}/issues?pillar=content_commerce_signals`}
            className="font-medium text-blue-600 hover:underline"
          >
            Issues Engine
          </GuardedLink>
          .
        </p>
      </div>

      {/* Content card */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status filters */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(({ id, label }) => {
              const isActive = statusFilter === id;
              const count = statusCounts[id] ?? 0;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{label}</span>
                  <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Page type filter dropdown */}
          <div className="flex items-center gap-3">
            <select
              value={pageTypeFilter}
              onChange={(e) => setPageTypeFilter(e.target.value as PageTypeFilter)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {pageTypeFilters.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label} ({pageTypeCounts[id] ?? 0})
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500">
              Showing {filteredPages.length} of {statusCounts.all} pages
            </div>
          </div>
        </div>

        {/* Page list or empty state */}
        {pages.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-gray-900">No content pages found</h3>
            <p className="mt-2 text-sm text-gray-500">
              No non-product pages have been crawled yet for this project.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Run a crawl from the{' '}
              <Link
                href={`/projects/${projectId}/store-health`}
                className="font-medium text-purple-600 hover:text-purple-700"
              >
                Store Health
              </Link>{' '}
              to discover content pages.
            </p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">
            No pages match the selected filters.
          </div>
        ) : (
          <div className="space-y-3 px-4 py-3">
            {filteredPages.map((page) => {
              const status = getContentStatus(page);
              const pageIssueData = issuesByPageUrl.get(page.url);

              return (
                <ContentRow
                  key={page.id}
                  page={page}
                  projectId={projectId}
                  status={status}
                  issueCount={pageIssueData?.count}
                  maxIssueSeverity={pageIssueData?.maxSeverity}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
