import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { LocalDiscoveryService } from './local-discovery.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { AiService } from '../ai/ai.service';
import {
  AiUsageQuotaService,
  AiUsageQuotaEvaluation,
} from '../ai/ai-usage-quota.service';
import { AiUsageLedgerService } from '../ai/ai-usage-ledger.service';
import {
  LocalGapType,
  LocalSignalType,
  LocalFixDraftType,
  LocalFixApplyTarget,
  LocalFixPreviewResponse,
  LocalFixApplyResponse,
  ProjectLocalDiscoveryResponse,
  LocalDiscoveryScorecard,
  ProjectLocalConfig,
  computeLocalFixWorkKey,
} from '@engineo/shared';
import {
  LocalGapType as PrismaGapType,
  LocalSignalType as PrismaSignalType,
  LocalFixDraftType as PrismaDraftType,
  LocalFixApplyTarget as PrismaApplyTarget,
} from '@prisma/client';

/**
 * DTO for preview request
 */
class LocalFixPreviewDto {
  gapType: LocalGapType;
  signalType: LocalSignalType;
  focusKey: string;
  draftType: LocalFixDraftType;
  productId?: string;
}

/**
 * DTO for apply request
 */
class LocalFixApplyDto {
  draftId: string;
  applyTarget: LocalFixApplyTarget;
}

/**
 * DTO for config update
 */
class UpdateLocalConfigDto {
  hasPhysicalLocation?: boolean;
  serviceAreaDescription?: string;
  enabled?: boolean;
}

/**
 * LocalDiscoveryController
 *
 * REST endpoints for the Local Discovery pillar (LOCAL-1):
 * - GET  /projects/:projectId/local-discovery — Project local discovery data
 * - GET  /projects/:projectId/local-discovery/scorecard — Project scorecard only
 * - GET  /projects/:projectId/local-discovery/config — Get local config
 * - PUT  /projects/:projectId/local-discovery/config — Update local config
 * - POST /projects/:projectId/local-discovery/preview — Preview fix draft
 * - POST /projects/:projectId/local-discovery/apply — Apply fix draft
 *
 * [ROLES-3 FIXUP-3] Updated with membership-aware access control:
 * - GET endpoints: any ProjectMember can view
 * - Preview endpoints: OWNER/EDITOR only
 * - Apply/config endpoints: OWNER-only
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class LocalDiscoveryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly localDiscoveryService: LocalDiscoveryService,
    private readonly aiService: AiService,
    private readonly aiUsageQuotaService: AiUsageQuotaService,
    private readonly aiUsageLedgerService: AiUsageLedgerService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  // ============================================================================
  // Type Mapping Helpers
  // ============================================================================

  private toPrismaGapType(type: LocalGapType): PrismaGapType {
    const mapping: Record<LocalGapType, PrismaGapType> = {
      missing_local_intent_coverage: 'MISSING_LOCAL_INTENT_COVERAGE',
      missing_location_content: 'MISSING_LOCATION_CONTENT',
      unclear_service_area: 'UNCLEAR_SERVICE_AREA',
      missing_local_trust_signal: 'MISSING_LOCAL_TRUST_SIGNAL',
    };
    return mapping[type];
  }

  private fromPrismaGapType(type: PrismaGapType): LocalGapType {
    const mapping: Record<PrismaGapType, LocalGapType> = {
      MISSING_LOCAL_INTENT_COVERAGE: 'missing_local_intent_coverage',
      MISSING_LOCATION_CONTENT: 'missing_location_content',
      UNCLEAR_SERVICE_AREA: 'unclear_service_area',
      MISSING_LOCAL_TRUST_SIGNAL: 'missing_local_trust_signal',
    };
    return mapping[type];
  }

  private toPrismaSignalType(type: LocalSignalType): PrismaSignalType {
    const mapping: Record<LocalSignalType, PrismaSignalType> = {
      location_presence: 'LOCATION_PRESENCE',
      local_intent_coverage: 'LOCAL_INTENT_COVERAGE',
      local_trust_signals: 'LOCAL_TRUST_SIGNALS',
      local_schema_readiness: 'LOCAL_SCHEMA_READINESS',
    };
    return mapping[type];
  }

  private fromPrismaSignalType(type: PrismaSignalType): LocalSignalType {
    const mapping: Record<PrismaSignalType, LocalSignalType> = {
      LOCATION_PRESENCE: 'location_presence',
      LOCAL_INTENT_COVERAGE: 'local_intent_coverage',
      LOCAL_TRUST_SIGNALS: 'local_trust_signals',
      LOCAL_SCHEMA_READINESS: 'local_schema_readiness',
    };
    return mapping[type];
  }

  private toPrismaDraftType(type: LocalFixDraftType): PrismaDraftType {
    const mapping: Record<LocalFixDraftType, PrismaDraftType> = {
      local_answer_block: 'LOCAL_ANSWER_BLOCK',
      city_section: 'CITY_SECTION',
      service_area_description: 'SERVICE_AREA_DESCRIPTION',
    };
    return mapping[type];
  }

  private fromPrismaDraftType(type: PrismaDraftType): LocalFixDraftType {
    const mapping: Record<PrismaDraftType, LocalFixDraftType> = {
      LOCAL_ANSWER_BLOCK: 'local_answer_block',
      CITY_SECTION: 'city_section',
      SERVICE_AREA_DESCRIPTION: 'service_area_description',
    };
    return mapping[type];
  }

  private toPrismaApplyTarget(target: LocalFixApplyTarget): PrismaApplyTarget {
    const mapping: Record<LocalFixApplyTarget, PrismaApplyTarget> = {
      ANSWER_BLOCK: 'ANSWER_BLOCK',
      CONTENT_SECTION: 'CONTENT_SECTION',
    };
    return mapping[target];
  }

  // ============================================================================
  // Project Endpoints
  // ============================================================================

  /**
   * GET /projects/:projectId/local-discovery
   * Returns project-level local discovery data including scorecard, signals, and gaps.
   */
  @Get('projects/:projectId/local-discovery')
  async getProjectLocalDiscovery(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ): Promise<ProjectLocalDiscoveryResponse> {
    const userId = req.user.id;
    return this.localDiscoveryService.getProjectLocalData(projectId, userId);
  }

  /**
   * GET /projects/:projectId/local-discovery/scorecard
   * Returns only the project-level scorecard for use by DEO Overview.
   */
  @Get('projects/:projectId/local-discovery/scorecard')
  async getProjectLocalScorecard(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ): Promise<LocalDiscoveryScorecard> {
    const userId = req.user.id;

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    return this.localDiscoveryService.getProjectScorecard(projectId);
  }

  /**
   * GET /projects/:projectId/local-discovery/config
   * Returns the project's local configuration settings.
   */
  @Get('projects/:projectId/local-discovery/config')
  async getProjectLocalConfig(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ): Promise<ProjectLocalConfig | null> {
    const userId = req.user.id;

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view config)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    return this.localDiscoveryService.getProjectLocalConfig(projectId);
  }

  /**
   * PUT /projects/:projectId/local-discovery/config
   * Updates the project's local configuration settings.
   */
  @Put('projects/:projectId/local-discovery/config')
  async updateProjectLocalConfig(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateLocalConfigDto,
  ): Promise<ProjectLocalConfig> {
    const userId = req.user.id;

    // [ROLES-3 FIXUP-3] OWNER-only for config mutations
    await this.roleResolution.assertOwnerRole(projectId, userId);

    return this.localDiscoveryService.updateProjectLocalConfig(projectId, dto);
  }

  /**
   * POST /projects/:projectId/local-discovery/preview
   * Generate or retrieve a cached fix draft for a local gap.
   *
   * Draft-first pattern (CACHE/REUSE v2):
   * 1. Compute deterministic aiWorkKey
   * 2. Check for existing unexpired draft with same key
   * 3. If found, return reused draft (no AI call)
   * 4. Otherwise, check AI quota, generate new draft, persist
   */
  @Post('projects/:projectId/local-discovery/preview')
  async previewLocalFix(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: LocalFixPreviewDto,
  ): Promise<LocalFixPreviewResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.gapType || !dto.signalType || !dto.focusKey || !dto.draftType) {
      throw new BadRequestException(
        'gapType, signalType, focusKey, and draftType are required',
      );
    }

    // Load project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // [ROLES-3 FIXUP-3] OWNER/EDITOR only for draft generation
    await this.roleResolution.assertCanGenerateDrafts(projectId, userId);

    // Compute deterministic work key for CACHE/REUSE v2
    const aiWorkKey = computeLocalFixWorkKey(
      projectId,
      dto.productId || null,
      dto.gapType,
      dto.signalType,
      dto.focusKey,
      dto.draftType,
    );

    // Check for existing unexpired draft
    const existingDraft = await this.prisma.projectLocalFixDraft.findFirst({
      where: {
        aiWorkKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (existingDraft) {
      // Return reused draft — no AI call
      console.log('[LocalDiscovery] preview.reused', {
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
    console.log('[LocalDiscovery] preview.generating', {
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
      if (dto.draftType === 'local_answer_block') {
        const result = await this.aiService.generateLocalAnswerBlockDraft({
          brandName: project.name,
          domain: project.domain || '',
          signalType: dto.signalType,
          focusKey: dto.focusKey,
        });
        draftPayload = {
          question: result.question,
          answer: result.answer,
        };
      } else if (dto.draftType === 'city_section') {
        const result = await this.aiService.generateCitySectionDraft({
          brandName: project.name,
          domain: project.domain || '',
          focusKey: dto.focusKey,
        });
        draftPayload = {
          heading: result.heading,
          body: result.body,
        };
      } else if (dto.draftType === 'service_area_description') {
        const result = await this.aiService.generateServiceAreaDescriptionDraft({
          brandName: project.name,
          domain: project.domain || '',
          focusKey: dto.focusKey,
        });
        draftPayload = {
          summary: result.summary,
          bullets: result.bullets,
        };
      } else {
        throw new BadRequestException(`Unknown draft type: ${dto.draftType}`);
      }
    } catch (error) {
      console.error('[LocalDiscovery] preview.generation.failed', {
        projectId,
        gapType: dto.gapType,
        signalType: dto.signalType,
        error,
      });
      throw error;
    }

    const latencyMs = Date.now() - startTime;

    // Persist the generated draft
    const newDraft = await this.prisma.projectLocalFixDraft.create({
      data: {
        projectId,
        productId: dto.productId,
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
    // [ROLES-3-HARDEN-1] Include actorUserId for multi-user attribution
    await this.aiUsageLedgerService.recordAiRun({
      projectId,
      runType: 'INTENT_FIX_PREVIEW', // Reuse existing type per spec
      productIds: [],
      productsProcessed: 0,
      productsSkipped: 0,
      draftsFresh: 1,
      draftsReused: 0,
      actorUserId: userId,
      metadata: {
        playbookId: 'local-discovery-fix',
        pillar: 'local_discovery',
        gapType: dto.gapType,
        signalType: dto.signalType,
        focusKey: dto.focusKey,
        draftType: dto.draftType,
        latencyMs,
        aiWorkKey,
      },
    });

    console.log('[LocalDiscovery] preview.generated', {
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
   * POST /projects/:projectId/local-discovery/apply
   * Apply a draft fix.
   *
   * No AI call — just persists the draft content to the appropriate storage.
   */
  @Post('projects/:projectId/local-discovery/apply')
  async applyLocalFix(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: LocalFixApplyDto,
  ): Promise<LocalFixApplyResponse> {
    const userId = req.user.id;

    // Validate required fields
    if (!dto.draftId || !dto.applyTarget) {
      throw new BadRequestException('draftId and applyTarget are required');
    }

    // [ROLES-3 FIXUP-3] OWNER-only for apply mutations
    await this.roleResolution.assertOwnerRole(projectId, userId);

    // Load the draft
    const draft = await this.prisma.projectLocalFixDraft.findUnique({
      where: { id: dto.draftId },
    });

    if (!draft) {
      throw new BadRequestException('Draft not found');
    }

    if (draft.projectId !== projectId) {
      throw new BadRequestException('Draft does not belong to this project');
    }

    console.log('[LocalDiscovery] apply.started', {
      projectId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
    });

    // Record the application
    await this.prisma.projectLocalFixApplication.create({
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

    // Invalidate and recompute scorecard
    await this.localDiscoveryService.invalidateCoverage(projectId);
    const updatedScorecard =
      await this.localDiscoveryService.computeProjectScorecard(projectId);

    // For v1, applying a draft doesn't immediately resolve the issue
    // (actual signal presence requires further content updates)
    const issuesResolved = false;
    const issuesAffectedCount = 1;

    console.log('[LocalDiscovery] apply.completed', {
      projectId,
      draftId: dto.draftId,
      applyTarget: dto.applyTarget,
      issuesResolved,
    });

    return {
      success: true,
      updatedScorecard,
      issuesResolved,
      issuesAffectedCount,
    };
  }
}
