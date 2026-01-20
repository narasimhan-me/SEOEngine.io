import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AutomationPlaybookId } from './automation-playbooks.service';
import { playbookRunQueue } from '../queues/queues';
import { AutomationPlaybookRunProcessor } from './automation-playbook-run.processor';
import {
  AutomationPlaybookRunType,
  AutomationPlaybookRunStatus,
} from '@prisma/client';
import { RoleResolutionService } from '../common/role-resolution.service';

export { AutomationPlaybookRunType, AutomationPlaybookRunStatus };

export interface CreateRunOptions {
  userId: string;
  projectId: string;
  playbookId: AutomationPlaybookId;
  runType: AutomationPlaybookRunType;
  scopeId: string;
  rulesHash: string;
  idempotencyKey?: string;
  meta?: Record<string, unknown>;
}

export interface ListRunsFilters {
  playbookId?: AutomationPlaybookId;
  scopeId?: string;
  runType?: AutomationPlaybookRunType;
  limit?: number;
}

/**
 * [ROLES-3 FIXUP-3] AutomationPlaybookRunsService
 * Updated with membership-aware access control:
 * - getRunById / listRuns: any ProjectMember can view
 * - createRun: enforced by run type:
 *   - PREVIEW_GENERATE / DRAFT_GENERATE → OWNER/EDITOR only (assertCanGenerateDrafts)
 *   - APPLY → OWNER-only (assertOwnerRole)
 */
@Injectable()
export class AutomationPlaybookRunsService {
  private readonly logger = new Logger(AutomationPlaybookRunsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runProcessor: AutomationPlaybookRunProcessor,
    private readonly roleResolution: RoleResolutionService
  ) {}

  /**
   * Create a new run with idempotency support.
   * If a run with the same (projectId, playbookId, runType, scopeId, rulesHash, idempotencyKey)
   * already exists and is in QUEUED, RUNNING, or SUCCEEDED state, returns the existing run.
   *
   * [ROLES-3 FIXUP-3] Role-based access enforcement by run type:
   * - PREVIEW_GENERATE / DRAFT_GENERATE → OWNER/EDITOR only
   * - APPLY → OWNER-only
   */
  async createRun(options: CreateRunOptions) {
    const {
      userId,
      projectId,
      playbookId,
      runType,
      scopeId,
      rulesHash,
      idempotencyKey,
      meta,
    } = options;

    // [ROLES-3 FIXUP-3] Enforce role-based access by run type
    if (runType === 'APPLY') {
      // APPLY runs require OWNER role
      await this.roleResolution.assertOwnerRole(projectId, userId);
    } else {
      // PREVIEW_GENERATE / DRAFT_GENERATE require OWNER or EDITOR (no VIEWER)
      await this.roleResolution.assertCanGenerateDrafts(projectId, userId);
    }

    // Compute effective idempotency key
    const effectiveIdempotencyKey =
      idempotencyKey ??
      `${runType}:${projectId}:${playbookId}:${scopeId}:${rulesHash}`;

    // Check for existing run with the same key
    const existingRun = await this.prisma.automationPlaybookRun.findFirst({
      where: {
        projectId,
        playbookId,
        runType,
        scopeId,
        rulesHash,
        idempotencyKey: effectiveIdempotencyKey,
      },
    });

    // If found and in a non-terminal state or succeeded, return existing
    if (
      existingRun &&
      ['QUEUED', 'RUNNING', 'SUCCEEDED'].includes(existingRun.status)
    ) {
      this.logger.log(
        `[AutomationPlaybookRunsService] Returning existing run ${existingRun.id} (status=${existingRun.status})`
      );
      return existingRun;
    }

    // Create new run
    const run = await this.prisma.automationPlaybookRun.create({
      data: {
        projectId,
        createdByUserId: userId,
        playbookId,
        runType,
        status: 'QUEUED',
        scopeId,
        rulesHash,
        idempotencyKey: effectiveIdempotencyKey,
        meta: (meta ?? {}) as unknown as any,
      },
    });

    this.logger.log(
      `[AutomationPlaybookRunsService] Created run ${run.id} (type=${runType}, playbook=${playbookId})`
    );

    return run;
  }

  /**
   * Enqueue the run for processing via BullMQ, or execute inline in dev environments.
   */
  async enqueueOrExecute(run: { id: string; status: string }) {
    // Only enqueue QUEUED runs
    if (run.status !== 'QUEUED') {
      this.logger.log(
        `[AutomationPlaybookRunsService] Run ${run.id} is ${run.status}, not enqueueing`
      );
      return;
    }

    const enableQueueProcessors =
      process.env.ENABLE_QUEUE_PROCESSORS !== 'false';

    if (playbookRunQueue && enableQueueProcessors) {
      // Production path: enqueue to BullMQ
      await playbookRunQueue.add('automation_playbook_run', { runId: run.id });
      this.logger.log(
        `[AutomationPlaybookRunsService] Enqueued run ${run.id} to automation_playbook_run_queue`
      );
    } else {
      // Dev path: execute inline
      this.logger.log(
        `[AutomationPlaybookRunsService] Executing run ${run.id} inline (no queue available)`
      );
      try {
        await this.runProcessor.processJob(run.id);
      } catch (error) {
        // Error is already logged by the processor; don't re-throw for inline execution
        this.logger.warn(
          `[AutomationPlaybookRunsService] Inline execution of run ${run.id} failed`
        );
      }
    }
  }

  /**
   * Get a run by ID.
   * [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view).
   */
  async getRunById(userId: string, projectId: string, runId: string) {
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const run = await this.prisma.automationPlaybookRun.findFirst({
      where: {
        id: runId,
        projectId,
      },
    });

    if (!run) {
      throw new NotFoundException('Run not found');
    }

    return run;
  }

  /**
   * List runs for a project with optional filters.
   * [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view).
   */
  async listRuns(userId: string, projectId: string, filters: ListRunsFilters) {
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const { playbookId, scopeId, runType, limit = 20 } = filters;

    const where: Record<string, unknown> = { projectId };
    if (playbookId) where.playbookId = playbookId;
    if (scopeId) where.scopeId = scopeId;
    if (runType) where.runType = runType;

    const runs = await this.prisma.automationPlaybookRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return runs;
  }
}
