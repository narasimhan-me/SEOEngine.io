import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SeoScanModule } from '../seo-scan/seo-scan.module';
import {
  DeoScoreService,
  DeoSignalsService,
} from '../projects/deo-score.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { CrawlProcessor } from './crawl.processor';
import { CrawlController } from './crawl.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [SeoScanModule, ProjectsModule],
  controllers: [CrawlController],
  providers: [
    CrawlSchedulerService,
    CrawlProcessor,
    PrismaService,
    DeoScoreService,
    DeoSignalsService,
  ],
})
export class CrawlModule {}
