import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProjectInsightsService } from './project-insights.service';
import { GovernanceService } from './governance.service';
import { AuditEventsService } from './audit-events.service';
import { ShareLinkAudience } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * [GEO-EXPORT-1] GEO Report Assembly and Share Link Service
 *
 * Assembles GEO report data for export/share and manages share links.
 * All data is read-only and derived from existing insights.
 */

export interface GeoReportData {
  projectId: string;
  projectName: string;
  generatedAt: string;

  overview: {
    productsAnswerReadyPercent: number;
    productsAnswerReadyCount: number;
    productsTotal: number;
    answersTotal: number;
    reuseRatePercent: number;
    confidenceDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  };

  coverage: {
    byIntent: Array<{
      intentType: string;
      label: string;
      productsCovered: number;
      productsTotal: number;
      coveragePercent: number;
    }>;
    gaps: string[];
    summary: string;
  };

  trustSignals: {
    topBlockers: Array<{
      label: string;
      affectedProducts: number;
    }>;
    avgTimeToImproveHours: number | null;
    summary: string;
  };

  opportunities: Array<{
    title: string;
    why: string;
    estimatedImpact: 'high' | 'medium' | 'low';
    category: 'coverage' | 'reuse' | 'trust';
  }>;

  disclaimer: string;
}

export interface ShareLinkResponse {
  id: string;
  shareToken: string;
  shareUrl: string;
  title: string | null;
  expiresAt: string;
  createdAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  // [ENTERPRISE-GEO-1] Passcode and audience fields
  audience: 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY';
  passcodeLast4?: string | null;
  passcodeCreatedAt?: string | null;
}

// [ENTERPRISE-GEO-1] Create share link with passcode support
export interface CreateShareLinkDto {
  title?: string;
  audience?: 'ANYONE_WITH_LINK' | 'PASSCODE';
}

export interface CreateShareLinkResponse {
  shareLink: ShareLinkResponse;
  // Only returned once at creation if audience is PASSCODE
  passcode?: string;
}

export interface PublicShareViewResponse {
  status: 'valid' | 'expired' | 'revoked' | 'not_found' | 'passcode_required' | 'passcode_invalid';
  report?: GeoReportData;
  expiresAt?: string;
  generatedAt?: string;
  // [ENTERPRISE-GEO-1] Passcode hints
  passcodeLast4?: string;
}

const DEFAULT_EXPIRY_DAYS = 14;

const DISCLAIMER_TEXT =
  'These metrics reflect internal content readiness signals. Actual citations by AI systems depend on many factors outside your control.';

// [ENTERPRISE-GEO-1] Passcode generation - 8 chars, A-Z 0-9
function generatePasscode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const array = new Uint8Array(8);
  require('crypto').randomFillSync(array);
  for (let i = 0; i < 8; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

@Injectable()
export class GeoReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectInsightsService: ProjectInsightsService,
    private readonly governanceService: GovernanceService,
    private readonly auditEventsService: AuditEventsService,
  ) {}

  /**
   * Assemble GEO report data for export/print
   * Uses existing insights endpoint - no new queries
   */
  async assembleReport(projectId: string, userId: string): Promise<GeoReportData> {
    // Get project name
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, userId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Get insights data (already authorized)
    const insights = await this.projectInsightsService.getProjectInsights(projectId, userId);
    const geo = insights.geoInsights;

    // Transform to export-safe format (no internal IDs, no hrefs)
    return {
      projectId,
      projectName: project.name,
      generatedAt: new Date().toISOString(),

      overview: {
        productsAnswerReadyPercent: geo.overview.productsAnswerReadyPercent,
        productsAnswerReadyCount: geo.overview.productsAnswerReadyCount,
        productsTotal: geo.overview.productsTotal,
        answersTotal: geo.overview.answersTotal,
        reuseRatePercent: geo.overview.reuseRatePercent,
        confidenceDistribution: geo.overview.confidenceDistribution,
      },

      coverage: {
        byIntent: geo.coverage.byIntent.map((intent) => ({
          intentType: intent.intentType,
          label: intent.label,
          productsCovered: intent.productsCovered,
          productsTotal: intent.productsTotal,
          coveragePercent: intent.coveragePercent,
        })),
        gaps: geo.coverage.gaps,
        summary: geo.coverage.whyThisMatters,
      },

      trustSignals: {
        topBlockers: geo.trustSignals.topBlockers.map((blocker) => ({
          label: blocker.label,
          affectedProducts: blocker.affectedProducts,
        })),
        avgTimeToImproveHours: geo.trustSignals.avgTimeToImproveHours,
        summary: geo.trustSignals.whyThisMatters,
      },

      opportunities: geo.opportunities.map((opp) => ({
        title: opp.title,
        why: opp.why,
        estimatedImpact: opp.estimatedImpact,
        category: opp.category,
      })),

      disclaimer: DISCLAIMER_TEXT,
    };
  }

  /**
   * Create a shareable link for the GEO report
   * [ENTERPRISE-GEO-1] Now supports passcode protection and governance policy
   */
  async createShareLink(
    projectId: string,
    userId: string,
    dto?: CreateShareLinkDto,
  ): Promise<CreateShareLinkResponse> {
    // Verify access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // [ENTERPRISE-GEO-1] Get governance settings for expiry and restrictions
    const shareLinkSettings = await this.governanceService.getShareLinkSettings(projectId);

    // If share links are restricted and audience is not allowed, reject
    if (shareLinkSettings.restricted) {
      const requestedAudience = dto?.audience || 'ANYONE_WITH_LINK';
      const allowedAudience = shareLinkSettings.audience;

      // PASSCODE > ANYONE_WITH_LINK, ORG_ONLY is most restrictive
      if (allowedAudience === 'ORG_ONLY') {
        throw new ForbiddenException('Governance policy restricts share links to organization members only');
      }
      if (allowedAudience === 'PASSCODE' && requestedAudience === 'ANYONE_WITH_LINK') {
        throw new ForbiddenException('Governance policy requires passcode protection for share links');
      }
    }

    const now = new Date();
    const expiryDays = shareLinkSettings.expiryDays || DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    // Determine audience
    const audience: ShareLinkAudience = dto?.audience === 'PASSCODE' ? 'PASSCODE' : 'ANYONE_WITH_LINK';

    // Generate passcode if needed
    let passcode: string | undefined;
    let passcodeHash: string | null = null;
    let passcodeLast4: string | null = null;
    let passcodeCreatedAt: Date | null = null;

    if (audience === 'PASSCODE') {
      passcode = generatePasscode();
      passcodeHash = await bcrypt.hash(passcode, 10);
      passcodeLast4 = passcode.slice(-4);
      passcodeCreatedAt = now;
    }

    const shareLink = await this.prisma.geoReportShareLink.create({
      data: {
        projectId,
        title: dto?.title || null,
        expiresAt,
        generatedAt: now,
        createdByUserId: userId,
        audience,
        passcodeHash,
        passcodeLast4,
        passcodeCreatedAt,
      },
    });

    // [ENTERPRISE-GEO-1] Log audit event for share link creation
    await this.auditEventsService.logShareLinkCreated(
      projectId,
      userId,
      shareLink.id,
      audience,
      expiryDays,
      passcodeLast4 || undefined,
    );

    return {
      shareLink: this.formatShareLinkResponse(shareLink),
      passcode, // Only defined if audience is PASSCODE - shown once at creation
    };
  }

  /**
   * List all share links for a project
   */
  async listShareLinks(projectId: string, userId: string): Promise<ShareLinkResponse[]> {
    // Verify access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const links = await this.prisma.geoReportShareLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return links.map((link) => this.formatShareLinkResponse(link));
  }

  /**
   * Revoke a share link
   * [ENTERPRISE-GEO-1] Now logs audit event
   */
  async revokeShareLink(
    projectId: string,
    linkId: string,
    userId: string,
  ): Promise<{ success: true }> {
    // Verify access
    const link = await this.prisma.geoReportShareLink.findFirst({
      where: { id: linkId, projectId },
      include: { project: { select: { userId: true } } },
    });

    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    if (link.project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (link.status === 'REVOKED') {
      throw new BadRequestException('Share link is already revoked');
    }

    await this.prisma.geoReportShareLink.update({
      where: { id: linkId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    // [ENTERPRISE-GEO-1] Log audit event for share link revocation
    await this.auditEventsService.logShareLinkRevoked(projectId, userId, linkId);

    return { success: true };
  }

  /**
   * Get public share view (no auth required)
   * [ENTERPRISE-GEO-1] Now supports passcode verification and content redaction
   */
  async getPublicShareView(
    shareToken: string,
    passcode?: string,
  ): Promise<PublicShareViewResponse> {
    const link = await this.prisma.geoReportShareLink.findUnique({
      where: { shareToken },
      include: {
        project: {
          select: { id: true, name: true, userId: true },
        },
      },
    });

    if (!link) {
      return { status: 'not_found' };
    }

    if (link.status === 'REVOKED') {
      return { status: 'revoked' };
    }

    const now = new Date();
    if (link.expiresAt < now) {
      // [ENTERPRISE-GEO-1] Read-only check - no DB mutation during public view
      // Status is computed at read time, not persisted during view access
      return { status: 'expired' };
    }

    // [ENTERPRISE-GEO-1] Handle passcode-protected links
    if (link.audience === 'PASSCODE') {
      if (!passcode) {
        return {
          status: 'passcode_required',
          passcodeLast4: link.passcodeLast4 || undefined,
        };
      }

      // Verify passcode
      const isValid = link.passcodeHash
        ? await bcrypt.compare(passcode, link.passcodeHash)
        : false;

      if (!isValid) {
        return {
          status: 'passcode_invalid',
          passcodeLast4: link.passcodeLast4 || undefined,
        };
      }
    }

    // Get governance export control settings
    const exportSettings = await this.governanceService.getExportControlSettings(link.project.id);

    // Get report data (using the project owner's userId for authorization)
    let report = await this.assembleReportInternal(link.project.id, link.project.name);

    // [ENTERPRISE-GEO-1] Apply content redaction if competitor mentions are not allowed
    if (!exportSettings.allowCompetitorMentions) {
      report = this.redactCompetitorMentions(report);
    }

    return {
      status: 'valid',
      report,
      expiresAt: link.expiresAt.toISOString(),
      generatedAt: link.generatedAt.toISOString(),
    };
  }

  /**
   * [ENTERPRISE-GEO-1] Redact competitor mentions from report data
   * This is a simple implementation that replaces common competitor-related patterns
   */
  private redactCompetitorMentions(report: GeoReportData): GeoReportData {
    const redactText = (text: string): string => {
      // Redact common competitor mention patterns
      // This is a placeholder - in production you'd have a list of known competitors
      return text
        .replace(/\b(competitor|competing|rival|alternative)\s+\w+/gi, '[REDACTED]')
        .replace(/\bvs\.?\s+\w+/gi, 'vs. [REDACTED]')
        .replace(/\bcompared\s+to\s+\w+/gi, 'compared to [REDACTED]');
    };

    return {
      ...report,
      coverage: {
        ...report.coverage,
        gaps: report.coverage.gaps.map(redactText),
        summary: redactText(report.coverage.summary),
      },
      trustSignals: {
        ...report.trustSignals,
        summary: redactText(report.trustSignals.summary),
      },
      opportunities: report.opportunities.map((opp) => ({
        ...opp,
        title: redactText(opp.title),
        why: redactText(opp.why),
      })),
    };
  }

  /**
   * Internal method to assemble report without auth checks (for public share view)
   */
  private async assembleReportInternal(projectId: string, projectName: string): Promise<GeoReportData> {
    // Get project owner
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get insights with owner's userId
    const insights = await this.projectInsightsService.getProjectInsights(projectId, project.userId);
    const geo = insights.geoInsights;

    return {
      projectId,
      projectName,
      generatedAt: new Date().toISOString(),

      overview: {
        productsAnswerReadyPercent: geo.overview.productsAnswerReadyPercent,
        productsAnswerReadyCount: geo.overview.productsAnswerReadyCount,
        productsTotal: geo.overview.productsTotal,
        answersTotal: geo.overview.answersTotal,
        reuseRatePercent: geo.overview.reuseRatePercent,
        confidenceDistribution: geo.overview.confidenceDistribution,
      },

      coverage: {
        byIntent: geo.coverage.byIntent.map((intent) => ({
          intentType: intent.intentType,
          label: intent.label,
          productsCovered: intent.productsCovered,
          productsTotal: intent.productsTotal,
          coveragePercent: intent.coveragePercent,
        })),
        gaps: geo.coverage.gaps,
        summary: geo.coverage.whyThisMatters,
      },

      trustSignals: {
        topBlockers: geo.trustSignals.topBlockers.map((blocker) => ({
          label: blocker.label,
          affectedProducts: blocker.affectedProducts,
        })),
        avgTimeToImproveHours: geo.trustSignals.avgTimeToImproveHours,
        summary: geo.trustSignals.whyThisMatters,
      },

      opportunities: geo.opportunities.map((opp) => ({
        title: opp.title,
        why: opp.why,
        estimatedImpact: opp.estimatedImpact,
        category: opp.category,
      })),

      disclaimer: DISCLAIMER_TEXT,
    };
  }

  private formatShareLinkResponse(link: any): ShareLinkResponse {
    const now = new Date();
    let status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' = link.status;
    if (status === 'ACTIVE' && link.expiresAt < now) {
      status = 'EXPIRED';
    }

    // Generate public URL
    const baseUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/geo-report/${link.shareToken}`;

    // [ENTERPRISE-GEO-1] Map audience and passcode fields
    const audienceMap: Record<string, 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY'> = {
      ANYONE_WITH_LINK: 'ANYONE_WITH_LINK',
      PASSCODE: 'PASSCODE',
      ORG_ONLY: 'ORG_ONLY',
    };

    return {
      id: link.id,
      shareToken: link.shareToken,
      shareUrl,
      title: link.title,
      expiresAt: link.expiresAt.toISOString(),
      createdAt: link.createdAt.toISOString(),
      status,
      audience: audienceMap[link.audience] || 'ANYONE_WITH_LINK',
      passcodeLast4: link.passcodeLast4 || null,
      passcodeCreatedAt: link.passcodeCreatedAt?.toISOString() || null,
    };
  }
}
