import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService, CreateProjectDto, UpdateProjectDto, AddMemberDto, ChangeMemberRoleDto, CrawlPageListFilters } from './projects.service';
import { ProjectMemberRole } from '@prisma/client';
import { DeoScoreService, DeoSignalsService } from './deo-score.service';
import { DeoIssuesService } from './deo-issues.service';
import { AutomationService } from './automation.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { SeoScanService } from '../seo-scan/seo-scan.service';
import {
  DeoScoreLatestResponse,
  DeoIssuesResponse,
  DeoScoreJobPayload,
  DeoScoreSignals,
  ProjectAnswerabilityResponse,
  IssueCountsSummary,
  CanonicalIssueCountsSummary,
  AssetIssuesResponse,
  type IssueAssetTypeKey,
  type DeoPillarId,
} from '@engineo/shared';
import { deoScoreQueue, crawlQueue } from '../queues/queues';
import { AnswerEngineService } from './answer-engine.service';
import {
  AutomationPlaybooksService,
  AutomationPlaybookId,
  PlaybookRulesV1,
} from './automation-playbooks.service';
import {
  AutomationPlaybookRunsService,
  AutomationPlaybookRunType,
} from './automation-playbook-runs.service';
import { ProjectInsightsService } from './project-insights.service';
import { GovernanceService } from './governance.service';
import { ApprovalsService } from './approvals.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { WorkQueueService } from './work-queue.service';
import { ShopifyService, type ShopifyScopeStatus } from '../shopify/shopify.service';
import type {
  WorkQueueTab,
  WorkQueueBundleType,
  WorkQueueRecommendedActionKey,
  WorkQueueScopeType,
  WorkQueueResponse,
  AutomationAssetType,
  AssetRef,
} from '@engineo/shared';
import { validateAssetRefsForType } from '@engineo/shared';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly deoScoreService: DeoScoreService,
    private readonly deoSignalsService: DeoSignalsService,
    private readonly deoIssuesService: DeoIssuesService,
    private readonly automationService: AutomationService,
    private readonly answerEngineService: AnswerEngineService,
    private readonly entitlementsService: EntitlementsService,
    private readonly seoScanService: SeoScanService,
    private readonly automationPlaybooksService: AutomationPlaybooksService,
    private readonly automationPlaybookRunsService: AutomationPlaybookRunsService,
    private readonly projectInsightsService: ProjectInsightsService,
    private readonly governanceService: GovernanceService,
    private readonly approvalsService: ApprovalsService,
    private readonly roleResolutionService: RoleResolutionService,
    private readonly workQueueService: WorkQueueService,
    private readonly shopifyService: ShopifyService,
  ) {}

  /**
   * GET /projects
   * Returns all projects for the authenticated user
   */
  @Get()
  async getProjects(@Request() req: any) {
    return this.projectsService.getProjectsForUser(req.user.id);
  }

  /**
   * POST /projects
   * Create a new project
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Request() req: any, @Body() dto: CreateProjectDto) {
    // Check entitlements before creating project
    await this.entitlementsService.ensureCanCreateProject(req.user.id);
    return this.projectsService.createProject(req.user.id, dto);
  }

  /**
   * GET /projects/:id
   * Returns project details
   */
  @Get(':id')
  async getProject(@Request() req: any, @Param('id') projectId: string) {
    return this.projectsService.getProject(projectId, req.user.id);
  }

  /**
   * DELETE /projects/:id
   * Delete a project
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteProject(@Request() req: any, @Param('id') projectId: string) {
    await this.projectsService.deleteProject(projectId, req.user.id);
    return { success: true, message: 'Project deleted successfully' };
  }

  /**
   * PUT /projects/:id
   * Update a project
   */
  @Put(':id')
  async updateProject(
    @Request() req: any,
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(projectId, req.user.id, dto);
  }

  /**
   * GET /projects/:id/integration-status
   * Returns integration status for a project
   */
  @Get(':id/integration-status')
  async getIntegrationStatus(@Request() req: any, @Param('id') projectId: string) {
    return this.projectsService.getIntegrationStatus(projectId, req.user.id);
  }

  /**
   * GET /projects/:id/overview
   * Returns project overview stats for dashboard
   */
  @Get(':id/overview')
  async getProjectOverview(@Request() req: any, @Param('id') projectId: string) {
    return this.projectsService.getProjectOverview(projectId, req.user.id);
  }

  /**
   * GET /projects/:id/insights
   * INSIGHTS-1: Read-only derived insights (no AI, no mutations).
   */
  @Get(':id/insights')
  async getProjectInsights(@Request() req: any, @Param('id') projectId: string) {
    return this.projectInsightsService.getProjectInsights(projectId, req.user.id);
  }

  /**
   * GET /projects/:id/deo-issues
   * Returns aggregated DEO issues for a project.
   */
  @Get(':id/deo-issues')
  async getDeoIssues(
    @Request() req: any,
    @Param('id') projectId: string,
  ): Promise<DeoIssuesResponse> {
    return this.deoIssuesService.getIssuesForProject(projectId, req.user.id);
  }

  /**
   * GET /projects/:id/deo-issues/read-only
   * COUNT-INTEGRITY-1: Read-only issues endpoint (no side effects, no automation triggers).
   * Used by insights dashboard and counts summary.
   */
  @Get(':id/deo-issues/read-only')
  async getDeoIssuesReadOnly(
    @Request() req: any,
    @Param('id') projectId: string,
  ): Promise<DeoIssuesResponse> {
    return this.deoIssuesService.getIssuesForProjectReadOnly(projectId, req.user.id);
  }

  /**
   * GET /projects/:id/issues/counts-summary
   * COUNT-INTEGRITY-1: Canonical server-side counts summary.
   */
  @Get(':id/issues/counts-summary')
  async getIssueCountsSummary(
    @Request() req: any,
    @Param('id') projectId: string,
  ): Promise<IssueCountsSummary> {
    return this.deoIssuesService.getIssueCountsSummaryForProject(projectId, req.user.id);
  }

  /**
   * GET /projects/:id/issues/summary
   * COUNT-INTEGRITY-1.1: Canonical triplet counts with explicit UX labels.
   * Query params: actionKey, actionKeys[], scopeType, pillar, pillars[], severity
   */
  @Get(':id/issues/summary')
  async getCanonicalIssueCountsSummary(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('actionKey') actionKey?: string,
    @Query('actionKeys') actionKeys?: string | string[],
    @Query('scopeType') scopeType?: IssueAssetTypeKey,
    @Query('pillar') pillar?: DeoPillarId,
    @Query('pillars') pillars?: string | string[],
    @Query('severity') severity?: 'critical' | 'warning' | 'info',
  ): Promise<CanonicalIssueCountsSummary> {
    // Normalize array query params
    const actionKeysArray = Array.isArray(actionKeys) ? actionKeys : actionKeys ? [actionKeys] : undefined;
    const pillarsArray = Array.isArray(pillars)
      ? pillars as DeoPillarId[]
      : pillars
      ? [pillars as DeoPillarId]
      : undefined;

    return this.deoIssuesService.getCanonicalIssueCountsSummary(projectId, req.user.id, {
      actionKey,
      actionKeys: actionKeysArray,
      scopeType,
      pillar,
      pillars: pillarsArray,
      severity,
    });
  }

  /**
   * GET /projects/:id/issues/canonical-summary (DEPRECATED)
   * Backward compatibility alias for /projects/:id/issues/summary
   * @deprecated Use /projects/:id/issues/summary instead
   */
  @Get(':id/issues/canonical-summary')
  async getCanonicalIssueCountsSummaryDeprecated(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('actionKey') actionKey?: string,
    @Query('actionKeys') actionKeys?: string | string[],
    @Query('scopeType') scopeType?: IssueAssetTypeKey,
    @Query('pillar') pillar?: DeoPillarId,
    @Query('pillars') pillars?: string | string[],
    @Query('severity') severity?: 'critical' | 'warning' | 'info',
  ): Promise<CanonicalIssueCountsSummary> {
    // Delegate to canonical endpoint
    return this.getCanonicalIssueCountsSummary(
      req,
      projectId,
      actionKey,
      actionKeys,
      scopeType,
      pillar,
      pillars,
      severity,
    );
  }

  /**
   * GET /projects/:id/assets/:assetType/:assetId/issues
   * COUNT-INTEGRITY-1.1: Asset-specific issues with canonical triplet summary.
   * Query params: pillar, pillars[], severity
   */
  @Get(':id/assets/:assetType/:assetId/issues')
  async getAssetIssues(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('assetType') assetType: IssueAssetTypeKey,
    @Param('assetId') assetId: string,
    @Query('pillar') pillar?: DeoPillarId,
    @Query('pillars') pillars?: string | string[],
    @Query('severity') severity?: 'critical' | 'warning' | 'info',
  ): Promise<AssetIssuesResponse> {
    // Normalize array query params
    const pillarsArray = Array.isArray(pillars)
      ? pillars as DeoPillarId[]
      : pillars
      ? [pillars as DeoPillarId]
      : undefined;

    return this.deoIssuesService.getAssetIssues(projectId, req.user.id, assetType, assetId, {
      pillar,
      pillars: pillarsArray,
      severity,
    });
  }

  /**
   * GET /projects/:id/deo-score
   * Returns latest DEO score snapshot for a project
   */
  @Get(':id/deo-score')
  async getDeoScore(
    @Request() req: any,
    @Param('id') projectId: string,
  ): Promise<DeoScoreLatestResponse> {
    return this.deoScoreService.getLatestForProject(projectId, req.user.id);
  }

  /**
   * GET /projects/:id/deo-signals/debug
   * Returns heuristic DEO signals for a project (developer/debug only).
   */
  @Get(':id/deo-signals/debug')
  async getDeoSignalsDebug(
    @Request() req: any,
    @Param('id') projectId: string,
  ): Promise<DeoScoreSignals> {
    // Reuse existing ownership validation
    await this.projectsService.getProject(projectId, req.user.id);
    return this.deoSignalsService.collectSignalsForProject(projectId);
  }

  /**
   * POST /projects/:id/deo-score/recompute
   * Enqueues a DEO score recompute job for the project
   */
  @Post(':id/deo-score/recompute')
  async recomputeDeoScore(
    @Request() req: any,
    @Param('id') projectId: string,
  ): Promise<{ projectId: string; enqueued: boolean; message?: string }> {
    const userId = (req as any).user?.id ?? null;
    // Validate project ownership before enqueueing
    await this.projectsService.getProject(projectId, userId);

    // Check if queue is available (Redis configured)
    if (!deoScoreQueue) {
      return {
        projectId,
        enqueued: false,
        message: 'Queue functionality unavailable - Redis not configured',
      };
    }

    const payload: DeoScoreJobPayload = {
      projectId,
      triggeredByUserId: userId,
      reason: 'manual',
    };

    await deoScoreQueue.add('deo_score_recompute', payload);

    return { projectId, enqueued: true };
  }

  /**
   * POST /projects/:id/crawl/run
   * Manually trigger a crawl for a project.
   */
  @Post(':id/crawl/run')
  async runCrawl(@Request() req: any, @Param('id') projectId: string) {
    const userId = (req as any).user?.id as string;

    // Validate project ownership before triggering a crawl
    await this.projectsService.getProject(projectId, userId);

    // Enforce crawl entitlements (pages per crawl) before starting.
    await this.entitlementsService.enforceEntitlement(userId, 'crawl', 1);

    // Prefer queue when available; fall back to synchronous crawl in local/dev.
    if (crawlQueue) {
      await crawlQueue.add('project_crawl', { projectId });
      return {
        projectId,
        mode: 'queue',
        status: 'enqueued',
      };
    }

    const result = await this.seoScanService.startScan(projectId, userId);
    return {
      projectId,
      mode: 'sync',
      status: 'completed',
      crawlResultId: result.id,
      scannedAt: result.scannedAt,
    };
  }

  /**
   * GET /projects/:id/crawl-pages
   * [LIST-SEARCH-FILTER-1.1] Returns non-product crawl pages for content optimization
   * Supports filtering by q, status, hasDraft, pageType
   * [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Returns actionableNowCount and blockedByApproval from canonical DEO issues
   */
  @Get(':id/crawl-pages')
  async getCrawlPages(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('hasDraft') hasDraft?: string,
    @Query('pageType') pageType?: string,
  ) {
    const filters: CrawlPageListFilters = {};
    if (q && q.trim()) filters.q = q.trim();
    if (status === 'optimized' || status === 'needs_attention') filters.status = status;
    if (hasDraft === 'true' || hasDraft === '1') filters.hasDraft = true;
    if (pageType === 'static' || pageType === 'collection') filters.pageType = pageType;

    // Get base crawl pages from service
    const contentPages = await this.projectsService.getCrawlPages(projectId, req.user.id, filters);

    // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Compute canonical issue counts per URL
    const canonicalCountsByUrl = await this.computeCanonicalIssueCountsByUrl(projectId, req.user.id);

    // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Get viewer's apply capability
    const viewerCanApply = await this.roleResolutionService.canApply(projectId, req.user.id);

    // Add canonical fields to each page
    return contentPages.map((page: any) => {
      // Use URL as key for pages/collections matching
      const counts = canonicalCountsByUrl.get(page.url);
      const actionableNowCount = counts?.actionable ?? 0;
      const detectedIssueCount = counts?.detected ?? 0;
      const blockedByApproval = page.hasDraftPendingApply && !viewerCanApply;

      return {
        ...page,
        actionableNowCount,
        detectedIssueCount,
        blockedByApproval,
      };
    });
  }

  /**
   * [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Compute canonical issue counts per URL
   * Returns a Map of URL → { actionable: number, detected: number }
   *
   * Uses DeoIssuesService to fetch canonical issues and counts them per URL:
   * - For pages: key = "pages:{url}"
   * - For collections: key = "collections:{url}"
   */
  private async computeCanonicalIssueCountsByUrl(
    projectId: string,
    userId: string,
  ): Promise<Map<string, { actionable: number; detected: number }>> {
    const countsMap = new Map<string, { actionable: number; detected: number }>();

    try {
      const issuesResponse = await this.deoIssuesService.getIssuesForProjectReadOnly(projectId, userId);

      if (!issuesResponse.issues || issuesResponse.issues.length === 0) {
        return countsMap;
      }

      // Build per-URL issue type sets
      const urlIssueTypes = new Map<string, { actionableTypes: Set<string>; detectedTypes: Set<string> }>();

      for (const issue of issuesResponse.issues) {
        const issueType = issue.type ?? issue.id;

        // Get full affected keys (non-enumerable) or fall back to affectedPages
        const fullKeys = (issue as any)['__fullAffectedAssetKeys'] as string[] | undefined;

        // Collect URLs from both pages and collections
        const urls: string[] = [];

        if (Array.isArray(fullKeys) && fullKeys.length > 0) {
          // Extract URLs from full keys (format: "pages:{url}" or "collections:{url}")
          for (const key of fullKeys) {
            if (key.startsWith('pages:')) {
              urls.push(key.substring('pages:'.length));
            } else if (key.startsWith('collections:')) {
              urls.push(key.substring('collections:'.length));
            }
          }
        } else if (Array.isArray(issue.affectedPages) && issue.affectedPages.length > 0) {
          // Fallback to affectedPages
          urls.push(...issue.affectedPages);
        }

        for (const url of urls) {
          let entry = urlIssueTypes.get(url);
          if (!entry) {
            entry = { actionableTypes: new Set(), detectedTypes: new Set() };
            urlIssueTypes.set(url, entry);
          }

          entry.detectedTypes.add(issueType);
          if (issue.isActionableNow) {
            entry.actionableTypes.add(issueType);
          }
        }
      }

      // Convert to counts
      for (const [url, entry] of urlIssueTypes) {
        countsMap.set(url, {
          actionable: entry.actionableTypes.size,
          detected: entry.detectedTypes.size,
        });
      }
    } catch (error) {
      console.error('[ProjectsController] Failed to fetch canonical issues:', error);
    }

    return countsMap;
  }

  /**
   * POST /projects/:id/deo-score/recompute-sync
   * Synchronously recomputes DEO score (bypasses queue - for local testing)
   */
  @Post(':id/deo-score/recompute-sync')
  async recomputeDeoScoreSync(
    @Request() req: any,
    @Param('id') projectId: string,
  ): Promise<{ projectId: string; computed: boolean; score?: number; message?: string }> {
    const userId = (req as any).user?.id ?? null;
    // Validate project ownership
    await this.projectsService.getProject(projectId, userId);

    try {
      // Collect signals and compute score synchronously
      const signals = await this.deoSignalsService.collectSignalsForProject(projectId);
      const snapshot = await this.deoScoreService.computeAndPersistScoreFromSignals(projectId, signals);

      return {
        projectId,
        computed: true,
        score: snapshot.breakdown.overall,
      };
    } catch (error) {
      return {
        projectId,
        computed: false,
        message: error instanceof Error ? error.message : 'Failed to compute DEO score',
      };
    }
  }

  /**
   * GET /projects/:id/automation-suggestions
   * Returns automation suggestions for a project
   */
  @Get(':id/automation-suggestions')
  async getAutomationSuggestions(@Request() req: any, @Param('id') projectId: string) {
    return this.automationService.getSuggestionsForProject(projectId, req.user.id);
  }

  /**
   * GET /projects/:id/answerability
   * Returns Answer Engine answerability detection summary for a project (overall + per-product).
   * Only the project owner may access this endpoint.
   */
  @Get(':id/answerability')
  async getProjectAnswerability(
    @Request() req: any,
    @Param('id') projectId: string,
  ): Promise<ProjectAnswerabilityResponse> {
    return this.answerEngineService.getProjectAnswerability(projectId, req.user.id);
  }

  /**
   * GET /projects/:id/automation-playbooks/drafts
   * [DRAFT-ROUTING-INTEGRITY-1] Returns pending drafts for a specific asset.
   * Used by Draft Review mode to show only drafts relevant to a single asset.
   *
   * Query params (required):
   * - assetType: 'products' | 'pages' | 'collections'
   * - assetId: string (product ID or crawl result ID)
   *
   * Returns only pending (non-applied, non-expired) drafts that contain items
   * for the specified asset. Never returns global/unscoped drafts.
   */
  @Get(':id/automation-playbooks/drafts')
  async listPendingDraftsForAsset(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('assetType') assetType?: string,
    @Query('assetId') assetId?: string,
  ) {
    if (!assetType || !['products', 'pages', 'collections'].includes(assetType)) {
      throw new BadRequestException(
        'assetType is required and must be one of: products, pages, collections',
      );
    }
    if (!assetId || !assetId.trim()) {
      throw new BadRequestException('assetId is required');
    }

    return this.automationPlaybooksService.listPendingDraftsForAsset(
      req.user.id,
      projectId,
      assetType as 'products' | 'pages' | 'collections',
      assetId.trim(),
    );
  }

  /**
   * PATCH /projects/:id/automation-playbooks/drafts/:draftId/items/:itemIndex
   * [DRAFT-EDIT-INTEGRITY-1] Update a specific draft item's content.
   *
   * Allows users to edit draft suggestions before apply. Server draft is source of truth.
   * No autosave - explicit save required.
   *
   * Path params:
   * - draftId: The draft ID
   * - itemIndex: The index of the item in the draft to update
   *
   * Body:
   * - value: The new text content for the draft item
   *
   * Access control:
   * - OWNER/EDITOR can edit drafts
   * - VIEWER cannot edit (returns 403)
   */
  @Patch(':id/automation-playbooks/drafts/:draftId/items/:itemIndex')
  async updateDraftItem(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('draftId') draftId: string,
    @Param('itemIndex') itemIndexStr: string,
    @Body('value') value?: string,
  ) {
    const itemIndex = parseInt(itemIndexStr, 10);
    if (isNaN(itemIndex) || itemIndex < 0) {
      throw new BadRequestException('itemIndex must be a non-negative integer');
    }
    if (value === undefined || value === null) {
      throw new BadRequestException('value is required in request body');
    }

    return this.automationPlaybooksService.updateDraftItem(
      req.user.id,
      projectId,
      draftId,
      itemIndex,
      value,
    );
  }

  /**
   * GET /projects/:id/automation-playbooks/estimate
   * Returns estimate for an automation playbook (affected products, token usage, eligibility).
   */
  @Get(':id/automation-playbooks/estimate')
  async estimateAutomationPlaybook(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('playbookId') playbookId: AutomationPlaybookId,
  ) {
    if (!playbookId) {
      throw new BadRequestException('playbookId is required');
    }
    return this.automationPlaybooksService.estimatePlaybook(
      req.user.id,
      projectId,
      playbookId,
    );
  }

  /**
   * POST /projects/:id/automation-playbooks/estimate
   * Scoped estimate for an automation playbook (supports explicit scopeProductIds without URL length risk).
   *
   * [ASSETS-PAGES-1.1] Extended with asset-scoped parameters:
   * - assetType: 'PRODUCTS' | 'PAGES' | 'COLLECTIONS' (default: 'PRODUCTS')
   * - scopeAssetRefs: Handle-based refs for non-product assets (e.g., 'page_handle:about-us')
   *
   * Validation:
   * - Exactly one of (scopeProductIds) OR (scopeAssetRefs with non-PRODUCTS assetType) must be provided
   * - scopeAssetRefs format must match assetType (page_handle:* for PAGES, collection_handle:* for COLLECTIONS)
   */
  @Post(':id/automation-playbooks/estimate')
  async estimateAutomationPlaybookScoped(
    @Request() req: any,
    @Param('id') projectId: string,
    @Body()
    body: {
      playbookId: AutomationPlaybookId;
      scopeProductIds?: string[];
      /** [ASSETS-PAGES-1.1] Asset type for scoped playbook runs */
      assetType?: AutomationAssetType;
      /** [ASSETS-PAGES-1.1] Handle-based refs for non-product assets */
      scopeAssetRefs?: AssetRef[];
    },
  ) {
    if (!body?.playbookId) {
      throw new BadRequestException('playbookId is required');
    }

    // [ASSETS-PAGES-1.1] Validate asset scope parameters
    const assetType = body.assetType ?? 'PRODUCTS';
    const hasScopeProductIds = body.scopeProductIds && body.scopeProductIds.length > 0;
    const hasScopeAssetRefs = body.scopeAssetRefs && body.scopeAssetRefs.length > 0;

    if (assetType === 'PRODUCTS') {
      // Products use scopeProductIds
      if (hasScopeAssetRefs) {
        throw new BadRequestException(
          'scopeAssetRefs cannot be used with assetType PRODUCTS. Use scopeProductIds instead.',
        );
      }
    } else {
      // Pages/Collections use scopeAssetRefs
      if (hasScopeProductIds) {
        throw new BadRequestException(
          `scopeProductIds cannot be used with assetType ${assetType}. Use scopeAssetRefs instead.`,
        );
      }
      if (hasScopeAssetRefs) {
        const validation = validateAssetRefsForType(assetType, body.scopeAssetRefs!);
        if (!validation.valid) {
          throw new BadRequestException(validation.errors.join('; '));
        }
      }
    }

    // [ASSETS-PAGES-1.1] Pass assetType and scopeAssetRefs to service
    return this.automationPlaybooksService.estimatePlaybook(
      req.user.id,
      projectId,
      body.playbookId,
      body.scopeProductIds,
      assetType,
      body.scopeAssetRefs,
    );
  }

  /**
   * POST /projects/:id/automation-playbooks/:playbookId/preview
   * Generate a preview draft for an automation playbook. Creates or updates a draft keyed by
   * (projectId, playbookId, scopeId, rulesHash) and returns sample suggestions plus draft metadata.
   *
   * [ASSETS-PAGES-1.1] Extended with asset-scoped parameters:
   * - assetType: 'PRODUCTS' | 'PAGES' | 'COLLECTIONS' (default: 'PRODUCTS')
   * - scopeAssetRefs: Handle-based refs for non-product assets
   */
  @Post(':id/automation-playbooks/:playbookId/preview')
  async previewAutomationPlaybook(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('playbookId') playbookId: AutomationPlaybookId,
    @Body()
    body: {
      rules?: PlaybookRulesV1;
      sampleSize?: number;
      scopeProductIds?: string[];
      /** [ASSETS-PAGES-1.1] Asset type for scoped playbook runs */
      assetType?: AutomationAssetType;
      /** [ASSETS-PAGES-1.1] Handle-based refs for non-product assets */
      scopeAssetRefs?: AssetRef[];
    },
  ) {
    // [ASSETS-PAGES-1.1] Validate asset scope parameters
    const assetType = body?.assetType ?? 'PRODUCTS';
    const hasScopeProductIds = body?.scopeProductIds && body.scopeProductIds.length > 0;
    const hasScopeAssetRefs = body?.scopeAssetRefs && body.scopeAssetRefs.length > 0;

    if (assetType === 'PRODUCTS') {
      if (hasScopeAssetRefs) {
        throw new BadRequestException(
          'scopeAssetRefs cannot be used with assetType PRODUCTS. Use scopeProductIds instead.',
        );
      }
    } else {
      if (hasScopeProductIds) {
        throw new BadRequestException(
          `scopeProductIds cannot be used with assetType ${assetType}. Use scopeAssetRefs instead.`,
        );
      }
      if (hasScopeAssetRefs) {
        const validation = validateAssetRefsForType(assetType, body.scopeAssetRefs!);
        if (!validation.valid) {
          throw new BadRequestException(validation.errors.join('; '));
        }
      }
    }

    // [ASSETS-PAGES-1.1] TODO: Service will be updated in PATCH 2 to accept assetType and scopeAssetRefs
    if (assetType !== 'PRODUCTS') {
      throw new BadRequestException(
        `Asset type ${assetType} is not yet supported. Only PRODUCTS is currently available.`,
      );
    }

    return this.automationPlaybooksService.previewPlaybook(
      req.user.id,
      projectId,
      playbookId,
      body?.rules,
      body?.sampleSize,
      body?.scopeProductIds,
    );
  }

  /**
   * POST /projects/:id/automation-playbooks/:playbookId/draft/generate
   * Generate a full draft for all affected products for a given scopeId + rulesHash combination.
   * This is the only endpoint that performs full AI generation for playbooks.
   *
   * [ASSETS-PAGES-1.1] Extended with asset-scoped parameters:
   * - assetType: 'PRODUCTS' | 'PAGES' | 'COLLECTIONS' (default: 'PRODUCTS')
   * - scopeAssetRefs: Handle-based refs for non-product assets
   */
  @Post(':id/automation-playbooks/:playbookId/draft/generate')
  async generateAutomationPlaybookDraft(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('playbookId') playbookId: AutomationPlaybookId,
    @Body()
    body: {
      scopeId: string;
      rulesHash: string;
      scopeProductIds?: string[];
      /** [ASSETS-PAGES-1.1] Asset type for scoped playbook runs */
      assetType?: AutomationAssetType;
      /** [ASSETS-PAGES-1.1] Handle-based refs for non-product assets */
      scopeAssetRefs?: AssetRef[];
    },
  ) {
    if (!body?.scopeId) {
      throw new BadRequestException('scopeId is required');
    }
    if (!body?.rulesHash) {
      throw new BadRequestException('rulesHash is required');
    }

    // [ASSETS-PAGES-1.1] Validate asset scope parameters
    const assetType = body?.assetType ?? 'PRODUCTS';
    const hasScopeProductIds = body?.scopeProductIds && body.scopeProductIds.length > 0;
    const hasScopeAssetRefs = body?.scopeAssetRefs && body.scopeAssetRefs.length > 0;

    if (assetType === 'PRODUCTS') {
      if (hasScopeAssetRefs) {
        throw new BadRequestException(
          'scopeAssetRefs cannot be used with assetType PRODUCTS. Use scopeProductIds instead.',
        );
      }
    } else {
      if (hasScopeProductIds) {
        throw new BadRequestException(
          `scopeProductIds cannot be used with assetType ${assetType}. Use scopeAssetRefs instead.`,
        );
      }
      if (hasScopeAssetRefs) {
        const validation = validateAssetRefsForType(assetType, body.scopeAssetRefs!);
        if (!validation.valid) {
          throw new BadRequestException(validation.errors.join('; '));
        }
      }
    }

    // [ASSETS-PAGES-1.1] TODO: Service will be updated in PATCH 2 to accept assetType and scopeAssetRefs
    if (assetType !== 'PRODUCTS') {
      throw new BadRequestException(
        `Asset type ${assetType} is not yet supported. Only PRODUCTS is currently available.`,
      );
    }

    return this.automationPlaybooksService.generateDraft(
      req.user.id,
      projectId,
      playbookId,
      body.scopeId,
      body.rulesHash,
      body?.scopeProductIds,
    );
  }

  /**
   * GET /projects/:id/automation-playbooks/:playbookId/draft/latest
   * Returns the most recent draft for the given project + playbook, if any.
   * Used to hydrate previews without re-running AI.
   */
  @Get(':id/automation-playbooks/:playbookId/draft/latest')
  async getLatestAutomationPlaybookDraft(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('playbookId') playbookId: AutomationPlaybookId,
  ) {
    const draft = await this.automationPlaybooksService.getLatestDraft(
      req.user.id,
      projectId,
      playbookId,
    );
    if (!draft) {
      return {
        projectId,
        playbookId,
        draft: null,
      };
    }
    return draft;
  }

  /**
   * POST /projects/:id/automation-playbooks/apply
   * Apply an automation playbook to affected products.
   * Requires scopeId from the estimate response to ensure the apply targets
   * the exact same set of products that was previewed/estimated, and rulesHash
   * to bind apply to the rules snapshot used for draft generation.
   *
   * [ROLES-3] Updated role and approval gating:
   * - OWNER-only: Only project owners can apply
   * - EDITOR must request approval before owner can apply
   * - If governance policy requires approval, returns APPROVAL_REQUIRED error
   *
   * [ASSETS-PAGES-1.1] Extended with asset-scoped parameters:
   * - assetType: 'PRODUCTS' | 'PAGES' | 'COLLECTIONS' (default: 'PRODUCTS')
   * - scopeAssetRefs: Handle-based refs for non-product assets
   *
   * CRITICAL INVARIANT: Apply never uses AI. All suggestions come from pre-generated drafts.
   */
  @Post(':id/automation-playbooks/apply')
  async applyAutomationPlaybook(
    @Request() req: any,
    @Param('id') projectId: string,
    @Body()
    body: {
      playbookId: AutomationPlaybookId;
      scopeId: string;
      rulesHash: string;
      scopeProductIds?: string[];
      /** [ROLES-2] Optional approval ID for governance-gated apply */
      approvalId?: string;
      /** [ASSETS-PAGES-1.1] Asset type for scoped playbook runs */
      assetType?: AutomationAssetType;
      /** [ASSETS-PAGES-1.1] Handle-based refs for non-product assets */
      scopeAssetRefs?: AssetRef[];
    },
  ) {
    if (!body?.playbookId) {
      throw new BadRequestException('playbookId is required');
    }
    if (!body?.scopeId) {
      throw new BadRequestException('scopeId is required');
    }
    if (!body?.rulesHash) {
      throw new BadRequestException('rulesHash is required');
    }

    // [ASSETS-PAGES-1.1] Validate asset scope parameters
    const assetType = body?.assetType ?? 'PRODUCTS';
    const hasScopeProductIds = body?.scopeProductIds && body.scopeProductIds.length > 0;
    const hasScopeAssetRefs = body?.scopeAssetRefs && body.scopeAssetRefs.length > 0;

    if (assetType === 'PRODUCTS') {
      if (hasScopeAssetRefs) {
        throw new BadRequestException(
          'scopeAssetRefs cannot be used with assetType PRODUCTS. Use scopeProductIds instead.',
        );
      }
    } else {
      if (hasScopeProductIds) {
        throw new BadRequestException(
          `scopeProductIds cannot be used with assetType ${assetType}. Use scopeAssetRefs instead.`,
        );
      }
      if (hasScopeAssetRefs) {
        const validation = validateAssetRefsForType(assetType, body.scopeAssetRefs!);
        if (!validation.valid) {
          throw new BadRequestException(validation.errors.join('; '));
        }
      }
    }

    // [ASSETS-PAGES-1.1] TODO: Service will be updated in PATCH 2 to accept assetType and scopeAssetRefs
    if (assetType !== 'PRODUCTS') {
      throw new BadRequestException(
        `Asset type ${assetType} is not yet supported. Only PRODUCTS is currently available.`,
      );
    }

    const userId = req.user.id as string;

    // [ROLES-3] Role check: Only OWNER can apply
    // [ROLES-2 FIXUP-3] Role-specific denial messages for test alignment
    const effectiveRole = await this.roleResolutionService.resolveEffectiveRole(
      projectId,
      userId,
    );
    const capabilities = this.roleResolutionService.getCapabilities(effectiveRole);

    if (!capabilities.canApply) {
      // [ROLES-2 FIXUP-3] Role-specific apply denial messages
      if (effectiveRole === null) {
        throw new ForbiddenException('You do not have access to this project');
      }
      if (effectiveRole === 'VIEWER') {
        throw new ForbiddenException(
          'Viewer role cannot apply automation playbooks. Preview and export remain available.',
        );
      }
      if (effectiveRole === 'EDITOR') {
        throw new ForbiddenException(
          'Editor role cannot apply automation playbooks. Request approval from an owner.',
        );
      }
      // Safety fallback for any unexpected role
      throw new ForbiddenException(
        'Only project owners can apply automation playbooks.',
      );
    }

    // [ROLES-2] Governance approval check
    const approvalRequiredByPolicy = await this.governanceService.isApprovalRequired(projectId);

    // Track the validated approval ID for consumption after successful apply
    let validatedApprovalId: string | undefined;

    if (approvalRequiredByPolicy) {
      // Resource ID is scoped to the specific playbook apply operation
      const resourceId = `${body.playbookId}:${body.scopeId}`;

      // Check for valid approval - returns { valid, approvalId, status }
      const approvalStatus = await this.approvalsService.hasValidApproval(
        projectId,
        'AUTOMATION_PLAYBOOK_APPLY',
        resourceId,
      );

      if (!approvalStatus.valid) {
        // [ROLES-2 FIXUP-1] Use BadRequestException to avoid frontend auth-redirect behavior
        // Match geo.controller.ts contract for consistency
        throw new BadRequestException({
          code: 'APPROVAL_REQUIRED',
          message: 'Approval is required before applying this automation playbook.',
          approvalStatus: approvalStatus.status ?? 'none',
          approvalId: approvalStatus.approvalId,
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId,
        });
      }

      // Store the validated approval ID from lookup result, not from client
      validatedApprovalId = approvalStatus.approvalId;
    }

    // Execute the apply mutation
    const result = await this.automationPlaybooksService.applyPlaybook(
      userId,
      projectId,
      body.playbookId,
      body.scopeId,
      body.rulesHash,
      body?.scopeProductIds,
    );

    // [ROLES-2 FIXUP-1] Only consume approval AFTER successful apply mutation
    if (validatedApprovalId) {
      await this.approvalsService.markConsumed(validatedApprovalId);
    }

    return result;
  }

  /**
   * POST /projects/:id/automation-playbooks/:playbookId/runs
   * Create a new Automation Playbook run (PREVIEW_GENERATE, DRAFT_GENERATE, APPLY).
   * In production, runs are enqueued and processed by a worker; in dev, they may execute inline.
   */
  @Post(':id/automation-playbooks/:playbookId/runs')
  async createAutomationPlaybookRun(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('playbookId') playbookId: AutomationPlaybookId,
    @Body()
    body: {
      runType: AutomationPlaybookRunType;
      scopeId: string;
      rulesHash: string;
      idempotencyKey?: string;
      meta?: Record<string, unknown>;
    },
  ) {
    const userId = req.user.id as string;
    if (!body?.runType) {
      throw new BadRequestException('runType is required');
    }
    if (!body?.scopeId) {
      throw new BadRequestException('scopeId is required');
    }
    if (!body?.rulesHash) {
      throw new BadRequestException('rulesHash is required');
    }

    const run = await this.automationPlaybookRunsService.createRun({
      userId,
      projectId,
      playbookId,
      runType: body.runType,
      scopeId: body.scopeId,
      rulesHash: body.rulesHash,
      idempotencyKey: body.idempotencyKey,
      meta: body.meta ?? {},
    });

    await this.automationPlaybookRunsService.enqueueOrExecute(run);

    return {
      id: run.id,
      projectId: run.projectId,
      playbookId: run.playbookId,
      runType: run.runType,
      status: run.status,
      scopeId: run.scopeId,
      rulesHash: run.rulesHash,
      idempotencyKey: run.idempotencyKey,
      createdAt: run.createdAt,
    };
  }

  /**
   * GET /projects/:id/automation-playbooks/runs/:runId
   * Get a specific Automation Playbook run by ID.
   */
  @Get(':id/automation-playbooks/runs/:runId')
  async getAutomationPlaybookRun(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('runId') runId: string,
  ) {
    const userId = req.user.id as string;
    return this.automationPlaybookRunsService.getRunById(userId, projectId, runId);
  }

  /**
   * GET /projects/:id/automation-playbooks/runs
   * List Automation Playbook runs for a project with optional filters.
   */
  @Get(':id/automation-playbooks/runs')
  async listAutomationPlaybookRuns(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('playbookId') playbookId?: AutomationPlaybookId,
    @Query('scopeId') scopeId?: string,
    @Query('runType') runType?: AutomationPlaybookRunType,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id as string;
    const parsedLimit = Math.min(Number(limit) || 20, 100);
    return this.automationPlaybookRunsService.listRuns(userId, projectId, {
      playbookId,
      scopeId,
      runType,
      limit: parsedLimit,
    });
  }

  /**
   * POST /projects/:id/automation-playbooks/:playbookId/config
   * Persist enablement config for Automation Entry UX (no AI calls, no execution).
   */
  @Post(':id/automation-playbooks/:playbookId/config')
  async setAutomationPlaybookEntryConfig(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('playbookId') playbookId: AutomationPlaybookId,
    @Body()
    body: {
      enabled: boolean;
      trigger: 'manual_only';
      scopeId: string;
      rulesHash: string;
      scopeProductIds?: string[];
      intent?: string;
    },
  ) {
    if (typeof body?.enabled !== 'boolean') {
      throw new BadRequestException('enabled is required');
    }
    if (!body?.trigger) {
      throw new BadRequestException('trigger is required');
    }
    if (!body?.scopeId) {
      throw new BadRequestException('scopeId is required');
    }
    if (!body?.rulesHash) {
      throw new BadRequestException('rulesHash is required');
    }
    if (body.trigger !== 'manual_only') {
      throw new BadRequestException('Only manual_only trigger is supported');
    }
    return this.automationPlaybooksService.setAutomationEntryConfig(
      req.user.id,
      projectId,
      playbookId,
      {
        enabled: body.enabled,
        trigger: 'manual_only',
        scopeId: body.scopeId,
        rulesHash: body.rulesHash,
        scopeProductIds: body.scopeProductIds,
        intent: body.intent,
      },
    );
  }

  // ===========================================================================
  // [ROLES-3] Membership Management API
  // ===========================================================================

  /**
   * GET /projects/:id/members
   * List all members of a project (read-only for all members)
   */
  @Get(':id/members')
  async listMembers(@Request() req: any, @Param('id') projectId: string) {
    return this.projectsService.listMembers(projectId, req.user.id);
  }

  /**
   * POST /projects/:id/members
   * Add a member to a project (OWNER-only)
   */
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Request() req: any,
    @Param('id') projectId: string,
    @Body() body: { email: string; role: ProjectMemberRole },
  ) {
    if (!body?.email) {
      throw new BadRequestException('email is required');
    }
    if (!body?.role) {
      throw new BadRequestException('role is required');
    }
    const validRoles = Object.values(ProjectMemberRole);
    if (!validRoles.includes(body.role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
    const dto: AddMemberDto = {
      email: body.email,
      role: body.role,
    };
    return this.projectsService.addMember(projectId, req.user.id, dto);
  }

  /**
   * PUT /projects/:id/members/:memberId
   * Change a member's role (OWNER-only)
   */
  @Put(':id/members/:memberId')
  async changeMemberRole(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('memberId') memberId: string,
    @Body() body: { role: ProjectMemberRole },
  ) {
    if (!body?.role) {
      throw new BadRequestException('role is required');
    }
    const validRoles = Object.values(ProjectMemberRole);
    if (!validRoles.includes(body.role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
    const dto: ChangeMemberRoleDto = {
      role: body.role,
    };
    return this.projectsService.changeMemberRole(projectId, memberId, req.user.id, dto);
  }

  /**
   * DELETE /projects/:id/members/:memberId
   * Remove a member from a project (OWNER-only)
   */
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.projectsService.removeMember(projectId, memberId, req.user.id);
    return { success: true, message: 'Member removed successfully' };
  }

  /**
   * GET /projects/:id/role
   * Get the current user's role in a project
   * [ROLES-3 FIXUP-2] Includes isMultiUserProject for UI decisions
   */
  @Get(':id/role')
  async getUserRole(@Request() req: any, @Param('id') projectId: string) {
    const role = await this.projectsService.getUserRole(projectId, req.user.id);
    if (!role) {
      throw new ForbiddenException('You do not have access to this project');
    }
    const capabilities = this.roleResolutionService.getCapabilities(role);
    const isMultiUserProject = await this.roleResolutionService.isMultiUserProject(projectId);
    return {
      projectId,
      userId: req.user.id,
      role,
      capabilities,
      isMultiUserProject,
    };
  }

  // ===========================================================================
  // [WORK-QUEUE-1] Unified Action Bundle Work Queue
  // ===========================================================================

  /**
   * GET /projects/:id/work-queue
   * Returns derived Work Queue action bundles for a project.
   *
   * [WORK-QUEUE-1] All bundles are derived at request time from existing
   * persisted artifacts (issues, playbook drafts, approvals, share links).
   *
   * Query params:
   * - tab?: 'Critical' | 'NeedsAttention' | 'PendingApproval' | 'DraftsReady' | 'AppliedRecently'
   * - bundleType?: 'ASSET_OPTIMIZATION' | 'AUTOMATION_RUN' | 'GEO_EXPORT'
   * - actionKey?: 'FIX_MISSING_METADATA' | 'RESOLVE_TECHNICAL_ISSUES' | 'IMPROVE_SEARCH_INTENT' | 'OPTIMIZE_CONTENT' | 'SHARE_LINK_GOVERNANCE'
   * - scopeType?: 'PRODUCTS' | 'PAGES' | 'COLLECTIONS' | 'STORE_WIDE' [ASSETS-PAGES-1]
   * - bundleId?: string (for deep-link highlight)
   *
   * Auth: JWT guard
   * Access: Any ProjectMember (membership-readable)
   */
  @Get(':id/work-queue')
  async getWorkQueue(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('tab') tab?: WorkQueueTab,
    @Query('bundleType') bundleType?: WorkQueueBundleType,
    @Query('actionKey') actionKey?: WorkQueueRecommendedActionKey,
    @Query('scopeType') scopeType?: WorkQueueScopeType,
    @Query('bundleId') bundleId?: string,
  ): Promise<WorkQueueResponse> {
    return this.workQueueService.getWorkQueue(projectId, req.user.id, {
      tab,
      bundleType,
      actionKey,
      scopeType,
      bundleId,
    });
  }

  // ===========================================================================
  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Project-scoped Shopify sync endpoints
  // ===========================================================================

  /**
   * POST /projects/:id/shopify/sync-pages
   * [SHOPIFY-ASSET-SYNC-COVERAGE-1] [CRITICAL PATH: CP-006 Shopify Sync]
   *
   * Triggers Shopify Pages sync for this project.
   * OWNER-only (matches existing Shopify mutation posture).
   *
   * Returns: { fetched, upserted, skipped, completedAt, warnings?, projectId }
   */
  @Post(':id/shopify/sync-pages')
  @HttpCode(HttpStatus.OK)
  async syncShopifyPages(
    @Request() req: any,
    @Param('id') projectId: string,
  ) {
    // OWNER-only check
    const role = await this.roleResolutionService.resolveEffectiveRole(projectId, req.user.id);
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only project owners can sync Shopify Pages');
    }

    return this.shopifyService.syncPages(projectId);
  }

  /**
   * POST /projects/:id/shopify/sync-collections
   * [SHOPIFY-ASSET-SYNC-COVERAGE-1] [CRITICAL PATH: CP-006 Shopify Sync]
   *
   * Triggers Shopify Collections sync for this project.
   * OWNER-only (matches existing Shopify mutation posture).
   *
   * Returns: { fetched, upserted, skipped, completedAt, warnings?, projectId }
   */
  @Post(':id/shopify/sync-collections')
  @HttpCode(HttpStatus.OK)
  async syncShopifyCollections(
    @Request() req: any,
    @Param('id') projectId: string,
  ) {
    // OWNER-only check
    const role = await this.roleResolutionService.resolveEffectiveRole(projectId, req.user.id);
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only project owners can sync Shopify Collections');
    }

    return this.shopifyService.syncCollections(projectId);
  }

  /**
   * GET /projects/:id/shopify/sync-status
   * [SHOPIFY-ASSET-SYNC-COVERAGE-1] [CRITICAL PATH: CP-006 Shopify Sync]
   *
   * Returns sync status timestamps for this project.
   * Membership-accessible (read-only).
   *
   * Returns: { lastProductsSyncAt, lastPagesSyncAt, lastCollectionsSyncAt, projectId }
   */
  @Get(':id/shopify/sync-status')
  async getShopifySyncStatus(
    @Request() req: any,
    @Param('id') projectId: string,
  ) {
    // Membership check (any role can read)
    const hasAccess = await this.roleResolutionService.hasProjectAccess(projectId, req.user.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return this.shopifyService.getSyncStatus(projectId);
  }

  /**
   * GET /projects/:id/shopify/missing-scopes?capability=pages_sync|collections_sync
   * [SHOPIFY-SCOPE-RECONSENT-UX-1] Server-authoritative missing scope detection.
   * Membership-accessible (read-only).
   */
  @Get(':id/shopify/missing-scopes')
  async getShopifyMissingScopes(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('capability') capability?: string,
  ): Promise<{ projectId: string; connected: boolean } & ShopifyScopeStatus> {
    if (!capability) {
      throw new BadRequestException('Missing capability parameter');
    }
    const hasAccess = await this.roleResolutionService.hasProjectAccess(projectId, req.user.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }
    if (capability !== 'pages_sync' && capability !== 'collections_sync') {
      throw new BadRequestException('Invalid capability parameter');
    }
    return this.shopifyService.getShopifyScopeStatus(projectId, capability);
  }

  /**
   * GET /projects/:id/shopify/connect-url?returnTo=/projects/...
   * [SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1] Returns a Shopify OAuth authorize URL for explicit, user-initiated initial connection.
   * OWNER-only (matches Shopify mutation posture).
   */
  @Get(':id/shopify/connect-url')
  async getShopifyConnectUrl(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('returnTo') returnTo?: string,
  ) {
    const role = await this.roleResolutionService.resolveEffectiveRole(projectId, req.user.id);
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only project owners can connect Shopify');
    }

    const existingIntegration = await this.shopifyService.getShopifyIntegration(projectId);
    if (existingIntegration?.externalId && existingIntegration?.accessToken) {
      throw new BadRequestException('Shopify is already connected for this project');
    }

    const project = await this.projectsService.getProject(projectId, req.user.id);
    const candidateShop = String(existingIntegration?.externalId ?? (project as any)?.domain ?? '').trim();
    const cleaned = candidateShop.replace(/^https?:\/\//i, '').split('/')[0].trim();

    if (!cleaned) {
      throw new BadRequestException('No Shopify shop domain configured for this project');
    }

    // [SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1-FIXUP-1] Validate shop domain format
    // Only append .myshopify.com if the value is a bare store handle (no dots)
    // If it already contains dots but not .myshopify.com, it's an invalid non-Shopify domain
    let shopDomain: string;
    if (cleaned.includes('.myshopify.com')) {
      shopDomain = cleaned;
    } else if (!cleaned.includes('.')) {
      shopDomain = `${cleaned}.myshopify.com`;
    } else {
      throw new BadRequestException(
        'Project domain must be a Shopify store (e.g., my-store.myshopify.com or my-store). Custom domains cannot be used for Shopify OAuth.',
      );
    }
    const safeReturnTo = this.shopifyService.getSafeReturnToForProject(returnTo, projectId);

    const url = this.shopifyService.generateInstallUrl(shopDomain, projectId, {
      source: 'install',
      returnTo: safeReturnTo,
    });

    return { url };
  }

  /**
   * GET /projects/:id/shopify/reconnect-url?capability=pages_sync|collections_sync&returnTo=/projects/...
   * [SHOPIFY-SCOPE-RECONSENT-UX-1-FIXUP-1] [CRITICAL PATH: CP-006 Shopify Sync]
   * Returns a Shopify OAuth authorize URL for explicit, user-initiated re-consent.
   * OWNER-only (matches Shopify mutation posture).
   */
  @Get(':id/shopify/reconnect-url')
  async getShopifyReconnectUrl(
    @Request() req: any,
    @Param('id') projectId: string,
    @Query('capability') capability?: string,
    @Query('returnTo') returnTo?: string,
  ) {
    if (!capability) {
      throw new BadRequestException('Missing capability parameter');
    }
    if (capability !== 'pages_sync' && capability !== 'collections_sync') {
      throw new BadRequestException('Invalid capability parameter');
    }
    const role = await this.roleResolutionService.resolveEffectiveRole(projectId, req.user.id);
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only project owners can reconnect Shopify');
    }
    const integration = await this.shopifyService.getShopifyIntegration(projectId);
    if (!integration || !integration.externalId) {
      throw new BadRequestException('No Shopify integration found for this project');
    }
    const scopeStatus = await this.shopifyService.getShopifyScopeStatus(projectId, capability);
    const desiredScopes = Array.from(
      new Set([...(scopeStatus.grantedScopes ?? []), ...(scopeStatus.missingScopes ?? [])]),
    );
    const safeReturnTo = this.shopifyService.getSafeReturnToForProject(returnTo, projectId);
    const url = this.shopifyService.generateInstallUrl(integration.externalId, projectId, {
      scopesCsv: desiredScopes.join(','),
      source: 'reconnect',
      capability,
      returnTo: safeReturnTo,
    });
    return { url };
  }
}
