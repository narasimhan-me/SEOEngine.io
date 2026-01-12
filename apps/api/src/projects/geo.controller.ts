import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { GeoService, ProductGeoReadinessResponse } from './geo.service';
import { AiService } from '../ai/ai.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import {
  AiUsageQuotaService,
  AiUsageQuotaEvaluation,
} from '../ai/ai-usage-quota.service';
import { AiUsageLedgerService } from '../ai/ai-usage-ledger.service';
import {
  ANSWER_QUESTION_LABELS,
  computeGeoFixWorkKey,
  type GeoIssueType,
  type GeoCitationConfidenceLevel,
} from '@engineo/shared';
import { GeoIssueType as PrismaGeoIssueType, GeoCitationConfidenceLevel as PrismaGeoConfidence } from '@prisma/client';
import { GovernanceService } from './governance.service';
import { ApprovalsService } from './approvals.service';
import { AuditEventsService } from './audit-events.service';

class GeoFixPreviewDto {
  questionId: string;
  issueType: GeoIssueType;
}

class GeoFixApplyDto {
  @IsString()
  @IsNotEmpty()
  draftId: string;
}

function toPrismaIssueType(type: GeoIssueType): PrismaGeoIssueType {
  const mapping: Record<GeoIssueType, PrismaGeoIssueType> = {
    missing_direct_answer: 'MISSING_DIRECT_ANSWER',
    answer_too_vague: 'ANSWER_TOO_VAGUE',
    poor_answer_structure: 'POOR_ANSWER_STRUCTURE',
    answer_overly_promotional: 'ANSWER_OVERLY_PROMOTIONAL',
    missing_examples_or_facts: 'MISSING_EXAMPLES_OR_FACTS',
  };
  return mapping[type];
}

function fromPrismaConfidence(level: PrismaGeoConfidence): GeoCitationConfidenceLevel {
  const mapping: Record<PrismaGeoConfidence, GeoCitationConfidenceLevel> = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  };
  return mapping[level];
}

function toPrismaConfidence(level: GeoCitationConfidenceLevel): PrismaGeoConfidence {
  const mapping: Record<GeoCitationConfidenceLevel, PrismaGeoConfidence> = {
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
  };
  return mapping[level];
}

/**
 * [ROLES-3 FIXUP-3] GeoController
 * Updated with membership-aware access control:
 * - GET endpoints: any ProjectMember can view
 * - Preview endpoints: OWNER/EDITOR only (assertCanGenerateDrafts)
 * - Apply endpoints: OWNER-only (assertOwnerRole)
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class GeoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoService: GeoService,
    private readonly aiService: AiService,
    private readonly aiUsageQuotaService: AiUsageQuotaService,
    private readonly aiUsageLedgerService: AiUsageLedgerService,
    private readonly governanceService: GovernanceService,
    private readonly approvalsService: ApprovalsService,
    private readonly auditEventsService: AuditEventsService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  @Get('products/:productId/geo')
  async getProductGeo(
    @Request() req: any,
    @Param('productId') productId: string,
  ): Promise<ProductGeoReadinessResponse> {
    return this.geoService.getProductGeoReadiness(productId, req.user.id);
  }

  @Post('products/:productId/geo/preview')
  async previewGeoFix(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: GeoFixPreviewDto,
  ): Promise<{
    draft: {
      id: string;
      productId: string;
      questionId: string;
      issueType: GeoIssueType;
      draftPayload: { improvedAnswer: string };
      aiWorkKey: string;
      generatedWithAi: boolean;
      generatedAt: string;
      expiresAt?: string;
    };
    generatedWithAi: boolean;
    aiUsage?: { latencyMs: number };
  }> {
    const userId = req.user.id;

    if (!dto?.questionId || !dto?.issueType) {
      throw new BadRequestException('questionId and issueType are required');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { project: true, answerBlocks: true },
    });

    if (!product) throw new BadRequestException('Product not found');
    // [ROLES-3 FIXUP-3] OWNER/EDITOR only for draft generation
    await this.roleResolution.assertCanGenerateDrafts(product.projectId, userId);

    const block = (product.answerBlocks ?? []).find((b) => b.questionId === dto.questionId) || null;
    const updatedAtIso = block?.updatedAt ? block.updatedAt.toISOString() : 'none';

    const aiWorkKey = computeGeoFixWorkKey(
      product.projectId,
      productId,
      dto.questionId,
      dto.issueType,
      updatedAtIso,
    );

    const existingDraft = await this.prisma.productGeoFixDraft.findFirst({
      where: {
        aiWorkKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (existingDraft) {
      return {
        draft: {
          id: existingDraft.id,
          productId: existingDraft.productId,
          questionId: existingDraft.questionId,
          issueType: (existingDraft.issueType as any).toLowerCase() as GeoIssueType,
          draftPayload: existingDraft.draftPayload as any,
          aiWorkKey: existingDraft.aiWorkKey,
          generatedWithAi: existingDraft.generatedWithAi,
          generatedAt: existingDraft.createdAt.toISOString(),
          expiresAt: existingDraft.expiresAt?.toISOString(),
        },
        generatedWithAi: false,
      };
    }

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

    const questionText =
      (block?.questionText || (ANSWER_QUESTION_LABELS as any)[dto.questionId] || dto.questionId) as string;

    const start = Date.now();
    const improved = await this.aiService.generateGeoAnswerImprovement({
      product: {
        title: product.title,
        description: product.description || '',
        seoTitle: product.seoTitle || '',
        seoDescription: product.seoDescription || '',
      },
      questionText,
      questionId: dto.questionId,
      currentAnswer: block?.answerText || '',
      issueType: dto.issueType,
      factsUsed: block?.sourceFieldsUsed ?? [],
    });
    const latencyMs = Date.now() - start;

    const newDraft = await this.prisma.productGeoFixDraft.create({
      data: {
        productId,
        questionId: dto.questionId,
        issueType: toPrismaIssueType(dto.issueType),
        draftPayload: { improvedAnswer: improved.improvedAnswer },
        aiWorkKey,
        generatedWithAi: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // [ROLES-3-HARDEN-1] Include actorUserId for multi-user attribution
    await this.aiUsageLedgerService.recordAiRun({
      projectId: product.projectId,
      runType: 'GEO_FIX_PREVIEW',
      playbookId: 'geo-fix',
      rulesHash: 'geo-fix',
      productIds: [productId],
      productsProcessed: 1,
      productsSkipped: 0,
      draftsFresh: 1,
      draftsReused: 0,
      actorUserId: userId,
      metadata: {
        aiWorkKey,
        questionId: dto.questionId,
        issueType: dto.issueType,
        latencyMs,
      },
    });

    return {
      draft: {
        id: newDraft.id,
        productId: newDraft.productId,
        questionId: newDraft.questionId,
        issueType: dto.issueType,
        draftPayload: newDraft.draftPayload as any,
        aiWorkKey: newDraft.aiWorkKey,
        generatedWithAi: true,
        generatedAt: newDraft.createdAt.toISOString(),
        expiresAt: newDraft.expiresAt?.toISOString(),
      },
      generatedWithAi: true,
      aiUsage: { latencyMs },
    };
  }

  @Post('products/:productId/geo/apply')
  async applyGeoFix(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: GeoFixApplyDto,
  ): Promise<{
    success: boolean;
    issuesResolvedCount: number;
    before: { citationConfidenceLevel: GeoCitationConfidenceLevel; issuesCount: number };
    after: { citationConfidenceLevel: GeoCitationConfidenceLevel; issuesCount: number };
    geo: ProductGeoReadinessResponse;
  }> {
    const userId = req.user.id;

    if (!dto?.draftId) {
      throw new BadRequestException('draftId is required');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { project: true, answerBlocks: true },
    });

    if (!product) throw new BadRequestException('Product not found');
    // [ROLES-3 FIXUP-3] OWNER-only for apply mutations
    await this.roleResolution.assertOwnerRole(product.projectId, userId);

    const draft = await this.prisma.productGeoFixDraft.findUnique({
      where: { id: dto.draftId },
    });

    if (!draft) throw new BadRequestException('Draft not found');
    if (draft.productId !== productId) {
      throw new BadRequestException('Draft does not belong to this product');
    }

    // [ENTERPRISE-GEO-1] Check approval requirement
    const approvalRequired = await this.governanceService.isApprovalRequired(product.projectId);
    let approvalId: string | undefined;

    if (approvalRequired) {
      const approvalStatus = await this.approvalsService.hasValidApproval(
        product.projectId,
        'GEO_FIX_APPLY',
        dto.draftId,
      );

      if (!approvalStatus.valid) {
        // Return structured error with approval status for UI
        throw new BadRequestException({
          code: 'APPROVAL_REQUIRED',
          message: 'This action requires approval before it can be executed.',
          approvalStatus: approvalStatus.status ?? 'none',
          approvalId: approvalStatus.approvalId,
        });
      }

      approvalId = approvalStatus.approvalId;
    }

    const beforeGeo = await this.geoService.getProductGeoReadiness(productId, userId);
    const beforeIssueTypes = new Set(beforeGeo.issues.map((i) => `${i.issueType}:${i.questionId || ''}`));

    const payload = draft.draftPayload as any;
    const improvedAnswer = String(payload?.improvedAnswer ?? '').trim();
    if (!improvedAnswer) throw new BadRequestException('Draft payload missing improvedAnswer');

    const questionId = draft.questionId;
    const existingBlock = (product.answerBlocks ?? []).find((b) => b.questionId === questionId) || null;
    const questionText =
      existingBlock?.questionText ||
      ((ANSWER_QUESTION_LABELS as any)[questionId] as string) ||
      questionId;

    await this.prisma.answerBlock.upsert({
      where: { productId_questionId: { productId, questionId } },
      create: {
        productId,
        questionId,
        questionText,
        answerText: improvedAnswer,
        confidenceScore: 0.85,
        sourceType: 'geo_fix_ai',
        sourceFieldsUsed: existingBlock?.sourceFieldsUsed ?? [],
      },
      update: {
        questionText,
        answerText: improvedAnswer,
        confidenceScore: 0.85,
        sourceType: 'geo_fix_ai',
      },
    });

    const afterGeo = await this.geoService.getProductGeoReadiness(productId, userId);
    const afterIssueTypes = new Set(afterGeo.issues.map((i) => `${i.issueType}:${i.questionId || ''}`));

    const resolved: string[] = [];
    for (const key of beforeIssueTypes) {
      if (!afterIssueTypes.has(key)) resolved.push(key);
    }

    const beforeLevel = beforeGeo.citationConfidence.level;
    const afterLevel = afterGeo.citationConfidence.level;

    await this.prisma.productGeoFixApplication.create({
      data: {
        productId,
        draftId: draft.id,
        appliedByUserId: userId,
        questionId,
        issueType: draft.issueType,
        beforeConfidence: toPrismaConfidence(beforeLevel),
        afterConfidence: toPrismaConfidence(afterLevel),
        beforeIssuesCount: beforeGeo.issues.length,
        afterIssuesCount: afterGeo.issues.length,
        issuesResolvedCount: resolved.length,
        resolvedIssueTypes: resolved,
      },
    });

    // [ENTERPRISE-GEO-1] Mark approval as consumed and log audit event
    if (approvalId) {
      await this.approvalsService.markConsumed(approvalId);
    }

    await this.auditEventsService.logApplyExecuted(
      product.projectId,
      userId,
      'GEO_FIX_APPLY',
      dto.draftId,
      {
        productId,
        questionId,
        issuesResolvedCount: resolved.length,
        beforeConfidence: beforeLevel,
        afterConfidence: afterLevel,
      },
    );

    return {
      success: true,
      issuesResolvedCount: resolved.length,
      before: { citationConfidenceLevel: beforeLevel, issuesCount: beforeGeo.issues.length },
      after: { citationConfidenceLevel: afterLevel, issuesCount: afterGeo.issues.length },
      geo: afterGeo,
    };
  }
}
