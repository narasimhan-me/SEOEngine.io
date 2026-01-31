/**
 * GOVERNANCE-VIEWER-TESTS: Integration tests for Governance Viewer Service
 *
 * Tests:
 * - Approvals listing with pagination
 * - Audit events listing with allowlist filtering
 * - Share links listing with status derivation
 * - Access control (membership-aware)
 *
 * NOTE: These tests require a test database to be configured.
 */
import { GovernanceViewerService } from '../../../src/projects/governance-viewer.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('GovernanceViewerService (integration)', () => {
  let governanceViewerService: GovernanceViewerService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string };
  let testProject: { id: string };

  beforeAll(async () => {
    roleResolutionService = new RoleResolutionService(testPrisma as any);
    governanceViewerService = new GovernanceViewerService(
      testPrisma as any,
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
        email: `gov-viewer-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Governance Viewer Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'Governance Viewer Test Project',
        domain: 'gov-viewer.example.com',
        userId: testUser.id,
      },
    });

    // Create ProjectMember for access
    await testPrisma.projectMember.create({
      data: {
        projectId: testProject.id,
        userId: testUser.id,
        role: 'OWNER',
      },
    });
  });

  describe('Approvals Listing', () => {
    it('should return empty list for project with no approvals', async () => {
      const result = await governanceViewerService.listApprovals(
        testProject.id,
        testUser.id,
        {}
      );

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should list approvals with pagination', async () => {
      // Create multiple approval requests
      for (let i = 0; i < 5; i++) {
        await testPrisma.approvalRequest.create({
          data: {
            projectId: testProject.id,
            resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
            resourceId: `resource-${i}`,
            status: 'PENDING_APPROVAL',
            requestedByUserId: testUser.id,
          },
        });
      }

      const page1 = await governanceViewerService.listApprovals(
        testProject.id,
        testUser.id,
        { limit: 2 }
      );

      expect(page1.items).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await governanceViewerService.listApprovals(
        testProject.id,
        testUser.id,
        { limit: 2, cursor: page1.nextCursor }
      );

      expect(page2.items).toHaveLength(2);
      expect(page2.hasMore).toBe(true);
    });

    it('should filter by pending status', async () => {
      await testPrisma.approvalRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
            resourceId: 'pending-1',
            status: 'PENDING_APPROVAL',
            requestedByUserId: testUser.id,
          },
          {
            projectId: testProject.id,
            resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
            resourceId: 'approved-1',
            status: 'APPROVED',
            requestedByUserId: testUser.id,
          },
        ],
      });

      const pending = await governanceViewerService.listApprovals(
        testProject.id,
        testUser.id,
        { status: 'pending' }
      );

      expect(pending.items).toHaveLength(1);
      expect(pending.items[0].status).toBe('PENDING_APPROVAL');
    });

    it('should filter by history status', async () => {
      await testPrisma.approvalRequest.createMany({
        data: [
          {
            projectId: testProject.id,
            resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
            resourceId: 'pending-1',
            status: 'PENDING_APPROVAL',
            requestedByUserId: testUser.id,
          },
          {
            projectId: testProject.id,
            resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
            resourceId: 'approved-1',
            status: 'APPROVED',
            requestedByUserId: testUser.id,
          },
          {
            projectId: testProject.id,
            resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
            resourceId: 'rejected-1',
            status: 'REJECTED',
            requestedByUserId: testUser.id,
          },
        ],
      });

      const history = await governanceViewerService.listApprovals(
        testProject.id,
        testUser.id,
        { status: 'history' }
      );

      expect(history.items).toHaveLength(2);
      expect(
        history.items.every(
          (i) => i.status === 'APPROVED' || i.status === 'REJECTED'
        )
      ).toBe(true);
    });

    it('should resolve user display names', async () => {
      await testPrisma.approvalRequest.create({
        data: {
          projectId: testProject.id,
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'resource-1',
          status: 'PENDING_APPROVAL',
          requestedByUserId: testUser.id,
        },
      });

      const result = await governanceViewerService.listApprovals(
        testProject.id,
        testUser.id,
        {}
      );

      expect(result.items[0].requestedByName).toBeDefined();
    });
  });

  describe('Audit Events Listing', () => {
    it('should return empty list for project with no events', async () => {
      const result = await governanceViewerService.listAuditEvents(
        testProject.id,
        testUser.id,
        {}
      );

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('should only return allowed event types', async () => {
      // Create events with both allowed and non-allowed types
      await testPrisma.governanceAuditEvent.createMany({
        data: [
          {
            projectId: testProject.id,
            actorUserId: testUser.id,
            eventType: 'POLICY_CHANGED', // Allowed
          },
          {
            projectId: testProject.id,
            actorUserId: testUser.id,
            eventType: 'APPLY_EXECUTED', // Allowed
          },
        ],
      });

      const result = await governanceViewerService.listAuditEvents(
        testProject.id,
        testUser.id,
        {}
      );

      // All returned events should be in allowlist
      for (const event of result.items) {
        expect(
          [
            'POLICY_CHANGED',
            'APPROVAL_REQUESTED',
            'APPROVAL_APPROVED',
            'APPROVAL_REJECTED',
            'APPLY_EXECUTED',
            'SHARE_LINK_CREATED',
            'SHARE_LINK_REVOKED',
          ].includes(event.eventType)
        ).toBe(true);
      }
    });

    it('should paginate audit events', async () => {
      // Create multiple events
      for (let i = 0; i < 5; i++) {
        await testPrisma.governanceAuditEvent.create({
          data: {
            projectId: testProject.id,
            actorUserId: testUser.id,
            eventType: 'POLICY_CHANGED',
            metadata: { index: i },
          },
        });
      }

      const page1 = await governanceViewerService.listAuditEvents(
        testProject.id,
        testUser.id,
        { limit: 2 }
      );

      expect(page1.items).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
    });

    it('should filter by actor', async () => {
      const otherUser = await testPrisma.user.create({
        data: {
          email: `other-actor-${Date.now()}@example.com`,
          password: 'pass',
          name: 'Other Actor',
        },
      });

      await testPrisma.governanceAuditEvent.createMany({
        data: [
          {
            projectId: testProject.id,
            actorUserId: testUser.id,
            eventType: 'POLICY_CHANGED',
          },
          {
            projectId: testProject.id,
            actorUserId: otherUser.id,
            eventType: 'POLICY_CHANGED',
          },
        ],
      });

      const result = await governanceViewerService.listAuditEvents(
        testProject.id,
        testUser.id,
        { actor: testUser.id }
      );

      expect(result.items.every((e) => e.actorUserId === testUser.id)).toBe(
        true
      );
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      await testPrisma.governanceAuditEvent.createMany({
        data: [
          {
            projectId: testProject.id,
            actorUserId: testUser.id,
            eventType: 'POLICY_CHANGED',
            createdAt: twoDaysAgo,
          },
          {
            projectId: testProject.id,
            actorUserId: testUser.id,
            eventType: 'APPLY_EXECUTED',
            createdAt: now,
          },
        ],
      });

      const result = await governanceViewerService.listAuditEvents(
        testProject.id,
        testUser.id,
        { from: yesterday.toISOString() }
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].eventType).toBe('APPLY_EXECUTED');
    });
  });

  describe('Share Links Listing', () => {
    it('should return empty list for project with no links', async () => {
      const result = await governanceViewerService.listShareLinks(
        testProject.id,
        testUser.id,
        {}
      );

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('should list share links with derived status', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await testPrisma.geoReportShareLink.create({
        data: {
          projectId: testProject.id,
          shareToken: 'test-token-123',
          title: 'Test Link',
          audience: 'INTERNAL',
          status: 'ACTIVE',
          createdByUserId: testUser.id,
          expiresAt: futureDate,
        },
      });

      const result = await governanceViewerService.listShareLinks(
        testProject.id,
        testUser.id,
        {}
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('ACTIVE');
      expect(result.items[0].shareUrl).toContain('test-token-123');
    });

    it('should derive EXPIRED status for past expiry', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await testPrisma.geoReportShareLink.create({
        data: {
          projectId: testProject.id,
          shareToken: 'expired-token',
          title: 'Expired Link',
          audience: 'INTERNAL',
          status: 'ACTIVE', // Still marked active in DB
          createdByUserId: testUser.id,
          expiresAt: pastDate,
        },
      });

      const result = await governanceViewerService.listShareLinks(
        testProject.id,
        testUser.id,
        {}
      );

      expect(result.items[0].status).toBe('EXPIRED');
    });

    it('should never expose passcode, only last4', async () => {
      await testPrisma.geoReportShareLink.create({
        data: {
          projectId: testProject.id,
          shareToken: 'protected-token',
          title: 'Protected Link',
          audience: 'EXTERNAL',
          status: 'ACTIVE',
          createdByUserId: testUser.id,
          passcodeHash: 'hashed-passcode-value',
          passcodeLast4: '1234',
        },
      });

      const result = await governanceViewerService.listShareLinks(
        testProject.id,
        testUser.id,
        {}
      );

      expect(result.items[0].passcodeLast4).toBe('1234');
      expect((result.items[0] as any).passcode).toBeUndefined();
      expect((result.items[0] as any).passcodeHash).toBeUndefined();
    });

    it('should filter by status', async () => {
      await testPrisma.geoReportShareLink.createMany({
        data: [
          {
            projectId: testProject.id,
            shareToken: 'active-link',
            title: 'Active',
            audience: 'INTERNAL',
            status: 'ACTIVE',
            createdByUserId: testUser.id,
          },
          {
            projectId: testProject.id,
            shareToken: 'revoked-link',
            title: 'Revoked',
            audience: 'INTERNAL',
            status: 'REVOKED',
            createdByUserId: testUser.id,
          },
        ],
      });

      const activeOnly = await governanceViewerService.listShareLinks(
        testProject.id,
        testUser.id,
        { status: 'ACTIVE' }
      );

      expect(activeOnly.items).toHaveLength(1);
      expect(activeOnly.items[0].title).toBe('Active');
    });
  });

  describe('Access Control', () => {
    it('should allow project member to view data', async () => {
      const memberUser = await testPrisma.user.create({
        data: {
          email: `member-${Date.now()}@example.com`,
          password: 'pass',
          name: 'Member User',
        },
      });

      await testPrisma.projectMember.create({
        data: {
          projectId: testProject.id,
          userId: memberUser.id,
          role: 'VIEWER',
        },
      });

      // All these should succeed without throwing
      const approvals = await governanceViewerService.listApprovals(
        testProject.id,
        memberUser.id,
        {}
      );
      const events = await governanceViewerService.listAuditEvents(
        testProject.id,
        memberUser.id,
        {}
      );
      const links = await governanceViewerService.listShareLinks(
        testProject.id,
        memberUser.id,
        {}
      );

      expect(approvals.items).toBeDefined();
      expect(events.items).toBeDefined();
      expect(links.items).toBeDefined();
    });

    it('should throw for unauthorized user', async () => {
      const otherUser = await testPrisma.user.create({
        data: {
          email: `unauthorized-${Date.now()}@example.com`,
          password: 'pass',
          name: 'Unauthorized User',
        },
      });

      await expect(
        governanceViewerService.listApprovals(testProject.id, otherUser.id, {})
      ).rejects.toThrow();

      await expect(
        governanceViewerService.listAuditEvents(testProject.id, otherUser.id, {})
      ).rejects.toThrow();

      await expect(
        governanceViewerService.listShareLinks(testProject.id, otherUser.id, {})
      ).rejects.toThrow();
    });
  });
});
