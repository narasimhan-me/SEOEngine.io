export default async function LocalSeoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Local SEO</h1>
      <p className="text-gray-600 mb-4">
        This page will help you optimize for local search and manage business listings.
      </p>
      <p className="text-sm text-gray-400">Project ID: {id}</p>
    </div>
  );
}
