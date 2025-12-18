'use client';

import { useState } from 'react';
import type { DeoIssue } from '@engineo/shared';
import { DEO_PILLARS, type DeoPillarId } from '@/lib/deo-pillars';

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
}

export function IssuesList({ issues, groupByPillar = false }: IssuesListProps) {
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
        />
      ))}
    </div>
  );
}

interface IssueCardProps {
  issue: DeoIssue;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function IssueCard({ issue, isExpanded, onToggleExpand }: IssueCardProps) {
  const uiConfig = ISSUE_UI_CONFIG[issue.id] ?? {
    label: issue.title,
    description: issue.description,
    pillarId: issue.pillarId,
  };

  const severityBadge = getSeverityBadge(issue.severity);
  const hasAffectedItems =
    (issue.affectedPages?.length ?? 0) + (issue.affectedProducts?.length ?? 0) >
    0;

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{uiConfig.label}</span>
            <span className={severityBadge.className}>{severityBadge.label}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">{uiConfig.description}</p>
          <p className="mt-1 text-xs text-gray-500">
            {issue.count} pages/products affected.
          </p>
        </div>
      </div>

      {hasAffectedItems && (
        <div className="mt-2">
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Hide affected items' : 'Show affected items'}
          </button>
          {isExpanded && (
            <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-[11px] text-gray-700">
              {issue.affectedPages && issue.affectedPages.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 font-semibold">
                    Pages ({issue.affectedPages.length})
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
                  <div className="mb-1 font-semibold">
                    Products ({issue.affectedProducts.length})
                  </div>
                  <ul className="space-y-0.5">
                    {issue.affectedProducts.map((id) => (
                      <li key={id} className="truncate">
                        Product ID: {id}
                      </li>
                    ))}
                  </ul>
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
