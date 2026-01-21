'use client';

import { useState } from 'react';
import {
  type ProjectOffsiteCoverage,
  type ProjectOffsiteSignal,
  type OffsiteGap,
  type OffsiteFixDraft,
  OFFSITE_SIGNAL_LABELS,
  OFFSITE_SIGNAL_DESCRIPTIONS,
  OFFSITE_GAP_LABELS,
  OFFSITE_FIX_DRAFT_LABELS,
  type OffsiteSignalType,
  type OffsiteGapType,
  type OffsiteFixDraftType,
} from '@/lib/offsite-signals';

interface OffsiteSignalsPanelProps {
  projectId: string;
  coverage: ProjectOffsiteCoverage | null;
  signals?: ProjectOffsiteSignal[];
  gaps?: OffsiteGap[];
  openDrafts?: OffsiteFixDraft[];
  onPreviewFix?: (
    gapType: OffsiteGapType,
    signalType: OffsiteSignalType,
    focusKey: string,
    draftType: OffsiteFixDraftType
  ) => void;
  onApplyFix?: (
    draftId: string,
    applyTarget: 'NOTES' | 'CONTENT_WORKSPACE' | 'OUTREACH_DRAFTS'
  ) => void;
  loading?: boolean;
  compact?: boolean;
}

/**
 * OffsiteSignalsPanel
 *
 * Reusable panel for displaying Off-site Signals pillar data.
 * Used in:
 * - Project Off-site workspace (backlinks page)
 * - DEO Overview off-site pillar card
 *
 * Shows:
 * - Off-site Presence Score and status
 * - Signal counts by type
 * - High-impact gaps
 * - Preview fix actions
 */
export function OffsiteSignalsPanel({
  projectId: _projectId,
  coverage,
  signals = [],
  gaps = [],
  openDrafts = [],
  onPreviewFix,
  onApplyFix,
  loading = false,
  compact = false,
}: OffsiteSignalsPanelProps) {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!coverage) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500">No off-site signals data available.</p>
      </div>
    );
  }

  const statusColors = {
    Low: 'text-red-600 bg-red-50',
    Medium: 'text-yellow-600 bg-yellow-50',
    Strong: 'text-green-600 bg-green-50',
  };

  const signalTypes: OffsiteSignalType[] = [
    'trust_proof',
    'authoritative_listing',
    'brand_mention',
    'reference_content',
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header with Score and Status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Off-site Presence
          </h3>
          <p className="text-sm text-gray-500">
            Brand mentions, listings, reviews, and citations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-3xl font-bold text-gray-900">
              {coverage.overallScore}
            </span>
            <span className="text-gray-500">/100</span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[coverage.status]}`}
          >
            {coverage.status}
          </span>
        </div>
      </div>

      {/* Signal Counts by Type */}
      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {signalTypes.map((type) => (
            <div key={type} className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700">
                {OFFSITE_SIGNAL_LABELS[type]}
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {coverage.signalCounts[type]}
              </div>
              <div className="text-xs text-gray-500">
                {OFFSITE_SIGNAL_DESCRIPTIONS[type]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="flex items-center space-x-6 mb-6 text-sm">
        <div>
          <span className="text-gray-500">Total Signals:</span>{' '}
          <span className="font-medium text-gray-900">
            {coverage.totalSignals}
          </span>
        </div>
        <div>
          <span className="text-gray-500">High-Impact Gaps:</span>{' '}
          <span
            className={`font-medium ${coverage.highImpactGaps > 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            {coverage.highImpactGaps}
          </span>
        </div>
      </div>

      {/* Gaps Section */}
      {gaps.length > 0 && !compact && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Off-site Gaps
          </h4>
          <div className="space-y-3">
            {gaps.map((gap) => (
              <div
                key={gap.id}
                className={`border rounded-lg p-4 ${
                  gap.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : gap.severity === 'warning'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          gap.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : gap.severity === 'warning'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {gap.severity}
                      </span>
                      <span className="text-xs text-gray-500">
                        {OFFSITE_SIGNAL_LABELS[gap.signalType]}
                      </span>
                    </div>
                    <h5 className="font-medium text-gray-900">
                      {OFFSITE_GAP_LABELS[gap.gapType]}
                    </h5>
                    <p className="text-sm text-gray-600 mt-1">{gap.example}</p>
                    {gap.competitorCount && (
                      <p className="text-xs text-gray-500 mt-1">
                        ~{gap.competitorCount} competitors have this signal type
                      </p>
                    )}
                  </div>
                  {onPreviewFix && (
                    <button
                      onClick={() =>
                        setExpandedGap(expandedGap === gap.id ? null : gap.id)
                      }
                      className="ml-4 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      Preview Fix
                    </button>
                  )}
                </div>

                {/* Expanded Fix Options */}
                {expandedGap === gap.id && onPreviewFix && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">
                      <strong>Recommended:</strong> {gap.recommendedAction}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          onPreviewFix(
                            gap.gapType,
                            gap.signalType,
                            `${gap.signalType}/general`,
                            'outreach_email'
                          )
                        }
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                      >
                        {OFFSITE_FIX_DRAFT_LABELS['outreach_email']}
                      </button>
                      <button
                        onClick={() =>
                          onPreviewFix(
                            gap.gapType,
                            gap.signalType,
                            `${gap.signalType}/general`,
                            'pr_pitch'
                          )
                        }
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                      >
                        {OFFSITE_FIX_DRAFT_LABELS['pr_pitch']}
                      </button>
                      <button
                        onClick={() =>
                          onPreviewFix(
                            gap.gapType,
                            gap.signalType,
                            `${gap.signalType}/general`,
                            'brand_profile_snippet'
                          )
                        }
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                      >
                        {OFFSITE_FIX_DRAFT_LABELS['brand_profile_snippet']}
                      </button>
                      {gap.signalType === 'trust_proof' && (
                        <button
                          onClick={() =>
                            onPreviewFix(
                              gap.gapType,
                              gap.signalType,
                              `${gap.signalType}/review`,
                              'review_request_copy'
                            )
                          }
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                        >
                          {OFFSITE_FIX_DRAFT_LABELS['review_request_copy']}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detected Signals Section */}
      {signals.length > 0 && !compact && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Detected Signals
          </h4>
          <div className="space-y-2">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {OFFSITE_SIGNAL_LABELS[signal.signalType]}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {signal.sourceName}
                  </span>
                  {signal.knownPlatform && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      Known Platform
                    </span>
                  )}
                </div>
                {signal.url && (
                  <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Drafts Section */}
      {openDrafts.length > 0 && !compact && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Open Drafts
          </h4>
          <div className="space-y-3">
            {openDrafts.map((draft) => (
              <div key={draft.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {OFFSITE_FIX_DRAFT_LABELS[draft.draftType]}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      for {OFFSITE_SIGNAL_LABELS[draft.signalType]}
                    </span>
                  </div>
                  {draft.generatedWithAi && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      AI Generated
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Focus: {draft.focusKey}
                </p>
                {onApplyFix && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onApplyFix(draft.id, 'NOTES')}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Save to Notes
                    </button>
                    <button
                      onClick={() => onApplyFix(draft.id, 'OUTREACH_DRAFTS')}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                    >
                      Add to Outreach
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ethical Boundaries Note */}
      {!compact && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Ethical boundaries:</strong> EngineO.ai helps surface
            opportunities and generate drafts for outreach, but does not
            automate sending. All generated content requires human review. We do
            not support link buying, spam tactics, or manipulative practices.
          </p>
        </div>
      )}
    </div>
  );
}
