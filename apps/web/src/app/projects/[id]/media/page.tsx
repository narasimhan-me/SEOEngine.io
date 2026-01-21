'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import { getDeoPillarById } from '@/lib/deo-pillars';
import type {
  MediaAccessibilityScorecard,
  MediaAccessibilityStatus,
  ProductMediaStats,
} from '@/lib/media-accessibility';

// Status configuration for display
const STATUS_CONFIG: Record<
  MediaAccessibilityStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  Strong: {
    label: 'Strong',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  'Needs improvement': {
    label: 'Needs Improvement',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  Weak: {
    label: 'Weak',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

export default function MediaAccessibilityPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [scorecard, setScorecard] =
    useState<MediaAccessibilityScorecard | null>(null);
  const [stats, setStats] = useState<ProductMediaStats[]>([]);

  const pillar = getDeoPillarById('media_accessibility');

  const fetchData = useCallback(async () => {
    if (!projectId || typeof projectId !== 'string') {
      console.warn('[MediaAccessibilityPage] Invalid projectId:', projectId);
      setError('Invalid project ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch project data first
      const projectData = await projectsApi.get(projectId);
      setProjectName(projectData.name);

      // Fetch media accessibility data
      try {
        const mediaData = await projectsApi.mediaAccessibility(projectId);
        setScorecard(mediaData.scorecard);
        setStats(mediaData.stats || []);
      } catch (mediaErr) {
        console.warn(
          '[MediaAccessibilityPage] Media data not available:',
          mediaErr
        );
        // Set default values
        setScorecard(null);
        setStats([]);
      }
    } catch (err) {
      console.error('[MediaAccessibilityPage] Failed to fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="h-32 w-full rounded bg-gray-100" />
        <div className="h-64 w-full rounded bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const statusConfig = scorecard ? STATUS_CONFIG[scorecard.status] : null;

  // Calculate summary stats
  const totalProducts = stats.length;
  const productsWithIssues =
    (scorecard?.productsWithMissingAlt || 0) +
    (scorecard?.productsWithGenericAlt || 0);
  const goodAltPercentage = scorecard?.totalImages
    ? Math.round((scorecard.imagesWithGoodAlt / scorecard.totalImages) * 100)
    : 0;
  const genericAltPercentage = scorecard?.totalImages
    ? Math.round((scorecard.imagesWithGenericAlt / scorecard.totalImages) * 100)
    : 0;
  const missingAltPercentage = scorecard?.totalImages
    ? Math.round((scorecard.imagesWithoutAlt / scorecard.totalImages) * 100)
    : 0;

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
          <li className="text-gray-900">Media & Accessibility</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Media & Accessibility
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {pillar?.description ||
            'Manage product images, alt text coverage, and accessibility attributes across your catalog.'}
        </p>
      </div>

      {/* Why It Matters */}
      {pillar?.whyItMatters && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-blue-900">Why It Matters</h3>
          <p className="mt-1 text-sm text-blue-800">{pillar.whyItMatters}</p>
        </div>
      )}

      {/* Scorecard */}
      {scorecard && statusConfig ? (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Media Accessibility Score
              </h2>
              <p className="text-sm text-gray-500">
                Based on {scorecard.totalImages} images across {totalProducts}{' '}
                products
              </p>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
              >
                {scorecard.overallScore}% Overall
              </div>
              <p className="mt-1 text-xs text-gray-500">{statusConfig.label}</p>
            </div>
          </div>

          {/* Alt Text Breakdown */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">
              Alt Text Quality Breakdown
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Good Alt Text */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span className="text-sm font-medium text-green-700">
                    Good Alt Text
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Descriptive, image-specific alt text
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-2xl font-bold text-green-700">
                    {scorecard.imagesWithGoodAlt}
                  </span>
                  <span className="text-xs text-gray-500">
                    {goodAltPercentage}%
                  </span>
                </div>
              </div>

              {/* Generic Alt Text */}
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠</span>
                  <span className="text-sm font-medium text-yellow-700">
                    Generic Alt Text
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Overly generic or product name only
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-2xl font-bold text-yellow-700">
                    {scorecard.imagesWithGenericAlt}
                  </span>
                  <span className="text-xs text-gray-500">
                    {genericAltPercentage}%
                  </span>
                </div>
              </div>

              {/* Missing Alt Text */}
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✗</span>
                  <span className="text-sm font-medium text-red-700">
                    Missing Alt Text
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  No alt text present
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-2xl font-bold text-red-700">
                    {scorecard.imagesWithoutAlt}
                  </span>
                  <span className="text-xs text-gray-500">
                    {missingAltPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Products Needing Attention */}
          {productsWithIssues > 0 && (
            <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
              <p className="text-sm text-orange-800">
                <strong>{productsWithIssues}</strong> product
                {productsWithIssues !== 1 ? 's' : ''} have images needing alt
                text improvements.
              </p>
              <Link
                href={`/projects/${projectId}/issues?pillar=media_accessibility`}
                className="mt-1 inline-block text-sm font-medium text-orange-700 hover:text-orange-900"
              >
                View Media Issues →
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* No Data State */
        <div className="mb-8 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
          <h3 className="text-sm font-medium text-gray-700">
            No Media Data Available
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Media accessibility data will appear here once your products are
            synced from Shopify. Make sure your Shopify integration is connected
            and products have been imported.
          </p>
          <Link
            href={`/projects/${projectId}/settings`}
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Go to Settings →
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={`/projects/${projectId}/issues?pillar=media_accessibility`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">🔍</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                View Media Issues
              </p>
              <p className="text-xs text-gray-500">
                See all alt text and image issues
              </p>
            </div>
          </Link>
          <Link
            href={`/projects/${projectId}/products`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Browse Products
              </p>
              <p className="text-xs text-gray-500">
                Review and fix alt text per product
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Score Model Info */}
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">
          About Media Accessibility Scoring
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          The Media Accessibility score uses a weighted coverage model:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-500">
          <li>
            <strong className="text-green-600">Good alt text</strong> = 100%
            credit
          </li>
          <li>
            <strong className="text-yellow-600">Generic alt text</strong> = 40%
            credit
          </li>
          <li>
            <strong className="text-red-600">Missing alt text</strong> = 0%
            credit
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Status thresholds:{' '}
          <strong className="text-green-600">Strong (≥80%)</strong>,{' '}
          <strong className="text-yellow-600">
            Needs Improvement (40-79%)
          </strong>
          , or <strong className="text-red-600">Weak (&lt;40%)</strong>
        </p>
        <p className="mt-2 text-xs text-gray-500">
          <strong>Alt text classification:</strong> Missing = empty/null.
          Generic = &quot;product image&quot;, product name only, &lt;5 chars.
          Good = descriptive, image-specific.
        </p>
      </div>
    </div>
  );
}
