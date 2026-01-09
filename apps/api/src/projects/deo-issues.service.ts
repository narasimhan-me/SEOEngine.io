import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DeoSignalsService } from './deo-score.service';
import {
  DeoIssue,
  DeoIssuesResponse,
  DeoScoreSignals,
  DeoPillarId,
  DeoIssueActionability,
  type IssueAssetTypeCounts,
  type IssueCountsSummary,
  type CanonicalCountTriplet,
  type CanonicalIssueCountsSummary,
  type AssetIssuesResponse,
  DEO_PILLARS,
  PerformanceSignalType,
  evaluateGeoProduct,
  GEO_ISSUE_LABELS,
  GEO_ISSUE_DESCRIPTIONS,
  type GeoAnswerUnitInput,
  type GeoIssueType,
  // [COUNT-INTEGRITY-1.1 PATCH 2.4] Shared Issue→ActionKey mapper
  getWorkQueueRecommendedActionKeyForIssue,
} from '@engineo/shared';
import { AutomationService } from './automation.service';
import { SearchIntentService } from './search-intent.service';
import { CompetitorsService } from './competitors.service';
import { OffsiteSignalsService } from './offsite-signals.service';
import { LocalDiscoveryService } from './local-discovery.service';
import { MediaAccessibilityService } from './media-accessibility.service';
import { RoleResolutionService } from '../common/role-resolution.service';

type IssueAssetTypeKey = 'products' | 'pages' | 'collections';

function getAssetTypeFromUrl(url: string): IssueAssetTypeKey {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    if (path.startsWith('/collections/') || path === '/collections') return 'collections';
    if (path.startsWith('/products/') || path === '/products') return 'products';
    return 'pages';
  } catch {
    return 'pages';
  }
}

const IN_APP_ACTIONABLE_ISSUE_KEYS = new Set<string>([
  'missing_seo_title',
  'missing_seo_description',
  'weak_title',
  'weak_description',
  'missing_metadata',
  'missing_long_description',
  'thin_content',
  'low_entity_coverage',
  'duplicate_product_content',
  'low_product_entity_coverage',
  'product_content_depth',
  'answer_surface_weakness',
  'not_answer_ready',
  'weak_intent_match',
  'indexability_problems',
  'crawl_health_errors',
  'render_blocking_resources',
  'indexability_conflict',
  'slow_initial_response',
  'excessive_page_weight',
  'mobile_rendering_risk',
]);

/**
 * [COUNT-INTEGRITY-1.1 PATCH 3.1] Internal field name for full affected asset keys.
 * This field is non-enumerable and never serialized in API responses.
 * Used for accurate deduplication when affected arrays are capped at 20 items.
 */
const FULL_AFFECTED_ASSET_KEYS_FIELD = '__fullAffectedAssetKeys';

/**
 * [COUNT-INTEGRITY-1.1 PATCH 3.1] Attach full affected asset keys to an issue.
 * Creates composite keys for all affected assets without cap limitations.
 *
 * Composite key formats:
 * - Products: products:${productId}
 * - Pages: pages:${url} (for non-collection URLs)
 * - Collections: collections:${url} (when URL pathname starts with /collections/ or equals /collections)
 */
function attachFullAffectedAssetKeys(
  issue: DeoIssue,
  productIds: string[],
  pageUrls: string[]
): void {
  const keys = new Set<string>();

  // Add product keys
  for (const productId of productIds) {
    keys.add(`products:${productId}`);
  }

  // Add page and collection keys
  for (const url of pageUrls) {
    const assetType = getAssetTypeFromUrl(url);
    if (assetType === 'collections') {
      keys.add(`collections:${url}`);
    } else {
      keys.add(`pages:${url}`);
    }
  }

  // Attach as non-enumerable property
  Object.defineProperty(issue, FULL_AFFECTED_ASSET_KEYS_FIELD, {
    value: Array.from(keys),
    enumerable: false,
    writable: false,
    configurable: true,
  });
}

/**
 * [COUNT-INTEGRITY-1.1 PATCH 3.1] Read full affected asset keys from an issue.
 * Returns null if the field is not present.
 */
function getFullAffectedAssetKeys(issue: DeoIssue): string[] | null {
  const keys = (issue as any)[FULL_AFFECTED_ASSET_KEYS_FIELD];
  return Array.isArray(keys) ? keys : null;
}

/**
 * [COUNT-INTEGRITY-1.1 PATCH 3.1] Copy full affected asset keys from source to target issue.
 * Preserves non-enumerable property during issue decoration.
 */
function copyFullAffectedAssetKeys(source: DeoIssue, target: DeoIssue): void {
  const keys = getFullAffectedAssetKeys(source);
  if (keys) {
    Object.defineProperty(target, FULL_AFFECTED_ASSET_KEYS_FIELD, {
      value: keys,
      enumerable: false,
      writable: false,
      configurable: true,
    });
  }
}

/**
 * [ROLES-3 FIXUP-3] DEO Issues Service
 * Updated with membership-aware access control (any ProjectMember can view).
 */
@Injectable()
export class DeoIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deoSignalsService: DeoSignalsService,
    private readonly automationService: AutomationService,
    private readonly searchIntentService: SearchIntentService,
    private readonly competitorsService: CompetitorsService,
    private readonly offsiteSignalsService: OffsiteSignalsService,
    private readonly localDiscoveryService: LocalDiscoveryService,
    private readonly mediaAccessibilityService: MediaAccessibilityService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  /**
   * Compute DEO issues for a project by combining crawl results,
   * product data, and aggregated DEO signals.
   */
  async getIssuesForProject(projectId: string, userId: string): Promise<DeoIssuesResponse> {
    return this.computeIssuesForProject(projectId, userId, { mode: 'full' });
  }

  /**
   * [INSIGHTS-1] Read-only version of getIssuesForProject.
   * Uses cached data only and does NOT trigger any side effects (no automation triggers).
   * Used by the insights dashboard for issue counts without mutating state.
   */
  async getIssuesForProjectReadOnly(projectId: string, userId: string): Promise<DeoIssuesResponse> {
    return this.computeIssuesForProject(projectId, userId, { mode: 'readOnly' });
  }

  /**
   * COUNT-INTEGRITY-1: Server-side single source of truth for counts.
   */
  async getIssueCountsSummaryForProject(projectId: string, userId: string): Promise<IssueCountsSummary> {
    const response = await this.getIssuesForProjectReadOnly(projectId, userId);
    const issues = response.issues ?? [];

    const makeBucket = () => ({
      detectedGroups: 0,
      actionableGroups: 0,
      detectedInstances: 0,
      actionableInstances: 0,
    });

    const byPillar: IssueCountsSummary['byPillar'] = Object.fromEntries(
      DEO_PILLARS.map((p) => [p.id, makeBucket()]),
    ) as IssueCountsSummary['byPillar'];

    const bySeverity: IssueCountsSummary['bySeverity'] = {
      critical: makeBucket(),
      warning: makeBucket(),
      info: makeBucket(),
    };

    const byAssetType: IssueCountsSummary['byAssetType'] = {
      products: makeBucket(),
      pages: makeBucket(),
      collections: makeBucket(),
    };

    const byIssueType: IssueCountsSummary['byIssueType'] = {};

    let detectedTotal = 0;
    let actionableTotal = 0;
    let detectedGroupsTotal = 0;
    let actionableGroupsTotal = 0;

    for (const issue of issues) {
      const issueKey = (issue.type as string | undefined) || issue.id;
      const instances = typeof issue.count === 'number' ? issue.count : 0;
      const isActionable = issue.isActionableNow === true;

      detectedGroupsTotal += 1;
      detectedTotal += instances;
      if (isActionable) {
        actionableGroupsTotal += 1;
        actionableTotal += instances;
      }

      if (!byIssueType[issueKey]) {
        byIssueType[issueKey] = makeBucket();
      }
      byIssueType[issueKey].detectedGroups += 1;
      byIssueType[issueKey].detectedInstances += instances;
      if (isActionable) {
        byIssueType[issueKey].actionableGroups += 1;
        byIssueType[issueKey].actionableInstances += instances;
      }

      if (issue.pillarId && byPillar[issue.pillarId]) {
        byPillar[issue.pillarId].detectedGroups += 1;
        byPillar[issue.pillarId].detectedInstances += instances;
        if (isActionable) {
          byPillar[issue.pillarId].actionableGroups += 1;
          byPillar[issue.pillarId].actionableInstances += instances;
        }
      }

      if (bySeverity[issue.severity]) {
        bySeverity[issue.severity].detectedGroups += 1;
        bySeverity[issue.severity].detectedInstances += instances;
        if (isActionable) {
          bySeverity[issue.severity].actionableGroups += 1;
          bySeverity[issue.severity].actionableInstances += instances;
        }
      }

      const atc: IssueAssetTypeCounts | undefined = issue.assetTypeCounts;
      const productsInstances = atc?.products ?? 0;
      const pagesInstances = atc?.pages ?? 0;
      const collectionsInstances = atc?.collections ?? 0;

      // Track group counts (issue types per asset type)
      if (productsInstances > 0) {
        byAssetType.products.detectedGroups += 1;
        if (isActionable) {
          byAssetType.products.actionableGroups += 1;
        }
      }
      if (pagesInstances > 0) {
        byAssetType.pages.detectedGroups += 1;
        if (isActionable) {
          byAssetType.pages.actionableGroups += 1;
        }
      }
      if (collectionsInstances > 0) {
        byAssetType.collections.detectedGroups += 1;
        if (isActionable) {
          byAssetType.collections.actionableGroups += 1;
        }
      }

      // Track instance counts
      byAssetType.products.detectedInstances += productsInstances;
      byAssetType.pages.detectedInstances += pagesInstances;
      byAssetType.collections.detectedInstances += collectionsInstances;

      if (isActionable) {
        byAssetType.products.actionableInstances += productsInstances;
        byAssetType.pages.actionableInstances += pagesInstances;
        byAssetType.collections.actionableInstances += collectionsInstances;
      }
    }

    return {
      projectId,
      generatedAt: response.generatedAt,
      detectedTotal,
      actionableTotal,
      detectedGroupsTotal,
      actionableGroupsTotal,
      byPillar,
      bySeverity,
      byAssetType,
      byIssueType,
    };
  }

  /**
   * COUNT-INTEGRITY-1.1: Canonical triplet counts summary with explicit UX labels.
   * Computes issueTypesCount, affectedItemsCount, actionableNowCount for detected/actionable modes.
   * Supports optional filters: actionKey(s), scopeType, pillar(s), severity.
   */
  async getCanonicalIssueCountsSummary(
    projectId: string,
    userId: string,
    filters?: {
      actionKey?: string;
      actionKeys?: string[];
      scopeType?: IssueAssetTypeKey;
      pillar?: DeoPillarId;
      pillars?: DeoPillarId[];
      severity?: 'critical' | 'warning' | 'info';
    },
  ): Promise<CanonicalIssueCountsSummary> {
    const response = await this.getIssuesForProjectReadOnly(projectId, userId);
    let issues = response.issues ?? [];

    // Apply filters
    if (filters) {
      const { actionKey, actionKeys, scopeType, pillar, pillars, severity } = filters;

      // [COUNT-INTEGRITY-1.1 PATCH 2.4] Filter by actionKey(s) using shared mapper
      const actionKeysToFilter = actionKeys || (actionKey ? [actionKey] : undefined);
      if (actionKeysToFilter && actionKeysToFilter.length > 0) {
        issues = issues.filter((issue) => {
          const issueActionKey = getWorkQueueRecommendedActionKeyForIssue(issue);
          return actionKeysToFilter.includes(issueActionKey);
        });
      }

      // Filter by scopeType (asset type)
      if (scopeType) {
        issues = issues.filter((issue) => {
          const atc = issue.assetTypeCounts;
          return atc && atc[scopeType] > 0;
        });
      }

      // Filter by pillar(s)
      const pillarsToFilter = pillars || (pillar ? [pillar] : undefined);
      if (pillarsToFilter && pillarsToFilter.length > 0) {
        issues = issues.filter((issue) => issue.pillarId && pillarsToFilter.includes(issue.pillarId));
      }

      // Filter by severity
      if (severity) {
        issues = issues.filter((issue) => issue.severity === severity);
      }
    }

    // Helper to compute triplet for a set of issues
    const computeTriplet = (issueSubset: DeoIssue[], onlyActionable: boolean): CanonicalCountTriplet => {
      const filteredIssues = onlyActionable
        ? issueSubset.filter((i) => i.isActionableNow === true)
        : issueSubset;

      const issueTypesCount = filteredIssues.length;

      // Dedupe unique assets (UEP decision: use composite keys like "products:123")
      const uniqueAssets = new Set<string>();
      let actionableAssetsSet = new Set<string>();

      for (const issue of filteredIssues) {
        const atc = issue.assetTypeCounts;
        const isActionable = issue.isActionableNow === true;

        // [COUNT-INTEGRITY-1.1 PATCH 3.3] Prefer full keys when available (no cap-20 limitation)
        const fullKeys = getFullAffectedAssetKeys(issue);
        if (fullKeys && fullKeys.length > 0) {
          // Use full keys for accurate deduplication
          for (const key of fullKeys) {
            uniqueAssets.add(key);
            if (isActionable) {
              actionableAssetsSet.add(key);
            }
          }
          continue; // Skip fallback logic below
        }

        // Fallback: Use capped arrays (legacy issues without full keys)
        // For products
        if (atc?.products && atc.products > 0) {
          const productsAffected = issue.affectedProducts ?? [];
          if (productsAffected.length > 0) {
            for (const productId of productsAffected) {
              const key = `products:${productId}`;
              uniqueAssets.add(key);
              if (isActionable) {
                actionableAssetsSet.add(key);
              }
            }
          } else {
            // Store-wide issue: use pseudo-key
            const key = 'products:__store_wide__';
            uniqueAssets.add(key);
            if (isActionable) {
              actionableAssetsSet.add(key);
            }
          }
        }

        // For pages
        if (atc?.pages && atc.pages > 0) {
          const pagesAffected = issue.affectedPages ?? [];
          if (pagesAffected.length > 0) {
            for (const pageUrl of pagesAffected) {
              const key = `pages:${pageUrl}`;
              uniqueAssets.add(key);
              if (isActionable) {
                actionableAssetsSet.add(key);
              }
            }
          } else {
            const key = 'pages:__store_wide__';
            uniqueAssets.add(key);
            if (isActionable) {
              actionableAssetsSet.add(key);
            }
          }
        }

        // For collections (no affectedCollections field yet, use pseudo-key if count > 0)
        if (atc?.collections && atc.collections > 0) {
          const key = 'collections:__store_wide__';
          uniqueAssets.add(key);
          if (isActionable) {
            actionableAssetsSet.add(key);
          }
        }
      }

      const affectedItemsCount = uniqueAssets.size;
      const actionableNowCount = onlyActionable ? actionableAssetsSet.size : actionableAssetsSet.size;

      return {
        issueTypesCount,
        affectedItemsCount,
        actionableNowCount: onlyActionable ? actionableNowCount : actionableAssetsSet.size,
      };
    };

    // Compute top-level detected and actionable triplets
    const detected = computeTriplet(issues, false);
    const actionable = computeTriplet(issues, true);

    // Compute byPillar breakdown
    const byPillar: CanonicalIssueCountsSummary['byPillar'] = {} as any;
    for (const p of DEO_PILLARS) {
      const pillarIssues = issues.filter((i) => i.pillarId === p.id);
      byPillar[p.id] = {
        detected: computeTriplet(pillarIssues, false),
        actionable: computeTriplet(pillarIssues, true),
      };
    }

    // Compute bySeverity breakdown
    const severities: Array<'critical' | 'warning' | 'info'> = ['critical', 'warning', 'info'];
    const bySeverity: CanonicalIssueCountsSummary['bySeverity'] = {} as any;
    for (const sev of severities) {
      const sevIssues = issues.filter((i) => i.severity === sev);
      bySeverity[sev] = {
        detected: computeTriplet(sevIssues, false),
        actionable: computeTriplet(sevIssues, true),
      };
    }

    return {
      projectId,
      generatedAt: response.generatedAt,
      filters: filters || undefined,
      detected,
      actionable,
      byPillar,
      bySeverity,
    };
  }

  /**
   * COUNT-INTEGRITY-1.1: Asset-specific issues endpoint.
   * Returns filtered issue list + canonical triplet summary for a specific asset.
   * Supports optional filters: pillar(s), severity.
   */
  async getAssetIssues(
    projectId: string,
    userId: string,
    assetType: IssueAssetTypeKey,
    assetId: string,
    filters?: {
      pillar?: DeoPillarId;
      pillars?: DeoPillarId[];
      severity?: 'critical' | 'warning' | 'info';
    },
  ): Promise<AssetIssuesResponse> {
    const response = await this.getIssuesForProjectReadOnly(projectId, userId);
    let issues = response.issues ?? [];

    // [COUNT-INTEGRITY-1.1 PATCH 2.5-FIXUP-1] Resolve page/collection IDs to URLs (scoped to project)
    let resolvedAssetIdentifier = assetId;
    if (assetType === 'pages' || assetType === 'collections') {
      const crawlResult = await this.prisma.crawlResult.findFirst({
        where: { id: assetId, projectId },
        select: { url: true },
      });

      if (!crawlResult) {
        // [PATCH 2.5-FIXUP-1] Asset not found or not in this project → return empty deterministically
        return {
          projectId,
          assetType,
          assetId,
          generatedAt: new Date().toISOString(),
          issues: [],
          summary: {
            detected: { issueTypesCount: 0, affectedItemsCount: 0, actionableNowCount: 0 },
            actionable: { issueTypesCount: 0, affectedItemsCount: 0, actionableNowCount: 0 },
            byPillar: {} as any,
            bySeverity: {} as any,
          },
        };
      }

      resolvedAssetIdentifier = crawlResult.url;
    }

    // Filter to only issues affecting this specific asset
    issues = issues.filter((issue) => {
      const atc = issue.assetTypeCounts;
      if (!atc || atc[assetType] === 0) {
        return false;
      }

      // [COUNT-INTEGRITY-1.1 PATCH 3.4] Prefer full keys when available (no cap-20 omissions)
      const fullKeys = getFullAffectedAssetKeys(issue);
      if (fullKeys && fullKeys.length > 0) {
        // Build the composite key for this asset
        const targetKey = assetType === 'products'
          ? `products:${assetId}`
          : assetType === 'pages'
            ? `pages:${resolvedAssetIdentifier}`
            : `collections:${resolvedAssetIdentifier}`;
        return fullKeys.includes(targetKey);
      }

      // Fallback: Use capped arrays (legacy issues without full keys)
      // [COUNT-INTEGRITY-1.1 PATCH 2.5] For products: strict membership check (no store-wide false positives)
      if (assetType === 'products') {
        const affected = issue.affectedProducts ?? [];
        return affected.includes(assetId);
      }

      // [COUNT-INTEGRITY-1.1 PATCH 2.5] For pages: check using resolved URL
      if (assetType === 'pages') {
        const affected = issue.affectedPages ?? [];
        return affected.includes(resolvedAssetIdentifier);
      }

      // [COUNT-INTEGRITY-1.1 PATCH 2.5] For collections: check using resolved URL (no unconditional true)
      if (assetType === 'collections') {
        const affected = issue.affectedPages ?? []; // Collections use affectedPages field
        return affected.includes(resolvedAssetIdentifier);
      }

      return false;
    });

    // Apply optional filters
    if (filters) {
      const { pillar, pillars, severity } = filters;

      const pillarsToFilter = pillars || (pillar ? [pillar] : undefined);
      if (pillarsToFilter && pillarsToFilter.length > 0) {
        issues = issues.filter((issue) => issue.pillarId && pillarsToFilter.includes(issue.pillarId));
      }

      if (severity) {
        issues = issues.filter((issue) => issue.severity === severity);
      }
    }

    // Compute canonical triplet summary for this asset's issues
    const computeTriplet = (issueSubset: DeoIssue[], onlyActionable: boolean): CanonicalCountTriplet => {
      const filteredIssues = onlyActionable
        ? issueSubset.filter((i) => i.isActionableNow === true)
        : issueSubset;

      const issueTypesCount = filteredIssues.length;
      // For asset-specific view, affectedItemsCount is always 1 (this asset)
      const affectedItemsCount = filteredIssues.length > 0 ? 1 : 0;
      const actionableNowCount = onlyActionable && filteredIssues.length > 0 ? 1 : 0;

      return {
        issueTypesCount,
        affectedItemsCount,
        actionableNowCount,
      };
    };

    const detected = computeTriplet(issues, false);
    const actionable = computeTriplet(issues, true);

    // Compute byPillar breakdown
    const byPillar: AssetIssuesResponse['summary']['byPillar'] = {} as any;
    for (const p of DEO_PILLARS) {
      const pillarIssues = issues.filter((i) => i.pillarId === p.id);
      byPillar[p.id] = {
        detected: computeTriplet(pillarIssues, false),
        actionable: computeTriplet(pillarIssues, true),
      };
    }

    // Compute bySeverity breakdown
    const severities: Array<'critical' | 'warning' | 'info'> = ['critical', 'warning', 'info'];
    const bySeverity: AssetIssuesResponse['summary']['bySeverity'] = {} as any;
    for (const sev of severities) {
      const sevIssues = issues.filter((i) => i.severity === sev);
      bySeverity[sev] = {
        detected: computeTriplet(sevIssues, false),
        actionable: computeTriplet(sevIssues, true),
      };
    }

    return {
      projectId,
      assetType,
      assetId,
      generatedAt: response.generatedAt,
      issues,
      summary: {
        detected,
        actionable,
        byPillar,
        bySeverity,
      },
    };
  }

  /**
   * Internal method that computes issues with mode-based behavior.
   * - 'full': Standard computation with side effects (automation triggers)
   * - 'readOnly': Uses cached data only, no side effects
   */
  private async computeIssuesForProject(
    projectId: string,
    userId: string,
    opts: { mode: 'full' | 'readOnly' },
  ): Promise<DeoIssuesResponse> {
    const prisma = this.prisma as any;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const [crawlResults, products, signals] = await Promise.all([
      prisma.crawlResult.findMany({ where: { projectId } }),
      prisma.product.findMany({ where: { projectId } }),
      this.deoSignalsService.collectSignalsForProject(projectId),
    ]);

    const totalPages = crawlResults.length;
    const totalProducts = products.length;
    const totalSurfaces = totalPages + totalProducts;

    const issues: DeoIssue[] = [];

    const missingMetadataIssue = this.buildMissingMetadataIssue(
      crawlResults,
      products,
      totalSurfaces,
    );
    if (missingMetadataIssue) {
      issues.push(missingMetadataIssue);
    }

    const thinContentIssue = this.buildThinContentIssue(
      crawlResults,
      products,
      totalSurfaces,
    );
    if (thinContentIssue) {
      issues.push(thinContentIssue);
    }

    const lowEntityCoverageIssue = this.buildLowEntityCoverageIssue(
      crawlResults,
      products,
      totalSurfaces,
      signals,
    );
    if (lowEntityCoverageIssue) {
      issues.push(lowEntityCoverageIssue);
    }

    const indexabilityIssue = this.buildIndexabilityIssue(crawlResults, signals);
    if (indexabilityIssue) {
      issues.push(indexabilityIssue);
    }

    const indexabilityConflictIssue = this.buildIndexabilityConflictIssue(
      crawlResults,
      signals,
    );
    if (indexabilityConflictIssue) {
      issues.push(indexabilityConflictIssue);
    }

    const answerSurfaceIssue = this.buildAnswerSurfaceIssue(crawlResults, signals);
    if (answerSurfaceIssue) {
      issues.push(answerSurfaceIssue);
    }

    const brandNavIssue = this.buildBrandNavigationalIssue(crawlResults, signals);
    if (brandNavIssue) {
      issues.push(brandNavIssue);
    }

    const crawlHealthIssue = this.buildCrawlHealthIssue(crawlResults, signals);
    if (crawlHealthIssue) {
      issues.push(crawlHealthIssue);
    }

    const renderBlockingIssue =
      this.buildRenderBlockingResourcesIssue(crawlResults);
    if (renderBlockingIssue) {
      issues.push(renderBlockingIssue);
    }

    const slowInitialResponseIssue =
      this.buildSlowInitialResponseIssue(crawlResults);
    if (slowInitialResponseIssue) {
      issues.push(slowInitialResponseIssue);
    }

    const pageWeightIssue = this.buildExcessivePageWeightIssue(crawlResults);
    if (pageWeightIssue) {
      issues.push(pageWeightIssue);
    }

    const mobileRenderingIssue =
      this.buildMobileRenderingRiskIssue(crawlResults);
    if (mobileRenderingIssue) {
      issues.push(mobileRenderingIssue);
    }

    const productDepthIssue = this.buildProductContentDepthIssue(products);
    if (productDepthIssue) {
      issues.push(productDepthIssue);
    }

    // Issue Engine Lite: Product-focused issues
    const issueEngineLiteBuilders = [
      () => this.buildMissingSeoTitleIssue(products),
      () => this.buildMissingSeoDescriptionIssue(products),
      () => this.buildWeakTitleIssue(products),
      () => this.buildWeakDescriptionIssue(products),
      () => this.buildMissingLongDescriptionIssue(products),
      () => this.buildDuplicateProductContentIssue(products),
      () => this.buildLowProductEntityCoverageIssue(products, signals),
      () => this.buildNotAnswerReadyIssue(products),
      () => this.buildWeakIntentMatchIssue(products),
      () => this.buildMissingProductImageIssue(products),
      () => this.buildMissingPriceIssue(products),
      () => this.buildMissingCategoryIssue(products),
    ];

    for (const builder of issueEngineLiteBuilders) {
      const issue = builder();
      if (issue) {
        issues.push(issue);
      }
    }

    // GEO-FOUNDATION-1: Add GEO answer readiness issues (derived from persisted Answer Blocks)
    try {
      const geoIssues = await this.buildGeoIssuesForProject(projectId, products);
      issues.push(...geoIssues);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DeoIssuesService] Failed to build GEO issues:', error);
    }

    // SEARCH-INTENT-1: Add Search & Intent pillar issues
    try {
      const intentIssues = await this.searchIntentService.buildSearchIntentIssues(projectId);
      issues.push(...intentIssues);
    } catch (error) {
      // Log but don't fail the entire issues request
      // eslint-disable-next-line no-console
      console.error('[DeoIssuesService] Failed to build search intent issues:', error);
    }

    // COMPETITORS-1: Add Competitive Positioning pillar issues
    try {
      const competitiveIssues = await this.competitorsService.buildCompetitiveIssues(projectId);
      issues.push(...competitiveIssues);
    } catch (error) {
      // Log but don't fail the entire issues request
      // eslint-disable-next-line no-console
      console.error('[DeoIssuesService] Failed to build competitive issues:', error);
    }

    // OFFSITE-1: Add Off-site Signals pillar issues
    // [INSIGHTS-1] In readOnly mode, use cached-only method (no recomputation)
    try {
      const offsiteIssues = opts.mode === 'readOnly'
        ? await this.offsiteSignalsService.buildOffsiteIssuesForProjectReadOnly(projectId)
        : await this.offsiteSignalsService.buildOffsiteIssuesForProject(projectId);
      issues.push(...offsiteIssues);
    } catch (error) {
      // Log but don't fail the entire issues request
      // eslint-disable-next-line no-console
      console.error('[DeoIssuesService] Failed to build off-site signals issues:', error);
    }

    // LOCAL-1: Add Local Discovery pillar issues
    // CRITICAL: Non-applicable projects get NO issues (no penalty for global stores)
    // [INSIGHTS-1] In readOnly mode, use cached-only method (no recomputation)
    try {
      const localIssues = opts.mode === 'readOnly'
        ? await this.localDiscoveryService.buildLocalIssuesForProjectReadOnly(projectId)
        : await this.localDiscoveryService.buildLocalIssuesForProject(projectId);
      issues.push(...localIssues);
    } catch (error) {
      // Log but don't fail the entire issues request
      // eslint-disable-next-line no-console
      console.error('[DeoIssuesService] Failed to build local discovery issues:', error);
    }

    // MEDIA-1: Add Media & Accessibility pillar issues
    try {
      const mediaIssues = await this.mediaAccessibilityService.buildMediaIssuesForProject(projectId);
      // [COUNT-INTEGRITY-1.1 PATCH 3.5] Attach full keys for media issues that have __tempFullProductIds
      for (const issue of mediaIssues) {
        const tempIds = (issue as any).__tempFullProductIds as string[] | undefined;
        if (tempIds && tempIds.length > 0) {
          attachFullAffectedAssetKeys(issue, tempIds, []);
          delete (issue as any).__tempFullProductIds; // Clean up temp field
        }
      }
      issues.push(...mediaIssues);
    } catch (error) {
      // Log but don't fail the entire issues request
      // eslint-disable-next-line no-console
      console.error('[DeoIssuesService] Failed to build media accessibility issues:', error);
    }

    // COUNT-INTEGRITY-1: Add derived actionability + asset-type distribution on every issue.
    const effectiveRole = await this.roleResolution.resolveEffectiveRole(projectId, userId);
    const capabilities = this.roleResolution.getCapabilities(effectiveRole);

    const decoratedIssues: DeoIssue[] = issues.map((issue) => {
      const issueKey = (issue.type as string | undefined) || issue.id;
      const isInAppActionable = IN_APP_ACTIONABLE_ISSUE_KEYS.has(issueKey) || (issue.fixReady === true && !!issue.fixType);
      const isNotInformational = issue.actionability !== 'informational';
      const canTakeAction = capabilities.canGenerateDrafts || capabilities.canRequestApproval || capabilities.canApply;
      const isActionableNow = isInAppActionable && isNotInformational && canTakeAction;

      const assetTypeCounts: IssueAssetTypeCounts =
        issue.assetTypeCounts ??
        (() => {
          const count = typeof issue.count === 'number' ? issue.count : 0;
          const hasProducts = !!issue.affectedProducts?.length;
          const hasPages = !!issue.affectedPages?.length;

          if (!hasProducts && !hasPages) {
            return { products: 0, pages: 0, collections: 0 };
          }

          if (hasProducts && !hasPages) {
            return { products: count, pages: 0, collections: 0 };
          }

          if (!hasProducts && hasPages) {
            // Classify pages array to split pages vs collections
            let pages = 0;
            let collections = 0;
            for (const url of issue.affectedPages ?? []) {
              const bucket = getAssetTypeFromUrl(url);
              if (bucket === 'collections') collections++;
              else pages++;
            }
            // Guard: if no URLs classified, assign all to pages
            if (pages === 0 && collections === 0) {
              return { products: 0, pages: count, collections: 0 };
            }
            // Sum-preserving: round pages, assign remainder to collections
            const pagesRatio = pages / (pages + collections);
            const pagesAssigned = Math.round(count * pagesRatio);
            const collectionsAssigned = count - pagesAssigned;
            return {
              products: 0,
              pages: pagesAssigned,
              collections: collectionsAssigned,
            };
          }

          // Both products and pages: allocate proportionally
          const productsHint = Math.min(count, issue.affectedProducts?.length ?? 0);
          const remainder = count - productsHint;
          let pages = 0;
          let collections = 0;
          for (const url of issue.affectedPages ?? []) {
            const bucket = getAssetTypeFromUrl(url);
            if (bucket === 'collections') collections++;
            else pages++;
          }
          // Guard: if no URLs classified, assign all remainder to pages
          if (pages === 0 && collections === 0) {
            return { products: productsHint, pages: remainder, collections: 0 };
          }
          // Sum-preserving: round pages, assign remainder to collections
          const pagesRatio = pages / (pages + collections);
          const pagesAssigned = Math.round(remainder * pagesRatio);
          const collectionsAssigned = remainder - pagesAssigned;
          return {
            products: productsHint,
            pages: pagesAssigned,
            collections: collectionsAssigned,
          };
        })();

      const decoratedIssue: DeoIssue = {
        ...issue,
        isActionableNow,
        assetTypeCounts,
      };

      // [COUNT-INTEGRITY-1.1 PATCH 3.1] Preserve non-enumerable __fullAffectedAssetKeys field
      copyFullAffectedAssetKeys(issue, decoratedIssue);

      return decoratedIssue;
    });

    // Fire-and-forget Answer Block automations for relevant answerability issues.
    // This treats "not_answer_ready" and "weak_intent_match" as issue_detected triggers.
    // [INSIGHTS-1] Only trigger automations in 'full' mode, never in 'readOnly' mode
    if (opts.mode === 'full') {
      this.triggerAnswerBlockAutomationsForIssues(projectId, userId, decoratedIssues).catch(
        () => {
          // Intentionally swallow errors here so DEO issues computation is never blocked
          // by automation failures; logs and automation logs provide visibility.
        },
      );
    }

    return {
      projectId,
      generatedAt: new Date().toISOString(),
      issues: decoratedIssues,
    };
  }

  private async triggerAnswerBlockAutomationsForIssues(
    projectId: string,
    userId: string,
    issues: DeoIssue[],
  ): Promise<void> {
    const targetProductIds = new Set<string>();

    for (const issue of issues) {
      if (issue.id === 'not_answer_ready' || issue.id === 'weak_intent_match') {
        const affectedProducts = issue.affectedProducts || [];
        for (const productId of affectedProducts) {
          if (typeof productId === 'string' && targetProductIds.size < 20) {
            targetProductIds.add(productId);
          }
        }
      }
    }

    if (!targetProductIds.size) {
      return;
    }

    for (const productId of targetProductIds) {
      await this.automationService
        .triggerAnswerBlockAutomationForProduct(productId, userId, 'issue_detected')
        .catch(() => {
          // Swallow per-product automation errors; failures are logged via AutomationService
        });
    }
  }

  private buildMissingMetadataIssue(
    crawlResults: any[],
    products: any[],
    totalSurfaces: number,
  ): DeoIssue | null {
    if (totalSurfaces === 0) {
      return null;
    }

    let missingTitles = 0;
    let missingDescriptions = 0;
    let missingProductMetadata = 0;
    let surfacesWithMissing = 0;
    let missingPages = 0;
    let missingCollections = 0;
    const affectedPages: string[] = [];
    const affectedProducts: string[] = [];
    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Full affected asset tracking (no cap)
    const allAffectedPageUrls: string[] = [];
    const allAffectedProductIds: string[] = [];

    for (const cr of crawlResults) {
      let missingAny = false;

      if (!cr.title) {
        missingTitles++;
        missingAny = true;
      }

      if (!cr.metaDescription) {
        missingDescriptions++;
        missingAny = true;
      }

      if (missingAny) {
        surfacesWithMissing++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'collections') {
          missingCollections++;
        } else {
          // Treat product URLs as pages for this combined issue to avoid double-counting vs Product table.
          missingPages++;
        }
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.2] Always track full keys
        allAffectedPageUrls.push(cr.url);
      }
    }

    for (const product of products) {
      const hasSeoTitle = !!product.seoTitle;
      const hasSeoDescription = !!product.seoDescription;
      let missingAny = false;

      if (!hasSeoTitle || !hasSeoDescription) {
        missingProductMetadata++;
        missingAny = true;
      }

      if (missingAny) {
        if (affectedProducts.length < 20) {
          affectedProducts.push(product.id);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.2] Always track full keys
        allAffectedProductIds.push(product.id);
      }
    }

    const surfacesRatio = surfacesWithMissing / totalSurfaces;
    const severity = this.getSeverityForHigherIsWorse(surfacesRatio, {
      info: 0,
      warning: 0.03,
      critical: 0.1,
    });

    const detectedInstances = surfacesWithMissing + missingProductMetadata;

    if (!severity || detectedInstances === 0) {
      return null;
    }

    const issue: DeoIssue = {
      id: 'missing_metadata',
      title: 'Missing titles or descriptions',
      description:
        'Some pages or products are missing SEO titles or meta descriptions, which reduces visibility and click-through rates.',
      severity,
      count: detectedInstances,
      affectedPages,
      affectedProducts,
      // DEO-IA-1: Pillar assignment
      pillarId: 'metadata_snippet_quality' as DeoPillarId,
      actionability: 'manual' as DeoIssueActionability,
      assetTypeCounts: {
        products: missingProductMetadata,
        pages: missingPages,
        collections: missingCollections,
      },
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'metadata',
      whyItMatters:
        'Missing titles and descriptions reduce search engine and AI visibility, hurt click-through rates, and make it harder for users to find your content.',
      recommendedFix:
        'Add concise, descriptive titles and meta descriptions to all pages and products that match user intent and highlight key benefits.',
      aiFixable: false,
      fixCost: 'manual',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, allAffectedPageUrls);

    return issue;
  }

  private buildThinContentIssue(
    crawlResults: any[],
    products: any[],
    totalSurfaces: number,
  ): DeoIssue | null {
    if (totalSurfaces === 0) {
      return null;
    }

    let thinPages = 0;
    let thinProducts = 0;
    let thinCollections = 0;
    let thinNonCollectionPages = 0;
    const affectedPages: string[] = [];
    const affectedProducts: string[] = [];
    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Full affected asset tracking (no cap)
    const allAffectedPageUrls: string[] = [];
    const allAffectedProductIds: string[] = [];

    for (const cr of crawlResults) {
      const wordCount = typeof cr.wordCount === 'number' ? cr.wordCount : 0;
      if (wordCount > 0 && wordCount < 150) {
        thinPages++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'collections') {
          thinCollections++;
        } else {
          // Treat product URLs as pages for this combined issue to avoid double-counting vs Product table.
          thinNonCollectionPages++;
        }
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.2] Always track full keys
        allAffectedPageUrls.push(cr.url);
      }
    }

    for (const product of products) {
      const desc = (product.seoDescription ?? product.description) as string | null;
      const descWordCount = this.getWordCount(desc);
      if (descWordCount > 0 && descWordCount < 80) {
        thinProducts++;
        if (affectedProducts.length < 20) {
          affectedProducts.push(product.id);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.2] Always track full keys
        allAffectedProductIds.push(product.id);
      }
    }

    const thinSurfaces = thinPages + thinProducts;
    const thinRatio = thinSurfaces / totalSurfaces;
    const severity = this.getSeverityForHigherIsWorse(thinRatio, {
      info: 0.02,
      warning: 0.1,
      critical: 0.25,
    });

    if (!severity || thinSurfaces === 0) {
      return null;
    }

    const issue: DeoIssue = {
      id: 'thin_content',
      title: 'Thin content across pages and products',
      description:
        'Many pages or products have very short content, which weakens depth, answerability, and ranking potential.',
      severity,
      count: thinSurfaces,
      affectedPages,
      affectedProducts,
      // DEO-IA-1: Pillar assignment
      pillarId: 'content_commerce_signals' as DeoPillarId,
      actionability: 'manual' as DeoIssueActionability,
      assetTypeCounts: {
        products: thinProducts,
        pages: thinNonCollectionPages,
        collections: thinCollections,
      },
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'content_entity',
      whyItMatters:
        'Short content limits your ability to rank for competitive queries and makes it harder for AI systems to extract meaningful answers from your pages.',
      recommendedFix:
        'Expand key pages and products with richer descriptions, FAQs, and supporting details that address user questions comprehensively.',
      aiFixable: false,
      fixCost: 'manual',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, allAffectedPageUrls);

    return issue;
  }

  private buildLowEntityCoverageIssue(
    crawlResults: any[],
    products: any[],
    totalSurfaces: number,
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (totalSurfaces === 0) {
      return null;
    }

    let entityIssueSurfaces = 0;
    let entityCollections = 0;
    let entityPages = 0;
    let entityProducts = 0;
    const affectedPages: string[] = [];
    const affectedProducts: string[] = [];
    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Full affected asset tracking (no cap)
    const allAffectedPageUrls: string[] = [];
    const allAffectedProductIds: string[] = [];

    for (const cr of crawlResults) {
      const hasEntityHint = !!cr.title && !!cr.h1;
      if (!hasEntityHint) {
        entityIssueSurfaces++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'collections') {
          entityCollections++;
        } else {
          // Treat product URLs as pages for this combined issue to avoid double-counting vs Product table.
          entityPages++;
        }
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.2] Always track full keys
        allAffectedPageUrls.push(cr.url);
      }
    }

    for (const product of products) {
      const seoTitle = product.seoTitle as string | null;
      const seoDescription = product.seoDescription as string | null;
      const desc = (product.seoDescription ?? product.description) as string | null;
      const descWordCount = this.getWordCount(desc);
      const hasEntityHint =
        !!seoTitle && !!seoDescription && descWordCount >= 120;

      if (!hasEntityHint) {
        entityIssueSurfaces++;
        entityProducts++;
        if (affectedProducts.length < 20) {
          affectedProducts.push(product.id);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.2] Always track full keys
        allAffectedProductIds.push(product.id);
      }
    }

    let entityCoverage = signals?.entityCoverage ?? null;
    if (entityCoverage == null) {
      entityCoverage =
        totalSurfaces > 0
          ? (totalSurfaces - entityIssueSurfaces) / totalSurfaces
          : null;
    }

    const severity = this.getSeverityForLowerIsWorse(entityCoverage, {
      critical: 0.35,
      warning: 0.6,
      info: 0.8,
    });

    if (!severity || entityIssueSurfaces === 0) {
      return null;
    }

    const issue: DeoIssue = {
      id: 'low_entity_coverage',
      title: 'Weak entity coverage',
      description:
        'Some pages or products are missing a clear entity framing (title + H1 / metadata), which weakens discovery performance.',
      severity,
      count: entityIssueSurfaces,
      affectedPages,
      affectedProducts,
      pillarId: 'content_commerce_signals' as DeoPillarId,
      actionability: 'manual' as DeoIssueActionability,
      assetTypeCounts: {
        products: entityProducts,
        pages: entityPages,
        collections: entityCollections,
      },
      category: 'content_entity',
      whyItMatters:
        'Discovery engines need clear entity signals to understand what your pages and products represent. Missing entity hints reduce relevance and answerability.',
      recommendedFix:
        'Ensure every page and product has a clear title and H1, and that product descriptions include key attributes and entity terms.',
      aiFixable: false,
      fixCost: 'manual',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, allAffectedPageUrls);

    return issue;
  }

  private buildIndexabilityIssue(
    crawlResults: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let issueCount = 0;
    let issueProducts = 0;
    let issuePages = 0;
    let issueCollections = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const issues = (cr.issues as string[]) ?? [];
      const hasHttpError =
        issues.includes('HTTP_ERROR') || issues.includes('FETCH_ERROR');
      const isErrorStatus = cr.statusCode < 200 || cr.statusCode >= 400;
      const missingHtmlBasics = !cr.title || !cr.metaDescription || !cr.h1;
      const hasNoindex =
        issues.includes('NOINDEX') ||
        issues.includes('NO_INDEX') ||
        issues.includes('META_ROBOTS_NOINDEX');

      if (hasHttpError || isErrorStatus || missingHtmlBasics || hasNoindex) {
        issueCount++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'products') issueProducts++;
        else if (bucket === 'collections') issueCollections++;
        else issuePages++;
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    const indexability = signals?.indexability ?? null;
    const severity = this.getSeverityForLowerIsWorse(indexability, {
      critical: 0.5,
      warning: 0.75,
      info: 0.9,
    });

    if (!severity || issueCount === 0) {
      return null;
    }

    return {
      id: 'indexability_problems',
      title: 'Indexability problems',
      description:
        'Some pages may not be indexable due to robots/noindex settings or crawl constraints.',
      severity,
      count: issueCount,
      affectedPages,
      // DEO-IA-1: Pillar assignment
      pillarId: 'technical_indexability' as DeoPillarId,
      actionability: 'informational' as DeoIssueActionability,
      assetTypeCounts: { products: issueProducts, pages: issuePages, collections: issueCollections },
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'technical',
      whyItMatters:
        'If a page is not indexable, it cannot appear in search results or be referenced by AI discovery systems.',
      recommendedFix:
        'Review robots/noindex settings and ensure important pages are accessible to search engines.',
      aiFixable: false,
      fixCost: 'advanced',
    };
  }

  private buildIndexabilityConflictIssue(
    crawlResults: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let conflictCount = 0;
    let conflictProducts = 0;
    let conflictPages = 0;
    let conflictCollections = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const issues = (cr.issues as string[]) ?? [];
      const hasNoindex =
        issues.includes('NOINDEX') ||
        issues.includes('NO_INDEX') ||
        issues.includes('META_ROBOTS_NOINDEX');
      const hasCanonicalConflict = issues.includes('CANONICAL_CONFLICT');

      if (hasNoindex || hasCanonicalConflict) {
        conflictCount++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'products') conflictProducts++;
        else if (bucket === 'collections') conflictCollections++;
        else conflictPages++;
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    if (conflictCount === 0) {
      return null;
    }

    const indexability = signals?.indexability ?? null;
    const severity = this.getSeverityForLowerIsWorse(indexability, {
      critical: 0.6,
      warning: 0.8,
      info: 0.95,
    });

    if (!severity) {
      return null;
    }

    return {
      id: 'indexability_conflict',
      type: 'indexability_conflict',
      title: 'Indexability conflicts',
      description:
        'Some pages have conflicting indexability signals (e.g., sitemap includes but robots/noindex blocks).',
      severity,
      count: conflictCount,
      affectedPages,
      pillarId: 'technical_indexability' as DeoPillarId,
      actionability: 'informational' as DeoIssueActionability,
      assetTypeCounts: { products: conflictProducts, pages: conflictPages, collections: conflictCollections },
      category: 'technical',
      whyItMatters:
        'Conflicting indexability signals waste crawl budget and can prevent key pages from ranking.',
      recommendedFix:
        'Align sitemap and robots/noindex settings so important pages are consistently indexable.',
      aiFixable: false,
      fixCost: 'advanced',
      signalType: 'indexability_risk' as PerformanceSignalType,
    };
  }

  private buildAnswerSurfaceIssue(
    crawlResults: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let weakCount = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const wordCount = typeof cr.wordCount === 'number' ? cr.wordCount : 0;
      const hasH1 = !!cr.h1;
      const isWeak = (wordCount > 0 && wordCount < 400) || !hasH1;

      if (isWeak) {
        weakCount++;
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    const answerSurfacePresence = signals?.answerSurfacePresence ?? null;
    const severity = this.getSeverityForLowerIsWorse(answerSurfacePresence, {
      critical: 0.2,
      warning: 0.35,
      info: 0.5,
    });

    if (!severity || weakCount === 0) {
      return null;
    }

    return {
      id: 'answer_surface_weakness',
      title: 'Weak answer surfaces',
      description:
        'Many pages lack the long-form content and clear headings needed to be strong answer surfaces for search and AI assistants.',
      severity,
      count: weakCount,
      affectedPages,
      // DEO-IA-1: Pillar assignment (answer surfaces map to intent-fit & answerability)
      pillarId: 'search_intent_fit' as DeoPillarId,
      actionability: 'manual' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'answerability',
      whyItMatters:
        'Pages without sufficient content depth cannot serve as sources for featured snippets, AI answers, or voice search results.',
      recommendedFix:
        'Add long-form content with clear headings that directly answer common user questions about your products and services.',
      aiFixable: false,
      fixCost: 'manual',
    };
  }

  private buildBrandNavigationalIssue(
    crawlResults: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    const canonicalPaths = ['/', '/about', '/contact', '/faq', '/support'];
    const found = new Set<string>();

    for (const cr of crawlResults) {
      const path = this.extractPathFromUrl(cr.url);
      if (canonicalPaths.includes(path)) {
        found.add(path);
      }
    }

    const missing = canonicalPaths.filter((p) => !found.has(p));
    const brandNavigationalStrength = signals?.brandNavigationalStrength ?? null;
    const severity = this.getSeverityForLowerIsWorse(brandNavigationalStrength, {
      critical: 0.25,
      warning: 0.4,
      info: 0.6,
    });

    const count = missing.length;

    if (!severity || count === 0) {
      return null;
    }

    return {
      id: 'brand_navigational_weakness',
      title: 'Brand navigational weakness',
      description:
        'Canonical navigational pages like /about, /contact, /faq, or /support are missing or not discoverable, weakening brand and trust signals.',
      severity,
      count,
      affectedPages: missing,
      // DEO-IA-1: Pillar assignment (brand & navigational strength treated as visibility/off-site signal)
      pillarId: 'offsite_signals' as DeoPillarId,
      actionability: 'manual' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'schema_visibility',
      whyItMatters:
        'Missing canonical pages weaken brand signals and reduce user trust, which affects both search rankings and conversion rates.',
      recommendedFix:
        'Create essential pages like /about, /contact, /faq, and /support with rich content that builds credibility and answers common questions.',
      aiFixable: false,
      fixCost: 'advanced',
    };
  }

  private buildCrawlHealthIssue(
    crawlResults: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let errorCount = 0;
    let issuePages = 0;
    let issueCollections = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const issues = (cr.issues as string[]) ?? [];
      const hasHttpError =
        issues.includes('HTTP_ERROR') || issues.includes('FETCH_ERROR');
      const isErrorStatus = cr.statusCode < 200 || cr.statusCode >= 400;

      if (hasHttpError || isErrorStatus) {
        errorCount++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'collections') {
          issueCollections++;
        } else {
          issuePages++;
        }
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    const crawlHealth = signals?.crawlHealth ?? null;
    const severity = this.getSeverityForLowerIsWorse(crawlHealth, {
      critical: 0.6,
      warning: 0.8,
      info: 0.95,
    });

    if (!severity || errorCount === 0) {
      return null;
    }

    return {
      id: 'crawl_health_errors',
      title: 'Crawl health and errors',
      description:
        'A number of pages return HTTP errors or cannot be crawled reliably, which can hide issues and hurt discovery.',
      severity,
      count: errorCount,
      affectedPages,
      // DEO-IA-1: Pillar assignment
      pillarId: 'technical_indexability' as DeoPillarId,
      actionability: 'informational' as DeoIssueActionability,
      // COUNT-INTEGRITY-1: Asset type distribution
      assetTypeCounts: {
        products: 0,
        pages: issuePages,
        collections: issueCollections,
      },
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'technical',
      whyItMatters:
        'Crawl errors prevent search engines from accessing your content and may indicate deeper site health problems that affect user experience.',
      recommendedFix:
        'Identify and fix broken pages, server errors, and timeout issues. Monitor crawl health regularly to catch new problems early.',
      aiFixable: false,
      fixCost: 'advanced',
    };
  }

  private buildRenderBlockingResourcesIssue(
    crawlResults: any[],
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let blockingPages = 0;
    let issuePages = 0;
    let issueCollections = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const issues = (cr.issues as string[]) ?? [];
      if (issues.includes('RENDER_BLOCKING_RESOURCES')) {
        blockingPages++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'collections') {
          issueCollections++;
        } else {
          issuePages++;
        }
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    if (blockingPages === 0) {
      return null;
    }

    const totalPages = crawlResults.length;
    const ratio = totalPages > 0 ? blockingPages / totalPages : 0;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.05,
      warning: 0.15,
      critical: 0.3,
    });

    if (!severity) {
      return null;
    }

    return {
      id: 'render_blocking_resources',
      type: 'render_blocking_resources',
      title: 'Render-blocking scripts and styles',
      description:
        'Some pages load multiple blocking scripts or styles in the head before content, delaying when users and crawlers see meaningful content.',
      severity,
      count: blockingPages,
      affectedPages,
      pillarId: 'technical_indexability' as DeoPillarId,
      actionability: 'informational' as DeoIssueActionability,
      // COUNT-INTEGRITY-1: Asset type distribution
      assetTypeCounts: {
        products: 0,
        pages: issuePages,
        collections: issueCollections,
      },
      category: 'technical',
      whyItMatters:
        'Render-blocking resources slow down initial rendering, which makes it harder for discovery engines and real users on slower connections to reach your content.',
      recommendedFix:
        'Defer or async non-critical scripts, move heavy third-party tags below the main content, and keep critical CSS lean for above-the-fold content.',
      aiFixable: false,
      fixCost: 'advanced',
      signalType: 'render_blocking' as PerformanceSignalType,
    };
  }

  private buildSlowInitialResponseIssue(crawlResults: any[]): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let slowPages = 0;
    let issuePages = 0;
    let issueCollections = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const loadTimeMs =
        typeof cr.loadTimeMs === 'number' ? cr.loadTimeMs : null;
      const issues = (cr.issues as string[]) ?? [];
      const isSlow =
        (loadTimeMs != null && loadTimeMs > 2500) ||
        issues.includes('SLOW_LOAD_TIME');

      if (isSlow) {
        slowPages++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'collections') {
          issueCollections++;
        } else {
          issuePages++;
        }
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    if (slowPages === 0) {
      return null;
    }

    const ratio = slowPages / crawlResults.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.3,
      critical: 0.5,
    });

    if (!severity) {
      return null;
    }

    return {
      id: 'slow_initial_response',
      type: 'slow_initial_response',
      title: 'Slow initial response',
      description:
        'Some pages take a long time before any content is ready, which can lead to timeouts for crawlers and impatient visitors.',
      severity,
      count: slowPages,
      affectedPages,
      pillarId: 'technical_indexability' as DeoPillarId,
      actionability: 'informational' as DeoIssueActionability,
      // COUNT-INTEGRITY-1: Asset type distribution
      assetTypeCounts: {
        products: 0,
        pages: issuePages,
        collections: issueCollections,
      },
      category: 'technical',
      whyItMatters:
        'Slow initial responses reduce how much of your site discovery engines can crawl and increase the chance that users abandon before your content appears.',
      recommendedFix:
        'Review hosting and theme configuration for the affected pages. Reduce heavy above-the-fold apps and scripts, enable caching where possible, and keep key templates lean.',
      aiFixable: false,
      fixCost: 'manual',
      signalType: 'ttfb_proxy' as PerformanceSignalType,
    };
  }

  private buildExcessivePageWeightIssue(crawlResults: any[]): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let heavyPages = 0;
    let issuePages = 0;
    let issueCollections = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const issues = (cr.issues as string[]) ?? [];
      if (
        issues.includes('VERY_LARGE_HTML') ||
        issues.includes('LARGE_HTML')
      ) {
        heavyPages++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'collections') {
          issueCollections++;
        } else {
          issuePages++;
        }
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    if (heavyPages === 0) {
      return null;
    }

    const ratio = heavyPages / crawlResults.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.05,
      warning: 0.15,
      critical: 0.3,
    });

    if (!severity) {
      return null;
    }

    return {
      id: 'excessive_page_weight',
      type: 'excessive_page_weight',
      title: 'Page weight risk',
      description:
        'Some pages have very large HTML payloads, which slows down rendering and makes them more expensive for discovery engines to crawl.',
      severity,
      count: heavyPages,
      affectedPages,
      pillarId: 'technical_indexability' as DeoPillarId,
      actionability: 'informational' as DeoIssueActionability,
      // COUNT-INTEGRITY-1: Asset type distribution
      assetTypeCounts: {
        products: 0,
        pages: issuePages,
        collections: issueCollections,
      },
      category: 'technical',
      whyItMatters:
        'Very heavy pages consume more crawl budget and are more likely to time out on slower connections, reducing how much of your catalog can be reliably discovered.',
      recommendedFix:
        'Review theme templates and apps on the affected pages. Remove unused sections, avoid duplicating large blocks of HTML, and simplify markup to keep HTML lean.',
      aiFixable: false,
      fixCost: 'manual',
      signalType: 'page_weight_risk' as PerformanceSignalType,
    };
  }

  private buildMobileRenderingRiskIssue(
    crawlResults: any[],
  ): DeoIssue | null {
    if (crawlResults.length === 0) {
      return null;
    }

    let mobileRiskPages = 0;
    let issuePages = 0;
    let issueCollections = 0;
    const affectedPages: string[] = [];

    for (const cr of crawlResults) {
      const issues = (cr.issues as string[]) ?? [];
      if (
        issues.includes('MISSING_VIEWPORT_META') ||
        issues.includes('POTENTIAL_MOBILE_LAYOUT_ISSUE')
      ) {
        mobileRiskPages++;
        const bucket = getAssetTypeFromUrl(cr.url);
        if (bucket === 'collections') {
          issueCollections++;
        } else {
          issuePages++;
        }
        if (affectedPages.length < 20) {
          affectedPages.push(cr.url);
        }
      }
    }

    if (mobileRiskPages === 0) {
      return null;
    }

    const ratio = mobileRiskPages / crawlResults.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.3,
      critical: 0.5,
    });

    if (!severity) {
      return null;
    }

    return {
      id: 'mobile_rendering_risk',
      type: 'mobile_rendering_risk',
      title: 'Mobile rendering risk',
      description:
        'Some pages are missing responsive viewport configuration or may render poorly on smaller screens.',
      severity,
      count: mobileRiskPages,
      affectedPages,
      pillarId: 'technical_indexability' as DeoPillarId,
      actionability: 'informational' as DeoIssueActionability,
      // COUNT-INTEGRITY-1: Asset type distribution
      assetTypeCounts: {
        products: 0,
        pages: issuePages,
        collections: issueCollections,
      },
      category: 'technical',
      whyItMatters:
        'Poor mobile rendering hurts engagement on mobile devices and makes it harder for mobile-first discovery engines to trust and surface your content.',
      recommendedFix:
        'Ensure your theme sets a responsive viewport meta tag and test the affected pages on mobile devices. Avoid fixed-width layouts that require horizontal scrolling.',
      aiFixable: false,
      fixCost: 'manual',
      signalType: 'mobile_readiness' as PerformanceSignalType,
    };
  }

  private buildProductContentDepthIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) {
      return null;
    }

    let shortOrMissingDescriptions = 0;
    let sumProductWords = 0;
    let countProductWords = 0;
    const affectedProducts: string[] = [];
    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Full affected asset tracking (no cap)
    const allAffectedProductIds: string[] = [];

    for (const product of products) {
      const desc = (product.seoDescription ?? product.description) as string | null;
      const wordCount = this.getWordCount(desc);

      if (wordCount > 0) {
        sumProductWords += wordCount;
        countProductWords++;
      }

      if (wordCount === 0 || wordCount < 50) {
        shortOrMissingDescriptions++;
        if (affectedProducts.length < 20) {
          affectedProducts.push(product.id);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.2] Always track full keys
        allAffectedProductIds.push(product.id);
      }
    }

    if (shortOrMissingDescriptions === 0) {
      return null;
    }

    const avgProductWordCount =
      countProductWords > 0 ? sumProductWords / countProductWords : 0;
    const contentDepthProducts = Math.max(
      0,
      Math.min(1, avgProductWordCount / 600),
    );

    const severity = this.getSeverityForLowerIsWorse(contentDepthProducts, {
      critical: 0.25,
      warning: 0.45,
      info: 0.65,
    });

    if (!severity) {
      return null;
    }

    const issue: DeoIssue = {
      id: 'product_content_depth',
      title: 'Shallow product descriptions',
      description:
        'Many products have very short or missing descriptions, limiting their ability to rank and convert.',
      severity,
      count: shortOrMissingDescriptions,
      affectedProducts,
      // DEO-IA-1: Pillar assignment
      pillarId: 'content_commerce_signals' as DeoPillarId,
      actionability: 'manual' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'content_entity',
      whyItMatters:
        'Products with thin descriptions cannot compete in search results and fail to provide the information customers need to make purchase decisions.',
      recommendedFix:
        'Write detailed product descriptions that cover features, benefits, use cases, and specifications. Aim for at least 150 words per product.',
      aiFixable: false,
      fixCost: 'manual',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  // ========== Issue Engine Lite: Product-Focused Builders ==========

  /**
   * Missing SEO Title - Products without seoTitle set
   */
  private buildMissingSeoTitleIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => !p.seoTitle);
    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0,
      warning: 0.1,
      critical: 0.3,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'missing_seo_title',
      type: 'missing_seo_title',
      title: 'Missing SEO Title',
      description:
        'Products without an SEO title are harder for search engines and AI assistants to understand and rank.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'metadata_snippet_quality' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'metadata',
      whyItMatters:
        'SEO titles are the primary way search engines and AI understand what your product is. Missing titles severely limit discoverability.',
      recommendedFix:
        'Use AI to generate compelling, keyword-rich SEO titles that accurately describe each product and appeal to your target audience.',
      aiFixable: true,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Missing SEO Description - Products without seoDescription set
   */
  private buildMissingSeoDescriptionIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => !p.seoDescription);
    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0,
      warning: 0.1,
      critical: 0.3,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'missing_seo_description',
      type: 'missing_seo_description',
      title: 'Missing SEO Description',
      description:
        'Products without an SEO description miss out on click-through optimization and rich snippet opportunities.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'metadata_snippet_quality' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'metadata',
      whyItMatters:
        'Meta descriptions appear in search results and heavily influence click-through rates. They also help AI understand product context.',
      recommendedFix:
        'Use AI to generate persuasive meta descriptions that highlight key benefits and include relevant keywords.',
      aiFixable: true,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Weak Title - Products with seoTitle that is too short or generic
   */
  private buildWeakTitleIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const title = (p.seoTitle ?? p.title ?? '') as string;
      // Weak: too short (<20 chars) or same as product title (no optimization)
      return title.length > 0 && (title.length < 20 || title === p.title);
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.05,
      warning: 0.15,
      critical: 0.35,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'weak_title',
      type: 'weak_title',
      title: 'Weak Product Title',
      description:
        'Some product titles are too short or unoptimized, reducing their search visibility and click appeal.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'metadata_snippet_quality' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'metadata',
      whyItMatters:
        'Weak titles fail to capture attention in search results and don\'t convey the unique value of your products.',
      recommendedFix:
        'Use AI to optimize titles with compelling language, relevant keywords, and clear value propositions.',
      aiFixable: true,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Weak Description - Products with seoDescription that is too short
   */
  private buildWeakDescriptionIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const desc = (p.seoDescription ?? '') as string;
      // Has a description but it's weak: < 80 chars
      return desc.length > 0 && desc.length < 80;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.05,
      warning: 0.15,
      critical: 0.35,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'weak_description',
      type: 'weak_description',
      title: 'Weak Product Description',
      description:
        'Short SEO descriptions limit search snippet quality and fail to convey product value.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'metadata_snippet_quality' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'metadata',
      whyItMatters:
        'Short descriptions get truncated in search results and fail to differentiate your products from competitors.',
      recommendedFix:
        'Use AI to expand descriptions with compelling copy that highlights features, benefits, and unique selling points.',
      aiFixable: true,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Missing Long Description - Products without detailed body content
   */
  private buildMissingLongDescriptionIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const desc = (p.description ?? '') as string;
      const wordCount = this.getWordCount(desc);
      // Missing or very thin body description: < 50 words
      return wordCount < 50;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.25,
      critical: 0.5,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'missing_long_description',
      type: 'missing_long_description',
      title: 'Missing Long Description',
      description:
        'Products without detailed descriptions lack the content depth needed for rich search results and AI answers.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'content_commerce_signals' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'content_entity',
      whyItMatters:
        'Long descriptions provide the depth needed for AI systems to understand your products and recommend them in answer experiences.',
      recommendedFix:
        'Write comprehensive product descriptions covering features, specifications, use cases, and benefits. Consider adding FAQs and care instructions.',
      aiFixable: true,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Duplicate Product Content - Products with identical or near-identical descriptions
   */
  private buildDuplicateProductContentIssue(products: any[]): DeoIssue | null {
    if (products.length < 2) return null;

    // Simple hash-based duplicate detection on seoDescription
    const descMap = new Map<string, any[]>();
    for (const p of products) {
      const desc = ((p.seoDescription ?? p.description ?? '') as string)
        .toLowerCase()
        .trim();
      if (desc.length < 20) continue; // Skip very short ones

      const existing = descMap.get(desc) ?? [];
      existing.push(p);
      descMap.set(desc, existing);
    }

    const duplicateGroups = Array.from(descMap.values()).filter(
      (group) => group.length > 1,
    );
    const affectedProducts: string[] = [];
    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds: string[] = [];
    for (const group of duplicateGroups) {
      for (const p of group) {
        if (affectedProducts.length < 20) {
          affectedProducts.push(p.id);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.2] Always track full keys
        allAffectedProductIds.push(p.id);
      }
    }

    if (affectedProducts.length === 0) return null;

    const ratio = affectedProducts.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.02,
      warning: 0.1,
      critical: 0.25,
    });

    if (!severity) return null;

    const issue: DeoIssue = {
      id: 'duplicate_product_content',
      type: 'duplicate_product_content',
      title: 'Duplicate Product Content',
      description:
        'Multiple products share identical descriptions, which can hurt search rankings and confuse AI systems.',
      severity,
      count: affectedProducts.length,
      affectedProducts,
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affectedProducts[0],
      // DEO-IA-1: Pillar assignment
      pillarId: 'content_commerce_signals' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'content_entity',
      whyItMatters:
        'Duplicate content dilutes your search visibility and makes it impossible for AI to distinguish between your products.',
      recommendedFix:
        'Use AI to rewrite duplicate descriptions, highlighting what makes each product unique while maintaining consistent brand voice.',
      aiFixable: true,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Low Product Entity Coverage - Products lacking rich entity signals
   */
  private buildLowProductEntityCoverageIssue(
    products: any[],
    signals: DeoScoreSignals | null,
  ): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const seoTitle = (p.seoTitle ?? '') as string;
      const seoDesc = (p.seoDescription ?? '') as string;
      const desc = (p.description ?? '') as string;
      const descWordCount = this.getWordCount(desc);

      // Low entity coverage: missing seoTitle OR seoDesc too short OR body too thin
      return !seoTitle || seoDesc.length < 60 || descWordCount < 100;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.3,
      critical: 0.5,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'low_product_entity_coverage',
      type: 'low_product_entity_coverage',
      title: 'Low Entity Coverage in Product Content',
      description:
        'Products lack the rich metadata and content depth needed for strong entity signals in search and AI.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'content_commerce_signals' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'schema_visibility',
      whyItMatters:
        'Low entity coverage means search engines can\'t properly categorize your products or show them for relevant entity-based queries.',
      recommendedFix:
        'Use AI to enrich product content with structured data, clear categorization, and detailed attribute coverage.',
      aiFixable: true,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Not Answer-Ready - Products that can't serve as good AI answer sources
   */
  private buildNotAnswerReadyIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const desc = (p.description ?? '') as string;
      const seoDesc = (p.seoDescription ?? '') as string;
      const descWordCount = this.getWordCount(desc);
      const seoDescWordCount = this.getWordCount(seoDesc);

      // Not answer-ready: total content < 80 words
      return descWordCount + seoDescWordCount < 80;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.25,
      critical: 0.5,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'not_answer_ready',
      type: 'not_answer_ready',
      title: 'Not Answer-Ready',
      description:
        'Products lack sufficient content to be cited or featured in AI-powered answer experiences.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'search_intent_fit' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'answerability',
      whyItMatters:
        'Products without answer-ready content will be skipped by AI assistants when users ask product-related questions.',
      recommendedFix:
        'Use AI to enhance product content with Q&A-style information that directly addresses common customer questions.',
      aiFixable: true,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Weak Intent Match - Products whose metadata doesn't match likely search intent
   */
  private async buildGeoIssuesForProject(projectId: string, products: any[]): Promise<DeoIssue[]> {
    if (!Array.isArray(products) || products.length === 0) return [];

    const productIds = products.map((p) => p.id);
    const blocks = await (this.prisma as any).answerBlock.findMany({
      where: { productId: { in: productIds } },
      select: { id: true, productId: true, questionId: true, answerText: true, sourceFieldsUsed: true },
    });

    const byProduct = new Map<string, any[]>();
    for (const b of blocks) {
      const existing = byProduct.get(b.productId) ?? [];
      existing.push(b);
      byProduct.set(b.productId, existing);
    }

    const affectedByIssue = new Map<GeoIssueType, Set<string>>();
    const geoIssueTypes: GeoIssueType[] = [
      'missing_direct_answer',
      'answer_too_vague',
      'poor_answer_structure',
      'answer_overly_promotional',
      'missing_examples_or_facts',
    ];
    for (const t of geoIssueTypes) affectedByIssue.set(t, new Set());

    for (const p of products) {
      const productBlocks = byProduct.get(p.id) ?? [];
      const units: GeoAnswerUnitInput[] = productBlocks.map((b) => ({
        unitId: b.id,
        questionId: b.questionId,
        answer: b.answerText || '',
        factsUsed: b.sourceFieldsUsed ?? [],
        pillarContext: 'search_intent_fit',
      }));
      const evalResult = evaluateGeoProduct(units);
      for (const issue of evalResult.issues) {
        const set = affectedByIssue.get(issue.issueType as GeoIssueType);
        if (set) set.add(p.id);
      }
    }

    const results: DeoIssue[] = [];
    for (const issueType of geoIssueTypes) {
      const affectedSet = affectedByIssue.get(issueType) ?? new Set<string>();
      if (affectedSet.size === 0) continue;
      const ratio = affectedSet.size / products.length;
      const severity = this.getSeverityForHigherIsWorse(ratio, { info: 0.1, warning: 0.25, critical: 0.5 });
      if (!severity) continue;

      // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
      const allAffectedProductIds = Array.from(affectedSet);

      const issue: DeoIssue = {
        id: issueType,
        type: issueType,
        geoIssueType: issueType,
        geoSignalType:
          issueType === 'poor_answer_structure'
            ? 'structure'
            : issueType === 'missing_direct_answer' || issueType === 'answer_overly_promotional'
              ? 'clarity'
              : 'specificity',
        geoPillarContext: 'search_intent_fit',
        title: GEO_ISSUE_LABELS[issueType],
        description: GEO_ISSUE_DESCRIPTIONS[issueType],
        severity,
        count: affectedSet.size,
        affectedProducts: Array.from(affectedSet).slice(0, 20),
        fixType: 'aiFix',
        fixReady: true,
        primaryProductId: Array.from(affectedSet)[0],
        pillarId: 'search_intent_fit' as DeoPillarId,
        actionability: 'automation' as any,
        category: 'answerability',
        whyItMatters:
          'Clear, neutral, well-structured answers improve extractability for AI answer experiences (no citation guarantee).',
        recommendedFix:
          'Use Preview to generate a draft improvement for the Answer Block, then Apply (apply never uses AI).',
        aiFixable: true,
        fixCost: 'one_click',
      };

      // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
      attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

      results.push(issue);
    }
    return results;
  }

  private buildWeakIntentMatchIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const seoTitle = (p.seoTitle ?? '') as string;
      const title = (p.title ?? '') as string;
      const seoDesc = (p.seoDescription ?? '') as string;

      // Weak intent match: seoTitle exactly equals product title (no optimization)
      // or seoDescription is empty/very generic
      const titleNotOptimized = seoTitle === title && seoTitle.length > 0;
      const descTooGeneric = seoDesc.length > 0 && seoDesc.length < 50;

      return titleNotOptimized || descTooGeneric;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.1,
      warning: 0.25,
      critical: 0.5,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'weak_intent_match',
      type: 'weak_intent_match',
      title: 'Weak Intent Match',
      description:
        'Product metadata may not align well with user search intent, limiting discoverability.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'aiFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'search_intent_fit' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'answerability',
      whyItMatters:
        'Products that don\'t match search intent will appear for the wrong queries or not appear at all for the right ones.',
      recommendedFix:
        'Use AI to optimize product content to better match the language and intent of your target customers\' searches.',
      aiFixable: true,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Missing Product Image - Products without images
   */
  private buildMissingProductImageIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const images = p.imageUrls as string[] | null;
      return !images || images.length === 0;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0,
      warning: 0.05,
      critical: 0.15,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'missing_product_image',
      type: 'missing_product_image',
      title: 'Missing Product Image',
      description:
        'Products without images have significantly lower engagement and conversion rates.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'manualFix',
      fixReady: false,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'media_accessibility' as DeoPillarId,
      actionability: 'manual' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'technical',
      whyItMatters:
        'Products without images are excluded from image search, shopping feeds, and visual AI experiences.',
      recommendedFix:
        'Upload high-quality product images to Shopify. Include multiple angles and lifestyle shots where possible.',
      aiFixable: false,
      fixCost: 'manual',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Missing Price - Products without price information
   */
  private buildMissingPriceIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      // Check common price field patterns
      const price = p.price ?? p.priceMin ?? p.priceMax;
      return price == null || price === 0;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0,
      warning: 0.05,
      critical: 0.15,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'missing_price',
      type: 'missing_price',
      title: 'Missing Product Price',
      description:
        'Products without price data cannot appear in price-filtered search results or shopping feeds.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'syncFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment (feeds structured data / shopping visibility)
      pillarId: 'technical_indexability' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'technical',
      whyItMatters:
        'Missing prices exclude products from shopping results, comparison engines, and price-based AI recommendations.',
      recommendedFix:
        'Re-sync from Shopify to pull the latest price data. If prices are missing in Shopify, update them there first.',
      aiFixable: false,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  /**
   * Missing Category - Products without category/type classification
   */
  private buildMissingCategoryIssue(products: any[]): DeoIssue | null {
    if (products.length === 0) return null;

    const affected = products.filter((p) => {
      const productType = p.productType ?? p.category ?? p.type;
      return !productType || (productType as string).trim().length === 0;
    });

    if (affected.length === 0) return null;

    const ratio = affected.length / products.length;
    const severity = this.getSeverityForHigherIsWorse(ratio, {
      info: 0.05,
      warning: 0.15,
      critical: 0.35,
    });

    if (!severity) return null;

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Track all affected product IDs (no cap)
    const allAffectedProductIds = affected.map((p) => p.id);

    const issue: DeoIssue = {
      id: 'missing_category',
      type: 'missing_category',
      title: 'Missing Product Category/Type',
      description:
        'Products without categories are harder to organize, filter, and surface in relevant search contexts.',
      severity,
      count: affected.length,
      affectedProducts: affected.slice(0, 20).map((p) => p.id),
      fixType: 'syncFix',
      fixReady: true,
      primaryProductId: affected[0]?.id,
      // DEO-IA-1: Pillar assignment
      pillarId: 'content_commerce_signals' as DeoPillarId,
      actionability: 'automation' as DeoIssueActionability,
      // Issue Engine Full metadata (Phase UX-8 / IE-2.0)
      category: 'schema_visibility',
      whyItMatters:
        'Categories help search engines and AI understand product relationships and surface them for category-specific queries.',
      recommendedFix:
        'Re-sync from Shopify to pull category data, or manually assign product types in your Shopify admin.',
      aiFixable: false,
      fixCost: 'one_click',
    };

    // [COUNT-INTEGRITY-1.1 PATCH 3.2] Attach full affected asset keys for accurate deduplication
    attachFullAffectedAssetKeys(issue, allAffectedProductIds, []);

    return issue;
  }

  // ========== Helper Methods ==========

  private getSeverityForHigherIsWorse(
    ratio: number,
    thresholds: { info: number; warning: number; critical: number },
  ): 'critical' | 'warning' | 'info' | null {
    if (ratio > thresholds.critical) {
      return 'critical';
    }
    if (ratio > thresholds.warning) {
      return 'warning';
    }
    if (ratio > thresholds.info) {
      return 'info';
    }
    return null;
  }

  private getSeverityForLowerIsWorse(
    value: number | null | undefined,
    thresholds: { critical: number; warning: number; info: number },
  ): 'critical' | 'warning' | 'info' | null {
    if (value == null) {
      return null;
    }

    if (value < thresholds.critical) {
      return 'critical';
    }
    if (value < thresholds.warning) {
      return 'warning';
    }
    if (value < thresholds.info) {
      return 'info';
    }

    return null;
  }

  private getWordCount(text: string | null | undefined): number {
    if (!text) {
      return 0;
    }

    return text
      .toString()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  private extractPathFromUrl(url: string): string {
    try {
      const lower = url.toLowerCase();
      const protocolIndex = lower.indexOf('://');

      if (protocolIndex === -1) {
        const pathIndex = lower.indexOf('/');
        return pathIndex === -1 ? '/' : lower.substring(pathIndex).split('?')[0];
      }

      const pathStart = lower.indexOf('/', protocolIndex + 3);
      if (pathStart === -1) {
        return '/';
      }

      return lower.substring(pathStart).split('?')[0];
    } catch {
      return '/';
    }
  }
}
