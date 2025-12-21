import { type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { DeoPillarId } from '@/lib/deo-pillars';
import type { Product } from '@/lib/products';
import type { HealthState } from './ProductTable';
import { ProductDetailPanel } from './ProductDetailPanel';

/**
 * Issue summary by pillar for display in expanded details
 */
export interface PillarIssueSummary {
  pillarId: DeoPillarId;
  label: string;
  count: number;
}

interface ProductRowProps {
  product: Product;
  projectId: string;
  healthState: HealthState;
  recommendedAction: string;
  issuesByPillar?: PillarIssueSummary[];
  showRescan: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onScan: () => void;
  onSyncProject: () => void;
  isSyncing: boolean;
  isScanning: boolean;
}

export function ProductRow({
  product,
  projectId,
  healthState,
  recommendedAction,
  issuesByPillar,
  showRescan,
  isExpanded,
  onToggle,
  onScan,
  isScanning,
}: ProductRowProps) {
  const workspacePath = `/projects/${projectId}/products/${product.id}`;

  // Handle row click for progressive disclosure (expand/collapse)
  const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
    // Don't toggle if clicking on interactive elements
    const target = event.target as HTMLElement;
    if (
      target.closest('a') ||
      target.closest('button') ||
      target.closest('[data-no-row-click]')
    ) {
      return;
    }
    onToggle();
  };

  // Handle keyboard navigation for accessibility
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  // Prevent buttons from triggering row toggle
  const handleButtonClick = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  // Health pill styling
  const healthPillClasses = {
    Healthy: 'bg-green-50 text-green-700 ring-1 ring-green-200',
    'Needs Attention': 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
    Critical: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  };

  return (
    <div className="relative">
      {/* Row container - clickable for progressive disclosure */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer flex-col gap-4 rounded-lg border border-gray-200 bg-white px-4 py-4 transition-colors hover:bg-gray-50 active:bg-gray-100 sm:flex-row sm:items-center sm:justify-between"
      >
        {/* Left section - image + title + recommended action */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {product.imageUrls && product.imageUrls.length > 0 ? (
            <Image
              src={product.imageUrls[0]}
              alt={product.title}
              width={48}
              height={48}
              className="h-12 w-12 flex-shrink-0 rounded object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gray-100">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            {/* Title line */}
            <div className="line-clamp-1 text-sm font-medium text-gray-900">
              {product.title}
            </div>
            {/* Action line (recommended action) */}
            <div className="mt-0.5 text-xs text-gray-500">
              {recommendedAction}
            </div>
          </div>
        </div>

        {/* Middle section - Health pill (visible on all sizes) */}
        <div className="flex items-center gap-3 sm:justify-center">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${healthPillClasses[healthState]}`}
          >
            {healthState}
          </span>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2 sm:justify-end">
          {/* Rescan button - only shown when stale */}
          {showRescan && (
            <button
              onClick={(e) => {
                handleButtonClick(e);
                onScan();
              }}
              disabled={isScanning}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              data-no-row-click
            >
              {isScanning ? (
                <>
                  <svg
                    className="mr-1.5 h-3.5 w-3.5 animate-spin text-gray-500"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Rescanning...
                </>
              ) : (
                <>
                  <svg
                    className="mr-1.5 h-3.5 w-3.5 text-gray-500"
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
                  Rescan
                </>
              )}
            </button>
          )}

          {/* View details button - primary action */}
          <Link
            href={workspacePath}
            onClick={handleButtonClick}
            className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            data-no-row-click
          >
            View details
          </Link>

          {/* Expand indicator */}
          <div className="flex h-8 w-8 items-center justify-center text-gray-400">
            <svg
              className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded detail panel */}
      {isExpanded && (
        <ProductDetailPanel
          product={product}
          projectId={projectId}
          issuesByPillar={issuesByPillar}
        />
      )}
    </div>
  );
}
