import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import {
  ESTIMATED_METADATA_TOKENS_PER_CALL,
  TokenUsageService,
} from '../ai/token-usage.service';
import { AiService } from '../ai/ai.service';
import { PlanId } from '../billing/plans';
import { AiUsageQuotaService } from '../ai/ai-usage-quota.service';

export type AutomationPlaybookId = 'missing_seo_title' | 'missing_seo_description';

export type AutomationPlaybookDraftStatus = 'READY' | 'PARTIAL' | 'FAILED' | 'EXPIRED';

export interface PlaybookDraftCounts {
  affectedTotal: number;
  draftGenerated: number;
  noSuggestionCount: number;
}

export interface PlaybookRulesV1 {
  enabled: boolean;
  findReplace?: {
    find: string;
    replace: string;
    caseSensitive?: boolean;
  };
  prefix?: string;
  suffix?: string;
  maxLength?: number;
  forbiddenPhrases?: string[];
  mode?: 'warn' | 'enforce';
}

export interface PlaybookEstimate {
  projectId: string;
  playbookId: AutomationPlaybookId;
  totalAffectedProducts: number;
  estimatedTokens: number;
  planId: PlanId;
  eligible: boolean;
  canProceed: boolean;
  reasons: string[];
  aiDailyLimit: {
    limit: number;
    used: number;
    remaining: number;
  };
  /**
   * Server-issued scope identifier. Must be returned by the client when calling
   * the Apply endpoint to ensure the apply targets the exact same set of
   * products that was previewed/estimated.
   */
  scopeId: string;
  /**
   * Deterministic hash of the rules configuration used for this estimate.
   * Ties preview drafts and apply operations to a single rules snapshot.
   */
  rulesHash: string;
  /**
   * Status of the latest draft for this (projectId, playbookId, scopeId, rulesHash)
   * combination, if any.
   */
  draftStatus?: AutomationPlaybookDraftStatus;
  /**
   * Aggregated counts for the latest draft (affectedTotal, draftGenerated, noSuggestionCount),
   * when a draft exists.
   */
  draftCounts?: PlaybookDraftCounts;
}

export type PlaybookApplyItemStatus =
  | 'UPDATED'
  | 'SKIPPED'
  | 'FAILED'
  | 'LIMIT_REACHED';

export interface PlaybookApplyItemResult {
  productId: string;
  status: PlaybookApplyItemStatus;
  message: string;
  updatedFields?: {
    seoTitle?: boolean;
    seoDescription?: boolean;
  };
}

export interface PlaybookApplyResult {
  projectId: string;
  playbookId: AutomationPlaybookId;
  totalAffectedProducts: number;
  attemptedCount: number;
  updatedCount: number;
  skippedCount: number;
  limitReached: boolean;
  stopped: boolean;
  stoppedAtProductId?: string;
  failureReason?: string;
  results: PlaybookApplyItemResult[];
}

export interface PlaybookPreviewSample {
  productId: string;
  field: 'seoTitle' | 'seoDescription';
  productTitle: string;
  currentTitle: string;
  currentDescription: string;
  rawSuggestion: string;
  finalSuggestion: string;
  ruleWarnings: string[];
}

export interface PlaybookPreviewResponse {
  projectId: string;
  playbookId: AutomationPlaybookId;
  scopeId: string;
  rulesHash: string;
  draftId: string;
  status: AutomationPlaybookDraftStatus;
  counts: PlaybookDraftCounts;
  samples: PlaybookPreviewSample[];
  // CACHE/REUSE v2: Indicates whether AI was actually called during this request
  aiCalled?: boolean;
}

export interface PlaybookDraftItem {
  productId: string;
  field: 'seoTitle' | 'seoDescription';
  rawSuggestion: string;
  finalSuggestion: string;
  ruleWarnings: string[];
}

@Injectable()
export class AutomationPlaybooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService,
    private readonly tokenUsageService: TokenUsageService,
    private readonly aiService: AiService,
    private readonly aiUsageQuotaService: AiUsageQuotaService,
  ) {}

  private async ensureProjectOwnership(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }
    return project;
  }

  private getPlaybookWhere(
    projectId: string,
    playbookId: AutomationPlaybookId,
  ) {
    if (playbookId === 'missing_seo_title') {
      return {
        projectId,
        OR: [{ seoTitle: null }, { seoTitle: '' }],
      };
    }
    return {
      projectId,
      OR: [{ seoDescription: null }, { seoDescription: '' }],
    };
  }

  /**
   * Compute a deterministic scopeId from the set of affected product IDs.
   * The scopeId is a SHA-256 hash of the sorted product IDs joined by commas.
   * This ensures that the same set of products always produces the same scopeId.
   */
  private computeScopeId(
    projectId: string,
    playbookId: AutomationPlaybookId,
    productIds: string[],
  ): string {
    const sorted = [...productIds].sort();
    const payload = `${projectId}:${playbookId}:${sorted.join(',')}`;
    return createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }

  /**
   * Get the list of product IDs affected by a playbook.
   */
  private async getAffectedProductIds(
    projectId: string,
    playbookId: AutomationPlaybookId,
  ): Promise<string[]> {
    const where = this.getPlaybookWhere(projectId, playbookId);
    const products = await this.prisma.product.findMany({
      where,
      select: { id: true },
      orderBy: { lastSyncedAt: 'desc' },
    });
    return products.map((p) => p.id);
  }

  private stableStringify(value: unknown): string {
    const sortKeys = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sortKeys);
      }
      if (obj && typeof obj === 'object') {
        return Object.keys(obj)
          .sort()
          .reduce((acc, key) => {
            acc[key] = sortKeys(obj[key]);
            return acc;
          }, {} as Record<string, unknown>);
      }
      return obj;
    };
    return JSON.stringify(sortKeys(value));
  }

  private normalizeRules(rules?: PlaybookRulesV1 | null): PlaybookRulesV1 {
    if (!rules) {
      return {
        enabled: false,
        findReplace: undefined,
        prefix: undefined,
        suffix: undefined,
        maxLength: undefined,
        forbiddenPhrases: undefined,
        mode: 'enforce',
      };
    }
    return {
      enabled: !!rules.enabled,
      findReplace:
        rules.findReplace && rules.findReplace.find
          ? {
              find: rules.findReplace.find,
              replace: rules.findReplace.replace ?? '',
              caseSensitive: !!rules.findReplace.caseSensitive,
            }
          : undefined,
      prefix: rules.prefix || undefined,
      suffix: rules.suffix || undefined,
      maxLength:
        typeof rules.maxLength === 'number' && rules.maxLength > 0
          ? rules.maxLength
          : undefined,
      forbiddenPhrases:
        rules.forbiddenPhrases && rules.forbiddenPhrases.length > 0
          ? [...rules.forbiddenPhrases]
          : undefined,
      mode: rules.mode ?? 'enforce',
    };
  }

  private computeRulesHash(rules?: PlaybookRulesV1 | null): string {
    const normalized = this.normalizeRules(rules);
    const payload = this.stableStringify(normalized);
    return createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }

  private applyRulesToText(
    field: 'seoTitle' | 'seoDescription',
    value: string,
    rules: PlaybookRulesV1 | undefined,
    ruleWarnings: string[],
  ): string {
    if (!rules || !rules.enabled) {
      return value || '';
    }
    const normalized = this.normalizeRules(rules);
    let text = value || '';

    if (normalized.findReplace?.find) {
      const { find, replace, caseSensitive } = normalized.findReplace;
      try {
        const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
        text = text.replace(regex, replace);
      } catch {
        text = text.split(find).join(replace);
      }
    }

    if (normalized.prefix) {
      text = `${normalized.prefix}${text}`;
    }

    if (normalized.suffix) {
      text = `${text}${normalized.suffix}`;
    }

    if (
      typeof normalized.maxLength === 'number' &&
      normalized.maxLength > 0 &&
      text.length > normalized.maxLength
    ) {
      text = text.slice(0, normalized.maxLength);
      ruleWarnings.push('trimmed_to_max_length');
    }

    if (normalized.forbiddenPhrases && normalized.forbiddenPhrases.length > 0) {
      const lower = text.toLowerCase();
      const hit = normalized.forbiddenPhrases.some((phrase) =>
        lower.includes(phrase.toLowerCase()),
      );
      if (hit) {
        ruleWarnings.push('forbidden_phrase_detected');
      }
    }

    return text;
  }

  async previewPlaybook(
    userId: string,
    projectId: string,
    playbookId: AutomationPlaybookId,
    rules?: PlaybookRulesV1,
    sampleSize = 3,
  ): Promise<PlaybookPreviewResponse> {
    await this.ensureProjectOwnership(projectId, userId);

    // AI-USAGE v2: Plan-aware quota enforcement for preview generation.
    // This check must run before any AI work is performed.
    const quotaEvaluation = await this.aiUsageQuotaService.evaluateQuotaForAction({
      userId,
      projectId,
      action: 'PREVIEW_GENERATE',
    });

    if (
      quotaEvaluation.status === 'blocked' &&
      quotaEvaluation.policy.hardEnforcementEnabled
    ) {
      // Hard block: no AI calls may occur when the plan-level quota is exceeded.
      // Error code is deterministic for frontend handling.
      throw new HttpException(
        {
          message:
            'AI usage limit reached for Automation Playbooks. Upgrade your plan or wait until your monthly AI quota resets to run new previews.',
          error: 'AI_QUOTA_EXCEEDED',
          code: 'AI_QUOTA_EXCEEDED',
          plan: quotaEvaluation.planId,
          allowed: quotaEvaluation.policy.monthlyAiRunsLimit,
          current: quotaEvaluation.currentMonthAiRuns,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const affectedProductIds = await this.getAffectedProductIds(
      projectId,
      playbookId,
    );
    const scopeId = this.computeScopeId(projectId, playbookId, affectedProductIds);
    const normalizedRules = this.normalizeRules(rules);
    const rulesHash = this.computeRulesHash(normalizedRules);

    const sampleIds = affectedProductIds.slice(0, sampleSize);
    const draftItems: PlaybookDraftItem[] = [];
    const samples: PlaybookPreviewSample[] = [];
    let draftGenerated = 0;
    let noSuggestionCount = 0;
    // CACHE/REUSE v2: Track AI calls
    let aiCalls = 0;

    // eslint-disable-next-line no-console
    console.log('[AutomationPlaybooks] draft.preview.started', {
      projectId,
      playbookId,
      sampleSize: sampleIds.length,
      totalAffected: affectedProductIds.length,
    });

    for (const productId of sampleIds) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        continue;
      }

      const descriptionText =
        (product.seoDescription ?? product.description ?? '')?.toString() || '';
      const metadata = await this.aiService.generateMetadata({
        url: product.externalId ?? product.id,
        currentTitle: (product.seoTitle ?? product.title ?? '').toString(),
        currentDescription: descriptionText,
        pageTextSnippet: descriptionText.slice(0, 800),
      });
      // CACHE/REUSE v2: Track AI call
      aiCalls++;

      const ruleWarnings: string[] = [];
      let rawSuggestion = '';
      let finalSuggestion = '';
      let field: 'seoTitle' | 'seoDescription';

      if (playbookId === 'missing_seo_title') {
        field = 'seoTitle';
        rawSuggestion = metadata.title ?? '';
      } else {
        field = 'seoDescription';
        rawSuggestion = metadata.description ?? '';
      }

      finalSuggestion = this.applyRulesToText(
        field,
        rawSuggestion,
        normalizedRules,
        ruleWarnings,
      );

      if (!finalSuggestion || !finalSuggestion.trim()) {
        noSuggestionCount += 1;
      } else {
        draftGenerated += 1;
      }

      const currentTitle = product.seoTitle ?? product.title ?? '';
      const currentDescription =
        product.seoDescription ?? product.description ?? '';

      draftItems.push({
        productId,
        field,
        rawSuggestion,
        finalSuggestion,
        ruleWarnings: [...ruleWarnings],
      });

      samples.push({
        productId,
        field,
        productTitle: product.title,
        currentTitle: currentTitle.toString(),
        currentDescription: currentDescription?.toString() ?? '',
        rawSuggestion,
        finalSuggestion,
        ruleWarnings: [...ruleWarnings],
      });
    }

    const counts: PlaybookDraftCounts = {
      affectedTotal: affectedProductIds.length,
      draftGenerated,
      noSuggestionCount,
    };

    const draft = await this.prisma.automationPlaybookDraft.upsert({
      where: {
        projectId_playbookId_scopeId_rulesHash: {
          projectId,
          playbookId,
          scopeId,
          rulesHash,
        },
      },
      create: {
        projectId,
        playbookId,
        scopeId,
        rulesHash,
        status: 'PARTIAL',
        sampleProductIds: sampleIds as unknown as any,
        draftItems: draftItems as unknown as any,
        counts: counts as unknown as any,
        rules: normalizedRules as unknown as any,
        createdByUserId: userId,
      },
      update: {
        status: 'PARTIAL',
        sampleProductIds: sampleIds as unknown as any,
        draftItems: draftItems as unknown as any,
        counts: counts as unknown as any,
        rules: normalizedRules as unknown as any,
      },
    });

    // eslint-disable-next-line no-console
    console.log('[AutomationPlaybooks] draft.preview.created', {
      projectId,
      playbookId,
      scopeId,
      rulesHash,
      draftId: draft.id,
      counts,
    });

    return {
      projectId,
      playbookId,
      scopeId,
      rulesHash,
      draftId: draft.id,
      status: draft.status as AutomationPlaybookDraftStatus,
      counts,
      samples,
      // CACHE/REUSE v2: Indicates AI was called
      aiCalled: aiCalls > 0,
    };
  }

  async generateDraft(
    userId: string,
    projectId: string,
    playbookId: AutomationPlaybookId,
    scopeId: string,
    rulesHash: string,
  ): Promise<{
    projectId: string;
    playbookId: AutomationPlaybookId;
    scopeId: string;
    rulesHash: string;
    draftId: string;
    status: AutomationPlaybookDraftStatus;
    counts: PlaybookDraftCounts;
    // CACHE/REUSE v2: Indicates whether AI was actually called during this request
    aiCalled?: boolean;
  }> {
    await this.ensureProjectOwnership(projectId, userId);

    // AI-USAGE v2: Plan-aware quota enforcement for full draft generation.
    // This check must run before any AI work is performed.
    const quotaEvaluation = await this.aiUsageQuotaService.evaluateQuotaForAction({
      userId,
      projectId,
      action: 'DRAFT_GENERATE',
    });

    if (
      quotaEvaluation.status === 'blocked' &&
      quotaEvaluation.policy.hardEnforcementEnabled
    ) {
      throw new HttpException(
        {
          message:
            'AI usage limit reached for Automation Playbooks. Upgrade your plan or wait until your monthly AI quota resets to generate new drafts.',
          error: 'AI_QUOTA_EXCEEDED',
          code: 'AI_QUOTA_EXCEEDED',
          plan: quotaEvaluation.planId,
          allowed: quotaEvaluation.policy.monthlyAiRunsLimit,
          current: quotaEvaluation.currentMonthAiRuns,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const affectedProductIds = await this.getAffectedProductIds(
      projectId,
      playbookId,
    );
    const currentScopeId = this.computeScopeId(
      projectId,
      playbookId,
      affectedProductIds,
    );

    if (scopeId !== currentScopeId) {
      throw new ConflictException({
        message:
          'The product scope has changed since the preview was generated. Please re-run the estimate to get an updated scopeId.',
        error: 'PLAYBOOK_SCOPE_INVALID',
        code: 'PLAYBOOK_SCOPE_INVALID',
        expectedScopeId: currentScopeId,
        providedScopeId: scopeId,
      });
    }

    const latestDraft = await this.prisma.automationPlaybookDraft.findFirst({
      where: {
        projectId,
        playbookId,
        scopeId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!latestDraft) {
      throw new ConflictException({
        message:
          'No Automation Playbook draft was found for this scope. Please regenerate the preview before generating a full draft.',
        error: 'PLAYBOOK_DRAFT_NOT_FOUND',
        code: 'PLAYBOOK_DRAFT_NOT_FOUND',
        scopeId,
      });
    }

    if (latestDraft.rulesHash !== rulesHash) {
      throw new ConflictException({
        message:
          'Your rules changed since the preview. Please regenerate the preview to continue safely.',
        error: 'PLAYBOOK_RULES_CHANGED',
        code: 'PLAYBOOK_RULES_CHANGED',
        expectedRulesHash: latestDraft.rulesHash,
        providedRulesHash: rulesHash,
        scopeId,
      });
    }

    const normalizedRules = this.normalizeRules(
      (latestDraft.rules as unknown as PlaybookRulesV1 | null) ?? undefined,
    );
    const existingItems =
      (latestDraft.draftItems as unknown as PlaybookDraftItem[] | null) ?? [];
    const existingByProductId = new Map(
      existingItems.map((item) => [item.productId, item]),
    );

    const allItems: PlaybookDraftItem[] = [];
    let draftGenerated = 0;
    let noSuggestionCount = 0;
    // CACHE/REUSE v2: Track AI calls
    let aiCalls = 0;

    // eslint-disable-next-line no-console
    console.log('[AutomationPlaybooks] draft.full_generate.started', {
      projectId,
      playbookId,
      scopeId,
      rulesHash,
      draftId: latestDraft.id,
      affectedTotal: affectedProductIds.length,
    });

    for (const productId of affectedProductIds) {
      const existing = existingByProductId.get(productId);
      if (
        existing &&
        existing.finalSuggestion &&
        existing.finalSuggestion.trim()
      ) {
        allItems.push(existing);
        draftGenerated += 1;
        continue;
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        continue;
      }

      const descriptionText =
        (product.seoDescription ?? product.description ?? '')?.toString() ||
        '';
      const metadata = await this.aiService.generateMetadata({
        url: product.externalId ?? product.id,
        currentTitle: (product.seoTitle ?? product.title ?? '').toString(),
        currentDescription: descriptionText,
        pageTextSnippet: descriptionText.slice(0, 800),
      });
      // CACHE/REUSE v2: Track AI call
      aiCalls++;

      const ruleWarnings: string[] = [];
      let rawSuggestion = '';
      let finalSuggestion = '';
      let field: 'seoTitle' | 'seoDescription';

      if (playbookId === 'missing_seo_title') {
        field = 'seoTitle';
        rawSuggestion = metadata.title ?? '';
      } else {
        field = 'seoDescription';
        rawSuggestion = metadata.description ?? '';
      }

      finalSuggestion = this.applyRulesToText(
        field,
        rawSuggestion,
        normalizedRules,
        ruleWarnings,
      );

      if (!finalSuggestion || !finalSuggestion.trim()) {
        noSuggestionCount += 1;
      } else {
        draftGenerated += 1;
      }

      allItems.push({
        productId,
        field,
        rawSuggestion,
        finalSuggestion,
        ruleWarnings,
      });
    }

    const counts: PlaybookDraftCounts = {
      affectedTotal: affectedProductIds.length,
      draftGenerated,
      noSuggestionCount,
    };

    const updatedDraft = await this.prisma.automationPlaybookDraft.update({
      where: { id: latestDraft.id },
      data: {
        status: 'READY',
        draftItems: allItems as unknown as any,
        counts: counts as unknown as any,
      },
    });

    const tokensEstimated =
      draftGenerated * ESTIMATED_METADATA_TOKENS_PER_CALL;
    if (tokensEstimated > 0) {
      await this.tokenUsageService.log(
        userId,
        tokensEstimated,
        `automation_playbook:${playbookId}:draft_generate`,
      );
    }

    // eslint-disable-next-line no-console
    console.log('[AutomationPlaybooks] draft.full_generate.completed', {
      projectId,
      playbookId,
      scopeId,
      rulesHash,
      draftId: updatedDraft.id,
      counts,
    });

    return {
      projectId,
      playbookId,
      scopeId,
      rulesHash,
      draftId: updatedDraft.id,
      status: updatedDraft.status as AutomationPlaybookDraftStatus,
      counts,
      // CACHE/REUSE v2: Indicates AI was called
      aiCalled: aiCalls > 0,
    };
  }

  async getLatestDraft(
    userId: string,
    projectId: string,
    playbookId: AutomationPlaybookId,
  ): Promise<{
    projectId: string;
    playbookId: AutomationPlaybookId;
    scopeId: string;
    rulesHash: string;
    draftId: string;
    status: AutomationPlaybookDraftStatus;
    counts: PlaybookDraftCounts | null;
    sampleProductIds: string[];
    draftItems: PlaybookDraftItem[];
  } | null> {
    await this.ensureProjectOwnership(projectId, userId);

    const draft = await this.prisma.automationPlaybookDraft.findFirst({
      where: {
        projectId,
        playbookId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!draft) {
      return null;
    }

    return {
      projectId,
      playbookId,
      scopeId: draft.scopeId,
      rulesHash: draft.rulesHash,
      draftId: draft.id,
      status: draft.status as AutomationPlaybookDraftStatus,
      counts: (draft.counts as unknown as PlaybookDraftCounts | null) ?? null,
      sampleProductIds:
        (draft.sampleProductIds as unknown as string[] | null) ?? ([] as string[]),
      draftItems:
        (draft.draftItems as unknown as PlaybookDraftItem[] | null) ?? ([] as PlaybookDraftItem[]),
    };
  }

  async estimatePlaybook(
    userId: string,
    projectId: string,
    playbookId: AutomationPlaybookId,
  ): Promise<PlaybookEstimate> {
    await this.ensureProjectOwnership(projectId, userId);

    const affectedProductIds = await this.getAffectedProductIds(
      projectId,
      playbookId,
    );
    const totalAffectedProducts = affectedProductIds.length;
    const scopeId = this.computeScopeId(
      projectId,
      playbookId,
      affectedProductIds,
    );

    let rulesHash = this.computeRulesHash(null);
    let draftStatus: AutomationPlaybookDraftStatus | undefined;
    let draftCounts: PlaybookDraftCounts | undefined;

    const latestDraft = await this.prisma.automationPlaybookDraft.findFirst({
      where: {
        projectId,
        playbookId,
        scopeId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (latestDraft) {
      rulesHash = latestDraft.rulesHash;
      draftStatus = latestDraft.status as AutomationPlaybookDraftStatus;
      draftCounts = (latestDraft.counts as unknown as PlaybookDraftCounts | null) ?? undefined;
    }

    const { planId, limit } =
      await this.entitlementsService.getAiSuggestionLimit(userId);
    const dailyUsed = await this.entitlementsService.getDailyAiUsage(
      userId,
      projectId,
      'product_optimize',
    );
    const remainingSuggestions =
      limit === -1 ? Number.MAX_SAFE_INTEGER : Math.max(limit - dailyUsed, 0);

    const estimatedTokens =
      totalAffectedProducts * ESTIMATED_METADATA_TOKENS_PER_CALL;
    const tokenCapacity =
      (limit === -1 ? remainingSuggestions : remainingSuggestions) *
      ESTIMATED_METADATA_TOKENS_PER_CALL;

    const reasons: string[] = [];
    const planEligible = planId !== 'free';

    if (!planEligible) {
      reasons.push('plan_not_eligible');
    }

    if (totalAffectedProducts === 0) {
      reasons.push('no_affected_products');
    }

    const dailyLimitBlocking =
      limit !== -1 && remainingSuggestions <= 0;
    if (dailyLimitBlocking) {
      reasons.push('ai_daily_limit_reached');
    }

    const tokenCapBlocking =
      limit !== -1 && estimatedTokens > tokenCapacity;
    if (tokenCapBlocking) {
      reasons.push('token_cap_would_be_exceeded');
    }

    const eligible =
      planEligible &&
      totalAffectedProducts > 0 &&
      remainingSuggestions > 0 &&
      !tokenCapBlocking;

    const canProceed = eligible && reasons.length === 0;

    return {
      projectId,
      playbookId,
      totalAffectedProducts,
      estimatedTokens,
      planId,
      eligible,
      canProceed,
      reasons,
      aiDailyLimit: {
        limit,
        used: dailyUsed,
        remaining: remainingSuggestions,
      },
      scopeId,
      rulesHash,
      draftStatus,
      draftCounts,
    };
  }

  async applyPlaybook(
    userId: string,
    projectId: string,
    playbookId: AutomationPlaybookId,
    scopeId: string,
    rulesHash: string,
  ): Promise<PlaybookApplyResult> {
    const project = await this.ensureProjectOwnership(projectId, userId);

    const planId = await this.entitlementsService.getUserPlan(userId);
    if (planId === 'free') {
      throw new ForbiddenException({
        message:
          'Bulk AI-powered SEO fixes are available on Pro and Business plans. Upgrade your plan to unlock Automation Playbooks.',
        error: 'ENTITLEMENTS_LIMIT_REACHED',
        code: 'ENTITLEMENTS_LIMIT_REACHED',
        feature: 'automation_playbooks',
        plan: planId,
      });
    }

    const affectedProductIds = await this.getAffectedProductIds(
      projectId,
      playbookId,
    );
    const currentScopeId = this.computeScopeId(
      projectId,
      playbookId,
      affectedProductIds,
    );

    if (scopeId !== currentScopeId) {
      throw new ConflictException({
        message:
          'The product scope has changed since the preview was generated. Please re-run the estimate to get an updated scopeId.',
        error: 'PLAYBOOK_SCOPE_INVALID',
        code: 'PLAYBOOK_SCOPE_INVALID',
        expectedScopeId: currentScopeId,
        providedScopeId: scopeId,
      });
    }

    const totalAffectedProducts = affectedProductIds.length;
    const startedAt = new Date();

    if (totalAffectedProducts === 0) {
      const result: PlaybookApplyResult = {
        projectId,
        playbookId,
        totalAffectedProducts,
        attemptedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        limitReached: false,
        stopped: false,
        results: [],
      };
      // eslint-disable-next-line no-console
      console.log('[AutomationPlaybooks] apply.completed', {
        projectId,
        playbookId,
        scopeId,
        usedDraft: false,
        aiCalled: false,
        startedAt,
        finishedAt: new Date(),
        totalAffectedProducts,
        attemptedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        limitReached: false,
        stopped: false,
        stoppedAtProductId: undefined,
        failureReason: undefined,
      });
      return result;
    }

    const latestDraft = await this.prisma.automationPlaybookDraft.findFirst({
      where: {
        projectId,
        playbookId,
        scopeId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!latestDraft) {
      throw new ConflictException({
        message:
          'No Automation Playbook draft was found for this scope. Please regenerate the preview before applying.',
        error: 'PLAYBOOK_DRAFT_NOT_FOUND',
        code: 'PLAYBOOK_DRAFT_NOT_FOUND',
        scopeId,
      });
    }

    if (latestDraft.rulesHash !== rulesHash) {
      throw new ConflictException({
        message:
          'Your rules changed since the preview. Please regenerate the preview to continue safely.',
        error: 'PLAYBOOK_RULES_CHANGED',
        code: 'PLAYBOOK_RULES_CHANGED',
        expectedRulesHash: latestDraft.rulesHash,
        providedRulesHash: rulesHash,
        scopeId,
      });
    }

    const draftItems =
      (latestDraft.draftItems as unknown as PlaybookDraftItem[] | null) ?? [];
    const draftByProductId = new Map(
      draftItems.map((item) => [item.productId, item]),
    );

    const results: PlaybookApplyItemResult[] = [];
    let attemptedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // eslint-disable-next-line no-console
    console.log('[AutomationPlaybooks] apply.started', {
      projectId,
      playbookId,
      scopeId,
      totalAffectedProducts,
      draftId: latestDraft.id,
      usedDraft: true,
    });

    for (const productId of affectedProductIds) {
      const draftItem = draftByProductId.get(productId);
      if (!draftItem || !draftItem.finalSuggestion || !draftItem.finalSuggestion.trim()) {
        skippedCount += 1;
        results.push({
          productId,
          status: 'SKIPPED',
          message:
            'Skipped: no draft suggestion was available for this product.',
        });
        continue;
      }

      attemptedCount += 1;

      try {
        if (playbookId === 'missing_seo_title') {
          await this.prisma.product.update({
            where: { id: productId },
            data: { seoTitle: draftItem.finalSuggestion },
          });
          updatedCount += 1;
          results.push({
            productId,
            status: 'UPDATED',
            message: 'Updated SEO title from Automation Playbook draft.',
            updatedFields: {
              seoTitle: true,
            },
          });
        } else {
          await this.prisma.product.update({
            where: { id: productId },
            data: { seoDescription: draftItem.finalSuggestion },
          });
          updatedCount += 1;
          results.push({
            productId,
            status: 'UPDATED',
            message: 'Updated SEO description from Automation Playbook draft.',
            updatedFields: {
              seoDescription: true,
            },
          });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to apply playbook draft for this product.';
        results.push({
          productId,
          status: 'FAILED',
          message,
        });
      }
    }

    const tokensUsed = updatedCount * ESTIMATED_METADATA_TOKENS_PER_CALL;
    if (tokensUsed > 0) {
      await this.tokenUsageService.log(
        project.userId,
        tokensUsed,
        `automation_playbook:${playbookId}`,
      );
    }

    const finishedAt = new Date();
    // eslint-disable-next-line no-console
    console.log('[AutomationPlaybooks] apply.completed', {
      projectId,
      playbookId,
      scopeId,
      totalAffectedProducts,
      attemptedCount,
      updatedCount,
      skippedCount,
      limitReached: false,
      stopped: false,
      stoppedAtProductId: undefined,
      failureReason: undefined,
      startedAt,
      finishedAt,
      usedDraft: true,
      aiCalled: false,
    });

    return {
      projectId,
      playbookId,
      totalAffectedProducts,
      attemptedCount,
      updatedCount,
      skippedCount,
      limitReached: false,
      stopped: false,
      stoppedAtProductId: undefined,
      failureReason: undefined,
      results,
    };
  }
}
