import { useState, type MouseEvent } from 'react';
import Image from 'next/image';

import type { Product, ProductStatus } from '@/lib/products';
import { ProductDetailPanel } from './ProductDetailPanel';

interface ProductRowProps {
  product: Product;
  status: ProductStatus;
  isExpanded: boolean;
  onToggle: () => void;
  onScan: () => void;
  onOptimize: () => void;
  onSyncProject: () => void;
  isSyncing: boolean;
  isScanning: boolean;
  isOptimizing: boolean;
}

export function ProductRow({
  product,
  status,
  isExpanded,
  onToggle,
  onScan,
  onOptimize,
  onSyncProject,
  isSyncing,
  isScanning,
  isOptimizing,
}: ProductRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRowClick = () => {
    onToggle();
  };

  const stopAnd = (event: MouseEvent, fn: () => void) => {
    event.stopPropagation();
    fn();
  };

  const handleMenuToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenuOpen((open) => !open);
  };

  const handleViewDetails = (event: MouseEvent<HTMLButtonElement>) => {
    stopAnd(event, () => {
      onToggle();
      setMenuOpen(false);
    });
  };

  const handleSync = (event: MouseEvent<HTMLButtonElement>) => {
    stopAnd(event, () => {
      onSyncProject();
      setMenuOpen(false);
    });
  };

  const statusLabel =
    status === 'optimized'
      ? 'Optimized'
      : status === 'needs-optimization'
        ? 'Needs optimization'
        : 'Missing metadata';

  const statusClasses =
    status === 'optimized'
      ? 'bg-green-50 text-green-800 ring-1 ring-green-100'
      : status === 'needs-optimization'
        ? 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-100'
        : 'bg-red-50 text-red-800 ring-1 ring-red-100';

  const hasMetaTitle = !!product.seoTitle?.trim();
  const hasMetaDescription = !!product.seoDescription?.trim();

  return (
    <div className="relative">
      <div
        className="flex cursor-pointer flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
        onClick={handleRowClick}
      >
        {/* Header section – image + title + handle + status (mobile) */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {product.imageUrls && product.imageUrls.length > 0 ? (
            <Image
              src={product.imageUrls[0]}
              alt={product.title}
              width={40}
              height={40}
              className="h-10 w-10 flex-shrink-0 rounded object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100">
              <svg
                className="h-5 w-5 text-gray-400"
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
            <div className="line-clamp-2 text-sm font-medium text-gray-900 sm:line-clamp-1">
              {product.title}
            </div>
            <div className="mt-0.5 truncate text-xs text-gray-500">
              {product.handle ?? product.externalId}
            </div>
            {/* Status chip - mobile only (shown under title) */}
            <span
              className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium sm:hidden ${statusClasses}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Middle section – status (desktop) + micro indicators */}
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            {/* Status chip - desktop only */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses}`}
            >
              {statusLabel}
            </span>
            {/* Scan SEO button - desktop only */}
            <button
              onClick={(event) => stopAnd(event, onScan)}
              disabled={isScanning}
              className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <svg
                    className="mr-1 h-3 w-3 animate-spin text-blue-700"
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
                  Scanning...
                </>
              ) : (
                <>
                  <svg
                    className="mr-1 h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Scan SEO
                </>
              )}
            </button>
          </div>

          {/* Metadata indicators */}
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 sm:mt-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasMetaTitle ? 'bg-green-500' : 'bg-red-400'
                }`}
              />
              <span>Title</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasMetaDescription ? 'bg-green-500' : 'bg-red-400'
                }`}
              />
              <span>Description</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span>Alt text</span>
            </span>
          </div>
        </div>

        {/* Actions section */}
        <div className="mt-2 flex flex-col gap-2 sm:ml-4 sm:mt-0 sm:flex-row sm:items-center sm:justify-end">
          {/* Optimize button - full width on mobile */}
          <button
            onClick={(event) => stopAnd(event, onOptimize)}
            disabled={isOptimizing}
            className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1.5"
          >
            {isOptimizing ? (
              <>
                <svg
                  className="mr-2 h-3.5 w-3.5 animate-spin text-white"
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
                Optimizing...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-3.5 w-3.5"
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
                Optimize
              </>
            )}
          </button>

          {/* Secondary actions row - Scan SEO (mobile) + Overflow menu */}
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            {/* Scan SEO button - mobile only */}
            <button
              onClick={(event) => stopAnd(event, onScan)}
              disabled={isScanning}
              className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
            >
              {isScanning ? (
                <>
                  <svg
                    className="mr-1 h-3 w-3 animate-spin text-blue-700"
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
                  Scanning...
                </>
              ) : (
                <>
                  <svg
                    className="mr-1 h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Scan SEO
                </>
              )}
            </button>

            {/* Overflow menu */}
            <div className="relative">
              <button
                type="button"
                onClick={handleMenuToggle}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
                  />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-40 rounded-md border border-gray-200 bg-white py-1 text-sm text-gray-700 shadow-lg">
                  <button
                    type="button"
                    onClick={handleViewDetails}
                    className="block w-full px-3 py-1.5 text-left hover:bg-gray-50"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="block w-full px-3 py-1.5 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    {isSyncing ? 'Syncing…' : 'Sync'}
                  </button>
                  <button
                    type="button"
                    disabled
                    className="block w-full cursor-not-allowed px-3 py-1.5 text-left text-gray-400"
                    title="Editing coming soon"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled
                    className="block w-full cursor-not-allowed px-3 py-1.5 text-left text-gray-400"
                    title="Remove coming soon"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && <ProductDetailPanel product={product} />}
    </div>
  );
}
