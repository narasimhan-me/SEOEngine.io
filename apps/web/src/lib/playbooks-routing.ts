/**
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Centralized Playbooks Routing Helper
 *
 * Single source of truth for building playbook-related URLs.
 * All entrypoints (banner CTA, tile click, Work Queue, etc.) must use this helper.
 *
 * Canonical route shape: /projects/:projectId/playbooks/:playbookId?step=preview|estimate|apply&source=<entrypoint>
 */

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { AutomationAssetType } from '@/lib/api';

export type PlaybookId = 'missing_seo_title' | 'missing_seo_description';
export type PlaybookRunStep = 'preview' | 'estimate' | 'apply';
export type PlaybookSource =
  | 'banner'
  | 'tile'
  | 'work_queue'
  | 'products_list'
  | 'next_deo_win'
  | 'entry'
  | 'product_details'
  | 'default';

export interface BuildPlaybookRunHrefArgs {
  projectId: string;
  playbookId: PlaybookId;
  step: PlaybookRunStep;
  source: PlaybookSource;
  /** Optional asset type for scoped playbook runs */
  assetType?: AutomationAssetType;
  /** Optional scoped asset refs (e.g., for PAGES/COLLECTIONS) */
  scopeAssetRefs?: string[];
  /** Additional query params to preserve */
  extraParams?: Record<string, string>;
}

/**
 * Build the canonical playbook run URL.
 *
 * Canonical shape: /projects/:projectId/playbooks/:playbookId?step=...&source=...
 *
 * Always includes step and source params.
 * Preserves asset scoping via assetType + scopeAssetRefs when provided.
 */
export function buildPlaybookRunHref({
  projectId,
  playbookId,
  step,
  source,
  assetType,
  scopeAssetRefs,
  extraParams,
}: BuildPlaybookRunHrefArgs): string {
  const params = new URLSearchParams();

  // Required params
  params.set('step', step);
  params.set('source', source);

  // Optional asset scoping
  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-3] Include assetType=PRODUCTS when scopeAssetRefs are present
  if (assetType && (assetType !== 'PRODUCTS' || (scopeAssetRefs && scopeAssetRefs.length > 0))) {
    params.set('assetType', assetType);
  }
  if (scopeAssetRefs && scopeAssetRefs.length > 0) {
    for (const ref of scopeAssetRefs) {
      params.append('scopeAssetRefs', ref);
    }
  }

  // Extra params (for preserving context like returnTo, returnLabel)
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) {
        params.set(key, value);
      }
    }
  }

  return `/projects/${projectId}/playbooks/${playbookId}?${params.toString()}`;
}

/**
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Safe builder that refuses scoped URLs without assetType.
 *
 * Returns null if scopeAssetRefs is present but assetType is missing (invalid scoped route).
 * Callers must handle null to prevent silent scope drops.
 */
export function buildPlaybookRunHrefOrNull(args: BuildPlaybookRunHrefArgs): string | null {
  const hasScope = !!args.scopeAssetRefs && args.scopeAssetRefs.length > 0;
  if (hasScope && !args.assetType) {
    console.error('[PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Invalid scoped Playbooks route: scopeAssetRefs present but assetType missing. Navigation aborted.', {
      playbookId: args.playbookId,
      step: args.step,
      source: args.source,
      scopeAssetRefsCount: args.scopeAssetRefs?.length ?? 0,
    });
    return null;
  }
  return buildPlaybookRunHref(args);
}

export interface BuildPlaybooksListHrefArgs {
  projectId: string;
  source?: PlaybookSource;
  /** Optional asset type for scoped playbook list */
  assetType?: AutomationAssetType;
  /** Optional scoped asset refs */
  scopeAssetRefs?: string[];
}

/**
 * Build the playbooks list URL.
 *
 * Shape: /projects/:projectId/playbooks?source=...&assetType=...&scopeAssetRefs=...
 *
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5] Extended to support scope params.
 */
export function buildPlaybooksListHref({
  projectId,
  source,
  assetType,
  scopeAssetRefs,
}: BuildPlaybooksListHrefArgs): string {
  const params = new URLSearchParams();

  if (source) {
    params.set('source', source);
  }

  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5] Include scope when present
  if (assetType && scopeAssetRefs && scopeAssetRefs.length > 0) {
    params.set('assetType', assetType);
    for (const ref of scopeAssetRefs) {
      params.append('scopeAssetRefs', ref);
    }
  }

  const queryString = params.toString();
  if (!queryString) {
    return `/projects/${projectId}/playbooks`;
  }
  return `/projects/${projectId}/playbooks?${queryString}`;
}

/**
 * Navigate to a playbook run URL using the router.
 *
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Uses guardrail to refuse invalid scoped routes.
 */
export function navigateToPlaybookRun(
  router: AppRouterInstance,
  args: BuildPlaybookRunHrefArgs,
): void {
  const href = buildPlaybookRunHrefOrNull(args);
  if (!href) return;
  router.push(href);
}

/**
 * Navigate to a playbook run URL using router.replace (deterministic, no history spam).
 *
 * Used for default selection where we want to avoid history pollution.
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Uses guardrail to refuse invalid scoped routes.
 */
export function navigateToPlaybookRunReplace(
  router: AppRouterInstance,
  args: BuildPlaybookRunHrefArgs,
): void {
  const href = buildPlaybookRunHrefOrNull(args);
  if (!href) return;
  router.replace(href);
}

/**
 * Check if a playbook ID is valid.
 */
export function isValidPlaybookId(id: string | null | undefined): id is PlaybookId {
  return id === 'missing_seo_title' || id === 'missing_seo_description';
}

/**
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5] Navigate to playbooks list URL using the router.
 */
export function navigateToPlaybooksList(
  router: AppRouterInstance,
  args: BuildPlaybooksListHrefArgs,
): void {
  router.push(buildPlaybooksListHref(args));
}

/**
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5] Explicit scope payload for playbook API calls and routing.
 *
 * This builder validates scope refs and returns a unified payload used for:
 * - API calls (eligibility, estimate, preview, apply) via scopeProductIds
 * - URL routing via assetType + scopeAssetRefs
 *
 * Validation rules:
 * - Empty scopeAssetRefs → returns {} (no scope)
 * - PRODUCTS: validates refs look like DB IDs (rejects refs containing ':' like page_handle:...)
 *   - If validation leaves zero valid IDs → returns {} (invalid scope)
 *   - Otherwise returns { scopeProductIds, assetType, scopeAssetRefs }
 * - PAGES/COLLECTIONS: returns { assetType, scopeAssetRefs } (no scopeProductIds)
 *
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Added scopeProductIds for API contract.
 */
export interface PlaybookScopePayload {
  /** For API calls: product IDs when assetType=PRODUCTS */
  scopeProductIds?: string[];
  /** For routing + API: the asset type */
  assetType?: AutomationAssetType;
  /** For routing: the scope refs (preserved in URL as repeated params) */
  scopeAssetRefs?: string[];
}

/**
 * Check if a ref looks like a valid product ID (not a handle-prefixed ref).
 * Rejects refs containing ':' (e.g., page_handle:foo, collection_handle:bar).
 */
function isValidProductIdRef(ref: string): boolean {
  return !ref.includes(':');
}

export function buildPlaybookScopePayload(
  assetType: AutomationAssetType | undefined,
  scopeAssetRefs: string[],
): PlaybookScopePayload {
  if (!scopeAssetRefs || scopeAssetRefs.length === 0) {
    return {};
  }

  if (assetType === 'PRODUCTS') {
    // Validate that refs look like product IDs (not handle-prefixed refs)
    const validProductIds = scopeAssetRefs.filter(isValidProductIdRef);
    if (validProductIds.length === 0) {
      // Invalid scope: no valid product IDs after filtering
      console.warn('[PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Invalid PRODUCTS scope: no valid product IDs after filtering.', {
        originalCount: scopeAssetRefs.length,
        filteredCount: 0,
      });
      return {};
    }
    return {
      scopeProductIds: validProductIds,
      assetType: 'PRODUCTS',
      scopeAssetRefs: validProductIds,
    };
  }

  if (assetType === 'PAGES' || assetType === 'COLLECTIONS') {
    return {
      assetType,
      scopeAssetRefs,
    };
  }

  // No assetType but has refs - treat as unscoped (defensive)
  return {};
}

/**
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Extract routing-only subset from scope payload.
 *
 * Returns { assetType, scopeAssetRefs } when scope is valid, {} otherwise.
 * Excludes scopeProductIds (API-only field) from routing args.
 */
export function getRoutingScopeFromPayload(
  payload: PlaybookScopePayload,
): { assetType?: AutomationAssetType; scopeAssetRefs?: string[] } {
  if (!payload.scopeAssetRefs || payload.scopeAssetRefs.length === 0) {
    return {};
  }
  return {
    assetType: payload.assetType,
    scopeAssetRefs: payload.scopeAssetRefs,
  };
}
