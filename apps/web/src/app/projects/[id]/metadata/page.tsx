'use client';

import { useParams } from 'next/navigation';
import { GuardedLink } from '@/components/navigation/GuardedLink';

export default function MetadataPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Metadata & Snippet Quality
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage SEO titles, meta descriptions, and structured data across all
          your products and content pages.
        </p>
      </div>

      {/* Coming Soon Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h2 className="text-lg font-semibold text-blue-900">
          Unified Metadata Workspace Coming Soon
        </h2>
        <p className="mt-2 text-sm text-blue-800">
          This view will become the cross-surface Metadata & Snippet Quality
          workspace, aggregating metadata issues across products and content
          pages in one place.
        </p>

        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-blue-900">
            For now, you can manage metadata in these locations:
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <GuardedLink
              href={`/projects/${projectId}/products`}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Fix Product Metadata
            </GuardedLink>
            <GuardedLink
              href={`/projects/${projectId}/content`}
              className="inline-flex items-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Fix Page Metadata
            </GuardedLink>
          </div>
        </div>

        <p className="mt-4 text-xs text-blue-700">
          All metadata-related DEO issues are already tracked under the Metadata
          & Snippet Quality pillar. View them in the{' '}
          <GuardedLink
            href={`/projects/${projectId}/issues?pillar=metadata_snippet_quality`}
            className="font-medium underline"
          >
            Issues Engine
          </GuardedLink>
          .
        </p>
      </div>

      {/* Pillar Description */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">
          About the Metadata & Snippet Quality Pillar
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          This pillar covers SEO titles, meta descriptions, and structured data
          that control how your pages appear in search results and AI answer
          engines. Well-crafted metadata improves click-through rates from
          search results and helps AI engines accurately summarize your content.
        </p>
      </div>
    </div>
  );
}
