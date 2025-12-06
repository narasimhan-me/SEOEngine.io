import { Module } from '@nestjs/common';
import { SeoScanController } from './seo-scan.controller';
import { SeoScanService } from './seo-scan.service';
import { PrismaService } from '../prisma.service';
import { DeoScoreService, DeoSignalsService } from '../projects/deo-score.service';
import { AutomationService } from '../projects/automation.service';
import { AiService } from '../ai/ai.service';

@Module({
  controllers: [SeoScanController],
  providers: [SeoScanService, PrismaService, DeoScoreService, DeoSignalsService, AutomationService, AiService],
  exports: [SeoScanService],
})
export class SeoScanModule {}
