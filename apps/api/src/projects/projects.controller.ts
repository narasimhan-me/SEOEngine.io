import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService, CreateProjectDto } from './projects.service';
import { DeoScoreService, DeoSignalsService } from './deo-score.service';
import {
  DeoScoreLatestResponse,
  DeoScoreJobPayload,
  DeoScoreSignals,
} from '@engineo/shared';
import { deoScoreQueue } from '../queues/queues';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly deoScoreService: DeoScoreService,
    private readonly deoSignalsService: DeoSignalsService,
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
}
