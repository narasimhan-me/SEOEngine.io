import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import {
  seedConnectedStoreProject,
  createTestProducts,
  createTestUser,
} from '../../src/testkit';
import { ProjectMemberRole } from '@prisma/client';

/**
 * [ROLES-3] Membership-Aware Access Control Integration Tests
 *
 * Test coverage:
 * - Multi-user project membership: OWNER, EDITOR, VIEWER roles
 * - View endpoints: All ProjectMembers can access
 * - Draft generation: OWNER and EDITOR only (VIEWER blocked)
 * - Apply/mutation endpoints: OWNER only (EDITOR and VIEWER blocked)
 * - Non-member: Completely blocked from all project endpoints
 */
describe('ROLES-3 – Membership-Aware Access Control', () => {
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

  /**
   * Helper to create a multi-user project with OWNER, EDITOR, and VIEWER members.
   */
  async function seedMultiUserProject() {
    // Create OWNER via seedConnectedStoreProject (sets up project with Shopify)
    const { user: owner, project, shopifyIntegration } =
      await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

    // Create EDITOR user
    const { user: editor } = await createTestUser(testPrisma, {
      plan: 'pro',
    });

    // Create VIEWER user
    const { user: viewer } = await createTestUser(testPrisma, {
      plan: 'pro',
    });

    // Create non-member user
    const { user: nonMember } = await createTestUser(testPrisma, {
      plan: 'pro',
    });

    // Add EDITOR as ProjectMember
    await testPrisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: editor.id,
        role: ProjectMemberRole.EDITOR,
      },
    });

    // Add VIEWER as ProjectMember
    await testPrisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: viewer.id,
        role: ProjectMemberRole.VIEWER,
      },
    });

    // Create test products
    const products = await createTestProducts(testPrisma, {
      projectId: project.id,
      count: 3,
      withIssues: true,
    });

    return {
      owner,
      editor,
      viewer,
      nonMember,
      project,
      shopifyIntegration,
      products,
    };
  }

  describe('View Endpoints – All ProjectMembers Can Access', () => {
    it('OWNER can access project DEO score', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/deo/score`)
        .set(authHeader(owner.id))
        .expect(200);

      expect(res.body).toHaveProperty('overallScore');
    });

    it('EDITOR can access project DEO score', async () => {
      const { editor, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/deo/score`)
        .set(authHeader(editor.id))
        .expect(200);

      expect(res.body).toHaveProperty('overallScore');
    });

    it('VIEWER can access project DEO score', async () => {
      const { viewer, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/deo/score`)
        .set(authHeader(viewer.id))
        .expect(200);

      expect(res.body).toHaveProperty('overallScore');
    });

    it('Non-member is blocked from project DEO score (403)', async () => {
      const { nonMember, project } = await seedMultiUserProject();

      await request(server)
        .get(`/projects/${project.id}/deo/score`)
        .set(authHeader(nonMember.id))
        .expect(403);
    });

    it('All ProjectMembers can access project insights', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      // OWNER
      await request(server)
        .get(`/projects/${project.id}/insights`)
        .set(authHeader(owner.id))
        .expect(200);

      // EDITOR
      await request(server)
        .get(`/projects/${project.id}/insights`)
        .set(authHeader(editor.id))
        .expect(200);

      // VIEWER
      await request(server)
        .get(`/projects/${project.id}/insights`)
        .set(authHeader(viewer.id))
        .expect(200);
    });

    it('All ProjectMembers can access automation playbook runs list', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      // OWNER
      await request(server)
        .get(`/projects/${project.id}/automation-playbooks/runs`)
        .set(authHeader(owner.id))
        .expect(200);

      // EDITOR
      await request(server)
        .get(`/projects/${project.id}/automation-playbooks/runs`)
        .set(authHeader(editor.id))
        .expect(200);

      // VIEWER
      await request(server)
        .get(`/projects/${project.id}/automation-playbooks/runs`)
        .set(authHeader(viewer.id))
        .expect(200);
    });
  });

  describe('Draft Generation Endpoints – OWNER/EDITOR Only', () => {
    it('OWNER can generate automation playbook preview', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(owner.id))
        .send({ sampleSize: 1 })
        .expect(201);

      expect(res.body).toHaveProperty('samples');
    });

    it('EDITOR can generate automation playbook preview', async () => {
      const { editor, project } = await seedMultiUserProject();

      const res = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(editor.id))
        .send({ sampleSize: 1 })
        .expect(201);

      expect(res.body).toHaveProperty('samples');
    });

    it('VIEWER is blocked from generating automation playbook preview (403)', async () => {
      const { viewer, project } = await seedMultiUserProject();

      const res = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(viewer.id))
        .send({ sampleSize: 1 })
        .expect(403);

      expect(res.body.message).toContain('cannot generate');
    });

    it('Non-member is blocked from generating preview (403)', async () => {
      const { nonMember, project } = await seedMultiUserProject();

      await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(nonMember.id))
        .send({ sampleSize: 1 })
        .expect(403);
    });
  });

  describe('Apply/Mutation Endpoints – OWNER Only', () => {
    it('OWNER can apply automation playbook', async () => {
      const { owner, project } = await seedMultiUserProject();

      // Generate preview first
      const previewRes = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(owner.id))
        .send({ sampleSize: 1 })
        .expect(201);

      const { scopeId, rulesHash } = previewRes.body;

      // Apply should succeed
      const applyRes = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/apply`)
        .set(authHeader(owner.id))
        .send({
          playbookId: 'missing_seo_title',
          scopeId,
          rulesHash,
        })
        .expect(201);

      expect(applyRes.body).toHaveProperty('updatedCount');
    });

    it('EDITOR is blocked from applying automation playbook (403)', async () => {
      const { owner, editor, project } = await seedMultiUserProject();

      // Generate preview as OWNER first
      const previewRes = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(owner.id))
        .send({ sampleSize: 1 })
        .expect(201);

      const { scopeId, rulesHash } = previewRes.body;

      // EDITOR apply should fail
      const res = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/apply`)
        .set(authHeader(editor.id))
        .send({
          playbookId: 'missing_seo_title',
          scopeId,
          rulesHash,
        })
        .expect(403);

      expect(res.body.message).toContain('Owner');
    });

    it('VIEWER is blocked from applying automation playbook (403)', async () => {
      const { owner, viewer, project } = await seedMultiUserProject();

      // Generate preview as OWNER first
      const previewRes = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(owner.id))
        .send({ sampleSize: 1 })
        .expect(201);

      const { scopeId, rulesHash } = previewRes.body;

      // VIEWER apply should fail
      await request(server)
        .post(`/projects/${project.id}/automation-playbooks/apply`)
        .set(authHeader(viewer.id))
        .send({
          playbookId: 'missing_seo_title',
          scopeId,
          rulesHash,
        })
        .expect(403);
    });

    it('Non-member is blocked from applying (403)', async () => {
      const { owner, nonMember, project } = await seedMultiUserProject();

      // Generate preview as OWNER first
      const previewRes = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(owner.id))
        .send({ sampleSize: 1 })
        .expect(201);

      const { scopeId, rulesHash } = previewRes.body;

      // Non-member apply should fail
      await request(server)
        .post(`/projects/${project.id}/automation-playbooks/apply`)
        .set(authHeader(nonMember.id))
        .send({
          playbookId: 'missing_seo_title',
          scopeId,
          rulesHash,
        })
        .expect(403);
    });
  });

  describe('Governance Endpoints – OWNER Only for Mutations', () => {
    it('OWNER can update governance policy', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(owner.id))
        .send({ requireApprovalForApply: true })
        .expect(200);

      expect(res.body.requireApprovalForApply).toBe(true);
    });

    it('EDITOR can view governance policy but not update it', async () => {
      const { owner, editor, project } = await seedMultiUserProject();

      // EDITOR can view
      await request(server)
        .get(`/projects/${project.id}/governance/policy`)
        .set(authHeader(editor.id))
        .expect(200);

      // EDITOR cannot update
      await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(editor.id))
        .send({ requireApprovalForApply: true })
        .expect(403);
    });

    it('VIEWER can view governance policy but not update it', async () => {
      const { viewer, project } = await seedMultiUserProject();

      // VIEWER can view
      await request(server)
        .get(`/projects/${project.id}/governance/policy`)
        .set(authHeader(viewer.id))
        .expect(200);

      // VIEWER cannot update
      await request(server)
        .put(`/projects/${project.id}/governance/policy`)
        .set(authHeader(viewer.id))
        .send({ requireApprovalForApply: true })
        .expect(403);
    });
  });

  describe('Member Management – OWNER Only', () => {
    it('OWNER can add new project members', async () => {
      const { owner, project } = await seedMultiUserProject();

      // Create new user to add
      const { user: newUser } = await createTestUser(testPrisma, {});

      const res = await request(server)
        .post(`/projects/${project.id}/members`)
        .set(authHeader(owner.id))
        .send({
          email: newUser.email,
          role: 'EDITOR',
        })
        .expect(201);

      expect(res.body).toHaveProperty('userId', newUser.id);
      expect(res.body).toHaveProperty('role', 'EDITOR');
    });

    it('EDITOR cannot add new project members (403)', async () => {
      const { editor, project } = await seedMultiUserProject();

      // Create new user to add
      const { user: newUser } = await createTestUser(testPrisma, {});

      await request(server)
        .post(`/projects/${project.id}/members`)
        .set(authHeader(editor.id))
        .send({
          email: newUser.email,
          role: 'VIEWER',
        })
        .expect(403);
    });

    it('VIEWER cannot add new project members (403)', async () => {
      const { viewer, project } = await seedMultiUserProject();

      // Create new user to add
      const { user: newUser } = await createTestUser(testPrisma, {});

      await request(server)
        .post(`/projects/${project.id}/members`)
        .set(authHeader(viewer.id))
        .send({
          email: newUser.email,
          role: 'VIEWER',
        })
        .expect(403);
    });

    it('All ProjectMembers can list members', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      // OWNER
      const ownerRes = await request(server)
        .get(`/projects/${project.id}/members`)
        .set(authHeader(owner.id))
        .expect(200);
      expect(ownerRes.body.members.length).toBeGreaterThanOrEqual(2);

      // EDITOR
      await request(server)
        .get(`/projects/${project.id}/members`)
        .set(authHeader(editor.id))
        .expect(200);

      // VIEWER
      await request(server)
        .get(`/projects/${project.id}/members`)
        .set(authHeader(viewer.id))
        .expect(200);
    });

    it('OWNER can change member roles', async () => {
      const { owner, editor, project } = await seedMultiUserProject();

      // Get editor's membership ID
      const membersRes = await request(server)
        .get(`/projects/${project.id}/members`)
        .set(authHeader(owner.id))
        .expect(200);

      const editorMembership = membersRes.body.members.find(
        (m: any) => m.userId === editor.id,
      );

      expect(editorMembership).toBeDefined();

      // OWNER can change role
      const res = await request(server)
        .patch(`/projects/${project.id}/members/${editorMembership.id}`)
        .set(authHeader(owner.id))
        .send({ role: 'VIEWER' })
        .expect(200);

      expect(res.body.role).toBe('VIEWER');
    });

    it('EDITOR cannot change member roles (403)', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      // Get viewer's membership ID
      const membersRes = await request(server)
        .get(`/projects/${project.id}/members`)
        .set(authHeader(owner.id))
        .expect(200);

      const viewerMembership = membersRes.body.members.find(
        (m: any) => m.userId === viewer.id,
      );

      // EDITOR cannot change role
      await request(server)
        .patch(`/projects/${project.id}/members/${viewerMembership.id}`)
        .set(authHeader(editor.id))
        .send({ role: 'EDITOR' })
        .expect(403);
    });
  });

  describe('User Role Resolution Endpoint', () => {
    it('Returns correct role for OWNER', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/user-role`)
        .set(authHeader(owner.id))
        .expect(200);

      expect(res.body.effectiveRole).toBe('OWNER');
      expect(res.body.isMultiUser).toBe(true);
    });

    it('Returns correct role for EDITOR', async () => {
      const { editor, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/user-role`)
        .set(authHeader(editor.id))
        .expect(200);

      expect(res.body.effectiveRole).toBe('EDITOR');
      expect(res.body.isMultiUser).toBe(true);
    });

    it('Returns correct role for VIEWER', async () => {
      const { viewer, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/user-role`)
        .set(authHeader(viewer.id))
        .expect(200);

      expect(res.body.effectiveRole).toBe('VIEWER');
      expect(res.body.isMultiUser).toBe(true);
    });

    it('Returns 403 for non-member', async () => {
      const { nonMember, project } = await seedMultiUserProject();

      await request(server)
        .get(`/projects/${project.id}/user-role`)
        .set(authHeader(nonMember.id))
        .expect(403);
    });
  });

  describe('Single-User Project – Owner Acts as OWNER', () => {
    it('Project owner without explicit membership still has OWNER access', async () => {
      // Create single-user project (no ProjectMember records)
      const { user: owner, project } = await seedConnectedStoreProject(
        testPrisma,
        { plan: 'pro' },
      );
      await createTestProducts(testPrisma, {
        projectId: project.id,
        count: 2,
        withIssues: true,
      });

      // Owner should have full access (implicit OWNER via project.userId)
      const roleRes = await request(server)
        .get(`/projects/${project.id}/user-role`)
        .set(authHeader(owner.id))
        .expect(200);

      expect(roleRes.body.effectiveRole).toBe('OWNER');
      expect(roleRes.body.isMultiUser).toBe(false);

      // Owner can view
      await request(server)
        .get(`/projects/${project.id}/deo/score`)
        .set(authHeader(owner.id))
        .expect(200);

      // Owner can generate drafts
      const previewRes = await request(server)
        .post(`/projects/${project.id}/automation-playbooks/missing_seo_title/preview`)
        .set(authHeader(owner.id))
        .send({ sampleSize: 1 })
        .expect(201);

      const { scopeId, rulesHash } = previewRes.body;

      // Owner can apply
      await request(server)
        .post(`/projects/${project.id}/automation-playbooks/apply`)
        .set(authHeader(owner.id))
        .send({
          playbookId: 'missing_seo_title',
          scopeId,
          rulesHash,
        })
        .expect(201);
    });
  });

  describe('Pillar Endpoints Access Control', () => {
    it('All ProjectMembers can view pillar scorecards', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      const scorecardEndpoints = [
        `/projects/${project.id}/search-intent/summary`,
        `/projects/${project.id}/competitors/scorecard`,
        `/projects/${project.id}/media/scorecard`,
        `/projects/${project.id}/offsite-signals/scorecard`,
        `/projects/${project.id}/local-discovery/scorecard`,
      ];

      for (const endpoint of scorecardEndpoints) {
        // OWNER
        await request(server)
          .get(endpoint)
          .set(authHeader(owner.id))
          .expect(200);

        // EDITOR
        await request(server)
          .get(endpoint)
          .set(authHeader(editor.id))
          .expect(200);

        // VIEWER
        await request(server)
          .get(endpoint)
          .set(authHeader(viewer.id))
          .expect(200);
      }
    });

    it('Non-member is blocked from pillar scorecards', async () => {
      const { nonMember, project } = await seedMultiUserProject();

      const scorecardEndpoints = [
        `/projects/${project.id}/search-intent/summary`,
        `/projects/${project.id}/competitors/scorecard`,
      ];

      for (const endpoint of scorecardEndpoints) {
        await request(server)
          .get(endpoint)
          .set(authHeader(nonMember.id))
          .expect(403);
      }
    });
  });

  // ============================================================================
  // [ROLES-3 FIXUP-4] Extended Coverage for AI, Integrations, and SEO Scan
  // ============================================================================

  describe('[FIXUP-4] AI Usage Endpoints – All ProjectMembers Can View', () => {
    it('All ProjectMembers can view AI usage summary', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      // OWNER
      await request(server)
        .get(`/ai/projects/${project.id}/usage/summary`)
        .set(authHeader(owner.id))
        .expect(200);

      // EDITOR
      await request(server)
        .get(`/ai/projects/${project.id}/usage/summary`)
        .set(authHeader(editor.id))
        .expect(200);

      // VIEWER
      await request(server)
        .get(`/ai/projects/${project.id}/usage/summary`)
        .set(authHeader(viewer.id))
        .expect(200);
    });

    it('Non-member is blocked from AI usage summary (403)', async () => {
      const { nonMember, project } = await seedMultiUserProject();

      await request(server)
        .get(`/ai/projects/${project.id}/usage/summary`)
        .set(authHeader(nonMember.id))
        .expect(403);
    });

    it('All ProjectMembers can view AI usage runs', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      // OWNER
      await request(server)
        .get(`/ai/projects/${project.id}/usage/runs`)
        .set(authHeader(owner.id))
        .expect(200);

      // EDITOR
      await request(server)
        .get(`/ai/projects/${project.id}/usage/runs`)
        .set(authHeader(editor.id))
        .expect(200);

      // VIEWER
      await request(server)
        .get(`/ai/projects/${project.id}/usage/runs`)
        .set(authHeader(viewer.id))
        .expect(200);
    });

    it('All ProjectMembers can view AI usage quota', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      // OWNER
      await request(server)
        .get(`/ai/projects/${project.id}/usage/quota`)
        .set(authHeader(owner.id))
        .expect(200);

      // EDITOR
      await request(server)
        .get(`/ai/projects/${project.id}/usage/quota`)
        .set(authHeader(editor.id))
        .expect(200);

      // VIEWER
      await request(server)
        .get(`/ai/projects/${project.id}/usage/quota`)
        .set(authHeader(viewer.id))
        .expect(200);
    });
  });

  describe('[FIXUP-4] Integrations Endpoints – Members View, OWNER Mutates', () => {
    it('All ProjectMembers can view integrations list', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      // OWNER
      const ownerRes = await request(server)
        .get(`/integrations?projectId=${project.id}`)
        .set(authHeader(owner.id))
        .expect(200);
      expect(ownerRes.body.integrations).toBeDefined();

      // EDITOR
      await request(server)
        .get(`/integrations?projectId=${project.id}`)
        .set(authHeader(editor.id))
        .expect(200);

      // VIEWER
      await request(server)
        .get(`/integrations?projectId=${project.id}`)
        .set(authHeader(viewer.id))
        .expect(200);
    });

    it('Non-member is blocked from viewing integrations (403)', async () => {
      const { nonMember, project } = await seedMultiUserProject();

      await request(server)
        .get(`/integrations?projectId=${project.id}`)
        .set(authHeader(nonMember.id))
        .expect(403);
    });

    it('EDITOR cannot create integrations (403)', async () => {
      const { editor, project } = await seedMultiUserProject();

      await request(server)
        .post('/integrations')
        .set(authHeader(editor.id))
        .send({
          projectId: project.id,
          type: 'CUSTOM_WEBSITE',
          externalId: 'test.example.com',
        })
        .expect(403);
    });

    it('VIEWER cannot create integrations (403)', async () => {
      const { viewer, project } = await seedMultiUserProject();

      await request(server)
        .post('/integrations')
        .set(authHeader(viewer.id))
        .send({
          projectId: project.id,
          type: 'CUSTOM_WEBSITE',
          externalId: 'test.example.com',
        })
        .expect(403);
    });

    it('OWNER can create integrations', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .post('/integrations')
        .set(authHeader(owner.id))
        .send({
          projectId: project.id,
          type: 'CUSTOM_WEBSITE',
          externalId: 'test.example.com',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.type).toBe('CUSTOM_WEBSITE');
    });
  });

  describe('[FIXUP-4] SEO Scan Endpoints – Members View, OWNER Mutates', () => {
    it('All ProjectMembers can view scan results', async () => {
      const { owner, editor, viewer, project } = await seedMultiUserProject();

      // Seed a crawl result for the project
      await testPrisma.crawlResult.create({
        data: {
          projectId: project.id,
          url: 'https://test.example.com/',
          statusCode: 200,
          title: 'Test Page',
          metaDescription: 'Test description',
          h1: 'Test H1',
          wordCount: 500,
          loadTimeMs: 1000,
          issues: [],
        },
      });

      // OWNER
      const ownerRes = await request(server)
        .get(`/seo-scan/results?projectId=${project.id}`)
        .set(authHeader(owner.id))
        .expect(200);
      expect(Array.isArray(ownerRes.body)).toBe(true);

      // EDITOR
      await request(server)
        .get(`/seo-scan/results?projectId=${project.id}`)
        .set(authHeader(editor.id))
        .expect(200);

      // VIEWER
      await request(server)
        .get(`/seo-scan/results?projectId=${project.id}`)
        .set(authHeader(viewer.id))
        .expect(200);
    });

    it('Non-member is blocked from viewing scan results (403)', async () => {
      const { nonMember, project } = await seedMultiUserProject();

      await request(server)
        .get(`/seo-scan/results?projectId=${project.id}`)
        .set(authHeader(nonMember.id))
        .expect(403);
    });

    it('EDITOR cannot start SEO scan (403)', async () => {
      const { editor, project } = await seedMultiUserProject();

      await request(server)
        .post('/seo-scan/start')
        .set(authHeader(editor.id))
        .send({ projectId: project.id })
        .expect(403);
    });

    it('VIEWER cannot start SEO scan (403)', async () => {
      const { viewer, project } = await seedMultiUserProject();

      await request(server)
        .post('/seo-scan/start')
        .set(authHeader(viewer.id))
        .send({ projectId: project.id })
        .expect(403);
    });
  });
});
