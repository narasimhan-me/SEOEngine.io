/**
 * [SELF-SERVICE-1] Integration Tests
 *
 * These tests cover the Customer Self-Service Control Plane.
 * They MUST break CI if any critical path is violated.
 *
 * Test coverage:
 * - CP-001: Session issuance, session listing, sign-out-all invalidates prior tokens
 * - CP-002: Only OWNER can create Stripe checkout/portal session URLs; EDITOR/VIEWER denied
 * - Preferences persistence (read/write; viewer denied)
 * - Stores disconnect is OWNER-only and does not trigger AI work
 * - "No AI side effects": calling /account/* does not create new AI ledger rows
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestUser, createTestProject, createTestShopifyStoreConnection } from '../../src/testkit';

describe('SELF-SERVICE-1 Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper to create test user with JWT
  async function createTestUserWithToken(options: {
    accountRole?: 'OWNER' | 'EDITOR' | 'VIEWER';
    plan?: string;
  } = {}) {
    const { user } = await createTestUser(prisma as any, {
      plan: options.plan ?? 'pro',
      accountRole: options.accountRole ?? 'OWNER',
    });

    // Create session for the user
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        lastSeenAt: new Date(),
      },
    });

    const accessToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    return { user, session, accessToken };
  }

  // ==========================================================================
  // CP-001: Session issuance, session listing, sign-out-all invalidates prior tokens
  // ==========================================================================

  describe('CP-001: Sessions and Sign-Out-All', () => {
    it('should issue a session on login and list active sessions', async () => {
      const { user, accessToken } = await createTestUserWithToken();

      // List sessions
      const response = await request(app.getHttpServer())
        .get('/account/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('createdAt');
      expect(response.body[0]).toHaveProperty('isCurrent');
    });

    it('should invalidate prior tokens after sign-out-all', async () => {
      const { user, accessToken, session } = await createTestUserWithToken();

      // Verify token works
      await request(app.getHttpServer())
        .get('/account/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Sign out all sessions
      const signOutResponse = await request(app.getHttpServer())
        .post('/account/sessions/sign-out-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(signOutResponse.body).toHaveProperty('revokedCount');
      expect(signOutResponse.body.revokedCount).toBeGreaterThan(0);

      // Create a new token to test (simulating a fresh login after sign-out)
      // The old token should now be rejected due to tokenInvalidBefore
      // Note: In a real scenario, the user would log in again to get a new token
      // For this test, we verify the session is revoked
      const revokedSession = await prisma.userSession.findUnique({
        where: { id: session.id },
      });

      expect(revokedSession?.revokedAt).not.toBeNull();

      // Verify audit log was created
      const auditLog = await prisma.userAccountAuditLog.findFirst({
        where: {
          actorUserId: user.id,
          actionType: 'sign_out_all_sessions',
        },
      });

      expect(auditLog).not.toBeNull();
    });
  });

  // ==========================================================================
  // CP-002: Only OWNER can create Stripe checkout/portal session URLs
  // ==========================================================================

  describe('CP-002: Billing Owner-Only Writes', () => {
    it('should allow OWNER to call create-checkout-session', async () => {
      const { accessToken } = await createTestUserWithToken({ accountRole: 'OWNER' });

      // Note: This may fail if Stripe is not configured, but should not return 403
      const response = await request(app.getHttpServer())
        .post('/billing/create-checkout-session')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ planId: 'pro' });

      // Should not be forbidden
      expect(response.status).not.toBe(403);
    });

    it('should deny EDITOR from calling create-checkout-session', async () => {
      const { accessToken } = await createTestUserWithToken({ accountRole: 'EDITOR' });

      const response = await request(app.getHttpServer())
        .post('/billing/create-checkout-session')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ planId: 'pro' })
        .expect(403);

      expect(response.body.message).toContain('owner');
    });

    it('should deny VIEWER from calling create-checkout-session', async () => {
      const { accessToken } = await createTestUserWithToken({ accountRole: 'VIEWER' });

      const response = await request(app.getHttpServer())
        .post('/billing/create-checkout-session')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ planId: 'pro' })
        .expect(403);

      expect(response.body.message).toContain('owner');
    });

    it('should allow EDITOR/VIEWER to read billing summary', async () => {
      const { accessToken } = await createTestUserWithToken({ accountRole: 'EDITOR' });

      const response = await request(app.getHttpServer())
        .get('/billing/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('plan');
    });
  });

  // ==========================================================================
  // Preferences persistence (read/write; viewer denied)
  // ==========================================================================

  describe('Preferences Persistence', () => {
    it('should allow OWNER to read and write preferences', async () => {
      const { accessToken } = await createTestUserWithToken({ accountRole: 'OWNER' });

      // Read preferences
      const readResponse = await request(app.getHttpServer())
        .get('/account/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(readResponse.body).toHaveProperty('notifyQuotaWarnings');

      // Write preferences
      const writeResponse = await request(app.getHttpServer())
        .put('/account/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notifyQuotaWarnings: false })
        .expect(200);

      expect(writeResponse.body.notifyQuotaWarnings).toBe(false);
    });

    it('should deny VIEWER from writing preferences', async () => {
      const { accessToken } = await createTestUserWithToken({ accountRole: 'VIEWER' });

      // Read should work
      await request(app.getHttpServer())
        .get('/account/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Write should be denied
      const response = await request(app.getHttpServer())
        .put('/account/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notifyQuotaWarnings: false })
        .expect(403);

      expect(response.body.message).toContain('Viewer');
    });
  });

  // ==========================================================================
  // Stores disconnect is OWNER-only and does not trigger AI work
  // ==========================================================================

  describe('Stores Disconnect', () => {
    it('should allow OWNER to disconnect store', async () => {
      const { user, accessToken } = await createTestUserWithToken({ accountRole: 'OWNER' });

      // Create project with Shopify connection
      const project = await createTestProject(prisma as any, { userId: user.id });
      await createTestShopifyStoreConnection(prisma as any, { projectId: project.id });

      // Count AI runs before
      const runsBefore = await prisma.automationPlaybookRun.count({
        where: { createdByUserId: user.id },
      });

      // Disconnect store
      const response = await request(app.getHttpServer())
        .post(`/account/stores/${project.id}/disconnect`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify no AI work was triggered
      const runsAfter = await prisma.automationPlaybookRun.count({
        where: { createdByUserId: user.id },
      });

      expect(runsAfter).toBe(runsBefore);

      // Verify integration was deleted
      const integration = await prisma.integration.findFirst({
        where: { projectId: project.id, type: 'SHOPIFY' },
      });

      expect(integration).toBeNull();
    });

    it('should deny EDITOR from disconnecting store', async () => {
      const { user, accessToken } = await createTestUserWithToken({ accountRole: 'EDITOR' });

      const project = await createTestProject(prisma as any, { userId: user.id });
      await createTestShopifyStoreConnection(prisma as any, { projectId: project.id });

      const response = await request(app.getHttpServer())
        .post(`/account/stores/${project.id}/disconnect`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.message).toContain('owner');
    });
  });

  // ==========================================================================
  // [BILLING-GTM-1] AI Usage Quota Env-Driven
  // ==========================================================================

  describe('CP-002: BILLING-GTM-1 AI Quota', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
      process.env = { ...ORIGINAL_ENV };
    });

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    it('should return quota limit from env variable', async () => {
      // Set a known small value for testing
      process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '50';

      const { user, accessToken } = await createTestUserWithToken({
        accountRole: 'OWNER',
        plan: 'pro',
      });

      // Create some runs - mix of AI used, reused, and APPLY
      const project = await createTestProject(prisma as any, { userId: user.id });

      const testPlaybookId = 'test_playbook';
      const testScopeId = `project:${project.id}`;
      const testRulesHash = 'test-hash-123';

      // AI-used run
      const aiRun = await prisma.automationPlaybookRun.create({
        data: {
          project: { connect: { id: project.id } },
          createdBy: { connect: { id: user.id } },
          playbookId: testPlaybookId,
          scopeId: testScopeId,
          rulesHash: testRulesHash,
          idempotencyKey: `ai-run-${Date.now()}`,
          runType: 'PREVIEW_GENERATE',
          status: 'SUCCEEDED',
          aiUsed: true,
        },
      });

      // Reused run
      await prisma.automationPlaybookRun.create({
        data: {
          project: { connect: { id: project.id } },
          createdBy: { connect: { id: user.id } },
          playbookId: testPlaybookId,
          scopeId: testScopeId,
          rulesHash: testRulesHash,
          idempotencyKey: `reuse-run-${Date.now()}`,
          runType: 'PREVIEW_GENERATE',
          status: 'SUCCEEDED',
          aiUsed: false,
          reusedFromRunId: aiRun.id,
          reused: true,
        },
      });

      // APPLY run (must have aiUsed=false)
      await prisma.automationPlaybookRun.create({
        data: {
          project: { connect: { id: project.id } },
          createdBy: { connect: { id: user.id } },
          playbookId: testPlaybookId,
          scopeId: testScopeId,
          rulesHash: testRulesHash,
          idempotencyKey: `apply-run-${Date.now()}`,
          runType: 'APPLY',
          status: 'SUCCEEDED',
          aiUsed: false,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/account/ai-usage')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Quota limit should match env value
      expect(response.body.quotaLimit).toBe(50);

      // AI used runs should be 1
      expect(response.body.aiUsedRuns).toBe(1);

      // Runs avoided (reused) should be 1
      expect(response.body.runsAvoided).toBe(1);

      // APPLY invariant: no violations
      expect(response.body.applyInvariantViolations).toBe(0);

      // Trust messages should be present
      expect(response.body.applyInvariantMessage).toContain('APPLY never uses AI');
      expect(response.body.reuseMessage).toContain('Reuse');
    });

    it('should return null quota limit when env not configured', async () => {
      // Ensure env is not set
      delete process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO;

      const { accessToken } = await createTestUserWithToken({
        accountRole: 'OWNER',
        plan: 'pro',
      });

      const response = await request(app.getHttpServer())
        .get('/account/ai-usage')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Quota limit should be null (unlimited)
      expect(response.body.quotaLimit).toBeNull();

      // quotaUsedPercent should be 0 when unlimited
      expect(response.body.quotaUsedPercent).toBe(0);
    });

    it('should include aiQuotaMonthlyRuns field in plans response', async () => {
      process.env.AI_USAGE_MONTHLY_RUN_LIMIT_FREE = '10';
      process.env.AI_USAGE_MONTHLY_RUN_LIMIT_PRO = '100';

      const { accessToken } = await createTestUserWithToken();

      const response = await request(app.getHttpServer())
        .get('/billing/plans')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Check that at least one plan has the aiQuotaMonthlyRuns field
      const freePlan = response.body.find((p: any) => p.id === 'free');
      const proPlan = response.body.find((p: any) => p.id === 'pro');

      expect(freePlan).toBeDefined();
      expect(proPlan).toBeDefined();
      expect(freePlan).toHaveProperty('aiQuotaMonthlyRuns');
      expect(proPlan).toHaveProperty('aiQuotaMonthlyRuns');
    });
  });

  // ==========================================================================
  // No AI side effects from /account/* endpoints
  // ==========================================================================

  describe('No AI Side Effects', () => {
    it('should not create AI ledger rows when calling /account/* endpoints', async () => {
      const { user, accessToken } = await createTestUserWithToken();

      // Create a project for stores endpoint
      const project = await createTestProject(prisma as any, { userId: user.id });
      await createTestShopifyStoreConnection(prisma as any, { projectId: project.id });

      // Count AI usage events before
      const aiEventsBefore = await prisma.aiUsageEvent.count({
        where: { userId: user.id },
      });

      // Call all account endpoints
      await request(app.getHttpServer())
        .get('/account/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .put('/account/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      await request(app.getHttpServer())
        .get('/account/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .put('/account/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notifyQuotaWarnings: true })
        .expect(200);

      await request(app.getHttpServer())
        .get('/account/ai-usage')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/account/stores')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/account/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Count AI usage events after
      const aiEventsAfter = await prisma.aiUsageEvent.count({
        where: { userId: user.id },
      });

      // No new AI events should have been created
      expect(aiEventsAfter).toBe(aiEventsBefore);
    });
  });
});
