// [DRAFT-CLARITY-AND-ACTION-TRUST-1] Draft state types
type MetadataDraftState = 'unsaved' | 'saved' | 'applied';

interface ProductSeoEditorProps {
  title: string;
  description: string;
  handle: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onReset: () => void;
  onApplyToShopify: () => void;
  applying: boolean;
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] New props for draft lifecycle
  draftState?: MetadataDraftState;
  canApply?: boolean;
  onSaveDraft?: () => void;
}

export function ProductSeoEditor({
  title,
  description,
  handle,
  onTitleChange,
  onDescriptionChange,
  onReset,
  onApplyToShopify,
  applying,
  draftState = 'applied',
  canApply = true,
  onSaveDraft,
}: ProductSeoEditorProps) {
  const titleLength = title.length;
  const descriptionLength = description.length;

  const getTitleIndicator = () => {
    if (titleLength === 0) return { color: 'text-gray-400', label: 'Empty' };
    if (titleLength < 30) return { color: 'text-yellow-600', label: 'Too short' };
    if (titleLength > 60) return { color: 'text-red-600', label: 'Too long' };
    return { color: 'text-green-600', label: 'Good' };
  };

  const getDescriptionIndicator = () => {
    if (descriptionLength === 0) return { color: 'text-gray-400', label: 'Empty' };
    if (descriptionLength < 70) return { color: 'text-yellow-600', label: 'Too short' };
    if (descriptionLength > 155) return { color: 'text-red-600', label: 'Too long' };
    return { color: 'text-green-600', label: 'Good' };
  };

  const titleIndicator = getTitleIndicator();
  const descriptionIndicator = getDescriptionIndicator();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">SEO Metadata</h3>

      <div className="space-y-4">
        {/* Meta title */}
        <div>
          <label
            htmlFor="seo-title"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Meta Title
          </label>
          <input
            id="seo-title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter SEO title..."
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-gray-500">Ideal: 50-60 chars</span>
            <span className={titleIndicator.color}>
              {titleLength}/60 - {titleIndicator.label}
            </span>
          </div>
        </div>

        {/* Meta description */}
        <div>
          <label
            htmlFor="seo-description"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Meta Description
          </label>
          <textarea
            id="seo-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter SEO description..."
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-gray-500">Ideal: 140-155 chars</span>
            <span className={descriptionIndicator.color}>
              {descriptionLength}/155 - {descriptionIndicator.label}
            </span>
          </div>
        </div>

        {/* Handle (read-only) */}
        <div>
          <label
            htmlFor="handle"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Handle (read-only)
          </label>
          <input
            id="handle"
            type="text"
            value={handle}
            readOnly
            className="w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
          />
        </div>

        {/* Alt text placeholder */}
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
          <p className="text-center text-xs text-gray-500">
            Alt text editing will be added in a later phase.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
        <button
          onClick={onReset}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Reset to Shopify data
        </button>
        <div className="flex items-center gap-2">
          {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Save draft button */}
          {onSaveDraft && draftState === 'unsaved' && (
            <button
              data-testid="save-draft-button"
              onClick={onSaveDraft}
              className="inline-flex items-center rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Save draft
            </button>
          )}
          {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Apply to Shopify button with gating */}
          <button
            data-testid="apply-to-shopify-button"
            onClick={onApplyToShopify}
            disabled={applying || !canApply}
            title={
              !canApply
                ? 'Save your draft first before applying to Shopify'
                : 'Applies saved draft only. Does not auto-save or use AI.'
            }
            className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin text-white"
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
                Applying...
              </>
            ) : (
              <>
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Apply to Shopify
              </>
            )}
          </button>
        </div>
      </div>
      {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Help text for Apply */}
      <p className="mt-2 text-xs text-gray-500">
        Apply sends only the saved draft to Shopify. It does not auto-save or use AI.
      </p>
    </div>
  );
}
