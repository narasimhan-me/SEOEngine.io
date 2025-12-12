import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { SeoScanService } from '../seo-scan/seo-scan.service';
import { DeoScoreService, DeoSignalsService } from '../projects/deo-score.service';
import { AutomationService } from '../projects/automation.service';
import { crawlQueue } from '../queues/queues';
import { CrawlFrequency } from '@prisma/client';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class CrawlSchedulerService {
  private readonly logger = new Logger(CrawlSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seoScanService: SeoScanService,
    private readonly deoSignalsService: DeoSignalsService,
    private readonly deoScoreService: DeoScoreService,
    private readonly automationService: AutomationService,
  ) {}

  private shouldUseQueue(): boolean {
    const isLocalDev = process.env.IS_LOCAL_DEV === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    return isProduction && !isLocalDev && !!crawlQueue;
  }

  private isProjectDueForCrawl(
    project: {
      lastCrawledAt: Date | null;
      autoCrawlEnabled: boolean | null;
      crawlFrequency: CrawlFrequency | null;
    },
    now: Date,
  ): boolean {
    const autoCrawlEnabled = project.autoCrawlEnabled ?? true;
    if (!autoCrawlEnabled) {
      return false;
    }

    if (!project.lastCrawledAt) {
      return true;
    }

    const diffDays = Math.floor(
      (now.getTime() - project.lastCrawledAt.getTime()) / MS_PER_DAY,
    );

    const frequency = project.crawlFrequency ?? CrawlFrequency.DAILY;
    const threshold =
      frequency === CrawlFrequency.DAILY
        ? 1
        : frequency === CrawlFrequency.WEEKLY
        ? 7
        : 30;

    return diffDays >= threshold;
  }

  @Cron('0 2 * * *')
  async scheduleProjectCrawls() {
    const nodeEnv = process.env.NODE_ENV ?? 'undefined';
    const redisPrefix = process.env.REDIS_PREFIX ?? 'engineo';
    const enableCron = process.env.ENABLE_CRON !== 'false';

    this.logger.log(
      `[CrawlScheduler] Cron flags: NODE_ENV=${nodeEnv}, REDIS_PREFIX=${redisPrefix}, ENABLE_CRON=${enableCron ? 'true' : 'false'}`,
    );

    if (!enableCron) {
      this.logger.log(
        '[CrawlScheduler] Cron disabled via ENABLE_CRON=false; skipping crawl scheduling tick.',
      );
      return;
    }

    const projects = await this.prisma.project.findMany({
      select: {
        id: true,
        lastCrawledAt: true,
        autoCrawlEnabled: true,
        crawlFrequency: true,
      },
    });

    const useQueue = this.shouldUseQueue();
    const mode = useQueue ? 'queue' : 'sync';
    const now = new Date();

    const dueProjects = projects.filter((project) =>
      this.isProjectDueForCrawl(project, now),
    );

    this.logger.log(
      `[CrawlScheduler] Nightly crawl: ${projects.length} projects evaluated, ${dueProjects.length} due for crawl (mode=${mode})`,
    );

    this.logger.log(
      `[CrawlScheduler] cron tick: enqueued ${dueProjects.length} jobs (mode=${mode})`,
    );

    if (dueProjects.length === 0) {
      return;
    }

    for (const project of dueProjects) {
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

          // Run automation suggestions after successful crawl + DEO
          const automationStartedAt = Date.now();
          await this.automationService.scheduleSuggestionsForProject(project.id);
          this.logger.log(
            `[CrawlScheduler] Automation suggestions scheduled for project ${project.id} in ${
              Date.now() - automationStartedAt
            }ms`,
          );

          this.logger.log(
            `[CrawlScheduler] Crawl + DEO + Automation pipeline for project ${project.id} completed in ${
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
