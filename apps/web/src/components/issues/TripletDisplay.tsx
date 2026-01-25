import type { CanonicalCountTriplet } from '@/lib/deo-issues';

interface TripletDisplayProps {
  triplet: CanonicalCountTriplet;
  layout?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  emphasis?: 'none' | 'actionable';
}

/**
 * COUNT-INTEGRITY-1.1: Reusable component for displaying canonical triplet counts
 * with explicit labels ("Issue types", "Items affected", "Actionable now").
 *
 * Replaces ambiguous v1 count displays that showed naked numbers without context.
 */
export function TripletDisplay({
  triplet,
  layout = 'vertical',
  size = 'md',
  emphasis = 'none',
}: TripletDisplayProps) {
  // Size classes for responsive design
  const sizeClasses = {
    sm: {
      count: 'text-base font-semibold',
      label: 'text-[10px] text-muted-foreground',
      gap: layout === 'vertical' ? 'gap-1' : 'gap-2',
    },
    md: {
      count: 'text-xl font-semibold',
      label: 'text-xs text-muted-foreground',
      gap: layout === 'vertical' ? 'gap-2' : 'gap-4',
    },
    lg: {
      count: 'text-2xl font-semibold',
      label: 'text-sm text-muted-foreground',
      gap: layout === 'vertical' ? 'gap-3' : 'gap-6',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row items-center'} ${classes.gap}`}
      data-testid="triplet-display"
    >
      <div
        className={`flex flex-col items-center ${emphasis === 'actionable' ? 'rounded-md bg-primary/10 px-4 py-2' : ''}`}
        data-testid="triplet-actionable-now"
      >
        <div
          className={`${classes.count} ${emphasis === 'actionable' ? 'text-primary' : ''}`}
          data-testid="triplet-actionable-now-value"
        >
          {triplet.actionableNowCount}
        </div>
        <div className={`${classes.label} ${emphasis === 'actionable' ? 'text-primary' : ''}`}>Actionable now</div>
      </div>
      <div
        className="flex flex-col items-center"
        data-testid="triplet-issue-types"
      >
        <div className={classes.count} data-testid="triplet-issue-types-value">
          {triplet.issueTypesCount}
        </div>
        <div className={classes.label}>Issue types</div>
      </div>
      <div
        className="flex flex-col items-center"
        data-testid="triplet-items-affected"
      >
        <div
          className={classes.count}
          data-testid="triplet-items-affected-value"
        >
          {triplet.affectedItemsCount}
        </div>
        <div className={classes.label}>Items affected</div>
      </div>
    </div>
  );
}
