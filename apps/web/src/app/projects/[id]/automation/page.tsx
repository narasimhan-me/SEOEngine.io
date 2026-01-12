'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * [NAV-IA-CONSISTENCY-1] Automation landing page - redirects to Playbooks.
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Now redirects to canonical /playbooks route.
 *
 * The sidebar "Playbooks" label lands on /automation which redirects to /playbooks.
 * This maintains route stability while ensuring users always see the playbooks interface.
 */
export default function AutomationPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
    // Redirect to canonical playbooks page
    router.replace(`/projects/${projectId}/playbooks`);
  }, [router, projectId]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-muted-foreground">Redirecting to Playbooks...</div>
    </div>
  );
}
