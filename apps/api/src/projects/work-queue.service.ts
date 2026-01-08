import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DeoIssuesService } from './deo-issues.service';
import { AutomationPlaybooksService, AutomationPlaybookId } from './automation-playbooks.service';
import { GeoReportsService } from './geo-reports.service';
import { GovernanceService } from './governance.service';
import { ApprovalsService } from './approvals.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import {
  WorkQueueActionBundle,
  WorkQueueBundleType,
  WorkQueueRecommendedActionKey,
  WorkQueueHealth,
  WorkQueueState,
  WorkQueueAiUsage,
  WorkQueueScopeType,
  WorkQueueApprovalStatus,
  WorkQueueDraftStatus,
  WorkQueueShareLinkStatus,
  WorkQueueTab,
  WorkQueueResponse,
  WorkQueueViewer,
  WORK_QUEUE_AI_DISCLOSURE_TEXT,
  WORK_QUEUE_ACTION_LABELS,
  WORK_QUEUE_IMPACT_RANKS,
  WORK_QUEUE_STATE_PRIORITY,
  WORK_QUEUE_HEALTH_PRIORITY,
} from '@engineo/shared';
import type { DeoIssue, DeoIssueSeverity } from '@engineo/shared';
import { ApprovalResourceType } from '@prisma/client';

/**
 * [WORK-QUEUE-1] Work Queue Derivation Service
 *
 * Derives Action Bundles from existing persisted artifacts.
 * No new WorkQueue storage tables - all data is computed at request time.
 *
 * Sources:
 * - Issue-derived bundles (ASSET_OPTIMIZATION): DeoIssuesService
 * - Automation bundles (AUTOMATION_RUN): AutomationPlaybooksService + drafts
 * - GEO export bundle (GEO_EXPORT): GeoReportsService
 *
 * [ASSETS-PAGES-1] Issue-derived bundles now split by scopeType:
 * - PRODUCTS: Product-level issues (existing)
 * - PAGES: Page-level issues (/pages/*, static pages)
 * - COLLECTIONS: Collection-level issues (/collections/*)
 */

/**
 * [ASSETS-PAGES-1] URL path classification for pages and collections.
 * Reuses logic from projects.service.ts#getCrawlPages.
 */
type AssetPageType = 'product' | 'collection' | 'page' | 'other';

function classifyUrlPath(url: string): AssetPageType {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();

    if (path.startsWith('/products/') || path === '/products') {
      return 'product';
    }
    if (path.startsWith('/collections/') || path === '/collections') {
      return 'collection';
    }
    // /pages/* and other non-product, non-collection URLs are considered pages
    if (path.startsWith('/pages/')) {
      return 'page';
    }
    // Static paths that should be classified as pages
    const staticPaths = new Set([
      '/about', '/contact', '/faq', '/support', '/shipping', '/returns',
      '/privacy', '/terms', '/privacy-policy', '/terms-of-service', '/refund-policy',
    ]);
    if (staticPaths.has(path)) {
      return 'page';
    }
    return 'other';
  } catch {
    return 'other';
  }
}
@Injectable()
export class WorkQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deoIssuesService: DeoIssuesService,
    private readonly automationPlaybooksService: AutomationPlaybooksService,
    private readonly geoReportsService: GeoReportsService,
    private readonly governanceService: GovernanceService,
    private readonly approvalsService: ApprovalsService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  /**
   * Get Work Queue items for a project.
   *
   * Derives bundles from existing artifacts and applies deterministic sorting.
   * [ASSETS-PAGES-1] Added scopeType filter for filtering by asset type.
   */
  async getWorkQueue(
    projectId: string,
    userId: string,
    params?: {
      tab?: WorkQueueTab;
      bundleType?: WorkQueueBundleType;
      actionKey?: WorkQueueRecommendedActionKey;
      scopeType?: WorkQueueScopeType;
      bundleId?: string;
    },
  ): Promise<WorkQueueResponse> {
    // [ROLES-3] Verify membership (any role can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    // Get project with timestamps for stable createdAt
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        userId: true,
        lastDeoComputedAt: true,
        lastCrawledAt: true,
        createdAt: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get viewer context for role-aware UI
    const effectiveRole = await this.roleResolution.resolveEffectiveRole(projectId, userId);
    const capabilities = this.roleResolution.getCapabilities(effectiveRole);
    const isMultiUserProject = await this.roleResolution.isMultiUserProject(projectId);

    const viewer: WorkQueueViewer = {
      role: effectiveRole as 'OWNER' | 'EDITOR' | 'VIEWER',
      capabilities: {
        canGenerateDrafts: capabilities.canGenerateDrafts,
        canApply: capabilities.canApply,
        canApprove: capabilities.canApprove,
        canRequestApproval: capabilities.canRequestApproval,
      },
      isMultiUserProject,
    };

    // Derive bundles from each source in parallel
    const [issueBundles, automationBundles, geoBundle] = await Promise.all([
      this.deriveIssueBundles(projectId, userId, project),
      this.deriveAutomationBundles(projectId, userId, project),
      this.deriveGeoExportBundle(projectId, userId, project),
    ]);

    // Combine all bundles
    let allBundles = [...issueBundles, ...automationBundles];
    if (geoBundle) {
      allBundles.push(geoBundle);
    }

    // Apply filters if specified
    if (params?.bundleType) {
      allBundles = allBundles.filter((b) => b.bundleType === params.bundleType);
    }
    if (params?.actionKey) {
      allBundles = allBundles.filter((b) => b.recommendedActionKey === params.actionKey);
    }
    // [ASSETS-PAGES-1] Filter by scopeType
    if (params?.scopeType) {
      allBundles = allBundles.filter((b) => b.scopeType === params.scopeType);
    }
    if (params?.bundleId) {
      allBundles = allBundles.filter((b) => b.bundleId === params.bundleId);
    }

    // Apply tab filter
    if (params?.tab) {
      allBundles = this.filterByTab(allBundles, params.tab);
    } else {
      // Default: exclude HEALTHY and APPLIED bundles
      allBundles = allBundles.filter(
        (b) => b.health !== 'HEALTHY' && b.state !== 'APPLIED',
      );
    }

    // Apply deterministic sorting
    const sortedBundles = this.sortBundles(allBundles);

    return {
      viewer,
      items: sortedBundles,
    };
  }

  /**
   * Derive issue-based bundles (ASSET_OPTIMIZATION) from DeoIssuesService.
   *
   * [ASSETS-PAGES-1] Now creates separate bundles for PRODUCTS, PAGES, and COLLECTIONS
   * based on affectedProducts (product IDs) and affectedPages (URLs) classification.
   */
  private async deriveIssueBundles(
    projectId: string,
    userId: string,
    project: { lastDeoComputedAt: Date | null; lastCrawledAt: Date | null; createdAt: Date },
  ): Promise<WorkQueueActionBundle[]> {
    const bundles: WorkQueueActionBundle[] = [];

    try {
      // Use read-only version to avoid side effects
      const issuesResponse = await this.deoIssuesService.getIssuesForProjectReadOnly(
        projectId,
        userId,
      );

      // Group issues by recommendedActionKey
      const groupedIssues = this.groupIssuesByAction(issuesResponse.issues);

      // Stable timestamp from persisted data (no jitter)
      const stableTimestamp =
        project.lastDeoComputedAt?.toISOString() ||
        project.lastCrawledAt?.toISOString() ||
        project.createdAt.toISOString();

      for (const [actionKey, issues] of Object.entries(groupedIssues)) {
        if (issues.length === 0) continue;

        // [ASSETS-PAGES-1] Split issues by scope type (PRODUCTS, PAGES, COLLECTIONS)
        const scopeBundles = this.deriveIssueBundlesByScopeType(
          projectId,
          actionKey as WorkQueueRecommendedActionKey,
          issues,
          stableTimestamp,
        );

        bundles.push(...scopeBundles);
      }
    } catch (error) {
      // Log but don't fail the entire request
      console.error('[WorkQueue] Failed to derive issue bundles:', error);
    }

    return bundles;
  }

  /**
   * [ASSETS-PAGES-1] Create separate bundles for each scope type from issues.
   * [COUNT-INTEGRITY-1 PATCH 4] Uses issue-group counts from assetTypeCounts, not asset set sizes.
   * Returns up to 3 bundles per actionKey: PRODUCTS, PAGES, COLLECTIONS.
   */
  private deriveIssueBundlesByScopeType(
    projectId: string,
    actionKey: WorkQueueRecommendedActionKey,
    issues: DeoIssue[],
    stableTimestamp: string,
  ): WorkQueueActionBundle[] {
    const bundles: WorkQueueActionBundle[] = [];

    // [COUNT-INTEGRITY-1] Compute issue-group counts per scope using assetTypeCounts
    const productDetectedIssues: DeoIssue[] = [];
    const productActionableIssues: DeoIssue[] = [];
    const pageDetectedIssues: DeoIssue[] = [];
    const pageActionableIssues: DeoIssue[] = [];
    const collectionDetectedIssues: DeoIssue[] = [];
    const collectionActionableIssues: DeoIssue[] = [];

    for (const issue of issues) {
      const assetCounts = issue.assetTypeCounts;
      if (!assetCounts) continue;

      // Products scope
      if (assetCounts.products > 0) {
        productDetectedIssues.push(issue);
        if (issue.isActionableNow === true) {
          productActionableIssues.push(issue);
        }
      }

      // Pages scope
      if (assetCounts.pages > 0) {
        pageDetectedIssues.push(issue);
        if (issue.isActionableNow === true) {
          pageActionableIssues.push(issue);
        }
      }

      // Collections scope
      if (assetCounts.collections > 0) {
        collectionDetectedIssues.push(issue);
        if (issue.isActionableNow === true) {
          collectionActionableIssues.push(issue);
        }
      }
    }

    // Create PRODUCTS bundle if there are detected issue groups
    if (productDetectedIssues.length > 0) {
      const scopeDetectedCount = productDetectedIssues.length;
      const scopeCount = productActionableIssues.length;
      const health = this.deriveHealthFromSeverity(productDetectedIssues);

      if (health !== 'HEALTHY') {
        // [COUNT-INTEGRITY-1 PATCH 4.1] Build preview list from issue titles (prefer actionable, fallback to detected)
        // The "+N more" total must match the set being previewed (actionable or detected)
        const previewIssues = scopeCount > 0 ? productActionableIssues : productDetectedIssues;
        const previewTotal = scopeCount > 0 ? scopeCount : scopeDetectedCount;
        const issueTitles = previewIssues.slice(0, 5).map((issue) => issue.title);
        const scopePreviewList = this.buildScopePreviewList(issueTitles, previewTotal);

        bundles.push({
          bundleId: `ASSET_OPTIMIZATION:${actionKey}:PRODUCTS:${projectId}`,
          bundleType: 'ASSET_OPTIMIZATION',
          createdAt: stableTimestamp,
          updatedAt: stableTimestamp,
          scopeType: 'PRODUCTS',
          scopeCount,
          scopeDetectedCount,
          scopePreviewList,
          health,
          impactRank: WORK_QUEUE_IMPACT_RANKS[actionKey],
          recommendedActionKey: actionKey,
          recommendedActionLabel: WORK_QUEUE_ACTION_LABELS[actionKey],
          aiUsage: 'NONE',
          aiDisclosureText: WORK_QUEUE_AI_DISCLOSURE_TEXT.NONE,
          state: 'NEW',
        });
      }
    }

    // Create PAGES bundle if there are detected issue groups
    if (pageDetectedIssues.length > 0) {
      const scopeDetectedCount = pageDetectedIssues.length;
      const scopeCount = pageActionableIssues.length;
      const health = this.deriveHealthFromSeverity(pageDetectedIssues);

      if (health !== 'HEALTHY') {
        // [COUNT-INTEGRITY-1 PATCH 4.1] Build preview list from issue titles (prefer actionable, fallback to detected)
        // The "+N more" total must match the set being previewed (actionable or detected)
        const previewIssues = scopeCount > 0 ? pageActionableIssues : pageDetectedIssues;
        const previewTotal = scopeCount > 0 ? scopeCount : scopeDetectedCount;
        const issueTitles = previewIssues.slice(0, 5).map((issue) => issue.title);
        const scopePreviewList = this.buildScopePreviewList(issueTitles, previewTotal);

        bundles.push({
          bundleId: `ASSET_OPTIMIZATION:${actionKey}:PAGES:${projectId}`,
          bundleType: 'ASSET_OPTIMIZATION',
          createdAt: stableTimestamp,
          updatedAt: stableTimestamp,
          scopeType: 'PAGES',
          scopeCount,
          scopeDetectedCount,
          scopePreviewList,
          health,
          impactRank: WORK_QUEUE_IMPACT_RANKS[actionKey],
          recommendedActionKey: actionKey,
          recommendedActionLabel: WORK_QUEUE_ACTION_LABELS[actionKey],
          aiUsage: 'NONE',
          aiDisclosureText: WORK_QUEUE_AI_DISCLOSURE_TEXT.NONE,
          state: 'NEW',
        });
      }
    }

    // Create COLLECTIONS bundle if there are detected issue groups
    if (collectionDetectedIssues.length > 0) {
      const scopeDetectedCount = collectionDetectedIssues.length;
      const scopeCount = collectionActionableIssues.length;
      const health = this.deriveHealthFromSeverity(collectionDetectedIssues);

      if (health !== 'HEALTHY') {
        // [COUNT-INTEGRITY-1 PATCH 4.1] Build preview list from issue titles (prefer actionable, fallback to detected)
        // The "+N more" total must match the set being previewed (actionable or detected)
        const previewIssues = scopeCount > 0 ? collectionActionableIssues : collectionDetectedIssues;
        const previewTotal = scopeCount > 0 ? scopeCount : scopeDetectedCount;
        const issueTitles = previewIssues.slice(0, 5).map((issue) => issue.title);
        const scopePreviewList = this.buildScopePreviewList(issueTitles, previewTotal);

        bundles.push({
          bundleId: `ASSET_OPTIMIZATION:${actionKey}:COLLECTIONS:${projectId}`,
          bundleType: 'ASSET_OPTIMIZATION',
          createdAt: stableTimestamp,
          updatedAt: stableTimestamp,
          scopeType: 'COLLECTIONS',
          scopeCount,
          scopeDetectedCount,
          scopePreviewList,
          health,
          impactRank: WORK_QUEUE_IMPACT_RANKS[actionKey],
          recommendedActionKey: actionKey,
          recommendedActionLabel: WORK_QUEUE_ACTION_LABELS[actionKey],
          aiUsage: 'NONE',
          aiDisclosureText: WORK_QUEUE_AI_DISCLOSURE_TEXT.NONE,
          state: 'NEW',
        });
      }
    }

    // [COUNT-INTEGRITY-1 PATCH 4.1] Fallback: If no specific scope items found but issues exist, create STORE_WIDE bundle
    if (bundles.length === 0 && issues.length > 0) {
      const health = this.deriveHealthFromSeverity(issues);
      if (health !== 'HEALTHY') {
        // Count detected and actionable issue groups (same semantics as other scopes)
        const actionableIssues = issues.filter((issue) => issue.isActionableNow === true);
        const scopeDetectedCount = issues.length;
        const scopeCount = actionableIssues.length;

        // Build preview list from issue titles (prefer actionable, fallback to detected)
        const previewIssues = scopeCount > 0 ? actionableIssues : issues;
        const previewTotal = scopeCount > 0 ? scopeCount : scopeDetectedCount;
        const issueTitles = previewIssues.slice(0, 5).map((issue) => issue.title);
        const scopePreviewList = this.buildScopePreviewList(issueTitles, previewTotal);

        bundles.push({
          bundleId: `ASSET_OPTIMIZATION:${actionKey}:STORE_WIDE:${projectId}`,
          bundleType: 'ASSET_OPTIMIZATION',
          createdAt: stableTimestamp,
          updatedAt: stableTimestamp,
          scopeType: 'STORE_WIDE',
          scopeCount,
          scopeDetectedCount,
          scopePreviewList,
          health,
          impactRank: WORK_QUEUE_IMPACT_RANKS[actionKey],
          recommendedActionKey: actionKey,
          recommendedActionLabel: WORK_QUEUE_ACTION_LABELS[actionKey],
          aiUsage: 'NONE',
          aiDisclosureText: WORK_QUEUE_AI_DISCLOSURE_TEXT.NONE,
          state: 'NEW',
        });
      }
    }

    return bundles;
  }

  /**
   * [ASSETS-PAGES-1] Build scope preview list with "+N more" suffix.
   * [COUNT-INTEGRITY-1 PATCH 4.1] Fixed to use actual preview count, not hardcoded 5.
   */
  private buildScopePreviewList(previews: string[], totalCount: number): string[] {
    const previewCount = previews.length;
    if (totalCount <= previewCount) {
      return previews;
    }
    return [...previews.slice(0, 5), `+${totalCount - previewCount} more`];
  }

  /**
   * Derive automation bundles (AUTOMATION_RUN) from playbook estimates and drafts.
   *
   * [ASSETS-PAGES-1.1] Extended to derive bundles for all asset types:
   * - PRODUCTS: Product-scoped playbooks (existing)
   * - PAGES: Page-scoped playbooks (new)
   * - COLLECTIONS: Collection-scoped playbooks (new)
   */
  private async deriveAutomationBundles(
    projectId: string,
    userId: string,
    project: { createdAt: Date },
  ): Promise<WorkQueueActionBundle[]> {
    const bundles: WorkQueueActionBundle[] = [];
    const playbookIds: AutomationPlaybookId[] = ['missing_seo_title', 'missing_seo_description'];

    // [ASSETS-PAGES-1.1] Asset types to derive bundles for
    type AssetTypeConfig = {
      assetType: 'PRODUCTS' | 'PAGES' | 'COLLECTIONS';
      scopeType: WorkQueueScopeType;
      labelPrefix: string;
    };

    const assetConfigs: AssetTypeConfig[] = [
      { assetType: 'PRODUCTS', scopeType: 'PRODUCTS', labelPrefix: 'product' },
      { assetType: 'PAGES', scopeType: 'PAGES', labelPrefix: 'page' },
      { assetType: 'COLLECTIONS', scopeType: 'COLLECTIONS', labelPrefix: 'collection' },
    ];

    // Check if approval is required for this project
    const approvalRequired = await this.governanceService.isApprovalRequired(projectId);

    for (const assetConfig of assetConfigs) {
      for (const playbookId of playbookIds) {
        try {
          // Get estimate to check if playbook has affected items
          const estimate = await this.automationPlaybooksService.estimatePlaybook(
            userId,
            projectId,
            playbookId,
            null, // scopeProductIds
            assetConfig.assetType,
            null, // scopeAssetRefs
          );

          // Get latest draft for this playbook (currently only for PRODUCTS)
          // TODO: Extend getLatestDraft for asset-scoped drafts
          let latestDraft = null;
          if (assetConfig.assetType === 'PRODUCTS') {
            latestDraft = await this.automationPlaybooksService.getLatestDraft(
              userId,
              projectId,
              playbookId,
            );
          }

          // Include bundle if affected items > 0 OR has existing draft
          if (estimate.totalAffectedProducts === 0 && !latestDraft) {
            continue;
          }

          // Get draft timestamps directly from database if draft exists
          let draftTimestamps: { createdAt: Date; updatedAt: Date } | null = null;
          if (latestDraft) {
            draftTimestamps = await this.prisma.automationPlaybookDraft.findUnique({
              where: { id: latestDraft.draftId },
              select: { createdAt: true, updatedAt: true },
            });
          }

          // Derive state from draft status
          let state: WorkQueueState = 'NEW';
          let draftStatus: WorkQueueDraftStatus = 'NONE';
          let draftCount = 0;
          let draftCoverage = 0;

          if (latestDraft) {
            switch (latestDraft.status) {
              case 'PARTIAL':
                state = 'PREVIEWED';
                draftStatus = 'PARTIAL';
                break;
              case 'READY':
                state = 'DRAFTS_READY';
                draftStatus = 'READY';
                break;
              case 'FAILED':
                state = 'FAILED';
                draftStatus = 'FAILED';
                break;
              case 'EXPIRED':
                state = 'BLOCKED';
                draftStatus = 'EXPIRED';
                break;
            }

            if (latestDraft.counts) {
              draftCount = latestDraft.counts.draftGenerated;
              draftCoverage =
                latestDraft.counts.affectedTotal > 0
                  ? Math.round((latestDraft.counts.draftGenerated / latestDraft.counts.affectedTotal) * 100)
                  : 0;
            }
          }

          // Check for applied drafts (Applied Recently tab) - only for PRODUCTS currently
          let appliedDraft = null;
          if (assetConfig.assetType === 'PRODUCTS') {
            appliedDraft = await this.prisma.automationPlaybookDraft.findFirst({
              where: {
                projectId,
                playbookId,
                appliedAt: { not: null },
              },
              orderBy: { appliedAt: 'desc' },
              select: {
                appliedAt: true,
                appliedByUserId: true,
                updatedAt: true,
              },
            });

            if (appliedDraft?.appliedAt) {
              // Check if applied within last 7 days for "Applied Recently" tab
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              if (appliedDraft.appliedAt > sevenDaysAgo) {
                state = 'APPLIED';
              }
            }
          }

          // Approval derivation
          let approvalStatus: WorkQueueApprovalStatus = 'NOT_REQUESTED';
          let requestedBy: string | undefined;
          let requestedAt: string | undefined;
          let approvedBy: string | null = null;
          let approvedAt: string | null = null;

          if (approvalRequired && latestDraft) {
            const resourceId = `${playbookId}:${latestDraft.scopeId}`;
            const approval = await this.approvalsService.hasValidApproval(
              projectId,
              'AUTOMATION_PLAYBOOK_APPLY' as ApprovalResourceType,
              resourceId,
            );

            if (approval.status === 'PENDING_APPROVAL') {
              state = 'PENDING_APPROVAL';
              approvalStatus = 'PENDING';

              // Get approval details
              const approvalRequest = await this.prisma.approvalRequest.findFirst({
                where: {
                  projectId,
                  resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
                  resourceId,
                  status: 'PENDING_APPROVAL',
                },
                select: { requestedByUserId: true, requestedAt: true },
              });
              if (approvalRequest) {
                requestedBy = approvalRequest.requestedByUserId;
                requestedAt = approvalRequest.requestedAt.toISOString();
              }
            } else if (approval.valid && approval.approvalId) {
              state = 'APPROVED';
              approvalStatus = 'APPROVED';

              // Get approval details
              const approvalRequest = await this.prisma.approvalRequest.findFirst({
                where: { id: approval.approvalId },
                select: {
                  requestedByUserId: true,
                  requestedAt: true,
                  decidedByUserId: true,
                  decidedAt: true,
                },
              });
              if (approvalRequest) {
                requestedBy = approvalRequest.requestedByUserId;
                requestedAt = approvalRequest.requestedAt.toISOString();
                approvedBy = approvalRequest.decidedByUserId;
                approvedAt = approvalRequest.decidedAt?.toISOString() || null;
              }
            } else if (approval.status === 'REJECTED') {
              approvalStatus = 'REJECTED';
            }
          }

          // [ASSETS-PAGES-1.1] Get scope preview list based on asset type
          let scopePreviewList: string[] = [];
          if (assetConfig.assetType === 'PRODUCTS') {
            const affectedProducts = await this.prisma.product.findMany({
              where: {
                projectId,
                OR:
                  playbookId === 'missing_seo_title'
                    ? [{ seoTitle: null }, { seoTitle: '' }]
                    : [{ seoDescription: null }, { seoDescription: '' }],
              },
              select: { id: true, title: true },
              take: 6,
            });
            scopePreviewList =
              affectedProducts.length > 5
                ? [
                    ...affectedProducts.slice(0, 5).map((p) => p.title),
                    `+${estimate.totalAffectedProducts - 5} more`,
                  ]
                : affectedProducts.map((p) => p.title);
          } else {
            // For PAGES/COLLECTIONS, derive from CrawlResult URLs
            const urlPrefix = assetConfig.assetType === 'PAGES' ? '/pages/' : '/collections/';
            const affectedAssets = await this.prisma.crawlResult.findMany({
              where: {
                projectId,
                url: { contains: urlPrefix },
                OR:
                  playbookId === 'missing_seo_title'
                    ? [{ title: null }, { title: '' }]
                    : [{ metaDescription: null }, { metaDescription: '' }],
              },
              select: { url: true, title: true },
              take: 6,
            });
            const names = affectedAssets.map((a) => {
              // Extract handle from URL as display name
              const match = a.url.match(new RegExp(`${urlPrefix}([^/?#]+)`));
              return match ? match[1].replace(/-/g, ' ') : a.title || a.url;
            });
            scopePreviewList =
              names.length > 5
                ? [...names.slice(0, 5), `+${estimate.totalAffectedProducts - 5} more`]
                : names;
          }

          // Use draftTimestamps if available, else project.createdAt
          const createdAt = draftTimestamps
            ? draftTimestamps.createdAt.toISOString()
            : project.createdAt.toISOString();
          const updatedAt = appliedDraft?.appliedAt?.toISOString() ||
            (draftTimestamps ? draftTimestamps.updatedAt.toISOString() : project.createdAt.toISOString());

          // [ASSETS-PAGES-1.1] Bundle ID includes assetType for uniqueness
          const bundleId = `AUTOMATION_RUN:FIX_MISSING_METADATA:${playbookId}:${assetConfig.assetType}:${projectId}`;

          const bundle: WorkQueueActionBundle = {
            bundleId,
            bundleType: 'AUTOMATION_RUN',
            createdAt,
            updatedAt,
            scopeType: assetConfig.scopeType,
            scopeCount: estimate.totalAffectedProducts,
            scopePreviewList,
            scopeQueryRef: latestDraft?.scopeId,
            health: estimate.totalAffectedProducts > 10 ? 'CRITICAL' : 'NEEDS_ATTENTION',
            impactRank: WORK_QUEUE_IMPACT_RANKS.FIX_MISSING_METADATA,
            recommendedActionKey: 'FIX_MISSING_METADATA',
            recommendedActionLabel: playbookId === 'missing_seo_title'
              ? `Fix missing ${assetConfig.labelPrefix} SEO titles`
              : `Fix missing ${assetConfig.labelPrefix} SEO descriptions`,
            aiUsage: 'DRAFTS_ONLY',
            aiDisclosureText: WORK_QUEUE_AI_DISCLOSURE_TEXT.DRAFTS_ONLY,
            state,
            approval: approvalRequired
              ? {
                  approvalRequired: true,
                  approvalStatus,
                  requestedBy,
                  requestedAt,
                  approvedBy,
                  approvedAt,
                }
              : undefined,
            draft: {
              draftStatus,
              draftCount,
              draftCoverage,
              lastDraftRunId: latestDraft?.draftId,
            },
          };

          bundles.push(bundle);
        } catch (error) {
          // Log but don't fail the entire request
          console.error(`[WorkQueue] Failed to derive automation bundle for ${playbookId}:${assetConfig.assetType}:`, error);
        }
      }
    }

    return bundles;
  }

  /**
   * Derive GEO export bundle from share links.
   */
  private async deriveGeoExportBundle(
    projectId: string,
    userId: string,
    project: { createdAt: Date },
  ): Promise<WorkQueueActionBundle | null> {
    try {
      const shareLinks = await this.geoReportsService.listShareLinks(projectId, userId);

      // Derive share link status
      let shareLinkStatus: WorkQueueShareLinkStatus = 'NONE';
      if (shareLinks.length > 0) {
        const hasActive = shareLinks.some((l) => l.status === 'ACTIVE');
        const hasExpired = shareLinks.some((l) => l.status === 'EXPIRED');
        const allRevoked = shareLinks.every((l) => l.status === 'REVOKED');

        if (hasActive) {
          shareLinkStatus = 'ACTIVE';
        } else if (allRevoked) {
          shareLinkStatus = 'REVOKED';
        } else if (hasExpired) {
          shareLinkStatus = 'EXPIRED';
        }
      }

      const bundle: WorkQueueActionBundle = {
        bundleId: `GEO_EXPORT:SHARE_LINK_GOVERNANCE:${projectId}`,
        bundleType: 'GEO_EXPORT',
        createdAt: project.createdAt.toISOString(),
        updatedAt: shareLinks[0]?.createdAt || project.createdAt.toISOString(),
        scopeType: 'STORE_WIDE',
        scopeCount: 1,
        scopePreviewList: ['GEO Report Export'],
        health: 'NEEDS_ATTENTION', // GEO export is informational, not critical
        impactRank: WORK_QUEUE_IMPACT_RANKS.SHARE_LINK_GOVERNANCE,
        recommendedActionKey: 'SHARE_LINK_GOVERNANCE',
        recommendedActionLabel: WORK_QUEUE_ACTION_LABELS.SHARE_LINK_GOVERNANCE,
        aiUsage: 'NONE',
        aiDisclosureText: WORK_QUEUE_AI_DISCLOSURE_TEXT.NONE,
        state: 'NEW', // GEO export doesn't have state transitions in v1
        geoExport: {
          mutationFreeView: true,
          shareLinkStatus,
          passcodeShownOnce: true,
        },
      };

      return bundle;
    } catch (error) {
      console.error('[WorkQueue] Failed to derive GEO export bundle:', error);
      return null;
    }
  }

  /**
   * Group issues by recommended action key.
   */
  private groupIssuesByAction(issues: DeoIssue[]): Record<string, DeoIssue[]> {
    const groups: Record<string, DeoIssue[]> = {
      FIX_MISSING_METADATA: [],
      RESOLVE_TECHNICAL_ISSUES: [],
      IMPROVE_SEARCH_INTENT: [],
      OPTIMIZE_CONTENT: [],
    };

    for (const issue of issues) {
      // Map issue types to action keys based on pillarId and category
      if (issue.pillarId === 'metadata_snippet_quality' || issue.type?.includes('metadata')) {
        groups.FIX_MISSING_METADATA.push(issue);
      } else if (issue.pillarId === 'technical_indexability' || issue.category === 'technical') {
        groups.RESOLVE_TECHNICAL_ISSUES.push(issue);
      } else if (issue.pillarId === 'search_intent_fit' || issue.intentType) {
        groups.IMPROVE_SEARCH_INTENT.push(issue);
      } else if (
        issue.pillarId === 'content_commerce_signals' ||
        issue.category === 'content_entity'
      ) {
        groups.OPTIMIZE_CONTENT.push(issue);
      } else {
        // Default to content optimization
        groups.OPTIMIZE_CONTENT.push(issue);
      }
    }

    return groups;
  }

  /**
   * Derive health from the highest severity in the issue group.
   */
  private deriveHealthFromSeverity(issues: DeoIssue[]): WorkQueueHealth {
    let hasCritical = false;
    let hasWarning = false;

    for (const issue of issues) {
      if (issue.severity === 'critical') {
        hasCritical = true;
        break; // No need to continue
      }
      if (issue.severity === 'warning') {
        hasWarning = true;
      }
    }

    if (hasCritical) return 'CRITICAL';
    if (hasWarning) return 'NEEDS_ATTENTION';
    return 'HEALTHY';
  }

  /**
   * Filter bundles by tab.
   */
  private filterByTab(bundles: WorkQueueActionBundle[], tab: WorkQueueTab): WorkQueueActionBundle[] {
    switch (tab) {
      case 'Critical':
        return bundles.filter((b) => b.health === 'CRITICAL' && b.state !== 'APPLIED');
      case 'NeedsAttention':
        return bundles.filter((b) => b.health === 'NEEDS_ATTENTION' && b.state !== 'APPLIED');
      case 'PendingApproval':
        return bundles.filter((b) => b.state === 'PENDING_APPROVAL');
      case 'DraftsReady':
        return bundles.filter(
          (b) => b.state === 'DRAFTS_READY' || b.state === 'APPROVED',
        );
      case 'AppliedRecently':
        return bundles.filter((b) => b.state === 'APPLIED');
      default:
        return bundles.filter((b) => b.health !== 'HEALTHY' && b.state !== 'APPLIED');
    }
  }

  /**
   * Deterministic sorting of bundles.
   *
   * Sort order:
   * 1. State priority (PENDING_APPROVAL → DRAFTS_READY → FAILED/BLOCKED → NEW/PREVIEWED → APPLIED)
   * 2. Health (CRITICAL → NEEDS_ATTENTION → HEALTHY)
   * 3. Impact rank (lower = higher priority)
   * 4. updatedAt (most recent first)
   * 5. bundleId (stable tie-breaker)
   */
  private sortBundles(bundles: WorkQueueActionBundle[]): WorkQueueActionBundle[] {
    return [...bundles].sort((a, b) => {
      // 1. State priority
      const statePriorityA = WORK_QUEUE_STATE_PRIORITY[a.state];
      const statePriorityB = WORK_QUEUE_STATE_PRIORITY[b.state];
      if (statePriorityA !== statePriorityB) {
        return statePriorityA - statePriorityB;
      }

      // 2. Health priority
      const healthPriorityA = WORK_QUEUE_HEALTH_PRIORITY[a.health];
      const healthPriorityB = WORK_QUEUE_HEALTH_PRIORITY[b.health];
      if (healthPriorityA !== healthPriorityB) {
        return healthPriorityA - healthPriorityB;
      }

      // 3. Impact rank
      if (a.impactRank !== b.impactRank) {
        return a.impactRank - b.impactRank;
      }

      // 4. updatedAt (most recent first)
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }

      // 5. bundleId (stable tie-breaker)
      return a.bundleId.localeCompare(b.bundleId);
    });
  }
}
