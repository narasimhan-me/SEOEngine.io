'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  competitorsApi,
  type ProductCompetitiveResponse,
  type CompetitiveFixGap,
  type CompetitiveFixDraft,
  type CompetitorGapType,
  type CompetitiveCoverageAreaId,
  type CompetitiveFixDraftType,
  type CompetitiveFixPreviewResponse,
  type CompetitiveStatus,
} from '@/lib/api';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

// Gap type labels for display
const GAP_TYPE_LABELS: Record<CompetitorGapType, string> = {
  intent_gap: 'Intent Gap',
  content_section_gap: 'Content Section Gap',
  trust_signal_gap: 'Trust Signal Gap',
};

// Coverage area labels for display
const AREA_LABELS: Record<CompetitiveCoverageAreaId, string> = {
  transactional_intent: 'Transactional Intent',
  comparative_intent: 'Comparative Intent',
  problem_use_case_intent: 'Problem / Use Case',
  trust_validation_intent: 'Trust / Validation',
  informational_intent: 'Informational',
  comparison_section: 'Comparison Section',
  why_choose_section: 'Why Choose Us',
  buying_guide_section: 'Buying Guide',
  feature_benefits_section: 'Features & Benefits',
  faq_coverage: 'FAQ Coverage',
  reviews_section: 'Reviews Section',
  guarantee_section: 'Guarantee Section',
};

// Status colors
const STATUS_CONFIG: Record<
  CompetitiveStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  Ahead: { label: 'Ahead', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  'On par': { label: 'On par', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  Behind: { label: 'Behind', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

interface ProductCompetitorsPanelProps {
  productId: string;
}

export function ProductCompetitorsPanel({ productId }: ProductCompetitorsPanelProps) {
  const feedback = useFeedback();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProductCompetitiveResponse | null>(null);

  // Preview/apply states
  const [previewingGap, setPreviewingGap] = useState<CompetitiveFixGap | null>(null);
  const [previewDraft, setPreviewDraft] = useState<CompetitiveFixDraft | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyingDraft, setApplyingDraft] = useState(false);

  // Expanded gap type
  const [expandedGapType, setExpandedGapType] = useState<CompetitorGapType | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await competitorsApi.getProductCompetitors(productId);
      setData(response);
    } catch (err) {
      console.error('[ProductCompetitorsPanel] Failed to fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to load competitive coverage');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePreviewFix = useCallback(
    async (gap: CompetitiveFixGap) => {
      try {
        setPreviewLoading(true);
        setPreviewingGap(gap);
        setPreviewDraft(null);

        // Determine the best draft type based on gap
        let draftType: CompetitiveFixDraftType = 'answer_block';
        if (gap.gapType === 'content_section_gap') {
          draftType = gap.areaId === 'why_choose_section' ? 'positioning_section' : 'comparison_copy';
        } else if (gap.gapType === 'trust_signal_gap') {
          draftType = 'positioning_section';
        }

        const response: CompetitiveFixPreviewResponse = await competitorsApi.previewCompetitiveFix(
          productId,
          {
            gapType: gap.gapType,
            intentType: gap.intentType,
            areaId: gap.areaId,
            draftType,
          }
        );

        setPreviewDraft(response.draft);

        if (response.generatedWithAi) {
          feedback.showSuccess('AI generated a new fix suggestion.');
        } else {
          feedback.showSuccess('Retrieved cached fix suggestion (no AI call).');
        }
      } catch (err) {
        console.error('[ProductCompetitorsPanel] Preview failed:', err);
        feedback.showError(err instanceof Error ? err.message : 'Failed to generate preview');
        setPreviewingGap(null);
      } finally {
        setPreviewLoading(false);
      }
    },
    [productId, feedback]
  );

  const handleApplyFix = useCallback(async () => {
    if (!previewDraft) return;

    try {
      setApplyingDraft(true);

      // Determine apply target based on draft type
      const applyTarget = previewDraft.draftType === 'answer_block'
        ? 'ANSWER_BLOCK' as const
        : previewDraft.draftType === 'positioning_section'
          ? 'WHY_CHOOSE_SECTION' as const
          : 'CONTENT_SECTION' as const;

      await competitorsApi.applyCompetitiveFix(productId, {
        draftId: previewDraft.id,
        applyTarget,
      });

      feedback.showSuccess('Fix applied successfully! Coverage will be recalculated.');

      // Reset preview state
      setPreviewDraft(null);
      setPreviewingGap(null);

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('[ProductCompetitorsPanel] Apply failed:', err);
      feedback.showError(err instanceof Error ? err.message : 'Failed to apply fix');
    } finally {
      setApplyingDraft(false);
    }
  }, [productId, previewDraft, feedback, fetchData]);

  const handleCancelPreview = useCallback(() => {
    setPreviewDraft(null);
    setPreviewingGap(null);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="h-8 w-full rounded bg-gray-100" />
          <div className="h-20 w-full rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-2 text-xs font-medium text-red-600 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { coverage, gaps, competitors } = data;
  const statusConfig = STATUS_CONFIG[coverage.status];

  // Group gaps by type
  const gapsByType = gaps.reduce((acc, gap) => {
    if (!acc[gap.gapType]) {
      acc[gap.gapType] = [];
    }
    acc[gap.gapType].push(gap);
    return acc;
  }, {} as Record<CompetitorGapType, CompetitiveFixGap[]>);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Competitive Positioning</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
          >
            {statusConfig.label} ({coverage.overallScore}%)
          </span>
        </div>
        {coverage.areasWhereCompetitorsLead > 0 && (
          <p className="mt-1 text-xs text-yellow-600">
            Competitors lead in {coverage.areasWhereCompetitorsLead} area
            {coverage.areasWhereCompetitorsLead !== 1 ? 's' : ''}
          </p>
        )}
        {competitors.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Comparing against: {competitors.map(c => c.displayName).join(', ')}
          </p>
        )}
      </div>

      {/* Gaps by Type */}
      {gaps.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <div className="text-sm font-medium text-green-600">No competitive gaps found</div>
          <p className="mt-1 text-xs text-gray-500">
            This product covers all competitive areas.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {Object.entries(gapsByType).map(([gapType, typeGaps]) => (
            <GapTypeSection
              key={gapType}
              gapType={gapType as CompetitorGapType}
              gaps={typeGaps}
              expanded={expandedGapType === gapType}
              onToggle={() =>
                setExpandedGapType(expandedGapType === gapType ? null : gapType as CompetitorGapType)
              }
              onPreview={handlePreviewFix}
              previewingGap={previewingGap}
              previewLoading={previewLoading}
            />
          ))}
        </div>
      )}

      {/* Preview Drawer */}
      {previewDraft && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Preview Fix</h4>
            <button
              type="button"
              onClick={handleCancelPreview}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            {previewDraft.draftType === 'answer_block' && previewDraft.draftPayload.question && (
              <>
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-500">Question</label>
                  <p className="mt-1 text-sm text-gray-900">{previewDraft.draftPayload.question}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Answer</label>
                  <p className="mt-1 text-sm text-gray-900">{previewDraft.draftPayload.answer}</p>
                </div>
              </>
            )}
            {previewDraft.draftType === 'comparison_copy' && previewDraft.draftPayload.comparisonText && (
              <>
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-500">Comparison Copy</label>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                    {previewDraft.draftPayload.comparisonText}
                  </p>
                </div>
                {previewDraft.draftPayload.placementGuidance && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Placement</label>
                    <p className="mt-1 text-xs text-gray-600">
                      {previewDraft.draftPayload.placementGuidance}
                    </p>
                  </div>
                )}
              </>
            )}
            {previewDraft.draftType === 'positioning_section' && previewDraft.draftPayload.positioningContent && (
              <>
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-500">Positioning Content</label>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                    {previewDraft.draftPayload.positioningContent}
                  </p>
                </div>
                {previewDraft.draftPayload.placementGuidance && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Placement</label>
                    <p className="mt-1 text-xs text-gray-600">
                      {previewDraft.draftPayload.placementGuidance}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyFix}
              disabled={applyingDraft}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {applyingDraft ? 'Applying...' : `Apply as ${previewDraft.draftType === 'answer_block' ? 'Answer Block' : 'Content Section'}`}
            </button>
            {!previewDraft.generatedWithAi && (
              <span className="text-xs text-gray-500">
                (Cached - no AI used)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface GapTypeSectionProps {
  gapType: CompetitorGapType;
  gaps: CompetitiveFixGap[];
  expanded: boolean;
  onToggle: () => void;
  onPreview: (gap: CompetitiveFixGap) => void;
  previewingGap: CompetitiveFixGap | null;
  previewLoading: boolean;
}

function GapTypeSection({
  gapType,
  gaps,
  expanded,
  onToggle,
  onPreview,
  previewingGap,
  previewLoading,
}: GapTypeSectionProps) {
  const severityCounts = {
    critical: gaps.filter(g => g.severity === 'critical').length,
    warning: gaps.filter(g => g.severity === 'warning').length,
    info: gaps.filter(g => g.severity === 'info').length,
  };

  return (
    <div className="px-4 py-3">
      {/* Section Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {GAP_TYPE_LABELS[gapType]}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {severityCounts.critical > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {severityCounts.critical} critical
            </span>
          )}
          {severityCounts.warning > 0 && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              {severityCounts.warning} warning
            </span>
          )}
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {gaps.map((gap) => (
            <GapItem
              key={gap.id}
              gap={gap}
              onPreview={onPreview}
              isPreviewing={previewingGap?.id === gap.id}
              isLoading={previewLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface GapItemProps {
  gap: CompetitiveFixGap;
  onPreview: (gap: CompetitiveFixGap) => void;
  isPreviewing: boolean;
  isLoading: boolean;
}

function GapItem({ gap, onPreview, isPreviewing, isLoading }: GapItemProps) {
  const severityColors = {
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    info: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  };
  const colors = severityColors[gap.severity];

  return (
    <div className={`rounded-md border ${colors.border} ${colors.bg} p-3`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${colors.text}`}>
              {AREA_LABELS[gap.areaId]}
            </span>
            {gap.competitorCount >= 2 && (
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                2+ competitors
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-600">{gap.whyItMatters}</p>
          {gap.exampleScenario && (
            <p className="mt-1 text-xs italic text-gray-500">{gap.exampleScenario}</p>
          )}
        </div>
        {gap.automationAvailable && (
          <button
            type="button"
            onClick={() => onPreview(gap)}
            disabled={isLoading}
            className="ml-3 flex-shrink-0 rounded bg-white px-2.5 py-1 text-xs font-medium text-blue-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isPreviewing && isLoading ? 'Loading...' : 'Preview Fix'}
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductCompetitorsPanel;
