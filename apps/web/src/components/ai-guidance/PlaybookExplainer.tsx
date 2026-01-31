/**
 * [EA-49: AI-ADVISORY-ONLY-1] Playbook Explainer Component
 *
 * Allows users to request AI explanations of what a playbook does.
 * AI provides guidance ONLY - never initiates execution.
 *
 * Trust Contract:
 * - User must explicitly request explanation
 * - AI output is clearly framed as advisory
 * - No execution is triggered by viewing explanation
 * - All control remains with the user
 */

import React, { useState, useCallback } from 'react';
import { AIAdvisoryBadge } from './AIAdvisoryBadge';
import {
  AI_ADVISORY_FRAMING,
  createAIAdvisoryResponse,
  frameAsAdvisory,
  type AIAdvisoryResponse,
} from '../../lib/issue-to-action-guidance';
import type { RecommendedPlaybook } from '../../lib/issue-to-action-guidance';

export interface PlaybookExplainerProps {
  /** The playbook to explain */
  playbook: RecommendedPlaybook;
  /** Optional callback when explanation is viewed */
  onExplanationViewed?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Component that provides AI-powered explanations of playbooks.
 * Users must explicitly request explanations - nothing is auto-shown.
 */
export function PlaybookExplainer({
  playbook,
  onExplanationViewed,
  className = '',
}: PlaybookExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [advisoryResponse, setAdvisoryResponse] = useState<AIAdvisoryResponse | null>(null);

  const handleRequestExplanation = useCallback(() => {
    // Generate advisory response from static playbook data
    // This is deterministic, not a live AI call - uses pre-authored content
    const explanation = `**${playbook.name}**\n\n${playbook.oneLineWhatItDoes}\n\n**What it affects:** ${playbook.affects}\n\n**Before running, note that:**\n${playbook.preconditions.map(p => `• ${p}`).join('\n')}\n\n**Why this might help:** ${playbook.whyThisHelps}`;

    const response = createAIAdvisoryResponse(explanation, 'explanation');
    setAdvisoryResponse(response);
    setIsExpanded(true);
    onExplanationViewed?.();
  }, [playbook, onExplanationViewed]);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return (
    <div
      className={`border border-gray-200 rounded-lg bg-white ${className}`}
      data-testid="playbook-explainer"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{playbook.name}</h4>
            <p className="text-sm text-gray-600 mt-1">
              {playbook.oneLineWhatItDoes}
            </p>
          </div>
          {!isExpanded && (
            <button
              type="button"
              onClick={handleRequestExplanation}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
              data-testid="explain-playbook-button"
            >
              Explain this playbook
            </button>
          )}
        </div>

        {isExpanded && advisoryResponse && (
          <div
            className="mt-4 pt-4 border-t border-gray-100"
            data-testid="playbook-explanation-panel"
          >
            <div className="flex items-center justify-between mb-3">
              <AIAdvisoryBadge showDisclaimer />
              <button
                type="button"
                onClick={handleCollapse}
                className="text-sm text-gray-500 hover:text-gray-700"
                aria-label="Close explanation"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              className="prose prose-sm max-w-none text-gray-700"
              data-testid="ai-explanation-content"
            >
              <div className="whitespace-pre-wrap">
                {frameAsAdvisory(advisoryResponse.content, 'explanation')}
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500">
                {AI_ADVISORY_FRAMING.ADVISORY_DISCLAIMER}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlaybookExplainer;
