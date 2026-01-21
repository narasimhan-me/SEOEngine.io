/**
 * [SCOPE-CLARITY-1] Scope Normalization Utilities
 *
 * Single source of truth for normalizing scope params from URL.
 * Implements deterministic priority rules to prevent hidden stacking:
 *
 * Priority order (highest to lowest):
 * 1. Asset scope (assetType + assetId) - overrides everything
 * 2. Issue type scope (issueType) - overrides pillar
 * 3. Pillar scope (pillar)
 * 4. Mode (kept unless asset scope overrides)
 *
 * Key exports:
 * - normalizeScopeParams: Normalize URL params into canonical scope + chips
 * - buildClearFiltersHref: Build "Clear filters" destination (base route)
 */

import { DEO_PILLARS, type DeoPillarId } from './deo-pillars';

// =============================================================================
// Types
// =============================================================================

/**
 * Canonical scope keys supported by normalization.
 * URL is the single source of truth - these are the ONLY scope keys we emit.
 */
export interface NormalizedScope {
  pillar?: DeoPillarId;
  assetType?: 'products' | 'pages' | 'collections';
  assetId?: string;
  issueType?: string;
  mode?: 'actionable' | 'detected';
}

/**
 * Scope chip descriptor for UI rendering.
 * Chips are rendered in order: asset > issueType > pillar > mode
 */
export interface ScopeChip {
  /** Chip type for styling and test hooks */
  type: 'pillar' | 'asset' | 'issueType' | 'mode';
  /** Human-readable label */
  label: string;
}

/**
 * Result of scope normalization.
 */
export interface NormalizedScopeResult {
  /** Canonical scope object with only valid keys */
  normalized: NormalizedScope;
  /** Ordered list of chips for UI rendering */
  chips: ScopeChip[];
  /** True if normalization dropped/overrode conflicting params */
  wasAdjusted: boolean;
}

export interface NormalizeScopeOptions {
  /** If true, skip mode normalization (for surfaces that don't use mode) */
  skipMode?: boolean;
}

// =============================================================================
// Issue Type Labels (for chip display)
// =============================================================================

/**
 * Human-readable labels for known issue types.
 * Falls back to formatted issue type key if not found.
 */
const ISSUE_TYPE_LABELS: Record<string, string> = {
  missing_seo_title: 'Missing SEO title',
  missing_seo_description: 'Missing SEO description',
  duplicate_seo_title: 'Duplicate SEO title',
  duplicate_seo_description: 'Duplicate SEO description',
  seo_title_too_long: 'SEO title too long',
  seo_title_too_short: 'SEO title too short',
  seo_description_too_long: 'SEO description too long',
  seo_description_too_short: 'SEO description too short',
  missing_alt_text: 'Missing alt text',
  broken_links: 'Broken links',
  slow_page_load: 'Slow page load',
  missing_structured_data: 'Missing structured data',
};

function getIssueTypeLabel(issueType: string): string {
  if (issueType in ISSUE_TYPE_LABELS) {
    return ISSUE_TYPE_LABELS[issueType];
  }
  // Fallback: convert snake_case to Title Case
  return issueType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// Asset Type Labels
// =============================================================================

function getAssetTypeLabel(assetType: string): string {
  switch (assetType) {
    case 'products':
      return 'Product';
    case 'pages':
      return 'Page';
    case 'collections':
      return 'Collection';
    default:
      return assetType.charAt(0).toUpperCase() + assetType.slice(1);
  }
}

// =============================================================================
// Normalization Logic
// =============================================================================

/**
 * Normalize scope params from URL into canonical form.
 *
 * Implements deterministic priority rules (LOCKED):
 * 1. Asset scope (assetType + assetId both present) → keep only asset; drop issueType, pillar, mode
 * 2. Issue type scope (issueType present) → keep issueType (+ mode if present); drop pillar
 * 3. Pillar scope (pillar present) → keep pillar (+ mode if present)
 * 4. Mode alone → keep mode
 *
 * @param searchParams - URL search params
 * @param options - Normalization options
 * @returns Normalized scope, chips for UI, and wasAdjusted flag
 */
export function normalizeScopeParams(
  searchParams: URLSearchParams | null,
  options?: NormalizeScopeOptions
): NormalizedScopeResult {
  if (!searchParams) {
    return { normalized: {}, chips: [], wasAdjusted: false };
  }

  // Extract raw params
  const rawPillar = searchParams.get('pillar') as DeoPillarId | null;
  const rawAssetType = searchParams.get('assetType') as
    | 'products'
    | 'pages'
    | 'collections'
    | null;
  const rawAssetId = searchParams.get('assetId');
  const rawIssueType = searchParams.get('issueType');
  const rawMode = searchParams.get('mode') as 'actionable' | 'detected' | null;

  // Track what was provided vs what we keep
  const provided = {
    pillar: !!rawPillar,
    assetType: !!rawAssetType,
    assetId: !!rawAssetId,
    issueType: !!rawIssueType,
    mode: !!rawMode,
  };

  const normalized: NormalizedScope = {};
  const chips: ScopeChip[] = [];
  let wasAdjusted = false;

  // Validate pillar if provided
  const validPillar =
    rawPillar && DEO_PILLARS.some((p) => p.id === rawPillar) ? rawPillar : null;
  if (rawPillar && !validPillar) {
    wasAdjusted = true; // Invalid pillar was dropped
  }

  // Validate assetType
  const validAssetType =
    rawAssetType && ['products', 'pages', 'collections'].includes(rawAssetType)
      ? rawAssetType
      : null;
  if (rawAssetType && !validAssetType) {
    wasAdjusted = true; // Invalid assetType was dropped
  }

  // Validate mode
  const validMode =
    rawMode && ['actionable', 'detected'].includes(rawMode) ? rawMode : null;
  if (rawMode && !validMode) {
    wasAdjusted = true; // Invalid mode was dropped
  }

  // Priority 1: Asset scope (assetType + assetId both present)
  if (validAssetType && rawAssetId) {
    normalized.assetType = validAssetType;
    normalized.assetId = rawAssetId;

    // Asset scope overrides everything else
    if (provided.pillar || provided.issueType || provided.mode) {
      wasAdjusted = true;
    }

    // Build asset chip
    chips.push({
      type: 'asset',
      label: `${getAssetTypeLabel(validAssetType)}: ${rawAssetId.substring(0, 8)}...`,
    });

    return { normalized, chips, wasAdjusted };
  }

  // Incomplete asset scope (only one of assetType/assetId) - drop both
  if ((validAssetType && !rawAssetId) || (!validAssetType && rawAssetId)) {
    wasAdjusted = true;
  }

  // Priority 2: Issue type scope (issueType present)
  if (rawIssueType) {
    normalized.issueType = rawIssueType;

    // Issue type overrides pillar
    if (provided.pillar) {
      wasAdjusted = true;
    }

    chips.push({
      type: 'issueType',
      label: getIssueTypeLabel(rawIssueType),
    });

    // Keep mode if present and valid (and not skipped)
    if (!options?.skipMode && validMode) {
      normalized.mode = validMode;
      chips.push({
        type: 'mode',
        label: validMode === 'actionable' ? 'Actionable' : 'Detected',
      });
    }

    return { normalized, chips, wasAdjusted };
  }

  // Priority 3: Pillar scope
  if (validPillar) {
    normalized.pillar = validPillar;

    const pillarDef = DEO_PILLARS.find((p) => p.id === validPillar);
    chips.push({
      type: 'pillar',
      label: `Pillar: ${pillarDef?.shortName || validPillar}`,
    });

    // Keep mode if present and valid (and not skipped)
    if (!options?.skipMode && validMode) {
      normalized.mode = validMode;
      chips.push({
        type: 'mode',
        label: validMode === 'actionable' ? 'Actionable' : 'Detected',
      });
    }

    return { normalized, chips, wasAdjusted };
  }

  // Priority 4: Mode alone
  if (!options?.skipMode && validMode) {
    normalized.mode = validMode;
    chips.push({
      type: 'mode',
      label: validMode === 'actionable' ? 'Actionable' : 'Detected',
    });
  }

  return { normalized, chips, wasAdjusted };
}

// =============================================================================
// Clear Filters Helper
// =============================================================================

/**
 * Build the "Clear filters" destination URL.
 * Returns the base pathname without any query params.
 *
 * @param pathname - Current pathname
 * @returns Base pathname (no query params)
 */
export function buildClearFiltersHref(pathname: string): string {
  return pathname;
}
