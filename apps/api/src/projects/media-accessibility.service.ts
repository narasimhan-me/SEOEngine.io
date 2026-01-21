import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import {
  MediaFixDraftType as PrismaDraftType,
  MediaFixApplyTarget as PrismaApplyTarget,
} from '@prisma/client';
import {
  MediaAltTextQuality,
  MediaAccessibilityStatus,
  ProductMediaStats,
  MediaAccessibilityScorecard,
  MediaFixDraftType,
  MediaFixApplyTarget,
  MediaFixDraft,
  ProjectMediaAccessibilityResponse,
  ProductImageView,
  classifyAltText,
  getMediaAccessibilityStatusFromScore,
  computeMediaScoreFromStats,
} from '@engineo/shared';
import type { DeoIssue, DeoIssueSeverity } from '@engineo/shared';

/**
 * MediaAccessibilityService handles all Media & Accessibility pillar functionality (MEDIA-1):
 * - Project-level and product-level media data retrieval
 * - Alt text classification and scoring
 * - Scorecard computation
 * - Issue generation for missing/generic alt text
 * - Fix draft management (preview/apply patterns)
 *
 * CRITICAL DESIGN PRINCIPLES:
 * - Missing alt text is penalized more severely than generic alt text
 * - No heavy CV/vision pipeline; alt text generation uses product metadata only
 * - Generated alt text must not hallucinate content not visible in images
 * - Preview uses AI; Apply does NOT use AI
 */
/**
 * [ROLES-3 FIXUP-3] MediaAccessibilityService
 * Updated with membership-aware access control (any ProjectMember can view).
 */
@Injectable()
export class MediaAccessibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService
  ) {}

  // ============================================================================
  // Type Mapping Helpers
  // ============================================================================

  private toPrismaDraftType(type: MediaFixDraftType): PrismaDraftType {
    const mapping: Record<MediaFixDraftType, PrismaDraftType> = {
      image_alt_text: 'IMAGE_ALT_TEXT',
      image_caption: 'IMAGE_CAPTION',
    };
    return mapping[type];
  }

  private fromPrismaDraftType(type: PrismaDraftType): MediaFixDraftType {
    const mapping: Record<PrismaDraftType, MediaFixDraftType> = {
      IMAGE_ALT_TEXT: 'image_alt_text',
      IMAGE_CAPTION: 'image_caption',
    };
    return mapping[type];
  }

  private toPrismaApplyTarget(target: MediaFixApplyTarget): PrismaApplyTarget {
    const mapping: Record<MediaFixApplyTarget, PrismaApplyTarget> = {
      IMAGE_ALT: 'IMAGE_ALT',
      CAPTION_FIELD: 'CAPTION_FIELD',
    };
    return mapping[target];
  }

  private fromPrismaApplyTarget(
    target: PrismaApplyTarget
  ): MediaFixApplyTarget {
    const mapping: Record<PrismaApplyTarget, MediaFixApplyTarget> = {
      IMAGE_ALT: 'IMAGE_ALT',
      CAPTION_FIELD: 'CAPTION_FIELD',
    };
    return mapping[target];
  }

  // ============================================================================
  // Per-Product Media Stats Computation
  // ============================================================================

  /**
   * Compute media statistics for a single product.
   */
  async computeProductMediaStats(
    productId: string,
    productTitle: string
  ): Promise<ProductMediaStats> {
    const images = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });

    let imagesWithAnyAlt = 0;
    let imagesWithGoodAlt = 0;
    let imagesWithGenericAlt = 0;
    let imagesWithoutAlt = 0;
    let imagesWithCaptions = 0;
    let hasContextualMedia = false;

    for (const img of images) {
      const quality = classifyAltText(img.altText, productTitle);

      if (quality === 'good') {
        imagesWithGoodAlt++;
        imagesWithAnyAlt++;
      } else if (quality === 'generic') {
        imagesWithGenericAlt++;
        imagesWithAnyAlt++;
      } else {
        imagesWithoutAlt++;
      }

      if (img.caption && img.caption.trim() !== '') {
        imagesWithCaptions++;
        hasContextualMedia = true;
      }
    }

    const totalImages = images.length;
    const altTextCoveragePercent =
      totalImages > 0 ? Math.round((imagesWithAnyAlt / totalImages) * 100) : 0;
    const goodAltTextCoveragePercent =
      totalImages > 0 ? Math.round((imagesWithGoodAlt / totalImages) * 100) : 0;

    // Contextual media: at least one image has a caption or clearly descriptive alt
    if (imagesWithGoodAlt > 0) {
      hasContextualMedia = true;
    }

    return {
      productId,
      totalImages,
      imagesWithAnyAlt,
      imagesWithGoodAlt,
      imagesWithGenericAlt,
      imagesWithoutAlt,
      imagesWithCaptions,
      altTextCoveragePercent,
      goodAltTextCoveragePercent,
      hasContextualMedia,
    };
  }

  // ============================================================================
  // Project-Level Data Access
  // ============================================================================

  /**
   * Get project media data including scorecard and per-product stats.
   */
  async getProjectMediaData(
    projectId: string,
    userId: string
  ): Promise<{
    scorecard: MediaAccessibilityScorecard;
    stats: ProductMediaStats[];
  }> {
    // Verify project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    // Load all products for the project
    const products = await this.prisma.product.findMany({
      where: { projectId },
      select: { id: true, title: true },
    });

    // Compute per-product stats
    const stats: ProductMediaStats[] = [];
    for (const product of products) {
      const productStats = await this.computeProductMediaStats(
        product.id,
        product.title
      );
      stats.push(productStats);
    }

    // Compute project-level scorecard
    const scorecard = computeMediaScoreFromStats(projectId, stats);

    return { scorecard, stats };
  }

  /**
   * Get project-level media scorecard only.
   */
  async getProjectMediaScorecard(
    projectId: string,
    userId: string
  ): Promise<MediaAccessibilityScorecard> {
    const { scorecard } = await this.getProjectMediaData(projectId, userId);
    return scorecard;
  }

  /**
   * Get complete project media accessibility response for API.
   */
  async getProjectMediaAccessibility(
    projectId: string,
    userId: string
  ): Promise<ProjectMediaAccessibilityResponse> {
    const { scorecard, stats } = await this.getProjectMediaData(
      projectId,
      userId
    );

    // Get open drafts
    const draftRows = await this.prisma.productMediaFixDraft.findMany({
      where: {
        product: { projectId },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    const openDrafts: MediaFixDraft[] = draftRows.map((row) => ({
      id: row.id,
      productId: row.productId,
      imageId: row.imageId,
      draftType: this.fromPrismaDraftType(row.draftType),
      draftPayload: row.draftPayload as MediaFixDraft['draftPayload'],
      aiWorkKey: row.aiWorkKey,
      reusedFromWorkKey: row.reusedFromWorkKey || undefined,
      generatedWithAi: row.generatedWithAi,
      generatedAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    }));

    return {
      projectId,
      scorecard,
      stats,
      openDrafts,
    };
  }

  // ============================================================================
  // Per-Product Data Access
  // ============================================================================

  /**
   * Get product media data including stats, images, and open drafts.
   */
  async getProductMediaData(
    productId: string,
    userId: string
  ): Promise<{
    stats: ProductMediaStats;
    images: ProductImageView[];
    openDrafts: MediaFixDraft[];
  }> {
    // Verify product exists and user has access
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { project: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(product.projectId, userId);

    // Compute stats
    const stats = await this.computeProductMediaStats(productId, product.title);

    // Get images with quality classification
    const imageRows = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });

    const images: ProductImageView[] = imageRows.map((img) => ({
      id: img.externalId,
      src: img.src,
      altText: img.altText,
      altTextQuality: classifyAltText(img.altText, product.title),
      position: img.position ?? undefined,
      caption: img.caption,
    }));

    // Get open drafts
    const draftRows = await this.prisma.productMediaFixDraft.findMany({
      where: {
        productId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    const openDrafts: MediaFixDraft[] = draftRows.map((row) => ({
      id: row.id,
      productId: row.productId,
      imageId: row.imageId,
      draftType: this.fromPrismaDraftType(row.draftType),
      draftPayload: row.draftPayload as MediaFixDraft['draftPayload'],
      aiWorkKey: row.aiWorkKey,
      reusedFromWorkKey: row.reusedFromWorkKey || undefined,
      generatedWithAi: row.generatedWithAi,
      generatedAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    }));

    return { stats, images, openDrafts };
  }

  // ============================================================================
  // Issue Generation
  // ============================================================================

  /**
   * Build MEDIA issues for a project.
   * Called by deo-issues.service.ts to include media issues in DEO issues.
   */
  async buildMediaIssuesForProject(projectId: string): Promise<DeoIssue[]> {
    const issues: DeoIssue[] = [];

    // Load all products for the project
    const products = await this.prisma.product.findMany({
      where: { projectId },
      select: { id: true, title: true },
    });

    // Compute stats for each product
    let totalImagesWithoutAlt = 0;
    let totalImagesWithGenericAlt = 0;
    let totalProductsWithOnlyOneImage = 0;
    let totalProductsWithNoContextualMedia = 0;
    // [COUNT-INTEGRITY-1.1 PATCH 2.1] True product counters (not capped by sample arrays)
    let trueProductCountWithMissingAlt = 0;
    let trueProductCountWithGenericAlt = 0;
    const productsWithMissingAlt: string[] = [];
    const productsWithGenericAlt: string[] = [];
    const productsWithInsufficientCoverage: string[] = [];
    const productsWithMissingContext: string[] = [];
    // [COUNT-INTEGRITY-1.1 PATCH 3.5] Full affected product IDs (no cap)
    const allProductsWithMissingAlt: string[] = [];
    const allProductsWithGenericAlt: string[] = [];

    for (const product of products) {
      const stats = await this.computeProductMediaStats(
        product.id,
        product.title
      );

      if (stats.imagesWithoutAlt > 0) {
        totalImagesWithoutAlt += stats.imagesWithoutAlt;
        // [COUNT-INTEGRITY-1.1 PATCH 2.1] Increment true counter regardless of cap
        trueProductCountWithMissingAlt++;
        if (productsWithMissingAlt.length < 20) {
          productsWithMissingAlt.push(product.id);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.5] Always track full keys
        allProductsWithMissingAlt.push(product.id);
      }

      if (stats.imagesWithGenericAlt > 0) {
        totalImagesWithGenericAlt += stats.imagesWithGenericAlt;
        // [COUNT-INTEGRITY-1.1 PATCH 2.1] Increment true counter regardless of cap
        trueProductCountWithGenericAlt++;
        if (productsWithGenericAlt.length < 20) {
          productsWithGenericAlt.push(product.id);
        }
        // [COUNT-INTEGRITY-1.1 PATCH 3.5] Always track full keys
        allProductsWithGenericAlt.push(product.id);
      }

      // Insufficient image coverage: 0 or 1 image (excluding products already covered by missing_product_image)
      if (stats.totalImages > 0 && stats.totalImages <= 1) {
        totalProductsWithOnlyOneImage++;
        if (productsWithInsufficientCoverage.length < 20) {
          productsWithInsufficientCoverage.push(product.id);
        }
      }

      // Missing media context: multiple images but no captions and no clearly descriptive alt
      if (stats.totalImages > 1 && !stats.hasContextualMedia) {
        totalProductsWithNoContextualMedia++;
        if (productsWithMissingContext.length < 20) {
          productsWithMissingContext.push(product.id);
        }
      }
    }

    // Issue: missing_image_alt_text
    if (totalImagesWithoutAlt > 0) {
      const severity: DeoIssueSeverity =
        totalImagesWithoutAlt >= 10
          ? 'critical'
          : totalImagesWithoutAlt >= 3
            ? 'warning'
            : 'info';

      const issue: any = {
        id: `missing_image_alt_text_${projectId}`,
        type: 'missing_image_alt_text',
        title: 'Missing Image Alt Text',
        // [COUNT-INTEGRITY-1.1 PATCH 2.1] Use true product count (not capped sample length)
        description: `${totalImagesWithoutAlt} image${totalImagesWithoutAlt > 1 ? 's' : ''} across ${trueProductCountWithMissingAlt} product${trueProductCountWithMissingAlt > 1 ? 's' : ''} are missing alt text. This hurts accessibility and image/AI discovery.`,
        severity,
        // [COUNT-INTEGRITY-1.1 PATCH 2.1] Use true product count (not capped sample length)
        count: trueProductCountWithMissingAlt,
        affectedProducts: productsWithMissingAlt,
        primaryProductId: productsWithMissingAlt[0],
        pillarId: 'media_accessibility',
        actionability: 'manual',
        aiFixable: true,
        fixCost: 'one_click',
        imageCountAffected: totalImagesWithoutAlt,
        whyItMatters:
          'Images without alt text are invisible to screen readers and search engines. AI assistants cannot describe or reference these images, reducing discoverability.',
        recommendedFix:
          'Use the MEDIA preview/apply flow to generate and add descriptive alt text for each image. Focus on describing what is visible in the image.',
      };

      // [COUNT-INTEGRITY-1.1 PATCH 3.5] Store full product IDs for deo-issues service to attach keys
      (issue as any).__tempFullProductIds = allProductsWithMissingAlt;
      issues.push(issue);
    }

    // Issue: generic_image_alt_text
    if (totalImagesWithGenericAlt > 0) {
      const issue: any = {
        id: `generic_image_alt_text_${projectId}`,
        type: 'generic_image_alt_text',
        title: 'Generic Image Alt Text',
        // [COUNT-INTEGRITY-1.1 PATCH 2.1] Use true product count (not capped sample length)
        description: `${totalImagesWithGenericAlt} image${totalImagesWithGenericAlt > 1 ? 's' : ''} across ${trueProductCountWithGenericAlt} product${trueProductCountWithGenericAlt > 1 ? 's' : ''} have generic or unhelpful alt text like "product image" or just the product name.`,
        severity: 'warning',
        // [COUNT-INTEGRITY-1.1 PATCH 2.1] Use true product count (not capped sample length)
        count: trueProductCountWithGenericAlt,
        affectedProducts: productsWithGenericAlt,
        primaryProductId: productsWithGenericAlt[0],
        pillarId: 'media_accessibility',
        actionability: 'manual',
        aiFixable: true,
        fixCost: 'one_click',
        imageCountAffected: totalImagesWithGenericAlt,
        whyItMatters:
          'Generic alt text like "product image" provides no meaningful information to users or search engines. Descriptive alt text improves accessibility and image search rankings.',
        recommendedFix:
          'Rewrite generic alt text to describe what is actually visible in each image. Include product details, colors, materials, or context shown.',
      };

      // [COUNT-INTEGRITY-1.1 PATCH 3.5] Store full product IDs for deo-issues service to attach keys
      (issue as any).__tempFullProductIds = allProductsWithGenericAlt;
      issues.push(issue);
    }

    // Issue: insufficient_image_coverage
    if (totalProductsWithOnlyOneImage >= 3) {
      issues.push({
        id: `insufficient_image_coverage_${projectId}`,
        type: 'insufficient_image_coverage',
        title: 'Insufficient Image Coverage',
        description: `${totalProductsWithOnlyOneImage} products have only a single image. Multiple images showing different angles and uses build trust and improve conversions.`,
        severity: 'warning',
        count: totalProductsWithOnlyOneImage,
        affectedProducts: productsWithInsufficientCoverage,
        primaryProductId: productsWithInsufficientCoverage[0],
        pillarId: 'media_accessibility',
        actionability: 'manual',
        aiFixable: false,
        fixCost: 'manual',
        imageCountAffected: totalProductsWithOnlyOneImage,
        whyItMatters:
          'Products with multiple images from different angles, in use, or with lifestyle context convert better and provide more visual information for AI assistants.',
        recommendedFix:
          'Add additional images showing the product from different angles, in use, or in context. Include lifestyle images when appropriate.',
      });
    }

    // Issue: missing_media_context
    if (totalProductsWithNoContextualMedia >= 3) {
      issues.push({
        id: `missing_media_context_${projectId}`,
        type: 'missing_media_context',
        title: 'Missing Media Context',
        description: `${totalProductsWithNoContextualMedia} products have images but lack captions or contextual descriptions explaining where/how the product is used.`,
        severity: 'info',
        count: totalProductsWithNoContextualMedia,
        affectedProducts: productsWithMissingContext,
        primaryProductId: productsWithMissingContext[0],
        pillarId: 'media_accessibility',
        actionability: 'manual',
        aiFixable: false, // Caption generation could be enabled in future
        fixCost: 'manual',
        imageCountAffected: totalProductsWithNoContextualMedia,
        whyItMatters:
          'Images without context (captions) can be unclear to users and assistive technologies. Contextual media helps users understand product usage and benefits.',
        recommendedFix:
          'Add short captions or contextual descriptions to images explaining where or how the product is used. Consider adding lifestyle or in-use images with descriptions.',
      });
    }

    return issues;
  }

  // ============================================================================
  // Fix Draft Helpers
  // ============================================================================

  /**
   * Find existing non-expired draft by aiWorkKey.
   */
  async findDraftByWorkKey(aiWorkKey: string): Promise<MediaFixDraft | null> {
    const row = await this.prisma.productMediaFixDraft.findFirst({
      where: {
        aiWorkKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      productId: row.productId,
      imageId: row.imageId,
      draftType: this.fromPrismaDraftType(row.draftType),
      draftPayload: row.draftPayload as MediaFixDraft['draftPayload'],
      aiWorkKey: row.aiWorkKey,
      reusedFromWorkKey: row.reusedFromWorkKey || undefined,
      generatedWithAi: row.generatedWithAi,
      generatedAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    };
  }

  /**
   * Create a new media fix draft.
   */
  async createDraft(params: {
    productId: string;
    imageId: string;
    draftType: MediaFixDraftType;
    draftPayload: { altText?: string; caption?: string };
    aiWorkKey: string;
    generatedWithAi: boolean;
    expiresAt?: Date;
  }): Promise<MediaFixDraft> {
    const row = await this.prisma.productMediaFixDraft.create({
      data: {
        productId: params.productId,
        imageId: params.imageId,
        draftType: this.toPrismaDraftType(params.draftType),
        draftPayload: params.draftPayload as object,
        aiWorkKey: params.aiWorkKey,
        generatedWithAi: params.generatedWithAi,
        expiresAt: params.expiresAt,
      },
    });

    return {
      id: row.id,
      productId: row.productId,
      imageId: row.imageId,
      draftType: this.fromPrismaDraftType(row.draftType),
      draftPayload: row.draftPayload as MediaFixDraft['draftPayload'],
      aiWorkKey: row.aiWorkKey,
      generatedWithAi: row.generatedWithAi,
      generatedAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    };
  }

  /**
   * Apply a media fix draft to the corresponding ProductImage.
   */
  async applyDraft(params: {
    productId: string;
    draftId: string;
    applyTarget: MediaFixApplyTarget;
    userId: string;
  }): Promise<{
    success: boolean;
    updatedStats: ProductMediaStats;
    issuesResolved: boolean;
    issuesResolvedCount: number;
  }> {
    // Load the draft
    const draft = await this.prisma.productMediaFixDraft.findUnique({
      where: { id: params.draftId },
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    if (draft.productId !== params.productId) {
      throw new ForbiddenException('Draft does not belong to this product');
    }

    const payload = draft.draftPayload as {
      altText?: string;
      caption?: string;
    };

    // Apply to ProductImage based on target
    if (params.applyTarget === 'IMAGE_ALT' && payload.altText) {
      await this.prisma.productImage.updateMany({
        where: {
          productId: params.productId,
          externalId: draft.imageId,
        },
        data: {
          altText: payload.altText,
        },
      });
    } else if (params.applyTarget === 'CAPTION_FIELD' && payload.caption) {
      await this.prisma.productImage.updateMany({
        where: {
          productId: params.productId,
          externalId: draft.imageId,
        },
        data: {
          caption: payload.caption,
        },
      });
    }

    // Record the application
    await this.prisma.productMediaFixApplication.create({
      data: {
        productId: params.productId,
        draftId: draft.id,
        appliedByUserId: params.userId,
        imageId: draft.imageId,
        draftType: draft.draftType,
        applyTarget: this.toPrismaApplyTarget(params.applyTarget),
        notes: `Applied ${params.applyTarget === 'IMAGE_ALT' ? 'alt text' : 'caption'}`,
      },
    });

    // Get product title for stats computation
    const product = await this.prisma.product.findUnique({
      where: { id: params.productId },
      select: { title: true },
    });

    // Recompute stats
    const updatedStats = await this.computeProductMediaStats(
      params.productId,
      product?.title || ''
    );

    // Determine if this resolved any issues
    // For simplicity, we consider an issue resolved if the specific image now has good alt text
    const updatedImage = await this.prisma.productImage.findFirst({
      where: {
        productId: params.productId,
        externalId: draft.imageId,
      },
    });

    let issuesResolved = false;
    let issuesResolvedCount = 0;

    if (updatedImage && params.applyTarget === 'IMAGE_ALT') {
      const quality = classifyAltText(
        updatedImage.altText,
        product?.title || ''
      );
      if (quality === 'good') {
        issuesResolved = true;
        issuesResolvedCount = 1;
      }
    }

    return {
      success: true,
      updatedStats,
      issuesResolved,
      issuesResolvedCount,
    };
  }
}
