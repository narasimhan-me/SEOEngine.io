export type PageType = 'home' | 'collection' | 'blog' | 'static' | 'misc';

export interface ContentPage {
  id: string;
  projectId: string;
  url: string;
  path: string;
  pageType: PageType;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number | null;
  loadTimeMs: number | null;
  issues: string[];
  scannedAt: string;
}

export type ContentStatus = 'healthy' | 'missing-metadata' | 'thin-content' | 'error';

export function getContentStatus(page: ContentPage): ContentStatus {
  const hasTitle = !!page.title?.trim();
  const hasDescription = !!page.metaDescription?.trim();

  // Check for HTTP errors first
  if (page.statusCode < 200 || page.statusCode >= 400) {
    return 'error';
  }

  // Check for missing metadata
  if (!hasTitle || !hasDescription) {
    return 'missing-metadata';
  }

  // Check for thin content (less than 300 words)
  const wordCount = typeof page.wordCount === 'number' ? page.wordCount : 0;
  if (wordCount > 0 && wordCount < 300) {
    return 'thin-content';
  }

  return 'healthy';
}

export function getPageTypeLabel(pageType: PageType): string {
  switch (pageType) {
    case 'home':
      return 'Home';
    case 'collection':
      return 'Collection';
    case 'blog':
      return 'Blog';
    case 'static':
      return 'Static';
    case 'misc':
      return 'Page';
    default:
      return 'Page';
  }
}

export function getContentStatusLabel(status: ContentStatus): string {
  switch (status) {
    case 'healthy':
      return 'Healthy';
    case 'missing-metadata':
      return 'Missing Metadata';
    case 'thin-content':
      return 'Thin Content';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}
