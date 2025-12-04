import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { SeoScanService } from '../seo-scan/seo-scan.service';
import { DeoScoreService, DeoSignalsService } from '../projects/deo-score.service';
import { crawlQueue } from '../queues/queues';

@Injectable()
export class CrawlSchedulerService {
  private readonly logger = new Logger(CrawlSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seoScanService: SeoScanService,
    private readonly deoSignalsService: DeoSignalsService,
    private readonly deoScoreService: DeoScoreService,
  ) {}

  private shouldUseQueue(): boolean {
    const isLocalDev = process.env.IS_LOCAL_DEV === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    return isProduction && !isLocalDev && !!crawlQueue;
  }

  @Cron('0 2 * * *')
  async scheduleProjectCrawls() {
    const projects = await this.prisma.project.findMany({
      select: { id: true },
    });

    const useQueue = this.shouldUseQueue();
    const mode = useQueue ? 'queue' : 'sync';

    this.logger.log(
      `[CrawlScheduler] Starting nightly crawl for ${projects.length} projects (mode=${mode})`,
    );

    for (const project of projects) {
      if (useQueue) {
        try {
          await crawlQueue!.add('project_crawl', { projectId: project.id });
        } catch (error) {
          this.logger.error(
            `[CrawlScheduler] Failed to enqueue crawl for project ${project.id}`,
            error as Error,
          );
        }
      } else {
        try {
          const jobStartedAt = Date.now();
          const crawledAt = await this.seoScanService.runFullProjectCrawl(project.id);

          if (!crawledAt) {
            this.logger.warn(
              `[CrawlScheduler] Skipped crawl for project ${project.id} (no domain or project not found)`,
            );
            continue;
          }

          await this.prisma.project.update({
            where: { id: project.id },
            data: {
              lastCrawledAt: crawledAt,
            },
          });

          this.logger.log(
            `[CrawlScheduler] Crawl complete for project ${project.id} at ${crawledAt.toISOString()}`,
          );

          const signalsStartedAt = Date.now();
          const signals = await this.deoSignalsService.collectSignalsForProject(project.id);
          this.logger.log(
            `[CrawlScheduler] Signals computed for project ${project.id} in ${
              Date.now() - signalsStartedAt
            }ms`,
          );

          const recomputeStartedAt = Date.now();
          const snapshot = await this.deoScoreService.computeAndPersistScoreFromSignals(
            project.id,
            signals,
          );
          this.logger.log(
            `[CrawlScheduler] DEO recompute complete for project ${project.id} (snapshot ${
              snapshot.id
            }, overall=${snapshot.breakdown.overall}) in ${Date.now() - recomputeStartedAt}ms`,
          );

          this.logger.log(
            `[CrawlScheduler] Crawl + DEO pipeline for project ${project.id} completed in ${
              Date.now() - jobStartedAt
            }ms`,
          );
        } catch (error) {
          this.logger.error(
            `[CrawlScheduler] Failed to run sync crawl for project ${project.id}`,
            error as Error,
          );
        }
      }
    }
  }
}
