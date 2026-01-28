import type { DeoIssueSeverity } from '@/lib/deo-issues';
import type { DraftLifecycleState } from '@/lib/issues/draftLifecycleState';
import { getDraftLifecycleCopy } from '@/lib/issues/draftLifecycleState';

interface IssueBadgeProps {
  count: number;
  severity?: DeoIssueSeverity | null;
  /** Optional click handler to make the badge interactive */
  onClick?: () => void;
  /** [DRAFT-LIFECYCLE-VISIBILITY-1] Optional draft state for visibility */
  draftState?: DraftLifecycleState | null;
}

export function IssueBadge({ count, severity, onClick, draftState }: IssueBadgeProps) {
  if (!count || count <= 0) {
    return null;
  }

  // [DRAFT-LIFECYCLE-VISIBILITY-1] Get draft copy if draft state is provided and not NO_DRAFT
  const showDraftIndicator = draftState && draftState !== 'NO_DRAFT';
  const draftCopy = showDraftIndicator ? getDraftLifecycleCopy(draftState) : null;

  let colorClasses = 'bg-gray-100 text-gray-700 border border-gray-200';
  if (severity === 'critical') {
    colorClasses = 'bg-red-50 text-red-700 border border-red-200';
  } else if (severity === 'warning') {
    colorClasses = 'bg-orange-50 text-orange-700 border border-orange-200';
  } else if (severity === 'info') {
    colorClasses = 'bg-blue-50 text-blue-700 border border-blue-200';
  }

  const baseClasses = `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses}`;

  // When onClick is provided, render as a clickable button
  if (onClick) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          className={`${baseClasses} cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}
        >
          <span aria-hidden="true">⚠️</span>
          <span>
            {count} DEO {count === 1 ? 'issue' : 'issues'}
          </span>
        </button>
        {/* [DRAFT-LIFECYCLE-VISIBILITY-1] Draft state indicator */}
        {showDraftIndicator && draftCopy && (
          <span
            className="text-[10px] text-muted-foreground"
            title={draftCopy.description}
          >
            ({draftCopy.shortLabel})
          </span>
        )}
      </span>
    );
  }

  // Non-interactive badge
  return (
    <span className="inline-flex items-center gap-1">
      <span className={baseClasses}>
        <span aria-hidden="true">⚠️</span>
        <span>
          {count} DEO {count === 1 ? 'issue' : 'issues'}
        </span>
      </span>
      {/* [DRAFT-LIFECYCLE-VISIBILITY-1] Draft state indicator */}
      {showDraftIndicator && draftCopy && (
        <span
          className="text-[10px] text-muted-foreground"
          title={draftCopy.description}
        >
          ({draftCopy.shortLabel})
        </span>
      )}
    </span>
  );
}
