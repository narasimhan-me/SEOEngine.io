'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue } from '@/lib/deo-issues';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi, aiApi, ApiError } from '@/lib/api';
import type { ContentPage } from '@/lib/content';
import { getContentStatus, getPageTypeLabel } from '@/lib/content';
import { ContentDeoInsightsPanel } from '@/components/content/ContentDeoInsightsPanel';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

interface MetadataSuggestion {
  crawlResultId: string;
  url: string;
  current: { title: string | null; description: string | null };
  suggested: { title: string; description: string };
}

export default function ContentWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const pageId = params.pageId as string;

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Data states
  const [projectName, setProjectName] = useState<string | null>(null);
  const [page, setPage] = useState<ContentPage | null>(null);
  const [pageIssues, setPageIssues] = useState<DeoIssue[]>([]);

  // Editor states
  const [editorTitle, setEditorTitle] = useState('');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorH1, setEditorH1] = useState('');
  const [initialTitle, setInitialTitle] = useState('');
  const [initialDescription, setInitialDescription] = useState('');

  // AI states
  const [suggestion, setSuggestion] = useState<MetadataSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const feedback = useFeedback();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch project, crawl pages, and issues in parallel
      const [projectData, pagesData, issuesResponse] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.crawlPages(projectId),
        projectsApi.deoIssues(projectId).catch(() => ({ issues: [] })),
      ]);

      setProjectName(projectData.name);

      // Find the specific page
      const foundPage = (pagesData as ContentPage[]).find(
        (p: ContentPage) => p.id === pageId
      );

      if (!foundPage) {
        setError('Page not found for this project');
        setPage(null);
        return;
      }

      setPage(foundPage);

      // Filter issues to only those affecting this page's URL
      const issuesForPage = (issuesResponse.issues ?? []).filter(
        (issue: DeoIssue) => issue.affectedPages?.includes(foundPage.url)
      );
      setPageIssues(issuesForPage);

      // Initialize editor fields
      const title = foundPage.title || '';
      const description = foundPage.metaDescription || '';
      const h1 = foundPage.h1 || '';

      setEditorTitle(title);
      setEditorDescription(description);
      setEditorH1(h1);
      setInitialTitle(title);
      setInitialDescription(description);
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load page data');
    } finally {
      setLoading(false);
    }
  }, [projectId, pageId]);

  const fetchSuggestion = useCallback(async () => {
    if (!page) return;

    try {
      setLoadingSuggestion(true);
      setError('');

      const result = await aiApi.suggestMetadata(page.id);
      setSuggestion(result);

      feedback.showSuccess('AI suggestion generated for this page.');
    } catch (err: unknown) {
      console.error('Error fetching AI suggestion:', err);
      if (err instanceof ApiError && err.code === 'AI_DAILY_LIMIT_REACHED') {
        const limitMessage =
          "Daily AI limit reached. You've used all AI suggestions available on your current plan. Your limit resets tomorrow, or upgrade to continue.";
        setError(limitMessage);
        feedback.showLimit(limitMessage, '/settings/billing');
      } else {
        const message =
          'AI suggestions are temporarily unavailable. Please try again later.';
        setError(message);
        feedback.showError(message);
      }
    } finally {
      setLoadingSuggestion(false);
    }
  }, [page, feedback]);

  const handleReset = useCallback(() => {
    setEditorTitle(initialTitle);
    setEditorDescription(initialDescription);
  }, [initialTitle, initialDescription]);

  const handleApplySuggestion = useCallback(
    (values: { title?: string; description?: string }) => {
      if (values.title !== undefined) {
        setEditorTitle(values.title);
      }
      if (values.description !== undefined) {
        setEditorDescription(values.description);
      }
    },
    []
  );

  const handleCopyToClipboard = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        const message = `${label} copied to clipboard!`;
        setSuccessMessage(message);
        feedback.showSuccess(message);
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch {
        const message = 'Failed to copy to clipboard';
        setError(message);
        feedback.showError(message);
      }
    },
    [feedback],
  );

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const status = page ? getContentStatus(page) : 'error';
  const pageTypeLabel = page ? getPageTypeLabel(page.pageType) : 'Page';

  // Page type badge colors
  const pageTypeColors: Record<string, string> = {
    home: 'bg-purple-50 text-purple-700 border-purple-200',
    collection: 'bg-blue-50 text-blue-700 border-blue-200',
    blog: 'bg-green-50 text-green-700 border-green-200',
    static: 'bg-gray-100 text-gray-700 border-gray-200',
    misc: 'bg-orange-50 text-orange-700 border-orange-200',
  };

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
            <Link
              href={`/projects/${projectId}/store-health`}
              className="hover:text-gray-700"
            >
              {projectName || 'Project'}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/projects/${projectId}/content`}
              className="hover:text-gray-700"
            >
              Content
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900">{page?.path || 'Page'}</li>
        </ol>
      </nav>

      {/* Back link */}
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/content`}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Content
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Content Optimization Workspace
          </h1>
          {page && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                pageTypeColors[page.pageType] || pageTypeColors.misc
              }`}
            >
              {pageTypeLabel}
            </span>
          )}
        </div>
        <p className="text-gray-600">
          Optimize SEO metadata for {page?.path || 'this page'}
        </p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 rounded border border-green-400 bg-green-100 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Page not found */}
      {!page && !loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">Page not found.</p>
          <Link
            href={`/projects/${projectId}/content`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Back to Content
          </Link>
        </div>
      )}

      {/* Main 3-panel layout */}
      {page && (
        <div className="py-4">
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,260px)] lg:gap-6">
            {/* Left panel - Page Overview */}
            <div className="min-w-0 overflow-hidden lg:sticky lg:top-4 lg:self-start">
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Page Overview
                  </h3>
                </div>
                <div className="space-y-4 p-4">
                  {/* URL */}
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-gray-500">
                      URL
                    </div>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {page.path}
                    </a>
                  </div>

                  {/* Current title */}
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-gray-500">
                      Current Title
                    </div>
                    <p className="text-sm text-gray-900">
                      {page.title || (
                        <span className="italic text-gray-400">Not set</span>
                      )}
                    </p>
                  </div>

                  {/* Current H1 */}
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-gray-500">
                      H1 Tag
                    </div>
                    <p className="text-sm text-gray-900">
                      {page.h1 || (
                        <span className="italic text-gray-400">Not set</span>
                      )}
                    </p>
                  </div>

                  {/* Current description */}
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-gray-500">
                      Meta Description
                    </div>
                    <p className="text-sm text-gray-900">
                      {page.metaDescription || (
                        <span className="italic text-gray-400">Not set</span>
                      )}
                    </p>
                  </div>

                  {/* Word count */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-500">Word Count</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(page.wordCount ?? 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Last crawled */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Last Crawled</span>
                    <span className="text-sm text-gray-900">
                      {new Date(page.scannedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Screenshot placeholder */}
                  <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                    <svg
                      className="mx-auto h-8 w-8 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="mt-2 text-xs text-gray-400">
                      Screenshot coming soon
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center panel - AI Suggestions & Editor */}
            <div className="min-w-0 overflow-hidden">
              <div className="space-y-6">
                {/* AI Suggestions Panel */}
                <div className="rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        AI Metadata Suggestions
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Generate optimized metadata using AI
                      </p>
                    </div>
                    <button
                      onClick={fetchSuggestion}
                      disabled={loadingSuggestion}
                      className="inline-flex items-center rounded-md border border-transparent bg-purple-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingSuggestion ? (
                        <>
                          <svg
                            className="mr-2 h-4 w-4 animate-spin"
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
                          Generating...
                        </>
                      ) : (
                        'Generate Suggestions'
                      )}
                    </button>
                  </div>

                  {suggestion && (
                    <div className="space-y-4 p-4">
                      {/* Suggested Title */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium uppercase text-gray-500">
                            Suggested Title
                          </label>
                          <span className="text-xs text-gray-400">
                            {suggestion.suggested.title.length}/60 chars
                          </span>
                        </div>
                        <p className="mt-1 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-gray-900">
                          {suggestion.suggested.title}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() =>
                              handleApplySuggestion({
                                title: suggestion.suggested.title,
                              })
                            }
                            className="text-xs font-medium text-purple-600 hover:text-purple-700"
                          >
                            Apply to editor
                          </button>
                          <button
                            onClick={() =>
                              handleCopyToClipboard(
                                suggestion.suggested.title,
                                'Title'
                              )
                            }
                            className="text-xs font-medium text-gray-600 hover:text-gray-700"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {/* Suggested Description */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium uppercase text-gray-500">
                            Suggested Description
                          </label>
                          <span className="text-xs text-gray-400">
                            {suggestion.suggested.description.length}/155 chars
                          </span>
                        </div>
                        <p className="mt-1 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-gray-900">
                          {suggestion.suggested.description}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() =>
                              handleApplySuggestion({
                                description: suggestion.suggested.description,
                              })
                            }
                            className="text-xs font-medium text-purple-600 hover:text-purple-700"
                          >
                            Apply to editor
                          </button>
                          <button
                            onClick={() =>
                              handleCopyToClipboard(
                                suggestion.suggested.description,
                                'Description'
                              )
                            }
                            className="text-xs font-medium text-gray-600 hover:text-gray-700"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {/* Apply all button */}
                      <div className="flex justify-end border-t border-gray-100 pt-3">
                        <button
                          onClick={() =>
                            handleApplySuggestion({
                              title: suggestion.suggested.title,
                              description: suggestion.suggested.description,
                            })
                          }
                          className="text-sm font-medium text-purple-600 hover:text-purple-700"
                        >
                          Apply all to editor →
                        </button>
                      </div>
                    </div>
                  )}

                  {!suggestion && !loadingSuggestion && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Click &quot;Generate Suggestions&quot; to get AI-powered metadata
                      recommendations.
                    </div>
                  )}
                </div>

                {/* SEO Editor Panel */}
                <div className="rounded-lg border border-gray-200 bg-white">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      SEO Editor
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Edit metadata and copy to your CMS
                    </p>
                  </div>
                  <div className="space-y-4 p-4">
                    {/* Title field */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="editor-title"
                          className="text-xs font-medium uppercase text-gray-500"
                        >
                          Title
                        </label>
                        <span
                          className={`text-xs ${
                            editorTitle.length > 60
                              ? 'text-red-500'
                              : editorTitle.length > 50
                              ? 'text-yellow-500'
                              : 'text-gray-400'
                          }`}
                        >
                          {editorTitle.length}/60
                        </span>
                      </div>
                      <input
                        id="editor-title"
                        type="text"
                        value={editorTitle}
                        onChange={(e) => setEditorTitle(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="Enter page title..."
                      />
                    </div>

                    {/* Description field */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="editor-description"
                          className="text-xs font-medium uppercase text-gray-500"
                        >
                          Meta Description
                        </label>
                        <span
                          className={`text-xs ${
                            editorDescription.length > 155
                              ? 'text-red-500'
                              : editorDescription.length > 140
                              ? 'text-yellow-500'
                              : 'text-gray-400'
                          }`}
                        >
                          {editorDescription.length}/155
                        </span>
                      </div>
                      <textarea
                        id="editor-description"
                        value={editorDescription}
                        onChange={(e) => setEditorDescription(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="Enter meta description..."
                      />
                    </div>

                    {/* H1 field (optional) */}
                    <div>
                      <label
                        htmlFor="editor-h1"
                        className="text-xs font-medium uppercase text-gray-500"
                      >
                        H1 Tag (optional)
                      </label>
                      <input
                        id="editor-h1"
                        type="text"
                        value={editorH1}
                        onChange={(e) => setEditorH1(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="Enter H1 tag..."
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <button
                        onClick={handleReset}
                        className="text-sm font-medium text-gray-600 hover:text-gray-700"
                      >
                        Reset
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleCopyToClipboard(editorTitle, 'Title')
                          }
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        >
                          Copy Title
                        </button>
                        <button
                          onClick={() =>
                            handleCopyToClipboard(
                              editorDescription,
                              'Description'
                            )
                          }
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        >
                          Copy Description
                        </button>
                      </div>
                    </div>

                    {/* Note about applying */}
                    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        Direct publishing to Shopify Pages, Blogs, and
                        Collections is coming soon. For now, copy the optimized
                        metadata and paste it into your CMS.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel - DEO Insights */}
            <div className="min-w-0 overflow-hidden lg:sticky lg:top-4 lg:self-start">
              <ContentDeoInsightsPanel
                page={page}
                status={status}
                pageIssues={pageIssues}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
