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
}

/**
 * Build the playbooks list URL.
 *
 * Shape: /projects/:projectId/playbooks?source=...
 */
export function buildPlaybooksListHref({
  projectId,
  source,
}: BuildPlaybooksListHrefArgs): string {
  if (!source) {
    return `/projects/${projectId}/playbooks`;
  }
  return `/projects/${projectId}/playbooks?source=${source}`;
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
