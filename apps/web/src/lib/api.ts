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
 */
function buildApiError(response: Response, body: unknown): ApiError {
  let message: string;
  let code: string | undefined;

  // Try to extract message and code from JSON body
  if (body && typeof body === 'object') {
    const json = body as Record<string, unknown>;
    if (typeof json.message === 'string' && json.message) {
      message = json.message;
    } else if (typeof json.error === 'string' && json.error) {
      message = json.error;
    } else {
      message = getStatusMessage(response.status, response.statusText);
    }
    if (typeof json.code === 'string') {
      code = json.code;
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

  automationPlaybookEstimate: (id: string, playbookId: AutomationPlaybookId) =>
    fetchWithAuth(
      `/projects/${id}/automation-playbooks/estimate?playbookId=${encodeURIComponent(
        playbookId,
      )}`,
    ),

  /**
   * Preview an automation playbook - creates/updates a backend draft with sample suggestions.
   * Returns scopeId, rulesHash, and sample preview items that can be used for the full apply flow.
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
  ) =>
    fetchWithAuth(`/projects/${id}/automation-playbooks/${playbookId}/preview`, {
      method: 'POST',
      body: JSON.stringify({ rules, sampleSize }),
    }),

  applyAutomationPlaybook: (
    id: string,
    playbookId: AutomationPlaybookId,
    scopeId: string,
    rulesHash: string,
  ): Promise<AutomationPlaybookApplyResult> =>
    fetchWithAuth(
      `/projects/${id}/automation-playbooks/apply`,
      {
        method: 'POST',
        body: JSON.stringify({ playbookId, scopeId, rulesHash }),
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
 * Admin API - for admin-only operations
 */
export const adminApi = {
  /** Get admin dashboard statistics */
  getStats: () => fetchWithAuth('/admin/stats'),

  /** Get all users with pagination */
  getUsers: (page = 1, limit = 20) =>
    fetchWithAuth(`/admin/users?page=${page}&limit=${limit}`),

  /** Get a single user by ID */
  getUser: (userId: string) => fetchWithAuth(`/admin/users/${userId}`),

  /** Update user role */
  updateUserRole: (userId: string, role: 'USER' | 'ADMIN') =>
    fetchWithAuth(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  /** Update user's subscription (admin override) */
  updateUserSubscription: (userId: string, planId: string) =>
    fetchWithAuth(`/admin/users/${userId}/subscription`, {
      method: 'PUT',
      body: JSON.stringify({ planId }),
    }),
};

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
