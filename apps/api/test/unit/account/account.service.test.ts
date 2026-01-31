/**
 * Unit tests for AccountService
 *
 * Tests:
 * - getProfile() returns user profile
 * - updateProfile() updates profile and writes audit log
 * - getPreferences() returns user preferences (with lazy init)
 * - updatePreferences() updates preferences (with VIEWER restriction)
 * - getAiUsageSummary() returns AI usage summary
 * - getConnectedStores() returns connected stores
 * - disconnectStore() disconnects store (with role checks)
 * - getActiveSessions() returns active sessions
 * - signOutAllSessions() delegates to AuthService
 */
import { AccountService } from '../../../src/account/account.service';
import { PrismaService } from '../../../src/prisma.service';
import { AuthService } from '../../../src/auth/auth.service';
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const createPrismaMock = () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userPreferences: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userAccountAuditLog: {
    create: jest.fn(),
  },
  automationPlaybookRun: {
    findMany: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  integration: {
    deleteMany: jest.fn(),
  },
  userSession: {
    findMany: jest.fn(),
  },
});

const createAuthServiceMock = () => ({
  signOutAllSessions: jest.fn(),
});

const createEntitlementsServiceMock = () => ({
  getUserPlan: jest.fn(),
});

const createRoleResolutionServiceMock = () => ({
  assertOwnerRole: jest.fn(),
});

describe('AccountService', () => {
  let service: AccountService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let authServiceMock: ReturnType<typeof createAuthServiceMock>;
  let entitlementsServiceMock: ReturnType<typeof createEntitlementsServiceMock>;
  let roleResolutionServiceMock: ReturnType<
    typeof createRoleResolutionServiceMock
  >;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    authServiceMock = createAuthServiceMock();
    entitlementsServiceMock = createEntitlementsServiceMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();
    service = new AccountService(
      prismaMock as unknown as PrismaService,
      authServiceMock as unknown as AuthService,
      entitlementsServiceMock as unknown as EntitlementsService,
      roleResolutionServiceMock as unknown as RoleResolutionService
    );
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        timezone: 'UTC',
        locale: 'en',
        organizationName: 'Test Org',
        accountRole: 'OWNER',
        lastLoginAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          timezone: true,
          locale: true,
          organizationName: true,
          accountRole: true,
          lastLoginAt: true,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('user-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile and write audit log', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Updated Name',
        avatarUrl: null,
        timezone: 'America/New_York',
        locale: 'en',
        organizationName: 'Test Org',
        accountRole: 'OWNER',
        lastLoginAt: new Date(),
      };

      prismaMock.user.update.mockResolvedValue(mockUser);
      prismaMock.userAccountAuditLog.create.mockResolvedValue({});

      const result = await service.updateProfile('user-1', {
        name: 'Updated Name',
        timezone: 'America/New_York',
      });

      expect(result).toEqual(mockUser);
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(prismaMock.userAccountAuditLog.create).toHaveBeenCalledWith({
        data: {
          actorUserId: 'user-1',
          actionType: 'profile_updated',
          metadata: {
            updatedFields: ['name', 'timezone'],
          },
        },
      });
    });
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPrefs = {
        userId: 'user-1',
        notifyQuotaWarnings: true,
        notifyRunFailures: true,
        notifyWeeklyDeoSummary: false,
        autoOpenIssuesTab: true,
        preferredPillarLanding: 'issues',
      };

      prismaMock.userPreferences.findUnique.mockResolvedValue(mockPrefs);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual({
        notifyQuotaWarnings: true,
        notifyRunFailures: true,
        notifyWeeklyDeoSummary: false,
        autoOpenIssuesTab: true,
        preferredPillarLanding: 'issues',
      });
    });

    it('should create default preferences when none exist (lazy init)', async () => {
      const mockPrefs = {
        userId: 'user-1',
        notifyQuotaWarnings: true,
        notifyRunFailures: true,
        notifyWeeklyDeoSummary: true,
        autoOpenIssuesTab: false,
        preferredPillarLanding: null,
      };

      prismaMock.userPreferences.findUnique.mockResolvedValue(null);
      prismaMock.userPreferences.create.mockResolvedValue(mockPrefs);

      const result = await service.getPreferences('user-1');

      expect(prismaMock.userPreferences.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
      expect(result).toHaveProperty('notifyQuotaWarnings');
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences and write audit log', async () => {
      const mockPrefs = {
        userId: 'user-1',
        notifyQuotaWarnings: false,
        notifyRunFailures: true,
        notifyWeeklyDeoSummary: true,
        autoOpenIssuesTab: true,
        preferredPillarLanding: 'products',
      };

      prismaMock.userPreferences.findUnique.mockResolvedValue(mockPrefs);
      prismaMock.userPreferences.update.mockResolvedValue({
        ...mockPrefs,
        notifyQuotaWarnings: false,
      });
      prismaMock.userAccountAuditLog.create.mockResolvedValue({});

      const result = await service.updatePreferences(
        'user-1',
        { notifyQuotaWarnings: false },
        'OWNER'
      );

      expect(result.notifyQuotaWarnings).toBe(false);
      expect(prismaMock.userAccountAuditLog.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for VIEWER role', async () => {
      await expect(
        service.updatePreferences('user-1', { notifyQuotaWarnings: false }, 'VIEWER')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAiUsageSummary', () => {
    it('should return AI usage summary', async () => {
      const mockRuns = [
        { runType: 'PREVIEW_GENERATE', aiUsed: true, reusedFromRunId: null },
        { runType: 'APPLY', aiUsed: false, reusedFromRunId: null },
        { runType: 'PREVIEW_GENERATE', aiUsed: false, reusedFromRunId: 'run-1' },
      ];

      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue(mockRuns);

      const result = await service.getAiUsageSummary('user-1');

      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('periodLabel');
      expect(result.totalRuns).toBe(3);
      expect(result.aiUsedRuns).toBe(1);
      expect(result.reusedRuns).toBe(1);
      expect(result.applyInvariantViolations).toBe(0);
      expect(result.applyInvariantMessage).toContain('APPLY never uses AI');
    });

    it('should detect APPLY invariant violations', async () => {
      const mockRuns = [
        { runType: 'APPLY', aiUsed: true, reusedFromRunId: null }, // Violation!
      ];

      entitlementsServiceMock.getUserPlan.mockResolvedValue('pro');
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue(mockRuns);

      const result = await service.getAiUsageSummary('user-1');

      expect(result.applyInvariantViolations).toBe(1);
      expect(result.applyInvariantMessage).toContain('WARNING');
    });
  });

  describe('getConnectedStores', () => {
    it('should return connected stores', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'My Store',
          domain: 'mystore.myshopify.com',
          integrations: [
            {
              id: 'int-1',
              type: 'SHOPIFY',
              accessToken: 'token',
              externalId: 'shop-123',
              createdAt: new Date('2024-01-01'),
            },
          ],
        },
      ];

      prismaMock.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.getConnectedStores('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        projectId: 'proj-1',
        projectName: 'My Store',
        storeDomain: 'mystore.myshopify.com',
        integrationType: 'SHOPIFY',
        integrationId: 'int-1',
        connectedAt: mockProjects[0].integrations[0].createdAt,
      });
    });

    it('should return empty array when no stores connected', async () => {
      prismaMock.project.findMany.mockResolvedValue([]);

      const result = await service.getConnectedStores('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('disconnectStore', () => {
    it('should disconnect store for OWNER', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'My Store',
      });
      roleResolutionServiceMock.assertOwnerRole.mockResolvedValue(undefined);
      prismaMock.integration.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.userAccountAuditLog.create.mockResolvedValue({});

      const result = await service.disconnectStore('user-1', 'proj-1', 'OWNER');

      expect(result).toEqual({ success: true });
      expect(prismaMock.integration.deleteMany).toHaveBeenCalledWith({
        where: {
          projectId: 'proj-1',
          type: 'SHOPIFY',
        },
      });
      expect(prismaMock.userAccountAuditLog.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-OWNER account role', async () => {
      await expect(
        service.disconnectStore('user-1', 'proj-1', 'VIEWER')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        service.disconnectStore('user-1', 'proj-1', 'OWNER')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not have project OWNER role', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'My Store',
      });
      roleResolutionServiceMock.assertOwnerRole.mockRejectedValue(
        new ForbiddenException('Not owner')
      );

      await expect(
        service.disconnectStore('user-1', 'proj-1', 'OWNER')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions with current session marked', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          createdAt: new Date('2024-01-01'),
          lastSeenAt: new Date('2024-01-02'),
          ip: '192.168.1.1',
          userAgent: 'Chrome',
        },
        {
          id: 'session-2',
          createdAt: new Date('2024-01-03'),
          lastSeenAt: new Date('2024-01-04'),
          ip: '192.168.1.2',
          userAgent: 'Firefox',
        },
      ];

      prismaMock.userSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getActiveSessions('user-1', 'session-1');

      expect(result).toHaveLength(2);
      expect(result[0].isCurrent).toBe(true);
      expect(result[1].isCurrent).toBe(false);
    });

    it('should return sessions without current marker when no currentSessionId', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          createdAt: new Date('2024-01-01'),
          lastSeenAt: null,
          ip: null,
          userAgent: null,
        },
      ];

      prismaMock.userSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getActiveSessions('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].isCurrent).toBe(false);
    });
  });

  describe('signOutAllSessions', () => {
    it('should delegate to AuthService', async () => {
      authServiceMock.signOutAllSessions.mockResolvedValue({ revokedCount: 3 });

      const result = await service.signOutAllSessions('user-1');

      expect(result).toEqual({ revokedCount: 3 });
      expect(authServiceMock.signOutAllSessions).toHaveBeenCalledWith('user-1');
    });
  });
});
