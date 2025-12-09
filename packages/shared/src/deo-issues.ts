export type DeoIssueSeverity = 'critical' | 'warning' | 'info';

/** How an issue is intended to be resolved */
export type DeoIssueFixType = 'aiFix' | 'manualFix' | 'syncFix';

/**
 * Issue Engine Full category taxonomy.
 * - 'metadata': titles, descriptions, basic HTML/meta tags
 * - 'content_entity': body content, entities, product attributes
 * - 'answerability': ability of content to directly answer user/buyer questions
 * - 'technical': crawl/indexability, performance, status codes
 * - 'schema_visibility': structured data, AI visibility, schema/JSON-LD
 */
export type DeoIssueCategory =
  | 'metadata'
  | 'content_entity'
  | 'answerability'
  | 'technical'
  | 'schema_visibility';

/**
 * Fix cost/effort level for Issue Engine Full.
 * - 'one_click': can be fixed via existing AI optimize flows with minimal friction
 * - 'manual': requires user editing or Shopify/admin changes
 * - 'advanced': future structured/technical fixes
 */
export type DeoIssueFixCost = 'one_click' | 'manual' | 'advanced';

export interface DeoIssue {
  id: string;
  title: string;
  description: string;
  severity: DeoIssueSeverity;
  count: number;
  affectedPages?: string[];
  affectedProducts?: string[];

  // === Issue Engine Lite fields (Phase UX-7) ===
  /** Stable issue type identifier (e.g., 'missing_seo_title', 'weak_description') */
  type?: string;
  /** How the issue is intended to be resolved */
  fixType?: DeoIssueFixType;
  /** Whether EngineO can offer a one-click or guided fix */
  fixReady?: boolean;
  /** The main product to highlight in the UI for Fix actions */
  primaryProductId?: string;

  // === Issue Engine Full fields (Phase UX-8 / IE-2.x) ===
  /**
   * High-level category for the issue.
   * @see DeoIssueCategory for allowed values
   */
  category?: DeoIssueCategory;

  /**
   * Optional numeric confidence score [0, 1] for the detection heuristic.
   * Left undefined for issues without clear confidence metrics.
   * To be wired up in later IE-2.x sub-phases.
   */
  confidence?: number;

  /**
   * Optional key mapping this issue to a DEO Score component.
   * Allowed values: 'content_quality', 'entity_strength', 'technical_health',
   * 'visibility_signals', 'answerability'.
   * To be wired up in later IE-2.x sub-phases.
   */
  deoComponentKey?: string;

  /**
   * Optional coarse-grained impact estimate (0–100) representing how much
   * this issue may affect the overall DEO Score or a component.
   * To be wired up in later IE-2.x sub-phases.
   */
  deoImpactEstimate?: number;

  /**
   * Short human-readable explanation of why this issue matters for DEO/AI visibility.
   * Distinct from the plain description if useful.
   */
  whyItMatters?: string;

  /**
   * Short human-readable summary of the recommended next action/fix.
   */
  recommendedFix?: string;

  /**
   * Whether this particular issue instance can be fixed via a one-click
   * or guided AI workflow.
   */
  aiFixable?: boolean;

  /**
   * Coarse effort level for fixing this issue.
   * @see DeoIssueFixCost for allowed values
   */
  fixCost?: DeoIssueFixCost;

  /**
   * Optional list of issue IDs that should be resolved first.
   * To be wired up in later IE-2.x sub-phases.
   */
  dependencies?: string[];
}

export interface DeoIssuesResponse {
  projectId: string;
  generatedAt: string; // ISO timestamp
  issues: DeoIssue[];
}
