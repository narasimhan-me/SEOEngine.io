/**
 * Shared types and interfaces for SEOEngine.io
 */

// User DTOs
export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

// Project DTOs
export interface ProjectDTO {
  id: string;
  userId: string;
  name: string;
  domain?: string;
  connectedType: 'website' | 'shopify';
  createdAt: string;
}

// Common response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Health check response
export interface HealthResponse {
  status: 'ok' | 'error';
}

// DEO pillars - explicit named exports for better tree-shaking and module resolution
export {
  DEO_PILLARS,
  getDeoPillarById,
  getActiveDeoPillars,
  type DeoPillarId,
  type DeoPillar,
} from './deo-pillars';

// DEO Score types
export * from './deo-score';

// DEO job types
export * from './deo-jobs';

// DEO score config and engine
export * from './deo-score-config';
export * from './deo-score-engine';

// DEO issues types (depends on deo-pillars)
export * from './deo-issues';

// Search Intent types (SEARCH-INTENT-1)
export * from './search-intent';

// Competitive Positioning types (COMPETITORS-1)
export * from './competitors';

// Off-site Signals types (OFFSITE-1) - explicit named exports for better module resolution
export {
  // Constants
  OFFSITE_SIGNAL_LABELS,
  OFFSITE_SIGNAL_DESCRIPTIONS,
  OFFSITE_SIGNAL_WEIGHTS,
  OFFSITE_SIGNAL_TYPES,
  OFFSITE_GAP_LABELS,
  OFFSITE_FIX_DRAFT_LABELS,
  // Helper functions
  getOffsitePresenceStatusFromScore,
  calculateOffsiteSeverity,
  computeOffsiteFixWorkKey,
  getGapTypeForMissingSignal,
  // Types
  type OffsiteSignalType,
  type OffsitePresenceStatus,
  type OffsiteGapType,
  type OffsiteFixDraftType,
  type OffsiteFixApplyTarget,
  type ProjectOffsiteSignal,
  type ProjectOffsiteCoverage,
  type OffsiteGap,
  type OffsiteFixDraft,
  type OffsiteFixPreviewRequest,
  type OffsiteFixPreviewResponse,
  type OffsiteFixApplyRequest,
  type OffsiteFixApplyResponse,
  type ProjectOffsiteSignalsResponse,
} from './offsite-signals';

// Answer Engine types
export * from './answer-engine';

// GEO (GEO-FOUNDATION-1) types
export * from './geo';

// Automation Engine types
export * from './automation-engine';

// Local Discovery types (LOCAL-1) - explicit named exports for better module resolution
export {
  // Constants
  LOCAL_SIGNAL_LABELS,
  LOCAL_SIGNAL_DESCRIPTIONS,
  LOCAL_SIGNAL_WEIGHTS,
  LOCAL_SIGNAL_TYPES,
  LOCAL_GAP_LABELS,
  LOCAL_FIX_DRAFT_LABELS,
  // Helper functions
  isLocalApplicableFromReasons,
  getLocalCoverageStatusFromScore,
  calculateLocalSeverity,
  computeLocalFixWorkKey,
  getLocalGapTypeForMissingSignal,
  // Types
  type LocalApplicabilityStatus,
  type LocalApplicabilityReason,
  type LocalSignalType,
  type LocalCoverageStatus,
  type LocalGapType,
  type LocalFixDraftType,
  type LocalFixApplyTarget,
  type LocalSignal,
  type LocalDiscoveryScorecard,
  type LocalGap,
  type LocalFixDraft,
  type LocalFixPreviewRequest,
  type LocalFixPreviewResponse,
  type LocalFixApplyRequest,
  type LocalFixApplyResponse,
  type ProjectLocalDiscoveryResponse,
  type ProjectLocalConfig,
} from './local-discovery';

// Media & Accessibility types (MEDIA-1) - explicit named exports for better module resolution
export {
  // Constants
  MEDIA_FIX_DRAFT_LABELS,
  // Helper functions
  classifyAltText,
  getMediaAccessibilityStatusFromScore,
  computeMediaScoreFromStats,
  computeMediaFixWorkKey,
  // Types
  type MediaAltTextQuality,
  type MediaAccessibilityStatus,
  type ProductMediaStats,
  type MediaAccessibilityScorecard,
  type MediaFixDraftType,
  type MediaFixApplyTarget,
  type MediaFixDraft,
  type MediaFixPreviewRequest,
  type MediaFixPreviewResponse,
  type MediaFixApplyRequest,
  type MediaFixApplyResponse,
  type ProjectMediaAccessibilityResponse,
  type ProductImageView,
} from './media-accessibility';

// PERFORMANCE-1: Performance for Discovery types (Technical & Indexability pillar)
export {
  type PerformanceSignalType,
  type PerformanceForDiscoveryStatus,
  type PerformanceSignalStatus,
  type PerformanceForDiscoveryScorecard,
} from './performance-signals';

// GOV-AUDIT-VIEWER-1: Governance Audit & Approvals Viewer types
export {
  // Approval types
  type ApprovalStatusFilter,
  type ApprovalStatus,
  type ApprovalResourceType,
  type ApprovalsQuery,
  type ApprovalsListItem,
  type ApprovalsListResponse,
  // Audit event types
  ALLOWED_AUDIT_EVENT_TYPES,
  type AllowedAuditEventType,
  AUDIT_EVENT_TYPE_LABELS,
  type AuditEventsQuery,
  type AuditEventListItem,
  type AuditEventsListResponse,
  // Share link types
  type ShareLinkStatusFilter,
  type ShareLinkStatus,
  type ShareLinkAudience,
  type ShareLinksQuery,
  type ShareLinkListItem,
  type ShareLinkEventItem,
  type ShareLinksListResponse,
  // Helper functions
  isAllowedAuditEventType,
  getAuditEventTypeLabel,
  buildPaginationCursor,
  parsePaginationCursor,
  // Constants
  GOVERNANCE_DEFAULT_PAGE_SIZE,
  GOVERNANCE_MAX_PAGE_SIZE,
} from './governance';

// WORK-QUEUE-1: Unified Action Bundle Work Queue types
export {
  // Core enums
  type WorkQueueBundleType,
  type WorkQueueRecommendedActionKey,
  type WorkQueueHealth,
  type WorkQueueState,
  type WorkQueueAiUsage,
  type WorkQueueScopeType,
  type WorkQueueApprovalStatus,
  type WorkQueueDraftStatus,
  type WorkQueueShareLinkStatus,
  // Subschemas
  type WorkQueueApprovalInfo,
  type WorkQueueDraftInfo,
  type WorkQueueGeoExportInfo,
  // Main bundle schema
  type WorkQueueActionBundle,
  // API types
  type WorkQueueTab,
  type WorkQueueQueryParams,
  type WorkQueueViewerCapabilities,
  type WorkQueueViewer,
  type WorkQueueResponse,
  // Constants
  WORK_QUEUE_AI_DISCLOSURE_TEXT,
  WORK_QUEUE_ACTION_LABELS,
  WORK_QUEUE_IMPACT_RANKS,
  WORK_QUEUE_STATE_PRIORITY,
  WORK_QUEUE_HEALTH_PRIORITY,
  // ASSETS-PAGES-1.1: Asset-scoped automation playbook types
  type AutomationAssetType,
  type AssetRef,
  parseAssetRef,
  createAssetRef,
  validateAssetRefsForType,
  getPlaybookAssetType,
  PLAYBOOK_ASSET_TYPES,
  // [COUNT-INTEGRITY-1.1 PATCH 2.2] Shared Issue→ActionKey mapper
  getWorkQueueRecommendedActionKeyForIssue,
} from './work-queue';
