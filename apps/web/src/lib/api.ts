import { getToken } from './auth';
import { redirectToSignIn } from './authNavigation';
import type {
  ProjectOffsiteSignalsResponse,
  ProjectOffsiteCoverage,
  OffsiteFixDraft,
  OffsiteGapType,
  OffsiteSignalType,
  OffsiteFixDraftType,
} from '@/lib/offsite-signals';
import type {
  ProjectLocalDiscoveryResponse,
  LocalDiscoveryScorecard,
  LocalFixDraft,
  LocalGapType,
  LocalSignalType,
  LocalFixDraftType,
  ProjectLocalConfig,
} from '@/lib/local-discovery';
import type {
  ProjectMediaAccessibilityResponse,
  MediaAccessibilityScorecard,
  MediaFixDraft,
  MediaFixDraftType,
  MediaFixApplyTarget,
  ProductMediaStats,
  ProductImageView,
} from '@/lib/media-accessibility';
import type { ProjectInsightsResponse } from '@/lib/insights';
import type {
  ProductGeoReadinessResponse,
  GeoFixPreviewResponse,
  GeoFixApplyResponse,
} from '@/lib/geo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Off-site Signals API types (OFFSITE-1)
interface OffsiteFixPreviewRequest {
  gapType: OffsiteGapType;
  signalType: OffsiteSignalType;
  focusKey: string;
  draftType: OffsiteFixDraftType;
}

interface OffsiteFixPreviewResponse {
  draft: OffsiteFixDraft;
  generatedWithAi: boolean;
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

interface OffsiteFixApplyRequest {
  draftId: string;
  applyTarget: 'NOTES' | 'CONTENT_WORKSPACE' | 'OUTREACH_DRAFTS';
}

interface OffsiteFixApplyResponse {
  success: boolean;
  updatedCoverage: ProjectOffsiteCoverage;
  issuesResolved: boolean;
  issuesAffectedCount: number;
}

// Local Discovery API types (LOCAL-1)
interface LocalFixPreviewRequest {
  gapType: LocalGapType;
  signalType: LocalSignalType;
  focusKey: string;
  draftType: LocalFixDraftType;
  productId?: string;
}

interface LocalFixPreviewResponse {
  draft: LocalFixDraft;
  generatedWithAi: boolean;
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

interface LocalFixApplyRequest {
  draftId: string;
  applyTarget: 'ANSWER_BLOCK' | 'CONTENT_SECTION';
}

interface LocalFixApplyResponse {
  success: boolean;
  updatedScorecard: LocalDiscoveryScorecard;
  issuesResolved: boolean;
  issuesAffectedCount: number;
}

// Media Accessibility API types (MEDIA-1)
interface MediaFixPreviewRequest {
  imageId: string;
  draftType: MediaFixDraftType;
}

interface MediaFixPreviewResponse {
  draft: MediaFixDraft;
  generatedWithAi: boolean;
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

interface MediaFixApplyRequest {
  draftId: string;
  applyTarget: MediaFixApplyTarget;
}

interface MediaFixApplyResponse {
  success: boolean;
  updatedStats: ProductMediaStats;
  issuesResolved: boolean;
  issuesResolvedCount: number;
}

// GEO-EXPORT-1: GEO Report types
export interface GeoReportData {
  projectId: string;
  projectName: string;
  generatedAt: string;
  overview: {
    productsAnswerReadyPercent: number;
    productsAnswerReadyCount: number;
    productsTotal: number;
    answersTotal: number;
    reuseRatePercent: number;
    confidenceDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  };
  coverage: {
    byIntent: Array<{
      intentType: string;
      label: string;
      productsCovered: number;
      productsTotal: number;
      coveragePercent: number;
    }>;
    gaps: string[];
    summary: string;
  };
  trustSignals: {
    topBlockers: Array<{
      label: string;
      affectedProducts: number;
    }>;
    avgTimeToImproveHours: number | null;
    summary: string;
  };
  opportunities: Array<{
    title: string;
    why: string;
    estimatedImpact: 'high' | 'medium' | 'low';
    category: 'coverage' | 'reuse' | 'trust';
  }>;
  disclaimer: string;
}

export interface GeoReportShareLinkResponse {
  id: string;
  shareToken: string;
  shareUrl: string;
  title: string | null;
  expiresAt: string;
  createdAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  // [ENTERPRISE-GEO-1] Passcode and audience fields
  audience: 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY';
  passcodeLast4?: string | null;
  passcodeCreatedAt?: string | null;
}

// [ENTERPRISE-GEO-1] Create share link response with one-time passcode
export interface CreateGeoReportShareLinkResponse {
  shareLink: GeoReportShareLinkResponse;
  passcode?: string; // Only present if audience is PASSCODE - shown once
}

export interface GeoReportPublicShareViewResponse {
  status: 'valid' | 'expired' | 'revoked' | 'not_found' | 'passcode_required' | 'passcode_invalid';
  report?: GeoReportData;
  expiresAt?: string;
  generatedAt?: string;
  passcodeLast4?: string;
}

// [ENTERPRISE-GEO-1] Governance types
export interface GovernancePolicyResponse {
  projectId: string;
  requireApprovalForApply: boolean;
  restrictShareLinks: boolean;
  shareLinkExpiryDays: number;
  allowedExportAudience: 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY';
  allowCompetitorMentionsInExports: boolean;
  allowPIIInExports: boolean;
  updatedAt: string;
}

export interface ApprovalRequestResponse {
  id: string;
  projectId: string;
  resourceType: string;
  resourceId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  // [ROLES-3 PENDING-1] Actor tracking for attribution UI
  requestedByUserId: string;
  requestedAt: string;
  decidedByUserId?: string;
  decidedAt?: string;
  decisionReason?: string;
  consumed: boolean;
  consumedAt?: string;
}

export interface AuditEventResponse {
  id: string;
  projectId: string;
  actorUserId: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditEventListResponse {
  events: AuditEventResponse[];
  nextCursor?: string;
  hasMore: boolean;
}

// =============================================================================
// [GOV-AUDIT-VIEWER-1] Governance Viewer Response Types
// =============================================================================

/** Approval item for governance viewer */
export interface GovernanceViewerApprovalItem {
  id: string;
  projectId: string;
  resourceType: string;
  resourceId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  requestedByUserId: string;
  requestedByName?: string;
  requestedAt: string;
  decidedByUserId?: string;
  decidedByName?: string;
  decidedAt?: string;
  decisionReason?: string;
  consumed: boolean;
  consumedAt?: string;
  // Deep-link fields for traceability
  bundleId?: string;
  playbookId?: string;
  assetType?: string;
}

/** Response for governance viewer approvals list */
export interface GovernanceViewerApprovalsResponse {
  items: GovernanceViewerApprovalItem[];
  nextCursor?: string;
  hasMore: boolean;
}

/** Audit event item for governance viewer (allowlist-filtered) */
export interface GovernanceViewerAuditEventItem {
  id: string;
  projectId: string;
  actorUserId: string;
  actorName?: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** Response for governance viewer audit events list */
export interface GovernanceViewerAuditEventsResponse {
  items: GovernanceViewerAuditEventItem[];
  nextCursor?: string;
  hasMore: boolean;
}

/** Share link status history entry */
export interface ShareLinkStatusHistoryEntry {
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  changedAt: string;
  changedByUserId?: string;
  changedByName?: string;
}

/** Share link item for governance viewer (passcode NEVER returned) */
export interface GovernanceViewerShareLinkItem {
  id: string;
  projectId: string;
  reportType: string;
  title?: string;
  audience: 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY';
  passcodeLast4?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
  createdByUserId: string;
  createdByName?: string;
  revokedAt?: string;
  revokedByUserId?: string;
  revokedByName?: string;
  viewCount: number;
  lastViewedAt?: string;
  statusHistory?: ShareLinkStatusHistoryEntry[];
}

/** Response for governance viewer share links list */
export interface GovernanceViewerShareLinksResponse {
  items: GovernanceViewerShareLinkItem[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * [ROLES-2] Effective project role for role-based access control.
 * Single-user emulation: OWNER by default, can simulate VIEWER/EDITOR.
 */
export type EffectiveProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER';

/**
 * [ROLES-3] Role capabilities for UI state derivation.
 * Updated: canGenerateDrafts, canManageMembers, canExport added
 * Updated: canApply is OWNER-only
 */
export interface RoleCapabilities {
  canView: boolean;
  canGenerateDrafts: boolean;
  canRequestApproval: boolean;
  canApprove: boolean;
  canApply: boolean;
  canModifySettings: boolean;
  canManageMembers: boolean;
  canExport: boolean;
}

/**
 * [ROLES-3] Get role capabilities for a given effective role.
 * Updated: EDITOR cannot apply; must request approval
 */
export function getRoleCapabilities(role: EffectiveProjectRole): RoleCapabilities {
  switch (role) {
    case 'OWNER':
      return {
        canView: true,
        canGenerateDrafts: true,
        canRequestApproval: true,
        canApprove: true,
        canApply: true,
        canModifySettings: true,
        canManageMembers: true,
        canExport: true,
      };
    case 'EDITOR':
      return {
        canView: true,
        canGenerateDrafts: true,
        canRequestApproval: true,
        canApprove: false,
        canApply: false, // [ROLES-3] EDITOR cannot apply; must request approval
        canModifySettings: false,
        canManageMembers: false,
        canExport: true,
      };
    case 'VIEWER':
      return {
        canView: true,
        canGenerateDrafts: false,
        canRequestApproval: false,
        canApprove: false,
        canApply: false,
        canModifySettings: false,
        canManageMembers: false,
        canExport: true, // View-only export allowed
      };
  }
}

/**
 * [ROLES-2] Get display label for a role.
 */
export function getRoleDisplayLabel(role: EffectiveProjectRole): string {
  switch (role) {
    case 'OWNER':
      return 'Project Owner';
    case 'EDITOR':
      return 'Editor';
    case 'VIEWER':
      return 'Viewer';
  }
}

// =============================================================================
// [ROLES-3] Project Member Types
// =============================================================================

/**
 * [ROLES-3] Project member information
 */
export interface ProjectMember {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: EffectiveProjectRole;
  createdAt: string;
}

/**
 * [ROLES-3] User role response from /projects/:id/role endpoint
 * [ROLES-3 FIXUP-2] Includes isMultiUserProject for UI decisions
 */
export interface UserRoleResponse {
  projectId: string;
  userId: string;
  role: EffectiveProjectRole;
  capabilities: RoleCapabilities;
  /** Whether this project has multiple members (affects approval flow UI) */
  isMultiUserProject: boolean;
}

/**
 * Custom API error with optional error code for special handling
 */
export class ApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Build an ApiError from an API response
 *
 * [ROLES-2 FIXUP-2] Enhanced to handle NestJS structured error responses.
 * NestJS BadRequestException({ code, message, ... }) produces:
 * { statusCode, error, message: { code, message, ... } }
 *
 * This function extracts:
 * - code from body.message.code (structured) or body.code (flat)
 * - message from body.message.message (structured) or body.message (flat string)
 * - Falls back to body.error or status-based message
 */
function buildApiError(response: Response, body: unknown): ApiError {
  let message: string;
  let code: string | undefined;

  // Try to extract message and code from JSON body
  if (body && typeof body === 'object') {
    const json = body as Record<string, unknown>;

    // [ROLES-2 FIXUP-2] Handle nested structured error (NestJS BadRequestException with object payload)
    // Shape: { statusCode, error, message: { code, message, approvalStatus, ... } }
    if (json.message && typeof json.message === 'object' && !Array.isArray(json.message)) {
      const nested = json.message as Record<string, unknown>;
      // Extract code from nested object
      if (typeof nested.code === 'string') {
        code = nested.code;
      }
      // Extract message from nested object, or construct from code
      if (typeof nested.message === 'string' && nested.message) {
        message = nested.message;
      } else if (code) {
        // Use code as message if no explicit message
        message = code;
      } else {
        message = getStatusMessage(response.status, response.statusText);
      }
    }
    // Handle NestJS validation errors (message is an array of strings)
    else if (Array.isArray(json.message)) {
      const messages = json.message.filter((m): m is string => typeof m === 'string');
      message = messages.length > 0 ? messages.join('. ') : getStatusMessage(response.status, response.statusText);
      // Check for code at top level
      if (typeof json.code === 'string') {
        code = json.code;
      }
    }
    // Handle flat string message (original behavior)
    else if (typeof json.message === 'string' && json.message) {
      message = json.message;
      if (typeof json.code === 'string') {
        code = json.code;
      }
    }
    // Handle body.error as fallback
    else if (typeof json.error === 'string' && json.error) {
      message = json.error;
      if (typeof json.code === 'string') {
        code = json.code;
      }
    }
    // Final fallback to status-based message
    else {
      message = getStatusMessage(response.status, response.statusText);
      if (typeof json.code === 'string') {
        code = json.code;
      }
    }
  } else {
    message = getStatusMessage(response.status, response.statusText);
  }

  return new ApiError(message, code, response.status);
}

/**
 * Get user-friendly message based on HTTP status
 */
function getStatusMessage(status: number, statusText: string): string {
  if (status === 401 || status === 403) {
    return 'Unauthorized. Please log in again.';
  }
  if (status === 404) {
    return 'Not found. Please check the URL or try again.';
  }
  if (status >= 500) {
    return 'Something went wrong on our side. Please try again.';
  }
  return statusText || 'Request failed. Please try again.';
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const error = buildApiError(response, body);

      const isEntitlementsError =
        error.code === 'ENTITLEMENTS_LIMIT_REACHED' ||
        (body &&
          typeof (body as Record<string, unknown>).error === 'string' &&
          (body as Record<string, unknown>).error === 'ENTITLEMENTS_LIMIT_REACHED');

      if ((response.status === 401 || response.status === 403) && !isEntitlementsError) {
        if (typeof window !== 'undefined') {
          const next = window.location.pathname + window.location.search;
          redirectToSignIn(next);
        }
      }

      throw error;
    }

    return response.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(
      'Network error. Please check your connection and try again.',
      undefined,
    );
  }
}

/**
 * Fetch without authentication - used for endpoints that don't require JWT
 * (e.g., /auth/2fa/verify which uses tempToken instead)
 */
async function fetchWithoutAuth(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw buildApiError(response, body);
    }

    return response.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(
      'Network error. Please check your connection and try again.',
      undefined,
    );
  }
}

export type AutomationPlaybookId = 'missing_seo_title' | 'missing_seo_description';

// [ASSETS-PAGES-1.1] Asset type for automation playbooks
export type AutomationAssetType = 'PRODUCTS' | 'PAGES' | 'COLLECTIONS';

export type AutomationPlaybookApplyItemStatus =
  | 'UPDATED'
  | 'SKIPPED'
  | 'FAILED'
  | 'LIMIT_REACHED';

export interface AutomationPlaybookApplyItemResult {
  productId: string;
  status: AutomationPlaybookApplyItemStatus;
  message: string;
  updatedFields?: {
    seoTitle?: boolean;
    seoDescription?: boolean;
  };
}

export interface AutomationPlaybookApplyResult {
  projectId: string;
  playbookId: AutomationPlaybookId;
  totalAffectedProducts: number;
  attemptedCount: number;
  updatedCount: number;
  skippedCount: number;
  limitReached: boolean;
  stopped: boolean;
  stoppedAtProductId?: string;
  failureReason?: string;
  results: AutomationPlaybookApplyItemResult[];
}

export interface AutomationPlaybookEstimate {
  projectId: string;
  playbookId: AutomationPlaybookId;
  totalAffectedProducts: number;
  estimatedTokens: number;
  planId: string;
  eligible: boolean;
  canProceed: boolean;
  reasons: string[];
  aiDailyLimit: {
    limit: number;
    used: number;
    remaining: number;
  };
  /**
   * Server-issued scope identifier. Must be returned when calling apply
   * to ensure the apply targets the exact same set of products.
   */
  scopeId: string;
}

export type AutomationPlaybookRunType = 'PREVIEW_GENERATE' | 'DRAFT_GENERATE' | 'APPLY';

export type AutomationPlaybookRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'STALE';

export interface AutomationPlaybookRun {
  id: string;
  projectId: string;
  playbookId: AutomationPlaybookId;
  runType: AutomationPlaybookRunType;
  status: AutomationPlaybookRunStatus;
  scopeId: string;
  rulesHash: string;
  idempotencyKey: string;
  draftId?: string;
  aiUsed: boolean;
  errorCode?: string;
  errorMessage?: string;
  resultRef?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Result from generating automation playbook drafts (AI-powered).
 */
export interface AutomationPlaybookDraftGenerateResult {
  projectId: string;
  playbookId: AutomationPlaybookId;
  scopeId: string;
  rulesHash: string;
  counts: {
    affectedTotal: number;
    draftGenerated: number;
    noSuggestionCount: number;
  };
  aiCalled: boolean;
  draftId?: string;
}

/**
 * Draft status for automation playbooks.
 */
export type AutomationPlaybookDraftStatus = 'PENDING' | 'READY' | 'APPLIED' | 'EXPIRED' | 'STALE';

/**
 * Automation playbook draft metadata.
 */
export interface AutomationPlaybookDraft {
  id: string;
  projectId: string;
  playbookId: AutomationPlaybookId;
  scopeId: string;
  rulesHash: string;
  status: AutomationPlaybookDraftStatus;
  counts: {
    affectedTotal: number;
    draftGenerated: number;
    noSuggestionCount: number;
  };
  rules?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
}

// AI-USAGE-1: AI Usage Ledger Types
export type AutomationPlaybookAiUsageRunType = 'PREVIEW_GENERATE' | 'DRAFT_GENERATE' | 'APPLY';

export interface ProjectAiUsageSummary {
  projectId: string;
  periodStart: string; // ISO
  periodEnd: string; // ISO
  totalRuns: number;
  totalAiRuns: number;
  previewRuns: number;
  draftGenerateRuns: number;
  applyRuns: number;
  applyAiRuns: number; // must be 0
  // CACHE/REUSE v2: Reuse metrics
  reusedRuns: number;
  aiRunsAvoided: number;
}

export interface ProjectAiUsageRunSummary {
  runId: string;
  runType: AutomationPlaybookAiUsageRunType;
  status: AutomationPlaybookRunStatus;
  aiUsed: boolean;
  scopeId: string | null;
  rulesHash: string | null;
  createdAt: string;
  // CACHE/REUSE v2: Reuse tracking
  reused: boolean;
  reusedFromRunId: string | null;
  aiWorkKey: string | null;
}

// AI-USAGE v2: Quota evaluation types
export type AiUsageQuotaStatus = 'allowed' | 'warning' | 'blocked';

export interface AiUsageQuotaPolicy {
  monthlyAiRunsLimit: number | null;
  softThresholdPercent: number;
  hardEnforcementEnabled: boolean;
}

export interface AiUsageQuotaEvaluation {
  projectId: string;
  planId: string;
  action: 'PREVIEW_GENERATE' | 'DRAFT_GENERATE';
  policy: AiUsageQuotaPolicy;
  currentMonthAiRuns: number;
  remainingAiRuns: number | null;
  currentUsagePercent: number | null;
  status: AiUsageQuotaStatus;
  reason: 'unlimited' | 'below_soft_threshold' | 'soft_threshold_reached' | 'hard_limit_reached';
}

export const authApi = {
  signup: (data: { email: string; password: string; name?: string; captchaToken: string }) =>
    fetchWithoutAuth('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string; captchaToken?: string }) =>
    fetchWithoutAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const usersApi = {
  me: () => fetchWithAuth('/users/me'),
};

export const projectsApi = {
  list: () => fetchWithAuth('/projects'),

  get: (id: string) => fetchWithAuth(`/projects/${id}`),

  overview: (id: string) => fetchWithAuth(`/projects/${id}/overview`),

  deoScore: (id: string) => fetchWithAuth(`/projects/${id}/deo-score`),

  deoSignalsDebug: (id: string) =>
    fetchWithAuth(`/projects/${id}/deo-signals/debug`),

  deoIssues: (id: string) => fetchWithAuth(`/projects/${id}/deo-issues`),

  // COUNT-INTEGRITY-1: Read-only issues endpoint (no side effects)
  deoIssuesReadOnly: (id: string) => fetchWithAuth(`/projects/${id}/deo-issues/read-only`),

  // COUNT-INTEGRITY-1: Canonical server-side counts summary
  issueCountsSummary: (id: string) => fetchWithAuth(`/projects/${id}/issues/counts-summary`),

  crawlPages: (id: string) => fetchWithAuth(`/projects/${id}/crawl-pages`),

  recomputeDeoScoreSync: (id: string) =>
    fetchWithAuth(`/projects/${id}/deo-score/recompute-sync`, {
      method: 'POST',
    }),

  create: (data: { name: string; domain: string }) =>
    fetchWithAuth('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: {
    name?: string;
    domain?: string;
    autoCrawlEnabled?: boolean;
    crawlFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    autoSuggestMissingMetadata?: boolean;
    autoSuggestThinContent?: boolean;
    autoSuggestDailyCap?: number;
    aeoSyncToShopifyMetafields?: boolean;
  }) =>
    fetchWithAuth(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  integrationStatus: (id: string) => fetchWithAuth(`/projects/${id}/integration-status`),

  automationSuggestions: (id: string) => fetchWithAuth(`/projects/${id}/automation-suggestions`),

  /**
   * [ASSETS-PAGES-1.1] Estimate automation playbook with optional assetType and scopeAssetRefs.
   * - assetType: 'PRODUCTS' (default) | 'PAGES' | 'COLLECTIONS'
   * - scopeAssetRefs: Asset refs like 'page_handle:about-us' or 'collection_handle:summer-sale'
   */
  automationPlaybookEstimate: (
    id: string,
    playbookId: AutomationPlaybookId,
    scopeProductIds?: string[],
    assetType?: AutomationAssetType,
    scopeAssetRefs?: string[],
  ) => {
    // Use POST for scoped requests
    if ((scopeProductIds && scopeProductIds.length > 0) ||
        assetType ||
        (scopeAssetRefs && scopeAssetRefs.length > 0)) {
      return fetchWithAuth(`/projects/${id}/automation-playbooks/estimate`, {
        method: 'POST',
        body: JSON.stringify({
          playbookId,
          scopeProductIds,
          assetType,
          scopeAssetRefs,
        }),
      });
    }
    return fetchWithAuth(
      `/projects/${id}/automation-playbooks/estimate?playbookId=${encodeURIComponent(
        playbookId,
      )}`,
    );
  },

  /**
   * Preview an automation playbook - creates/updates a backend draft with sample suggestions.
   * Returns scopeId, rulesHash, and sample preview items that can be used for the full apply flow.
   *
   * [ASSETS-PAGES-1.1-UI-HARDEN] Extended with assetType and scopeAssetRefs support.
   * - PRODUCTS: use scopeProductIds (existing flow)
   * - PAGES/COLLECTIONS: use scopeAssetRefs (handle-only refs like 'page_handle:about-us')
   */
  previewAutomationPlaybook: (
    id: string,
    playbookId: AutomationPlaybookId,
    rules?: {
      enabled: boolean;
      find: string;
      replace: string;
      caseSensitive: boolean;
      prefix: string;
      suffix: string;
      maxLength?: number;
      forbiddenPhrasesText: string;
    },
    sampleSize?: number,
    scopeProductIds?: string[],
    assetType?: AutomationAssetType,
    scopeAssetRefs?: string[],
  ) =>
    fetchWithAuth(`/projects/${id}/automation-playbooks/${playbookId}/preview`, {
      method: 'POST',
      body: JSON.stringify({
        rules,
        sampleSize,
        scopeProductIds,
        assetType,
        scopeAssetRefs,
      }),
    }),

  /**
   * Apply an automation playbook.
   *
   * [ASSETS-PAGES-1.1-UI-HARDEN] Extended with assetType and scopeAssetRefs support.
   * XOR enforcement:
   * - PRODUCTS: use scopeProductIds (existing flow)
   * - PAGES/COLLECTIONS: use scopeAssetRefs (handle-only refs)
   */
  applyAutomationPlaybook: (
    id: string,
    playbookId: AutomationPlaybookId,
    scopeId: string,
    rulesHash: string,
    scopeProductIds?: string[],
    /** [ROLES-2] Optional approvalId for governance-gated apply */
    approvalId?: string,
    assetType?: AutomationAssetType,
    scopeAssetRefs?: string[],
  ): Promise<AutomationPlaybookApplyResult> =>
    fetchWithAuth(
      `/projects/${id}/automation-playbooks/apply`,
      {
        method: 'POST',
        body: JSON.stringify({
          playbookId,
          scopeId,
          rulesHash,
          scopeProductIds,
          approvalId,
          assetType,
          scopeAssetRefs,
        }),
      },
    ),

  /**
   * Create a new Automation Playbook run.
   * Runs are processed asynchronously via queue (production) or inline (dev).
   */
  createPlaybookRun: (
    projectId: string,
    playbookId: AutomationPlaybookId,
    runType: AutomationPlaybookRunType,
    scopeId: string,
    rulesHash: string,
    idempotencyKey?: string,
    meta?: Record<string, unknown>,
  ): Promise<AutomationPlaybookRun> =>
    fetchWithAuth(
      `/projects/${projectId}/automation-playbooks/${playbookId}/runs`,
      {
        method: 'POST',
        body: JSON.stringify({
          runType,
          scopeId,
          rulesHash,
          idempotencyKey,
          meta,
        }),
      },
    ),

  /**
   * Get a specific Automation Playbook run by ID.
   */
  getPlaybookRun: (projectId: string, runId: string): Promise<AutomationPlaybookRun> =>
    fetchWithAuth(`/projects/${projectId}/automation-playbooks/runs/${runId}`),

  /**
   * List Automation Playbook runs for a project with optional filters.
   */
  listPlaybookRuns: (
    projectId: string,
    opts?: {
      playbookId?: AutomationPlaybookId;
      scopeId?: string;
      runType?: AutomationPlaybookRunType;
      limit?: number;
    },
  ): Promise<AutomationPlaybookRun[]> => {
    const params = new URLSearchParams();
    if (opts?.playbookId) params.set('playbookId', opts.playbookId);
    if (opts?.scopeId) params.set('scopeId', opts.scopeId);
    if (opts?.runType) params.set('runType', opts.runType);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(
      `/projects/${projectId}/automation-playbooks/runs${qs}`,
    );
  },

  /**
   * Generate a draft for an automation playbook (uses AI).
   * Returns counts for affected products, drafts generated, and those needing attention.
   *
   * [ASSETS-PAGES-1.1-UI-HARDEN] Extended with assetType and scopeAssetRefs support.
   * XOR enforcement:
   * - PRODUCTS: use scopeProductIds (existing flow)
   * - PAGES/COLLECTIONS: use scopeAssetRefs (handle-only refs)
   */
  generateAutomationPlaybookDraft: (
    projectId: string,
    playbookId: AutomationPlaybookId,
    scopeId: string,
    rulesHash: string,
    scopeProductIds?: string[],
    assetType?: AutomationAssetType,
    scopeAssetRefs?: string[],
  ): Promise<AutomationPlaybookDraftGenerateResult> =>
    fetchWithAuth(
      `/projects/${projectId}/automation-playbooks/${playbookId}/draft/generate`,
      {
        method: 'POST',
        body: JSON.stringify({
          scopeId,
          rulesHash,
          scopeProductIds,
          assetType,
          scopeAssetRefs,
        }),
      },
    ),

  /**
   * Get the latest draft for an automation playbook.
   * Used to detect existing READY drafts for resumable state.
   */
  getLatestAutomationPlaybookDraft: (
    projectId: string,
    playbookId: AutomationPlaybookId,
  ): Promise<AutomationPlaybookDraft | null> =>
    fetchWithAuth(
      `/projects/${projectId}/automation-playbooks/${playbookId}/draft/latest`,
    ),

  setAutomationPlaybookEntryConfig: (
    projectId: string,
    playbookId: AutomationPlaybookId,
    body: {
      enabled: boolean;
      trigger: 'manual_only';
      scopeId: string;
      rulesHash: string;
      scopeProductIds?: string[];
      intent?: string;
    },
  ) =>
    fetchWithAuth(
      `/projects/${projectId}/automation-playbooks/${playbookId}/config`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  delete: (id: string) =>
    fetchWithAuth(`/projects/${id}`, {
      method: 'DELETE',
    }),

  // Off-site Signals API (OFFSITE-1)
  offsiteSignals: (projectId: string): Promise<ProjectOffsiteSignalsResponse> =>
    fetchWithAuth(`/projects/${projectId}/offsite-signals`),

  offsiteScorecard: (projectId: string): Promise<ProjectOffsiteCoverage> =>
    fetchWithAuth(`/projects/${projectId}/offsite-signals/scorecard`),

  previewOffsiteFix: (
    projectId: string,
    params: OffsiteFixPreviewRequest,
  ): Promise<OffsiteFixPreviewResponse> =>
    fetchWithAuth(`/projects/${projectId}/offsite-signals/preview`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  applyOffsiteFix: (
    projectId: string,
    params: OffsiteFixApplyRequest,
  ): Promise<OffsiteFixApplyResponse> =>
    fetchWithAuth(`/projects/${projectId}/offsite-signals/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // LOCAL-1: Local Discovery endpoints
  localDiscovery: (projectId: string): Promise<ProjectLocalDiscoveryResponse> =>
    fetchWithAuth(`/projects/${projectId}/local-discovery`),

  localScorecard: (projectId: string): Promise<LocalDiscoveryScorecard> =>
    fetchWithAuth(`/projects/${projectId}/local-discovery/scorecard`),

  localConfig: (projectId: string): Promise<ProjectLocalConfig | null> =>
    fetchWithAuth(`/projects/${projectId}/local-discovery/config`),

  updateLocalConfig: (
    projectId: string,
    config: Partial<ProjectLocalConfig>,
  ): Promise<ProjectLocalConfig> =>
    fetchWithAuth(`/projects/${projectId}/local-discovery/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  previewLocalFix: (
    projectId: string,
    params: LocalFixPreviewRequest,
  ): Promise<LocalFixPreviewResponse> =>
    fetchWithAuth(`/projects/${projectId}/local-discovery/preview`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  applyLocalFix: (
    projectId: string,
    params: LocalFixApplyRequest,
  ): Promise<LocalFixApplyResponse> =>
    fetchWithAuth(`/projects/${projectId}/local-discovery/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // MEDIA-1: Media & Accessibility endpoints
  mediaAccessibility: (projectId: string): Promise<ProjectMediaAccessibilityResponse> =>
    fetchWithAuth(`/projects/${projectId}/media`),

  mediaScorecard: (projectId: string): Promise<MediaAccessibilityScorecard> =>
    fetchWithAuth(`/projects/${projectId}/media/scorecard`),

  // INSIGHTS-1: Project insights (read-only derived data)
  insights: (projectId: string): Promise<ProjectInsightsResponse> =>
    fetchWithAuth(`/projects/${projectId}/insights`),

  // GEO-EXPORT-1: GEO Reports API
  /** Assemble GEO report data for export/print */
  assembleGeoReport: (projectId: string): Promise<GeoReportData> =>
    fetchWithAuth(`/projects/${projectId}/geo-reports/assemble`),

  /** Create a shareable link for the GEO report
   * [ENTERPRISE-GEO-1] Now supports audience and passcode protection
   */
  createGeoReportShareLink: (
    projectId: string,
    options?: { title?: string; audience?: 'ANYONE_WITH_LINK' | 'PASSCODE' },
  ): Promise<CreateGeoReportShareLinkResponse> =>
    fetchWithAuth(`/projects/${projectId}/geo-reports/share-links`, {
      method: 'POST',
      body: JSON.stringify(options ?? {}),
    }),

  /** List all share links for a project */
  listGeoReportShareLinks: (projectId: string): Promise<GeoReportShareLinkResponse[]> =>
    fetchWithAuth(`/projects/${projectId}/geo-reports/share-links`),

  /** Revoke a share link */
  revokeGeoReportShareLink: (
    projectId: string,
    linkId: string,
  ): Promise<{ success: true }> =>
    fetchWithAuth(`/projects/${projectId}/geo-reports/share-links/${linkId}`, {
      method: 'DELETE',
    }),

  // [ENTERPRISE-GEO-1] Governance API
  /** Get governance policy for a project */
  getGovernancePolicy: (projectId: string): Promise<GovernancePolicyResponse> =>
    fetchWithAuth(`/projects/${projectId}/governance/policy`),

  /** Update governance policy for a project */
  updateGovernancePolicy: (
    projectId: string,
    updates: Partial<{
      requireApprovalForApply: boolean;
      restrictShareLinks: boolean;
      shareLinkExpiryDays: number;
      allowedExportAudience: 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY';
      allowCompetitorMentionsInExports: boolean;
    }>,
  ): Promise<GovernancePolicyResponse> =>
    fetchWithAuth(`/projects/${projectId}/governance/policy`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  /** Create an approval request
   * [ROLES-2] Added AUTOMATION_PLAYBOOK_APPLY resource type
   */
  createApprovalRequest: (
    projectId: string,
    params: { resourceType: 'GEO_FIX_APPLY' | 'ANSWER_BLOCK_SYNC' | 'AUTOMATION_PLAYBOOK_APPLY'; resourceId: string },
  ): Promise<ApprovalRequestResponse> =>
    fetchWithAuth(`/projects/${projectId}/governance/approvals`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /** Approve an approval request */
  approveRequest: (
    projectId: string,
    approvalId: string,
    reason?: string,
  ): Promise<ApprovalRequestResponse> =>
    fetchWithAuth(`/projects/${projectId}/governance/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** Reject an approval request */
  rejectRequest: (
    projectId: string,
    approvalId: string,
    reason?: string,
  ): Promise<ApprovalRequestResponse> =>
    fetchWithAuth(`/projects/${projectId}/governance/approvals/${approvalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** List pending approval requests */
  listApprovalRequests: (
    projectId: string,
    status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED',
  ): Promise<{ requests: ApprovalRequestResponse[] }> =>
    fetchWithAuth(
      `/projects/${projectId}/governance/approvals${status ? `?status=${status}` : ''}`,
    ),

  /**
   * [ROLES-2] Get approval status for a specific resource
   * Returns the most recent approval request for the given resource
   */
  getApprovalStatus: (
    projectId: string,
    resourceType: 'GEO_FIX_APPLY' | 'ANSWER_BLOCK_SYNC' | 'AUTOMATION_PLAYBOOK_APPLY',
    resourceId: string,
  ): Promise<{ approval: ApprovalRequestResponse | null }> =>
    fetchWithAuth(
      `/projects/${projectId}/governance/approvals?resourceType=${resourceType}&resourceId=${encodeURIComponent(resourceId)}`,
    ),

  /** Get audit events for a project */
  listAuditEvents: (
    projectId: string,
    options?: { cursor?: string; limit?: number; eventType?: string },
  ): Promise<AuditEventListResponse> => {
    const params = new URLSearchParams();
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.eventType) params.set('eventType', options.eventType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`/projects/${projectId}/governance/audit-events${qs}`);
  },

  // ===========================================================================
  // [GOV-AUDIT-VIEWER-1] Governance Viewer API (read-only)
  // ===========================================================================

  /**
   * [GOV-AUDIT-VIEWER-1] List approvals for governance viewer with cursor pagination.
   * @param status - 'pending' (PENDING_APPROVAL) or 'history' (APPROVED/REJECTED)
   */
  listViewerApprovals: (
    projectId: string,
    options?: { status?: 'pending' | 'history'; cursor?: string; limit?: number },
  ): Promise<GovernanceViewerApprovalsResponse> => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit) params.set('limit', String(options.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`/projects/${projectId}/governance/viewer/approvals${qs}`);
  },

  /**
   * [GOV-AUDIT-VIEWER-1] List audit events for governance viewer with cursor pagination.
   * IMPORTANT: Only returns events in ALLOWED_AUDIT_EVENT_TYPES allowlist.
   * @param types - Comma-separated list of event types to filter (optional)
   * @param actor - Filter by actorUserId (optional)
   * @param from - ISO timestamp for date range start (optional)
   * @param to - ISO timestamp for date range end (optional)
   */
  listViewerAuditEvents: (
    projectId: string,
    options?: {
      types?: string[];
      actor?: string;
      from?: string;
      to?: string;
      cursor?: string;
      limit?: number;
    },
  ): Promise<GovernanceViewerAuditEventsResponse> => {
    const params = new URLSearchParams();
    if (options?.types && options.types.length > 0) {
      params.set('types', options.types.join(','));
    }
    if (options?.actor) params.set('actor', options.actor);
    if (options?.from) params.set('from', options.from);
    if (options?.to) params.set('to', options.to);
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit) params.set('limit', String(options.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`/projects/${projectId}/governance/viewer/audit-events${qs}`);
  },

  /**
   * [GOV-AUDIT-VIEWER-1] List share links for governance viewer with cursor pagination.
   * IMPORTANT: Passcode is NEVER returned, only passcodeLast4.
   * @param status - 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'all' (optional)
   */
  listViewerShareLinks: (
    projectId: string,
    options?: { status?: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'all'; cursor?: string; limit?: number },
  ): Promise<GovernanceViewerShareLinksResponse> => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit) params.set('limit', String(options.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`/projects/${projectId}/governance/viewer/share-links${qs}`);
  },

  // ===========================================================================
  // [ROLES-3] Member Management API
  // ===========================================================================

  /** Get the current user's role in a project */
  getUserRole: (projectId: string): Promise<UserRoleResponse> =>
    fetchWithAuth(`/projects/${projectId}/role`),

  /** List all members of a project (read-only for all members) */
  listMembers: (projectId: string): Promise<ProjectMember[]> =>
    fetchWithAuth(`/projects/${projectId}/members`),

  /** Add a member to a project (OWNER-only) */
  addMember: (
    projectId: string,
    email: string,
    role: EffectiveProjectRole,
  ): Promise<ProjectMember> =>
    fetchWithAuth(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  /** Change a member's role (OWNER-only) */
  changeMemberRole: (
    projectId: string,
    memberId: string,
    role: EffectiveProjectRole,
  ): Promise<ProjectMember> =>
    fetchWithAuth(`/projects/${projectId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  /** Remove a member from a project (OWNER-only) */
  removeMember: (
    projectId: string,
    memberId: string,
  ): Promise<{ success: boolean; message: string }> =>
    fetchWithAuth(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  // ===========================================================================
  // [WORK-QUEUE-1] Unified Action Bundle Work Queue
  // ===========================================================================

  /**
   * Get derived Work Queue action bundles for a project.
   * [WORK-QUEUE-1] All bundles are derived at request time from existing persisted artifacts.
   * [ASSETS-PAGES-1] Added scopeType filter for filtering by asset type.
   */
  workQueue: (
    projectId: string,
    params?: {
      tab?: 'Critical' | 'NeedsAttention' | 'PendingApproval' | 'DraftsReady' | 'AppliedRecently';
      bundleType?: 'ASSET_OPTIMIZATION' | 'AUTOMATION_RUN' | 'GEO_EXPORT';
      actionKey?: 'FIX_MISSING_METADATA' | 'RESOLVE_TECHNICAL_ISSUES' | 'IMPROVE_SEARCH_INTENT' | 'OPTIMIZE_CONTENT' | 'SHARE_LINK_GOVERNANCE';
      scopeType?: 'PRODUCTS' | 'PAGES' | 'COLLECTIONS' | 'STORE_WIDE';
      bundleId?: string;
    },
  ): Promise<import('./work-queue').WorkQueueResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.bundleType) searchParams.set('bundleType', params.bundleType);
    if (params?.actionKey) searchParams.set('actionKey', params.actionKey);
    if (params?.scopeType) searchParams.set('scopeType', params.scopeType);
    if (params?.bundleId) searchParams.set('bundleId', params.bundleId);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return fetchWithAuth(`/projects/${projectId}/work-queue${qs}`);
  },
};

export const integrationsApi = {
  list: (projectId: string) => fetchWithAuth(`/integrations?projectId=${projectId}`),

  create: (data: { projectId: string; type: string; config?: object }) =>
    fetchWithAuth('/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchWithAuth(`/integrations/${id}`, {
      method: 'DELETE',
    }),
};

export const seoScanApi = {
  start: (projectId: string) =>
    fetchWithAuth('/seo-scan/start', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),

  results: (projectId: string) => fetchWithAuth(`/seo-scan/results?projectId=${projectId}`),

  scanProduct: (productId: string) =>
    fetchWithAuth('/seo-scan/product', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),
};

export const aiApi = {
  suggestMetadata: (crawlResultId: string, targetKeywords?: string[]) =>
    fetchWithAuth('/ai/metadata', {
      method: 'POST',
      body: JSON.stringify({ crawlResultId, targetKeywords }),
    }),

  suggestProductMetadata: (productId: string, targetKeywords?: string[]) =>
    fetchWithAuth('/ai/product-metadata', {
      method: 'POST',
      body: JSON.stringify({ productId, targetKeywords }),
    }),

  fixIssueLite: (
    productId: string,
    issueType: 'missing_seo_title' | 'missing_seo_description',
  ) =>
    fetchWithAuth('/ai/product-metadata/fix-from-issue', {
      method: 'POST',
      body: JSON.stringify({ productId, issueType }),
    }),

  /** Generate AI Answer Blocks for a product (Phase AE-1.2) */
  generateProductAnswers: (productId: string) =>
    fetchWithAuth('/ai/product-answers', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),

  // AI-USAGE-1: AI Usage Ledger APIs

  /**
   * Get AI usage summary for a project (current billing month).
   */
  getProjectAiUsageSummary: (projectId: string): Promise<ProjectAiUsageSummary> =>
    fetchWithAuth(`/ai/projects/${projectId}/usage/summary`),

  /**
   * List recent AI usage runs for a project.
   */
  getProjectAiUsageRuns: (
    projectId: string,
    opts?: { runType?: AutomationPlaybookAiUsageRunType; limit?: number },
  ): Promise<ProjectAiUsageRunSummary[]> => {
    const params = new URLSearchParams();
    if (opts?.runType) params.set('runType', opts.runType);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`/ai/projects/${projectId}/usage/runs${qs}`);
  },

  /**
   * Evaluate AI usage quota for a project/action combination (AI-USAGE v2).
   * Used by the Playbooks page to "predict before prevent" and show warnings/blocks.
   */
  getProjectAiUsageQuota: (
    projectId: string,
    params: { action: 'PREVIEW_GENERATE' | 'DRAFT_GENERATE' },
  ): Promise<AiUsageQuotaEvaluation> => {
    const search = new URLSearchParams({ action: params.action }).toString();
    const qs = search ? `?${search}` : '';
    return fetchWithAuth(`/ai/projects/${projectId}/usage/quota${qs}`);
  },
};

export const productsApi = {
  list: (projectId: string) => fetchWithAuth(`/projects/${projectId}/products`),

  getAnswerBlocks: (productId: string) =>
    fetchWithAuth(`/products/${productId}/answer-blocks`),

  upsertAnswerBlocks: (productId: string, blocks: any[]) =>
    fetchWithAuth(`/products/${productId}/answer-blocks`, {
      method: 'POST',
      body: JSON.stringify({ blocks }),
    }),

  triggerAnswerBlockAutomation: (
    productId: string,
    triggerType: 'product_synced' | 'issue_detected' = 'issue_detected',
  ) =>
    fetchWithAuth(`/products/${productId}/answer-blocks/automation-run`, {
      method: 'POST',
      body: JSON.stringify({ triggerType }),
    }),

  getAnswerBlockAutomationLogs: (productId: string) =>
    fetchWithAuth(`/products/${productId}/automation-logs`),

  syncAnswerBlocksToShopify: (productId: string) =>
    fetchWithAuth(`/products/${productId}/answer-blocks/sync-to-shopify`, {
      method: 'POST',
    }),

  // MEDIA-1: Media & Accessibility endpoints
  getMediaAccessibility: (productId: string): Promise<{
    stats: ProductMediaStats;
    images: ProductImageView[];
    openDrafts: MediaFixDraft[];
  }> =>
    fetchWithAuth(`/products/${productId}/media`),

  previewMediaFix: (
    productId: string,
    params: MediaFixPreviewRequest,
  ): Promise<MediaFixPreviewResponse> =>
    fetchWithAuth(`/products/${productId}/media/preview`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  applyMediaFix: (
    productId: string,
    params: MediaFixApplyRequest,
  ): Promise<MediaFixApplyResponse> =>
    fetchWithAuth(`/products/${productId}/media/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // GEO-FOUNDATION-1: GEO Readiness endpoints
  getGeoReadiness: (productId: string): Promise<ProductGeoReadinessResponse> =>
    fetchWithAuth(`/products/${productId}/geo`),

  previewGeoFix: (
    productId: string,
    params: { questionId: string; issueType: string },
  ): Promise<GeoFixPreviewResponse> =>
    fetchWithAuth(`/products/${productId}/geo/preview`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  applyGeoFix: (
    productId: string,
    params: { draftId: string },
  ): Promise<GeoFixApplyResponse> =>
    fetchWithAuth(`/products/${productId}/geo/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};

// =============================================================================
// SEARCH-INTENT-1: Search & Intent API
// =============================================================================

export type SearchIntentType =
  | 'informational'
  | 'comparative'
  | 'transactional'
  | 'problem_use_case'
  | 'trust_validation';

export type IntentCoverageStatus = 'none' | 'weak' | 'partial' | 'covered';

export type IntentFixDraftType = 'answer_block' | 'content_snippet' | 'metadata_guidance';

export type IntentFixApplyTarget = 'ANSWER_BLOCK' | 'CONTENT_SNIPPET_SECTION';

export interface ProductIntentCoverage {
  productId: string;
  intentType: SearchIntentType;
  score: number;
  coverageStatus: IntentCoverageStatus;
  missingQueries: string[];
  weakQueries: string[];
  coveredQueries: string[];
  expectedQueries: string[];
  computedAt: string;
}

export interface IntentFixDraft {
  id: string;
  productId: string;
  intentType: SearchIntentType;
  query: string;
  draftType: IntentFixDraftType;
  draftPayload: {
    question?: string;
    answer?: string;
    snippet?: string;
    titleSuggestion?: string;
    descriptionSuggestion?: string;
  };
  aiWorkKey: string;
  reusedFromWorkKey?: string;
  generatedWithAi: boolean;
  generatedAt: string;
  expiresAt?: string;
}

export interface ProductSearchIntentResponse {
  productId: string;
  coverage: ProductIntentCoverage[];
  scorecard: {
    overallScore: number;
    status: 'Good' | 'Needs improvement';
    missingHighValueIntents: number;
  };
  openDrafts: IntentFixDraft[];
}

export interface SearchIntentScorecard {
  overallScore: number;
  intentBreakdown: {
    intentType: SearchIntentType;
    label: string;
    score: number;
    status: IntentCoverageStatus;
    productsWithGaps: number;
  }[];
  missingHighValueIntents: number;
  status: 'Good' | 'Needs improvement';
  totalProducts: number;
  computedAt: string;
}

export interface IntentFixPreviewResponse {
  draft: IntentFixDraft;
  generatedWithAi: boolean;
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

export interface IntentFixApplyResponse {
  success: boolean;
  updatedCoverage: ProductIntentCoverage[];
  issuesResolved: boolean;
  issuesResolvedCount: number;
}

export const searchIntentApi = {
  /**
   * Get product search intent data including coverage, scorecard, and open drafts.
   */
  getProductSearchIntent: (productId: string): Promise<ProductSearchIntentResponse> =>
    fetchWithAuth(`/products/${productId}/search-intent`),

  /**
   * Preview an intent fix - generates or retrieves a cached draft.
   * Draft-first pattern: AI is only called if no cached draft exists.
   */
  previewIntentFix: (
    productId: string,
    params: {
      intentType: SearchIntentType;
      query: string;
      fixType: IntentFixDraftType;
    },
  ): Promise<IntentFixPreviewResponse> =>
    fetchWithAuth(`/products/${productId}/search-intent/preview`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /**
   * Apply an intent fix draft.
   * No AI call - persists the draft content to appropriate storage.
   */
  applyIntentFix: (
    productId: string,
    params: {
      draftId: string;
      applyTarget: IntentFixApplyTarget;
    },
  ): Promise<IntentFixApplyResponse> =>
    fetchWithAuth(`/products/${productId}/search-intent/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /**
   * Get project-level Search & Intent scorecard.
   */
  getProjectSearchIntentSummary: (projectId: string): Promise<SearchIntentScorecard> =>
    fetchWithAuth(`/projects/${projectId}/search-intent/summary`),
};

// ============================================================================
// Competitive Positioning API (COMPETITORS-1)
// ============================================================================

export type CompetitorGapType = 'intent_gap' | 'content_section_gap' | 'trust_signal_gap';

export type CompetitiveCoverageAreaId =
  | 'transactional_intent'
  | 'comparative_intent'
  | 'problem_use_case_intent'
  | 'trust_validation_intent'
  | 'informational_intent'
  | 'comparison_section'
  | 'why_choose_section'
  | 'buying_guide_section'
  | 'feature_benefits_section'
  | 'faq_coverage'
  | 'reviews_section'
  | 'guarantee_section';

export type CompetitiveStatus = 'Ahead' | 'On par' | 'Behind';

export type CompetitiveFixDraftType = 'answer_block' | 'comparison_copy' | 'positioning_section';

export type CompetitiveFixApplyTarget = 'ANSWER_BLOCK' | 'CONTENT_SECTION' | 'WHY_CHOOSE_SECTION';

export interface ProductCompetitorRef {
  id: string;
  displayName: string;
  logoUrl?: string;
  homepageUrl?: string;
  source: 'heuristic_collection' | 'heuristic_category' | 'merchant_configured';
}

export interface CompetitiveCoverageArea {
  areaId: CompetitiveCoverageAreaId;
  gapType: CompetitorGapType;
  intentType?: SearchIntentType;
  merchantCovers: boolean;
  oneCompetitorCovers: boolean;
  twoOrMoreCompetitorsCovers: boolean;
  severityWeight: number;
  gapDescription?: string;
  exampleScenario?: string;
}

export interface ProductCompetitiveCoverage {
  productId: string;
  competitors: ProductCompetitorRef[];
  coverageAreas: CompetitiveCoverageArea[];
  overallScore: number;
  areasWhereCompetitorsLead: number;
  status: CompetitiveStatus;
  computedAt: string;
}

export interface CompetitiveFixGap {
  id: string;
  productId: string;
  gapType: CompetitorGapType;
  intentType?: SearchIntentType;
  areaId: CompetitiveCoverageAreaId;
  exampleScenario: string;
  whyItMatters: string;
  competitorCount: number;
  recommendedAction: 'answer_block' | 'comparison_section' | 'description_expansion' | 'faq_section';
  severity: 'critical' | 'warning' | 'info';
  automationAvailable: boolean;
}

export interface CompetitiveFixDraft {
  id: string;
  productId: string;
  gapType: CompetitorGapType;
  intentType?: SearchIntentType;
  areaId: CompetitiveCoverageAreaId;
  draftType: CompetitiveFixDraftType;
  draftPayload: {
    question?: string;
    answer?: string;
    comparisonText?: string;
    positioningContent?: string;
    placementGuidance?: string;
  };
  aiWorkKey: string;
  reusedFromWorkKey?: string;
  generatedWithAi: boolean;
  generatedAt: string;
  expiresAt?: string;
}

export interface ProductCompetitiveResponse {
  productId: string;
  competitors: ProductCompetitorRef[];
  coverage: ProductCompetitiveCoverage;
  gaps: CompetitiveFixGap[];
  openDrafts: CompetitiveFixDraft[];
}

export interface CompetitiveScorecard {
  overallScore: number;
  gapBreakdown: {
    gapType: CompetitorGapType;
    label: string;
    productsWithGaps: number;
    averageScore: number;
  }[];
  productsBehind: number;
  productsOnPar: number;
  productsAhead: number;
  status: CompetitiveStatus;
  totalProducts: number;
  computedAt: string;
}

export interface CompetitiveFixPreviewResponse {
  draft: CompetitiveFixDraft;
  generatedWithAi: boolean;
  aiUsage?: {
    tokensUsed: number;
    latencyMs: number;
  };
}

export interface CompetitiveFixApplyResponse {
  success: boolean;
  updatedCoverage: ProductCompetitiveCoverage;
  issuesResolved: boolean;
  issuesResolvedCount: number;
}

export const competitorsApi = {
  /**
   * Get product competitive data including coverage, gaps, and open drafts.
   */
  getProductCompetitors: (productId: string): Promise<ProductCompetitiveResponse> =>
    fetchWithAuth(`/products/${productId}/competitors`),

  /**
   * Preview a competitive fix - generates or retrieves a cached draft.
   * Draft-first pattern: AI is only called if no cached draft exists.
   */
  previewCompetitiveFix: (
    productId: string,
    params: {
      gapType: CompetitorGapType;
      intentType?: SearchIntentType;
      areaId: CompetitiveCoverageAreaId;
      draftType: CompetitiveFixDraftType;
    },
  ): Promise<CompetitiveFixPreviewResponse> =>
    fetchWithAuth(`/products/${productId}/competitors/preview`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /**
   * Apply a competitive fix draft.
   * No AI call - persists the draft content to appropriate storage.
   */
  applyCompetitiveFix: (
    productId: string,
    params: {
      draftId: string;
      applyTarget: CompetitiveFixApplyTarget;
    },
  ): Promise<CompetitiveFixApplyResponse> =>
    fetchWithAuth(`/products/${productId}/competitors/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /**
   * Get project-level Competitive Positioning scorecard.
   */
  getProjectCompetitiveScorecard: (projectId: string): Promise<CompetitiveScorecard> =>
    fetchWithAuth(`/projects/${projectId}/competitors/scorecard`),
};

export const shopifyApi = {
  syncProducts: (projectId: string) =>
    fetchWithAuth(`/shopify/sync-products?projectId=${projectId}`, {
      method: 'POST',
    }),

  updateProductSeo: (productId: string, seoTitle: string, seoDescription: string) =>
    fetchWithAuth('/shopify/update-product-seo', {
      method: 'POST',
      body: JSON.stringify({ productId, seoTitle, seoDescription }),
    }),

  ensureMetafieldDefinitions: (projectId: string) =>
    fetchWithAuth(`/shopify/ensure-metafield-definitions?projectId=${projectId}`, {
      method: 'POST',
    }),
};

/**
 * Two-Factor Authentication API - for managing 2FA settings (authenticated)
 */
export const twoFactorApi = {
  /** Initialize 2FA setup - returns QR code and otpauth URL */
  setupInit: () =>
    fetchWithAuth('/2fa/setup-init', {
      method: 'POST',
    }),

  /** Enable 2FA after verifying TOTP code */
  enable: (code: string) =>
    fetchWithAuth('/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  /** Disable 2FA */
  disable: (code?: string) =>
    fetchWithAuth('/2fa/disable', {
      method: 'POST',
      body: JSON.stringify(code ? { code } : {}),
    }),
};

/**
 * Two-Factor Auth Login API - for 2FA verification during login (unauthenticated)
 */
export const twoFactorAuthApi = {
  /** Verify 2FA code during login - uses tempToken, not JWT */
  verify: (tempToken: string, code: string) =>
    fetchWithoutAuth('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    }),
};

/**
 * Billing API - for managing subscriptions
 */
export const billingApi = {
  /** Get available subscription plans */
  getPlans: () => fetchWithAuth('/billing/plans'),

  /** Get current user's subscription */
  getSubscription: () => fetchWithAuth('/billing/subscription'),

  /** Get current user's entitlements (plan limits and usage) */
  getEntitlements: () => fetchWithAuth('/billing/entitlements'),

  /** Get combined billing summary (subscription + entitlements) */
  getSummary: () => fetchWithAuth('/billing/summary'),

  /** Create a Stripe Checkout session for upgrading */
  createCheckoutSession: (planId: string) =>
    fetchWithAuth('/billing/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  /** Create a Stripe Billing Portal session for managing subscription */
  createPortalSession: () =>
    fetchWithAuth('/billing/create-portal-session', {
      method: 'POST',
    }),

  /** Subscribe to a plan (legacy/admin) */
  subscribe: (planId: string) =>
    fetchWithAuth('/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  /** Cancel subscription (legacy) */
  cancel: () =>
    fetchWithAuth('/billing/cancel', {
      method: 'POST',
    }),
};

/**
 * [ADMIN-OPS-1] Admin API - for admin-only operations
 * Extends with new endpoints for the Support & Management Operations Dashboard.
 */
export const adminApi = {
  // ===========================================================================
  // [D1] Overview
  // ===========================================================================

  /** Get executive snapshot overview */
  getOverview: () => fetchWithAuth('/admin/overview'),

  /** Get admin dashboard statistics (legacy) */
  getStats: () => fetchWithAuth('/admin/stats'),

  // ===========================================================================
  // [D2] Users
  // ===========================================================================

  /** Get all users with pagination and expanded details */
  getUsers: (page = 1, limit = 20) =>
    fetchWithAuth(`/admin/users?page=${page}&limit=${limit}`),

  /** Get a single user by ID with admin context */
  getUser: (userId: string) => fetchWithAuth(`/admin/users/${userId}`),

  /** Start read-only impersonation (SUPPORT_AGENT + OPS_ADMIN only) */
  impersonateUser: (userId: string, reason?: string) =>
    fetchWithAuth(`/admin/users/${userId}/impersonate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** Update user's subscription/plan (OPS_ADMIN only) */
  updateUserSubscription: (userId: string, planId: string) =>
    fetchWithAuth(`/admin/users/${userId}/subscription`, {
      method: 'PUT',
      body: JSON.stringify({ planId }),
    }),

  /** Reset AI quota for user (OPS_ADMIN only) */
  resetUserQuota: (userId: string, reason?: string) =>
    fetchWithAuth(`/admin/users/${userId}/quota-reset`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** Assign internal admin role (OPS_ADMIN only) */
  updateAdminRole: (userId: string, adminRole: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null) =>
    fetchWithAuth(`/admin/users/${userId}/admin-role`, {
      method: 'PUT',
      body: JSON.stringify({ adminRole }),
    }),

  /** Update user role (legacy) */
  updateUserRole: (userId: string, role: 'USER' | 'ADMIN') =>
    fetchWithAuth(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  // ===========================================================================
  // [D3] Projects
  // ===========================================================================

  /** Get all projects with admin details */
  getProjects: (page = 1, limit = 20) =>
    fetchWithAuth(`/admin/projects?page=${page}&limit=${limit}`),

  /** Trigger safe resync for a project (no AI side effects) */
  resyncProject: (projectId: string) =>
    fetchWithAuth(`/admin/projects/${projectId}/resync`, {
      method: 'POST',
    }),

  // ===========================================================================
  // [D4] Runs
  // ===========================================================================

  /** Get runs with filters */
  getRuns: (filters?: {
    projectId?: string;
    runType?: string;
    status?: string;
    aiUsed?: boolean;
    reused?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', filters.projectId);
    if (filters?.runType) params.set('runType', filters.runType);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.aiUsed !== undefined) params.set('aiUsed', String(filters.aiUsed));
    if (filters?.reused !== undefined) params.set('reused', String(filters.reused));
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`/admin/runs${qs}`);
  },

  /** Get run detail with redacted inputs */
  getRun: (runId: string) => fetchWithAuth(`/admin/runs/${runId}`),

  /** Retry a failed run (safe runs only) */
  retryRun: (runId: string) =>
    fetchWithAuth(`/admin/runs/${runId}/retry`, {
      method: 'POST',
    }),

  // ===========================================================================
  // [D5] Issues
  // ===========================================================================

  /** Get global issues summary (derived, no AI calls) */
  getIssuesSummary: () => fetchWithAuth('/admin/issues/summary'),

  // ===========================================================================
  // [D6] AI Usage
  // ===========================================================================

  /** Get AI usage metrics with APPLY invariant check */
  getAiUsage: () => fetchWithAuth('/admin/ai-usage'),

  // ===========================================================================
  // [D7] System Health
  // ===========================================================================

  /** Get system health signals */
  getSystemHealth: () => fetchWithAuth('/admin/system-health'),

  // ===========================================================================
  // [D8] Audit Log
  // ===========================================================================

  /** Get audit log with filters */
  getAuditLog: (filters?: {
    actorId?: string;
    targetUserId?: string;
    targetProjectId?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.actorId) params.set('actorId', filters.actorId);
    if (filters?.targetUserId) params.set('targetUserId', filters.targetUserId);
    if (filters?.targetProjectId) params.set('targetProjectId', filters.targetProjectId);
    if (filters?.actionType) params.set('actionType', filters.actionType);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`/admin/audit-log${qs}`);
  },

  // ===========================================================================
  // [D9] Governance Audit Events (ENTERPRISE-GEO-1)
  // ===========================================================================

  /**
   * [ENTERPRISE-GEO-1] Get governance audit events with filters.
   * Read-only access to project-level governance audit events.
   */
  getGovernanceAuditEvents: (filters?: {
    projectId?: string;
    actorUserId?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<GovernanceAuditEventsResponse> => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', filters.projectId);
    if (filters?.actorUserId) params.set('actorUserId', filters.actorUserId);
    if (filters?.eventType) params.set('eventType', filters.eventType);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`/admin/governance-audit-events${qs}`);
  },
};

/** [ENTERPRISE-GEO-1] Governance audit event response types */
export interface GovernanceAuditEvent {
  id: string;
  createdAt: string;
  eventType: string;
  actorUserId: string | null;
  actorEmail: string | null;
  resourceType: string | null;
  resourceId: string | null;
  projectId: string;
  projectName: string | null;
  metadata: Record<string, unknown> | null;
}

export interface GovernanceAuditEventsResponse {
  events: GovernanceAuditEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Contact API - for public contact form
 */
export const contactApi = {
  /** Submit contact form (public, requires CAPTCHA) */
  submit: (data: { name: string; email: string; message: string; captchaToken: string }) =>
    fetchWithoutAuth('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// [SELF-SERVICE-1] Account API - Customer Self-Service Control Plane
// =============================================================================

export interface AccountProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  locale: string | null;
  organizationName: string | null;
  accountRole: 'OWNER' | 'EDITOR' | 'VIEWER';
  lastLoginAt: string | null;
}

export interface AccountPreferences {
  notifyQuotaWarnings: boolean;
  notifyRunFailures: boolean;
  notifyWeeklyDeoSummary: boolean;
  autoOpenIssuesTab: boolean;
  preferredPillarLanding: string | null;
}

export interface AccountAiUsageSummary {
  month: string;
  periodLabel: string;
  totalRuns: number;
  aiUsedRuns: number;
  reusedRuns: number;
  runsAvoided: number;
  quotaLimit: number | null;
  quotaUsedPercent: number;
  applyInvariantViolations: number;
  applyInvariantMessage: string;
  reuseMessage: string;
}

export interface AccountConnectedStore {
  projectId: string;
  projectName: string;
  storeDomain: string | null;
  integrationType: string;
  integrationId: string;
  connectedAt: string;
}

export interface AccountSession {
  id: string;
  createdAt: string;
  lastSeenAt: string | null;
  ip: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

/**
 * [SELF-SERVICE-1] Account API
 *
 * Customer-facing self-service endpoints.
 * No AI side effects from any of these endpoints.
 */
export const accountApi = {
  /** Get current user's profile */
  getProfile: (): Promise<AccountProfile> => fetchWithAuth('/account/profile'),

  /** Update profile (name, avatar, timezone, locale, organizationName) */
  updateProfile: (data: {
    name?: string;
    avatarUrl?: string | null;
    timezone?: string | null;
    locale?: string | null;
    organizationName?: string | null;
  }): Promise<AccountProfile> =>
    fetchWithAuth('/account/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Get current user's preferences */
  getPreferences: (): Promise<AccountPreferences> =>
    fetchWithAuth('/account/preferences'),

  /** Update preferences (VIEWER cannot update) */
  updatePreferences: (data: Partial<AccountPreferences>): Promise<AccountPreferences> =>
    fetchWithAuth('/account/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Get AI usage summary for current month */
  getAiUsage: (): Promise<AccountAiUsageSummary> =>
    fetchWithAuth('/account/ai-usage'),

  /** Get connected Shopify stores */
  getStores: (): Promise<AccountConnectedStore[]> =>
    fetchWithAuth('/account/stores'),

  /** Disconnect a Shopify store (OWNER only) */
  disconnectStore: (projectId: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`/account/stores/${projectId}/disconnect`, {
      method: 'POST',
    }),

  /** Get active sessions */
  getSessions: (): Promise<AccountSession[]> =>
    fetchWithAuth('/account/sessions'),

  /** Sign out all sessions (invalidates all tokens) */
  signOutAllSessions: (): Promise<{ revokedCount: number }> =>
    fetchWithAuth('/account/sessions/sign-out-all', {
      method: 'POST',
    }),
};

/**
 * [GEO-EXPORT-1] Public API (no auth required)
 */
export const publicApi = {
  /** Get public GEO report share view */
  getGeoReportShareView: async (shareToken: string): Promise<GeoReportPublicShareViewResponse> => {
    const response = await fetch(`${API_URL}/public/geo-reports/${shareToken}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch share view');
    }
    return response.json();
  },

  /** [ENTERPRISE-GEO-1] Verify passcode and get protected share view */
  verifyAndGetGeoReportShareView: async (
    shareToken: string,
    passcode: string,
  ): Promise<GeoReportPublicShareViewResponse> => {
    const response = await fetch(`${API_URL}/public/geo-reports/${shareToken}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    if (!response.ok) {
      throw new Error('Failed to verify passcode');
    }
    return response.json();
  },
};
