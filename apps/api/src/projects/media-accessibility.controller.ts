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
import { MediaAccessibilityService } from './media-accessibility.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { AiService } from '../ai/ai.service';
import {
  AiUsageQuotaService,
  AiUsageQuotaEvaluation,
} from '../ai/ai-usage-quota.service';
import { AiUsageLedgerService } from '../ai/ai-usage-ledger.service';
import { ShopifyService } from '../shopify/shopify.service';
import {
  MediaFixDraftType,
  MediaFixApplyTarget,
  MediaFixPreviewResponse,
  MediaFixApplyResponse,
  MediaAccessibilityScorecard,
  ProjectMediaAccessibilityResponse,
  ProductMediaStats,
  MediaFixDraft,
  ProductImageView,
  computeMediaFixWorkKey,
} from '@engineo/shared';

/**
 * DTO for preview request
 */
class MediaFixPreviewDto {
  imageId: string;
  draftType: MediaFixDraftType;
}

/**
 * DTO for apply request
 */
class MediaFixApplyDto {
  draftId: string;
  applyTarget: MediaFixApplyTarget;
}

/**
 * MediaAccessibilityController
 *
 * REST endpoints for the Media & Accessibility pillar (MEDIA-1):
 * - GET  /projects/:projectId/media — Project media accessibility data
 * - GET  /projects/:projectId/media/scorecard — Project scorecard only
 * - GET  /products/:productId/media — Product media data
 * - POST /products/:productId/media/preview — Preview fix draft (uses AI)
 * - POST /products/:productId/media/apply — Apply fix draft (no AI)
 *
 * [ROLES-3 FIXUP-3] Updated with membership-aware access control:
 * - GET endpoints: any ProjectMember can view
 * - Preview endpoints: OWNER/EDITOR only
 * - Apply endpoints: OWNER-only
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class MediaAccessibilityController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaAccessibilityService: MediaAccessibilityService,
    private readonly aiService: AiService,
    private readonly aiUsageQuotaService: AiUsageQuotaService,
    private readonly aiUsageLedgerService: AiUsageLedgerService,
    private readonly shopifyService: ShopifyService,
    private readonly roleResolution: RoleResolutionService
  ) {}

  // ============================================================================
  // Project Endpoints
  // ============================================================================

  /**
   * GET /projects/:projectId/media
   * Returns project-level media accessibility data including scorecard, stats, and drafts.
   */
  @Get('projects/:projectId/media')
  async getProjectMediaAccessibility(
    @Request() req: any,
    @Param('projectId') projectId: string
  ): Promise<ProjectMediaAccessibilityResponse> {
    const userId = req.user.id;
    return this.mediaAccessibilityService.getProjectMediaAccessibility(
      projectId,
      userId
    );
  }

  /**
   * GET /projects/:projectId/media/scorecard
   * Returns only the project-level scorecard for use by DEO Overview.
   */
  @Get('projects/:projectId/media/scorecard')
  async getProjectMediaScorecard(
    @Request() req: any,
    @Param('projectId') projectId: string
  ): Promise<MediaAccessibilityScorecard> {
    const userId = req.user.id;
    return this.mediaAccessibilityService.getProjectMediaScorecard(
      projectId,
      userId
    );
  }

  // ============================================================================
  // Product Endpoints
  // ============================================================================

  /**
   * GET /products/:productId/media
   * Returns per-product MEDIA data: stats, images, and open fix drafts.
   */
  @Get('products/:productId/media')
  async getProductMediaData(
    @Request() req: any,
    @Param('productId') productId: string
  ): Promise<{
    stats: ProductMediaStats;
    images: ProductImageView[];
    openDrafts: MediaFixDraft[];
  }> {
    const userId = req.user.id;
    return this.mediaAccessibilityService.getProductMediaData(
      productId,
      userId
    );
  }

  /**
   * POST /products/:productId/media/preview
   * Generate or retrieve a cached fix draft for an image.
   *
   * Draft-first pattern (CACHE/REUSE v2):
   * 1. Compute deterministic aiWorkKey
   * 2. Check for existing unexpired draft with same key
   * 3. If found, return reused draft (no AI call)
   * 4. Otherwise, check AI quota, generate new draft, persist
   */
  @Post('products/:productId/media/preview')
  async previewMediaFix(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: MediaFixPreviewDto
  ): Promise<MediaFixPreviewResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.imageId || !dto.draftType) {
      throw new BadRequestException('imageId and draftType are required');
    }

    // Load product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { project: true },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // [ROLES-3 FIXUP-3] OWNER/EDITOR only for draft generation
    await this.roleResolution.assertCanGenerateDrafts(
      product.projectId,
      userId
    );

    const projectId = product.projectId;

    // Compute deterministic work key for CACHE/REUSE v2
    const aiWorkKey = computeMediaFixWorkKey(
      projectId,
      productId,
      dto.imageId,
      dto.draftType
    );

    // Check for existing unexpired draft
    const existingDraft =
      await this.mediaAccessibilityService.findDraftByWorkKey(aiWorkKey);

    if (existingDraft) {
      // Return reused draft — no AI call
      console.log('[MediaAccessibility] preview.reused', {
        productId,
        imageId: dto.imageId,
        draftType: dto.draftType,
        aiWorkKey,
      });

      return {
        draft: existingDraft,
        generatedWithAi: false,
      };
    }

    // Evaluate AI quota before generating
    const quotaEval: AiUsageQuotaEvaluation =
      await this.aiUsageQuotaService.evaluateQuotaForAction({
        userId,
        projectId,
        action: 'PREVIEW_GENERATE',
      });

    if (quotaEval.status === 'blocked') {
      throw new ForbiddenException(
        'AI usage quota exceeded. Please wait until next month or upgrade your plan.'
      );
    }

    // Load the image to get context
    const image = await this.prisma.productImage.findFirst({
      where: {
        productId,
        externalId: dto.imageId,
      },
    });

    if (!image) {
      throw new BadRequestException('Image not found');
    }

    // Generate AI draft
    console.log('[MediaAccessibility] preview.generating', {
      productId,
      imageId: dto.imageId,
      draftType: dto.draftType,
      aiWorkKey,
    });

    const startTime = Date.now();
    let draftPayload: { altText?: string; caption?: string };

    try {
      if (dto.draftType === 'image_alt_text') {
        // Generate alt text using AI
        // Uses only product metadata (title, description) and existing image context
        // Does NOT use heavy CV/vision — no hallucinated visual claims
        const result = await this.aiService.generateImageAltText({
          productTitle: product.title,
          productDescription: product.description || '',
          currentAltText: image.altText || '',
          imagePosition: image.position ?? 0,
        });
        draftPayload = { altText: result.altText };
      } else if (dto.draftType === 'image_caption') {
        // Generate caption using AI
        const result = await this.aiService.generateImageCaption({
          productTitle: product.title,
          productDescription: product.description || '',
          currentAltText: image.altText || '',
          imagePosition: image.position ?? 0,
        });
        draftPayload = { caption: result.caption };
      } else {
        throw new BadRequestException(`Unknown draft type: ${dto.draftType}`);
      }
    } catch (error) {
      console.error('[MediaAccessibility] preview.generation.failed', {
        productId,
        imageId: dto.imageId,
        draftType: dto.draftType,
        error,
      });
      throw error;
    }

    const latencyMs = Date.now() - startTime;

    // Persist the generated draft
    const newDraft = await this.mediaAccessibilityService.createDraft({
      productId,
      imageId: dto.imageId,
      draftType: dto.draftType,
      draftPayload,
      aiWorkKey,
      generatedWithAi: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
    });

    // Record AI usage in ledger
    // [ROLES-3-HARDEN-1] Include actorUserId for multi-user attribution
    await this.aiUsageLedgerService.recordAiRun({
      projectId,
      runType: 'INTENT_FIX_PREVIEW', // Reuse existing type per spec
      productIds: [productId],
      productsProcessed: 1,
      productsSkipped: 0,
      draftsFresh: 1,
      draftsReused: 0,
      actorUserId: userId,
      metadata: {
        playbookId: 'media-accessibility-fix',
        pillar: 'media_accessibility',
        draftType: dto.draftType,
        imageId: dto.imageId,
        latencyMs,
        aiWorkKey,
      },
    });

    console.log('[MediaAccessibility] preview.generated', {
      productId,
      imageId: dto.imageId,
      draftType: dto.draftType,
      draftId: newDraft.id,
      latencyMs,
    });

    return {
      draft: newDraft,
      generatedWithAi: true,
      aiUsage: {
        tokensUsed: 300, // Estimated — would track actual tokens in production
        latencyMs,
      },
    };
  }

  /**
   * POST /products/:productId/media/apply
   * Apply a draft fix to the image.
   *
   * No AI call — just persists the draft content to the ProductImage.
   * Optionally writes alt text back to Shopify.
   */
  @Post('products/:productId/media/apply')
  async applyMediaFix(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: MediaFixApplyDto
  ): Promise<MediaFixApplyResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.draftId || !dto.applyTarget) {
      throw new BadRequestException('draftId and applyTarget are required');
    }

    // Load product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { project: true },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // [ROLES-3 FIXUP-3] OWNER-only for apply mutations
    await this.roleResolution.assertOwnerRole(product.projectId, userId);

    console.log('[MediaAccessibility] apply.started', {
      productId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
    });

    // Apply the draft
    const result = await this.mediaAccessibilityService.applyDraft({
      productId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
      userId,
    });

    // Optionally write alt text back to Shopify (best-effort, no AI calls)
    if (dto.applyTarget === 'IMAGE_ALT') {
      try {
        // Note: Shopify alt text write-back would be implemented here
        // For MEDIA-1, this is a placeholder for future implementation
        // await this.shopifyService.updateImageAltText(productId, imageId, altText);
        console.log('[MediaAccessibility] Shopify write-back placeholder', {
          productId,
          applyTarget: dto.applyTarget,
        });
      } catch (error) {
        console.warn(
          '[MediaAccessibility] Shopify write-back failed (best-effort)',
          {
            productId,
            error,
          }
        );
        // Continue — local update succeeded
      }
    }

    console.log('[MediaAccessibility] apply.completed', {
      productId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
      issuesResolved: result.issuesResolved,
    });

    return {
      success: result.success,
      updatedStats: result.updatedStats,
      issuesResolved: result.issuesResolved,
      issuesResolvedCount: result.issuesResolvedCount,
    };
  }
}
