import Link from 'next/link';

export function ShopifyPermissionNotice(props: {
  missingScopes: string[];
  canReconnect: boolean;
  onReconnect: () => void;
  learnMoreHref?: string;
  errorMessage?: string | null;
  onSignInAgain?: () => void;
  isReconnecting?: boolean;
}) {
  const { missingScopes, canReconnect, onReconnect, learnMoreHref, errorMessage, onSignInAgain, isReconnecting } =
    props;
  const missingLabel = missingScopes.length ? missingScopes.join(', ') : null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-900">Additional Shopify permission required</h2>
      <div className="mt-2 space-y-2 text-sm text-amber-900">
        <p>
          To sync and analyze Pages and Collections, EngineO.ai needs read-only access to your store content.
        </p>
        <p>This permission is required to:</p>
        <ul className="list-disc pl-5">
          <li>Sync Pages</li>
          <li>Sync Collections</li>
          <li>Detect SEO and AEO issues on content pages</li>
        </ul>
        <p>We never modify content without your approval.</p>
        {missingLabel && (
          <p>
            Missing permission: <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">{missingLabel}</code>
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onReconnect}
          disabled={!canReconnect || isReconnecting}
          className="inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isReconnecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            'Reconnect Shopify'
          )}
        </button>
        {learnMoreHref && (
          <Link href={learnMoreHref} className="text-sm font-medium text-amber-800 underline">
            Learn more
          </Link>
        )}
        {!canReconnect && (
          <span className="text-xs text-amber-800">Ask a project owner to reconnect Shopify.</span>
        )}
      </div>
      {errorMessage && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{errorMessage}</p>
          {onSignInAgain && (
            <button
              type="button"
              onClick={onSignInAgain}
              className="mt-2 inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Sign in again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
