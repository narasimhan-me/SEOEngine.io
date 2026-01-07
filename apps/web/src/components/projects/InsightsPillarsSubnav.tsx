'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';

/**
 * [NAV-IA-CONSISTENCY-1] Pillar sub-navigation for Insights section.
 *
 * [TRUST-ROUTING-1] Changed from horizontal tab strip to dropdown selector
 * to ensure Insights has only one primary navigation strip (InsightsSubnav).
 *
 * Pillar options:
 * - DEO
 * - Search & Intent
 * - Competitors
 * - Off-site Signals
 * - Local Discovery
 * - Technical
 */

interface PillarOption {
  label: string;
  path: string;
}

const pillarOptions: PillarOption[] = [
  { label: 'DEO', path: 'deo' },
  { label: 'Search & Intent', path: 'keywords' },
  { label: 'Competitors', path: 'competitors' },
  { label: 'Off-site Signals', path: 'backlinks' },
  { label: 'Local Discovery', path: 'local' },
  { label: 'Technical', path: 'performance' },
];

export default function InsightsPillarsSubnav() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params.id as string;

  const getCurrentPillar = (): string => {
    for (const option of pillarOptions) {
      const fullPath = `/projects/${projectId}/${option.path}`;
      if (pathname === fullPath || pathname.startsWith(`${fullPath}/`)) {
        return option.path;
      }
    }
    return '';
  };

  const currentPillar = getCurrentPillar();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _currentLabel = pillarOptions.find((o) => o.path === currentPillar)?.label || 'Select pillar';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPath = e.target.value;
    if (selectedPath) {
      router.push(`/projects/${projectId}/${selectedPath}`);
    }
  };

  return (
    <div className="mb-6" data-testid="insights-pillar-filter">
      <label htmlFor="pillar-select" className="block text-xs font-medium text-gray-500 mb-1">
        Pillar
      </label>
      <select
        id="pillar-select"
        value={currentPillar}
        onChange={handleChange}
        className="block w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="" disabled>
          Select pillar...
        </option>
        {pillarOptions.map((option) => (
          <option key={option.path} value={option.path}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
