import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../utils/test-db';
import { createTestUser, createTestProject } from '../../src/testkit';

/**
 * [ADMIN-OPS-1] Support & Management Operations Dashboard Integration Tests
 *
 * Tests internal admin role-based access control, read-only impersonation,
 * quota reset, safe resync, and immutable audit logging.
 */
describe('ADMIN-OPS-1 – Support & Management Operations', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
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

  async function createInternalAdmin(params: {
    email: string;
    adminRole: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null;
  }) {
    const { user } = await createTestUser(testPrisma, { email: params.email });
    const updated = await testPrisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN', adminRole: params.adminRole },
    });
    return updated;
  }

  describe('D1 – Internal Admin Role Gating', () => {
    it('rejects user with role=ADMIN but no adminRole', async () => {
      const user = await createInternalAdmin({
        email: 'admin-no-internal-role@test.com',
        adminRole: null,
      });

      const token = jwtService.sign({ sub: user.id });
      const res = await request(server)
        .get('/admin/overview')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('allows user with role=ADMIN and adminRole=OPS_ADMIN', async () => {
      const user = await createInternalAdmin({
        email: 'ops-admin-gating@test.com',
        adminRole: 'OPS_ADMIN',
      });

      const token = jwtService.sign({ sub: user.id });
      const res = await request(server)
        .get('/admin/overview')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('D2 – Capability-Based Access Control', () => {
    it('SUPPORT_AGENT can perform support actions', async () => {
      const adminUser = await createInternalAdmin({
        email: 'support@test.com',
        adminRole: 'SUPPORT_AGENT',
      });

      const { user: targetUser } = await createTestUser(testPrisma, {
        email: 'target@test.com',
      });

      const token = jwtService.sign({ sub: adminUser.id });
      const res = await request(server)
        .post(`/admin/users/${targetUser.id}/impersonate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
    });

    it('MANAGEMENT_CEO cannot perform ops actions (read-only)', async () => {
      const ceoUser = await createInternalAdmin({
        email: 'ceo@test.com',
        adminRole: 'MANAGEMENT_CEO',
      });

      const { user: targetUser } = await createTestUser(testPrisma, {
        email: 'target2@test.com',
      });

      const token = jwtService.sign({ sub: ceoUser.id });
      const res = await request(server)
        .post(`/admin/users/${targetUser.id}/quota-reset`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Test reset' });

      expect(res.status).toBe(403);
    });

    it('OPS_ADMIN can perform quota reset', async () => {
      const opsAdmin = await createInternalAdmin({
        email: 'ops@test.com',
        adminRole: 'OPS_ADMIN',
      });

      const { user: targetUser } = await createTestUser(testPrisma, {
        email: 'target3@test.com',
      });

      const token = jwtService.sign({ sub: opsAdmin.id });
      const res = await request(server)
        .post(`/admin/users/${targetUser.id}/quota-reset`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Customer support case #12345' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.reset?.id).toBeDefined();
    });
  });

  describe('D3 – Read-Only Impersonation', () => {
    it('impersonation token is marked read-only', async () => {
      const adminUser = await createInternalAdmin({
        email: 'support2@test.com',
        adminRole: 'SUPPORT_AGENT',
      });

      const { user: targetUser } = await createTestUser(testPrisma, {
        email: 'target4@test.com',
      });
      const project = await createTestProject(testPrisma, {
        userId: targetUser.id,
        name: 'Impersonation Test Project',
        domain: 'impersonation.example.com',
      });

      const adminToken = jwtService.sign({ sub: adminUser.id });
      const impersonateRes = await request(server)
        .post(`/admin/users/${targetUser.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(impersonateRes.status).toBe(201);
      const impersonationToken = impersonateRes.body.token;

      // Try to perform a write action with impersonation token - should fail
      const writeRes = await request(server)
        .put(`/projects/${project.id}`)
        .set('Authorization', `Bearer ${impersonationToken}`)
        .send({ name: 'Hacked Name' });

      expect(writeRes.status).toBe(403);
      expect(writeRes.body.message).toContain('Read-only impersonation mode');
    });

    it('impersonation token allows read actions', async () => {
      const adminUser = await createInternalAdmin({
        email: 'support3@test.com',
        adminRole: 'SUPPORT_AGENT',
      });

      const { user: targetUser } = await createTestUser(testPrisma, {
        email: 'target5@test.com',
      });
      await createTestProject(testPrisma, {
        userId: targetUser.id,
        name: 'Read Test Project',
        domain: 'read.example.com',
      });

      const adminToken = jwtService.sign({ sub: adminUser.id });
      const impersonateRes = await request(server)
        .post(`/admin/users/${targetUser.id}/impersonate`)
        .set('Authorization', `Bearer ${adminToken}`);

      const impersonationToken = impersonateRes.body.token;

      // Read action should succeed
      const readRes = await request(server)
        .get('/projects')
        .set('Authorization', `Bearer ${impersonationToken}`);

      expect(readRes.status).toBe(200);
    });
  });

  describe('D4 – Audit Log', () => {
    it('admin actions are logged immutably', async () => {
      const opsAdmin = await createInternalAdmin({
        email: 'ops2@test.com',
        adminRole: 'OPS_ADMIN',
      });

      const { user: targetUser } = await createTestUser(testPrisma, {
        email: 'target6@test.com',
      });

      const token = jwtService.sign({ sub: opsAdmin.id });

      // Perform an auditable action
      await request(server)
        .post(`/admin/users/${targetUser.id}/quota-reset`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Audit test' });

      // Check audit log
      const auditRes = await request(server)
        .get('/admin/audit-log')
        .set('Authorization', `Bearer ${token}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.logs.length).toBeGreaterThan(0);

      const latestLog = auditRes.body.logs[0];
      expect(latestLog.actionType).toBe('quota_reset');
      expect(latestLog.targetUserId).toBe(targetUser.id);
      expect(latestLog.performedByUserId).toBe(opsAdmin.id);
    });
  });

  describe('D5 – Quota Reset', () => {
    it('quota reset creates offset record', async () => {
      const opsAdmin = await createInternalAdmin({
        email: 'ops3@test.com',
        adminRole: 'OPS_ADMIN',
      });

      const { user: targetUser } = await createTestUser(testPrisma, {
        email: 'target7@test.com',
      });

      const token = jwtService.sign({ sub: opsAdmin.id });

      await request(server)
        .post(`/admin/users/${targetUser.id}/quota-reset`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Quota offset test' });

      // Verify offset was created
      const offset = await testPrisma.aiMonthlyQuotaReset.findFirst({
        where: { userId: targetUser.id },
      });

      expect(offset).not.toBeNull();
      expect(offset!.reason).toBe('Quota offset test');
    });
  });

  describe('D6 – Projects and Safe Resync', () => {
    it('lists projects with sync info', async () => {
      const opsAdmin = await createInternalAdmin({
        email: 'ops4@test.com',
        adminRole: 'OPS_ADMIN',
      });

      const { user: owner } = await createTestUser(testPrisma, {
        email: 'owner@test.com',
      });
      await createTestProject(testPrisma, {
        userId: owner.id,
        name: 'Admin Projects Test',
        domain: 'adminprojects.example.com',
      });

      const token = jwtService.sign({ sub: opsAdmin.id });
      const res = await request(server)
        .get('/admin/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.projects.length).toBeGreaterThan(0);
    });
  });

  describe('D7 – System Health', () => {
    it('returns system health metrics', async () => {
      const opsAdmin = await createInternalAdmin({
        email: 'ops5@test.com',
        adminRole: 'OPS_ADMIN',
      });

      const token = jwtService.sign({ sub: opsAdmin.id });
      const res = await request(server)
        .get('/admin/system-health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('queueHealth');
      expect(res.body).toHaveProperty('failureSignals');
      expect(res.body).toHaveProperty('checkedAt');
    });
  });
});
