'use client';

import { useState } from 'react';
import type { DeoIssue } from '@engineo/shared';

export const ISSUE_UI_CONFIG: Record<string, { label: string; description: string }> = {
  missing_metadata: {
    label: 'Missing Metadata',
    description:
      'Some pages and products are missing essential metadata like titles or descriptions.',
  },
  thin_content: {
    label: 'Thin Content',
    description:
      'Many surfaces have very short content, which weakens depth and ranking potential.',
  },
  low_entity_coverage: {
    label: 'Weak Entity Structure',
    description:
      'Key entities, headings, or product schemas are incomplete or missing.',
  },
  indexability_problems: {
    label: 'Indexability Problems',
    description:
      'Crawl errors or missing HTML basics make some pages hard to index.',
  },
  answer_surface_weakness: {
    label: 'Low AI Answer Potential',
    description:
      'Pages lack the long-form content and structure needed to power rich answers.',
  },
  brand_navigational_weakness: {
    label: 'Weak Brand Navigation',
    description:
      'Canonical navigational pages like /about or /contact are missing or not discoverable.',
  },
  crawl_health_errors: {
    label: 'Crawl Errors',
    description:
      'A number of pages return HTTP or fetch errors, reducing crawl coverage.',
  },
  product_content_depth: {
    label: 'Shallow Product Content',
    description:
      'Many products have very short or missing descriptions, limiting their ability to rank and convert.',
  },
};

export function IssuesList({ issues }: { issues: DeoIssue[] }) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  if (!issues || issues.length === 0) {
    return (
      <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
        <span className="font-medium">No issues detected 🎉</span>
        <span className="ml-1">
          Your project looks healthy based on the latest crawl and DEO analysis.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => {
        const uiConfig = ISSUE_UI_CONFIG[issue.id] ?? {
          label: issue.title,
          description: issue.description,
        };

        const severityBadge = getSeverityBadge(issue.severity);
        const isExpanded = expandedIssueId === issue.id;
        const hasAffectedItems =
          (issue.affectedPages?.length ?? 0) +
            (issue.affectedProducts?.length ?? 0) >
          0;

        return (
          <div
            key={issue.id}
            className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{uiConfig.label}</span>
                  <span className={severityBadge.className}>
                    {severityBadge.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {uiConfig.description}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {issue.count} pages/products affected.
                </p>
              </div>
            </div>

            {hasAffectedItems && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedIssueId((current) =>
                      current === issue.id ? null : issue.id,
                    )
                  }
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
                    {issue.affectedProducts &&
                      issue.affectedProducts.length > 0 && (
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
      })}
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
