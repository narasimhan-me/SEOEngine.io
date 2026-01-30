/**
 * [EA-37] Activation Signals Frontend Types
 *
 * Type definitions for activation and success signals used in admin dashboards.
 * These signals are internal-only and reflect real user progress, not vanity metrics.
 *
 * Trust Contract:
 * - Metrics reflect user outcomes, not activity volume
 * - Signals do not pressure or shame users
 * - No user-facing scores or gamification
 */

/**
 * Activation milestone identifiers.
 */
export type ActivationMilestoneId =
  | 'project_created'
  | 'store_connected'
  | 'first_crawl_completed'
  | 'first_deo_score_computed'
  | 'first_issue_identified'
  | 'first_draft_generated'
  | 'first_draft_applied'
  | 'first_optimization_live';

/**
 * Activation tier for internal segmentation.
 */
export type ActivationTier =
  | 'new'
  | 'exploring'
  | 'connected'
  | 'activated'
  | 'successful';

/**
 * Activation funnel stage from admin overview.
 */
export interface ActivationFunnelData {
  signedUp: number;
  createdProject: number;
  connectedStore: number;
  appliedOptimization: number;
}

/**
 * Activation metrics from admin overview.
 */
export interface ActivationMetrics {
  activatedUsers: number;
  activationRate: number;
  usersWithProjects: number;
  usersWithConnectedStores: number;
  usersActivelyOptimizing: number;
  funnel: ActivationFunnelData;
}

/**
 * Milestone label mapping for admin UI display.
 */
export const ACTIVATION_MILESTONE_LABELS: Record<ActivationMilestoneId, string> = {
  project_created: 'Created project',
  store_connected: 'Connected store',
  first_crawl_completed: 'First crawl completed',
  first_deo_score_computed: 'Discovery score computed',
  first_issue_identified: 'Issues identified',
  first_draft_generated: 'First draft generated',
  first_draft_applied: 'First optimization applied',
  first_optimization_live: 'Optimization live on store',
};

/**
 * Activation tier labels for admin UI display.
 */
export const ACTIVATION_TIER_LABELS: Record<ActivationTier, string> = {
  new: 'New',
  exploring: 'Exploring',
  connected: 'Connected',
  activated: 'Activated',
  successful: 'Successful',
};

/**
 * Get the tier description for admin context.
 * These descriptions are for internal insight, not user-facing.
 */
export function getActivationTierDescription(tier: ActivationTier): string {
  const descriptions: Record<ActivationTier, string> = {
    new: 'Just signed up, no milestones completed',
    exploring: 'Has created a project, exploring features',
    connected: 'Store connected, data is flowing',
    activated: 'Applied at least one optimization',
    successful: 'Multiple optimizations, ongoing engagement',
  };
  return descriptions[tier];
}

/**
 * Calculate funnel drop-off percentages.
 * Returns the percentage drop between each stage.
 */
export function calculateFunnelDropoffs(funnel: ActivationFunnelData): {
  projectDropoff: number;
  storeDropoff: number;
  optimizationDropoff: number;
} {
  const total = funnel.signedUp || 1;
  const projectDropoff = Math.round(
    ((funnel.signedUp - funnel.createdProject) / total) * 100
  );
  const storeDropoff = Math.round(
    ((funnel.createdProject - funnel.connectedStore) / funnel.createdProject || 1) * 100
  );
  const optimizationDropoff = Math.round(
    ((funnel.connectedStore - funnel.appliedOptimization) / funnel.connectedStore || 1) * 100
  );

  return {
    projectDropoff,
    storeDropoff,
    optimizationDropoff,
  };
}

/**
 * Determine the biggest drop-off point in the funnel.
 */
export function getBiggestDropoff(funnel: ActivationFunnelData): {
  stage: string;
  dropoffPercent: number;
} | null {
  if (funnel.signedUp === 0) return null;

  const dropoffs = [
    {
      stage: 'Signup → Project',
      dropoffPercent: Math.round(
        ((funnel.signedUp - funnel.createdProject) / funnel.signedUp) * 100
      ),
    },
    {
      stage: 'Project → Store',
      dropoffPercent: funnel.createdProject > 0
        ? Math.round(
            ((funnel.createdProject - funnel.connectedStore) / funnel.createdProject) * 100
          )
        : 0,
    },
    {
      stage: 'Store → Optimization',
      dropoffPercent: funnel.connectedStore > 0
        ? Math.round(
            ((funnel.connectedStore - funnel.appliedOptimization) / funnel.connectedStore) * 100
          )
        : 0,
    },
  ];

  return dropoffs.reduce((max, current) =>
    current.dropoffPercent > max.dropoffPercent ? current : max
  );
}
