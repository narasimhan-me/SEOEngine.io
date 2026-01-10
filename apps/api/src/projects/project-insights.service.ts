import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiUsageLedgerService } from '../ai/ai-usage-ledger.service';
import { AiUsageQuotaService } from '../ai/ai-usage-quota.service';
import { DeoIssuesService } from './deo-issues.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import {
  DEO_PILLARS,
  GEO_ISSUE_LABELS,
  SEARCH_INTENT_LABELS,
  SEARCH_INTENT_TYPES,
  computeGeoIntentCoverageCounts,
  computeGeoReuseStats,
  deriveGeoAnswerIntentMapping,
  evaluateGeoProduct,
  type GeoAnswerUnitInput,
  type GeoIssueType,
  type GeoReadinessSignalType,
  type SearchIntentType,
} from '@engineo/shared';

export type InsightSeverity = 'critical' | 'warning' | 'info';

export interface ProjectInsightsResponse {
  projectId: string;
  generatedAt: string;
  window: { days: number; from: string; to: string };
  overview: {
    improved: {
      deoScore: { current: number; previous: number; delta: number; trend: 'up' | 'down' | 'flat' };
      componentDeltas: Array<{
        componentId: string;
        label: string;
        current: number;
        previous: number;
        delta: number;
        trend: 'up' | 'down' | 'flat';
      }>;
    };
    saved: {
      aiRunsUsed: number;
      aiRunsAvoidedViaReuse: number;
      reuseRatePercent: number;
      quota: { limit: number | null; used: number; remaining: number | null; usedPercent: number | null };
      trust: { applyAiRuns: number; invariantMessage: string };
    };
    resolved: { actionsCount: number; why: string };
    next: { title: string; why: string; href: string } | null;
  };
  progress: {
    deoScoreTrend: Array<{ date: string; score: number }>;
    fixesAppliedTrend: Array<{ date: string; count: number; pillar?: string }>;
    openIssuesNow: { critical: number; warning: number; info: number; total: number };
  };
  issueResolution: {
    byPillar: Array<{ pillarId: string; label: string; open: number; resolved: number; total: number }>;
    avgTimeToFixHours: number | null;
    topRecent: Array<{ issueId: string; title: string; resolvedAt: string; pillarId: string }>;
    openHighImpact: Array<{ issueId: string; title: string; severity: InsightSeverity; pillarId: string; affectedCount: number }>;
  };
  opportunities: Array<{
    id: string;
    title: string;
    why: string;
    pillarId: string;
    estimatedImpact: 'high' | 'medium' | 'low';
    href: string;
    fixType: 'automation' | 'manual';
  }>;
  /**
   * GEO-INSIGHTS-2: Read-only derived GEO insights (no AI, no mutations).
   * Computed from Answer Units (Answer Blocks), GEO issues, and GEO fix applications.
   */
  geoInsights: {
    overview: {
      productsAnswerReadyPercent: number;
      productsAnswerReadyCount: number;
      productsTotal: number;
      answersTotal: number;
      answersMultiIntentCount: number;
      reuseRatePercent: number;
      confidenceDistribution: { high: number; medium: number; low: number };
      trustTrajectory: { improvedProducts: number; improvedEvents: number; windowDays: number; why: string };
      whyThisMatters: string;
    };
    coverage: {
      byIntent: Array<{
        intentType: SearchIntentType;
        label: string;
        productsCovered: number;
        productsTotal: number;
        coveragePercent: number;
      }>;
      gaps: SearchIntentType[];
      whyThisMatters: string;
    };
    reuse: {
      topReusedAnswers: Array<{
        productId: string;
        productTitle: string;
        answerBlockId: string;
        questionId: string;
        questionText: string;
        mappedIntents: SearchIntentType[];
        potentialIntents: SearchIntentType[];
        why: string;
        href: string;
      }>;
      couldBeReusedButArent: Array<{
        productId: string;
        productTitle: string;
        answerBlockId: string;
        questionId: string;
        questionText: string;
        potentialIntents: SearchIntentType[];
        blockedBySignals: GeoReadinessSignalType[];
        why: string;
        href: string;
      }>;
      whyThisMatters: string;
    };
    trustSignals: {
      topBlockers: Array<{ issueType: GeoIssueType; label: string; affectedProducts: number }>;
      avgTimeToImproveHours: number | null;
      mostImproved: Array<{ productId: string; productTitle: string; issuesResolvedCount: number; href: string }>;
      whyThisMatters: string;
    };
    opportunities: Array<{
      id: string;
      title: string;
      why: string;
      href: string;
      estimatedImpact: 'high' | 'medium' | 'low';
      category: 'coverage' | 'reuse' | 'trust';
    }>;
  };
}

function toIsoDay(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function trendFromDelta(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

function confidenceOrdinal(level: string): number {
  const t = String(level || '').toUpperCase();
  if (t === 'LOW') return 0;
  if (t === 'MEDIUM') return 1;
  if (t === 'HIGH') return 2;
  // Handle lowercase (shared)
  if (t === 'LOW'.toUpperCase()) return 0;
  return 0;
}

/**
 * [ROLES-3 FIXUP-3] Project Insights Service
 * Updated with membership-aware access control (any ProjectMember can view).
 */
@Injectable()
export class ProjectInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiUsageLedgerService: AiUsageLedgerService,
    private readonly aiUsageQuotaService: AiUsageQuotaService,
    private readonly deoIssuesService: DeoIssuesService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  async getProjectInsights(projectId: string, userId: string): Promise<ProjectInsightsResponse> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const now = new Date();
    const days = 30;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      issuesRes,
      latestSnapshot,
      previousSnapshot,
      scoreTrendRows,
      aiSummary,
      quotaEval,
      intentApps,
      competitiveApps,
      mediaApps,
      offsiteApps,
      localApps,
      appliedSuggestions,
      productsForGeo,
      geoFixApps,
    ] = await Promise.all([
      this.deoIssuesService.getIssuesForProjectReadOnly(projectId, userId),
      this.prisma.deoScoreSnapshot.findFirst({ where: { projectId }, orderBy: { computedAt: 'desc' } }),
      this.prisma.deoScoreSnapshot.findFirst({ where: { projectId, computedAt: { lte: from } }, orderBy: { computedAt: 'desc' } }),
      this.prisma.deoScoreSnapshot.findMany({
        where: { projectId, computedAt: { gte: from } },
        orderBy: { computedAt: 'asc' },
        select: { computedAt: true, overallScore: true },
        take: 200,
      }),
      this.aiUsageLedgerService.getProjectSummary(projectId),
      this.aiUsageQuotaService.evaluateQuotaForAction({ userId, projectId, action: 'PREVIEW_GENERATE' }),
      this.prisma.productIntentFixApplication.findMany({
        where: { product: { projectId }, appliedAt: { gte: from, lte: now } },
        select: {
          appliedAt: true,
          productId: true,
          intentType: true,
          query: true,
          draft: { select: { createdAt: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 200,
      }),
      this.prisma.productCompetitiveFixApplication.findMany({
        where: { product: { projectId }, appliedAt: { gte: from, lte: now } },
        select: {
          appliedAt: true,
          productId: true,
          gapType: true,
          areaId: true,
          draft: { select: { createdAt: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 200,
      }),
      this.prisma.productMediaFixApplication.findMany({
        where: { product: { projectId }, appliedAt: { gte: from, lte: now } },
        select: {
          appliedAt: true,
          productId: true,
          draftType: true,
          draft: { select: { createdAt: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 200,
      }),
      this.prisma.projectOffsiteFixApplication.findMany({
        where: { projectId, appliedAt: { gte: from, lte: now } },
        select: {
          appliedAt: true,
          gapType: true,
          signalType: true,
          draft: { select: { createdAt: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 200,
      }),
      this.prisma.projectLocalFixApplication.findMany({
        where: { projectId, appliedAt: { gte: from, lte: now } },
        select: {
          appliedAt: true,
          gapType: true,
          signalType: true,
          draft: { select: { createdAt: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 200,
      }),
      this.prisma.automationSuggestion.findMany({
        where: { projectId, applied: true, appliedAt: { gte: from, lte: now } },
        select: { appliedAt: true, generatedAt: true, issueType: true, targetType: true },
        orderBy: { appliedAt: 'desc' },
        take: 200,
      }),
      this.prisma.product.findMany({
        where: { projectId },
        select: {
          id: true,
          title: true,
          answerBlocks: {
            select: {
              id: true,
              questionId: true,
              questionText: true,
              answerText: true,
              sourceFieldsUsed: true,
              updatedAt: true,
            },
          },
        },
        take: 500,
      }),
      this.prisma.productGeoFixApplication.findMany({
        where: {
          product: { projectId },
          appliedAt: { gte: from, lte: now },
        },
        select: {
          appliedAt: true,
          productId: true,
          beforeConfidence: true,
          afterConfidence: true,
          issuesResolvedCount: true,
          draft: { select: { createdAt: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 500,
      }),
    ]);

    const issues = issuesRes.issues ?? [];
    const openCritical = issues.filter((i) => i.severity === 'critical');
    const openWarning = issues.filter((i) => i.severity === 'warning');
    const openInfo = issues.filter((i) => i.severity === 'info');

    const nextIssue = openCritical[0] ?? openWarning[0] ?? null;
    const next =
      nextIssue
        ? {
            title: nextIssue.title,
            why: nextIssue.whyItMatters || nextIssue.description || 'Addressing high-impact gaps improves discovery coverage.',
            href: nextIssue.pillarId ? `/projects/${projectId}/issues?pillar=${encodeURIComponent(nextIssue.pillarId)}` : `/projects/${projectId}/issues`,
          }
        : null;

    const latestOverallRaw = latestSnapshot?.overallScore ?? null;
    const prevOverallRaw = previousSnapshot?.overallScore ?? (scoreTrendRows[0]?.overallScore ?? null);
    const latestOverall = latestOverallRaw != null ? Math.round(latestOverallRaw) : 0;
    const prevOverall = prevOverallRaw != null ? Math.round(prevOverallRaw) : latestOverall;
    const deoDelta = latestOverall - prevOverall;

    const latestV2 = (latestSnapshot?.metadata as any)?.v2?.components ?? null;
    const prevV2 = ((previousSnapshot?.metadata as any)?.v2?.components ?? (scoreTrendRows[0] as any)?.metadata?.v2?.components) ?? null;

    const componentKeys: Array<{ key: string; label: string }> = [
      { key: 'intentMatch', label: 'Search & Intent' },
      { key: 'aiVisibility', label: 'AI Visibility' },
      { key: 'answerability', label: 'Answerability' },
      { key: 'contentCompleteness', label: 'Content Completeness' },
      { key: 'technicalQuality', label: 'Technical Quality' },
      { key: 'entityStrength', label: 'Entity Strength' },
    ];

    const componentDeltas = componentKeys.map(({ key, label }) => {
      const current = typeof latestV2?.[key] === 'number' ? Math.round(latestV2[key]) : 0;
      const previous = typeof prevV2?.[key] === 'number' ? Math.round(prevV2[key]) : current;
      const delta = current - previous;
      return {
        componentId: key,
        label,
        current,
        previous,
        delta,
        trend: trendFromDelta(delta),
      };
    });

    const actionsCount =
      intentApps.length +
      competitiveApps.length +
      mediaApps.length +
      offsiteApps.length +
      localApps.length +
      appliedSuggestions.length;

    const actionsByPillarId: Record<string, number> = {
      search_intent_fit: intentApps.length,
      competitive_positioning: competitiveApps.length,
      media_accessibility: mediaApps.length,
      offsite_signals: offsiteApps.length,
      local_discovery: localApps.length,
      metadata_snippet_quality: appliedSuggestions.length,
    };

    const durationsHours: number[] = [];
    for (const a of intentApps) durationsHours.push((a.appliedAt.getTime() - a.draft.createdAt.getTime()) / 3600000);
    for (const a of competitiveApps) durationsHours.push((a.appliedAt.getTime() - a.draft.createdAt.getTime()) / 3600000);
    for (const a of mediaApps) durationsHours.push((a.appliedAt.getTime() - a.draft.createdAt.getTime()) / 3600000);
    for (const a of offsiteApps) durationsHours.push((a.appliedAt.getTime() - a.draft.createdAt.getTime()) / 3600000);
    for (const a of localApps) durationsHours.push((a.appliedAt.getTime() - a.draft.createdAt.getTime()) / 3600000);
    for (const a of appliedSuggestions) {
      if (a.appliedAt) durationsHours.push((a.appliedAt.getTime() - a.generatedAt.getTime()) / 3600000);
    }

    const avgTimeToFixHours =
      durationsHours.length > 0
        ? Math.round((durationsHours.reduce((sum, v) => sum + v, 0) / durationsHours.length) * 10) / 10
        : null;

    const recentActions: Array<{ id: string; at: Date; title: string; pillarId: string }> = [];
    for (const a of intentApps.slice(0, 20)) {
      recentActions.push({
        id: `intent:${a.productId}:${a.appliedAt.toISOString()}`,
        at: a.appliedAt,
        title: `Applied Search & Intent fix (${String(a.intentType).toLowerCase()})`,
        pillarId: 'search_intent_fit',
      });
    }
    for (const a of competitiveApps.slice(0, 20)) {
      recentActions.push({
        id: `competitive:${a.productId}:${a.appliedAt.toISOString()}`,
        at: a.appliedAt,
        title: 'Applied Competitive fix',
        pillarId: 'competitive_positioning',
      });
    }
    for (const a of mediaApps.slice(0, 20)) {
      recentActions.push({
        id: `media:${a.productId}:${a.appliedAt.toISOString()}`,
        at: a.appliedAt,
        title: 'Applied Media fix',
        pillarId: 'media_accessibility',
      });
    }
    for (const a of offsiteApps.slice(0, 20)) {
      recentActions.push({
        id: `offsite:${a.gapType}:${a.appliedAt.toISOString()}`,
        at: a.appliedAt,
        title: 'Applied Off-site Signals fix',
        pillarId: 'offsite_signals',
      });
    }
    for (const a of localApps.slice(0, 20)) {
      recentActions.push({
        id: `local:${a.gapType}:${a.appliedAt.toISOString()}`,
        at: a.appliedAt,
        title: 'Applied Local Discovery fix',
        pillarId: 'local_discovery',
      });
    }
    for (const a of appliedSuggestions.slice(0, 20)) {
      if (!a.appliedAt) continue;
      recentActions.push({
        id: `automation:${a.issueType}:${a.appliedAt.toISOString()}`,
        at: a.appliedAt,
        title: 'Applied Automation Suggestion',
        pillarId: 'metadata_snippet_quality',
      });
    }

    recentActions.sort((a, b) => b.at.getTime() - a.at.getTime());
    const topRecent = recentActions.slice(0, 8).map((a) => ({
      issueId: a.id,
      title: a.title,
      resolvedAt: a.at.toISOString(),
      pillarId: a.pillarId,
    }));

    const allAppliedAts = [
      ...intentApps.map((a) => a.appliedAt),
      ...competitiveApps.map((a) => a.appliedAt),
      ...mediaApps.map((a) => a.appliedAt),
      ...offsiteApps.map((a) => a.appliedAt),
      ...localApps.map((a) => a.appliedAt),
      ...appliedSuggestions.map((a) => a.appliedAt).filter((d): d is Date => !!d),
    ];

    const trendMap = new Map<string, number>();
    for (const at of allAppliedAts) {
      const day = toIsoDay(at);
      trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
    }
    const fixesAppliedTrend = [...trendMap.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

    const openHighImpact = openCritical.slice(0, 8).map((i) => ({
      issueId: i.id,
      title: i.title,
      severity: i.severity as InsightSeverity,
      pillarId: (i.pillarId as string) || 'unknown',
      affectedCount: i.count ?? 0,
    }));

    const opportunities = [
      ...openCritical.slice(0, 6),
      ...openWarning.slice(0, 4),
    ].map((i) => {
      const impact =
        i.severity === 'critical' ? 'high' : i.severity === 'warning' ? 'medium' : 'low';
      const fixType: 'automation' | 'manual' = i.actionability === 'automation' ? 'automation' : 'manual';
      const pillarId = (i.pillarId as string) || 'unknown';
      return {
        id: `issue:${i.id}`,
        title: i.title,
        why: i.whyItMatters || i.description || 'This gap affects discovery coverage.',
        pillarId,
        estimatedImpact: impact as 'high' | 'medium' | 'low',
        href: pillarId !== 'unknown'
          ? `/projects/${projectId}/issues?pillar=${encodeURIComponent(pillarId)}`
          : `/projects/${projectId}/issues`,
        fixType,
      };
    });

    const aiRunsUsed = quotaEval.currentMonthAiRuns;
    const monthlyLimit = quotaEval.policy.monthlyAiRunsLimit;
    const remaining = quotaEval.remainingAiRuns;
    const usedPercent = quotaEval.currentUsagePercent != null ? Math.round(quotaEval.currentUsagePercent) : null;

    // INSIGHTS-1: Pillar resolution breakdown (open issues + applied actions)
    const openIssuesByPillarId = new Map<string, number>();
    for (const issue of issues) {
      const pid = (issue.pillarId as string) || 'unknown';
      openIssuesByPillarId.set(pid, (openIssuesByPillarId.get(pid) ?? 0) + 1);
    }

    const byPillar = DEO_PILLARS.map((p) => {
      const open = openIssuesByPillarId.get(p.id) ?? 0;
      const resolved = actionsByPillarId[p.id] ?? 0;
      return {
        pillarId: p.id,
        label: p.label,
        open,
        resolved,
        total: open + resolved,
      };
    }).filter((row) => row.open > 0 || row.resolved > 0);

    // INSIGHTS-1: Score trend compressed to day granularity for stable charting
    const scoreByDay = new Map<string, number>();
    for (const r of scoreTrendRows) {
      scoreByDay.set(toIsoDay(r.computedAt), Math.round(r.overallScore));
    }
    const deoScoreTrend = [...scoreByDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, score]) => ({ date, score }));

    // GEO-INSIGHTS-2: Derived GEO insights (read-only)
    const productsTotal = (productsForGeo ?? []).length;
    const productsById = new Map<string, { id: string; title: string }>();
    for (const p of productsForGeo ?? []) productsById.set(p.id, { id: p.id, title: p.title });

    const confidenceDistribution = { high: 0, medium: 0, low: 0 };
    const perProductCoveredIntents = new Map<string, Set<SearchIntentType>>();

    const answerUnitRows: Array<{
      productId: string;
      productTitle: string;
      answerBlockId: string;
      questionId: string;
      questionText: string;
      mappedIntents: SearchIntentType[];
      potentialIntents: SearchIntentType[];
      blockedBySignals: GeoReadinessSignalType[];
      why: string;
      unitConfidenceLevel: 'low' | 'medium' | 'high';
    }> = [];

    let productsAnswerReadyCount = 0;
    for (const p of productsForGeo ?? []) {
      const blocks = (p.answerBlocks ?? []) as any[];
      const units: GeoAnswerUnitInput[] = blocks.map((b) => ({
        unitId: b.id,
        questionId: b.questionId,
        answer: b.answerText || '',
        factsUsed: b.sourceFieldsUsed ?? [],
        pillarContext: 'search_intent_fit',
      }));
      const evalResult = evaluateGeoProduct(units);
      const level = evalResult.citationConfidence.level;
      if (level === 'high') productsAnswerReadyCount += 1;
      if (level === 'high') confidenceDistribution.high += 1;
      else if (level === 'medium') confidenceDistribution.medium += 1;
      else confidenceDistribution.low += 1;

      const byUnitId = new Map<string, any>();
      for (const u of evalResult.answerUnits) byUnitId.set(u.unitId, u);

      const covered = new Set<SearchIntentType>();
      for (const b of blocks) {
        const unitEval = byUnitId.get(b.id) ?? null;
        const unitLevel = (unitEval?.citationConfidence?.level as 'low' | 'medium' | 'high') ?? 'low';
        const mapping = deriveGeoAnswerIntentMapping({
          questionId: b.questionId,
          factsUsed: b.sourceFieldsUsed ?? [],
          signals: unitEval?.signals ?? [],
        });
        // Only count intent coverage from non-low units (trust-safe, readiness-based)
        if (unitLevel !== 'low') {
          for (const intent of mapping.mappedIntents) covered.add(intent);
        }
        answerUnitRows.push({
          productId: p.id,
          productTitle: p.title,
          answerBlockId: b.id,
          questionId: b.questionId,
          questionText: b.questionText || b.questionId,
          mappedIntents: mapping.mappedIntents,
          potentialIntents: mapping.potentialIntents,
          blockedBySignals: mapping.blockedBySignals,
          why: mapping.why,
          unitConfidenceLevel: unitLevel,
        });
      }
      perProductCoveredIntents.set(p.id, covered);
    }

    const eligibleAnswerUnits = answerUnitRows.filter((u) => u.unitConfidenceLevel !== 'low' && u.mappedIntents.length > 0);
    const reuseStats = computeGeoReuseStats(eligibleAnswerUnits.map((u) => ({ mappedIntents: u.mappedIntents })));
    const coverageCounts = computeGeoIntentCoverageCounts(eligibleAnswerUnits.map((u) => ({ mappedIntents: u.mappedIntents })));

    const productsCoveredByIntent: Record<SearchIntentType, number> = Object.fromEntries(
      SEARCH_INTENT_TYPES.map((t) => [t, 0]),
    ) as Record<SearchIntentType, number>;
    for (const intents of perProductCoveredIntents.values()) {
      for (const intent of intents) {
        productsCoveredByIntent[intent] = (productsCoveredByIntent[intent] ?? 0) + 1;
      }
    }

    const coverageByIntent = SEARCH_INTENT_TYPES.map((intentType) => {
      const productsCovered = productsCoveredByIntent[intentType] ?? 0;
      return {
        intentType,
        label: SEARCH_INTENT_LABELS[intentType],
        productsCovered,
        productsTotal,
        coveragePercent: productsTotal > 0 ? Math.round((productsCovered / productsTotal) * 100) : 0,
      };
    });

    const gaps = coverageByIntent.filter((r) => r.productsCovered === 0).map((r) => r.intentType);

    const topReusedAnswers = [...eligibleAnswerUnits]
      .filter((u) => u.mappedIntents.length >= 2)
      .sort((a, b) => b.mappedIntents.length - a.mappedIntents.length)
      .slice(0, 10)
      .map((u) => ({
        productId: u.productId,
        productTitle: u.productTitle,
        answerBlockId: u.answerBlockId,
        questionId: u.questionId,
        questionText: u.questionText,
        mappedIntents: u.mappedIntents,
        potentialIntents: u.potentialIntents,
        why: u.why,
        href: `/projects/${projectId}/products/${u.productId}?focus=geo`,
      }));

    const couldBeReusedButArent = answerUnitRows
      .filter((u) => u.potentialIntents.length >= 2 && u.mappedIntents.length < u.potentialIntents.length && u.blockedBySignals.length > 0)
      .slice(0, 10)
      .map((u) => ({
        productId: u.productId,
        productTitle: u.productTitle,
        answerBlockId: u.answerBlockId,
        questionId: u.questionId,
        questionText: u.questionText,
        potentialIntents: u.potentialIntents,
        blockedBySignals: u.blockedBySignals,
        why: u.why,
        href: `/projects/${projectId}/products/${u.productId}?focus=geo`,
      }));

    const geoIssues = (issuesRes.issues ?? []).filter((i) => !!(i as any).geoIssueType);
    const topBlockers = geoIssues
      .map((i) => ({
        issueType: (i as any).geoIssueType as GeoIssueType,
        label: GEO_ISSUE_LABELS[(i as any).geoIssueType as GeoIssueType] ?? String((i as any).geoIssueType),
        affectedProducts: i.count ?? 0,
      }))
      .sort((a, b) => b.affectedProducts - a.affectedProducts)
      .slice(0, 5);

    const geoDurationsHours: number[] = [];
    for (const a of geoFixApps ?? []) {
      const createdAt = a.draft?.createdAt;
      if (!createdAt) continue;
      geoDurationsHours.push((a.appliedAt.getTime() - createdAt.getTime()) / 3600000);
    }
    const avgTimeToImproveHours =
      geoDurationsHours.length > 0
        ? Math.round((geoDurationsHours.reduce((sum, v) => sum + v, 0) / geoDurationsHours.length) * 10) / 10
        : null;

    const improvedApps = (geoFixApps ?? []).filter(
      (a) => confidenceOrdinal(a.afterConfidence) > confidenceOrdinal(a.beforeConfidence),
    );
    const improvedProducts = new Set(improvedApps.map((a) => a.productId)).size;
    const improvedEvents = improvedApps.length;

    const mostImprovedByProduct = new Map<string, number>();
    for (const a of geoFixApps ?? []) {
      mostImprovedByProduct.set(a.productId, (mostImprovedByProduct.get(a.productId) ?? 0) + (a.issuesResolvedCount ?? 0));
    }
    const mostImproved = [...mostImprovedByProduct.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, issuesResolvedCount]) => ({
        productId,
        productTitle: productsById.get(productId)?.title ?? 'Product',
        issuesResolvedCount,
        href: `/projects/${projectId}/products/${productId}?focus=geo`,
      }));

    const geoOpportunities: ProjectInsightsResponse['geoInsights']['opportunities'] = [];
    for (const u of couldBeReusedButArent.slice(0, 6)) {
      geoOpportunities.push({
        id: `reuse:${u.answerBlockId}`,
        title: 'Make this answer reusable across intents',
        why: `This Answer Unit could cover additional intents but is blocked by: ${u.blockedBySignals.join(', ')}.`,
        href: u.href,
        estimatedImpact: 'medium',
        category: 'reuse',
      });
    }

    // Product-level coverage gaps: highlight missing high-value intents first (transactional/comparative)
    const highValueIntents: SearchIntentType[] = ['transactional', 'comparative'];
    for (const intent of highValueIntents) {
      const missingProducts: string[] = [];
      for (const [pid, intents] of perProductCoveredIntents.entries()) {
        if (!intents.has(intent)) missingProducts.push(pid);
      }
      for (const pid of missingProducts.slice(0, 3)) {
        geoOpportunities.push({
          id: `coverage:${intent}:${pid}`,
          title: `Improve ${SEARCH_INTENT_LABELS[intent]} intent coverage`,
          why: `No answer-ready Answer Units are currently mapped to ${SEARCH_INTENT_LABELS[intent]} for this product.`,
          href: `/projects/${projectId}/products/${pid}?focus=geo`,
          estimatedImpact: intent === 'transactional' ? 'high' : 'medium',
          category: 'coverage',
        });
      }
    }

    for (const b of topBlockers.slice(0, 2)) {
      geoOpportunities.push({
        id: `trust:blocker:${b.issueType}`,
        title: `Reduce GEO blocker: ${b.label}`,
        why: `${b.affectedProducts} product(s) are currently affected by this blocker (derived from GEO issues).`,
        href: `/projects/${projectId}/issues?pillar=search_intent_fit`,
        estimatedImpact: 'medium',
        category: 'trust',
      });
    }

    const geoInsights: ProjectInsightsResponse['geoInsights'] = {
      overview: {
        productsAnswerReadyPercent: percent(productsAnswerReadyCount, productsTotal),
        productsAnswerReadyCount,
        productsTotal,
        answersTotal: (productsForGeo ?? []).reduce((sum: number, p: any) => sum + (p.answerBlocks?.length ?? 0), 0),
        answersMultiIntentCount: reuseStats.multiIntentAnswers,
        reuseRatePercent: reuseStats.reuseRatePercent,
        confidenceDistribution,
        trustTrajectory: {
          improvedProducts,
          improvedEvents,
          windowDays: days,
          why: 'Derived from ProductGeoFixApplication before/after confidence values (internal readiness signals; not external citations).',
        },
        whyThisMatters:
          'Answer readiness and intent coverage help your content be more extractable in AI answer experiences. These are internal, explainable signals — not ranking or citation guarantees.',
      },
      coverage: {
        byIntent: coverageByIntent,
        gaps,
        whyThisMatters:
          'Coverage shows whether your answer-ready content maps to key intent types (transactional, comparative, etc.). Gaps indicate where engines may not find a suitable on-site answer.',
      },
      reuse: {
        topReusedAnswers,
        couldBeReusedButArent,
        whyThisMatters:
          'Reusable answers reduce duplication across intents. Multi-intent reuse is only counted when clarity and structure are strong enough to support reliable extraction.',
      },
      trustSignals: {
        topBlockers,
        avgTimeToImproveHours,
        mostImproved,
        whyThisMatters:
          'Trust signals summarize common GEO blockers and how quickly improvements are applied. These are internal readiness indicators, not external citation tracking.',
      },
      opportunities: geoOpportunities.slice(0, 12),
    };

    return {
      projectId,
      generatedAt: new Date().toISOString(),
      window: { days, from: from.toISOString(), to: now.toISOString() },
      overview: {
        improved: {
          deoScore: {
            current: latestOverall,
            previous: prevOverall,
            delta: deoDelta,
            trend: trendFromDelta(deoDelta),
          },
          componentDeltas,
        },
        saved: {
          aiRunsUsed,
          aiRunsAvoidedViaReuse: aiSummary.aiRunsAvoided,
          reuseRatePercent: percent(aiSummary.reusedRuns, aiSummary.totalRuns),
          quota: {
            limit: monthlyLimit,
            used: aiRunsUsed,
            remaining,
            usedPercent,
          },
          trust: {
            applyAiRuns: aiSummary.applyAiRuns,
            invariantMessage:
              'Trust contract: APPLY runs never use AI. Preview may use AI; Apply never does.',
          },
        },
        resolved: {
          actionsCount,
          why: 'Derived from fix application logs and applied automation suggestions in the last 30 days.',
        },
        next,
      },
      progress: {
        deoScoreTrend,
        fixesAppliedTrend,
        openIssuesNow: {
          critical: openCritical.length,
          warning: openWarning.length,
          info: openInfo.length,
          total: issues.length,
        },
      },
      issueResolution: {
        byPillar,
        avgTimeToFixHours,
        topRecent,
        openHighImpact,
      },
      opportunities,
      geoInsights,
    };
  }
}
