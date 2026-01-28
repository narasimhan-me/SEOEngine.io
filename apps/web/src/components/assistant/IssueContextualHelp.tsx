'use client';

import type { DeoIssue } from '@/lib/deo-issues';
import { AiAssistantEntryPoint, type AiAssistantSuggestion } from './AiAssistantEntryPoint';

/**
 * [EA-30: AI-ASSIST-ENTRY-POINTS-1] Issue Contextual Help Component
 *
 * Provides contextual AI assistance for understanding a specific issue.
 * Scoped to the current issue - does not offer broad system-wide recommendations.
 *
 * Suggestions use supportive, optional language:
 * - "You might consider..."
 * - "One option is..."
 * - "This could help if..."
 */

interface IssueContextualHelpProps {
  /** Project ID for preference tracking */
  projectId: string;
  /** The issue to provide help for */
  issue: DeoIssue;
  /** Whether trust loop is complete (should be pre-gated by parent) */
  trustLoopComplete: boolean;
}

/**
 * Derive contextual suggestions for an issue.
 * All suggestions use optional, supportive language.
 */
function deriveIssueSuggestions(issue: DeoIssue): AiAssistantSuggestion[] {
  const suggestions: AiAssistantSuggestion[] = [];

  // Understanding suggestion based on issue type
  if (issue.whyItMatters) {
    suggestions.push({
      id: `${issue.id}-understanding`,
      text: 'You might find it helpful to review why this issue matters for your customers.',
      context: issue.whyItMatters,
      category: 'understanding',
      confidence: 'high',
    });
  }

  // Action suggestion based on actionability
  if (issue.isActionableNow && issue.recommendedFix) {
    suggestions.push({
      id: `${issue.id}-action`,
      text: `One option is to ${issue.recommendedFix.toLowerCase()}.`,
      context: 'This can be addressed from the Work Canvas when you\'re ready.',
      category: 'action',
      confidence: issue.confidence && issue.confidence >= 0.7 ? 'high' : 'medium',
    });
  } else if (issue.actionability === 'manual') {
    suggestions.push({
      id: `${issue.id}-manual`,
      text: 'This issue may benefit from your direct review and customization.',
      context: 'Manual adjustments often work best when tailored to your specific needs.',
      category: 'action',
      confidence: 'medium',
    });
  }

  // Learning suggestion for educational content
  if (issue.pillarId && issue.category) {
    const pillarLabels: Record<string, string> = {
      content: 'content quality',
      entities: 'product information',
      technical: 'technical health',
      visibility: 'search visibility',
      answerability: 'AI recommendations',
    };
    const pillarLabel = pillarLabels[issue.pillarId] || issue.pillarId;

    suggestions.push({
      id: `${issue.id}-learning`,
      text: `If you'd like to learn more, this relates to ${pillarLabel}.`,
      context: 'Understanding these patterns can help with similar issues in the future.',
      category: 'learning',
      confidence: 'low',
    });
  }

  // Affected items suggestion
  if (issue.count && issue.count > 1) {
    suggestions.push({
      id: `${issue.id}-scope`,
      text: `You might consider addressing this across ${issue.count} items if it aligns with your priorities.`,
      category: 'action',
      confidence: 'medium',
    });
  }

  return suggestions;
}

export function IssueContextualHelp({
  projectId,
  issue,
  trustLoopComplete,
}: IssueContextualHelpProps) {
  // Don't render if trust loop not complete
  if (!trustLoopComplete) {
    return null;
  }

  const suggestions = deriveIssueSuggestions(issue);

  // Don't render if no suggestions
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <AiAssistantEntryPoint
      projectId={projectId}
      contextId={`issue-${issue.id}`}
      title="Help with this issue"
      suggestions={suggestions}
      defaultCollapsed={true}
    />
  );
}
