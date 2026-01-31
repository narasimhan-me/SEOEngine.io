/**
 * AUDIT-EVENTS-TESTS: Integration tests for Audit Events Service
 *
 * Tests:
 * - Append-only audit event creation
 * - Event listing with pagination
 * - Event type filtering
 * - Metadata sanitization (secret removal)
 * - Convenience logging methods
 * - Access control (membership-aware)
 *
 * NOTE: These tests require a test database to be configured.
 */
import { AuditEventsService } from '../../../src/projects/audit-events.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { GovernanceAuditEventType } from '@prisma/client';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('AuditEventsService (integration)', () => {
  let auditEventsService: AuditEventsService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string };
  let testProject: { id: string; name: string; domain: string };

  beforeAll(async () => {
    roleResolutionService = new RoleResolutionService(testPrisma as any);
    auditEventsService = new AuditEventsService(
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
        email: `audit-events-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Audit Events Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'Audit Events Test Project',
        domain: 'audit-events-test.example.com',
        userId: testUser.id,
      },
    });
  });

  describe('Event Writing', () => {
    it('should create an audit event', async () => {
      const event = await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED',
        'POLICY',
        testProject.id,
        { change: 'test' }
      );

      expect(event.id).toBeDefined();
      expect(event.projectId).toBe(testProject.id);
      expect(event.actorUserId).toBe(testUser.id);
      expect(event.eventType).toBe('POLICY_CHANGED');
      expect(event.resourceType).toBe('POLICY');
      expect(event.resourceId).toBe(testProject.id);
      expect(event.metadata).toEqual({ change: 'test' });
      expect(event.createdAt).toBeDefined();
    });

    it('should create event with null optional fields', async () => {
      const event = await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'APPLY_EXECUTED'
      );

      expect(event.resourceType).toBeNull();
      expect(event.resourceId).toBeNull();
      expect(event.metadata).toBeNull();
    });

    it('should sanitize sensitive metadata keys', async () => {
      const event = await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED',
        'POLICY',
        testProject.id,
        {
          safeKey: 'visible',
          password: 'should-be-removed',
          apiKey: 'should-be-removed',
          token: 'should-be-removed',
          accessToken: 'should-be-removed',
          secret: 'should-be-removed',
        }
      );

      expect(event.metadata).toEqual({ safeKey: 'visible' });
      expect((event.metadata as any)?.password).toBeUndefined();
      expect((event.metadata as any)?.apiKey).toBeUndefined();
      expect((event.metadata as any)?.token).toBeUndefined();
    });

    it('should sanitize nested sensitive keys', async () => {
      const event = await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED',
        'POLICY',
        testProject.id,
        {
          outer: {
            safeNested: 'visible',
            passwordHash: 'should-be-removed',
          },
        }
      );

      expect((event.metadata as any)?.outer?.safeNested).toBe('visible');
      expect((event.metadata as any)?.outer?.passwordHash).toBeUndefined();
    });
  });

  describe('Event Listing', () => {
    it('should list events for a project', async () => {
      // Create multiple events
      await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED'
      );
      await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'APPLY_EXECUTED'
      );
      await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'SHARE_LINK_CREATED'
      );

      const result = await auditEventsService.listEvents(
        testProject.id,
        testUser.id
      );

      expect(result.events).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should paginate events', async () => {
      // Create 25 events
      for (let i = 0; i < 25; i++) {
        await auditEventsService.writeEvent(
          testProject.id,
          testUser.id,
          'POLICY_CHANGED',
          undefined,
          undefined,
          { index: i }
        );
      }

      const page1 = await auditEventsService.listEvents(
        testProject.id,
        testUser.id,
        { page: 1, pageSize: 10 }
      );

      expect(page1.events).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(10);
      expect(page1.hasMore).toBe(true);

      const page3 = await auditEventsService.listEvents(
        testProject.id,
        testUser.id,
        { page: 3, pageSize: 10 }
      );

      expect(page3.events).toHaveLength(5);
      expect(page3.hasMore).toBe(false);
    });

    it('should filter by event type', async () => {
      await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED'
      );
      await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'APPLY_EXECUTED'
      );
      await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED'
      );

      const result = await auditEventsService.listEvents(
        testProject.id,
        testUser.id,
        { eventType: 'POLICY_CHANGED' as GovernanceAuditEventType }
      );

      expect(result.events).toHaveLength(2);
      expect(result.events.every((e) => e.eventType === 'POLICY_CHANGED')).toBe(
        true
      );
    });

    it('should order events by createdAt descending', async () => {
      await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED',
        undefined,
        undefined,
        { order: 1 }
      );

      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));

      await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'APPLY_EXECUTED',
        undefined,
        undefined,
        { order: 2 }
      );

      const result = await auditEventsService.listEvents(
        testProject.id,
        testUser.id
      );

      expect((result.events[0].metadata as any)?.order).toBe(2);
      expect((result.events[1].metadata as any)?.order).toBe(1);
    });

    it('should limit pageSize to maximum 100', async () => {
      const result = await auditEventsService.listEvents(
        testProject.id,
        testUser.id,
        { pageSize: 200 }
      );

      expect(result.pageSize).toBe(100);
    });
  });

  describe('Convenience Logging Methods', () => {
    it('should log policy changed event', async () => {
      const event = await auditEventsService.logPolicyChanged(
        testProject.id,
        testUser.id,
        { autoApprove: false },
        { autoApprove: true }
      );

      expect(event.eventType).toBe('POLICY_CHANGED');
      expect(event.resourceType).toBe('POLICY');
      expect((event.metadata as any)?.oldValues).toEqual({ autoApprove: false });
      expect((event.metadata as any)?.newValues).toEqual({ autoApprove: true });
    });

    it('should log approval requested event', async () => {
      const event = await auditEventsService.logApprovalRequested(
        testProject.id,
        testUser.id,
        'PRODUCT',
        'prod-123',
        'approval-456'
      );

      expect(event.eventType).toBe('APPROVAL_REQUESTED');
      expect(event.resourceType).toBe('PRODUCT');
      expect(event.resourceId).toBe('prod-123');
      expect((event.metadata as any)?.approvalId).toBe('approval-456');
    });

    it('should log approval approved event', async () => {
      const event = await auditEventsService.logApprovalApproved(
        testProject.id,
        testUser.id,
        'PRODUCT',
        'prod-123',
        'approval-456',
        'Looks good!'
      );

      expect(event.eventType).toBe('APPROVAL_APPROVED');
      expect((event.metadata as any)?.approvalId).toBe('approval-456');
      expect((event.metadata as any)?.reason).toBe('Looks good!');
    });

    it('should log approval rejected event', async () => {
      const event = await auditEventsService.logApprovalRejected(
        testProject.id,
        testUser.id,
        'PRODUCT',
        'prod-123',
        'approval-456',
        'Needs revision'
      );

      expect(event.eventType).toBe('APPROVAL_REJECTED');
      expect((event.metadata as any)?.reason).toBe('Needs revision');
    });

    it('should log apply executed event', async () => {
      const event = await auditEventsService.logApplyExecuted(
        testProject.id,
        testUser.id,
        'PRODUCT',
        'prod-123',
        { fieldsChanged: ['title', 'description'] }
      );

      expect(event.eventType).toBe('APPLY_EXECUTED');
      expect(event.resourceType).toBe('PRODUCT');
      expect(event.resourceId).toBe('prod-123');
      expect((event.metadata as any)?.fieldsChanged).toEqual([
        'title',
        'description',
      ]);
    });

    it('should log share link created event', async () => {
      const event = await auditEventsService.logShareLinkCreated(
        testProject.id,
        testUser.id,
        'link-789',
        'internal',
        7,
        '1234'
      );

      expect(event.eventType).toBe('SHARE_LINK_CREATED');
      expect(event.resourceType).toBe('SHARE_LINK');
      expect(event.resourceId).toBe('link-789');
      expect((event.metadata as any)?.audience).toBe('internal');
      expect((event.metadata as any)?.expiryDays).toBe(7);
      expect((event.metadata as any)?.passcodeLast4).toBe('1234');
    });

    it('should log share link revoked event', async () => {
      const event = await auditEventsService.logShareLinkRevoked(
        testProject.id,
        testUser.id,
        'link-789'
      );

      expect(event.eventType).toBe('SHARE_LINK_REVOKED');
      expect(event.resourceType).toBe('SHARE_LINK');
      expect(event.resourceId).toBe('link-789');
    });
  });

  describe('Access Control', () => {
    it('should allow project member to list events', async () => {
      const memberUser = await testPrisma.user.create({
        data: {
          email: `member-${Date.now()}@example.com`,
          password: 'hashed-password',
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

      // Create an event first
      await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED'
      );

      const result = await auditEventsService.listEvents(
        testProject.id,
        memberUser.id
      );

      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should throw for unauthorized user listing events', async () => {
      const otherUser = await testPrisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Other User',
        },
      });

      await expect(
        auditEventsService.listEvents(testProject.id, otherUser.id)
      ).rejects.toThrow();
    });
  });

  describe('Immutability', () => {
    it('should create unique IDs for each event', async () => {
      const event1 = await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED'
      );
      const event2 = await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'POLICY_CHANGED'
      );

      expect(event1.id).not.toBe(event2.id);
    });

    it('should preserve event timestamp', async () => {
      const beforeCreate = new Date();

      await new Promise((r) => setTimeout(r, 10));

      const event = await auditEventsService.writeEvent(
        testProject.id,
        testUser.id,
        'APPLY_EXECUTED'
      );

      const afterCreate = new Date();
      const eventTime = new Date(event.createdAt);

      expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(eventTime.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Event Types Coverage', () => {
    it('should support all governance event types', async () => {
      const eventTypes: GovernanceAuditEventType[] = [
        'POLICY_CHANGED',
        'APPROVAL_REQUESTED',
        'APPROVAL_APPROVED',
        'APPROVAL_REJECTED',
        'APPLY_EXECUTED',
        'SHARE_LINK_CREATED',
        'SHARE_LINK_REVOKED',
      ];

      for (const eventType of eventTypes) {
        const event = await auditEventsService.writeEvent(
          testProject.id,
          testUser.id,
          eventType
        );
        expect(event.eventType).toBe(eventType);
      }

      const result = await auditEventsService.listEvents(
        testProject.id,
        testUser.id
      );
      expect(result.total).toBe(eventTypes.length);
    });
  });
});
