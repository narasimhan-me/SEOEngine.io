'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue, DeoIssueFixType } from '@engineo/shared';
import { ISSUE_UI_CONFIG } from '@/components/issues/IssuesList';
import { isAuthenticated, getToken } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';

export default function IssuesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [issues, setIssues] = useState<DeoIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [rescanning, setRescanning] = useState(false);

  const feedback = useFeedback();

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await projectsApi.deoIssues(projectId);
      setIssues(response.issues ?? []);
    } catch (err: unknown) {
      console.error('Error fetching issues:', err);
      setError(err instanceof Error ? err.message : 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchProjectInfo = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/integration-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProjectName(data.projectName ?? null);
      }
    } catch (err) {
      console.error('Error fetching project info:', err);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchIssues();
    fetchProjectInfo();
  }, [projectId, router, fetchIssues, fetchProjectInfo]);

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await fetchIssues();
      feedback.showSuccess('Issues refreshed successfully');
    } catch {
      feedback.showError('Failed to refresh issues');
    } finally {
      setRescanning(false);
    }
  };

  // Compute counts by severity
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  // Filter issues by severity
  const filteredIssues =
    severityFilter === 'all'
      ? issues
      : issues.filter((i) => i.severity === severityFilter);

  // Get fix action for an issue
  const getFixAction = (issue: DeoIssue) => {
    const fixType = issue.fixType as DeoIssueFixType | undefined;
    const fixReady = issue.fixReady ?? false;
    const primaryProductId = issue.primaryProductId;

    if (fixType === 'aiFix' && fixReady && primaryProductId) {
      return {
        label: 'Fix with AI',
        href: `/projects/${projectId}/products/${primaryProductId}?from=issues&issueId=${issue.id}`,
        variant: 'ai' as const,
      };
    }

    if (fixType === 'manualFix' && primaryProductId) {
      return {
        label: 'Fix manually',
        href: `/projects/${projectId}/products/${primaryProductId}?from=issues`,
        variant: 'manual' as const,
      };
    }

    if (fixType === 'syncFix') {
      return {
        label: 'Re-sync from Shopify',
        href: `/projects/${projectId}/products?action=sync`,
        variant: 'sync' as const,
      };
    }

    // Default: go to products page
    if (issue.affectedProducts && issue.affectedProducts.length > 0) {
      return {
        label: 'View affected',
        href: `/projects/${projectId}/products`,
        variant: 'default' as const,
      };
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-gray-600">Loading issues...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      {/* Back to Overview */}
      <div className="mb-4 text-sm">
        <Link
          href={`/projects/${projectId}/overview`}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchIssues}
              className="text-sm font-medium text-red-700 hover:text-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Issue Summary Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Issues Engine</h1>
            {projectName && (
              <p className="text-gray-600">{projectName}</p>
            )}
          </div>
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rescanning ? (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Scanning...
              </>
            ) : (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Re-scan Issues
              </>
            )}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-gray-900">{issues.length}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-2xl font-bold text-red-700">{criticalCount}</div>
            <div className="text-sm text-red-600">Critical</div>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="text-2xl font-bold text-orange-700">{warningCount}</div>
            <div className="text-sm text-orange-600">Warning</div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="text-2xl font-bold text-blue-700">{infoCount}</div>
            <div className="text-sm text-blue-600">Info</div>
          </div>
        </div>
      </div>

      {/* Severity Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'critical', 'warning', 'info'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSeverityFilter(filter)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              severityFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            {filter !== 'all' && (
              <span className="ml-1">
                ({filter === 'critical' ? criticalCount : filter === 'warning' ? warningCount : infoCount})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Issues List with Fix Actions */}
      {filteredIssues.length === 0 ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-green-800">
            {severityFilter === 'all' ? 'No issues detected' : `No ${severityFilter} issues`}
          </h3>
          <p className="mt-1 text-sm text-green-700">
            {severityFilter === 'all'
              ? 'Your project looks healthy based on the latest analysis.'
              : 'Try selecting a different filter to see other issues.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const uiConfig = ISSUE_UI_CONFIG[issue.id] ?? {
              label: issue.title,
              description: issue.description,
            };
            const fixAction = getFixAction(issue);

            return (
              <div
                key={issue.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {uiConfig.label}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          issue.severity === 'critical'
                            ? 'border border-red-200 bg-red-50 text-red-700'
                            : issue.severity === 'warning'
                              ? 'border border-orange-200 bg-orange-50 text-orange-700'
                              : 'border border-blue-200 bg-blue-50 text-blue-700'
                        }`}
                      >
                        {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{uiConfig.description}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {issue.count} {issue.count === 1 ? 'item' : 'items'} affected
                    </p>
                  </div>

                  {/* Fix Action */}
                  {fixAction && (
                    <Link
                      href={fixAction.href}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                        fixAction.variant === 'ai'
                          ? 'border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                          : fixAction.variant === 'sync'
                            ? 'border border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                            : 'border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {fixAction.variant === 'ai' && (
                        <svg
                          className="mr-1.5 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      )}
                      {fixAction.variant === 'sync' && (
                        <svg
                          className="mr-1.5 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      )}
                      {fixAction.label}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
