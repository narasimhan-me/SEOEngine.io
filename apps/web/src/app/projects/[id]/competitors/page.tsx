export default async function CompetitorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Competitors</h1>
      <p className="text-gray-600 mb-4">
        This page will help you analyze competitor websites and compare SEO performance.
      </p>
      <p className="text-sm text-gray-400">Project ID: {id}</p>
    </div>
  );
}
