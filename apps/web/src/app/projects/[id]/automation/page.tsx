'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';

interface AutomationSuggestion {
  id: string;
  targetType: 'product' | 'page';
  targetId: string;
  issueType: 'missing_metadata' | 'thin_content';
  suggestedTitle: string | null;
  suggestedDescription: string | null;
  generatedAt: string;
  source: string;
  applied: boolean;
  appliedAt?: string | null;
}

export default function AutomationPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<AutomationSuggestion[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [projectData, automationResponse] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.automationSuggestions(projectId).catch(() => ({ suggestions: [] })),
      ]);

      setProjectName(projectData.name);
      setSuggestions(automationResponse.suggestions ?? []);
    } catch (err: unknown) {
      console.error('Error fetching automation data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load automation data');
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
  }, [router, fetchData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIssueTypeLabel = (issueType: string) => {
    switch (issueType) {
      case 'missing_metadata':
        return 'Missing Metadata';
      case 'thin_content':
        return 'Thin Content';
      default:
        return issueType;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-gray-600">Loading automation activity...</div>
      </div>
    );
  }

  const appliedSuggestions = suggestions.filter((s) => s.applied);
  const pendingSuggestions = suggestions.filter((s) => !s.applied);

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-2 text-gray-500">
          <li>
            <Link href="/projects" className="hover:text-gray-700">
              Projects
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/projects/${projectId}/overview`} className="hover:text-gray-700">
              {projectName || 'Project'}
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900">Automation Activity</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Automation Activity</h1>
        <p className="text-gray-600">
          View all automation suggestions and their status for this project.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-gray-900">{suggestions.length}</div>
          <div className="text-sm text-gray-500">Total Suggestions</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-green-600">{appliedSuggestions.length}</div>
          <div className="text-sm text-gray-500">Applied</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-amber-600">{pendingSuggestions.length}</div>
          <div className="text-sm text-gray-500">Pending Review</div>
        </div>
      </div>

      {/* No suggestions */}
      {suggestions.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="mb-4 flex justify-center">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No automation activity yet</h3>
          <p className="text-gray-500">
            Automation suggestions will appear here after crawls detect issues that can be
            automatically fixed.
          </p>
        </div>
      )}

      {/* Applied suggestions */}
      {appliedSuggestions.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Applied Suggestions ({appliedSuggestions.length})
          </h2>
          <div className="space-y-3">
            {appliedSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-lg border border-green-200 bg-green-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Applied
                    </span>
                    <span className="text-xs text-gray-500">
                      {getIssueTypeLabel(suggestion.issueType)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Applied: {suggestion.appliedAt ? formatDate(suggestion.appliedAt) : 'Unknown'}
                  </div>
                </div>
                <div className="mt-2">
                  <Link
                    href={`/projects/${projectId}/products/${suggestion.targetId}`}
                    className="text-sm font-medium text-green-700 hover:text-green-900"
                  >
                    View {suggestion.targetType === 'product' ? 'Product' : 'Page'} →
                  </Link>
                </div>
                {suggestion.suggestedTitle && (
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Title:</span> {suggestion.suggestedTitle}
                  </div>
                )}
                {suggestion.suggestedDescription && (
                  <div className="mt-1 text-sm text-gray-700">
                    <span className="font-medium">Description:</span>{' '}
                    {suggestion.suggestedDescription.length > 100
                      ? `${suggestion.suggestedDescription.slice(0, 100)}...`
                      : suggestion.suggestedDescription}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending suggestions */}
      {pendingSuggestions.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Pending Review ({pendingSuggestions.length})
          </h2>
          <div className="space-y-3">
            {pendingSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-lg border border-amber-200 bg-amber-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Pending
                    </span>
                    <span className="text-xs text-gray-500">
                      {getIssueTypeLabel(suggestion.issueType)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Generated: {formatDate(suggestion.generatedAt)}
                  </div>
                </div>
                <div className="mt-2">
                  <Link
                    href={`/projects/${projectId}/products/${suggestion.targetId}`}
                    className="text-sm font-medium text-amber-700 hover:text-amber-900"
                  >
                    Review & Apply →
                  </Link>
                </div>
                {suggestion.suggestedTitle && (
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Suggested Title:</span> {suggestion.suggestedTitle}
                  </div>
                )}
                {suggestion.suggestedDescription && (
                  <div className="mt-1 text-sm text-gray-700">
                    <span className="font-medium">Suggested Description:</span>{' '}
                    {suggestion.suggestedDescription.length > 100
                      ? `${suggestion.suggestedDescription.slice(0, 100)}...`
                      : suggestion.suggestedDescription}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
