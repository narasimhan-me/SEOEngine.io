/**
 * [EA-49: AI-ADVISORY-ONLY-1] RCP Guidance Panel
 *
 * Integrates AI guidance into the Right Context Panel for issue details.
 * Users can request explanations and suitability guidance from this panel.
 *
 * Trust Contract:
 * - AI guidance is user-initiated only
 * - Visually distinct from execution controls
 * - No auto-selection or auto-execution of recommendations
 */

import React from 'react';
import {
  AIAdvisoryBadge,
  PlaybookExplainer,
  SuitabilityAdvisor,
} from '../ai-guidance';
import { AI_ADVISORY_FRAMING } from '../../lib/issue-to-action-guidance';
import type { RecommendedPlaybook } from '../../lib/issue-to-action-guidance';

export interface RCPGuidancePanelProps {
  /** The issue type being viewed */
  issueType: string;
  /** Recommended playbooks for this issue */
  recommendations: RecommendedPlaybook[];
  /** Number of affected items */
  affectedCount?: number;
  /** Callback when user chooses to view a playbook (navigates, doesn't execute) */
  onViewPlaybook?: (playbookId: string) => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Guidance panel for RCP that surfaces AI explanations and suitability advice.
 * Maintains clear separation from execution controls.
 */
export function RCPGuidancePanel({
  issueType,
  recommendations,
  affectedCount,
  onViewPlaybook,
  className = '',
}: RCPGuidancePanelProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-gray-50 border border-gray-200 rounded-lg ${className}`}
      data-testid="rcp-ai-guidance-panel"
    >
      {/* Header with clear advisory framing */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            You might consider
          </h3>
          <AIAdvisoryBadge size="sm" />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          These are suggestions based on the issue type. You choose what to do.
        </p>
      </div>

      {/* Playbook recommendations with explainers */}
      <div className="p-4 space-y-4">
        {recommendations.map((playbook) => (
          <div key={playbook.playbookId} className="space-y-3">
            <PlaybookExplainer playbook={playbook} />

            <div className="flex items-center justify-between pl-1">
              <SuitabilityAdvisor
                playbook={playbook}
                issueType={issueType}
                affectedCount={affectedCount}
              />

              {onViewPlaybook && (
                <button
                  type="button"
                  onClick={() => onViewPlaybook(playbook.playbookId)}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  data-testid={`view-playbook-${playbook.playbookId}`}
                >
                  View playbook →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-100/50">
        <p className="text-xs text-gray-500">
          {AI_ADVISORY_FRAMING.ADVISORY_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

export default RCPGuidancePanel;
