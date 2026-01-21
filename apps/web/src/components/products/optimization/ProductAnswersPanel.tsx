'use client';

import { useState } from 'react';

/**
 * Answer Block question IDs (matching @engineo/shared)
 */
type AnswerBlockQuestionId =
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
 * Human-readable labels for question categories.
 */
const ANSWER_QUESTION_LABELS: Record<AnswerBlockQuestionId, string> = {
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
 * Answerability status levels
 */
type AnswerabilityStatusLevel =
  | 'answer_ready'
  | 'partially_answer_ready'
  | 'needs_answers';

/**
 * Answerability status from detection
 */
interface AnswerabilityStatus {
  status: AnswerabilityStatusLevel;
  missingQuestions: AnswerBlockQuestionId[];
  weakQuestions: AnswerBlockQuestionId[];
  answerabilityScore?: number;
}

/**
 * Answer Block structure
 */
interface AnswerBlock {
  id: string;
  projectId: string;
  productId?: string;
  questionId: AnswerBlockQuestionId;
  question: string;
  answer: string;
  confidence: number;
  sourceType: string;
  factsUsed: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAnswersResponse {
  projectId: string;
  productId: string;
  generatedAt: string;
  answerabilityStatus: AnswerabilityStatus;
  answers: AnswerBlock[];
}

interface ProductAnswersPanelProps {
  response: ProductAnswersResponse | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}

/**
 * ProductAnswersPanel - Displays AI-generated Answer Blocks for a product.
 *
 * Phase AE-1.2 UI component showing:
 * - Answerability status badge
 * - List of generated answers with expand/collapse
 * - Generate button for requesting new answers
 */
export function ProductAnswersPanel({
  response,
  loading,
  error,
  onGenerate,
}: ProductAnswersPanelProps) {
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(
    new Set()
  );

  const toggleAnswer = (answerId: string) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(answerId)) {
        next.delete(answerId);
      } else {
        next.add(answerId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: AnswerabilityStatus['status']) => {
    switch (status) {
      case 'answer_ready':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Answer Ready
          </span>
        );
      case 'partially_answer_ready':
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            Partially Ready
          </span>
        );
      case 'needs_answers':
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
            Needs Answers
          </span>
        );
      default:
        return null;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
          High confidence
        </span>
      );
    }
    if (confidence >= 0.5) {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
          Medium confidence
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
        Low confidence
      </span>
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            AI Answer Preview (Diagnostics Only)
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center justify-end gap-1">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-700">
              Preview
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-800">
              Not Canonical
            </span>
          </div>
          {response && getStatusBadge(response.answerabilityStatus.status)}
        </div>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Temporary AI-generated drafts used to evaluate answerability and data
        coverage. These previews are not saved, not published, and not synced.
      </p>

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <svg
            className="h-6 w-6 animate-spin text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">Generating answers...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !response && !error && (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <svg
              className="h-6 w-6 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="mb-4 max-w-xs text-center text-sm text-gray-500">
            Generate AI-powered answers to key buyer questions for this product.
          </p>
          <button
            onClick={onGenerate}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            Generate Answers (uses AI)
          </button>
        </div>
      )}

      {/* Answers display */}
      {!loading && response && (
        <div className="space-y-4">
          {/* Answerability score */}
          <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
            <span className="text-xs font-medium text-gray-600">
              Answerability Score
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {response.answerabilityStatus.answerabilityScore ?? 0}/100
            </span>
          </div>

          {/* Missing questions warning */}
          {response.answerabilityStatus.missingQuestions.length > 0 && (
            <div className="rounded-md bg-amber-50 px-3 py-2">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-xs font-medium text-amber-800">
                    {response.answerabilityStatus.missingQuestions.length}{' '}
                    question(s) cannot be answered
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Add more product details to improve answerability.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Answers list */}
          {response.answers.length > 0 ? (
            <div className="space-y-3">
              {response.answers.map((answer) => (
                <div
                  key={answer.id}
                  className="overflow-hidden rounded-md border border-gray-200"
                >
                  <button
                    onClick={() => toggleAnswer(answer.id)}
                    className="flex w-full items-center justify-between bg-gray-50 px-3 py-2 text-left hover:bg-gray-100"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {ANSWER_QUESTION_LABELS[
                        answer.questionId as AnswerBlockQuestionId
                      ] || answer.question}
                    </span>
                    <div className="flex items-center gap-2">
                      {getConfidenceBadge(answer.confidence)}
                      <svg
                        className={`h-4 w-4 text-gray-500 transition-transform ${
                          expandedAnswers.has(answer.id) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>
                  {expandedAnswers.has(answer.id) && (
                    <div className="border-t border-gray-200 bg-white px-3 py-3">
                      <p className="text-sm text-gray-700">{answer.answer}</p>
                      {answer.factsUsed.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-gray-500">
                            Sources:
                          </span>
                          {answer.factsUsed.map((fact, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                            >
                              {fact}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <p className="text-sm text-gray-500">
                No answers could be generated. Add more product details.
              </p>
            </div>
          )}

          {/* Regenerate button */}
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={onGenerate}
              className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Regenerate Answers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
