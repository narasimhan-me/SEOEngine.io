/**
 * [GEO-FOUNDATION-1] GEO Types for Web App
 *
 * Client-side types for GEO (Generative Engine Optimization) features.
 */

export type GeoCitationConfidenceLevel = 'high' | 'medium' | 'low';

export type GeoReadinessSignalType =
  | 'clarity'
  | 'specificity'
  | 'structure'
  | 'context'
  | 'accessibility';

export type GeoReadinessSignalStatus = 'pass' | 'needs_improvement';

export interface GeoReadinessSignal {
  signal: GeoReadinessSignalType;
  status: GeoReadinessSignalStatus;
  why: string;
}

export interface GeoCitationConfidence {
  level: GeoCitationConfidenceLevel;
  reason: string;
}

export interface GeoIssue {
  issueType: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  questionId?: string;
}

export interface GeoAnswerUnitEvaluation {
  unitId: string;
  questionId: string;
  signals: GeoReadinessSignal[];
  issues: GeoIssue[];
  citationConfidence: GeoCitationConfidence;
}

export interface GeoProductEvaluation {
  productId: string;
  answerUnits: GeoAnswerUnitEvaluation[];
  citationConfidence: GeoCitationConfidence;
  issues: GeoIssue[];
}

export interface GeoFixDraft {
  id: string;
  productId: string;
  questionId: string;
  issueType: string;
  draftPayload: {
    improvedAnswer?: string;
    suggestedStructure?: string;
    clarityNotes?: string;
  };
  aiWorkKey: string;
  reusedFromWorkKey?: string;
  generatedWithAi: boolean;
  generatedAt: string;
  expiresAt?: string;
}

export interface GeoFixPreviewResponse {
  draft: GeoFixDraft;
  generatedWithAi: boolean;
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

export interface GeoFixApplyResponse {
  success: boolean;
  updatedEvaluation: GeoProductEvaluation;
  issuesResolved: boolean;
  issuesResolvedCount: number;
}

export interface ProductGeoReadinessResponse {
  productId: string;
  evaluation: GeoProductEvaluation;
  openDrafts: GeoFixDraft[];
}

/**
 * Canonical question IDs for GEO Answer Units
 */
export const GEO_CANONICAL_QUESTIONS = [
  { id: 'what_is_it', label: 'What is it?' },
  { id: 'who_is_it_for', label: 'Who is it for?' },
  { id: 'why_choose_this', label: 'Why choose this?' },
  { id: 'how_to_use', label: 'How to use?' },
  { id: 'key_features', label: 'Key features?' },
  { id: 'comparisons', label: 'Comparisons?' },
  { id: 'pricing_value', label: 'Pricing/value?' },
  { id: 'shipping_returns', label: 'Shipping/returns?' },
  { id: 'warranty_support', label: 'Warranty/support?' },
  { id: 'reviews_social', label: 'Reviews/social proof?' },
] as const;

/**
 * Get label for a question ID
 */
export function getQuestionLabel(questionId: string): string {
  const found = GEO_CANONICAL_QUESTIONS.find((q) => q.id === questionId);
  return found?.label ?? questionId;
}

/**
 * Get badge color class for confidence level
 */
export function getConfidenceBadgeClass(
  level: GeoCitationConfidenceLevel
): string {
  switch (level) {
    case 'high':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get icon for signal status
 */
export function getSignalStatusIcon(status: GeoReadinessSignalStatus): string {
  return status === 'pass' ? 'checkmark-circle' : 'warning';
}
