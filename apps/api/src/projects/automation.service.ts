import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AutomationIssueType,
  AutomationTargetType,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';

const AUTOMATION_SOURCE = 'automation_v1';

interface AutomationSuggestionJobContext {
  projectId: string;
  targetType: AutomationTargetType;
  targetId: string;
  issueType: AutomationIssueType;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Schedule background suggestions for a project after crawl + DEO recompute.
   * This runs synchronously in v1 but is bounded by a per-project daily cap.
   */
  async scheduleSuggestionsForProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      this.logger.warn(
        `[Automation] Project ${projectId} not found; skipping automation.`,
      );
      return;
    }

    const autoMissing = project.autoSuggestMissingMetadata ?? false;
    const autoThin = project.autoSuggestThinContent ?? false;

    if (!autoMissing && !autoThin) {
      return;
    }

    const dailyCap = project.autoSuggestDailyCap ?? 50;
    if (dailyCap <= 0) {
      return;
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const generatedToday = await this.prisma.automationSuggestion.count({
      where: {
        projectId,
        generatedAt: {
          gte: startOfDay,
        },
      },
    });

    if (generatedToday >= dailyCap) {
      this.logger.log(
        `[Automation] Project ${projectId} reached daily cap (${generatedToday}/${dailyCap}), skipping automation.`,
      );
      return;
    }

    const remainingCap = dailyCap - generatedToday;

    const existing = await this.prisma.automationSuggestion.findMany({
      where: { projectId },
      select: {
        targetType: true,
        targetId: true,
        issueType: true,
      },
    });

    const existingKeys = new Set(
      existing.map(
        (s) => `${s.targetType}:${s.targetId}:${s.issueType}`,
      ),
    );

    let remaining = remainingCap;

    if (autoMissing && remaining > 0) {
      remaining = await this.generateMissingMetadataSuggestions(
        projectId,
        existingKeys,
        remaining,
      );
    }

    if (autoThin && remaining > 0) {
      remaining = await this.generateThinContentSuggestions(
        projectId,
        existingKeys,
        remaining,
      );
    }

    if (remainingCap !== remaining) {
      this.logger.log(
        `[Automation] Generated ${remainingCap - remaining} suggestion(s) for project ${projectId} (cap ${dailyCap}).`,
      );
    }
  }

  private async generateMissingMetadataSuggestions(
    projectId: string,
    existingKeys: Set<string>,
    slotsLeft: number,
  ): Promise<number> {
    if (slotsLeft <= 0) return slotsLeft;

    // Products with missing metadata
    const productCandidates = await this.prisma.product.findMany({
      where: {
        projectId,
        OR: [{ seoTitle: null }, { seoDescription: null }],
      },
      select: { id: true },
      take: slotsLeft * 3,
    });

    for (const product of productCandidates) {
      if (slotsLeft <= 0) break;
      const key = `${AutomationTargetType.PRODUCT}:${product.id}:${AutomationIssueType.MISSING_METADATA}`;
      if (existingKeys.has(key)) continue;

      await this.createProductSuggestion({
        projectId,
        targetType: AutomationTargetType.PRODUCT,
        targetId: product.id,
        issueType: AutomationIssueType.MISSING_METADATA,
      });
      existingKeys.add(key);
      slotsLeft--;
    }

    if (slotsLeft <= 0) {
      return slotsLeft;
    }

    // Pages with missing metadata
    const pageCandidates = await this.prisma.crawlResult.findMany({
      where: {
        projectId,
        OR: [{ title: null }, { metaDescription: null }],
      },
      select: { id: true },
      take: slotsLeft * 3,
    });

    for (const page of pageCandidates) {
      if (slotsLeft <= 0) break;
      const key = `${AutomationTargetType.PAGE}:${page.id}:${AutomationIssueType.MISSING_METADATA}`;
      if (existingKeys.has(key)) continue;

      await this.createPageSuggestion({
        projectId,
        targetType: AutomationTargetType.PAGE,
        targetId: page.id,
        issueType: AutomationIssueType.MISSING_METADATA,
      });
      existingKeys.add(key);
      slotsLeft--;
    }

    return slotsLeft;
  }

  private async generateThinContentSuggestions(
    projectId: string,
    existingKeys: Set<string>,
    slotsLeft: number,
  ): Promise<number> {
    if (slotsLeft <= 0) return slotsLeft;

    // Thin pages based on wordCount < 200
    const pageCandidates = await this.prisma.crawlResult.findMany({
      where: {
        projectId,
        wordCount: {
          lt: 200,
        },
      },
      select: { id: true },
      take: slotsLeft * 3,
    });

    for (const page of pageCandidates) {
      if (slotsLeft <= 0) break;
      const key = `${AutomationTargetType.PAGE}:${page.id}:${AutomationIssueType.THIN_CONTENT}`;
      if (existingKeys.has(key)) continue;

      await this.createPageSuggestion({
        projectId,
        targetType: AutomationTargetType.PAGE,
        targetId: page.id,
        issueType: AutomationIssueType.THIN_CONTENT,
      });
      existingKeys.add(key);
      slotsLeft--;
    }

    if (slotsLeft <= 0) {
      return slotsLeft;
    }

    // Thin products based on description word count < 80
    const productCandidates = await this.prisma.product.findMany({
      where: { projectId },
      select: {
        id: true,
        description: true,
        seoDescription: true,
      },
      take: slotsLeft * 5,
    });

    for (const product of productCandidates) {
      if (slotsLeft <= 0) break;

      const rawDesc =
        (product.seoDescription ?? product.description ?? '')?.toString() || '';
      const wordCount = rawDesc
        ? rawDesc.split(/\s+/).filter(Boolean).length
        : 0;

      if (wordCount >= 80) continue;

      const key = `${AutomationTargetType.PRODUCT}:${product.id}:${AutomationIssueType.THIN_CONTENT}`;
      if (existingKeys.has(key)) continue;

      await this.createProductSuggestion({
        projectId,
        targetType: AutomationTargetType.PRODUCT,
        targetId: product.id,
        issueType: AutomationIssueType.THIN_CONTENT,
      });
      existingKeys.add(key);
      slotsLeft--;
    }

    return slotsLeft;
  }

  private async createProductSuggestion(
    ctx: AutomationSuggestionJobContext,
  ): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: ctx.targetId },
    });

    if (!product) {
      this.logger.warn(
        `[Automation] Product ${ctx.targetId} not found for project ${ctx.projectId}, skipping suggestion.`,
      );
      return;
    }

    const descriptionText =
      (product.seoDescription ?? product.description ?? '')?.toString() || '';

    const metadata = await this.aiService.generateMetadata({
      url: product.externalId ?? product.id,
      currentTitle: (product.seoTitle ?? product.title ?? '').toString(),
      currentDescription: descriptionText,
      pageTextSnippet: descriptionText.slice(0, 800),
    });

    await this.prisma.automationSuggestion.upsert({
      where: {
        projectId_targetType_targetId_issueType: {
          projectId: ctx.projectId,
          targetType: AutomationTargetType.PRODUCT,
          targetId: ctx.targetId,
          issueType: ctx.issueType,
        },
      },
      update: {
        suggestedTitle: metadata.title,
        suggestedDescription: metadata.description,
        generatedAt: new Date(),
        source: AUTOMATION_SOURCE,
        applied: false,
      },
      create: {
        projectId: ctx.projectId,
        targetType: AutomationTargetType.PRODUCT,
        targetId: ctx.targetId,
        issueType: ctx.issueType,
        suggestedTitle: metadata.title,
        suggestedDescription: metadata.description,
        suggestedH1: null,
        source: AUTOMATION_SOURCE,
        applied: false,
      },
    });
  }

  private async createPageSuggestion(
    ctx: AutomationSuggestionJobContext,
  ): Promise<void> {
    const page = await this.prisma.crawlResult.findFirst({
      where: {
        id: ctx.targetId,
        projectId: ctx.projectId,
      },
    });

    if (!page) {
      this.logger.warn(
        `[Automation] CrawlResult ${ctx.targetId} not found for project ${ctx.projectId}, skipping suggestion.`,
      );
      return;
    }

    const metadata = await this.aiService.generateMetadata({
      url: page.url,
      currentTitle: page.title ?? undefined,
      currentDescription: page.metaDescription ?? undefined,
      pageTextSnippet: '',
      h1: page.h1 ?? undefined,
    });

    await this.prisma.automationSuggestion.upsert({
      where: {
        projectId_targetType_targetId_issueType: {
          projectId: ctx.projectId,
          targetType: AutomationTargetType.PAGE,
          targetId: ctx.targetId,
          issueType: ctx.issueType,
        },
      },
      update: {
        suggestedTitle: metadata.title,
        suggestedDescription: metadata.description,
        generatedAt: new Date(),
        source: AUTOMATION_SOURCE,
        applied: false,
      },
      create: {
        projectId: ctx.projectId,
        targetType: AutomationTargetType.PAGE,
        targetId: ctx.targetId,
        issueType: ctx.issueType,
        suggestedTitle: metadata.title,
        suggestedDescription: metadata.description,
        suggestedH1: null,
        source: AUTOMATION_SOURCE,
        applied: false,
      },
    });
  }

  async getSuggestionsForProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const suggestions = await this.prisma.automationSuggestion.findMany({
      where: { projectId },
      orderBy: { generatedAt: 'desc' },
    });

    return {
      projectId,
      suggestions: suggestions.map((s) => ({
        id: s.id,
        projectId: s.projectId,
        targetType:
          s.targetType === AutomationTargetType.PRODUCT ? 'product' : 'page',
        targetId: s.targetId,
        issueType:
          s.issueType === AutomationIssueType.MISSING_METADATA
            ? 'missing_metadata'
            : 'thin_content',
        suggestedTitle: s.suggestedTitle,
        suggestedDescription: s.suggestedDescription,
        suggestedH1: s.suggestedH1,
        generatedAt: s.generatedAt.toISOString(),
        source: s.source,
        applied: s.applied,
      })),
    };
  }
}
