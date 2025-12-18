import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { CompetitorsService } from './competitors.service';
import { AiService } from '../ai/ai.service';
import {
  AiUsageQuotaService,
  AiUsageQuotaEvaluation,
} from '../ai/ai-usage-quota.service';
import { AiUsageLedgerService } from '../ai/ai-usage-ledger.service';
import {
  CompetitorGapType,
  CompetitiveCoverageAreaId,
  CompetitiveFixDraftType,
  CompetitiveFixApplyTarget,
  CompetitiveFixPreviewResponse,
  CompetitiveFixApplyResponse,
  ProductCompetitiveResponse,
  CompetitiveScorecard,
  computeCompetitiveFixWorkKey,
  getIntentTypeFromAreaId,
} from '@engineo/shared';
import type { SearchIntentType } from '@engineo/shared';
import {
  CompetitorGapType as PrismaGapType,
  CompetitiveFixDraftType as PrismaDraftType,
  CompetitiveFixApplyTarget as PrismaApplyTarget,
  SearchIntentType as PrismaSearchIntentType,
} from '@prisma/client';

/**
 * DTO for competitive fix preview request
 */
class CompetitiveFixPreviewDto {
  gapType: CompetitorGapType;
  intentType?: SearchIntentType;
  areaId: CompetitiveCoverageAreaId;
  draftType: CompetitiveFixDraftType;
}

/**
 * DTO for competitive fix apply request
 */
class CompetitiveFixApplyDto {
  draftId: string;
  applyTarget: CompetitiveFixApplyTarget;
}

/**
 * CompetitorsController
 *
 * REST endpoints for the Competitive Positioning pillar (COMPETITORS-1):
 * - GET  /products/:productId/competitors — Product competitive data
 * - POST /products/:productId/competitors/preview — Preview fix draft
 * - POST /products/:productId/competitors/apply — Apply fix draft
 * - GET  /projects/:projectId/competitors/scorecard — Project scorecard
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class CompetitorsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitorsService: CompetitorsService,
    private readonly aiService: AiService,
    private readonly aiUsageQuotaService: AiUsageQuotaService,
    private readonly aiUsageLedgerService: AiUsageLedgerService,
  ) {}

  // ============================================================================
  // Type Mapping Helpers
  // ============================================================================

  private toPrismaGapType(type: CompetitorGapType): PrismaGapType {
    const mapping: Record<CompetitorGapType, PrismaGapType> = {
      intent_gap: 'INTENT_GAP',
      content_section_gap: 'CONTENT_SECTION_GAP',
      trust_signal_gap: 'TRUST_SIGNAL_GAP',
    };
    return mapping[type];
  }

  private fromPrismaGapType(type: PrismaGapType): CompetitorGapType {
    const mapping: Record<PrismaGapType, CompetitorGapType> = {
      INTENT_GAP: 'intent_gap',
      CONTENT_SECTION_GAP: 'content_section_gap',
      TRUST_SIGNAL_GAP: 'trust_signal_gap',
    };
    return mapping[type];
  }

  private toPrismaDraftType(type: CompetitiveFixDraftType): PrismaDraftType {
    const mapping: Record<CompetitiveFixDraftType, PrismaDraftType> = {
      answer_block: 'ANSWER_BLOCK',
      comparison_copy: 'COMPARISON_COPY',
      positioning_section: 'POSITIONING_SECTION',
    };
    return mapping[type];
  }

  private toPrismaApplyTarget(target: CompetitiveFixApplyTarget): PrismaApplyTarget {
    const mapping: Record<CompetitiveFixApplyTarget, PrismaApplyTarget> = {
      ANSWER_BLOCK: 'ANSWER_BLOCK',
      CONTENT_SECTION: 'CONTENT_SECTION',
      WHY_CHOOSE_SECTION: 'WHY_CHOOSE_SECTION',
    };
    return mapping[target];
  }

  private toPrismaSearchIntentType(type: SearchIntentType): PrismaSearchIntentType {
    const mapping: Record<SearchIntentType, PrismaSearchIntentType> = {
      transactional: 'TRANSACTIONAL',
      comparative: 'COMPARATIVE',
      problem_use_case: 'PROBLEM_USE_CASE',
      trust_validation: 'TRUST_VALIDATION',
      informational: 'INFORMATIONAL',
    };
    return mapping[type];
  }

  // ============================================================================
  // Product Endpoints
  // ============================================================================

  /**
   * GET /products/:productId/competitors
   * Returns competitive coverage, gaps, and open drafts for a product.
   */
  @Get('products/:productId/competitors')
  async getProductCompetitors(
    @Request() req: any,
    @Param('productId') productId: string,
  ): Promise<ProductCompetitiveResponse> {
    const userId = req.user.id;
    return this.competitorsService.getProductCompetitiveData(productId, userId);
  }

  /**
   * POST /products/:productId/competitors/preview
   * Generate or retrieve a cached fix draft for a competitive gap.
   *
   * Draft-first pattern (CACHE/REUSE v2):
   * 1. Compute deterministic aiWorkKey
   * 2. Check for existing unexpired draft with same key
   * 3. If found, return reused draft (no AI call)
   * 4. Otherwise, check AI quota, generate new draft, persist
   */
  @Post('products/:productId/competitors/preview')
  async previewCompetitiveFix(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: CompetitiveFixPreviewDto,
  ): Promise<CompetitiveFixPreviewResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.gapType || !dto.areaId || !dto.draftType) {
      throw new BadRequestException(
        'gapType, areaId, and draftType are required',
      );
    }

    // Load product and verify ownership
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    if (product.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Derive intent type from area if not provided
    const intentType = dto.intentType || getIntentTypeFromAreaId(dto.areaId);

    // Compute deterministic work key for CACHE/REUSE v2
    const aiWorkKey = computeCompetitiveFixWorkKey(
      product.projectId,
      productId,
      dto.gapType,
      dto.areaId,
      dto.draftType,
      intentType,
    );

    // Check for existing unexpired draft
    const existingDraft = await this.prisma.productCompetitiveFixDraft.findFirst({
      where: {
        aiWorkKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (existingDraft) {
      // Return reused draft — no AI call
      // eslint-disable-next-line no-console
      console.log('[Competitors] preview.reused', {
        productId,
        gapType: dto.gapType,
        areaId: dto.areaId,
        aiWorkKey,
      });

      return {
        draft: {
          id: existingDraft.id,
          productId: existingDraft.productId,
          gapType: this.fromPrismaGapType(existingDraft.gapType),
          intentType: existingDraft.intentType
            ? existingDraft.intentType.toLowerCase().replace(/_/g, '_') as SearchIntentType
            : undefined,
          areaId: existingDraft.areaId as CompetitiveCoverageAreaId,
          draftType: existingDraft.draftType.toLowerCase() as CompetitiveFixDraftType,
          draftPayload: existingDraft.draftPayload as any,
          aiWorkKey: existingDraft.aiWorkKey,
          reusedFromWorkKey: existingDraft.reusedFromWorkKey || undefined,
          generatedWithAi: existingDraft.generatedWithAi,
          generatedAt: existingDraft.createdAt.toISOString(),
          expiresAt: existingDraft.expiresAt?.toISOString(),
        },
        generatedWithAi: false,
      };
    }

    // Evaluate AI quota before generating
    const quotaEval: AiUsageQuotaEvaluation =
      await this.aiUsageQuotaService.evaluateQuotaForAction({
        userId,
        projectId: product.projectId,
        action: 'PREVIEW_GENERATE',
      });

    if (quotaEval.status === 'blocked') {
      throw new ForbiddenException(
        'AI usage quota exceeded. Please wait until next month or upgrade your plan.',
      );
    }

    // Generate AI draft
    // eslint-disable-next-line no-console
    console.log('[Competitors] preview.generating', {
      productId,
      gapType: dto.gapType,
      areaId: dto.areaId,
      draftType: dto.draftType,
      aiWorkKey,
    });

    const startTime = Date.now();
    let draftPayload: Record<string, string>;

    try {
      if (dto.draftType === 'answer_block') {
        // Generate Answer Block draft for competitive positioning
        const answerBlockResult = await this.aiService.generateCompetitiveAnswerBlock({
          product: {
            title: product.title,
            description: product.description || '',
            seoTitle: product.seoTitle || '',
            seoDescription: product.seoDescription || '',
          },
          gapType: dto.gapType,
          areaId: dto.areaId,
          intentType,
        });

        draftPayload = {
          question: answerBlockResult.question,
          answer: answerBlockResult.answer,
        };
      } else if (dto.draftType === 'comparison_copy') {
        // Generate comparison copy
        const comparisonResult = await this.aiService.generateComparisonCopy({
          product: {
            title: product.title,
            description: product.description || '',
          },
          gapType: dto.gapType,
          areaId: dto.areaId,
        });

        draftPayload = {
          comparisonText: comparisonResult.comparisonText,
          placementGuidance: comparisonResult.placementGuidance,
        };
      } else {
        // positioning_section
        const positioningResult = await this.aiService.generatePositioningSection({
          product: {
            title: product.title,
            description: product.description || '',
          },
          gapType: dto.gapType,
          areaId: dto.areaId,
        });

        draftPayload = {
          positioningContent: positioningResult.positioningContent,
          placementGuidance: positioningResult.placementGuidance,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Competitors] preview.generation.failed', {
        productId,
        gapType: dto.gapType,
        areaId: dto.areaId,
        error,
      });
      throw error;
    }

    const latencyMs = Date.now() - startTime;

    // Persist the generated draft
    const newDraft = await this.prisma.productCompetitiveFixDraft.create({
      data: {
        productId,
        gapType: this.toPrismaGapType(dto.gapType),
        intentType: intentType
          ? this.toPrismaSearchIntentType(intentType)
          : null,
        areaId: dto.areaId,
        draftType: this.toPrismaDraftType(dto.draftType),
        draftPayload,
        aiWorkKey,
        generatedWithAi: true,
        // Optional: Set expiration (e.g., 7 days)
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Record AI usage in ledger with competitive-specific metadata
    await this.aiUsageLedgerService.recordAiRun({
      projectId: product.projectId,
      runType: 'INTENT_FIX_PREVIEW', // Reuse same run type per spec
      productIds: [productId],
      productsProcessed: 1,
      productsSkipped: 0,
      draftsFresh: 1,
      draftsReused: 0,
      metadata: {
        playbookId: 'competitive-positioning-fix', // Distinguishes from search intent
        pillar: 'competitive_positioning',
        gapType: dto.gapType,
        areaId: dto.areaId,
        draftType: dto.draftType,
        intentType,
        latencyMs,
      },
    });

    // eslint-disable-next-line no-console
    console.log('[Competitors] preview.generated', {
      productId,
      gapType: dto.gapType,
      areaId: dto.areaId,
      draftId: newDraft.id,
      latencyMs,
    });

    return {
      draft: {
        id: newDraft.id,
        productId: newDraft.productId,
        gapType: this.fromPrismaGapType(newDraft.gapType),
        intentType,
        areaId: newDraft.areaId as CompetitiveCoverageAreaId,
        draftType: newDraft.draftType.toLowerCase() as CompetitiveFixDraftType,
        draftPayload: newDraft.draftPayload as any,
        aiWorkKey: newDraft.aiWorkKey,
        generatedWithAi: true,
        generatedAt: newDraft.createdAt.toISOString(),
        expiresAt: newDraft.expiresAt?.toISOString(),
      },
      generatedWithAi: true,
      aiUsage: {
        tokensUsed: 500, // Estimated — would track actual tokens in production
        latencyMs,
      },
    };
  }

  /**
   * POST /products/:productId/competitors/apply
   * Apply a draft fix to the product.
   *
   * No AI call — just persists the draft content to the appropriate storage
   * (Answer Block, content section, or why choose section).
   */
  @Post('products/:productId/competitors/apply')
  async applyCompetitiveFix(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: CompetitiveFixApplyDto,
  ): Promise<CompetitiveFixApplyResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.draftId || !dto.applyTarget) {
      throw new BadRequestException('draftId and applyTarget are required');
    }

    // Load product and verify ownership
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    if (product.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Load the draft
    const draft = await this.prisma.productCompetitiveFixDraft.findUnique({
      where: { id: dto.draftId },
    });

    if (!draft) {
      throw new BadRequestException('Draft not found');
    }

    if (draft.productId !== productId) {
      throw new BadRequestException('Draft does not belong to this product');
    }

    // eslint-disable-next-line no-console
    console.log('[Competitors] apply.started', {
      productId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
    });

    const draftPayload = draft.draftPayload as Record<string, string>;

    // Apply based on target
    if (dto.applyTarget === 'ANSWER_BLOCK') {
      // Create Answer Block from draft
      if (!draftPayload.question || !draftPayload.answer) {
        throw new BadRequestException(
          'Draft payload missing question or answer for ANSWER_BLOCK target',
        );
      }

      // Generate a questionId for competitive positioning
      const questionId = `competitive_${draft.gapType}_${Date.now()}`;

      await this.prisma.answerBlock.create({
        data: {
          productId,
          questionId,
          questionText: draftPayload.question,
          answerText: draftPayload.answer,
          confidenceScore: 0.8, // Default for AI-generated
          sourceType: 'competitive_fix_ai',
          sourceFieldsUsed: [`gapType:${this.fromPrismaGapType(draft.gapType)}`, `areaId:${draft.areaId}`],
        },
      });
    } else if (dto.applyTarget === 'CONTENT_SECTION') {
      // Append comparison copy or positioning content to description
      const content = draftPayload.comparisonText || draftPayload.positioningContent;
      if (!content) {
        throw new BadRequestException(
          'Draft payload missing content for CONTENT_SECTION target',
        );
      }

      const existingDescription = product.description || '';
      const newDescription = existingDescription
        ? `${existingDescription}\n\n${content}`
        : content;

      await this.prisma.product.update({
        where: { id: productId },
        data: { description: newDescription },
      });
    } else if (dto.applyTarget === 'WHY_CHOOSE_SECTION') {
      // Apply as "Why Choose" section - in production, this might go to
      // a dedicated field or structured content block
      const content = draftPayload.positioningContent || draftPayload.comparisonText;
      if (!content) {
        throw new BadRequestException(
          'Draft payload missing content for WHY_CHOOSE_SECTION target',
        );
      }

      // For MVP, append to description with a section header
      const existingDescription = product.description || '';
      const sectionContent = `\n\n## Why Choose ${product.title}\n\n${content}`;
      const newDescription = existingDescription + sectionContent;

      await this.prisma.product.update({
        where: { id: productId },
        data: { description: newDescription },
      });
    } else {
      throw new BadRequestException(`Unknown applyTarget: ${dto.applyTarget}`);
    }

    // Record the application
    await this.prisma.productCompetitiveFixApplication.create({
      data: {
        productId,
        draftId: draft.id,
        appliedByUserId: userId,
        gapType: draft.gapType,
        areaId: draft.areaId,
        applyTarget: this.toPrismaApplyTarget(dto.applyTarget),
      },
    });

    // Invalidate coverage cache to trigger recomputation
    await this.competitorsService.invalidateCoverage(productId);

    // Re-analyze to get updated coverage
    const updatedCoverage =
      await this.competitorsService.analyzeProductCompetitiveCoverage(productId);

    // Check if any related issues were resolved
    const areaWasGap = !updatedCoverage.coverageAreas.find(
      a => a.areaId === draft.areaId && !a.merchantCovers,
    );

    // eslint-disable-next-line no-console
    console.log('[Competitors] apply.completed', {
      productId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
      issuesResolved: areaWasGap,
    });

    return {
      success: true,
      updatedCoverage,
      issuesResolved: areaWasGap,
      issuesResolvedCount: areaWasGap ? 1 : 0,
    };
  }

  // ============================================================================
  // Project Endpoints
  // ============================================================================

  /**
   * GET /projects/:projectId/competitors/scorecard
   * Returns project-level Competitive Positioning scorecard.
   */
  @Get('projects/:projectId/competitors/scorecard')
  async getProjectCompetitiveScorecard(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ): Promise<CompetitiveScorecard> {
    const userId = req.user.id;
    return this.competitorsService.getProjectCompetitiveScorecard(projectId, userId);
  }
}
