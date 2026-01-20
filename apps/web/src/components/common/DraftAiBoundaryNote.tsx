/**
 * [DRAFT-AI-ENTRYPOINT-CLARITY-1] AI Boundary Note Component
 *
 * Provides explicit labeling at AI boundaries in the draft workflow:
 * - Review mode: Clarifies that review/edit is human-only
 * - Generate mode: Discloses AI usage for draft generation only
 *
 * LOCKED COPY (do not modify without phase approval):
 * - Review: "Review & edit (no AI on this step)"
 * - Generate: "AI used for drafts only" + "AI is not used at Apply"
 */

'use client';

interface DraftAiBoundaryNoteProps {
  mode: 'review' | 'generate';
}

/**
 * Small, calm note displaying AI boundary information.
 * No warning styling - informational only.
 */
export function DraftAiBoundaryNote({ mode }: DraftAiBoundaryNoteProps) {
  if (mode === 'review') {
    return (
      <div
        data-testid="draft-ai-boundary-note"
        data-mode="review"
        className="mb-3 flex items-center gap-2 text-xs text-gray-500"
      >
        <svg
          className="h-4 w-4 flex-shrink-0 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span>
          <strong>Review &amp; edit (no AI on this step)</strong>
          <span className="hidden sm:inline">
            {' '}
            — AI may have been used earlier to generate drafts. Editing and
            approval are manual.
          </span>
        </span>
      </div>
    );
  }

  // mode === 'generate'
  return (
    <div
      data-testid="draft-ai-boundary-note"
      data-mode="generate"
      className="mt-2 flex items-center gap-2 text-xs text-gray-500"
    >
      <svg
        className="h-4 w-4 flex-shrink-0 text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      <span>
        <strong>AI used for drafts only</strong> · AI is not used at Apply
      </span>
    </div>
  );
}

export default DraftAiBoundaryNote;
