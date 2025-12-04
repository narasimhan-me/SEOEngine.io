import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { redisConfig } from '../config/redis.config';
import { PrismaService } from '../prisma.service';
import { SeoScanService } from '../seo-scan/seo-scan.service';
import { DeoScoreService, DeoSignalsService } from '../projects/deo-score.service';

interface CrawlJobPayload {
  projectId: string;
}

@Injectable()
export class CrawlProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<CrawlJobPayload, void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly seoScanService: SeoScanService,
    private readonly deoSignalsService: DeoSignalsService,
    private readonly deoScoreService: DeoScoreService,
  ) {}

  async onModuleInit() {
    if (!redisConfig.isEnabled || !redisConfig.connection) {
      console.warn('[CrawlProcessor] Redis not configured - worker disabled');
      return;
    }

    this.worker = new Worker<CrawlJobPayload, void>(
      'crawl_queue',
      async (job: Job<CrawlJobPayload>): Promise<void> => {
        const { projectId } = job.data;
        const jobStartedAt = Date.now();

        try {
          const crawledAt = await this.seoScanService.runFullProjectCrawl(projectId);

          if (!crawledAt) {
            console.warn(
              `[CrawlProcessor] Crawl skipped for project ${projectId} (no domain or project not found)`,
            );
            return;
          }

          await this.prisma.project.update({
            where: { id: projectId },
            data: {
              lastCrawledAt: crawledAt,
            },
          });

          console.log(
            `[CrawlProcessor] Crawl complete for project ${projectId} at ${crawledAt.toISOString()}`,
          );

          const signalsStartedAt = Date.now();
          const signals = await this.deoSignalsService.collectSignalsForProject(projectId);
          console.log(
            `[CrawlProcessor] Signals computed for project ${projectId} in ${
              Date.now() - signalsStartedAt
            }ms`,
          );

          const recomputeStartedAt = Date.now();
          const snapshot = await this.deoScoreService.computeAndPersistScoreFromSignals(
            projectId,
            signals,
          );
          console.log(
            `[CrawlProcessor] DEO recompute complete for project ${projectId} (snapshot ${
              snapshot.id
            }, overall=${snapshot.breakdown.overall}) in ${Date.now() - recomputeStartedAt}ms`,
          );

          console.log(
            `[CrawlProcessor] Crawl + DEO pipeline for project ${projectId} completed in ${
              Date.now() - jobStartedAt
            }ms`,
          );
        } catch (error) {
          console.error(
            `[CrawlProcessor] Failed to crawl project ${projectId}`,
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
