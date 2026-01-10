/**
 * GOV-AUDIT-VIEWER-1 E2E Tests
 *
 * Tests for the Governance Viewer read-only endpoints:
 * - Approvals viewer with cursor pagination
 * - Audit events viewer with allowlist filtering
 * - Share links viewer with status derivation
 *
 * Key Invariants:
 * 1. All endpoints are read-only (no mutations)
 * 2. Audit events are STRICTLY filtered by ALLOWED_AUDIT_EVENT_TYPES
 * 3. Passcode is NEVER returned, only passcodeLast4
 * 4. Any project member (VIEWER, EDITOR, OWNER) can access
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';

async function signupAndLogin(
  server: any,
  email: string,
  password: string,
): Promise<{ token: string; userId: string }> {
  await request(server)
    .post('/auth/signup')
    .send({
      email,
      password,
      name: 'Test User',
      captchaToken: 'test-token',
    })
    .expect(201);

  const loginRes = await request(server)
    .post('/auth/login')
    .send({
      email,
      password,
      captchaToken: 'test-token',
    })
    .expect(200);

  return {
    token: loginRes.body.accessToken as string,
    userId: loginRes.body.user.id as string,
  };
}

async function createProject(
  server: any,
  token: string,
  name: string,
  domain: string,
): Promise<string> {
  const res = await request(server)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, domain })
    .expect(201);
  return res.body.id as string;
}

describe('GOV-AUDIT-VIEWER-1 – Governance Viewer E2E Tests', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await disconnectTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  describe('GET /projects/:projectId/governance/viewer/approvals', () => {
    it('returns empty list when no approvals exist', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      const res = await request(server)
        .get(`/projects/${projectId}/governance/viewer/approvals`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({
        items: [],
        hasMore: false,
      });
    });

    it('returns approvals with cursor pagination', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      // Create test approvals
      await testPrisma.approvalRequest.create({
        data: {
          projectId,
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'test-resource-1',
          status: 'PENDING_APPROVAL',
          requestedByUserId: userId,
        },
      });

      await testPrisma.approvalRequest.create({
        data: {
          projectId,
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'test-resource-2',
          status: 'APPROVED',
          requestedByUserId: userId,
          decidedByUserId: userId,
          decidedAt: new Date(),
        },
      });

      // Test pending filter
      const pendingRes = await request(server)
        .get(`/projects/${projectId}/governance/viewer/approvals?status=pending`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(pendingRes.body.items).toHaveLength(1);
      expect(pendingRes.body.items[0].status).toBe('PENDING_APPROVAL');

      // Test history filter
      const historyRes = await request(server)
        .get(`/projects/${projectId}/governance/viewer/approvals?status=history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(historyRes.body.items).toHaveLength(1);
      expect(historyRes.body.items[0].status).toBe('APPROVED');
    });

    it('includes user names in response', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      await testPrisma.approvalRequest.create({
        data: {
          projectId,
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'test-resource',
          status: 'PENDING_APPROVAL',
          requestedByUserId: userId,
        },
      });

      const res = await request(server)
        .get(`/projects/${projectId}/governance/viewer/approvals`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items[0].requestedByName).toBe('Test User');
    });
  });

  describe('GET /projects/:projectId/governance/viewer/audit-events', () => {
    it('returns empty list when no audit events exist', async () => {
      const { token } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      const res = await request(server)
        .get(`/projects/${projectId}/governance/viewer/audit-events`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({
        items: [],
        hasMore: false,
      });
    });

    it('only returns events in ALLOWED_AUDIT_EVENT_TYPES', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      // Create allowed event type
      await testPrisma.governanceAuditEvent.create({
        data: {
          projectId,
          actorUserId: userId,
          eventType: 'APPROVAL_REQUESTED',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'test-resource',
        },
      });

      // Create disallowed event type (should be filtered out)
      await testPrisma.governanceAuditEvent.create({
        data: {
          projectId,
          actorUserId: userId,
          eventType: 'POLICY_CHANGED',
          metadata: {},
        },
      });

      const res = await request(server)
        .get(`/projects/${projectId}/governance/viewer/audit-events`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should only return the allowed event
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].eventType).toBe('APPROVAL_REQUESTED');
    });

    it('filters by type when specified', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      // Create different allowed event types
      await testPrisma.governanceAuditEvent.create({
        data: {
          projectId,
          actorUserId: userId,
          eventType: 'APPROVAL_REQUESTED',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: 'test-resource',
        },
      });

      await testPrisma.governanceAuditEvent.create({
        data: {
          projectId,
          actorUserId: userId,
          eventType: 'SHARE_LINK_CREATED',
          resourceType: 'GEO_REPORT_SHARE_LINK',
          resourceId: 'link-1',
        },
      });

      const res = await request(server)
        .get(`/projects/${projectId}/governance/viewer/audit-events?types=SHARE_LINK_CREATED`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].eventType).toBe('SHARE_LINK_CREATED');
    });
  });

  describe('GET /projects/:projectId/governance/viewer/share-links', () => {
    it('returns empty list when no share links exist', async () => {
      const { token } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      const res = await request(server)
        .get(`/projects/${projectId}/governance/viewer/share-links`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({
        items: [],
        hasMore: false,
      });
    });

    it('never returns full passcode, only passcodeLast4', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      // Create share link with passcode (use passcodeHash, not plain passcode)
      await testPrisma.geoReportShareLink.create({
        data: {
          projectId,
          shareToken: 'test-token-123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdByUserId: userId,
          audience: 'PASSCODE',
          passcodeHash: '$2b$10$hashedpasscodevalue',
          passcodeLast4: '5678',
        },
      });

      const res = await request(server)
        .get(`/projects/${projectId}/governance/viewer/share-links`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      // Passcode hash should NOT be in response
      expect(res.body.items[0].passcodeHash).toBeUndefined();
      // Only passcodeLast4 should be present
      expect(res.body.items[0].passcodeLast4).toBe('5678');
    });

    it('derives status correctly for expired links', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      // Create expired share link
      await testPrisma.geoReportShareLink.create({
        data: {
          projectId,
          shareToken: 'test-token-expired',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
          createdByUserId: userId,
          audience: 'ANYONE_WITH_LINK',
        },
      });

      const res = await request(server)
        .get(`/projects/${projectId}/governance/viewer/share-links`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe('EXPIRED');
    });

    it('derives status correctly for revoked links', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      // Create revoked share link (status enum + revokedAt timestamp)
      await testPrisma.geoReportShareLink.create({
        data: {
          projectId,
          shareToken: 'test-token-revoked',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdByUserId: userId,
          audience: 'ANYONE_WITH_LINK',
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      const res = await request(server)
        .get(`/projects/${projectId}/governance/viewer/share-links`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe('REVOKED');
    });

    it('filters by status when specified', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      // Create active link
      await testPrisma.geoReportShareLink.create({
        data: {
          projectId,
          shareToken: 'test-token-active',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdByUserId: userId,
          audience: 'ANYONE_WITH_LINK',
        },
      });

      // Create revoked link
      await testPrisma.geoReportShareLink.create({
        data: {
          projectId,
          shareToken: 'test-token-revoked-2',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdByUserId: userId,
          audience: 'ANYONE_WITH_LINK',
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      // Filter for active only
      const activeRes = await request(server)
        .get(`/projects/${projectId}/governance/viewer/share-links?status=ACTIVE`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(activeRes.body.items).toHaveLength(1);
      expect(activeRes.body.items[0].status).toBe('ACTIVE');

      // Filter for revoked only
      const revokedRes = await request(server)
        .get(`/projects/${projectId}/governance/viewer/share-links?status=REVOKED`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(revokedRes.body.items).toHaveLength(1);
      expect(revokedRes.body.items[0].status).toBe('REVOKED');
    });
  });

  describe('Access Control', () => {
    it('requires authentication', async () => {
      const { token } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, token, 'Test Project', 'test.com');

      await request(server)
        .get(`/projects/${projectId}/governance/viewer/approvals`)
        .expect(401);

      await request(server)
        .get(`/projects/${projectId}/governance/viewer/audit-events`)
        .expect(401);

      await request(server)
        .get(`/projects/${projectId}/governance/viewer/share-links`)
        .expect(401);
    });

    it('denies access to non-project members', async () => {
      const { token: ownerToken } = await signupAndLogin(
        server,
        'owner@test.com',
        'password123',
      );
      const projectId = await createProject(server, ownerToken, 'Test Project', 'test.com');

      const { token: otherToken } = await signupAndLogin(
        server,
        'other@test.com',
        'password123',
      );

      await request(server)
        .get(`/projects/${projectId}/governance/viewer/approvals`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });
});
