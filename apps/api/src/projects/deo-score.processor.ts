// apps/api/src/projects/deo-score.processor.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis.config';
import { DeoScoreService, DeoSignalsService } from './deo-score.service';
import { DeoScoreJobPayload, DeoScoreJobResult } from '@engineo/shared';

@Injectable()
export class DeoScoreProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<DeoScoreJobPayload, DeoScoreJobResult> | null = null;

  constructor(
    private readonly deoScoreService: DeoScoreService,
    private readonly deoSignalsService: DeoSignalsService,
  ) {}

  async onModuleInit() {
    // Skip worker initialization if Redis is not configured
    if (!redisConfig.isEnabled || !redisConfig.connection) {
      console.warn('[DeoScoreProcessor] Redis not configured - worker disabled');
      return;
    }

    const enableQueueProcessors =
      process.env.ENABLE_QUEUE_PROCESSORS !== 'false';
    if (!enableQueueProcessors) {
      console.warn(
        '[DeoScoreProcessor] ENABLE_QUEUE_PROCESSORS=false - worker disabled',
      );
      return;
    }

    this.worker = new Worker<DeoScoreJobPayload, DeoScoreJobResult>(
      'deo_score_queue',
      async (job: Job<DeoScoreJobPayload>): Promise<DeoScoreJobResult> => {
        const { projectId } = job.data;

        try {
          // Phase 2.4: Collect heuristic crawl-based signals and compute v1 score
          const signals = await this.deoSignalsService.collectSignalsForProject(projectId);
          const snapshot = await this.deoScoreService.computeAndPersistScoreFromSignals(
            projectId,
            signals,
          );

          console.log(
            `[DeoScoreProcessor] Successfully computed v1 DEO score for project ${projectId} (snapshot ${snapshot.id}, overall=${snapshot.breakdown.overall})`,
          );

          return {
            projectId,
            snapshotId: snapshot.id,
          };
        } catch (error) {
          console.error(
            `[DeoScoreProcessor] Failed to compute DEO score for project ${projectId}`,
            error,
          );
          throw error;
        }
      },
      {
        connection: redisConfig.connection,
        prefix: redisConfig.prefix,
      },
    );
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
