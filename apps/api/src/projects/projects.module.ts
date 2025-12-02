import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma.service';
import { DeoScoreService } from './deo-score.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, PrismaService, DeoScoreService],
  exports: [ProjectsService, DeoScoreService],
})
export class ProjectsModule {}
