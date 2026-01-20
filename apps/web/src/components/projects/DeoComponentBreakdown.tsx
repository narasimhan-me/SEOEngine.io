import type { DeoScoreBreakdown } from '@/lib/deo-issues';

interface DeoComponentBreakdownProps {
  score: DeoScoreBreakdown | null;
}

export function DeoComponentBreakdown({ score }: DeoComponentBreakdownProps) {
  const components = [
    {
      key: 'content' as const,
      label: 'Content',
      description:
        'Coverage, depth, and freshness of content across pages and products.',
    },
    {
      key: 'entities' as const,
      label: 'Entities',
      description:
        'Entity hints, structure accuracy, and linkage for key surfaces.',
    },
    {
      key: 'technical' as const,
      label: 'Technical',
      description:
        'Crawl health, indexability, structural quality, and thin content.',
    },
    {
      key: 'visibility' as const,
      label: 'Visibility',
      description:
        'SERP readiness, answer surface presence, and brand navigational strength.',
    },
  ];

  const getColor = (value: number | null | undefined) => {
    if (value == null) return 'bg-gray-100 text-gray-500';
    if (value >= 80) return 'bg-green-50 text-green-700';
    if (value >= 60) return 'bg-yellow-50 text-yellow-700';
    if (value >= 40) return 'bg-orange-50 text-orange-700';
    return 'bg-red-50 text-red-700';
  };

  const getLabel = (value: number | null | undefined) => {
    if (value == null) return 'No data';
    if (value >= 80) return 'Strong';
    if (value >= 60) return 'Good';
    if (value >= 40) return 'Needs work';
    return 'Critical';
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700">DEO Components</h3>
      <p className="mt-1 text-xs text-gray-500">
        Breakdown of the DEO Score across the four pillars.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {components.map((component) => {
          const value = score?.[component.key] ?? null;
          const color = getColor(value);
          const label = getLabel(value);
          return (
            <div
              key={component.key}
              className="rounded-md border border-gray-100 bg-gray-50 p-3"
              title={component.description}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">
                  {component.label}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}
                >
                  {value != null ? `${value}/100` : '--'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">{label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
