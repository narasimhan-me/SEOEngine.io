/**
 * [EA-49: AI-ADVISORY-ONLY-1] Suitability Advisor Component
 *
 * Provides "Is this right for me?" guidance when users ask.
 * AI provides advisory input ONLY - never makes decisions for the user.
 *
 * Trust Contract:
 * - User must explicitly ask for suitability guidance
 * - AI provides factors to consider, not decisions
 * - No recommendation is auto-selected
 * - User retains full decision-making authority
 */

import React, { useState, useCallback } from 'react';
import { AIAdvisoryBadge } from './AIAdvisoryBadge';
import {
  AI_ADVISORY_FRAMING,
  createAIAdvisoryResponse,
  type AIAdvisoryResponse,
} from '../../lib/issue-to-action-guidance';
import type { RecommendedPlaybook } from '../../lib/issue-to-action-guidance';

export interface SuitabilityAdvisorProps {
  /** The playbook to assess suitability for */
  playbook: RecommendedPlaybook;
  /** Current issue context for more relevant guidance */
  issueType?: string;
  /** Number of affected items (for context) */
  affectedCount?: number;
  /** Optional callback when guidance is requested */
  onGuidanceRequested?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

interface SuitabilityFactor {
  label: string;
  description: string;
  consideration: 'positive' | 'neutral' | 'caution';
}

/**
 * Generates suitability factors based on playbook characteristics.
 * This is deterministic guidance, not live AI inference.
 */
function generateSuitabilityFactors(
  playbook: RecommendedPlaybook,
  affectedCount?: number
): SuitabilityFactor[] {
  const factors: SuitabilityFactor[] = [];

  // Factor based on fix type
  if (playbook.fixTypeLabel === 'AI') {
    factors.push({
      label: 'AI-Generated Suggestions',
      description: 'This playbook uses AI to generate suggestions. You\'ll review each suggestion before anything is applied.',
      consideration: 'neutral',
    });
  } else if (playbook.fixTypeLabel === 'Template') {
    factors.push({
      label: 'Template-Based',
      description: 'This playbook applies consistent templates. Good for standardization across your catalog.',
      consideration: 'positive',
    });
  }

  // Factor based on scope
  if (affectedCount !== undefined) {
    if (affectedCount > 50) {
      factors.push({
        label: 'Large Scope',
        description: `This would affect ${affectedCount} items. Consider reviewing a sample first.`,
        consideration: 'caution',
      });
    } else if (affectedCount > 0) {
      factors.push({
        label: 'Manageable Scope',
        description: `This would affect ${affectedCount} item${affectedCount === 1 ? '' : 's'}. A reasonable number to review.`,
        consideration: 'positive',
      });
    }
  }

  // Factor based on preconditions
  if (playbook.preconditions.length > 0) {
    factors.push({
      label: 'Review Required',
      description: playbook.preconditions[0],
      consideration: 'neutral',
    });
  }

  return factors;
}

/**
 * Component that provides "Is this right for me?" suitability guidance.
 * Users must explicitly request guidance - nothing is auto-shown.
 */
export function SuitabilityAdvisor({
  playbook,
  issueType,
  affectedCount,
  onGuidanceRequested,
  className = '',
}: SuitabilityAdvisorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [_advisoryResponse, setAdvisoryResponse] = useState<AIAdvisoryResponse | null>(null);
  const [factors, setFactors] = useState<SuitabilityFactor[]>([]);

  const handleRequestGuidance = useCallback(() => {
    const suitabilityFactors = generateSuitabilityFactors(playbook, affectedCount);
    setFactors(suitabilityFactors);

    const content = `**Considering "${playbook.name}" for ${issueType || 'this issue'}**\n\nHere are factors to help you decide:\n\n${suitabilityFactors.map(f => `• **${f.label}:** ${f.description}`).join('\n\n')}\n\n**Remember:** This is your decision. The playbook won't run until you explicitly choose to start it.`;

    const response = createAIAdvisoryResponse(content, 'suitability');
    setAdvisoryResponse(response);
    setIsExpanded(true);
    onGuidanceRequested?.();
  }, [playbook, issueType, affectedCount, onGuidanceRequested]);

  const handleDismiss = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const getConsiderationIcon = (consideration: SuitabilityFactor['consideration']) => {
    switch (consideration) {
      case 'positive':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'caution':
        return (
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={className} data-testid="suitability-advisor">
      {!isExpanded ? (
        <button
          type="button"
          onClick={handleRequestGuidance}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          data-testid="is-this-right-for-me-button"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Is this right for me?
        </button>
      ) : (
        <div
          className="border border-blue-200 rounded-lg bg-blue-50 p-4"
          data-testid="suitability-guidance-panel"
        >
          <div className="flex items-start justify-between mb-3">
            <AIAdvisoryBadge />
            <button
              type="button"
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Dismiss guidance"
              data-testid="dismiss-suitability-guidance"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h4 className="font-medium text-gray-900 mb-3">
            {AI_ADVISORY_FRAMING.SUITABILITY_PREFIX}
          </h4>

          <ul className="space-y-3 mb-4">
            {factors.map((factor, index) => (
              <li key={index} className="flex items-start gap-2">
                {getConsiderationIcon(factor.consideration)}
                <div>
                  <span className="font-medium text-gray-900">{factor.label}:</span>{' '}
                  <span className="text-gray-700">{factor.description}</span>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-sm text-gray-600 italic">
            {AI_ADVISORY_FRAMING.USER_CONTROL_REMINDER}
          </p>
        </div>
      )}
    </div>
  );
}

export default SuitabilityAdvisor;
