import { redirect } from 'next/navigation';

/**
 * [DRAFT-FIELD-COVERAGE-1-FIXUP-1] Canonical Page Detail Route
 *
 * URL alias: /projects/[id]/pages/[pageId]
 * Redirects to: /projects/[id]/assets/pages/[pageId]
 *
 * Preserves query params (especially ?tab=drafts) when redirecting.
 * No AI imports, no state - just canonical route availability.
 */

interface PageParams {
  params: Promise<{
    id: string;
    pageId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CanonicalPageDetailRoute({ params, searchParams }: PageParams) {
  const { id: projectId, pageId } = await params;
  const query = await searchParams;

  // Build query string preserving all params
  const queryString = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`;
    })
    .join('&');

  const targetUrl = `/projects/${projectId}/assets/pages/${pageId}${queryString ? `?${queryString}` : ''}`;

  redirect(targetUrl);
}
