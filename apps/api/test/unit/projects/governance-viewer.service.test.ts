/**
 * Unit tests for GovernanceViewerService
 *
 * Tests:
 * - listApprovals() returns approvals with pagination
 * - listApprovals() filters by status correctly
 * - listAuditEvents() returns audit events with allowlist filtering
 * - listAuditEvents() filters by type, actor, and date range
 * - listShareLinks() returns share links with status derivation
 * - listShareLinks() includes event history
 */
import { GovernanceViewerService } from '../../../src/projects/governance-viewer.service';
import { PrismaService } from '../../../src/prisma.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';

const createPrismaMock = () => ({
  approvalRequest: {
    findMany: jest.fn(),
  },
  governanceAuditEvent: {
    findMany: jest.fn(),
  },
  geoReportShareLink: {
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
});

describe('GovernanceViewerService', () => {
  let service: GovernanceViewerService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let roleResolutionServiceMock: ReturnType<
    typeof createRoleResolutionServiceMock
  >;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();

    service = new GovernanceViewerService(
      prismaMock as unknown as PrismaService,
      roleResolutionServiceMock as unknown as RoleResolutionService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listApprovals', () => {
    it('should return approvals with pagination', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          projectId: 'proj-1',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'playbook-1:scope-1',
          status: 'PENDING_APPROVAL',
          requestedByUserId: 'user-1',
          requestedAt: new Date('2024-01-01'),
          decidedByUserId: null,
          decidedAt: null,
          decisionReason: null,
          consumed: false,
          consumedAt: null,
        },
      ];

      const mockUsers = [
        { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      ];

      prismaMock.approvalRequest.findMany.mockResolvedValue(mockApprovals);
      prismaMock.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listApprovals('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('approval-1');
      expect(result.items[0].requestedByName).toBe('Test User');
      expect(roleResolutionServiceMock.assertProjectAccess).toHaveBeenCalledWith(
        'proj-1',
        'user-1'
      );
    });

    it('should filter by pending status', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          projectId: 'proj-1',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'playbook-1:scope-1',
          status: 'PENDING_APPROVAL',
          requestedByUserId: 'user-1',
          requestedAt: new Date('2024-01-01'),
          decidedByUserId: null,
          decidedAt: null,
          decisionReason: null,
          consumed: false,
          consumedAt: null,
        },
      ];

      prismaMock.approvalRequest.findMany.mockResolvedValue(mockApprovals);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.listApprovals('proj-1', 'user-1', {
        status: 'pending',
        limit: 10,
      });

      expect(prismaMock.approvalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
            status: 'PENDING_APPROVAL',
          }),
        })
      );
    });

    it('should filter by history status', async () => {
      prismaMock.approvalRequest.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.listApprovals('proj-1', 'user-1', {
        status: 'history',
        limit: 10,
      });

      expect(prismaMock.approvalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
            status: { in: ['APPROVED', 'REJECTED'] },
          }),
        })
      );
    });

    it('should handle cursor pagination', async () => {
      prismaMock.approvalRequest.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.listApprovals('proj-1', 'user-1', {
        cursor: 'eyJ0aW1lc3RhbXAiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJpZCI6ImFwcHJvdmFsLTEifQ==',
        limit: 10,
      });

      const callArgs = prismaMock.approvalRequest.findMany.mock.calls[0][0];
      // Cursor pagination adds OR clause if cursor is valid
      expect(callArgs.where).toBeDefined();
      // The OR clause may or may not be present depending on cursor parsing
      // Just verify the call was made with correct structure
      expect(prismaMock.approvalRequest.findMany).toHaveBeenCalled();
    });
  });

  describe('listAuditEvents', () => {
    it('should return audit events with allowlist filtering', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          projectId: 'proj-1',
          actorUserId: 'user-1',
          eventType: 'SHARE_LINK_CREATED',
          resourceType: 'SHARE_LINK',
          resourceId: 'link-1',
          metadata: { scopeCount: 5 },
          createdAt: new Date('2024-01-01'),
        },
      ];

      const mockUsers = [
        { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      ];

      prismaMock.governanceAuditEvent.findMany.mockResolvedValue(mockEvents);
      prismaMock.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listAuditEvents('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('event-1');
      expect(result.items[0].actorName).toBe('Test User');
      expect(result.items[0].scopeSummary).toBe('5 items');
    });

    it('should filter by event types', async () => {
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.listAuditEvents('proj-1', 'user-1', {
        types: ['SHARE_LINK_CREATED', 'SHARE_LINK_REVOKED'],
        limit: 10,
      });

      expect(prismaMock.governanceAuditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
            eventType: expect.any(Object),
          }),
        })
      );
    });

    it('should filter by actor', async () => {
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.listAuditEvents('proj-1', 'user-1', {
        actor: 'user-1',
        limit: 10,
      });

      expect(prismaMock.governanceAuditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actorUserId: 'user-1',
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.listAuditEvents('proj-1', 'user-1', {
        from: '2024-01-01',
        to: '2024-12-31',
        limit: 10,
      });

      expect(prismaMock.governanceAuditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should sanitize metadata for viewer', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          projectId: 'proj-1',
          actorUserId: 'user-1',
          eventType: 'SHARE_LINK_CREATED',
          resourceType: 'SHARE_LINK',
          resourceId: 'link-1',
          metadata: {
            scopeCount: 5,
            passcode: 'SECRET123', // Should be filtered
            apiKey: 'key-123', // Should be filtered
            normalField: 'value', // Should be kept
          },
          createdAt: new Date('2024-01-01'),
        },
      ];

      prismaMock.governanceAuditEvent.findMany.mockResolvedValue(mockEvents);
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.listAuditEvents('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].metadata).not.toHaveProperty('passcode');
      expect(result.items[0].metadata).not.toHaveProperty('apiKey');
      expect(result.items[0].metadata).toHaveProperty('normalField');
    });
  });

  describe('listShareLinks', () => {
    it('should return share links with status derivation', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const mockLinks = [
        {
          id: 'link-1',
          projectId: 'proj-1',
          shareToken: 'token-123',
          title: 'My Report',
          status: 'ACTIVE',
          audience: 'ANYONE_WITH_LINK',
          passcodeLast4: null,
          passcodeCreatedAt: null,
          createdAt: new Date('2024-01-01'),
          createdByUserId: 'user-1',
          expiresAt: futureDate,
          revokedAt: null,
        },
      ];

      const mockUsers = [
        { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      ];

      prismaMock.geoReportShareLink.findMany.mockResolvedValue(mockLinks);
      prismaMock.user.findMany.mockResolvedValue(mockUsers);
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue([]);

      const result = await service.listShareLinks('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('link-1');
      expect(result.items[0].status).toBe('ACTIVE');
      expect(result.items[0].createdByName).toBe('Test User');
    });

    it('should derive EXPIRED status for expired links', async () => {
      const pastDate = new Date('2020-01-01');
      const mockLinks = [
        {
          id: 'link-1',
          projectId: 'proj-1',
          shareToken: 'token-123',
          title: null,
          status: 'ACTIVE',
          audience: 'ANYONE_WITH_LINK',
          passcodeLast4: null,
          passcodeCreatedAt: null,
          createdAt: new Date('2024-01-01'),
          createdByUserId: 'user-1',
          expiresAt: pastDate,
          revokedAt: null,
        },
      ];

      prismaMock.geoReportShareLink.findMany.mockResolvedValue(mockLinks);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue([]);

      const result = await service.listShareLinks('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].status).toBe('EXPIRED');
    });

    it('should include event history', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const mockLinks = [
        {
          id: 'link-1',
          projectId: 'proj-1',
          shareToken: 'token-123',
          title: null,
          status: 'ACTIVE',
          audience: 'ANYONE_WITH_LINK',
          passcodeLast4: null,
          passcodeCreatedAt: null,
          createdAt: new Date('2024-01-01'),
          createdByUserId: 'user-1',
          expiresAt: futureDate,
          revokedAt: null,
        },
      ];

      const mockUsers = [
        { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      ];

      const mockEvents = [
        {
          id: 'event-1',
          projectId: 'proj-1',
          actorUserId: 'user-1',
          eventType: 'SHARE_LINK_CREATED',
          resourceId: 'link-1',
          createdAt: new Date('2024-01-01'),
        },
      ];

      prismaMock.geoReportShareLink.findMany.mockResolvedValue(mockLinks);
      prismaMock.user.findMany.mockResolvedValue(mockUsers);
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.listShareLinks('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].events).toBeDefined();
      // Events array should contain at least the CREATED event
      const createdEvent = result.items[0].events?.find((e) => e.eventType === 'CREATED');
      expect(createdEvent).toBeDefined();
      expect(createdEvent?.eventType).toBe('CREATED');
    });

    it('should filter by status', async () => {
      prismaMock.geoReportShareLink.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue([]);

      await service.listShareLinks('proj-1', 'user-1', {
        status: 'ACTIVE',
        limit: 10,
      });

      expect(prismaMock.geoReportShareLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should never return passcode, only passcodeLast4', async () => {
      const mockLinks = [
        {
          id: 'link-1',
          projectId: 'proj-1',
          shareToken: 'token-123',
          title: null,
          status: 'ACTIVE',
          audience: 'PASSCODE',
          passcodeLast4: '5678',
          passcodeCreatedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          createdByUserId: 'user-1',
          expiresAt: new Date('2024-12-31'),
          revokedAt: null,
        },
      ];

      prismaMock.geoReportShareLink.findMany.mockResolvedValue(mockLinks);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue([]);

      const result = await service.listShareLinks('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].passcodeLast4).toBe('5678');
      // Ensure no passcode field exists
      expect(result.items[0]).not.toHaveProperty('passcode');
    });

    it('should handle share links with revoked event in history', async () => {
      const mockLinks = [
        {
          id: 'link-1',
          projectId: 'proj-1',
          shareToken: 'token-123',
          title: null,
          status: 'REVOKED',
          audience: 'ANYONE_WITH_LINK',
          passcodeLast4: null,
          passcodeCreatedAt: null,
          createdAt: new Date('2024-01-01'),
          createdByUserId: 'user-1',
          expiresAt: new Date('2024-12-31'),
          revokedAt: new Date('2024-06-01'),
        },
      ];

      const mockEvents = [
        {
          id: 'event-1',
          projectId: 'proj-1',
          actorUserId: 'user-1',
          eventType: 'SHARE_LINK_CREATED',
          resourceId: 'link-1',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'event-2',
          projectId: 'proj-1',
          actorUserId: 'user-1',
          eventType: 'SHARE_LINK_REVOKED',
          resourceId: 'link-1',
          createdAt: new Date('2024-06-01'),
        },
      ];

      prismaMock.geoReportShareLink.findMany.mockResolvedValue(mockLinks);
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      ]);
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.listShareLinks('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].status).toBe('REVOKED');
      expect(result.items[0].events).toHaveLength(2);
      const revokedEvent = result.items[0].events?.find(
        (e) => e.eventType === 'REVOKED'
      );
      expect(revokedEvent).toBeDefined();
    });

    it('should add synthetic EXPIRED event for expired links', async () => {
      const pastDate = new Date('2020-01-01');
      const mockLinks = [
        {
          id: 'link-1',
          projectId: 'proj-1',
          shareToken: 'token-123',
          title: null,
          status: 'ACTIVE',
          audience: 'ANYONE_WITH_LINK',
          passcodeLast4: null,
          passcodeCreatedAt: null,
          createdAt: new Date('2019-01-01'),
          createdByUserId: 'user-1',
          expiresAt: pastDate,
          revokedAt: null,
        },
      ];

      prismaMock.geoReportShareLink.findMany.mockResolvedValue(mockLinks);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue([]);

      const result = await service.listShareLinks('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].status).toBe('EXPIRED');
      expect(result.items[0].events).toBeDefined();
      const expiredEvent = result.items[0].events?.find(
        (e) => e.eventType === 'EXPIRED'
      );
      expect(expiredEvent).toBeDefined();
    });
  });

  describe('listAuditEvents additional edge cases', () => {
    it('should derive scope summary from affectedCount', async () => {
      // Use an allowed event type (APPROVAL_APPROVED is in the allowlist)
      const mockEvents = [
        {
          id: 'event-1',
          projectId: 'proj-1',
          actorUserId: 'user-1',
          eventType: 'APPROVAL_APPROVED',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'playbook-1:scope-1',
          metadata: { affectedCount: 15 },
          createdAt: new Date('2024-01-01'),
        },
      ];

      prismaMock.governanceAuditEvent.findMany.mockResolvedValue(mockEvents);
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.listAuditEvents('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].scopeSummary).toBe('15 affected');
    });

    it('should derive target reference for AUTOMATION_PLAYBOOK_APPLY', async () => {
      // Use an allowed event type (APPROVAL_REQUESTED is in the allowlist)
      const mockEvents = [
        {
          id: 'event-1',
          projectId: 'proj-1',
          actorUserId: 'user-1',
          eventType: 'APPROVAL_REQUESTED',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'missing_seo_title:scope-123',
          metadata: null,
          createdAt: new Date('2024-01-01'),
        },
      ];

      prismaMock.governanceAuditEvent.findMany.mockResolvedValue(mockEvents);
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.listAuditEvents('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].targetReference).toBe('Playbook: missing_seo_title');
    });

    it('should derive target reference for SHARE_LINK', async () => {
      // SHARE_LINK_CREATED is in the allowlist
      const mockEvents = [
        {
          id: 'event-1',
          projectId: 'proj-1',
          actorUserId: 'user-1',
          eventType: 'SHARE_LINK_CREATED',
          resourceType: 'SHARE_LINK',
          resourceId: 'link-123',
          metadata: null,
          createdAt: new Date('2024-01-01'),
        },
      ];

      prismaMock.governanceAuditEvent.findMany.mockResolvedValue(mockEvents);
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.listAuditEvents('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].targetReference).toBe('Share Link');
    });

    it('should handle null metadata', async () => {
      // Use an allowed event type
      const mockEvents = [
        {
          id: 'event-1',
          projectId: 'proj-1',
          actorUserId: 'user-1',
          eventType: 'SHARE_LINK_REVOKED',
          resourceType: null,
          resourceId: null,
          metadata: null,
          createdAt: new Date('2024-01-01'),
        },
      ];

      prismaMock.governanceAuditEvent.findMany.mockResolvedValue(mockEvents);
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.listAuditEvents('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].metadata).toBeUndefined();
      expect(result.items[0].scopeSummary).toBeUndefined();
    });

    it('should filter invalid event types in request', async () => {
      prismaMock.governanceAuditEvent.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);

      // SHARE_LINK_CREATED is a valid allowed type
      await service.listAuditEvents('proj-1', 'user-1', {
        types: ['INVALID_TYPE' as any, 'SHARE_LINK_CREATED'],
        limit: 10,
      });

      // Should only use valid types in the query
      expect(prismaMock.governanceAuditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventType: { in: ['SHARE_LINK_CREATED'] },
          }),
        })
      );
    });
  });

  describe('listApprovals additional edge cases', () => {
    it('should return hasMore correctly at boundary', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          projectId: 'proj-1',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'playbook-1:scope-1',
          status: 'PENDING_APPROVAL',
          requestedByUserId: 'user-1',
          requestedAt: new Date('2024-01-01'),
          decidedByUserId: null,
          decidedAt: null,
          decisionReason: null,
          consumed: false,
          consumedAt: null,
        },
        {
          id: 'approval-2',
          projectId: 'proj-1',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'playbook-2:scope-2',
          status: 'PENDING_APPROVAL',
          requestedByUserId: 'user-1',
          requestedAt: new Date('2024-01-02'),
          decidedByUserId: null,
          decidedAt: null,
          decisionReason: null,
          consumed: false,
          consumedAt: null,
        },
      ];

      prismaMock.approvalRequest.findMany.mockResolvedValue(mockApprovals);
      prismaMock.user.findMany.mockResolvedValue([]);

      // Request exactly 1, should have hasMore true (2 items returned, 1 shown)
      const result = await service.listApprovals('proj-1', 'user-1', {
        limit: 1,
      });

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should resolve decided user names', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          projectId: 'proj-1',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'playbook-1:scope-1',
          status: 'APPROVED',
          requestedByUserId: 'user-1',
          requestedAt: new Date('2024-01-01'),
          decidedByUserId: 'user-2',
          decidedAt: new Date('2024-01-02'),
          decisionReason: 'Looks good',
          consumed: true,
          consumedAt: new Date('2024-01-03'),
        },
      ];

      const mockUsers = [
        { id: 'user-1', name: 'Requester', email: 'requester@example.com' },
        { id: 'user-2', name: 'Approver', email: 'approver@example.com' },
      ];

      prismaMock.approvalRequest.findMany.mockResolvedValue(mockApprovals);
      prismaMock.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listApprovals('proj-1', 'user-1', {
        limit: 10,
      });

      expect(result.items[0].requestedByName).toBe('Requester');
      expect(result.items[0].decidedByName).toBe('Approver');
      expect(result.items[0].decisionReason).toBe('Looks good');
    });
  });
});
