'use client';

import { AiAssistantEntryPoint, type AiAssistantSuggestion } from './AiAssistantEntryPoint';

/**
 * [EA-30: AI-ASSIST-ENTRY-POINTS-1] Fix Explanation Help Component
 *
 * Provides contextual AI assistance for understanding a potential fix.
 * Explains what a fix does and why it might be relevant.
 *
 * All content is educational and never implies autonomous action.
 */

interface FixExplanationHelpProps {
  /** Project ID for preference tracking */
  projectId: string;
  /** Unique identifier for this fix context */
  fixId: string;
  /** Name/label of the fix */
  fixLabel: string;
  /** What the fix does */
  whatItDoes: string;
  /** Why this fix might be relevant */
  whyRelevant?: string;
  /** What the user should consider before applying */
  considerations?: string[];
  /** Whether trust loop is complete */
  trustLoopComplete: boolean;
}

export function FixExplanationHelp({
  projectId,
  fixId,
  fixLabel,
  whatItDoes,
  whyRelevant,
  considerations,
  trustLoopComplete,
}: FixExplanationHelpProps) {
  // Don't render if trust loop not complete
  if (!trustLoopComplete) {
    return null;
  }

  const suggestions: AiAssistantSuggestion[] = [];

  // Main explanation
  suggestions.push({
    id: `${fixId}-what`,
    text: `This option would ${whatItDoes.toLowerCase()}.`,
    context: whyRelevant,
    category: 'understanding',
    confidence: 'high',
  });

  // Considerations
  if (considerations && considerations.length > 0) {
    suggestions.push({
      id: `${fixId}-consider`,
      text: 'Before proceeding, you might want to consider:',
      context: considerations.join(' • '),
      category: 'understanding',
      confidence: 'medium',
    });
  }

  // Always add a reminder about user control
  suggestions.push({
    id: `${fixId}-control`,
    text: 'You\'ll have a chance to review any changes before they\'re applied.',
    category: 'learning',
    confidence: 'high',
  });

  return (
    <AiAssistantEntryPoint
      projectId={projectId}
      contextId={`fix-${fixId}`}
      title={`About "${fixLabel}"`}
      suggestions={suggestions}
      defaultCollapsed={true}
    />
  );
}
