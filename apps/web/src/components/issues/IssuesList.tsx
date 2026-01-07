'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DeoIssue } from '@/lib/deo-issues';
import { DEO_PILLARS, type DeoPillarId } from '@/lib/deo-pillars';
import {
  buildIssueFixHref,
  getIssueFixPathForProject,
  getSafeIssueTitle,
  getSafeIssueDescription,
  isIssueActionable,
} from '@/lib/issue-to-fix-path';

export const ISSUE_UI_CONFIG: Record<
  string,
  { label: string; description: string; pillarId: DeoPillarId }
> = {
  // High-level DEO issues
  missing_metadata: {
    label: 'Missing Metadata',
    description:
      'Some pages and products are missing essential metadata like titles or descriptions.',
    pillarId: 'metadata_snippet_quality',
  },
  thin_content: {
    label: 'Thin Content',
    description:
      'Many surfaces have very short content, which weakens depth and ranking potential.',
    pillarId: 'content_commerce_signals',
  },
  low_entity_coverage: {
    label: 'Weak Entity Structure',
    description:
      'Key entities, headings, or product schemas are incomplete or missing.',
    pillarId: 'content_commerce_signals',
  },
  indexability_problems: {
    label: 'Indexability Problems',
    description:
      'Crawl errors or missing HTML basics make some pages hard to index.',
    pillarId: 'technical_indexability',
  },
  answer_surface_weakness: {
    label: 'Low AI Answer Potential',
    description:
      'Pages lack the long-form content and structure needed to power rich answers.',
    pillarId: 'search_intent_fit',
  },
  brand_navigational_weakness: {
    label: 'Weak Brand Navigation',
    description:
      'Canonical navigational pages like /about or /contact are missing or not discoverable.',
    pillarId: 'offsite_signals',
  },
  crawl_health_errors: {
    label: 'Crawl Errors',
    description:
      'A number of pages return HTTP or fetch errors, reducing crawl coverage.',
    pillarId: 'technical_indexability',
  },
  product_content_depth: {
    label: 'Shallow Product Content',
    description:
      'Many products have very short or missing descriptions, limiting their ability to rank and convert.',
    pillarId: 'content_commerce_signals',
  },
  // Issue Engine Lite: Product-focused issues
  missing_seo_title: {
    label: 'Missing SEO Title',
    description:
      'Products without an SEO title are harder for search engines and AI to understand and rank.',
    pillarId: 'metadata_snippet_quality',
  },
  missing_seo_description: {
    label: 'Missing SEO Description',
    description:
      'Products without an SEO description miss rich snippet and click-through optimization.',
    pillarId: 'metadata_snippet_quality',
  },
  weak_title: {
    label: 'Weak Product Title',
    description:
      'Product titles are too short or unoptimized, reducing search visibility.',
    pillarId: 'metadata_snippet_quality',
  },
  weak_description: {
    label: 'Weak Product Description',
    description:
      'Short SEO descriptions limit search snippet quality and fail to convey value.',
    pillarId: 'metadata_snippet_quality',
  },
  missing_long_description: {
    label: 'Missing Long Description',
    description:
      'Products lack detailed descriptions needed for rich search results and AI answers.',
    pillarId: 'content_commerce_signals',
  },
  duplicate_product_content: {
    label: 'Duplicate Product Content',
    description:
      'Multiple products share identical descriptions, hurting rankings and confusing AI.',
    pillarId: 'content_commerce_signals',
  },
  low_product_entity_coverage: {
    label: 'Low Entity Coverage in Product Content',
    description:
      'Products lack the metadata and content depth for strong entity signals.',
    pillarId: 'content_commerce_signals',
  },
  not_answer_ready: {
    label: 'Not Answer-Ready',
    description:
      'Products lack sufficient content to be cited in AI-powered answer experiences.',
    pillarId: 'search_intent_fit',
  },
  weak_intent_match: {
    label: 'Weak Intent Match',
    description:
      'Product metadata may not align well with user search intent.',
    pillarId: 'search_intent_fit',
  },
  missing_product_image: {
    label: 'Missing Product Image',
    description:
      'Products without images have significantly lower engagement and conversion.',
    pillarId: 'media_accessibility',
  },
  missing_price: {
    label: 'Missing Product Price',
    description:
      'Products without price data cannot appear in price-filtered results or shopping feeds.',
    pillarId: 'technical_indexability',
  },
  missing_category: {
    label: 'Missing Product Category/Type',
    description:
      'Products without categories are harder to organize and surface in relevant contexts.',
    pillarId: 'content_commerce_signals',
  },
  // PERFORMANCE-1: Discovery-critical performance issues (Technical pillar)
  render_blocking_resources: {
    label: 'Render-blocking Resources',
    description:
      'Blocking scripts or styles ahead of content can delay first contentful paint for users and crawlers.',
    pillarId: 'technical_indexability',
  },
  indexability_conflict: {
    label: 'Indexability Conflict',
    description:
      'Pages have conflicting indexing directives (e.g., noindex in robots meta or X-Robots-Tag, or canonical pointing elsewhere).',
    pillarId: 'technical_indexability',
  },
  slow_initial_response: {
    label: 'Slow Initial Response',
    description:
      'HTML document is very large, which may indicate slow TTFB or excessive inline content.',
    pillarId: 'technical_indexability',
  },
  excessive_page_weight: {
    label: 'Excessive Page Weight',
    description:
      'Page HTML exceeds recommended size thresholds, potentially slowing crawlers and users.',
    pillarId: 'technical_indexability',
  },
  mobile_rendering_risk: {
    label: 'Mobile Rendering Risk',
    description:
      'Pages may have mobile rendering issues due to missing viewport meta or potential layout problems.',
    pillarId: 'technical_indexability',
  },
};

/**
 * Get the pillar ID for an issue, preferring backend-provided pillarId,
 * falling back to ISSUE_UI_CONFIG mapping.
 */
function getIssuePillarId(issue: DeoIssue): DeoPillarId | undefined {
  // Backend pillarId takes precedence
  if (issue.pillarId) {
    return issue.pillarId;
  }
  // Fall back to frontend config
  return ISSUE_UI_CONFIG[issue.id]?.pillarId;
}

interface IssuesListProps {
  issues: DeoIssue[];
  /** When true, group issues by pillar in canonical DEO_PILLARS order */
  groupByPillar?: boolean;
  /** [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Project ID for deterministic routing */
  projectId?: string;
}

export function IssuesList({ issues, groupByPillar = false, projectId }: IssuesListProps) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  // Non-grouped view: show "No issues detected" if empty
  if (!groupByPillar && (!issues || issues.length === 0)) {
    return (
      <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
        <span className="font-medium">No issues detected</span>
        <span className="ml-1">
          Your project looks healthy based on the latest crawl and DEO analysis.
        </span>
      </div>
    );
  }

  // Grouped by pillar view
  if (groupByPillar) {
    // Group issues by pillarId
    const issuesByPillar = new Map<DeoPillarId, DeoIssue[]>();
    for (const issue of issues) {
      const pillarId = getIssuePillarId(issue);
      if (pillarId) {
        const existing = issuesByPillar.get(pillarId) ?? [];
        existing.push(issue);
        issuesByPillar.set(pillarId, existing);
      }
    }

    return (
      <div className="space-y-6">
        {DEO_PILLARS.map((pillar) => {
          const pillarIssues = issuesByPillar.get(pillar.id) ?? [];

          return (
            <div key={pillar.id} className="space-y-3">
              {/* Pillar header */}
              <div className="border-b border-gray-200 pb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {pillar.label}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {pillar.whyItMatters}
                </p>
              </div>

              {/* Issues for this pillar or "Not analyzed yet" */}
              {pillarIssues.length > 0 ? (
                <div className="space-y-3">
                  {pillarIssues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      isExpanded={expandedIssueId === issue.id}
                      onToggleExpand={() =>
                        setExpandedIssueId((current) =>
                          current === issue.id ? null : issue.id,
                        )
                      }
                      projectId={projectId}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Not analyzed yet
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Flat list (default view)
  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          isExpanded={expandedIssueId === issue.id}
          onToggleExpand={() =>
            setExpandedIssueId((current) =>
              current === issue.id ? null : issue.id,
            )
          }
          projectId={projectId}
        />
      ))}
    </div>
  );
}

interface IssueCardProps {
  issue: DeoIssue;
  isExpanded: boolean;
  onToggleExpand: () => void;
  /** [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Project ID for deterministic routing */
  projectId?: string;
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Get deterministic deep-link for an issue
function getIssueDeepLink(issue: DeoIssue, projectId: string): string {
  const pillarId = getIssuePillarId(issue);
  const tab = pillarId ? PILLAR_TO_TAB_MAP[pillarId] : 'metadata';

  // If issue has a primary product, link to that product's tab
  if (issue.primaryProductId) {
    return `/projects/${projectId}/products/${issue.primaryProductId}?tab=${tab}&from=issues&issueId=${issue.id}`;
  }

  // If issue has affected products, link to first product
  if (issue.affectedProducts && issue.affectedProducts.length > 0) {
    return `/projects/${projectId}/products/${issue.affectedProducts[0]}?tab=${tab}&from=issues&issueId=${issue.id}`;
  }

  // Fall back to issues page filtered by pillar
  if (pillarId) {
    return `/projects/${projectId}/issues?pillar=${pillarId}`;
  }

  // Default to issues page
  return `/projects/${projectId}/issues`;
}

function IssueCard({ issue, isExpanded, onToggleExpand, projectId }: IssueCardProps) {
  const router = useRouter();

  // [ISSUE-TO-FIX-PATH-1] Use centralized safe title/description helpers
  const safeTitle = getSafeIssueTitle(issue);
  const safeDescription = getSafeIssueDescription(issue);

  // [ISSUE-TO-FIX-PATH-1] Check if issue is actionable
  const actionable = projectId ? isIssueActionable(issue) : false;
  const fixHref = projectId ? buildIssueFixHref({ projectId, issue }) : null;

  const severityBadge = getSeverityBadge(issue.severity);
  const hasAffectedItems =
    (issue.affectedPages?.length ?? 0) + (issue.affectedProducts?.length ?? 0) >
    0;

  // [ISSUE-TO-FIX-PATH-1] Handle card click - only for actionable issues
  const handleCardClick = () => {
    if (projectId && actionable && fixHref) {
      router.push(fixHref);
    }
  };

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Get counts for affected items display
  const affectedProductCount = issue.affectedProducts?.length ?? 0;
  const affectedPageCount = issue.affectedPages?.length ?? 0;

  return (
    <div
      // [ISSUE-TO-FIX-PATH-1] Test hooks for actionable vs informational cards
      data-testid={actionable ? 'issue-card-actionable' : 'issue-card-informational'}
      role={actionable ? 'button' : undefined}
      tabIndex={actionable ? 0 : undefined}
      onClick={actionable ? handleCardClick : undefined}
      onKeyDown={actionable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); } : undefined}
      className={`rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700 ${
        actionable ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{safeTitle}</span>
            <span className={severityBadge.className}>{severityBadge.label}</span>
            {/* [ISSUE-TO-FIX-PATH-1] Informational badge for orphan issues */}
            {!actionable && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-200">
                Informational — no action required
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">{safeDescription}</p>
          <p className="mt-1 text-xs text-gray-500">
            {issue.count} pages/products affected.
          </p>
        </div>
      </div>

      {hasAffectedItems && (
        <div className="mt-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Hide affected items' : 'Show affected items'}
          </button>
          {isExpanded && (
            <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-[11px] text-gray-700">
              {issue.affectedPages && issue.affectedPages.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 font-semibold">
                    Pages ({affectedPageCount})
                  </div>
                  <ul className="space-y-0.5">
                    {issue.affectedPages.map((url) => (
                      <li key={url} className="truncate">
                        {url}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {issue.affectedProducts && issue.affectedProducts.length > 0 && (
                <div>
                  {/* [ISSUE-TO-FIX-PATH-1] Remove internal ID leakage - show count and link instead */}
                  <div className="mb-1 font-semibold">
                    Products ({affectedProductCount})
                  </div>
                  {projectId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{affectedProductCount} product{affectedProductCount !== 1 ? 's' : ''} affected</span>
                      <Link
                        href={`/projects/${projectId}/products`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View affected →
                      </Link>
                    </div>
                  ) : (
                    <span className="text-gray-500">{affectedProductCount} product{affectedProductCount !== 1 ? 's' : ''} affected</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getSeverityBadge(severity: DeoIssue['severity']) {
  if (severity === 'critical') {
    return {
      label: 'Critical',
      className:
        'inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200',
    };
  }
  if (severity === 'warning') {
    return {
      label: 'Warning',
      className:
        'inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 border border-orange-200',
    };
  }
  return {
    label: 'Info',
    className:
      'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200',
  };
}
