export default function ShopifyPermissionsHelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Shopify permissions</h1>
      <p className="text-sm text-gray-700">
        Shopify does not automatically upgrade app permissions. If EngineO.ai
        adds new read-only features (like syncing Pages), you may be asked to
        reconnect Shopify to grant the additional read scope.
      </p>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">
          What EngineO.ai requests
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>
            Only the minimum scopes required for the feature you&apos;re using
          </li>
          <li>
            No silent permission escalation (you must click &quot;Reconnect
            Shopify&quot;)
          </li>
          <li>Read-only scopes for read-only sync features</li>
        </ul>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">
          What EngineO.ai will not do
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>Automatically redirect you into OAuth on page load</li>
          <li>
            Modify your Shopify content without explicit approval and an apply
            action
          </li>
        </ul>
      </div>
    </div>
  );
}
