/**
 * ACCOUNT-TESTS: Integration tests for Account Service
 *
 * Tests:
 * - Profile management (get, update)
 * - Preferences management (get, update, lazy init)
 * - AI usage summary computation
 * - Connected stores listing and disconnect
 * - Session management
 * - Access control and audit logging
 *
 * NOTE: These tests require a test database to be configured.
 */
import { AccountService } from '../../../src/account/account.service';
import { AuthService } from '../../../src/auth/auth.service';
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('AccountService (integration)', () => {
  let accountService: AccountService;
  let authServiceMock: AuthService;
  let entitlementsService: EntitlementsService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string; email: string };

  beforeAll(async () => {
    entitlementsService = new EntitlementsService(testPrisma as any);
    roleResolutionService = new RoleResolutionService(testPrisma as any);

    // Mock AuthService for session management
    authServiceMock = {
      signOutAllSessions: jest.fn().mockResolvedValue({ revokedCount: 2 }),
    } as unknown as AuthService;

    accountService = new AccountService(
      testPrisma as any,
      authServiceMock,
      entitlementsService,
      roleResolutionService
    );
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();

    testUser = await testPrisma.user.create({
      data: {
        email: `account-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Account Test User',
        accountRole: 'OWNER',
      },
    });
  });

  describe('Profile Management', () => {
    it('should get user profile', async () => {
      const profile = await accountService.getProfile(testUser.id);

      expect(profile.id).toBe(testUser.id);
      expect(profile.email).toBe(testUser.email);
      expect(profile.name).toBe('Account Test User');
      expect(profile.accountRole).toBe('OWNER');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        accountService.getProfile('non-existent-id')
      ).rejects.toThrow('User not found');
    });

    it('should update user profile', async () => {
      const updated = await accountService.updateProfile(testUser.id, {
        name: 'Updated Name',
        timezone: 'America/New_York',
        organizationName: 'Test Org',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.timezone).toBe('America/New_York');
      expect(updated.organizationName).toBe('Test Org');

      // Verify audit log was created
      const auditLogs = await testPrisma.userAccountAuditLog.findMany({
        where: { actorUserId: testUser.id, actionType: 'profile_updated' },
      });
      expect(auditLogs).toHaveLength(1);
    });

    it('should handle partial profile updates', async () => {
      const updated = await accountService.updateProfile(testUser.id, {
        locale: 'en-US',
      });

      expect(updated.locale).toBe('en-US');
      expect(updated.name).toBe('Account Test User'); // Unchanged
    });
  });

  describe('Preferences Management', () => {
    it('should lazy-init preferences on first get', async () => {
      const prefs = await accountService.getPreferences(testUser.id);

      expect(prefs.notifyQuotaWarnings).toBe(true); // Default
      expect(prefs.notifyRunFailures).toBe(true); // Default
      expect(prefs.autoOpenIssuesTab).toBe(false); // Default
    });

    it('should return existing preferences', async () => {
      // Create preferences first
      await testPrisma.userPreferences.create({
        data: {
          userId: testUser.id,
          notifyQuotaWarnings: false,
          notifyRunFailures: false,
        },
      });

      const prefs = await accountService.getPreferences(testUser.id);

      expect(prefs.notifyQuotaWarnings).toBe(false);
      expect(prefs.notifyRunFailures).toBe(false);
    });

    it('should update preferences for OWNER', async () => {
      await accountService.getPreferences(testUser.id); // Init

      const updated = await accountService.updatePreferences(
        testUser.id,
        { notifyQuotaWarnings: false, autoOpenIssuesTab: true },
        'OWNER'
      );

      expect(updated.notifyQuotaWarnings).toBe(false);
      expect(updated.autoOpenIssuesTab).toBe(true);

      // Verify audit log
      const auditLogs = await testPrisma.userAccountAuditLog.findMany({
        where: { actorUserId: testUser.id, actionType: 'preferences_updated' },
      });
      expect(auditLogs).toHaveLength(1);
    });

    it('should throw ForbiddenException for VIEWER updating preferences', async () => {
      await accountService.getPreferences(testUser.id); // Init

      await expect(
        accountService.updatePreferences(
          testUser.id,
          { notifyQuotaWarnings: false },
          'VIEWER'
        )
      ).rejects.toThrow('Viewers cannot update preferences');
    });
  });

  describe('AI Usage Summary', () => {
    it('should return empty summary for user with no runs', async () => {
      const summary = await accountService.getAiUsageSummary(testUser.id);

      expect(summary.totalRuns).toBe(0);
      expect(summary.aiUsedRuns).toBe(0);
      expect(summary.reusedRuns).toBe(0);
      expect(summary.applyInvariantViolations).toBe(0);
      expect(summary.applyInvariantMessage).toContain('APPLY never uses AI');
    });

    it('should compute summary from playbook runs', async () => {
      // Create a project for the runs
      const project = await testPrisma.project.create({
        data: {
          name: 'AI Usage Test Project',
          domain: 'ai-usage.example.com',
          userId: testUser.id,
        },
      });

      // Create some playbook runs
      const now = new Date();
      await testPrisma.automationPlaybookRun.createMany({
        data: [
          {
            playbookId: 'test-playbook',
            projectId: project.id,
            createdByUserId: testUser.id,
            runType: 'PREVIEW',
            status: 'SUCCEEDED',
            aiUsed: true,
            createdAt: now,
          },
          {
            playbookId: 'test-playbook',
            projectId: project.id,
            createdByUserId: testUser.id,
            runType: 'APPLY',
            status: 'SUCCEEDED',
            aiUsed: false,
            createdAt: now,
          },
        ],
      });

      const summary = await accountService.getAiUsageSummary(testUser.id);

      expect(summary.totalRuns).toBe(2);
      expect(summary.aiUsedRuns).toBe(1);
      expect(summary.applyInvariantViolations).toBe(0);
    });
  });

  describe('Connected Stores', () => {
    it('should return empty list for user with no stores', async () => {
      const stores = await accountService.getConnectedStores(testUser.id);
      expect(stores).toHaveLength(0);
    });

    it('should return connected Shopify stores', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Store Test Project',
          domain: 'store-test.example.com',
          userId: testUser.id,
        },
      });

      await testPrisma.integration.create({
        data: {
          projectId: project.id,
          type: 'SHOPIFY',
          externalId: 'test-store.myshopify.com',
          accessToken: 'test-token',
        },
      });

      const stores = await accountService.getConnectedStores(testUser.id);

      expect(stores).toHaveLength(1);
      expect(stores[0].projectId).toBe(project.id);
      expect(stores[0].integrationType).toBe('SHOPIFY');
    });

    it('should disconnect store for OWNER', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Disconnect Test Project',
          domain: 'disconnect.example.com',
          userId: testUser.id,
        },
      });

      await testPrisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: testUser.id,
          role: 'OWNER',
        },
      });

      await testPrisma.integration.create({
        data: {
          projectId: project.id,
          type: 'SHOPIFY',
          externalId: 'disconnect.myshopify.com',
          accessToken: 'test-token',
        },
      });

      const result = await accountService.disconnectStore(
        testUser.id,
        project.id,
        'OWNER'
      );

      expect(result.success).toBe(true);

      // Verify integration was deleted
      const integrations = await testPrisma.integration.findMany({
        where: { projectId: project.id },
      });
      expect(integrations).toHaveLength(0);
    });

    it('should throw ForbiddenException for non-OWNER disconnecting', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Non-Owner Test',
          domain: 'non-owner.example.com',
          userId: testUser.id,
        },
      });

      await expect(
        accountService.disconnectStore(testUser.id, project.id, 'EDITOR')
      ).rejects.toThrow('Only account owners can disconnect stores');
    });
  });

  describe('Session Management', () => {
    it('should return active sessions', async () => {
      // Create some sessions
      await testPrisma.userSession.createMany({
        data: [
          {
            userId: testUser.id,
            ip: '192.168.1.1',
            userAgent: 'Chrome',
          },
          {
            userId: testUser.id,
            ip: '192.168.1.2',
            userAgent: 'Firefox',
          },
        ],
      });

      const sessions = await accountService.getActiveSessions(testUser.id);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].ip).toBeDefined();
    });

    it('should mark current session correctly', async () => {
      const session = await testPrisma.userSession.create({
        data: {
          userId: testUser.id,
          ip: '192.168.1.1',
          userAgent: 'Chrome',
        },
      });

      const sessions = await accountService.getActiveSessions(
        testUser.id,
        session.id
      );

      expect(sessions).toHaveLength(1);
      expect(sessions[0].isCurrent).toBe(true);
    });

    it('should sign out all sessions', async () => {
      const result = await accountService.signOutAllSessions(testUser.id);

      expect(result.revokedCount).toBe(2);
      expect(authServiceMock.signOutAllSessions).toHaveBeenCalledWith(
        testUser.id
      );
    });
  });
});
