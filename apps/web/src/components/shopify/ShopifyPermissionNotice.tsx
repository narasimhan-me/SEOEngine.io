import Link from 'next/link';

export function ShopifyPermissionNotice(props: {
  missingScopes: string[];
  canReconnect: boolean;
  onReconnect: () => void;
  learnMoreHref?: string;
}) {
  const { missingScopes, canReconnect, onReconnect, learnMoreHref } = props;
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
          disabled={!canReconnect}
          className="inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reconnect Shopify
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
    </div>
  );
}
