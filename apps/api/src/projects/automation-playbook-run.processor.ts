import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import * as crypto from 'crypto';
import { redisConfig } from '../config/redis.config';
import { PrismaService } from '../prisma.service';
import {
  AutomationPlaybooksService,
  AutomationPlaybookId,
  PlaybookRulesV1,
} from './automation-playbooks.service';

interface AutomationPlaybookRunJobPayload {
  runId: string;
}

@Injectable()
export class AutomationPlaybookRunProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<AutomationPlaybookRunJobPayload, void> | null = null;
  private readonly logger = new Logger(AutomationPlaybookRunProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automationPlaybooksService: AutomationPlaybooksService,
  ) {}

  async onModuleInit() {
    if (!redisConfig.isEnabled || !redisConfig.connection) {
      this.logger.warn('[AutomationPlaybookRunProcessor] Redis not configured - worker disabled');
      return;
    }

    const enableQueueProcessors = process.env.ENABLE_QUEUE_PROCESSORS !== 'false';
    if (!enableQueueProcessors) {
      this.logger.warn(
        '[AutomationPlaybookRunProcessor] ENABLE_QUEUE_PROCESSORS=false - worker disabled',
      );
      return;
    }

    this.worker = new Worker<AutomationPlaybookRunJobPayload, void>(
      'automation_playbook_run_queue',
      async (job: Job<AutomationPlaybookRunJobPayload>): Promise<void> => {
        await this.processJob(job.data.runId);
      },
      {
        connection: redisConfig.connection,
        prefix: redisConfig.prefix,
        concurrency: 5,
      },
    );

    this.logger.log('[AutomationPlaybookRunProcessor] Worker initialized');
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('[AutomationPlaybookRunProcessor] Worker closed');
    }
  }

  /**
   * CACHE/REUSE v2: Compute a deterministic aiWorkKey for a given set of inputs.
   * The key is a SHA-256 hash of (playbookId, sortedProductIds, rules).
   */
  computeAiWorkKey(
    playbookId: string,
    productIds: string[],
    rules: PlaybookRulesV1 | undefined,
  ): string {
    const sortedProductIds = [...productIds].sort();
    const rulesJson = rules ? JSON.stringify(rules) : '';
    const payload = `${playbookId}:${sortedProductIds.join(',')}:${rulesJson}`;
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }

  /**
   * CACHE/REUSE v2: Find a prior run with the same aiWorkKey that can be reused.
   * Returns the run if found and in a reusable state (SUCCEEDED), otherwise null.
   */
  async findReusableRun(
    projectId: string,
    playbookId: string,
    runType: 'PREVIEW_GENERATE' | 'DRAFT_GENERATE',
    aiWorkKey: string,
  ): Promise<{ id: string; draftId: string | null } | null> {
    const reusableRun = await this.prisma.automationPlaybookRun.findFirst({
      where: {
        projectId,
        playbookId,
        runType,
        aiWorkKey,
        status: 'SUCCEEDED',
        aiUsed: true,
        reused: false, // Only reuse from original AI runs, not from other reused runs
      },
      select: {
        id: true,
        draftId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reusableRun;
  }

  /**
   * Process a single run job. This method can also be called directly for inline
   * execution in development environments without Redis.
   */
  async processJob(runId: string): Promise<void> {
    const run = await this.prisma.automationPlaybookRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      this.logger.warn(`[AutomationPlaybookRunProcessor] Run ${runId} not found; skipping`);
      return;
    }

    // Idempotency: only process QUEUED runs
    if (run.status !== 'QUEUED') {
      this.logger.log(
        `[AutomationPlaybookRunProcessor] Run ${runId} is ${run.status}, not QUEUED; skipping`,
      );
      return;
    }

    // Transition to RUNNING
    await this.prisma.automationPlaybookRun.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `[AutomationPlaybookRunProcessor] Processing run ${runId} (type=${run.runType}, playbook=${run.playbookId})`,
    );

    try {
      const meta = (run.meta as Record<string, unknown>) ?? {};
      const playbookId = run.playbookId as AutomationPlaybookId;

      let draftId: string | null = null;
      let resultRef: string | null = null;
      let aiUsed = false;
      // CACHE/REUSE v2: Track reuse
      let aiWorkKey: string | null = null;
      let reused = false;
      let reusedFromRunId: string | null = null;

      switch (run.runType) {
        case 'PREVIEW_GENERATE': {
          const rules = (meta.rules as PlaybookRulesV1) ?? undefined;
          const sampleSize = (meta.sampleSize as number) ?? 3;
          const productIds = (meta.productIds as string[]) ?? [];

          // CACHE/REUSE v2: Compute aiWorkKey for potential reuse
          if (productIds.length > 0) {
            aiWorkKey = this.computeAiWorkKey(playbookId, productIds, rules);

            // Check for a prior run with the same aiWorkKey
            const reusableRun = await this.findReusableRun(
              run.projectId,
              playbookId,
              'PREVIEW_GENERATE',
              aiWorkKey,
            );

            if (reusableRun) {
              // Reuse the prior run's draft instead of calling AI
              this.logger.log(
                `[AutomationPlaybookRunProcessor] Run ${runId} reusing AI work from run ${reusableRun.id}`,
              );
              draftId = reusableRun.draftId;
              resultRef = reusableRun.draftId;
              aiUsed = false;
              reused = true;
              reusedFromRunId = reusableRun.id;
              break;
            }
          }

          // No reusable run found - perform fresh AI generation
          const previewResult = await this.automationPlaybooksService.previewPlaybook(
            run.createdByUserId,
            run.projectId,
            playbookId,
            rules,
            sampleSize,
          );

          draftId = previewResult.draftId;
          resultRef = previewResult.draftId;
          aiUsed = previewResult.aiCalled ?? true;
          break;
        }

        case 'DRAFT_GENERATE': {
          const rules = (meta.rules as PlaybookRulesV1) ?? undefined;
          const productIds = (meta.productIds as string[]) ?? [];

          // CACHE/REUSE v2: Compute aiWorkKey for potential reuse
          if (productIds.length > 0) {
            aiWorkKey = this.computeAiWorkKey(playbookId, productIds, rules);

            // Check for a prior run with the same aiWorkKey
            const reusableRun = await this.findReusableRun(
              run.projectId,
              playbookId,
              'DRAFT_GENERATE',
              aiWorkKey,
            );

            if (reusableRun) {
              // Reuse the prior run's draft instead of calling AI
              this.logger.log(
                `[AutomationPlaybookRunProcessor] Run ${runId} reusing AI work from run ${reusableRun.id}`,
              );
              draftId = reusableRun.draftId;
              resultRef = reusableRun.draftId;
              aiUsed = false;
              reused = true;
              reusedFromRunId = reusableRun.id;
              break;
            }
          }

          // No reusable run found - perform fresh AI generation
          const generateResult = await this.automationPlaybooksService.generateDraft(
            run.createdByUserId,
            run.projectId,
            playbookId,
            run.scopeId,
            run.rulesHash,
          );

          draftId = generateResult.draftId;
          resultRef = generateResult.draftId;
          aiUsed = generateResult.aiCalled ?? true;
          break;
        }

        case 'APPLY': {
          const applyResult = await this.automationPlaybooksService.applyPlaybook(
            run.createdByUserId,
            run.projectId,
            playbookId,
            run.scopeId,
            run.rulesHash,
          );

          // AI-USAGE-1: Apply must never count as AI usage when valid drafts exist.
          // Apply always uses pre-generated drafts; any AI work happened in PREVIEW_GENERATE
          // or DRAFT_GENERATE runs. This is enforced regardless of success/failure path.
          aiUsed = false;
          resultRef = `${applyResult.projectId}:${applyResult.playbookId}:${run.scopeId}`;
          break;
        }

        default:
          throw new Error(`Unknown runType: ${run.runType}`);
      }

      // Mark as SUCCEEDED with CACHE/REUSE v2 fields
      await this.prisma.automationPlaybookRun.update({
        where: { id: runId },
        data: {
          status: 'SUCCEEDED',
          draftId,
          resultRef,
          aiUsed,
          aiWorkKey,
          reused,
          reusedFromRunId,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `[AutomationPlaybookRunProcessor] Run ${runId} completed successfully (aiUsed=${aiUsed}, reused=${reused})`,
      );
    } catch (error: unknown) {
      const errorObj = error as { code?: string; message?: string };
      const errorCode = errorObj.code ?? 'INTERNAL_ERROR';
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Map known contract violations to STALE status
      const staleErrorCodes = [
        'PLAYBOOK_SCOPE_INVALID',
        'PLAYBOOK_RULES_CHANGED',
        'PLAYBOOK_DRAFT_NOT_FOUND',
      ];

      const status = staleErrorCodes.includes(errorCode) ? 'STALE' : 'FAILED';

      await this.prisma.automationPlaybookRun.update({
        where: { id: runId },
        data: {
          status,
          errorCode,
          errorMessage,
          updatedAt: new Date(),
        },
      });

      this.logger.error(
        `[AutomationPlaybookRunProcessor] Run ${runId} failed with ${status}: ${errorCode} - ${errorMessage}`,
      );

      // Re-throw for BullMQ to mark the job as failed
      throw error;
    }
  }
}
