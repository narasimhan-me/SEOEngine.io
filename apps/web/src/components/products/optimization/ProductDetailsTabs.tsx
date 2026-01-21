'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * [DEO-UX-REFRESH-1] Product Details Tab IDs
 * [DRAFT-ENTRYPOINT-UNIFICATION-1] Added 'drafts' tab for non-AI draft review
 *
 * Ordered as specified in the patch:
 * Metadata, Answers, Search & Intent, Competitors, GEO, Automations, Issues, Drafts
 */
export type ProductDetailsTabId =
  | 'metadata'
  | 'answers'
  | 'search-intent'
  | 'competitors'
  | 'geo'
  | 'automations'
  | 'issues'
  | 'drafts';

export interface ProductDetailsTabDef {
  id: ProductDetailsTabId;
  label: string;
  shortLabel?: string; // For mobile
}

export const PRODUCT_DETAILS_TABS: ProductDetailsTabDef[] = [
  { id: 'metadata', label: 'Metadata' },
  { id: 'answers', label: 'Answers' },
  { id: 'search-intent', label: 'Search & Intent', shortLabel: 'Intent' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'geo', label: 'GEO' },
  { id: 'automations', label: 'Automations' },
  { id: 'issues', label: 'Issues' },
  // [DRAFT-ENTRYPOINT-UNIFICATION-1] Drafts tab for non-AI draft review
  { id: 'drafts', label: 'Drafts' },
];

interface ProductDetailsTabsProps {
  projectId: string;
  productId: string;
  activeTab: ProductDetailsTabId;
  issueCount?: number;
}

/**
 * [DEO-UX-REFRESH-1] Product Details Tab Navigation
 *
 * Replaces the "Jump to:" scroll anchors with a real tab bar.
 * Uses URL query param `?tab=<name>` for state persistence.
 * Styled consistently with InsightsSubnav (border + active underline).
 *
 * [TRUST-ROUTING-1] Preserves preview context (from, playbookId, returnTo)
 * across tab navigation to maintain back link behavior.
 */
export function ProductDetailsTabs({
  projectId,
  productId,
  activeTab,
  issueCount = 0,
}: ProductDetailsTabsProps) {
  const basePath = `/projects/${projectId}/products/${productId}`;
  const searchParams = useSearchParams();

  // [TRUST-ROUTING-1] Build URL that preserves existing query params, only changing tab
  const buildTabUrl = (tabId: ProductDetailsTabId): string => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    // Remove any focus param when explicitly setting tab
    params.delete('focus');
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav className="border-b border-gray-200">
      <div className="-mb-px flex space-x-4 overflow-x-auto sm:space-x-6">
        {PRODUCT_DETAILS_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={buildTabUrl(tab.id)}
            className={`whitespace-nowrap py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
            {/* [ISSUE-TO-FIX-PATH-1] Show issue count badge on Issues tab */}
            {tab.id === 'issues' && issueCount > 0 && (
              <span
                data-testid="product-issues-tab-count"
                className="ml-1.5 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
              >
                {issueCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/**
 * [DEO-UX-REFRESH-1] Focus Deep-Link Mapping
 *
 * Maps `?focus=X` query params to the corresponding tab.
 * This maintains backward compatibility with existing deep-links.
 */
export function mapFocusToTab(
  focus: string | null
): ProductDetailsTabId | null {
  if (!focus) return null;

  const mapping: Record<string, ProductDetailsTabId> = {
    metadata: 'metadata',
    'deo-issues': 'issues',
    'search-intent': 'search-intent',
    competitors: 'competitors',
    geo: 'geo',
    automations: 'automations',
    answers: 'answers',
  };

  return mapping[focus] ?? null;
}

/**
 * [DEO-UX-REFRESH-1] Get active tab from URL search params
 *
 * Reads `?tab=<name>` or falls back to `?focus=<name>` mapping.
 * Default is 'metadata' if nothing specified.
 */
export function useActiveProductTab(): ProductDetailsTabId {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as ProductDetailsTabId | null;
  const focusParam = searchParams.get('focus');

  // If explicit tab param, use it
  if (tabParam && PRODUCT_DETAILS_TABS.some((t) => t.id === tabParam)) {
    return tabParam;
  }

  // Otherwise, try focus param mapping
  const mappedTab = mapFocusToTab(focusParam);
  if (mappedTab) {
    return mappedTab;
  }

  // Default to metadata
  return 'metadata';
}
