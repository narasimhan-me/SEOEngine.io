import { Metadata } from 'next';
import { PlaybooksShell } from '@/components/playbooks';

/**
 * [EA-40: PLAYBOOKS-SHELL-1] Playbooks Page
 *
 * Read-only playbooks browsing page.
 * No execution capabilities - educational only.
 */

export const metadata: Metadata = {
  title: 'Playbooks | EngineO',
  description:
    'Browse fix strategies and improvement approaches for your store',
};

export default function PlaybooksPage() {
  return (
    <div className="container max-w-6xl py-8">
      <PlaybooksShell />
    </div>
  );
}
