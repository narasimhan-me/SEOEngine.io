import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { seedConnectedStoreProject, createTestProducts } from '../../src/testkit';

/**
 * [ROLES-2] Project Roles & Approval Foundations
 *
 * Test coverage:
 * - Policy off: OWNER can apply without approvals
 * - Policy on: apply is blocked with APPROVAL_REQUIRED until approval is granted
 * - VIEWER simulated: apply is forbidden; approving is forbidden
 * - Approval creates audit event
 */
describe('ROLES-2 – Project Roles & Approval Foundations', () => {
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

  describe('Automation Playbooks Apply with Role and Approval Gating', () => {
    describe('Policy OFF (requireApprovalForApply = false)', () => {
      it('OWNER can apply playbook without approvals', async () => {
        const { user, project } = await seedConnectedStoreProject(testPrisma, {
          plan: 'pro',
        });
        await createTestProducts(testPrisma, { projectId: project.id, count: 3, withIssues: true });

        // Ensure policy is off (default)
        const policyRes = await request(server)
          .get(`/projects/${project.id}/governance/policy`)
          .set(authHeader(user.id))
          .expect(200);

        expect(policyRes.body.requireApprovalForApply).toBe(false);

        // Generate a preview first (required for apply)
        const previewRes = await request(server)
          .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
          .set(authHeader(user.id))
          .send({ sampleSize: 1 })
          .expect(201);

        const { scopeId, rulesHash } = previewRes.body;

        // Apply should succeed without approval
        const applyRes = await request(server)
          .post(`/projects/${project.id}/automation-playbooks/apply`)
          .set(authHeader(user.id))
          .send({
            playbookId: 'missing_seo_title',
            scopeId,
            rulesHash,
          })
          .expect(201);

        expect(applyRes.body).toHaveProperty('updatedCount');
      });
    });

    describe('Policy ON (requireApprovalForApply = true)', () => {
      it('OWNER can approve and then apply playbook', async () => {
        const { user, project } = await seedConnectedStoreProject(testPrisma, {
          plan: 'pro',
        });
        await createTestProducts(testPrisma, { projectId: project.id, count: 3, withIssues: true });

        // Enable approval requirement
        await request(server)
          .put(`/projects/${project.id}/governance/policy`)
          .set(authHeader(user.id))
          .send({ requireApprovalForApply: true })
          .expect(200);

        // Generate a preview first
        const previewRes = await request(server)
          .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
          .set(authHeader(user.id))
          .send({ sampleSize: 1 })
          .expect(201);

        const { scopeId, rulesHash } = previewRes.body;

        // Apply should fail without approval (400 Bad Request with structured error)
        const applyWithoutApproval = await request(server)
          .post(`/projects/${project.id}/automation-playbooks/apply`)
          .set(authHeader(user.id))
          .send({
            playbookId: 'missing_seo_title',
            scopeId,
            rulesHash,
          })
          .expect(400);

        // [ROLES-2 FIXUP-1] Error is structured object, not string
        expect(applyWithoutApproval.body.message).toMatchObject({
          code: 'APPROVAL_REQUIRED',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
        });

        // Create and approve an approval request
        const resourceId = `missing_seo_title:${scopeId}`;
        const approvalRes = await request(server)
          .post(`/projects/${project.id}/governance/approvals`)
          .set(authHeader(user.id))
          .send({
            resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
            resourceId,
          })
          .expect(201);

        const approvalId = approvalRes.body.id;

        // Approve the request
        await request(server)
          .post(`/projects/${project.id}/governance/approvals/${approvalId}/approve`)
          .set(authHeader(user.id))
          .expect(200);

        // Now apply should succeed
        const applyRes = await request(server)
          .post(`/projects/${project.id}/automation-playbooks/apply`)
          .set(authHeader(user.id))
          .send({
            playbookId: 'missing_seo_title',
            scopeId,
            rulesHash,
            approvalId,
          })
          .expect(201);

        expect(applyRes.body).toHaveProperty('updatedCount');
      });

      it('apply blocked with structured APPROVAL_REQUIRED error', async () => {
        const { user, project } = await seedConnectedStoreProject(testPrisma, {
          plan: 'pro',
        });
        await createTestProducts(testPrisma, { projectId: project.id, count: 2, withIssues: true });

        // Enable approval requirement
        await request(server)
          .put(`/projects/${project.id}/governance/policy`)
          .set(authHeader(user.id))
          .send({ requireApprovalForApply: true })
          .expect(200);

        // Generate a preview
        const previewRes = await request(server)
          .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
          .set(authHeader(user.id))
          .send({ sampleSize: 1 })
          .expect(201);

        const { scopeId, rulesHash } = previewRes.body;

        // Apply should return structured error (400 Bad Request)
        const res = await request(server)
          .post(`/projects/${project.id}/automation-playbooks/apply`)
          .set(authHeader(user.id))
          .send({
            playbookId: 'missing_seo_title',
            scopeId,
            rulesHash,
          })
          .expect(400);

        // [ROLES-2 FIXUP-1] Validate full structured error shape
        expect(res.body.message).toMatchObject({
          code: 'APPROVAL_REQUIRED',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId: expect.stringContaining('missing_seo_title'),
          approvalStatus: 'none',
        });
      });
    });

    describe('VIEWER Role Simulation', () => {
      it('VIEWER cannot apply playbook (blocked with 403)', async () => {
        const { user, project } = await seedConnectedStoreProject(testPrisma, {
          plan: 'pro',
        });
        await createTestProducts(testPrisma, { projectId: project.id, count: 2, withIssues: true });

        // Set user to VIEWER role
        await testPrisma.user.update({
          where: { id: user.id },
          data: { accountRole: 'VIEWER' },
        });

        // Generate a preview (should still work for VIEWER)
        const previewRes = await request(server)
          .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
          .set(authHeader(user.id))
          .send({ sampleSize: 1 })
          .expect(201);

        const { scopeId, rulesHash } = previewRes.body;

        // Apply should be blocked for VIEWER
        const res = await request(server)
          .post(`/projects/${project.id}/automation-playbooks/apply`)
          .set(authHeader(user.id))
          .send({
            playbookId: 'missing_seo_title',
            scopeId,
            rulesHash,
          })
          .expect(403);

        expect(res.body.message).toContain('Viewer role cannot apply');
      });

      it('VIEWER cannot approve approval requests (blocked with 403)', async () => {
        // Create an OWNER to set up the approval request
        const { user: owner, project } = await seedConnectedStoreProject(testPrisma, {
          plan: 'pro',
        });
        await createTestProducts(testPrisma, { projectId: project.id, count: 2, withIssues: true });

        // Enable approval requirement
        await request(server)
          .put(`/projects/${project.id}/governance/policy`)
          .set(authHeader(owner.id))
          .send({ requireApprovalForApply: true })
          .expect(200);

        // Create approval request as owner
        const resourceId = 'missing_seo_title:test-scope';
        const approvalRes = await request(server)
          .post(`/projects/${project.id}/governance/approvals`)
          .set(authHeader(owner.id))
          .send({
            resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
            resourceId,
          })
          .expect(201);

        const approvalId = approvalRes.body.id;

        // Now set owner to VIEWER role
        await testPrisma.user.update({
          where: { id: owner.id },
          data: { accountRole: 'VIEWER' },
        });

        // VIEWER should not be able to approve
        const res = await request(server)
          .post(`/projects/${project.id}/governance/approvals/${approvalId}/approve`)
          .set(authHeader(owner.id))
          .expect(403);

        expect(res.body.message).toContain('Owner role');
      });
    });

    describe('Audit Events', () => {
      it('approval creates audit event', async () => {
        const { user, project } = await seedConnectedStoreProject(testPrisma, {
          plan: 'pro',
        });

        // Enable approval requirement
        await request(server)
          .put(`/projects/${project.id}/governance/policy`)
          .set(authHeader(user.id))
          .send({ requireApprovalForApply: true })
          .expect(200);

        // Create and approve request
        const resourceId = 'missing_seo_title:test-scope';
        const approvalRes = await request(server)
          .post(`/projects/${project.id}/governance/approvals`)
          .set(authHeader(user.id))
          .send({
            resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
            resourceId,
          })
          .expect(201);

        const approvalId = approvalRes.body.id;

        // Approve the request
        await request(server)
          .post(`/projects/${project.id}/governance/approvals/${approvalId}/approve`)
          .set(authHeader(user.id))
          .expect(200);

        // Check audit events
        const auditRes = await request(server)
          .get(`/projects/${project.id}/governance/audit-events`)
          .set(authHeader(user.id))
          .expect(200);

        const approvalEvents = auditRes.body.events.filter(
          (e: any) => e.eventType === 'APPROVAL_APPROVED',
        );

        expect(approvalEvents.length).toBeGreaterThan(0);
        expect(approvalEvents[0]).toMatchObject({
          eventType: 'APPROVAL_APPROVED',
          resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
          resourceId,
        });
      });
    });
  });

  describe('Preview and Estimate Allowed for VIEWER', () => {
    it('VIEWER can access preview endpoint', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });
      await createTestProducts(testPrisma, { projectId: project.id, count: 2, withIssues: true });

      // Set user to VIEWER role
      await testPrisma.user.update({
        where: { id: user.id },
        data: { accountRole: 'VIEWER' },
      });

      // Preview should still work
      const res = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(user.id))
        .send({ sampleSize: 1 })
        .expect(201);

      expect(res.body).toHaveProperty('samples');
    });

    it('VIEWER can access estimate endpoint', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });
      await createTestProducts(testPrisma, { projectId: project.id, count: 2, withIssues: true });

      // Set user to VIEWER role
      await testPrisma.user.update({
        where: { id: user.id },
        data: { accountRole: 'VIEWER' },
      });

      // Estimate should still work
      const res = await request(server)
        .get(`/projects/${project.id}/automation-playbooks/estimate?playbookId=missing_seo_title`)
        .set(authHeader(user.id))
        .expect(200);

      expect(res.body).toHaveProperty('totalAffectedProducts');
    });
  });
});
