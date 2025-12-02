import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  DeoScoreBreakdown,
  DeoScoreLatestResponse,
  DeoScoreSnapshot as DeoScoreSnapshotDto,
} from '@engineo/shared';

@Injectable()
export class DeoScoreService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the latest DEO score snapshot for a project,
   * with ownership validation.
   */
  async getLatestForProject(projectId: string, userId: string): Promise<DeoScoreLatestResponse> {
    const prisma = this.prisma as any;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const snapshot = await prisma.deoScoreSnapshot.findFirst({
      where: { projectId },
      orderBy: { computedAt: 'desc' },
    });

    if (!snapshot) {
      return {
        projectId,
        latestScore: null,
        latestSnapshot: null,
      };
    }

    const breakdown: DeoScoreBreakdown = {
      overall: snapshot.overallScore,
      content: snapshot.contentScore,
      entities: snapshot.entityScore,
      technical: snapshot.technicalScore,
      visibility: snapshot.visibilityScore,
    };

    const latestSnapshot: DeoScoreSnapshotDto = {
      id: snapshot.id,
      projectId,
      version: snapshot.version,
      computedAt: snapshot.computedAt.toISOString(),
      breakdown,
      metadata: (snapshot.metadata as Record<string, unknown> | null) ?? undefined,
    };

    return {
      projectId,
      latestScore: breakdown,
      latestSnapshot,
    };
  }

  /**
   * Placeholder entry point for future DEO score computation.
   *
   * For now, this creates a simple snapshot with a fixed overall score
   * and updates the denormalized current_deo_score fields on Project.
   */
  async createPlaceholderSnapshotForProject(
    projectId: string,
    userId: string,
  ): Promise<DeoScoreSnapshotDto> {
    const prisma = this.prisma as any;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const overall = 50; // Placeholder score until real DEO computation is implemented
    const now = new Date();

    const created = await prisma.deoScoreSnapshot.create({
      data: {
        projectId,
        overallScore: overall,
        contentScore: null,
        entityScore: null,
        technicalScore: null,
        visibilityScore: null,
        version: 'v1',
        metadata: {},
        computedAt: now,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        currentDeoScore: overall,
        currentDeoScoreComputedAt: now,
      },
    });

    const breakdown: DeoScoreBreakdown = {
      overall,
      content: created.contentScore,
      entities: created.entityScore,
      technical: created.technicalScore,
      visibility: created.visibilityScore,
    };

    return {
      id: created.id,
      projectId,
      version: created.version,
      computedAt: created.computedAt.toISOString(),
      breakdown,
      metadata: (created.metadata as Record<string, unknown> | null) ?? undefined,
    };
  }
}
