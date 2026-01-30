/**
 * Automation Engine Types (Phase AE-1 – Framework)
 *
 * Conceptual framework types for the Automation Engine platform layer.
 * These types define the automation classification, rule model, execution context,
 * and settings without wiring into existing services yet.
 *
 * The Automation Engine is the "DEO autopilot" that:
 * 1. Detects when something needs improvement
 * 2. Decides whether an automation should run (based on entitlements, limits, and safety)
 * 3. Executes improvements or schedules them
 * 4. Logs all actions with clear audit trails
 */

// =============================================================================
// Automation Classification Enums
// =============================================================================

/**
 * High-level automation classification by timing and trigger behavior.
 */
export type AutomationKind =
  | 'immediate' // Reactive, event-triggered automations
  | 'scheduled' // Cadence-based, proactive automations
  | 'background'; // Low-noise, continuous background automations

/**
 * Target surfaces that automations can operate on.
 */
export type AutomationTargetSurface =
  | 'product'
  | 'page'
  | 'answer_block'
  | 'entity'
  | 'project'
  | 'deo_score';

/**
 * Execution status for automation runs.
 */
export type AutomationExecutionStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped';

// =============================================================================
// Automation Rule IDs
// =============================================================================

/**
 * Initial conceptual rule set mapping to UEP intent and existing behavior.
 * These rule IDs represent the canonical automation rules for the platform.
 */
export type AutomationRuleId =
  | 'AUTO_GENERATE_METADATA_ON_NEW_PRODUCT'
  | 'AUTO_GENERATE_METADATA_FOR_MISSING_METADATA'
  | 'AUTO_GENERATE_METADATA_FOR_THIN_CONTENT'
  | 'AUTO_REFRESH_DEO_SCORE_AFTER_CRAWL'
  | 'AUTO_REFRESH_ANSWER_BLOCKS'
  | 'AUTO_RECRAWL_HIGH_IMPACT_PAGES'
  | 'AUTO_FILL_MISSING_ALT_TEXT'
  | 'AUTO_REFRESH_STRUCTURED_DATA'
  | 'AUTO_DETECT_LOW_VISIBILITY_SIGNALS';

/**
 * Human-readable names for automation rules.
 */
export const AUTOMATION_RULE_NAMES: Record<AutomationRuleId, string> = {
  AUTO_GENERATE_METADATA_ON_NEW_PRODUCT:
    'Auto-generate metadata for new products',
  AUTO_GENERATE_METADATA_FOR_MISSING_METADATA: 'Auto-generate missing metadata',
  AUTO_GENERATE_METADATA_FOR_THIN_CONTENT:
    'Auto-generate metadata for thin content',
  AUTO_REFRESH_DEO_SCORE_AFTER_CRAWL: 'Refresh DEO Score after crawl',
  AUTO_REFRESH_ANSWER_BLOCKS: 'Refresh Answer Blocks',
  AUTO_RECRAWL_HIGH_IMPACT_PAGES: 'Re-crawl high-impact pages',
  AUTO_FILL_MISSING_ALT_TEXT: 'Auto-fill missing alt text',
  AUTO_REFRESH_STRUCTURED_DATA: 'Refresh structured data',
  AUTO_DETECT_LOW_VISIBILITY_SIGNALS: 'Detect low visibility signals',
};

// =============================================================================
// Automation Rule Configuration
// =============================================================================

/**
 * Frequency options for scheduled automations.
 */
export type AutomationFrequency = 'daily' | 'weekly' | 'monthly';

/**
 * Generic, per-rule configuration for automations.
 */
export interface AutomationRuleConfig {
  /** Whether this automation rule is enabled */
  enabled: boolean;

  /** The kind of automation (immediate, scheduled, background) */
  kind: AutomationKind;

  /** Target surfaces this rule operates on */
  targets: AutomationTargetSurface[];

  /** Frequency for scheduled automations (when kind === 'scheduled') */
  frequency?: AutomationFrequency;

  /** Whether the automation should queue suggestions vs auto-apply */
  requiresApproval?: boolean;

  /** Optional per-project/per-rule guardrail for daily executions */
  maxExecutionsPerDay?: number;
}

// =============================================================================
// Automation Rule (DTO-level, not tied to Prisma)
// =============================================================================

/**
 * DTO-level AutomationRule interface for API/worker usage.
 * This is not tied to Prisma yet; schema changes are deferred to later phases.
 */
export interface AutomationRule {
  /** The automation rule identifier */
  id: AutomationRuleId;

  /** The project this rule belongs to */
  projectId: string;

  /** Human-readable name for the rule */
  name: string;

  /** Description of what this rule does */
  description: string;

  /** Configuration for this rule */
  config: AutomationRuleConfig;

  /** ISO timestamp when the rule was created */
  createdAt: string;

  /** ISO timestamp when the rule was last updated */
  updatedAt: string;
}

// =============================================================================
// Automation Run Context
// =============================================================================

/**
 * Trigger metadata describing what initiated an automation run.
 */
export interface AutomationTrigger {
  /** Type of trigger (e.g., 'crawl_completed', 'product_synced', 'manual') */
  type: string;

  /** Source of the trigger (e.g., 'deo_score_queue', 'shopify_webhook') */
  source?: string;

  /** ISO timestamp when the trigger occurred */
  occurredAt: string;
}

/**
 * Context for a single automation execution.
 */
export interface AutomationRunContext {
  /** The project this execution belongs to */
  projectId: string;

  /** The rule being executed */
  ruleId: AutomationRuleId;

  /** The target surface being operated on */
  targetSurface: AutomationTargetSurface;

  /** Optional target ID (e.g., productId, crawlResultId, answerBlockId) */
  targetId?: string;

  /** Trigger metadata describing what initiated this run */
  trigger: AutomationTrigger;
}

// =============================================================================
// Automation Run (Execution Log)
// =============================================================================

/**
 * Represents an execution log for an automation run.
 * Conceptual structure; no DB binding yet (deferred to later phases).
 */
export interface AutomationRun {
  /** Unique identifier for this run */
  id: string;

  /** The project this run belongs to */
  projectId: string;

  /** The rule that was executed */
  ruleId: AutomationRuleId;

  /** Execution context including trigger and target info */
  context: AutomationRunContext;

  /** Current status of the execution */
  status: AutomationExecutionStatus;

  /** Short, human-readable description of what happened */
  resultSummary?: string;

  /** Reason for skipping (when status === 'skipped') */
  reasonSkipped?: string;

  /** Optional serialized pre-state for audit/rollback */
  beforeSnapshot?: Record<string, unknown>;

  /** Optional serialized post-state for audit/comparison */
  afterSnapshot?: Record<string, unknown>;

  /** ISO timestamp when the run started */
  startedAt: string;

  /** ISO timestamp when the run finished (if completed) */
  finishedAt?: string;
}

// =============================================================================
// Automation Settings (Per-Project)
// =============================================================================

/**
 * Automation mode controlling how automations are applied.
 */
export type AutomationMode = 'auto_apply' | 'review_before_apply';

/**
 * Category toggles for different automation types.
 */
export interface AutomationCategories {
  /** Metadata-related automations (titles, descriptions) */
  metadata: boolean;

  /** Answer Block automations */
  answers: boolean;

  /** Entity-related automations */
  entities: boolean;

  /** DEO Score automations */
  deoScore: boolean;

  /** Crawl-related automations */
  crawl: boolean;
}

/**
 * Per-project automation settings DTO.
 */
export interface AutomationSettings {
  /** The project these settings belong to */
  projectId: string;

  /** Whether automations are enabled for this project */
  enabled: boolean;

  /** Mode controlling auto-apply vs review behavior */
  mode: AutomationMode;

  /** Category-level toggles for different automation types */
  categories: AutomationCategories;

  /** Maximum automation executions per day for this project */
  maxExecutionsPerDay: number;
}

// =============================================================================
// Default Settings
// =============================================================================

/**
 * Default automation categories (all enabled).
 */
export const DEFAULT_AUTOMATION_CATEGORIES: AutomationCategories = {
  metadata: true,
  answers: true,
  entities: true,
  deoScore: true,
  crawl: true,
};

/**
 * Default automation settings for a new project.
 */
export const DEFAULT_AUTOMATION_SETTINGS: Omit<
  AutomationSettings,
  'projectId'
> = {
  enabled: true,
  mode: 'review_before_apply',
  categories: DEFAULT_AUTOMATION_CATEGORIES,
  maxExecutionsPerDay: 100,
};

// =============================================================================
// [EA-44] Automation Safety Rails
// =============================================================================

/**
 * Safety rail check result status.
 * PASSED: All safety checks passed, automation may proceed.
 * BLOCKED: One or more safety checks failed, automation must not proceed.
 */
export type SafetyRailStatus = 'PASSED' | 'BLOCKED';

/**
 * Types of safety rail checks performed before automation execution.
 * Each check enforces a specific system-level guardrail.
 */
export type SafetyRailCheckType =
  | 'ENTITLEMENT_CHECK'      // User/system has permission for this automation
  | 'SCOPE_BOUNDARY_CHECK'   // Automation stays within declared scope
  | 'INTENT_CONFIRMATION'    // User explicitly confirmed intent (EA-43)
  | 'GUARD_CONDITION'        // Pre-flight conditions are satisfied
  | 'RATE_LIMIT_CHECK'       // Within daily/hourly execution limits
  | 'ROLE_PERMISSION_CHECK'; // User role allows this action

/**
 * Result of a single safety rail check.
 */
export interface SafetyRailCheckResult {
  /** The type of check performed */
  checkType: SafetyRailCheckType;
  /** Whether this check passed or failed */
  passed: boolean;
  /** Human-readable message explaining the result */
  message: string;
  /** Optional additional context for debugging/logging */
  context?: Record<string, unknown>;
}

/**
 * Complete result of all safety rail checks for an automation execution attempt.
 */
export interface SafetyRailEvaluation {
  /** Overall status: PASSED only if ALL checks passed */
  status: SafetyRailStatus;
  /** Results of each individual check */
  checks: SafetyRailCheckResult[];
  /** ISO timestamp when evaluation was performed */
  evaluatedAt: string;
  /** Project ID being evaluated */
  projectId: string;
  /** User ID who initiated the automation */
  userId: string;
  /** Playbook or automation rule being executed */
  automationId: string;
  /** Declared scope boundary for this automation */
  declaredScope: {
    scopeId: string;
    assetCount: number;
    assetType: string;
  };
}

/**
 * Blocking reason codes for clear error messaging.
 * Maps to specific UI error panels.
 */
export type SafetyRailBlockReason =
  | 'ENTITLEMENT_BLOCKED'
  | 'SCOPE_EXCEEDED'
  | 'INTENT_NOT_CONFIRMED'
  | 'GUARD_CONDITION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ROLE_PERMISSION_DENIED';

/**
 * Error payload returned when safety rails block automation.
 * Provides clear, actionable information for the user.
 */
export interface SafetyRailBlockedError {
  /** Stable error code for programmatic handling */
  code: 'AUTOMATION_SAFETY_BLOCKED';
  /** The specific reason automation was blocked */
  reason: SafetyRailBlockReason;
  /** Human-readable explanation of why automation was blocked */
  message: string;
  /** The specific check(s) that failed */
  failedChecks: SafetyRailCheckResult[];
  /** Timestamp of the evaluation */
  evaluatedAt: string;
}
