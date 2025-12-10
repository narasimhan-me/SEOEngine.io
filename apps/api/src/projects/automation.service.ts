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
import { EntitlementsService } from '../billing/entitlements.service';
import { answerBlockAutomationQueue } from '../queues/queues';
import { PlanId } from '../billing/plans';

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
    private readonly entitlementsService: EntitlementsService,
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

    const projectDailyCap = project.autoSuggestDailyCap ?? 50;

    const entitlements = await this.entitlementsService.getEntitlementsSummary(
      project.userId,
    );
    const planLimit = entitlements.limits.automationSuggestionsPerDay;

    let effectiveDailyCap = projectDailyCap;
    if (planLimit !== -1) {
      effectiveDailyCap = Math.min(projectDailyCap, planLimit);
    }

    if (effectiveDailyCap <= 0) {
      return;
    }

    const now = new Date();
    // Use UTC for consistent daily reset behavior across timezones
    const startOfDayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));

    const generatedToday = await this.prisma.automationSuggestion.count({
      where: {
        projectId,
        generatedAt: {
          gte: startOfDayUTC,
        },
      },
    });

    if (generatedToday >= effectiveDailyCap) {
      this.logger.log(
        `[Automation] Project ${projectId} reached daily suggestion cap (${generatedToday}/${effectiveDailyCap}), skipping automation.`,
      );
      return;
    }

    const remainingCap = effectiveDailyCap - generatedToday;

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
        `[Automation] Generated ${remainingCap - remaining} suggestion(s) for project ${projectId} (cap ${effectiveDailyCap}).`,
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

  /**
   * Check if auto-apply is allowed for a given project and issue type.
   * Returns true only when:
   * - The plan allows auto-apply (Pro/Business)
   * - The issue type is MISSING_METADATA (not THIN_CONTENT for AE-2.1)
   */
  private async shouldAutoApplyMetadataForProject(
    projectId: string,
    issueType: AutomationIssueType,
  ): Promise<boolean> {
    // Only auto-apply for MISSING_METADATA in AE-2.1
    if (issueType !== AutomationIssueType.MISSING_METADATA) {
      return false;
    }

    // Load project to get userId
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      return false;
    }

    // Check entitlements
    return this.entitlementsService.canAutoApplyMetadataAutomations(project.userId);
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

    // Upsert the suggestion first
    const suggestion = await this.prisma.automationSuggestion.upsert({
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
        appliedAt: null,
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
        appliedAt: null,
      },
    });

    // Check if we should auto-apply
    const shouldAutoApply = await this.shouldAutoApplyMetadataForProject(
      ctx.projectId,
      ctx.issueType,
    );

    if (shouldAutoApply && ctx.issueType === AutomationIssueType.MISSING_METADATA) {
      // Only auto-apply if the product's fields are currently empty
      const titleIsMissing = !product.seoTitle || product.seoTitle.trim() === '';
      const descriptionIsMissing = !product.seoDescription || product.seoDescription.trim() === '';

      const suggestedTitleValid = metadata.title && metadata.title.trim() !== '';
      const suggestedDescriptionValid = metadata.description && metadata.description.trim() !== '';

      // Only apply if at least one field needs updating and we have valid suggestions
      if ((titleIsMissing && suggestedTitleValid) || (descriptionIsMissing && suggestedDescriptionValid)) {
        const updateData: { seoTitle?: string; seoDescription?: string; lastSyncedAt: Date } = {
          lastSyncedAt: new Date(),
        };

        if (titleIsMissing && suggestedTitleValid) {
          updateData.seoTitle = metadata.title;
        }
        if (descriptionIsMissing && suggestedDescriptionValid) {
          updateData.seoDescription = metadata.description;
        }

        // Update the product
        await this.prisma.product.update({
          where: { id: ctx.targetId },
          data: updateData,
        });

        // Mark the suggestion as applied
        await this.prisma.automationSuggestion.update({
          where: { id: suggestion.id },
          data: {
            applied: true,
            appliedAt: new Date(),
          },
        });

        this.logger.log(
          `[Automation] Auto-applied metadata suggestion for product ${ctx.targetId} (missing_metadata)`,
        );
      }
    }
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

  /**
   * AUTO_GENERATE_METADATA_ON_NEW_PRODUCT rule
   *
   * Triggered immediately when a new product is synced from Shopify.
   * Generates SEO title/description if missing, respecting entitlements.
   *
   * @param projectId - The project ID
   * @param productId - The newly created product ID
   * @param userId - The user ID (owner of the project)
   */
  async runNewProductSeoTitleAutomation(
    projectId: string,
    productId: string,
    userId: string,
  ): Promise<void> {
    // Check entitlements - ensure user is within daily AI limit
    try {
      await this.entitlementsService.ensureWithinDailyAiLimit(
        userId,
        projectId,
        'automation_new_product',
      );
    } catch {
      this.logger.log(
        `[Automation] Skipping new product automation for ${productId}: daily AI limit reached`,
      );
      return;
    }

    // Load the product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      this.logger.warn(
        `[Automation] Product ${productId} not found for automation`,
      );
      return;
    }

    // Only run if SEO fields are missing
    const titleIsMissing = !product.seoTitle || product.seoTitle.trim() === '';
    const descriptionIsMissing = !product.seoDescription || product.seoDescription.trim() === '';

    if (!titleIsMissing && !descriptionIsMissing) {
      this.logger.log(
        `[Automation] Skipping new product automation for ${productId}: SEO fields already populated`,
      );
      return;
    }

    // Generate metadata using AI
    const descriptionText =
      (product.seoDescription ?? product.description ?? '')?.toString() || '';

    const metadata = await this.aiService.generateMetadata({
      url: product.externalId ?? product.id,
      currentTitle: (product.seoTitle ?? product.title ?? '').toString(),
      currentDescription: descriptionText,
      pageTextSnippet: descriptionText.slice(0, 800),
    });

    // Record AI usage
    await this.entitlementsService.recordAiUsage(
      userId,
      projectId,
      'automation_new_product',
    );

    // Create the automation suggestion
    const suggestion = await this.prisma.automationSuggestion.upsert({
      where: {
        projectId_targetType_targetId_issueType: {
          projectId,
          targetType: AutomationTargetType.PRODUCT,
          targetId: productId,
          issueType: AutomationIssueType.MISSING_METADATA,
        },
      },
      update: {
        suggestedTitle: metadata.title,
        suggestedDescription: metadata.description,
        generatedAt: new Date(),
        source: 'automation_new_product_v1',
        applied: false,
        appliedAt: null,
      },
      create: {
        projectId,
        targetType: AutomationTargetType.PRODUCT,
        targetId: productId,
        issueType: AutomationIssueType.MISSING_METADATA,
        suggestedTitle: metadata.title,
        suggestedDescription: metadata.description,
        suggestedH1: null,
        source: 'automation_new_product_v1',
        applied: false,
        appliedAt: null,
      },
    });

    // Check if we should auto-apply (Pro/Business plans only)
    const shouldAutoApply = await this.entitlementsService.canAutoApplyMetadataAutomations(userId);

    if (shouldAutoApply) {
      const suggestedTitleValid = metadata.title && metadata.title.trim() !== '';
      const suggestedDescriptionValid = metadata.description && metadata.description.trim() !== '';

      // Only apply if at least one field needs updating and we have valid suggestions
      if ((titleIsMissing && suggestedTitleValid) || (descriptionIsMissing && suggestedDescriptionValid)) {
        const updateData: { seoTitle?: string; seoDescription?: string; lastSyncedAt: Date } = {
          lastSyncedAt: new Date(),
        };

        if (titleIsMissing && suggestedTitleValid) {
          updateData.seoTitle = metadata.title;
        }
        if (descriptionIsMissing && suggestedDescriptionValid) {
          updateData.seoDescription = metadata.description;
        }

        // Update the product
        await this.prisma.product.update({
          where: { id: productId },
          data: updateData,
        });

        // Mark the suggestion as applied
        await this.prisma.automationSuggestion.update({
          where: { id: suggestion.id },
          data: {
            applied: true,
            appliedAt: new Date(),
          },
        });

        this.logger.log(
          `[Automation] Auto-applied metadata for new product ${productId} (AUTO_GENERATE_METADATA_ON_NEW_PRODUCT)`,
        );
      }
    } else {
      this.logger.log(
        `[Automation] Created suggestion for new product ${productId} (Free plan: manual apply required)`,
      );
    }
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
        appliedAt: s.appliedAt?.toISOString() ?? null,
      })),
    };
  }

  /**
   * Trigger Answer Block automation for a product based on a trigger type.
   * Enforces plan-level gating: Free plan does not run Answer Block automations.
   * Avoids duplicate work by skipping when a successful automation log exists
   * for the same product + trigger type.
   * Enqueues a job onto answer_block_automation_queue for Pro/Business plans
   * (Business may use higher priority).
   */
  async triggerAnswerBlockAutomationForProduct(
    productId: string,
    userId: string,
    triggerType: 'product_synced' | 'issue_detected',
  ): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      this.logger.warn(
        `[AnswerBlockAutomation] Product ${productId} not found; skipping trigger for ${triggerType}`,
      );
      return;
    }

    if (product.project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this product');
    }

    const planId: PlanId = await this.entitlementsService.getUserPlan(userId);

    // Free plan: log and exit (no Answer Block automations for Free tier)
    if (planId === 'free') {
      await this.prisma.answerBlockAutomationLog.create({
        data: {
          projectId: product.projectId,
          productId: product.id,
          triggerType,
          planId,
          action: 'skip_plan_free',
          status: 'skipped',
        },
      });
      return;
    }

    // Idempotency: skip if a successful automation for this product + trigger
    // already exists recently (no advanced time-window logic needed for v1).
    const recentSuccess = await this.prisma.answerBlockAutomationLog.findFirst({
      where: {
        productId: product.id,
        triggerType,
        status: 'succeeded',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentSuccess) {
      this.logger.log(
        `[AnswerBlockAutomation] Skipping duplicate automation for product ${productId} (trigger=${triggerType}) due to recent success`,
      );
      return;
    }

    if (!answerBlockAutomationQueue) {
      this.logger.warn(
        '[AnswerBlockAutomation] Queue not available (Redis disabled); skipping enqueue',
      );
      return;
    }

    const priority = planId === 'business' ? 1 : 5;

    await answerBlockAutomationQueue.add(
      'answer_block_automation',
      {
        projectId: product.projectId,
        productId: product.id,
        userId,
        triggerType,
        planId,
      },
      {
        priority,
      },
    );

    this.logger.log(
      `[AnswerBlockAutomation] Enqueued job for product ${product.id} (project ${product.projectId}, trigger=${triggerType}, plan=${planId})`,
    );
  }
}
