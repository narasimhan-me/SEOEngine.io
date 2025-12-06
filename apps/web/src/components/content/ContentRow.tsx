'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { DeoIssueSeverity } from '@engineo/shared';
import type { ContentPage, ContentStatus } from '@/lib/content';
import { getPageTypeLabel, getContentStatusLabel } from '@/lib/content';
import { IssueBadge } from '@/components/issues/IssueBadge';

interface ContentRowProps {
  page: ContentPage;
  projectId: string;
  status: ContentStatus;
  issueCount?: number;
  maxIssueSeverity?: DeoIssueSeverity | null;
}

export function ContentRow({
  page,
  projectId,
  status,
  issueCount,
  maxIssueSeverity,
}: ContentRowProps) {
  const router = useRouter();

  const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.closest('button') ||
        target.closest('[data-no-row-click]') ||
        target.closest('a'))
    ) {
      return;
    }
    router.push(`/projects/${projectId}/content/${page.id}`);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.closest('button') ||
        target.closest('[data-no-row-click]') ||
        target.closest('a'))
    ) {
      return;
    }
    event.preventDefault();
    router.push(`/projects/${projectId}/content/${page.id}`);
  };

  // Page type badge colors
  const pageTypeColors: Record<string, string> = {
    home: 'bg-purple-50 text-purple-700 border-purple-200',
    collection: 'bg-blue-50 text-blue-700 border-blue-200',
    blog: 'bg-green-50 text-green-700 border-green-200',
    static: 'bg-gray-100 text-gray-700 border-gray-200',
    misc: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  // Status chip colors
  const statusColors: Record<ContentStatus, string> = {
    healthy: 'bg-green-50 text-green-800 ring-1 ring-green-100',
    'missing-metadata': 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-100',
    'thin-content': 'bg-orange-50 text-orange-800 ring-1 ring-orange-100',
    error: 'bg-red-50 text-red-800 ring-1 ring-red-100',
  };

  const statusLabel = getContentStatusLabel(status);
  const statusClasses = statusColors[status];
  const pageTypeLabel = getPageTypeLabel(page.pageType);
  const pageTypeClasses = pageTypeColors[page.pageType] || pageTypeColors.misc;

  // Format the last scanned date
  const lastScanned = new Date(page.scannedAt);
  const formattedDate = lastScanned.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="flex cursor-pointer flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-all hover:bg-gray-50 hover:shadow-sm active:bg-gray-100 sm:flex-row sm:items-center sm:justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      role="button"
      tabIndex={0}
    >
      {/* Left section: page type badge + path + title */}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {/* Page type badge */}
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${pageTypeClasses}`}
        >
          {pageTypeLabel}
        </span>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-sm font-medium text-gray-900">
            {page.path}
          </div>
          {page.title && (
            <div className="mt-0.5 truncate text-xs text-gray-500">
              {page.title}
            </div>
          )}
          {/* Status chip (mobile) + Open Workspace link */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium sm:hidden ${statusClasses}`}
            >
              {statusLabel}
            </span>
            <Link
              href={`/projects/${projectId}/content/${page.id}`}
              className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              data-no-row-click
              onClick={(event) => event.stopPropagation()}
            >
              Open Workspace
              <span aria-hidden="true" className="ml-0.5">
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Middle section: status (desktop) + metadata indicators */}
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          {/* Status chip - desktop only */}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Micro indicators row */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-gray-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                page.title?.trim() ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span>Title</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                page.metaDescription?.trim() ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span>Description</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                page.h1?.trim() ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span>H1</span>
          </span>
          {issueCount && issueCount > 0 && (
            <IssueBadge count={issueCount} severity={maxIssueSeverity} />
          )}
        </div>
      </div>

      {/* Right section: last scanned + word count */}
      <div className="mt-2 flex items-center gap-3 sm:ml-4 sm:mt-0">
        {page.wordCount !== null && (
          <span className="text-xs text-gray-500">
            {page.wordCount.toLocaleString()} words
          </span>
        )}
        <span className="text-xs text-gray-400">{formattedDate}</span>
      </div>
    </div>
  );
}
