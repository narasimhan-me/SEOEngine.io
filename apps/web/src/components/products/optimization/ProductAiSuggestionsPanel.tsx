export interface ProductMetadataSuggestion {
  productId: string;
  current: {
    title: string | null;
    description: string | null;
  };
  suggested: {
    title: string;
    description: string;
  };
}

export interface AutomationSuggestion {
  id: string;
  targetType: 'product' | 'page';
  targetId: string;
  issueType: 'missing_metadata' | 'thin_content';
  suggestedTitle: string | null;
  suggestedDescription: string | null;
  generatedAt: string;
  source: string;
  applied: boolean;
  appliedAt?: string | null;
}

interface ProductAiSuggestionsPanelProps {
  suggestion: ProductMetadataSuggestion | null;
  automationSuggestion?: AutomationSuggestion | null;
  loading: boolean;
  onGenerate: () => void;
  onApply: (values: { title?: string; description?: string }) => void;
}

export function ProductAiSuggestionsPanel({
  suggestion,
  automationSuggestion,
  loading,
  onGenerate,
  onApply,
}: ProductAiSuggestionsPanelProps) {
  // Check if AI returned empty/unavailable suggestions
  const isEmptySuggestion =
    suggestion &&
    !suggestion.suggested.title.trim() &&
    !suggestion.suggested.description.trim();

  // Check if we have a valid automation suggestion
  const hasAutomationSuggestion =
    automationSuggestion &&
    (automationSuggestion.suggestedTitle || automationSuggestion.suggestedDescription);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <svg
          className="h-4 w-4 text-purple-600"
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
        <h3 className="text-sm font-semibold text-gray-900">AI SEO Suggestions</h3>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <svg
            className="h-6 w-6 animate-spin text-purple-600"
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
          <p className="mt-2 text-sm text-gray-500">Generating suggestions...</p>
        </div>
      )}

      {/* Automation suggestion available (show first if present) */}
      {!loading && !suggestion && hasAutomationSuggestion && (
        <div className="space-y-4">
          {/* Badge indicating this is an automated suggestion */}
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-green-50 px-3 py-2">
            <svg
              className="h-4 w-4 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <span className="text-xs font-medium text-green-700">
              Auto-generated suggestion ({automationSuggestion!.issueType === 'missing_metadata' ? 'Missing Metadata' : 'Thin Content'})
            </span>
            {automationSuggestion!.applied && automationSuggestion!.appliedAt && (
              <span className="ml-auto inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Applied by Automation Engine
              </span>
            )}
          </div>

          {/* Suggested title */}
          {automationSuggestion!.suggestedTitle && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-green-700">
                  Suggested Title
                </span>
                <span
                  className={`text-xs ${automationSuggestion!.suggestedTitle.length > 60 ? 'text-red-500' : 'text-gray-500'}`}
                >
                  {automationSuggestion!.suggestedTitle.length}/60
                </span>
              </div>
              <div className="rounded border border-green-200 bg-green-50 px-3 py-2">
                <p className="text-sm text-gray-900">{automationSuggestion!.suggestedTitle}</p>
              </div>
              <button
                onClick={() => onApply({ title: automationSuggestion!.suggestedTitle! })}
                className="mt-2 text-xs font-medium text-green-600 hover:text-green-800"
              >
                Apply to editor
              </button>
            </div>
          )}

          {/* Suggested description */}
          {automationSuggestion!.suggestedDescription && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-green-700">
                  Suggested Description
                </span>
                <span
                  className={`text-xs ${automationSuggestion!.suggestedDescription.length > 155 ? 'text-red-500' : 'text-gray-500'}`}
                >
                  {automationSuggestion!.suggestedDescription.length}/155
                </span>
              </div>
              <div className="rounded border border-green-200 bg-green-50 px-3 py-2">
                <p className="text-sm text-gray-900">{automationSuggestion!.suggestedDescription}</p>
              </div>
              <button
                onClick={() => onApply({ description: automationSuggestion!.suggestedDescription! })}
                className="mt-2 text-xs font-medium text-green-600 hover:text-green-800"
              >
                Apply to editor
              </button>
            </div>
          )}

          {/* Generate new button */}
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={onGenerate}
              className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
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
              Generate New Suggestions
            </button>
          </div>
        </div>
      )}

      {/* No suggestion state (no automation suggestion either) */}
      {!loading && !suggestion && !hasAutomationSuggestion && (
        <div className="flex flex-col items-center justify-center py-6">
          <p className="mb-4 text-center text-sm text-gray-500">
            Generate AI-powered SEO suggestions for this product&apos;s title and description.
          </p>
          <button
            onClick={onGenerate}
            className="inline-flex items-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
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
            Generate Suggestions
          </button>
        </div>
      )}

      {/* AI unavailable state */}
      {!loading && isEmptySuggestion && (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-6 w-6 text-amber-600"
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
          </div>
          <h4 className="mb-2 text-sm font-medium text-gray-900">AI suggestions unavailable</h4>
          <p className="mb-4 max-w-xs text-center text-sm text-gray-500">
            The AI service is currently unavailable. You can still edit the SEO fields manually below, or try again later.
          </p>
          <button
            onClick={onGenerate}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
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
            Try Again
          </button>
        </div>
      )}

      {/* Suggestion display */}
      {!loading && suggestion && !isEmptySuggestion && (
        <div className="space-y-4">
          {/* Suggested title */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-purple-700">
                Suggested Title
              </span>
              <span
                className={`text-xs ${suggestion.suggested.title.length > 60 ? 'text-red-500' : 'text-gray-500'}`}
              >
                {suggestion.suggested.title.length}/60
              </span>
            </div>
            <div className="rounded border border-purple-200 bg-purple-50 px-3 py-2">
              <p className="text-sm text-gray-900">{suggestion.suggested.title}</p>
            </div>
            <button
              onClick={() => onApply({ title: suggestion.suggested.title })}
              className="mt-2 text-xs font-medium text-purple-600 hover:text-purple-800"
            >
              Apply to editor
            </button>
          </div>

          {/* Suggested description */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-purple-700">
                Suggested Description
              </span>
              <span
                className={`text-xs ${suggestion.suggested.description.length > 155 ? 'text-red-500' : 'text-gray-500'}`}
              >
                {suggestion.suggested.description.length}/155
              </span>
            </div>
            <div className="rounded border border-purple-200 bg-purple-50 px-3 py-2">
              <p className="text-sm text-gray-900">{suggestion.suggested.description}</p>
            </div>
            <button
              onClick={() => onApply({ description: suggestion.suggested.description })}
              className="mt-2 text-xs font-medium text-purple-600 hover:text-purple-800"
            >
              Apply to editor
            </button>
          </div>

          {/* Regenerate button */}
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={onGenerate}
              className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
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
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
