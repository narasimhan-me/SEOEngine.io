/**
 * Unit tests for GeoReportsService
 *
 * Tests:
 * - assembleReport() assembles report data correctly
 * - assembleReport() throws NotFoundException when project not found
 * - createShareLink() creates share link with passcode support
 * - createShareLink() enforces governance restrictions
 * - listShareLinks() returns share links for project
 * - revokeShareLink() revokes share link
 * - getPublicShareView() returns public view with passcode verification
 * - getPublicShareView() handles expired and revoked links
 */
import { GeoReportsService } from '../../../src/projects/geo-reports.service';
import { PrismaService } from '../../../src/prisma.service';
import { ProjectInsightsService } from '../../../src/projects/project-insights.service';
import { GovernanceService } from '../../../src/projects/governance.service';
import { AuditEventsService } from '../../../src/projects/audit-events.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
  },
  geoReportShareLink: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});

const createProjectInsightsServiceMock = () => ({
  getProjectInsights: jest.fn(),
});

const createGovernanceServiceMock = () => ({
  getShareLinkSettings: jest.fn(),
  getExportControlSettings: jest.fn(),
});

const createAuditEventsServiceMock = () => ({
  logShareLinkCreated: jest.fn(),
  logShareLinkRevoked: jest.fn(),
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  assertOwnerRole: jest.fn().mockResolvedValue(undefined),
});

jest.mock('bcrypt');
jest.mock('crypto', () => ({
  randomFillSync: jest.fn((array: Uint8Array) => {
    // Fill with predictable values for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 36; // Maps to A-Z0-9
    }
  }),
}));

describe('GeoReportsService', () => {
  let service: GeoReportsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let projectInsightsServiceMock: ReturnType<
    typeof createProjectInsightsServiceMock
  >;
  let governanceServiceMock: ReturnType<typeof createGovernanceServiceMock>;
  let auditEventsServiceMock: ReturnType<typeof createAuditEventsServiceMock>;
  let roleResolutionServiceMock: ReturnType<
    typeof createRoleResolutionServiceMock
  >;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    projectInsightsServiceMock = createProjectInsightsServiceMock();
    governanceServiceMock = createGovernanceServiceMock();
    auditEventsServiceMock = createAuditEventsServiceMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();

    service = new GeoReportsService(
      prismaMock as unknown as PrismaService,
      projectInsightsServiceMock as unknown as ProjectInsightsService,
      governanceServiceMock as unknown as GovernanceService,
      auditEventsServiceMock as unknown as AuditEventsService,
      roleResolutionServiceMock as unknown as RoleResolutionService
    );

    // Mock bcrypt
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-passcode');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assembleReport', () => {
    it('should assemble report data correctly', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
      };

      const mockInsights = {
        geoInsights: {
          overview: {
            productsAnswerReadyPercent: 75,
            productsAnswerReadyCount: 30,
            productsTotal: 40,
            answersTotal: 120,
            reuseRatePercent: 80,
            confidenceDistribution: {
              high: 60,
              medium: 30,
              low: 10,
            },
          },
          coverage: {
            byIntent: [
              {
                intentType: 'informational',
                label: 'Informational',
                productsCovered: 25,
                productsTotal: 40,
                coveragePercent: 62.5,
              },
            ],
            gaps: ['Missing FAQ content'],
            whyThisMatters: 'Coverage matters for discovery',
          },
          trustSignals: {
            topBlockers: [
              { label: 'Missing images', affectedProducts: 5 },
            ],
            avgTimeToImproveHours: 24,
            whyThisMatters: 'Trust signals matter',
          },
          opportunities: [
            {
              title: 'Improve SEO',
              why: 'Better SEO helps',
              estimatedImpact: 'high' as const,
              category: 'coverage' as const,
            },
          ],
        },
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      projectInsightsServiceMock.getProjectInsights.mockResolvedValue(
        mockInsights
      );

      const result = await service.assembleReport('proj-1', 'user-1');

      expect(result).toMatchObject({
        projectId: 'proj-1',
        projectName: 'Test Project',
        overview: {
          productsAnswerReadyPercent: 75,
          productsAnswerReadyCount: 30,
          productsTotal: 40,
          answersTotal: 120,
          reuseRatePercent: 80,
        },
      });
      expect(result.generatedAt).toBeDefined();
      expect(roleResolutionServiceMock.assertProjectAccess).toHaveBeenCalledWith(
        'proj-1',
        'user-1'
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        service.assembleReport('proj-1', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createShareLink', () => {
    it('should create share link without passcode', async () => {
      const mockProject = { id: 'proj-1', userId: 'user-1' };
      const mockShareLink = {
        id: 'link-1',
        shareToken: 'token-123',
        projectId: 'proj-1',
        title: 'My Report',
        expiresAt: new Date('2024-12-31'),
        createdAt: new Date('2024-01-01'),
        generatedAt: new Date('2024-01-01'),
        createdByUserId: 'user-1',
        audience: 'ANYONE_WITH_LINK',
        status: 'ACTIVE',
        passcodeHash: null,
        passcodeLast4: null,
        passcodeCreatedAt: null,
        revokedAt: null,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      governanceServiceMock.getShareLinkSettings.mockResolvedValue({
        restricted: false,
        audience: 'ANYONE_WITH_LINK',
        expiryDays: 14,
      });
      prismaMock.geoReportShareLink.create.mockResolvedValue(mockShareLink);

      const result = await service.createShareLink('proj-1', 'user-1', {
        title: 'My Report',
      });

      expect(result.shareLink).toBeDefined();
      expect(result.passcode).toBeUndefined();
      expect(roleResolutionServiceMock.assertOwnerRole).toHaveBeenCalledWith(
        'proj-1',
        'user-1'
      );
      expect(auditEventsServiceMock.logShareLinkCreated).toHaveBeenCalled();
    });

    it('should create share link with passcode', async () => {
      const mockProject = { id: 'proj-1', userId: 'user-1' };
      const mockShareLink = {
        id: 'link-1',
        shareToken: 'token-123',
        projectId: 'proj-1',
        title: null,
        expiresAt: new Date('2024-12-31'),
        createdAt: new Date('2024-01-01'),
        generatedAt: new Date('2024-01-01'),
        createdByUserId: 'user-1',
        audience: 'PASSCODE',
        status: 'ACTIVE',
        passcodeHash: 'hashed-passcode',
        passcodeLast4: '5678',
        passcodeCreatedAt: new Date('2024-01-01'),
        revokedAt: null,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      governanceServiceMock.getShareLinkSettings.mockResolvedValue({
        restricted: false,
        audience: 'ANYONE_WITH_LINK',
        expiryDays: 14,
      });
      prismaMock.geoReportShareLink.create.mockResolvedValue(mockShareLink);

      const result = await service.createShareLink('proj-1', 'user-1', {
        audience: 'PASSCODE',
      });

      expect(result.shareLink).toBeDefined();
      expect(result.passcode).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should enforce governance restrictions for ORG_ONLY', async () => {
      const mockProject = { id: 'proj-1', userId: 'user-1' };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      governanceServiceMock.getShareLinkSettings.mockResolvedValue({
        restricted: true,
        audience: 'ORG_ONLY',
        expiryDays: 14,
      });

      await expect(
        service.createShareLink('proj-1', 'user-1', {
          audience: 'ANYONE_WITH_LINK',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce governance restrictions for PASSCODE', async () => {
      const mockProject = { id: 'proj-1', userId: 'user-1' };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      governanceServiceMock.getShareLinkSettings.mockResolvedValue({
        restricted: true,
        audience: 'PASSCODE',
        expiryDays: 14,
      });

      await expect(
        service.createShareLink('proj-1', 'user-1', {
          audience: 'ANYONE_WITH_LINK',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listShareLinks', () => {
    it('should return share links for project', async () => {
      const mockProject = { id: 'proj-1', userId: 'user-1' };
      const mockLinks = [
        {
          id: 'link-1',
          shareToken: 'token-123',
          projectId: 'proj-1',
          title: 'Report 1',
          expiresAt: new Date('2024-12-31'),
          createdAt: new Date('2024-01-01'),
          generatedAt: new Date('2024-01-01'),
          createdByUserId: 'user-1',
          audience: 'ANYONE_WITH_LINK',
          status: 'ACTIVE',
          passcodeHash: null,
          passcodeLast4: null,
          passcodeCreatedAt: null,
          revokedAt: null,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.geoReportShareLink.findMany.mockResolvedValue(mockLinks);

      const result = await service.listShareLinks('proj-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('link-1');
      expect(roleResolutionServiceMock.assertProjectAccess).toHaveBeenCalledWith(
        'proj-1',
        'user-1'
      );
    });
  });

  describe('revokeShareLink', () => {
    it('should revoke share link', async () => {
      const mockLink = {
        id: 'link-1',
        projectId: 'proj-1',
        status: 'ACTIVE',
        project: { userId: 'user-1' },
      };

      prismaMock.geoReportShareLink.findFirst.mockResolvedValue(mockLink);
      prismaMock.geoReportShareLink.update.mockResolvedValue({
        ...mockLink,
        status: 'REVOKED',
      });

      const result = await service.revokeShareLink('proj-1', 'link-1', 'user-1');

      expect(result.success).toBe(true);
      expect(prismaMock.geoReportShareLink.update).toHaveBeenCalledWith({
        where: { id: 'link-1' },
        data: {
          status: 'REVOKED',
          revokedAt: expect.any(Date),
        },
      });
      expect(auditEventsServiceMock.logShareLinkRevoked).toHaveBeenCalled();
    });

    it('should throw BadRequestException when link already revoked', async () => {
      const mockLink = {
        id: 'link-1',
        projectId: 'proj-1',
        status: 'REVOKED',
        project: { userId: 'user-1' },
      };

      prismaMock.geoReportShareLink.findFirst.mockResolvedValue(mockLink);

      await expect(
        service.revokeShareLink('proj-1', 'link-1', 'user-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPublicShareView', () => {
    it('should return valid report with correct passcode', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const mockLink = {
        id: 'link-1',
        shareToken: 'token-123',
        projectId: 'proj-1',
        status: 'ACTIVE',
        expiresAt: futureDate,
        generatedAt: new Date('2024-01-01'),
        audience: 'PASSCODE',
        passcodeHash: 'hashed-passcode',
        passcodeLast4: '5678',
        project: {
          id: 'proj-1',
          name: 'Test Project',
          userId: 'user-1',
        },
      };

      const mockInsights = {
        geoInsights: {
          overview: {
            productsAnswerReadyPercent: 75,
            productsAnswerReadyCount: 30,
            productsTotal: 40,
            answersTotal: 120,
            reuseRatePercent: 80,
            confidenceDistribution: { high: 60, medium: 30, low: 10 },
          },
          coverage: {
            byIntent: [],
            gaps: [],
            whyThisMatters: 'Coverage matters',
          },
          trustSignals: {
            topBlockers: [],
            avgTimeToImproveHours: null,
            whyThisMatters: 'Trust matters',
          },
          opportunities: [],
        },
      };

      prismaMock.geoReportShareLink.findUnique.mockResolvedValue(mockLink);
      // Mock project lookup for assembleReportInternal
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
      });
      governanceServiceMock.getExportControlSettings.mockResolvedValue({
        allowCompetitorMentions: true,
      });
      projectInsightsServiceMock.getProjectInsights.mockResolvedValue(
        mockInsights
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.getPublicShareView('token-123', 'PASS1234');

      expect(result.status).toBe('valid');
      expect(result.report).toBeDefined();
      expect(result.report?.projectId).toBe('proj-1');
    });

    it('should return passcode_required when passcode not provided', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const mockLink = {
        id: 'link-1',
        shareToken: 'token-123',
        projectId: 'proj-1',
        status: 'ACTIVE',
        expiresAt: futureDate,
        generatedAt: new Date('2024-01-01'),
        audience: 'PASSCODE',
        passcodeHash: 'hashed-passcode',
        passcodeLast4: '5678',
        project: {
          id: 'proj-1',
          name: 'Test Project',
          userId: 'user-1',
        },
      };

      prismaMock.geoReportShareLink.findUnique.mockResolvedValue(mockLink);

      const result = await service.getPublicShareView('token-123');

      expect(result.status).toBe('passcode_required');
      expect(result.passcodeLast4).toBe('5678');
    });

    it('should return passcode_invalid when passcode is wrong', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const mockLink = {
        id: 'link-1',
        shareToken: 'token-123',
        projectId: 'proj-1',
        status: 'ACTIVE',
        expiresAt: futureDate,
        generatedAt: new Date('2024-01-01'),
        audience: 'PASSCODE',
        passcodeHash: 'hashed-passcode',
        passcodeLast4: '5678',
        project: {
          id: 'proj-1',
          name: 'Test Project',
          userId: 'user-1',
        },
      };

      prismaMock.geoReportShareLink.findUnique.mockResolvedValue(mockLink);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.getPublicShareView('token-123', 'WRONG');

      expect(result.status).toBe('passcode_invalid');
    });

    it('should return expired when link is expired', async () => {
      const mockLink = {
        id: 'link-1',
        shareToken: 'token-123',
        projectId: 'proj-1',
        status: 'ACTIVE',
        expiresAt: new Date('2020-01-01'), // Past date
        generatedAt: new Date('2024-01-01'),
        audience: 'ANYONE_WITH_LINK',
        passcodeHash: null,
        passcodeLast4: null,
        project: {
          id: 'proj-1',
          name: 'Test Project',
          userId: 'user-1',
        },
      };

      prismaMock.geoReportShareLink.findUnique.mockResolvedValue(mockLink);

      const result = await service.getPublicShareView('token-123');

      expect(result.status).toBe('expired');
    });

    it('should return revoked when link is revoked', async () => {
      const mockLink = {
        id: 'link-1',
        shareToken: 'token-123',
        projectId: 'proj-1',
        status: 'REVOKED',
        expiresAt: new Date('2024-12-31'),
        generatedAt: new Date('2024-01-01'),
        audience: 'ANYONE_WITH_LINK',
        passcodeHash: null,
        passcodeLast4: null,
        project: {
          id: 'proj-1',
          name: 'Test Project',
          userId: 'user-1',
        },
      };

      prismaMock.geoReportShareLink.findUnique.mockResolvedValue(mockLink);

      const result = await service.getPublicShareView('token-123');

      expect(result.status).toBe('revoked');
    });

    it('should return not_found when link does not exist', async () => {
      prismaMock.geoReportShareLink.findUnique.mockResolvedValue(null);

      const result = await service.getPublicShareView('invalid-token');

      expect(result.status).toBe('not_found');
    });

    it('should redact competitor mentions when export controls disable them', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const mockLink = {
        id: 'link-1',
        shareToken: 'token-123',
        projectId: 'proj-1',
        status: 'ACTIVE',
        expiresAt: futureDate,
        generatedAt: new Date('2024-01-01'),
        audience: 'ANYONE_WITH_LINK',
        passcodeHash: null,
        passcodeLast4: null,
        project: {
          id: 'proj-1',
          name: 'Test Project',
          userId: 'user-1',
        },
      };

      const mockInsights = {
        geoInsights: {
          overview: {
            productsAnswerReadyPercent: 75,
            productsAnswerReadyCount: 30,
            productsTotal: 40,
            answersTotal: 120,
            reuseRatePercent: 80,
            confidenceDistribution: { high: 60, medium: 30, low: 10 },
          },
          coverage: {
            byIntent: [],
            gaps: ['Better than competitor Amazon', 'Compared to rival brands'],
            whyThisMatters: 'Coverage vs. competitor X matters',
          },
          trustSignals: {
            topBlockers: [],
            avgTimeToImproveHours: null,
            whyThisMatters: 'Trust compared to alternative products',
          },
          opportunities: [
            {
              title: 'Beat competing brand Y',
              why: 'Rival companies are ahead',
              estimatedImpact: 'high' as const,
              category: 'coverage' as const,
            },
          ],
        },
      };

      prismaMock.geoReportShareLink.findUnique.mockResolvedValue(mockLink);
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
      });
      // Disable competitor mentions in export controls
      governanceServiceMock.getExportControlSettings.mockResolvedValue({
        allowCompetitorMentions: false,
      });
      projectInsightsServiceMock.getProjectInsights.mockResolvedValue(
        mockInsights
      );

      const result = await service.getPublicShareView('token-123');

      expect(result.status).toBe('valid');
      expect(result.report).toBeDefined();
      // Verify competitor mentions are redacted
      expect(result.report?.coverage.gaps[0]).toContain('[REDACTED]');
      expect(result.report?.coverage.gaps[1]).toContain('[REDACTED]');
      expect(result.report?.coverage.summary).toContain('[REDACTED]');
      expect(result.report?.trustSignals.summary).toContain('[REDACTED]');
      expect(result.report?.opportunities[0].title).toContain('[REDACTED]');
      expect(result.report?.opportunities[0].why).toContain('[REDACTED]');
    });

    it('should not redact when competitor mentions are allowed', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const mockLink = {
        id: 'link-1',
        shareToken: 'token-123',
        projectId: 'proj-1',
        status: 'ACTIVE',
        expiresAt: futureDate,
        generatedAt: new Date('2024-01-01'),
        audience: 'ANYONE_WITH_LINK',
        passcodeHash: null,
        passcodeLast4: null,
        project: {
          id: 'proj-1',
          name: 'Test Project',
          userId: 'user-1',
        },
      };

      const mockInsights = {
        geoInsights: {
          overview: {
            productsAnswerReadyPercent: 75,
            productsAnswerReadyCount: 30,
            productsTotal: 40,
            answersTotal: 120,
            reuseRatePercent: 80,
            confidenceDistribution: { high: 60, medium: 30, low: 10 },
          },
          coverage: {
            byIntent: [],
            gaps: ['Better than competitor Amazon'],
            whyThisMatters: 'Coverage vs. competitor X matters',
          },
          trustSignals: {
            topBlockers: [],
            avgTimeToImproveHours: null,
            whyThisMatters: 'Trust signals matter',
          },
          opportunities: [],
        },
      };

      prismaMock.geoReportShareLink.findUnique.mockResolvedValue(mockLink);
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        userId: 'user-1',
      });
      // Allow competitor mentions
      governanceServiceMock.getExportControlSettings.mockResolvedValue({
        allowCompetitorMentions: true,
      });
      projectInsightsServiceMock.getProjectInsights.mockResolvedValue(
        mockInsights
      );

      const result = await service.getPublicShareView('token-123');

      expect(result.status).toBe('valid');
      // Competitor mentions should NOT be redacted
      expect(result.report?.coverage.gaps[0]).toBe(
        'Better than competitor Amazon'
      );
      expect(result.report?.coverage.summary).toBe(
        'Coverage vs. competitor X matters'
      );
    });
  });

  describe('listShareLinks', () => {
    it('should throw NotFoundException when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        service.listShareLinks('non-existent', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeShareLink', () => {
    it('should throw NotFoundException when link not found', async () => {
      prismaMock.geoReportShareLink.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeShareLink('proj-1', 'non-existent', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
