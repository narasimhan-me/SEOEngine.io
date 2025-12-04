import type { DeoIssueSeverity } from '@engineo/shared';

interface IssueBadgeProps {
  count: number;
  severity?: DeoIssueSeverity | null;
}

export function IssueBadge({ count, severity }: IssueBadgeProps) {
  if (!count || count <= 0) {
    return null;
  }

  let colorClasses = 'bg-gray-100 text-gray-700 border border-gray-200';
  if (severity === 'critical') {
    colorClasses = 'bg-red-50 text-red-700 border border-red-200';
  } else if (severity === 'warning') {
    colorClasses = 'bg-orange-50 text-orange-700 border border-orange-200';
  } else if (severity === 'info') {
    colorClasses = 'bg-blue-50 text-blue-700 border border-blue-200';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses}`}
    >
      <span aria-hidden="true">⚠️</span>
      <span>
        {count} {count === 1 ? 'issue' : 'issues'}
      </span>
    </span>
  );
}
