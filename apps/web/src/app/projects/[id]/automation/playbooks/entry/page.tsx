'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import { productsApi, projectsApi, type AutomationPlaybookId } from '@/lib/api';
import type { Product } from '@/lib/products';
// [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5] Use centralized routing helpers
// [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Route to list for deterministic selection
import {
  buildPlaybooksListHref,
  navigateToPlaybooksList,
} from '@/lib/playbooks-routing';
// [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Shell header integration
import { useCenterPaneHeader } from '@/components/layout/CenterPaneHeaderProvider';

type EntryIntent =
  | 'missing_metadata'
  | 'search_intent'
  | 'content'
  | 'competitive'
  | 'offsite'
  | 'local'
  | 'unknown';
type ScopeOption =
  | 'ONLY_SELECTED'
  | 'ALL_EXISTING'
  | 'NEW_ONLY'
  | 'EXISTING_AND_NEW';
type TriggerOption = 'manual_only' | 'on_creation' | 'scheduled';

type EntryContextV1 = {
  version: 1;
  createdAt: string;
  source: 'products_bulk' | 'product_details' | 'playbooks';
  intent: EntryIntent;
  selectedProductIds?: string[];
};
type PreviewPair = {
  playbookId: AutomationPlaybookId;
  scopeId: string;
  rulesHash: string;
  samples: Array<{
    productId: string;
    productTitle: string;
    field: 'seoTitle' | 'seoDescription';
    currentTitle: string;
    currentDescription: string;
    rawSuggestion: string;
    finalSuggestion: string;
    ruleWarnings: string[];
  }>;
};
const ENTRY_CONTEXT_KEY = (projectId: string) =>
  `automationEntryContext:${projectId}`;
const ENTRY_SCOPE_KEY = (projectId: string) =>
  `automationEntryScope:${projectId}`;

export default function AutomationPlaybooksEntryPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const sourceParam = (searchParams.get('source') ??
    'playbooks') as EntryContextV1['source'];
  const intentParam = (searchParams.get('intent') ??
    'missing_metadata') as EntryIntent;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [entryContext, setEntryContext] = useState<EntryContextV1 | null>(null);
  const [scopeOption, setScopeOption] = useState<ScopeOption>('ALL_EXISTING');
  const [trigger, setTrigger] = useState<TriggerOption>('manual_only');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [titlePreview, setTitlePreview] = useState<PreviewPair | null>(null);
  const [descriptionPreview, setDescriptionPreview] =
    useState<PreviewPair | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [enableLoading, setEnableLoading] = useState(false);
  const [enabledAt, setEnabledAt] = useState<string | null>(null);

  // [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Shell header integration
  const { setHeader } = useCenterPaneHeader();

  const intentSummary = useMemo(() => {
    if (intentParam === 'missing_metadata') {
      return 'Automatically generate missing metadata drafts for products that need it.';
    }
    if (intentParam === 'search_intent') {
      return 'Automatically generate search intent drafts for products that need it.';
    }
    if (intentParam === 'content') {
      return 'Automatically generate content drafts for products that need it.';
    }
    return 'Create an automation playbook entry.';
  }, [intentParam]);

  const supportedIntent = intentParam === 'missing_metadata';

  const missingMetadataIds = useMemo(() => {
    return products
      .filter((p) => {
        const missingTitle = !p.seoTitle || !p.seoTitle.trim();
        const missingDescription =
          !p.seoDescription || !p.seoDescription.trim();
        return missingTitle || missingDescription;
      })
      .map((p) => p.id);
  }, [products]);

  const selectedProductIds = useMemo(() => {
    return entryContext?.selectedProductIds ?? [];
  }, [entryContext]);

  const effectiveScopeIds = useMemo(() => {
    if (scopeOption === 'ONLY_SELECTED') {
      return selectedProductIds;
    }
    if (scopeOption === 'ALL_EXISTING') {
      return missingMetadataIds;
    }
    return [];
  }, [scopeOption, selectedProductIds, missingMetadataIds]);

  const scopedProducts = useMemo(() => {
    const scopeSet = new Set(effectiveScopeIds);
    return products.filter((p) => scopeSet.has(p.id));
  }, [products, effectiveScopeIds]);

  const canGeneratePreview =
    supportedIntent &&
    effectiveScopeIds.length > 0 &&
    trigger === 'manual_only';

  const previewPresent =
    (titlePreview?.samples?.length ?? 0) > 0 ||
    (descriptionPreview?.samples?.length ?? 0) > 0;

  const canEnable =
    supportedIntent &&
    trigger === 'manual_only' &&
    previewPresent &&
    !!titlePreview &&
    !!descriptionPreview &&
    !enableLoading;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Set shell header
  useEffect(() => {
    setHeader({
      breadcrumbs: `Playbooks`,
      title: 'New Playbook',
      description: intentSummary,
    });
  }, [setHeader, intentSummary]);

  useEffect(() => {
    const key = ENTRY_CONTEXT_KEY(projectId);
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as EntryContextV1;
        setEntryContext(parsed);
        const hasSelected = (parsed.selectedProductIds ?? []).length > 0;
        setScopeOption(hasSelected ? 'ONLY_SELECTED' : 'ALL_EXISTING');
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }
    const fallback: EntryContextV1 = {
      version: 1,
      createdAt: new Date().toISOString(),
      source: sourceParam,
      intent: intentParam,
      selectedProductIds: [],
    };
    setEntryContext(fallback);
    setScopeOption('ALL_EXISTING');
    try {
      sessionStorage.setItem(key, JSON.stringify(fallback));
    } catch {
      // ignore
    }
    setLoading(false);
  }, [projectId, sourceParam, intentParam]);

  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      try {
        setError(null);
        const data = await productsApi.list(projectId);
        if (cancelled) return;
        setProducts(data);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load products'
        );
      }
    }
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const generatePreview = useCallback(async () => {
    if (!canGeneratePreview) return;
    setPreviewLoading(true);
    setError(null);
    setTitlePreview(null);
    setDescriptionPreview(null);
    const scopeProductIds =
      scopeOption === 'ONLY_SELECTED' ? effectiveScopeIds : undefined;
    try {
      const [title, description] = (await Promise.all([
        projectsApi.previewAutomationPlaybook(
          projectId,
          'missing_seo_title',
          undefined,
          3,
          scopeProductIds
        ),
        projectsApi.previewAutomationPlaybook(
          projectId,
          'missing_seo_description',
          undefined,
          3,
          scopeProductIds
        ),
      ])) as [PreviewPair, PreviewPair];
      setTitlePreview(title);
      setDescriptionPreview(description);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate preview'
      );
    } finally {
      setPreviewLoading(false);
    }
  }, [canGeneratePreview, projectId, scopeOption, effectiveScopeIds]);

  const persistScopeForPlaybooks = useCallback(() => {
    if (scopeOption !== 'ONLY_SELECTED') return;
    try {
      sessionStorage.setItem(
        ENTRY_SCOPE_KEY(projectId),
        JSON.stringify({ productIds: effectiveScopeIds })
      );
    } catch {
      // ignore
    }
  }, [projectId, scopeOption, effectiveScopeIds]);

  const enableAutomation = useCallback(async () => {
    if (!canEnable || !titlePreview || !descriptionPreview) return;
    setEnableLoading(true);
    setError(null);
    persistScopeForPlaybooks();
    const scopeProductIds =
      scopeOption === 'ONLY_SELECTED' ? effectiveScopeIds : undefined;
    try {
      await Promise.all([
        projectsApi.setAutomationPlaybookEntryConfig(
          projectId,
          'missing_seo_title',
          {
            enabled: true,
            trigger: 'manual_only',
            scopeId: titlePreview.scopeId,
            rulesHash: titlePreview.rulesHash,
            scopeProductIds,
            intent: intentParam,
          }
        ),
        projectsApi.setAutomationPlaybookEntryConfig(
          projectId,
          'missing_seo_description',
          {
            enabled: true,
            trigger: 'manual_only',
            scopeId: descriptionPreview.scopeId,
            rulesHash: descriptionPreview.rulesHash,
            scopeProductIds,
            intent: intentParam,
          }
        ),
      ]);
      setEnabled(true);
      setEnabledAt(new Date().toISOString());
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to enable automation'
      );
    } finally {
      setEnableLoading(false);
    }
  }, [
    canEnable,
    titlePreview,
    descriptionPreview,
    projectId,
    scopeOption,
    effectiveScopeIds,
    intentParam,
    persistScopeForPlaybooks,
  ]);

  const disableAutomation = useCallback(async () => {
    if (!titlePreview || !descriptionPreview) return;
    setEnableLoading(true);
    setError(null);
    const scopeProductIds =
      scopeOption === 'ONLY_SELECTED' ? effectiveScopeIds : undefined;
    try {
      await Promise.all([
        projectsApi.setAutomationPlaybookEntryConfig(
          projectId,
          'missing_seo_title',
          {
            enabled: false,
            trigger: 'manual_only',
            scopeId: titlePreview.scopeId,
            rulesHash: titlePreview.rulesHash,
            scopeProductIds,
            intent: intentParam,
          }
        ),
        projectsApi.setAutomationPlaybookEntryConfig(
          projectId,
          'missing_seo_description',
          {
            enabled: false,
            trigger: 'manual_only',
            scopeId: descriptionPreview.scopeId,
            rulesHash: descriptionPreview.rulesHash,
            scopeProductIds,
            intent: intentParam,
          }
        ),
      ]);
      setEnabled(false);
      setEnabledAt(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to disable automation'
      );
    } finally {
      setEnableLoading(false);
    }
  }, [
    titlePreview,
    descriptionPreview,
    projectId,
    scopeOption,
    effectiveScopeIds,
    intentParam,
  ]);

  const handleViewAutomation = useCallback(() => {
    // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Route to Playbooks LIST for deterministic selection
    // DO NOT hardcode a run target - let the Playbooks page select based on eligibility counts
    persistScopeForPlaybooks();
    const scopeAssetRefs =
      scopeOption === 'ONLY_SELECTED' ? effectiveScopeIds : undefined;
    navigateToPlaybooksList(router, {
      projectId,
      source: 'entry',
      assetType:
        scopeAssetRefs && scopeAssetRefs.length > 0 ? 'PRODUCTS' : undefined,
      scopeAssetRefs,
    });
  }, [
    projectId,
    router,
    scopeOption,
    effectiveScopeIds,
    persistScopeForPlaybooks,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-gray-600">Loading playbook…</div>
      </div>
    );
  }

  return (
    <div>
      {/* [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] In-canvas breadcrumbs and header removed - shell header owns these */}

      {/* Action buttons row */}
      <div className="mb-6 flex items-center justify-end gap-2">
        {/* [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Stable CTA for Playwright/manual testing (no AI dependency) */}
        <button
          type="button"
          data-testid="automation-entry-open-playbooks"
          onClick={handleViewAutomation}
          className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          Open Playbooks
        </button>
        <Link
          href={buildPlaybooksListHref({ projectId })}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to playbooks
        </Link>
      </div>
      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}
      {!supportedIntent && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Coming soon</h2>
          <p className="mt-1 text-sm text-amber-800">
            This automation intent is not supported in v1. Only &ldquo;Fix
            missing metadata&rdquo; is available.
          </p>
        </div>
      )}
      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            What products does this apply to?
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Scope must be explicit before previews are generated.
          </p>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="scope"
                checked={scopeOption === 'ONLY_SELECTED'}
                onChange={() => setScopeOption('ONLY_SELECTED')}
                disabled={selectedProductIds.length === 0}
              />
              Only selected products
              {selectedProductIds.length > 0 && (
                <span className="text-xs text-gray-500">
                  ({selectedProductIds.length})
                </span>
              )}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="scope"
                checked={scopeOption === 'ALL_EXISTING'}
                onChange={() => setScopeOption('ALL_EXISTING')}
              />
              All existing products
              <span className="text-xs text-gray-500">
                ({missingMetadataIds.length} match)
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="radio" name="scope" disabled />
              New products only <span className="text-xs">(coming soon)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="radio" name="scope" disabled />
              Existing + new products{' '}
              <span className="text-xs">(coming soon)</span>
            </label>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium uppercase text-gray-600">
              Products in scope
            </div>
            <div className="max-h-48 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2 text-sm text-gray-800">
              {scopedProducts.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">
                  No products in scope.
                </div>
              ) : (
                <ul className="space-y-1">
                  {scopedProducts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded bg-white px-2 py-1"
                    >
                      <span className="truncate">{p.title}</span>
                      <Link
                        href={`/projects/${projectId}/products/${p.id}`}
                        className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            When should this run?
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            No silent triggers. Manual trigger only is supported in v1.
          </p>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="trigger"
                checked={trigger === 'manual_only'}
                onChange={() => setTrigger('manual_only')}
              />
              On manual trigger only
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="radio" name="trigger" disabled />
              On product creation <span className="text-xs">(coming soon)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="radio" name="trigger" disabled />
              On scheduled review <span className="text-xs">(coming soon)</span>
            </label>
          </div>
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Preview</h2>
              <p className="mt-1 text-xs text-gray-600">
                Sample preview is required before enablement.
              </p>
            </div>
            <button
              type="button"
              onClick={generatePreview}
              disabled={!canGeneratePreview || previewLoading}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewLoading
                ? 'Generating…'
                : 'Generate sample preview (uses AI)'}
            </button>
          </div>
          <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-medium">
              ⚡ This automation uses AI to generate drafts. Drafts are always
              reviewable before apply.
            </div>
            <div className="mt-1">
              Generates drafts only. Nothing is applied automatically.
            </div>
            <div className="mt-1">
              Apply does not use AI when a valid draft exists.
            </div>
          </div>
          {previewPresent && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-gray-700">
                Sample draft — not applied
              </div>
              <div className="space-y-3">
                {(() => {
                  const merged = new Map<
                    string,
                    {
                      productTitle: string;
                      title?: string;
                      description?: string;
                    }
                  >();
                  for (const s of titlePreview?.samples ?? []) {
                    merged.set(s.productId, {
                      productTitle: s.productTitle,
                      title: s.finalSuggestion,
                    });
                  }
                  for (const s of descriptionPreview?.samples ?? []) {
                    const existing = merged.get(s.productId);
                    merged.set(s.productId, {
                      productTitle: existing?.productTitle ?? s.productTitle,
                      title: existing?.title,
                      description: s.finalSuggestion,
                    });
                  }
                  return Array.from(merged.entries())
                    .slice(0, 3)
                    .map(([productId, item]) => (
                      <div
                        key={productId}
                        className="rounded-md border border-gray-200 bg-white p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {item.productTitle}
                          </div>
                          <Link
                            href={`/projects/${projectId}/products/${productId}`}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View product
                          </Link>
                        </div>
                        {item.title && (
                          <div className="mb-2">
                            <div className="text-[11px] font-semibold uppercase text-gray-600">
                              Draft title
                            </div>
                            <div className="mt-1 rounded border border-gray-200 bg-gray-50 p-2 text-sm text-gray-900">
                              {item.title}
                            </div>
                          </div>
                        )}
                        {item.description && (
                          <div>
                            <div className="text-[11px] font-semibold uppercase text-gray-600">
                              Draft description
                            </div>
                            <div className="mt-1 rounded border border-gray-200 bg-gray-50 p-2 text-sm text-gray-900">
                              {item.description}
                            </div>
                          </div>
                        )}
                      </div>
                    ));
                })()}
              </div>
            </div>
          )}
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Enable</h2>
              <p className="mt-1 text-xs text-gray-600">
                Enable saves scope and rules. It does not generate drafts or
                apply changes.
              </p>
            </div>
            <button
              type="button"
              onClick={enableAutomation}
              disabled={!canEnable}
              className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enableLoading ? 'Enabling…' : 'Enable playbook'}
            </button>
          </div>
          {enabled && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
              <div className="text-sm font-semibold text-green-900">
                Playbook enabled
              </div>
              <div className="mt-1 text-xs text-green-800">
                Drafts will be generated when conditions are met.
              </div>
              {enabledAt && (
                <div className="mt-1 text-[11px] text-green-700">
                  Enabled at: {new Date(enabledAt).toLocaleString()}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleViewAutomation}
                  className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-green-800 shadow-sm ring-1 ring-green-200 hover:bg-green-50"
                >
                  View playbook
                </button>
                <button
                  type="button"
                  onClick={disableAutomation}
                  disabled={enableLoading}
                  className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  Disable playbook
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
