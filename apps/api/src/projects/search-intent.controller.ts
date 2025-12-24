import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { SearchIntentService } from './search-intent.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { AiService } from '../ai/ai.service';
import {
  AiUsageQuotaService,
  AiUsageQuotaEvaluation,
} from '../ai/ai-usage-quota.service';
import { AiUsageLedgerService } from '../ai/ai-usage-ledger.service';
import {
  SearchIntentType,
  IntentFixDraftType,
  IntentFixApplyTarget,
  IntentFixPreviewResponse,
  IntentFixApplyResponse,
  ProductSearchIntentResponse,
  SearchIntentScorecard,
  computeIntentFixWorkKey,
} from '@engineo/shared';
import {
  SearchIntentType as PrismaIntentType,
  IntentFixDraftType as PrismaFixDraftType,
  IntentFixApplyTarget as PrismaApplyTarget,
} from '@prisma/client';

/**
 * DTO for preview request
 */
class IntentFixPreviewDto {
  intentType: SearchIntentType;
  query: string;
  fixType: IntentFixDraftType;
}

/**
 * DTO for apply request
 */
class IntentFixApplyDto {
  draftId: string;
  applyTarget: IntentFixApplyTarget;
}

/**
 * SearchIntentController
 *
 * REST endpoints for the Search & Intent pillar (SEARCH-INTENT-1):
 * - GET  /products/:productId/search-intent — Product intent data
 * - POST /products/:productId/search-intent/preview — Preview fix draft
 * - POST /products/:productId/search-intent/apply — Apply fix draft
 * - GET  /projects/:projectId/search-intent/summary — Project scorecard
 *
 * [ROLES-3 FIXUP-3] Updated with membership-aware access control:
 * - GET endpoints: any ProjectMember can view
 * - Preview endpoints: OWNER/EDITOR only
 * - Apply endpoints: OWNER-only
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class SearchIntentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIntentService: SearchIntentService,
    private readonly aiService: AiService,
    private readonly aiUsageQuotaService: AiUsageQuotaService,
    private readonly aiUsageLedgerService: AiUsageLedgerService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  // ============================================================================
  // Type Mapping Helpers
  // ============================================================================

  private toPrismaIntentType(type: SearchIntentType): PrismaIntentType {
    const mapping: Record<SearchIntentType, PrismaIntentType> = {
      informational: 'INFORMATIONAL',
      comparative: 'COMPARATIVE',
      transactional: 'TRANSACTIONAL',
      problem_use_case: 'PROBLEM_USE_CASE',
      trust_validation: 'TRUST_VALIDATION',
    };
    return mapping[type];
  }

  private fromPrismaIntentType(type: PrismaIntentType): SearchIntentType {
    const mapping: Record<PrismaIntentType, SearchIntentType> = {
      INFORMATIONAL: 'informational',
      COMPARATIVE: 'comparative',
      TRANSACTIONAL: 'transactional',
      PROBLEM_USE_CASE: 'problem_use_case',
      TRUST_VALIDATION: 'trust_validation',
    };
    return mapping[type];
  }

  private toPrismaFixDraftType(type: IntentFixDraftType): PrismaFixDraftType {
    const mapping: Record<IntentFixDraftType, PrismaFixDraftType> = {
      answer_block: 'ANSWER_BLOCK',
      content_snippet: 'CONTENT_SNIPPET',
      metadata_guidance: 'METADATA_GUIDANCE',
    };
    return mapping[type];
  }

  private toPrismaApplyTarget(target: IntentFixApplyTarget): PrismaApplyTarget {
    const mapping: Record<IntentFixApplyTarget, PrismaApplyTarget> = {
      ANSWER_BLOCK: 'ANSWER_BLOCK',
      CONTENT_SNIPPET_SECTION: 'CONTENT_SNIPPET_SECTION',
    };
    return mapping[target];
  }

  // ============================================================================
  // Product Endpoints
  // ============================================================================

  /**
   * GET /products/:productId/search-intent
   * Returns intent coverage, scorecard, and open drafts for a product.
   */
  @Get('products/:productId/search-intent')
  async getProductSearchIntent(
    @Request() req: any,
    @Param('productId') productId: string,
  ): Promise<ProductSearchIntentResponse> {
    const userId = req.user.id;
    return this.searchIntentService.getProductIntentData(productId, userId);
  }

  /**
   * POST /products/:productId/search-intent/preview
   * Generate or retrieve a cached fix draft for an intent gap.
   *
   * Draft-first pattern (CACHE/REUSE v2):
   * 1. Compute deterministic aiWorkKey
   * 2. Check for existing unexpired draft with same key
   * 3. If found, return reused draft (no AI call)
   * 4. Otherwise, check AI quota, generate new draft, persist
   */
  @Post('products/:productId/search-intent/preview')
  async previewIntentFix(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: IntentFixPreviewDto,
  ): Promise<IntentFixPreviewResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.intentType || !dto.query || !dto.fixType) {
      throw new BadRequestException(
        'intentType, query, and fixType are required',
      );
    }

    // Load product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // [ROLES-3 FIXUP-3] OWNER/EDITOR only for draft generation
    await this.roleResolution.assertCanGenerateDrafts(product.projectId, userId);

    // Compute deterministic work key for CACHE/REUSE v2
    const aiWorkKey = computeIntentFixWorkKey(
      product.projectId,
      productId,
      dto.intentType,
      dto.query,
      dto.fixType,
    );

    // Check for existing unexpired draft
    const existingDraft = await this.prisma.productIntentFixDraft.findFirst({
      where: {
        aiWorkKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (existingDraft) {
      // Return reused draft — no AI call
      // eslint-disable-next-line no-console
      console.log('[SearchIntent] preview.reused', {
        productId,
        intentType: dto.intentType,
        query: dto.query,
        aiWorkKey,
      });

      return {
        draft: {
          id: existingDraft.id,
          productId: existingDraft.productId,
          intentType: this.fromPrismaIntentType(existingDraft.intentType),
          query: existingDraft.query,
          draftType: existingDraft.draftType.toLowerCase() as IntentFixDraftType,
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
    console.log('[SearchIntent] preview.generating', {
      productId,
      intentType: dto.intentType,
      query: dto.query,
      fixType: dto.fixType,
      aiWorkKey,
    });

    const startTime = Date.now();
    let draftPayload: Record<string, string>;

    try {
      if (dto.fixType === 'answer_block') {
        // Generate Answer Block draft
        const answerBlockResult = await this.aiService.generateAnswerBlockForIntent({
          product: {
            title: product.title,
            description: product.description || '',
            seoTitle: product.seoTitle || '',
            seoDescription: product.seoDescription || '',
          },
          intentType: dto.intentType,
          query: dto.query,
        });

        draftPayload = {
          question: answerBlockResult.question,
          answer: answerBlockResult.answer,
        };
      } else if (dto.fixType === 'content_snippet') {
        // Generate content snippet draft
        const snippetResult = await this.aiService.generateContentSnippetForIntent({
          product: {
            title: product.title,
            description: product.description || '',
          },
          intentType: dto.intentType,
          query: dto.query,
        });

        draftPayload = {
          snippet: snippetResult.snippet,
        };
      } else {
        // metadata_guidance
        const guidanceResult = await this.aiService.generateMetadataGuidanceForIntent({
          product: {
            title: product.title,
            seoTitle: product.seoTitle || '',
            seoDescription: product.seoDescription || '',
          },
          intentType: dto.intentType,
          query: dto.query,
        });

        draftPayload = {
          titleSuggestion: guidanceResult.titleSuggestion,
          descriptionSuggestion: guidanceResult.descriptionSuggestion,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[SearchIntent] preview.generation.failed', {
        productId,
        intentType: dto.intentType,
        query: dto.query,
        error,
      });
      throw error;
    }

    const latencyMs = Date.now() - startTime;

    // Persist the generated draft
    const newDraft = await this.prisma.productIntentFixDraft.create({
      data: {
        productId,
        intentType: this.toPrismaIntentType(dto.intentType),
        query: dto.query,
        draftType: this.toPrismaFixDraftType(dto.fixType),
        draftPayload,
        aiWorkKey,
        generatedWithAi: true,
        // Optional: Set expiration (e.g., 7 days)
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Record AI usage in ledger
    // [ROLES-3-HARDEN-1] Include actorUserId for multi-user attribution
    await this.aiUsageLedgerService.recordAiRun({
      projectId: product.projectId,
      runType: 'INTENT_FIX_PREVIEW',
      productIds: [productId],
      productsProcessed: 1,
      productsSkipped: 0,
      draftsFresh: 1,
      draftsReused: 0,
      actorUserId: userId,
      metadata: {
        intentType: dto.intentType,
        query: dto.query,
        fixType: dto.fixType,
        latencyMs,
      },
    });

    // eslint-disable-next-line no-console
    console.log('[SearchIntent] preview.generated', {
      productId,
      intentType: dto.intentType,
      query: dto.query,
      draftId: newDraft.id,
      latencyMs,
    });

    return {
      draft: {
        id: newDraft.id,
        productId: newDraft.productId,
        intentType: this.fromPrismaIntentType(newDraft.intentType),
        query: newDraft.query,
        draftType: newDraft.draftType.toLowerCase() as IntentFixDraftType,
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
   * POST /products/:productId/search-intent/apply
   * Apply a draft fix to the product.
   *
   * No AI call — just persists the draft content to the appropriate storage
   * (Answer Block or product content section).
   */
  @Post('products/:productId/search-intent/apply')
  async applyIntentFix(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: IntentFixApplyDto,
  ): Promise<IntentFixApplyResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.draftId || !dto.applyTarget) {
      throw new BadRequestException('draftId and applyTarget are required');
    }

    // Load product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // [ROLES-3 FIXUP-3] OWNER-only for apply mutations
    await this.roleResolution.assertOwnerRole(product.projectId, userId);

    // Load the draft
    const draft = await this.prisma.productIntentFixDraft.findUnique({
      where: { id: dto.draftId },
    });

    if (!draft) {
      throw new BadRequestException('Draft not found');
    }

    if (draft.productId !== productId) {
      throw new BadRequestException('Draft does not belong to this product');
    }

    // eslint-disable-next-line no-console
    console.log('[SearchIntent] apply.started', {
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

      // Generate a questionId from the intent type and query (deterministic)
      const questionId = `intent_${draft.intentType}_${Date.now()}`;

      await this.prisma.answerBlock.create({
        data: {
          productId,
          questionId,
          questionText: draftPayload.question,
          answerText: draftPayload.answer,
          confidenceScore: 0.8, // Default for AI-generated
          sourceType: 'intent_fix_ai',
          sourceFieldsUsed: [`intent:${this.fromPrismaIntentType(draft.intentType)}`, `query:${draft.query}`],
        },
      });
    } else if (dto.applyTarget === 'CONTENT_SNIPPET_SECTION') {
      // Append snippet to product description
      if (!draftPayload.snippet) {
        throw new BadRequestException(
          'Draft payload missing snippet for CONTENT_SNIPPET_SECTION target',
        );
      }

      const existingDescription = product.description || '';
      const newDescription = existingDescription
        ? `${existingDescription}\n\n${draftPayload.snippet}`
        : draftPayload.snippet;

      await this.prisma.product.update({
        where: { id: productId },
        data: { description: newDescription },
      });
    } else {
      throw new BadRequestException(`Unknown applyTarget: ${dto.applyTarget}`);
    }

    // Record the application
    await this.prisma.productIntentFixApplication.create({
      data: {
        productId,
        draftId: draft.id,
        appliedByUserId: userId,
        intentType: draft.intentType,
        query: draft.query,
        applyTarget: this.toPrismaApplyTarget(dto.applyTarget),
      },
    });

    // Invalidate coverage cache to trigger recomputation
    await this.searchIntentService.invalidateCoverage(productId);

    // Re-analyze to get updated coverage
    const updatedCoverage =
      await this.searchIntentService.analyzeProductIntent(productId);

    // Check if any related issues were resolved
    const coverageForIntent = updatedCoverage.find(
      (c) => c.intentType === this.fromPrismaIntentType(draft.intentType),
    );

    const issuesResolved =
      coverageForIntent && coverageForIntent.coverageStatus !== 'none';

    // eslint-disable-next-line no-console
    console.log('[SearchIntent] apply.completed', {
      productId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
      issuesResolved,
    });

    return {
      success: true,
      updatedCoverage,
      issuesResolved: issuesResolved ?? false,
      issuesResolvedCount: issuesResolved ? 1 : 0,
    };
  }

  // ============================================================================
  // Project Endpoints
  // ============================================================================

  /**
   * GET /projects/:projectId/search-intent/summary
   * Returns project-level Search & Intent scorecard.
   */
  @Get('projects/:projectId/search-intent/summary')
  async getProjectSearchIntentSummary(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ): Promise<SearchIntentScorecard> {
    const userId = req.user.id;
    return this.searchIntentService.getProjectIntentSummary(projectId, userId);
  }
}
