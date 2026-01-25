'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import {
  searchIntentApi,
  projectsApi,
  productsApi,
  type SearchIntentScorecard,
  type SearchIntentType,
  type IntentCoverageStatus,
} from '@/lib/api';
import type { Product } from '@/lib/products';
import { getDeoPillarById } from '@/lib/deo-pillars';
import InsightsPillarsSubnav from '@/components/projects/InsightsPillarsSubnav';
// [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Shell header integration
import { useCenterPaneHeader } from '@/components/layout/CenterPaneHeaderProvider';

// Intent type labels for display
const INTENT_LABELS: Record<SearchIntentType, string> = {
  transactional: 'Transactional',
  comparative: 'Comparative',
  problem_use_case: 'Problem / Use Case',
  trust_validation: 'Trust / Validation',
  informational: 'Informational',
};

// Coverage status colors and labels
const STATUS_CONFIG: Record<
  IntentCoverageStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  covered: {
    label: 'Covered',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  partial: {
    label: 'Partial',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  weak: {
    label: 'Weak',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  none: {
    label: 'None',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

export default function SearchIntentWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<SearchIntentScorecard | null>(
    null
  );
  const [products, setProducts] = useState<Product[]>([]);

  const pillar = getDeoPillarById('search_intent_fit');

  // [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Shell header integration
  const { setHeader } = useCenterPaneHeader();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectData, scorecardData, productsData] = await Promise.all([
        projectsApi.get(projectId),
        searchIntentApi.getProjectSearchIntentSummary(projectId),
        productsApi.list(projectId),
      ]);

      setProjectName(projectData.name);
      setScorecard(scorecardData);
      setProducts(productsData || []);
    } catch (err) {
      console.error('[SearchIntentWorkspace] Failed to fetch:', err);
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

  // [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Set shell header
  useEffect(() => {
    setHeader({
      breadcrumbs: `Projects > ${projectName || projectId} > Insights`,
      title: 'Search & Intent',
      description:
        pillar?.description ||
        'Analyze query coverage and intent gaps across your products.',
    });
  }, [setHeader, projectName, projectId, pillar?.description]);

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
      {/* [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] In-canvas breadcrumbs and header removed - shell header owns these */}

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
              <h2 className="text-lg font-semibold text-gray-900">
                Project Coverage
              </h2>
              <p className="text-sm text-gray-500">
                Based on {scorecard.totalProducts} product
                {scorecard.totalProducts !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  scorecard.status === 'Good'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {scorecard.overallScore}% Overall
              </div>
              <p className="mt-1 text-xs text-gray-500">{scorecard.status}</p>
            </div>
          </div>

          {scorecard.missingHighValueIntents > 0 && (
            <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
              <p className="text-sm text-orange-800">
                <strong>{scorecard.missingHighValueIntents}</strong> product
                {scorecard.missingHighValueIntents !== 1 ? 's' : ''} missing
                high-value intent coverage (transactional or comparative)
              </p>
            </div>
          )}

          {/* Intent Breakdown Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scorecard.intentBreakdown.map((item) => {
              const statusConfig = STATUS_CONFIG[item.status];
              const isHighValue =
                item.intentType === 'transactional' ||
                item.intentType === 'comparative';

              return (
                <div
                  key={item.intentType}
                  className={`rounded-lg border p-4 ${statusConfig.borderColor} ${statusConfig.bgColor}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${statusConfig.textColor}`}
                    >
                      {INTENT_LABELS[item.intentType]}
                    </span>
                    {isHighValue && (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                        High Value
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span
                      className={`text-2xl font-bold ${statusConfig.textColor}`}
                    >
                      {item.score}%
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
      )}

      {/* Products with Intent Gaps */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500">
            Click a product to view and fix intent coverage gaps
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
                href={`/projects/${projectId}/products/${product.id}?focus=search-intent`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {product.title || 'Untitled Product'}
                  </p>
                  {product.handle && (
                    <p className="text-xs text-gray-500">{product.handle}</p>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-xs text-gray-400">View coverage</span>
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
        <h3 className="text-sm font-medium text-gray-700">
          About Search & Intent Analysis
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          This pillar analyzes how well your products cover different search
          intent types:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-500">
          <li>
            <strong>Transactional:</strong> Buy, price, order queries (highest
            value)
          </li>
          <li>
            <strong>Comparative:</strong> vs, alternatives, best queries
          </li>
          <li>
            <strong>Problem/Use Case:</strong> for beginners, how to use queries
          </li>
          <li>
            <strong>Trust/Validation:</strong> reviews, is it good queries
          </li>
          <li>
            <strong>Informational:</strong> what is, how it works queries
          </li>
        </ul>
      </div>
    </div>
  );
}
