export type DeoIssueSeverity = 'critical' | 'warning' | 'info';

/** How an issue is intended to be resolved */
export type DeoIssueFixType = 'aiFix' | 'manualFix' | 'syncFix';

export interface DeoIssue {
  id: string;
  title: string;
  description: string;
  severity: DeoIssueSeverity;
  count: number;
  affectedPages?: string[];
  affectedProducts?: string[];
  /** Stable issue type identifier (e.g., 'missing_seo_title', 'weak_description') */
  type?: string;
  /** How the issue is intended to be resolved */
  fixType?: DeoIssueFixType;
  /** Whether EngineO can offer a one-click or guided fix */
  fixReady?: boolean;
  /** The main product to highlight in the UI for Fix actions */
  primaryProductId?: string;
}

export interface DeoIssuesResponse {
  projectId: string;
  generatedAt: string; // ISO timestamp
  issues: DeoIssue[];
}
