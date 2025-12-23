import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService, CreateProjectDto, UpdateProjectDto } from './projects.service';
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
   * Returns non-product crawl pages for content optimization
   */
  @Get(':id/crawl-pages')
  async getCrawlPages(@Request() req: any, @Param('id') projectId: string) {
    return this.projectsService.getCrawlPages(projectId, req.user.id);
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
   */
  @Post(':id/automation-playbooks/estimate')
  async estimateAutomationPlaybookScoped(
    @Request() req: any,
    @Param('id') projectId: string,
    @Body()
    body: {
      playbookId: AutomationPlaybookId;
      scopeProductIds?: string[];
    },
  ) {
    if (!body?.playbookId) {
      throw new BadRequestException('playbookId is required');
    }
    return this.automationPlaybooksService.estimatePlaybook(
      req.user.id,
      projectId,
      body.playbookId,
      body.scopeProductIds,
    );
  }

  /**
   * POST /projects/:id/automation-playbooks/:playbookId/preview
   * Generate a preview draft for an automation playbook. Creates or updates a draft keyed by
   * (projectId, playbookId, scopeId, rulesHash) and returns sample suggestions plus draft metadata.
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
    },
  ) {
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
    },
  ) {
    if (!body?.scopeId) {
      throw new BadRequestException('scopeId is required');
    }
    if (!body?.rulesHash) {
      throw new BadRequestException('rulesHash is required');
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
    return this.automationPlaybooksService.applyPlaybook(
      req.user.id,
      projectId,
      body.playbookId,
      body.scopeId,
      body.rulesHash,
      body?.scopeProductIds,
    );
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
}
