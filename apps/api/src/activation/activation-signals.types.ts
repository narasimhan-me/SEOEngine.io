/**
 * [EA-37] Activation & Success Signals Type Definitions
 *
 * Defines activation milestones and success indicators that reflect
 * real user progress. These signals are internal-only (not user-facing)
 * and align to actual user value, not activity volume.
 *
 * Trust Contract:
 * - Metrics reflect user outcomes, not activity volume
 * - Signals do not pressure or shame users
 * - No user-facing scores or gamification elements
 */

/**
 * Activation milestone identifiers.
 * Each milestone represents meaningful user progress, not just activity.
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
 * Milestone status for tracking progress.
 */
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Individual milestone state with timing information.
 */
export interface MilestoneState {
  milestoneId: ActivationMilestoneId;
  status: MilestoneStatus;
  /** When this milestone was first reached (null if not completed) */
  completedAt: Date | null;
  /** Days since signup when milestone was reached (null if not completed) */
  daysToComplete: number | null;
}

/**
 * User activation status summary.
 * Computed from existing data - no separate storage needed.
 */
export interface UserActivationStatus {
  userId: string;
  /** When the user signed up */
  signupAt: Date;
  /** Days since signup */
  daysSinceSignup: number;
  /** All milestone states */
  milestones: MilestoneState[];
  /** Count of completed milestones */
  completedMilestoneCount: number;
  /** Total milestones tracked */
  totalMilestoneCount: number;
  /** Whether user has completed core activation (store connected + first optimization) */
  isActivated: boolean;
  /** Activation tier for internal segmentation */
  activationTier: ActivationTier;
  /** Timestamp when this status was computed */
  computedAt: Date;
}

/**
 * Activation tier for internal user segmentation.
 * Not exposed to users - used for internal analytics and intervention targeting.
 */
export type ActivationTier =
  | 'new'           // Just signed up, no milestones
  | 'exploring'     // Has project, exploring features
  | 'connected'     // Store connected, data flowing
  | 'activated'     // First optimization applied
  | 'successful';   // Multiple optimizations, ongoing usage

/**
 * Success indicator types.
 * Measure outcomes aligned to user value, not engagement proxies.
 */
export type SuccessIndicatorId =
  | 'products_optimized'
  | 'pages_optimized'
  | 'issues_resolved'
  | 'deo_score_improved'
  | 'drafts_applied';

/**
 * Success indicator measurement.
 */
export interface SuccessIndicator {
  indicatorId: SuccessIndicatorId;
  /** Human-readable label for internal dashboards */
  label: string;
  /** Current value */
  value: number;
  /** Previous value for delta calculation (optional) */
  previousValue?: number;
  /** Period this indicator covers */
  periodLabel: string;
}

/**
 * Project-level success metrics.
 * Computed from existing data for internal insight.
 */
export interface ProjectSuccessMetrics {
  projectId: string;
  projectName: string;
  /** Success indicators for this project */
  indicators: SuccessIndicator[];
  /** Overall health based on indicators */
  healthStatus: 'healthy' | 'stalled' | 'at_risk';
  /** When these metrics were computed */
  computedAt: Date;
}

/**
 * Activation funnel stage for internal analytics.
 */
export interface ActivationFunnelStage {
  milestoneId: ActivationMilestoneId;
  label: string;
  /** Users who reached this stage */
  userCount: number;
  /** Percentage of total users */
  percentage: number;
  /** Median days to reach from previous stage */
  medianDaysFromPrevious: number | null;
}

/**
 * Activation funnel summary for admin dashboard.
 */
export interface ActivationFunnelSummary {
  /** Total users in the funnel analysis */
  totalUsers: number;
  /** Funnel stages from first to last */
  stages: ActivationFunnelStage[];
  /** Biggest drop-off point (stage with largest % decrease) */
  biggestDropoff: ActivationMilestoneId | null;
  /** Period this funnel covers */
  periodStart: Date;
  periodEnd: Date;
  /** When this funnel was computed */
  computedAt: Date;
}

/**
 * Internal stall detection for proactive intervention.
 * Identifies users who may need help without pressuring them.
 */
export interface StallSignal {
  userId: string;
  userEmail: string;
  /** Where the user appears to be stuck */
  stalledAtMilestone: ActivationMilestoneId;
  /** Days since last activity */
  daysSinceLastActivity: number;
  /** Last meaningful action taken */
  lastAction: string;
  lastActionAt: Date;
  /** Suggested internal action (not shown to user) */
  suggestedIntervention: 'none' | 'soft_nudge' | 'support_outreach';
}
