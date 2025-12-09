/**
 * Answer Engine Types (Phase AE-1)
 *
 * Defines the Answer Block model and Answerability status types
 * for the Answer Engine subsystem. These types support AI-ready,
 * structured answers for products and pages.
 */

/**
 * Canonical Phase 1 answer question categories.
 * These represent the key buyer/AI questions that products should answer.
 */
export type AnswerBlockQuestionId =
  | 'what_is_it'
  | 'who_is_it_for'
  | 'why_choose_this'
  | 'key_features'
  | 'how_is_it_used'
  | 'problems_it_solves'
  | 'what_makes_it_different'
  | 'whats_included'
  | 'materials_and_specs'
  | 'care_safety_instructions';

/**
 * Source type for Answer Blocks.
 * Tracks how the answer was created/modified.
 */
export type AnswerBlockSourceType =
  | 'generated' // AI-generated from existing product/page data
  | 'userEdited' // User has modified or authored the answer
  | 'legacy'; // Imported or pre-existing content not yet normalized

/**
 * Optional estimated impact on DEO Score v2 components.
 * Values are integer deltas (e.g., +14 points).
 */
export interface AnswerBlockDeoImpact {
  answerability?: number;
  entityStrength?: number;
  intentMatch?: number;
}

/**
 * Answer Block - A structured, fact-oriented unit designed for AI assistants.
 *
 * Answer Blocks represent factual, concise answers to key buyer/AI questions
 * about products or pages. They are designed to be:
 * - AI-readable: Clear, structured format
 * - AI-confident: Based only on verified facts
 * - AI-preferable: Optimized for citation and extraction
 */
export interface AnswerBlock {
  /** Stable identifier for this answer block */
  id: string;

  /** Owning project ID */
  projectId: string;

  /** Primary product ID when attached to a product (optional for page-level answers) */
  productId?: string;

  /** Stable question category from the canonical set */
  questionId: AnswerBlockQuestionId;

  /** Human-readable question text */
  question: string;

  /** Factual, AI-ready answer text (~80-120 words max) */
  answer: string;

  /** Confidence score for this answer (0-1) */
  confidence: number;

  /** Source type indicating how the answer was created */
  sourceType: AnswerBlockSourceType;

  /** Keys for attributes/facts used to generate this answer */
  factsUsed: string[];

  /** Optional estimated impact on DEO Score v2 components */
  deoImpactEstimate?: AnswerBlockDeoImpact;

  /** Answer Engine model version (e.g., 'ae_v1') */
  version: string;

  /** ISO timestamp of creation */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;
}

/**
 * Answerability status levels for products/pages.
 */
export type AnswerabilityStatusLevel =
  | 'answer_ready' // All key questions have strong answers
  | 'partially_answer_ready' // Some questions answered, some missing/weak
  | 'needs_answers'; // Most or all key questions need answers

/**
 * Answerability Status - Lightweight summary for UI badges and quick assessment.
 *
 * Provides a quick view of how "answer-ready" a product or page is,
 * supporting UI badges and prioritization in the Issues Engine.
 */
export interface AnswerabilityStatus {
  /** Overall answerability status */
  status: AnswerabilityStatusLevel;

  /** Question categories that do not yet have strong answers */
  missingQuestions: AnswerBlockQuestionId[];

  /** Question categories with low-confidence or incomplete answers */
  weakQuestions: AnswerBlockQuestionId[];

  /** Optional normalized answerability score (0-100), aligned with DEO Score v2 */
  answerabilityScore?: number;
}

/**
 * Human-readable labels for question categories.
 * Useful for UI display and documentation.
 */
export const ANSWER_QUESTION_LABELS: Record<AnswerBlockQuestionId, string> = {
  what_is_it: 'What is this?',
  who_is_it_for: 'Who is it for?',
  why_choose_this: 'Why choose this?',
  key_features: 'What are the key features?',
  how_is_it_used: 'How is it used?',
  problems_it_solves: 'What problems does it solve?',
  what_makes_it_different: 'What makes it different?',
  whats_included: "What's included?",
  materials_and_specs: 'Materials / Specs',
  care_safety_instructions: 'Care / safety / instructions',
};

/**
 * List of all canonical Phase 1 question IDs.
 * Useful for iteration and validation.
 */
export const ANSWER_QUESTION_IDS: AnswerBlockQuestionId[] = [
  'what_is_it',
  'who_is_it_for',
  'why_choose_this',
  'key_features',
  'how_is_it_used',
  'problems_it_solves',
  'what_makes_it_different',
  'whats_included',
  'materials_and_specs',
  'care_safety_instructions',
];
