'use client';

import { Icon, type IconManifestKey } from '@/components/icons';
import type { DeoIssueImpactLevel } from '@/lib/issues/prioritizationSignals';
import { getImpactLevelCopy } from '@/lib/issues/prioritizationSignals';

/**
 * [EA-27: PRIORITIZATION-SIGNAL-ENRICHMENT-1] Impact Indicator Component
 *
 * Displays impact level (high/medium/low) with visual styling.
 * Uses collaborative language and non-alarming colors.
 * Tooltip provides additional context on hover.
 */

interface ImpactIndicatorProps {
  /** Impact level to display */
  impactLevel: DeoIssueImpactLevel;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether to show label text or just icon */
  showLabel?: boolean;
}

// Icon mapping for impact levels
const impactIcons: Record<DeoIssueImpactLevel, IconManifestKey> = {
  high: 'status.warning',
  medium: 'workflow.history',
  low: 'status.info',
};

// Style mapping using design tokens
const impactStyles: Record<DeoIssueImpactLevel, string> = {
  high: 'border-[hsl(var(--warning-background))]/50 bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]',
  medium: 'border-border bg-muted text-muted-foreground',
  low: 'border-[hsl(var(--info-background))]/50 bg-[hsl(var(--info-background))] text-[hsl(var(--info-foreground))]',
};

export function ImpactIndicator({
  impactLevel,
  size = 'sm',
  showLabel = true,
}: ImpactIndicatorProps) {
  const copy = getImpactLevelCopy(impactLevel);
  const iconKey = impactIcons[impactLevel];
  const styles = impactStyles[impactLevel];

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      data-testid="impact-indicator"
      data-impact-level={impactLevel}
      className={`inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap ${styles} ${sizeClasses}`}
      title={copy.description}
      aria-label={`${copy.label}: ${copy.description}`}
    >
      <Icon name={iconKey} size={iconSize} aria-hidden="true" />
      {showLabel && <span>{copy.label}</span>}
    </span>
  );
}
