import { Module } from '@nestjs/common';
import { SeoScanController } from './seo-scan.controller';
import { SeoScanService } from './seo-scan.service';
import { PrismaService } from '../prisma.service';
import { DeoScoreService, DeoSignalsService } from '../projects/deo-score.service';

@Module({
  controllers: [SeoScanController],
  providers: [SeoScanService, PrismaService, DeoScoreService, DeoSignalsService],
  exports: [SeoScanService],
})
export class SeoScanModule {}
