import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { AiService } from './ai.service';
import { RoleResolutionService } from '../common/role-resolution.service';

type SupportedIssueType = 'missing_seo_title' | 'missing_seo_description';

/**
 * [ROLES-3 FIXUP-4] ProductIssueFixService with membership-aware access control:
 * - Fix operations are OWNER-only (assertOwnerRole) since they mutate data
 */
@Injectable()
export class ProductIssueFixService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly entitlementsService: EntitlementsService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  /**
   * Run a one-click AI fix for Issue Engine Lite metadata issues:
   * - missing_seo_title
   * - missing_seo_description
   *
   * Validates ownership, enforces plan/entitlement gating, respects daily AI limits,
   * and persists the generated SEO field for the targeted product.
   */
  async fixMissingSeoFieldFromIssue(input: {
    userId: string;
    productId: string;
    issueType: SupportedIssueType;
  }): Promise<{
    productId: string;
    projectId: string;
    issueType: SupportedIssueType;
    updated: boolean;
    field: 'seoTitle' | 'seoDescription';
    reason?: string;
  }> {
    const { userId, productId, issueType } = input;

    if (
      issueType !== 'missing_seo_title' &&
      issueType !== 'missing_seo_description'
    ) {
      throw new BadRequestException('Unsupported issue type for AI fix');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // [ROLES-3 FIXUP-4] OWNER-only for apply/mutation operations
    await this.roleResolution.assertOwnerRole(product.projectId, userId);

    // Enforce plan-level entitlement: free plan can see issues but cannot run Fix now.
    const planId = await this.entitlementsService.getUserPlan(userId);
    if (planId === 'free') {
      throw new ForbiddenException({
        message:
          'AI-powered SEO fixes are available on Pro and Business plans. Upgrade your plan to unlock Fix now.',
        error: 'ENTITLEMENTS_LIMIT_REACHED',
        code: 'ENTITLEMENTS_LIMIT_REACHED',
        feature: 'ai_issue_fixes',
        plan: planId,
        allowed: 0,
        current: 0,
      });
    }

    const titleIsMissing =
      !product.seoTitle || product.seoTitle.trim() === '';
    const descriptionIsMissing =
      !product.seoDescription || product.seoDescription.trim() === '';

    const targetField =
      issueType === 'missing_seo_title' ? 'seoTitle' : 'seoDescription';

    if (
      (issueType === 'missing_seo_title' && !titleIsMissing) ||
      (issueType === 'missing_seo_description' && !descriptionIsMissing)
    ) {
      return {
        productId: product.id,
        projectId: product.projectId,
        issueType,
        updated: false,
        field: targetField,
        reason: 'already_has_value',
      };
    }

    // Enforce daily AI limits for manual product optimization-style operations.
    let planForLimit: string | undefined;
    let limit: number | undefined;
    let dailyCount: number | undefined;

    try {
      const result =
        await this.entitlementsService.ensureWithinDailyAiLimit(
          userId,
          product.projectId,
          'product_optimize',
        );
      planForLimit = result.planId;
      limit = result.limit;
      dailyCount = result.dailyCount;
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        {
          message:
            'Daily AI limit reached for this workspace. Upgrade your plan to unlock more AI-powered fixes.',
          error: 'AI_DAILY_LIMIT_REACHED',
          code: 'AI_DAILY_LIMIT_REACHED',
          feature: 'product_optimize',
          plan: planId,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // eslint-disable-next-line no-console
    console.log('[AI][IssueAiFix] fix_product_metadata.started', {
      userId,
      projectId: product.projectId,
      productId: product.id,
      issueType,
      planId: planForLimit ?? planId,
      limit,
      dailyCount,
    });

    let providerCalled = false;
    let recordedUsage = false;

    try {
      providerCalled = true;

      const descriptionText =
        (product.seoDescription ?? product.description ?? '')?.toString() ||
        '';

      const metadata = await this.aiService.generateMetadata({
        url: product.externalId ?? product.id,
        currentTitle: (product.seoTitle ?? product.title ?? '').toString(),
        currentDescription: descriptionText,
        pageTextSnippet: descriptionText.slice(0, 800),
      });

      await this.entitlementsService.recordAiUsage(
        userId,
        product.projectId,
        'product_optimize',
      );
      recordedUsage = true;

      const updateData: { seoTitle?: string | null; seoDescription?: string | null } =
        {};

      if (issueType === 'missing_seo_title') {
        const candidateTitle = metadata.title?.trim();
        if (candidateTitle) {
          updateData.seoTitle = candidateTitle;
        }
      } else if (issueType === 'missing_seo_description') {
        const candidateDescription = metadata.description?.trim();
        if (candidateDescription) {
          updateData.seoDescription = candidateDescription;
        }
      }

      if (!updateData.seoTitle && !updateData.seoDescription) {
        // eslint-disable-next-line no-console
        console.log('[AI][IssueAiFix] fix_product_metadata.no_suggestion', {
          userId,
          projectId: product.projectId,
          productId: product.id,
          issueType,
        });
        return {
          productId: product.id,
          projectId: product.projectId,
          issueType,
          updated: false,
          field: targetField,
          reason: 'no_suggestion',
        };
      }

      await this.prisma.product.update({
        where: { id: product.id },
        data: updateData,
      });

      // eslint-disable-next-line no-console
      console.log('[AI][IssueAiFix] fix_product_metadata.succeeded', {
        userId,
        projectId: product.projectId,
        productId: product.id,
        issueType,
        fieldUpdated: targetField,
        planId: planForLimit ?? planId,
      });

      return {
        productId: product.id,
        projectId: product.projectId,
        issueType,
        updated: true,
        field: targetField,
      };
    } catch (error) {
      if (providerCalled && !recordedUsage) {
        await this.entitlementsService.recordAiUsage(
          userId,
          product.projectId,
          'product_optimize',
        );
        recordedUsage = true;
      }

      // eslint-disable-next-line no-console
      console.error('[AI][IssueAiFix] fix_product_metadata.failed', {
        userId,
        projectId: product.projectId,
        productId: product.id,
        issueType,
        planId: planForLimit ?? planId,
        limit,
        dailyCount,
        error,
      });

      throw error;
    }
  }
}

