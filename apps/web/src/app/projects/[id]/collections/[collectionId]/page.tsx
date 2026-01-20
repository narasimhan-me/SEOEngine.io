import { redirect } from 'next/navigation';

/**
 * [DRAFT-FIELD-COVERAGE-1-FIXUP-1] Canonical Collection Detail Route
 *
 * URL alias: /projects/[id]/collections/[collectionId]
 * Redirects to: /projects/[id]/assets/collections/[collectionId]
 *
 * Preserves query params (especially ?tab=drafts) when redirecting.
 * No AI imports, no state - just canonical route availability.
 */

interface PageParams {
  params: Promise<{
    id: string;
    collectionId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CanonicalCollectionDetailRoute({
  params,
  searchParams,
}: PageParams) {
  const { id: projectId, collectionId } = await params;
  const query = await searchParams;

  // Build query string preserving all params
  const queryString = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value
          .map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`;
    })
    .join('&');

  const targetUrl = `/projects/${projectId}/assets/collections/${collectionId}${queryString ? `?${queryString}` : ''}`;

  redirect(targetUrl);
}
