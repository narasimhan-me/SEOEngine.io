/**
 * [EA-30: AI-ASSIST-ENTRY-POINTS-1] AI Assistant Components
 *
 * Entry points for contextual AI assistance.
 * All components are gated by trust loop completion.
 */

export { AiAssistantEntryPoint } from './AiAssistantEntryPoint';
export type { AiAssistantSuggestion } from './AiAssistantEntryPoint';

export { IssueContextualHelp } from './IssueContextualHelp';
export { FixExplanationHelp } from './FixExplanationHelp';
