/**
 * PERFORMANCE-1 – Discovery-critical performance signal types and scorecard.
 * v1 focuses on signals that clearly affect crawlability, rendering, and
 * user-perceived speed. This is not a full page-speed or Core Web Vitals audit.
 */

/**
 * Performance signal taxonomy for the Technical & Indexability pillar.
 * These map to the PERFORMANCE-1 issue types:
 * - render_blocking_resources
 * - indexability_conflict
 * - slow_initial_response
 * - excessive_page_weight
 * - mobile_rendering_risk
 */
export type PerformanceSignalType =
  | 'render_blocking'
  | 'indexability_risk'
  | 'ttfb_proxy'
  | 'page_weight_risk'
  | 'mobile_readiness';

/**
 * Coarse status for the "Performance for Discovery" score.
 * This is intentionally qualitative and conservative.
 */
export type PerformanceForDiscoveryStatus =
  | 'Strong'
  | 'Needs improvement'
  | 'Risky';

/**
 * Per-signal status used by the Performance for Discovery scorecard.
 */
export interface PerformanceSignalStatus {
  signalType: PerformanceSignalType;
  status: 'ok' | 'needs_attention' | 'risky';
  issueCount: number;
}

/**
 * Project-level Performance for Discovery scorecard.
 * Implementations compute this heuristically from DEO issues and crawl results.
 */
export interface PerformanceForDiscoveryScorecard {
  projectId: string;
  status: PerformanceForDiscoveryStatus;
  issuesAffectingDiscovery: number;
  signals: PerformanceSignalStatus[];
}
