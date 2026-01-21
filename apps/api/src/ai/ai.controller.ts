import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { AnswerEngineService } from '../projects/answer-engine.service';
import { ProductAnswersResponse } from '@engineo/shared';
import { ProductIssueFixService } from './product-issue-fix.service';
import {
  TokenUsageService,
  ESTIMATED_METADATA_TOKENS_PER_CALL,
} from './token-usage.service';
import {
  AiUsageLedgerService,
  AiUsageProjectSummary,
  AiUsageRunSummary,
  AiUsageRunType,
} from './ai-usage-ledger.service';
import {
  AiUsageQuotaAction,
  AiUsageQuotaEvaluation,
  AiUsageQuotaService,
} from './ai-usage-quota.service';
import { RoleResolutionService } from '../common/role-resolution.service';

class MetadataDto {
  crawlResultId: string;
  targetKeywords?: string[];
}

class ProductMetadataDto {
  productId: string;
  targetKeywords?: string[];
}

class ProductAnswersDto {
  productId: string;
}

/**
 * [ROLES-3 FIXUP-4] AI Controller with membership-aware access control:
 * - Draft generation endpoints (POST): OWNER/EDITOR only (assertCanGenerateDrafts)
 * - AI usage read endpoints (GET): any ProjectMember can view (assertProjectAccess)
 */
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService,
    private readonly answerEngineService: AnswerEngineService,
    private readonly productIssueFixService: ProductIssueFixService,
    private readonly tokenUsageService: TokenUsageService,
    private readonly aiUsageLedgerService: AiUsageLedgerService,
    private readonly aiUsageQuotaService: AiUsageQuotaService,
    private readonly roleResolution: RoleResolutionService
  ) {}

  @Post('metadata')
  async suggestMetadata(@Request() req: any, @Body() dto: MetadataDto) {
    const userId = req.user.id;

    // Load crawl result
    const crawlResult = await this.prisma.crawlResult.findUnique({
      where: { id: dto.crawlResultId },
      include: {
        project: true,
      },
    });

    if (!crawlResult) {
      throw new BadRequestException('Crawl result not found');
    }

    // [ROLES-3 FIXUP-4] OWNER/EDITOR only for draft generation
    await this.roleResolution.assertCanGenerateDrafts(
      crawlResult.projectId,
      userId
    );

    // Generate AI suggestions
    const suggestions = await this.aiService.generateMetadata({
      url: crawlResult.url,
      currentTitle: crawlResult.title || undefined,
      currentDescription: crawlResult.metaDescription || undefined,
      h1: crawlResult.h1 || undefined,
      targetKeywords: dto.targetKeywords,
    });

    return {
      crawlResultId: dto.crawlResultId,
      url: crawlResult.url,
      current: {
        title: crawlResult.title,
        description: crawlResult.metaDescription,
      },
      suggested: {
        title: suggestions.title,
        description: suggestions.description,
      },
    };
  }

  /**
   * POST /ai/product-metadata
   * Generate AI SEO suggestions for a product
   * [ROLES-3 FIXUP-4] OWNER/EDITOR only for draft generation
   */
  @Post('product-metadata')
  async suggestProductMetadata(
    @Request() req: any,
    @Body() dto: ProductMetadataDto
  ) {
    const userId = req.user.id;

    // Load product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // [ROLES-3 FIXUP-4] OWNER/EDITOR only for draft generation
    await this.roleResolution.assertCanGenerateDrafts(
      product.projectId,
      userId
    );

    // Enforce daily AI suggestion limit before calling provider
    const { planId, limit, dailyCount } =
      await this.entitlementsService.ensureWithinDailyAiLimit(
        userId,
        product.projectId,
        'product_optimize'
      );

    // eslint-disable-next-line no-console
    console.log('[AI][ProductOptimize] ai.optimize.started', {
      userId,
      projectId: product.projectId,
      productId: dto.productId,
      planId,
      limit,
      dailyCount,
    });

    let providerCalled = false;
    let recordedUsage = false;

    try {
      providerCalled = true;

      // Generate AI suggestions based on product data
      const suggestions = await this.aiService.generateMetadata({
        url: `Product: ${product.title}`,
        currentTitle: product.seoTitle || product.title,
        currentDescription:
          product.seoDescription || product.description || undefined,
        pageTextSnippet: product.description || undefined,
        targetKeywords: dto.targetKeywords,
      });

      const hasUsableSuggestion =
        !!(suggestions.title && suggestions.title.trim()) ||
        !!(suggestions.description && suggestions.description.trim());

      await this.entitlementsService.recordAiUsage(
        userId,
        product.projectId,
        'product_optimize'
      );
      recordedUsage = true;
      await this.tokenUsageService.log(
        userId,
        ESTIMATED_METADATA_TOKENS_PER_CALL,
        'manual:product_optimize'
      );

      // Basic observability for Optimize feature
      // eslint-disable-next-line no-console
      console.log('[AI][ProductOptimize] ai.optimize.success', {
        userId,
        projectId: product.projectId,
        productId: dto.productId,
        planId,
        limit,
        dailyCount: dailyCount + 1,
        hasUsableSuggestion,
      });

      return {
        productId: dto.productId,
        current: {
          title: product.seoTitle || product.title,
          description: product.seoDescription || product.description,
        },
        suggested: {
          title: suggestions.title,
          description: suggestions.description,
        },
      };
    } catch (error) {
      if (providerCalled && !recordedUsage) {
        await this.entitlementsService.recordAiUsage(
          userId,
          product.projectId,
          'product_optimize'
        );
        recordedUsage = true;
        await this.tokenUsageService.log(
          userId,
          ESTIMATED_METADATA_TOKENS_PER_CALL,
          'manual:product_optimize'
        );
      }

      // eslint-disable-next-line no-console
      console.error('[AI][ProductOptimize] ai.optimize.failed', {
        userId,
        projectId: product.projectId,
        productId: dto.productId,
        planId,
        limit,
        dailyCount: dailyCount + (providerCalled ? 1 : 0),
        error,
      });
      throw error;
    }
  }

  /**
   * POST /ai/product-metadata/fix-from-issue
   *
   * One-click AI fix for Issue Engine Lite metadata issues:
   * - missing_seo_title
   * - missing_seo_description
   *
   * Validates ownership, enforces entitlements and daily AI limits via EntitlementsService,
   * and persists the generated SEO field on the targeted product.
   */
  @Post('product-metadata/fix-from-issue')
  async fixProductMetadataFromIssue(
    @Request() req: any,
    @Body()
    dto: {
      productId: string;
      issueType: 'missing_seo_title' | 'missing_seo_description';
    }
  ) {
    const userId = req.user.id;

    if (!dto.productId || !dto.issueType) {
      throw new BadRequestException('productId and issueType are required');
    }

    return this.productIssueFixService.fixMissingSeoFieldFromIssue({
      userId,
      productId: dto.productId,
      issueType: dto.issueType,
    });
  }

  /**
   * POST /ai/product-answers
   * Generate AI Answer Blocks for a product (Phase AE-1.2)
   *
   * Uses existing product data to generate factual, structured answers
   * to the 10 canonical buyer/AI questions. Answers are ephemeral (not persisted).
   * [ROLES-3 FIXUP-4] OWNER/EDITOR only for draft generation
   */
  @Post('product-answers')
  async generateProductAnswers(
    @Request() req: any,
    @Body() dto: ProductAnswersDto
  ): Promise<ProductAnswersResponse> {
    const userId = req.user.id;

    // Load product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // [ROLES-3 FIXUP-4] OWNER/EDITOR only for draft generation
    await this.roleResolution.assertCanGenerateDrafts(
      product.projectId,
      userId
    );

    // Enforce daily AI limit before calling provider
    const { planId, limit, dailyCount } =
      await this.entitlementsService.ensureWithinDailyAiLimit(
        userId,
        product.projectId,
        'product_answers'
      );

    // eslint-disable-next-line no-console
    console.log('[AI][ProductAnswers] ai.answers.started', {
      userId,
      projectId: product.projectId,
      productId: dto.productId,
      planId,
      limit,
      dailyCount,
    });

    let providerCalled = false;
    let recordedUsage = false;

    try {
      // Get answerability detection from AnswerEngineService
      const answerabilityStatus =
        this.answerEngineService.computeAnswerabilityForProduct({
          id: product.id,
          title: product.title,
          description: product.description,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
        });

      providerCalled = true;

      // Generate AI answers
      const answers = await this.aiService.generateProductAnswers(
        {
          id: product.id,
          projectId: product.projectId,
          title: product.title,
          description: product.description,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
        },
        answerabilityStatus
      );

      await this.entitlementsService.recordAiUsage(
        userId,
        product.projectId,
        'product_answers'
      );
      recordedUsage = true;

      // eslint-disable-next-line no-console
      console.log('[AI][ProductAnswers] ai.answers.success', {
        userId,
        projectId: product.projectId,
        productId: dto.productId,
        planId,
        limit,
        dailyCount: dailyCount + 1,
        answersGenerated: answers.length,
      });

      return {
        projectId: product.projectId,
        productId: product.id,
        generatedAt: new Date().toISOString(),
        answerabilityStatus,
        answers,
      };
    } catch (error) {
      if (providerCalled && !recordedUsage) {
        await this.entitlementsService.recordAiUsage(
          userId,
          product.projectId,
          'product_answers'
        );
        recordedUsage = true;
      }

      // eslint-disable-next-line no-console
      console.error('[AI][ProductAnswers] ai.answers.failed', {
        userId,
        projectId: product.projectId,
        productId: dto.productId,
        planId,
        limit,
        dailyCount: dailyCount + (providerCalled ? 1 : 0),
        error,
      });
      throw error;
    }
  }

  // ============================================================
  // AI Usage Ledger Endpoints (AI-USAGE-1)
  // ============================================================

  /**
   * GET /ai/projects/:projectId/usage/summary
   * Get AI usage summary for the current billing month.
   * [ROLES-3 FIXUP-4] All ProjectMembers can view (assertProjectAccess)
   */
  @Get('projects/:projectId/usage/summary')
  async getProjectAiUsageSummary(
    @Request() req: any,
    @Param('projectId') projectId: string
  ): Promise<AiUsageProjectSummary> {
    const userId = req.user.id;

    // [ROLES-3 FIXUP-4] Any ProjectMember can view AI usage
    await this.roleResolution.assertProjectAccess(projectId, userId);

    // Get current month range
    const now = new Date();
    const periodStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    return this.aiUsageLedgerService.getProjectSummary(projectId, {
      from: periodStart,
      to: periodEnd,
    });
  }

  /**
   * GET /ai/projects/:projectId/usage/runs
   * List recent AI usage runs for a project.
   * [ROLES-3 FIXUP-4] All ProjectMembers can view (assertProjectAccess)
   */
  @Get('projects/:projectId/usage/runs')
  async listProjectAiUsageRuns(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Query('runType') runType?: string,
    @Query('limit') limit?: string
  ): Promise<AiUsageRunSummary[]> {
    const userId = req.user.id;

    // [ROLES-3 FIXUP-4] Any ProjectMember can view AI usage
    await this.roleResolution.assertProjectAccess(projectId, userId);

    return this.aiUsageLedgerService.getProjectRunSummaries(projectId, {
      runType: runType as AiUsageRunType | undefined,
      limit: limit ? Number(limit) : 20,
    });
  }

  /**
   * GET /ai/projects/:projectId/usage/quota
   * Evaluate AI usage quota for a given action (PREVIEW_GENERATE, DRAFT_GENERATE).
   * This endpoint is used by the frontend predictive guard to "predict before prevent":
   * - Soft warnings when near the monthly quota
   * - Hard blocking (when enabled) once the monthly limit is exceeded
   * [ROLES-3 FIXUP-4] All ProjectMembers can view (assertProjectAccess)
   */
  @Get('projects/:projectId/usage/quota')
  async evaluateProjectAiUsageQuota(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Query('action') action?: string
  ): Promise<AiUsageQuotaEvaluation> {
    const userId = req.user.id;

    // [ROLES-3 FIXUP-4] Any ProjectMember can view AI usage quota
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const normalizedAction: AiUsageQuotaAction =
      (action as AiUsageQuotaAction) || 'PREVIEW_GENERATE';

    return this.aiUsageQuotaService.evaluateQuotaForAction({
      userId,
      projectId,
      action: normalizedAction,
    });
  }
}
