// apps/api/src/projects/deo-score.processor.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis.config';
import { DeoScoreService } from './deo-score.service';
import { DeoScoreJobPayload, DeoScoreJobResult } from '@engineo/shared';

@Injectable()
export class DeoScoreProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<DeoScoreJobPayload, DeoScoreJobResult> | null = null;

  constructor(private readonly deoScoreService: DeoScoreService) {}

  async onModuleInit() {
    this.worker = new Worker<DeoScoreJobPayload, DeoScoreJobResult>(
      'deo_score_queue',
      async (job: Job<DeoScoreJobPayload>): Promise<DeoScoreJobResult> => {
        const { projectId } = job.data;

        try {
          const snapshot = await this.deoScoreService.createPlaceholderSnapshotForProject(
            projectId,
          );

          console.log(
            `[DeoScoreProcessor] Successfully recomputed placeholder DEO score for project ${projectId} (snapshot ${snapshot.id})`,
          );

          return {
            projectId,
            snapshotId: snapshot.id,
          };
        } catch (error) {
          console.error(
            `[DeoScoreProcessor] Failed to recompute DEO score for project ${projectId}`,
            error,
          );
          throw error;
        }
      },
      {
        connection: {
          url: redisConfig.url,
        },
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
