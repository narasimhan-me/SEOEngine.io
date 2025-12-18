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
import { OffsiteSignalsService } from './offsite-signals.service';
import { AiService } from '../ai/ai.service';
import {
  AiUsageQuotaService,
  AiUsageQuotaEvaluation,
} from '../ai/ai-usage-quota.service';
import { AiUsageLedgerService } from '../ai/ai-usage-ledger.service';
import {
  OffsiteGapType,
  OffsiteSignalType,
  OffsiteFixDraftType,
  OffsiteFixApplyTarget,
  OffsiteFixPreviewResponse,
  OffsiteFixApplyResponse,
  ProjectOffsiteSignalsResponse,
  ProjectOffsiteCoverage,
  computeOffsiteFixWorkKey,
} from '@engineo/shared';
import {
  OffsiteGapType as PrismaGapType,
  OffsiteSignalType as PrismaSignalType,
  OffsiteFixDraftType as PrismaDraftType,
  OffsiteFixApplyTarget as PrismaApplyTarget,
} from '@prisma/client';

/**
 * DTO for preview request
 */
class OffsiteFixPreviewDto {
  gapType: OffsiteGapType;
  signalType: OffsiteSignalType;
  focusKey: string;
  draftType: OffsiteFixDraftType;
}

/**
 * DTO for apply request
 */
class OffsiteFixApplyDto {
  draftId: string;
  applyTarget: OffsiteFixApplyTarget;
}

/**
 * OffsiteSignalsController
 *
 * REST endpoints for the Off-site Signals pillar (OFFSITE-1):
 * - GET  /projects/:projectId/offsite-signals — Project off-site data
 * - GET  /projects/:projectId/offsite-signals/scorecard — Project scorecard only
 * - POST /projects/:projectId/offsite-signals/preview — Preview fix draft
 * - POST /projects/:projectId/offsite-signals/apply — Apply fix draft
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class OffsiteSignalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offsiteSignalsService: OffsiteSignalsService,
    private readonly aiService: AiService,
    private readonly aiUsageQuotaService: AiUsageQuotaService,
    private readonly aiUsageLedgerService: AiUsageLedgerService,
  ) {}

  // ============================================================================
  // Type Mapping Helpers
  // ============================================================================

  private toPrismaGapType(type: OffsiteGapType): PrismaGapType {
    const mapping: Record<OffsiteGapType, PrismaGapType> = {
      missing_brand_mentions: 'MISSING_BRAND_MENTIONS',
      missing_trust_proof: 'MISSING_TRUST_PROOF',
      missing_authoritative_listing: 'MISSING_AUTHORITATIVE_LISTING',
      competitor_has_offsite_signal: 'COMPETITOR_HAS_OFFSITE_SIGNAL',
    };
    return mapping[type];
  }

  private fromPrismaGapType(type: PrismaGapType): OffsiteGapType {
    const mapping: Record<PrismaGapType, OffsiteGapType> = {
      MISSING_BRAND_MENTIONS: 'missing_brand_mentions',
      MISSING_TRUST_PROOF: 'missing_trust_proof',
      MISSING_AUTHORITATIVE_LISTING: 'missing_authoritative_listing',
      COMPETITOR_HAS_OFFSITE_SIGNAL: 'competitor_has_offsite_signal',
    };
    return mapping[type];
  }

  private toPrismaSignalType(type: OffsiteSignalType): PrismaSignalType {
    const mapping: Record<OffsiteSignalType, PrismaSignalType> = {
      brand_mention: 'BRAND_MENTION',
      authoritative_listing: 'AUTHORITATIVE_LISTING',
      trust_proof: 'TRUST_PROOF',
      reference_content: 'REFERENCE_CONTENT',
    };
    return mapping[type];
  }

  private fromPrismaSignalType(type: PrismaSignalType): OffsiteSignalType {
    const mapping: Record<PrismaSignalType, OffsiteSignalType> = {
      BRAND_MENTION: 'brand_mention',
      AUTHORITATIVE_LISTING: 'authoritative_listing',
      TRUST_PROOF: 'trust_proof',
      REFERENCE_CONTENT: 'reference_content',
    };
    return mapping[type];
  }

  private toPrismaDraftType(type: OffsiteFixDraftType): PrismaDraftType {
    const mapping: Record<OffsiteFixDraftType, PrismaDraftType> = {
      outreach_email: 'OUTREACH_EMAIL',
      pr_pitch: 'PR_PITCH',
      brand_profile_snippet: 'BRAND_PROFILE_SNIPPET',
      review_request_copy: 'REVIEW_REQUEST_COPY',
    };
    return mapping[type];
  }

  private fromPrismaDraftType(type: PrismaDraftType): OffsiteFixDraftType {
    const mapping: Record<PrismaDraftType, OffsiteFixDraftType> = {
      OUTREACH_EMAIL: 'outreach_email',
      PR_PITCH: 'pr_pitch',
      BRAND_PROFILE_SNIPPET: 'brand_profile_snippet',
      REVIEW_REQUEST_COPY: 'review_request_copy',
    };
    return mapping[type];
  }

  private toPrismaApplyTarget(target: OffsiteFixApplyTarget): PrismaApplyTarget {
    const mapping: Record<OffsiteFixApplyTarget, PrismaApplyTarget> = {
      NOTES: 'NOTES',
      CONTENT_WORKSPACE: 'CONTENT_WORKSPACE',
      OUTREACH_DRAFTS: 'OUTREACH_DRAFTS',
    };
    return mapping[target];
  }

  // ============================================================================
  // Project Endpoints
  // ============================================================================

  /**
   * GET /projects/:projectId/offsite-signals
   * Returns project-level off-site signals, coverage, and gaps.
   */
  @Get('projects/:projectId/offsite-signals')
  async getProjectOffsiteSignals(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ): Promise<ProjectOffsiteSignalsResponse> {
    const userId = req.user.id;
    return this.offsiteSignalsService.getProjectOffsiteData(projectId, userId);
  }

  /**
   * GET /projects/:projectId/offsite-signals/scorecard
   * Returns only the project-level scorecard for use by DEO Overview.
   */
  @Get('projects/:projectId/offsite-signals/scorecard')
  async getProjectOffsiteScorecard(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ): Promise<ProjectOffsiteCoverage> {
    const userId = req.user.id;

    // Verify project access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.offsiteSignalsService.getProjectCoverage(projectId);
  }

  /**
   * POST /projects/:projectId/offsite-signals/preview
   * Generate or retrieve a cached fix draft for an off-site gap.
   *
   * Draft-first pattern (CACHE/REUSE v2):
   * 1. Compute deterministic aiWorkKey
   * 2. Check for existing unexpired draft with same key
   * 3. If found, return reused draft (no AI call)
   * 4. Otherwise, check AI quota, generate new draft, persist
   */
  @Post('projects/:projectId/offsite-signals/preview')
  async previewOffsiteFix(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: OffsiteFixPreviewDto,
  ): Promise<OffsiteFixPreviewResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.gapType || !dto.signalType || !dto.focusKey || !dto.draftType) {
      throw new BadRequestException(
        'gapType, signalType, focusKey, and draftType are required',
      );
    }

    // Load project and verify ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Compute deterministic work key for CACHE/REUSE v2
    const aiWorkKey = computeOffsiteFixWorkKey(
      projectId,
      dto.gapType,
      dto.signalType,
      dto.focusKey,
      dto.draftType,
    );

    // Check for existing unexpired draft
    const existingDraft = await this.prisma.projectOffsiteFixDraft.findFirst({
      where: {
        aiWorkKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (existingDraft) {
      // Return reused draft — no AI call
      // eslint-disable-next-line no-console
      console.log('[OffsiteSignals] preview.reused', {
        projectId,
        gapType: dto.gapType,
        signalType: dto.signalType,
        aiWorkKey,
      });

      return {
        draft: {
          id: existingDraft.id,
          projectId: existingDraft.projectId,
          productId: existingDraft.productId || undefined,
          gapType: this.fromPrismaGapType(existingDraft.gapType),
          signalType: this.fromPrismaSignalType(existingDraft.signalType),
          focusKey: existingDraft.focusKey,
          draftType: this.fromPrismaDraftType(existingDraft.draftType),
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
        projectId,
        action: 'PREVIEW_GENERATE',
      });

    if (quotaEval.status === 'blocked') {
      throw new ForbiddenException(
        'AI usage quota exceeded. Please wait until next month or upgrade your plan.',
      );
    }

    // Generate AI draft
    // eslint-disable-next-line no-console
    console.log('[OffsiteSignals] preview.generating', {
      projectId,
      gapType: dto.gapType,
      signalType: dto.signalType,
      focusKey: dto.focusKey,
      draftType: dto.draftType,
      aiWorkKey,
    });

    const startTime = Date.now();
    let draftPayload: Record<string, unknown>;

    try {
      // Generate the appropriate draft type using AI service helpers
      if (dto.draftType === 'outreach_email') {
        const result = await this.aiService.generateOutreachEmailDraft({
          brandName: project.name,
          domain: project.domain || '',
          gapType: dto.gapType,
          signalType: dto.signalType,
          focusKey: dto.focusKey,
        });
        draftPayload = {
          subject: result.subject,
          body: result.body,
        };
      } else if (dto.draftType === 'pr_pitch') {
        const result = await this.aiService.generatePrPitchDraft({
          brandName: project.name,
          domain: project.domain || '',
          signalType: dto.signalType,
          focusKey: dto.focusKey,
        });
        draftPayload = {
          subject: result.subject,
          body: result.body,
        };
      } else if (dto.draftType === 'brand_profile_snippet') {
        const result = await this.aiService.generateBrandProfileSnippet({
          brandName: project.name,
          domain: project.domain || '',
        });
        draftPayload = {
          summary: result.summary,
          bullets: result.bullets,
        };
      } else if (dto.draftType === 'review_request_copy') {
        const result = await this.aiService.generateReviewRequestCopy({
          brandName: project.name,
          focusKey: dto.focusKey,
        });
        draftPayload = {
          message: result.message,
          channel: result.channel,
        };
      } else {
        throw new BadRequestException(`Unknown draft type: ${dto.draftType}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[OffsiteSignals] preview.generation.failed', {
        projectId,
        gapType: dto.gapType,
        signalType: dto.signalType,
        error,
      });
      throw error;
    }

    const latencyMs = Date.now() - startTime;

    // Persist the generated draft
    const newDraft = await this.prisma.projectOffsiteFixDraft.create({
      data: {
        projectId,
        gapType: this.toPrismaGapType(dto.gapType),
        signalType: this.toPrismaSignalType(dto.signalType),
        focusKey: dto.focusKey,
        draftType: this.toPrismaDraftType(dto.draftType),
        draftPayload: draftPayload as object,
        aiWorkKey,
        generatedWithAi: true,
        // Set expiration (7 days)
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Record AI usage in ledger
    await this.aiUsageLedgerService.recordAiRun({
      projectId,
      runType: 'INTENT_FIX_PREVIEW', // Reuse existing type per spec
      productIds: [],
      productsProcessed: 0,
      productsSkipped: 0,
      draftsFresh: 1,
      draftsReused: 0,
      metadata: {
        playbookId: 'offsite-signals-fix',
        pillar: 'offsite_signals',
        gapType: dto.gapType,
        signalType: dto.signalType,
        focusKey: dto.focusKey,
        draftType: dto.draftType,
        latencyMs,
        aiWorkKey,
      },
    });

    // eslint-disable-next-line no-console
    console.log('[OffsiteSignals] preview.generated', {
      projectId,
      gapType: dto.gapType,
      signalType: dto.signalType,
      draftId: newDraft.id,
      latencyMs,
    });

    return {
      draft: {
        id: newDraft.id,
        projectId: newDraft.projectId,
        productId: newDraft.productId || undefined,
        gapType: this.fromPrismaGapType(newDraft.gapType),
        signalType: this.fromPrismaSignalType(newDraft.signalType),
        focusKey: newDraft.focusKey,
        draftType: this.fromPrismaDraftType(newDraft.draftType),
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
   * POST /projects/:projectId/offsite-signals/apply
   * Apply a draft fix.
   *
   * No AI call — just persists the draft content to the appropriate storage.
   */
  @Post('projects/:projectId/offsite-signals/apply')
  async applyOffsiteFix(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: OffsiteFixApplyDto,
  ): Promise<OffsiteFixApplyResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.draftId || !dto.applyTarget) {
      throw new BadRequestException('draftId and applyTarget are required');
    }

    // Load project and verify ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Load the draft
    const draft = await this.prisma.projectOffsiteFixDraft.findUnique({
      where: { id: dto.draftId },
    });

    if (!draft) {
      throw new BadRequestException('Draft not found');
    }

    if (draft.projectId !== projectId) {
      throw new BadRequestException('Draft does not belong to this project');
    }

    // eslint-disable-next-line no-console
    console.log('[OffsiteSignals] apply.started', {
      projectId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
    });

    // Apply based on target (no AI call)
    // For v1, we just record the application and let the user manage the content manually
    // In future versions, these could integrate with specific storage systems

    // Record the application
    await this.prisma.projectOffsiteFixApplication.create({
      data: {
        projectId,
        productId: draft.productId,
        draftId: draft.id,
        appliedByUserId: userId,
        gapType: draft.gapType,
        signalType: draft.signalType,
        focusKey: draft.focusKey,
        applyTarget: this.toPrismaApplyTarget(dto.applyTarget),
        notes: `Applied as ${dto.applyTarget}`,
      },
    });

    // Invalidate and recompute coverage to check if gap is addressed
    await this.offsiteSignalsService.invalidateCoverage(projectId);
    const updatedCoverage = await this.offsiteSignalsService.computeProjectCoverage(projectId);

    // For v1, applying a draft doesn't immediately resolve the issue
    // (actual signal presence requires external validation)
    // But we mark that an action was taken
    const issuesResolved = false;
    const issuesAffectedCount = 1;

    // eslint-disable-next-line no-console
    console.log('[OffsiteSignals] apply.completed', {
      projectId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
      issuesResolved,
    });

    return {
      success: true,
      updatedCoverage,
      issuesResolved,
      issuesAffectedCount,
    };
  }
}
