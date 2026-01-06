'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import {
  competitorsApi,
  projectsApi,
  productsApi,
  type CompetitiveScorecard,
  type CompetitiveStatus,
  type CompetitorGapType,
} from '@/lib/api';
import type { Product } from '@/lib/products';
import { getDeoPillarById } from '@/lib/deo-pillars';
import InsightsPillarsSubnav from '@/components/projects/InsightsPillarsSubnav';

// Gap type labels for display
const GAP_TYPE_LABELS: Record<CompetitorGapType, string> = {
  intent_gap: 'Intent Coverage Gap',
  content_section_gap: 'Content Section Gap',
  trust_signal_gap: 'Trust Signal Gap',
};

// Gap type descriptions
const GAP_TYPE_DESCRIPTIONS: Record<CompetitorGapType, string> = {
  intent_gap: 'Missing coverage for search intents that competitors address',
  content_section_gap: 'Missing content sections (comparison, buying guide, etc.)',
  trust_signal_gap: 'Missing trust signals (reviews, guarantees, certifications)',
};

// Competitive status colors and labels
const STATUS_CONFIG: Record<
  CompetitiveStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  Ahead: {
    label: 'Ahead',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  'On par': {
    label: 'On Par',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  Behind: {
    label: 'Behind',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

export default function CompetitorsWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<CompetitiveScorecard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const pillar = getDeoPillarById('competitive_positioning');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectData, scorecardData, productsData] = await Promise.all([
        projectsApi.get(projectId),
        competitorsApi.getProjectCompetitiveScorecard(projectId),
        productsApi.list(projectId),
      ]);

      setProjectName(projectData.name);
      setScorecard(scorecardData);
      setProducts(productsData || []);
    } catch (err) {
      console.error('[CompetitorsWorkspace] Failed to fetch:', err);
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
            <Link href={`/projects/${projectId}/store-health`} className="hover:text-gray-700">
              {projectName || 'Project'}
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900">Competitors</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Competitive Positioning</h1>
        <p className="mt-1 text-sm text-gray-600">
          {pillar?.description ||
            'Analyze how your products compare to competitors across key coverage areas.'}
        </p>
      </div>

      <InsightsPillarsSubnav />

      {/* Why It Matters */}
      {pillar?.whyItMatters && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-blue-900">Why It Matters</h3>
          <p className="mt-1 text-sm text-blue-800">{pillar.whyItMatters}</p>
        </div>
      )}

      {/* Project Scorecard */}
      {scorecard && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Project Competitive Standing</h2>
              <p className="text-sm text-gray-500">
                Based on {scorecard.totalProducts} product{scorecard.totalProducts !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  STATUS_CONFIG[scorecard.status].bgColor
                } ${STATUS_CONFIG[scorecard.status].textColor}`}
              >
                {scorecard.overallScore}% Overall
              </div>
              <p className="mt-1 text-xs text-gray-500">{scorecard.status}</p>
            </div>
          </div>

          {/* Position Breakdown */}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Ahead</span>
                <span className="text-2xl font-bold text-green-700">{scorecard.productsAhead}</span>
              </div>
              <p className="mt-1 text-xs text-green-600">products leading competitors</p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-700">On Par</span>
                <span className="text-2xl font-bold text-yellow-700">{scorecard.productsOnPar}</span>
              </div>
              <p className="mt-1 text-xs text-yellow-600">products competitive</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">Behind</span>
                <span className="text-2xl font-bold text-red-700">{scorecard.productsBehind}</span>
              </div>
              <p className="mt-1 text-xs text-red-600">products need attention</p>
            </div>
          </div>

          {scorecard.productsBehind > 0 && (
            <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
              <p className="text-sm text-orange-800">
                <strong>{scorecard.productsBehind}</strong> product
                {scorecard.productsBehind !== 1 ? 's' : ''} need competitive improvements to match
                industry standards.
              </p>
            </div>
          )}

          {/* Gap Type Breakdown Grid */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">Gap Type Analysis</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scorecard.gapBreakdown.map((item) => {
                const hasGaps = item.productsWithGaps > 0;
                const scoreColor =
                  item.averageScore >= 70
                    ? 'text-green-700'
                    : item.averageScore >= 40
                      ? 'text-yellow-700'
                      : 'text-red-700';

                return (
                  <div
                    key={item.gapType}
                    className={`rounded-lg border p-4 ${
                      hasGaps ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${hasGaps ? 'text-orange-700' : 'text-gray-700'}`}
                      >
                        {GAP_TYPE_LABELS[item.gapType]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {GAP_TYPE_DESCRIPTIONS[item.gapType]}
                    </p>
                    <div className="mt-2 flex items-end justify-between">
                      <span className={`text-2xl font-bold ${scoreColor}`}>
                        {item.averageScore}%
                      </span>
                      {item.productsWithGaps > 0 && (
                        <span className="text-xs text-gray-500">
                          {item.productsWithGaps} with gaps
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Products with Competitive Gaps */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500">
            Click a product to view and address competitive gaps
          </p>
        </div>

        {products.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No products found. Sync from Shopify to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.slice(0, 20).map((product) => (
              <Link
                key={product.id}
                href={`/projects/${projectId}/products/${product.id}?focus=competitors`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {product.title || 'Untitled Product'}
                  </p>
                  {product.handle && <p className="text-xs text-gray-500">{product.handle}</p>}
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-xs text-gray-400">View competitive analysis</span>
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
            {products.length > 20 && (
              <div className="px-6 py-3 text-center">
                <Link
                  href={`/projects/${projectId}/products`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View all {products.length} products
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Learn More / Documentation Link */}
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">About Competitive Positioning Analysis</h3>
        <p className="mt-1 text-xs text-gray-500">
          This pillar analyzes how your products compare to competitors across three gap types:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-500">
          <li>
            <strong>Intent Coverage Gaps:</strong> Search intents that competitors address but you
            don&apos;t (highest priority)
          </li>
          <li>
            <strong>Content Section Gaps:</strong> Missing content sections like comparison tables,
            buying guides, or why-choose sections
          </li>
          <li>
            <strong>Trust Signal Gaps:</strong> Missing trust signals like reviews sections,
            guarantees, or certifications
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Products are scored: <strong className="text-green-600">Ahead (&gt;70%)</strong>,{' '}
          <strong className="text-yellow-600">On Par (40-70%)</strong>, or{' '}
          <strong className="text-red-600">Behind (&lt;40%)</strong> based on coverage areas where
          competitors lead.
        </p>
      </div>
    </div>
  );
}
