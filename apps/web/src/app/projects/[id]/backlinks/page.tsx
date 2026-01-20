'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { projectsApi } from '@/lib/api';
import { OffsiteSignalsPanel } from '@/components/projects/OffsiteSignalsPanel';
import type {
  ProjectOffsiteSignalsResponse,
  OffsiteGapType,
  OffsiteSignalType,
  OffsiteFixDraftType,
  OffsiteFixDraft,
} from '@/lib/offsite-signals';
import InsightsPillarsSubnav from '@/components/projects/InsightsPillarsSubnav';

/**
 * Off-site Signals Workspace (OFFSITE-1)
 *
 * Main workspace for managing off-site signals for a project:
 * - View detected signals and coverage
 * - Identify gaps and opportunities
 * - Generate and apply fix drafts
 *
 * Ethical boundaries clearly stated:
 * - No link buying
 * - No spam tactics
 * - All outreach requires human review
 */
export default function BacklinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [data, setData] = useState<ProjectOffsiteSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<OffsiteFixDraft | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await projectsApi.offsiteSignals(projectId);
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch off-site signals:', err);
      setError('Failed to load off-site signals data.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePreviewFix = async (
    gapType: OffsiteGapType,
    signalType: OffsiteSignalType,
    focusKey: string,
    draftType: OffsiteFixDraftType
  ) => {
    try {
      setPreviewLoading(true);
      const result = await projectsApi.previewOffsiteFix(projectId, {
        gapType,
        signalType,
        focusKey,
        draftType,
      });
      setPreviewDraft(result.draft);
    } catch (err) {
      console.error('Failed to preview fix:', err);
      setError('Failed to generate draft preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyFix = async (
    draftId: string,
    applyTarget: 'NOTES' | 'CONTENT_WORKSPACE' | 'OUTREACH_DRAFTS'
  ) => {
    try {
      await projectsApi.applyOffsiteFix(projectId, {
        draftId,
        applyTarget,
      });
      // Refresh data after applying
      await fetchData();
      setPreviewDraft(null);
    } catch (err) {
      console.error('Failed to apply fix:', err);
      setError('Failed to apply the draft.');
    }
  };

  const closePreviewModal = () => {
    setPreviewDraft(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Off-site Signals
        </h1>
        <p className="text-gray-600">
          Manage brand mentions, authoritative listings, reviews, and reference
          content that build trust and authority.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Off-site signals help discovery engines and AI models understand your
          brand&apos;s authority and relevance.
        </p>
      </div>

      <InsightsPillarsSubnav />

      {/* Ethical Boundaries Notice */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-1">
          Ethical off-site strategy
        </h3>
        <p className="text-sm text-blue-800">
          EngineO.ai helps you identify opportunities and generate outreach
          drafts, but does not support link buying, spam tactics, or automated
          outreach. All generated content should be reviewed before sending
          manually.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Main Panel */}
      <div id="offsite-section">
        <OffsiteSignalsPanel
          projectId={projectId}
          coverage={data?.coverage || null}
          signals={data?.signals || []}
          gaps={data?.gaps || []}
          openDrafts={data?.openDrafts || []}
          onPreviewFix={handlePreviewFix}
          onApplyFix={handleApplyFix}
          loading={loading}
        />
      </div>

      {/* Preview Draft Modal */}
      {(previewDraft || previewLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">
                    Generating draft...
                  </span>
                </div>
              ) : previewDraft ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Draft Preview
                    </h3>
                    <button
                      onClick={closePreviewModal}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {previewDraft.generatedWithAi && (
                    <div className="mb-4 px-3 py-2 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800">
                      This draft was generated with AI. Please review and
                      customize before using.
                    </div>
                  )}

                  <div className="space-y-4">
                    {previewDraft.draftPayload.subject && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <div className="p-3 bg-gray-50 rounded border border-gray-200 text-gray-900">
                          {previewDraft.draftPayload.subject}
                        </div>
                      </div>
                    )}

                    {previewDraft.draftPayload.body && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Body
                        </label>
                        <div className="p-3 bg-gray-50 rounded border border-gray-200 text-gray-900 whitespace-pre-wrap">
                          {previewDraft.draftPayload.body}
                        </div>
                      </div>
                    )}

                    {previewDraft.draftPayload.summary && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Summary
                        </label>
                        <div className="p-3 bg-gray-50 rounded border border-gray-200 text-gray-900">
                          {previewDraft.draftPayload.summary}
                        </div>
                      </div>
                    )}

                    {previewDraft.draftPayload.bullets &&
                      previewDraft.draftPayload.bullets.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Key Points
                          </label>
                          <ul className="list-disc list-inside p-3 bg-gray-50 rounded border border-gray-200 text-gray-900">
                            {previewDraft.draftPayload.bullets.map(
                              (bullet, i) => (
                                <li key={i}>{bullet}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {previewDraft.draftPayload.message && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Message
                        </label>
                        <div className="p-3 bg-gray-50 rounded border border-gray-200 text-gray-900">
                          {previewDraft.draftPayload.message}
                        </div>
                      </div>
                    )}

                    {previewDraft.draftPayload.channel && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Suggested Channel
                        </label>
                        <div className="text-gray-900">
                          {previewDraft.draftPayload.channel}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-4">
                      Save this draft to use later. Automated outreach sending
                      is not available - please review and send manually.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleApplyFix(previewDraft.id, 'NOTES')}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
                      >
                        Save to Notes
                      </button>
                      <button
                        onClick={() =>
                          handleApplyFix(previewDraft.id, 'OUTREACH_DRAFTS')
                        }
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50"
                      >
                        Add to Outreach Queue
                      </button>
                      <button
                        onClick={closePreviewModal}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Note about v1 limitations */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">
          About Off-site Signals
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • Signals are detected through configured sources and heuristics,
            not external crawling
          </li>
          <li>
            • Generated drafts are starting points that require human review and
            customization
          </li>
          <li>
            • EngineO.ai does not automatically send outreach or purchase links
          </li>
          <li>
            • Focus is on presence and quality of trust signals, not raw
            backlink counts or DA scores
          </li>
        </ul>
      </div>
    </div>
  );
}
