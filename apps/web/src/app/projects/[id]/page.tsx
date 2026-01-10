import { redirect } from 'next/navigation';

/**
 * [STORE-HEALTH-1.0] Project landing redirects to Store Health page.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/store-health`);
}
