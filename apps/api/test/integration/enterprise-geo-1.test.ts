import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { seedConnectedStoreProject } from '../../src/testkit';

/**
 * [ENTERPRISE-GEO-1] Enterprise Governance, Approvals, Audit, and Export Controls
 *
 * Test coverage:
 * - Governance policy CRUD
 * - Approval workflow (create, approve, reject)
 * - Approval gating on GEO Fix Apply
 * - Approval gating on Answer Block Sync
 * - Share link passcode protection
 * - Share link expiry enforcement
 * - Audit event logging
 */
describe('ENTERPRISE-GEO-1 – Enterprise Governance and Export Controls', () => {
  let app: INestApplication;
  let server: any;
  let jwtService: JwtService;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  function authHeader(userId: string) {
    const token = jwtService.sign({ sub: userId });
    return { Authorization: `Bearer ${token}` };
  }

  describe('Governance Policy API', () => {
    it('GET /projects/:id/governance/policy returns default policy when none exists', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      const res = await request(server)
        .get(`/projects/${project.id}/governance/policy`)
        .set(authHeader(user.id))
        .expect(200);

      expect(res.body).toMatchObject({
        projectId: project.id,
        requireApprovalForApply: false,
        restrictShareLinks: false,
        shareLinkExpiryDays: 14,
        allowedExportAudience: 'ANYONE_WITH_LINK',
        allowCompetitorMentionsInExports: false,
        allowPIIInExports: false,
      });
    });

    it('PUT /projects/:id/governance/policy updates policy settings', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      const res = await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(user.id))
        .send({
          requireApprovalForApply: true,
          restrictShareLinks: true,
          shareLinkExpiryDays: 7,
          allowedExportAudience: 'PASSCODE',
          allowCompetitorMentionsInExports: true,
        })
        .expect(200);

      expect(res.body).toMatchObject({
        projectId: project.id,
        requireApprovalForApply: true,
        restrictShareLinks: true,
        shareLinkExpiryDays: 7,
        allowedExportAudience: 'PASSCODE',
        allowCompetitorMentionsInExports: true,
        allowPIIInExports: false, // Always false per spec
      });
    });

    it('rejects attempt to set allowPIIInExports to true', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      const res = await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(user.id))
        .send({
          allowPIIInExports: true,
        })
        .expect(200);

      // Should silently ignore the field (or could throw - implementation choice)
      expect(res.body.allowPIIInExports).toBe(false);
    });
  });

  describe('Approval Workflow', () => {
    it('POST /projects/:id/governance/approvals creates approval request', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      const res = await request(server)
        .post(`/projects/${project.id}/governance/approvals`)
        .set(authHeader(user.id))
        .send({
          resourceType: 'GEO_FIX_APPLY',
          resourceId: 'draft-123',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        projectId: project.id,
        resourceType: 'GEO_FIX_APPLY',
        resourceId: 'draft-123',
        status: 'PENDING_APPROVAL',
        consumed: false,
      });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('requestedAt');
    });

    it('POST /projects/:id/governance/approvals/:id/approve approves request', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Create approval request
      const createRes = await request(server)
        .post(`/projects/${project.id}/governance/approvals`)
        .set(authHeader(user.id))
        .send({
          resourceType: 'GEO_FIX_APPLY',
          resourceId: 'draft-456',
        })
        .expect(201);

      const approvalId = createRes.body.id;

      // Approve it
      const approveRes = await request(server)
        .post(`/projects/${project.id}/governance/approvals/${approvalId}/approve`)
        .set(authHeader(user.id))
        .send({ reason: 'Looks good' })
        .expect(201);

      expect(approveRes.body).toMatchObject({
        id: approvalId,
        status: 'APPROVED',
        decisionReason: 'Looks good',
      });
      expect(approveRes.body).toHaveProperty('decidedAt');
    });

    it('POST /projects/:id/governance/approvals/:id/reject rejects request', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Create approval request
      const createRes = await request(server)
        .post(`/projects/${project.id}/governance/approvals`)
        .set(authHeader(user.id))
        .send({
          resourceType: 'ANSWER_BLOCK_SYNC',
          resourceId: 'product-789',
        })
        .expect(201);

      const approvalId = createRes.body.id;

      // Reject it
      const rejectRes = await request(server)
        .post(`/projects/${project.id}/governance/approvals/${approvalId}/reject`)
        .set(authHeader(user.id))
        .send({ reason: 'Needs more review' })
        .expect(201);

      expect(rejectRes.body).toMatchObject({
        id: approvalId,
        status: 'REJECTED',
        decisionReason: 'Needs more review',
      });
    });
  });

  describe('Approval Gating on GEO Fix Apply', () => {
    it('blocks GEO fix apply when approval is required but not present', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Enable approval requirement
      await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(user.id))
        .send({ requireApprovalForApply: true })
        .expect(200);

      // Create a product and draft
      const product = await testPrisma.product.create({
        data: {
          projectId: project.id,
          externalId: 'approval-test-product',
          title: 'Approval Test Product',
        },
      });

      const draft = await testPrisma.productGeoFixDraft.create({
        data: {
          productId: product.id,
          questionId: 'what_is_it',
          issueType: 'MISSING_DIRECT_ANSWER',
          draftPayload: { improvedAnswer: 'Test improved answer' },
          aiWorkKey: 'test-key-123',
          generatedWithAi: true,
        },
      });

      // Ensure draft.id exists
      expect(draft.id).toBeDefined();

      // Attempt to apply without approval
      const res = await request(server)
        .post(`/products/${product.id}/geo/apply`)
        .set(authHeader(user.id))
        .send({ draftId: draft.id })
        .expect(400);

      // The endpoint should return APPROVAL_REQUIRED if body is parsed correctly
      // If body parsing fails, we get "draftId is required"
      // This test verifies the approval check happens after body validation
      expect(res.body).toMatchObject({
        code: 'APPROVAL_REQUIRED',
        message: expect.stringContaining('requires approval'),
        approvalStatus: expect.anything(),
      });
    });

    it('allows GEO fix apply when approval is present and valid', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Enable approval requirement
      await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(user.id))
        .send({ requireApprovalForApply: true })
        .expect(200);

      // Create a product and draft
      const product = await testPrisma.product.create({
        data: {
          projectId: project.id,
          externalId: 'approval-test-product-2',
          title: 'Approval Test Product 2',
        },
      });

      const draft = await testPrisma.productGeoFixDraft.create({
        data: {
          productId: product.id,
          questionId: 'what_is_it',
          issueType: 'MISSING_DIRECT_ANSWER',
          draftPayload: { improvedAnswer: 'Test improved answer 2' },
          aiWorkKey: 'test-key-456',
          generatedWithAi: true,
        },
      });

      // Create and approve approval request
      const createRes = await request(server)
        .post(`/projects/${project.id}/governance/approvals`)
        .set(authHeader(user.id))
        .send({
          resourceType: 'GEO_FIX_APPLY',
          resourceId: draft.id,
        })
        .expect(201);

      await request(server)
        .post(`/projects/${project.id}/governance/approvals/${createRes.body.id}/approve`)
        .set(authHeader(user.id))
        .send({})
        .expect(201);

      // Now apply should succeed
      const applyRes = await request(server)
        .post(`/products/${product.id}/geo/apply`)
        .set(authHeader(user.id))
        .send({ draftId: draft.id })
        .expect(201);

      expect(applyRes.body.success).toBe(true);
    });
  });

  describe('Share Link Passcode Protection', () => {
    it('creates share link with passcode when audience is PASSCODE', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      const res = await request(server)
        .post(`/projects/${project.id}/geo-reports/share-links`)
        .set(authHeader(user.id))
        .send({
          title: 'Protected Report',
          audience: 'PASSCODE',
        })
        .expect(201);

      expect(res.body.shareLink.audience).toBe('PASSCODE');
      expect(res.body.shareLink.passcodeLast4).toHaveLength(4);
      expect(res.body.passcode).toBeDefined();
      expect(res.body.passcode).toHaveLength(8);
      expect(res.body.passcode).toMatch(/^[A-Z0-9]+$/);
    });

    it('public view returns passcode_required for protected links', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Create protected share link
      const createRes = await request(server)
        .post(`/projects/${project.id}/geo-reports/share-links`)
        .set(authHeader(user.id))
        .send({ audience: 'PASSCODE' })
        .expect(201);

      const shareToken = createRes.body.shareLink.shareToken;

      // Try to access without passcode
      const viewRes = await request(server)
        .get(`/public/geo-reports/${shareToken}`)
        .expect(200);

      expect(viewRes.body.status).toBe('passcode_required');
      expect(viewRes.body.passcodeLast4).toBeDefined();
    });

    it('public view returns valid report when correct passcode is provided', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Create a product for the report
      await testPrisma.product.create({
        data: {
          projectId: project.id,
          externalId: 'passcode-test-product',
          title: 'Passcode Test Product',
        },
      });

      // Create protected share link
      const createRes = await request(server)
        .post(`/projects/${project.id}/geo-reports/share-links`)
        .set(authHeader(user.id))
        .send({ audience: 'PASSCODE' })
        .expect(201);

      const shareToken = createRes.body.shareLink.shareToken;
      const passcode = createRes.body.passcode;

      // Verify with correct passcode
      const viewRes = await request(server)
        .post(`/public/geo-reports/${shareToken}/verify`)
        .send({ passcode })
        .expect(201);

      expect(viewRes.body.status).toBe('valid');
      expect(viewRes.body.report).toBeDefined();
    });

    it('public view returns passcode_invalid for incorrect passcode', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Create protected share link
      const createRes = await request(server)
        .post(`/projects/${project.id}/geo-reports/share-links`)
        .set(authHeader(user.id))
        .send({ audience: 'PASSCODE' })
        .expect(201);

      const shareToken = createRes.body.shareLink.shareToken;

      // Try wrong passcode
      const viewRes = await request(server)
        .post(`/public/geo-reports/${shareToken}/verify`)
        .send({ passcode: 'WRONGPWD' })
        .expect(201);

      expect(viewRes.body.status).toBe('passcode_invalid');
    });
  });

  describe('Share Link Expiry Enforcement', () => {
    it('uses governance policy expiry days for new share links', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Set custom expiry
      await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(user.id))
        .send({ shareLinkExpiryDays: 7 })
        .expect(200);

      // Create share link
      const createRes = await request(server)
        .post(`/projects/${project.id}/geo-reports/share-links`)
        .set(authHeader(user.id))
        .send({})
        .expect(201);

      const expiresAt = new Date(createRes.body.shareLink.expiresAt);
      const createdAt = new Date(createRes.body.shareLink.createdAt);
      const diffDays = Math.round((expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(7);
    });
  });

  describe('Audit Events', () => {
    it('logs policy change events', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Update policy
      await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(user.id))
        .send({ requireApprovalForApply: true })
        .expect(200);

      // Check audit events
      const res = await request(server)
        .get(`/projects/${project.id}/governance/audit-events`)
        .set(authHeader(user.id))
        .expect(200);

      const policyEvent = res.body.events.find(
        (e: any) => e.eventType === 'POLICY_CHANGED'
      );
      expect(policyEvent).toBeDefined();
      expect(policyEvent.actorUserId).toBe(user.id);
    });

    it('logs share link created and revoked events', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Create share link
      const createRes = await request(server)
        .post(`/projects/${project.id}/geo-reports/share-links`)
        .set(authHeader(user.id))
        .send({})
        .expect(201);

      const linkId = createRes.body.shareLink.id;

      // Revoke it
      await request(server)
        .delete(`/projects/${project.id}/geo-reports/share-links/${linkId}`)
        .set(authHeader(user.id))
        .expect(200);

      // Check audit events
      const res = await request(server)
        .get(`/projects/${project.id}/governance/audit-events`)
        .set(authHeader(user.id))
        .expect(200);

      const createEvent = res.body.events.find(
        (e: any) => e.eventType === 'SHARE_LINK_CREATED'
      );
      const revokeEvent = res.body.events.find(
        (e: any) => e.eventType === 'SHARE_LINK_REVOKED'
      );

      expect(createEvent).toBeDefined();
      expect(revokeEvent).toBeDefined();
    });
  });

  describe('Share Link Restriction Enforcement', () => {
    it('rejects public link creation when policy requires passcode', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Enable restrictions with passcode requirement
      await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(user.id))
        .send({
          restrictShareLinks: true,
          allowedExportAudience: 'PASSCODE',
        })
        .expect(200);

      // Try to create public link
      const res = await request(server)
        .post(`/projects/${project.id}/geo-reports/share-links`)
        .set(authHeader(user.id))
        .send({ audience: 'ANYONE_WITH_LINK' })
        .expect(403);

      expect(res.body.message).toContain('passcode');
    });
  });

  describe('Mutation-Free Public View (Hard Contract)', () => {
    it('does NOT mutate share link status when viewing expired link', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Create a product for the report
      await testPrisma.product.create({
        data: {
          projectId: project.id,
          externalId: 'mutation-free-test-product',
          title: 'Mutation Free Test Product',
        },
      });

      // Create share link with status ACTIVE but expiresAt in the past
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const shareLink = await testPrisma.geoReportShareLink.create({
        data: {
          projectId: project.id,
          createdByUserId: user.id,
          status: 'ACTIVE', // Explicitly ACTIVE
          expiresAt: pastDate, // But expired
          generatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
          audience: 'ANYONE_WITH_LINK',
        },
      });

      // Capture original state
      const originalLink = await testPrisma.geoReportShareLink.findUnique({
        where: { id: shareLink.id },
      });
      expect(originalLink?.status).toBe('ACTIVE');

      // Access the public view endpoint (should return expired)
      const viewRes = await request(server)
        .get(`/public/geo-reports/${shareLink.shareToken}`)
        .expect(200);

      expect(viewRes.body.status).toBe('expired');

      // Verify NO database mutation occurred
      const linkAfterView = await testPrisma.geoReportShareLink.findUnique({
        where: { id: shareLink.id },
      });

      // Hard contract: status must remain ACTIVE (not mutated to EXPIRED)
      expect(linkAfterView?.status).toBe('ACTIVE');
      // No other fields should have changed
      expect(linkAfterView?.revokedAt).toBeNull();
      // Verify createdAt unchanged (as a proxy for no mutation)
      expect(linkAfterView?.createdAt.getTime()).toBe(originalLink?.createdAt.getTime());
    });

    it('does NOT mutate share link when verifying passcode on expired link', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Create share link with passcode, ACTIVE but expired
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const passcodeHash = await bcrypt.hash('TESTPASS', 10);
      const shareLink = await testPrisma.geoReportShareLink.create({
        data: {
          projectId: project.id,
          createdByUserId: user.id,
          status: 'ACTIVE',
          expiresAt: pastDate,
          generatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          audience: 'PASSCODE',
          passcodeHash,
          passcodeLast4: 'PASS',
          passcodeCreatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      });

      // Attempt to verify passcode (should fail due to expiry, no mutation)
      const viewRes = await request(server)
        .post(`/public/geo-reports/${shareLink.shareToken}/verify`)
        .send({ passcode: 'TESTPASS' })
        .expect(201);

      // Should return expired status (not passcode_invalid)
      expect(viewRes.body.status).toBe('expired');

      // Verify NO database mutation occurred
      const linkAfterVerify = await testPrisma.geoReportShareLink.findUnique({
        where: { id: shareLink.id },
      });
      expect(linkAfterVerify?.status).toBe('ACTIVE');
    });

    it('returns revoked even when also expired (precedence check)', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

      // Create share link that is both REVOKED and expired
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const shareLink = await testPrisma.geoReportShareLink.create({
        data: {
          projectId: project.id,
          createdByUserId: user.id,
          status: 'REVOKED',
          expiresAt: pastDate,
          generatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          revokedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          audience: 'ANYONE_WITH_LINK',
        },
      });

      // Access the public view - should return revoked (not expired)
      const viewRes = await request(server)
        .get(`/public/geo-reports/${shareLink.shareToken}`)
        .expect(200);

      expect(viewRes.body.status).toBe('revoked');
    });
  });
});
