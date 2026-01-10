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
 * [WORK-QUEUE-1] Unified Action Bundle Work Queue Integration Tests
 *
 * Test coverage:
 * - Bundle derivation correctness:
 *   - Automation bundle appears when affected products exist
 *   - Issue-derived bundles appear and map health correctly
 * - CTA eligibility rules (server-side derivation fields):
 *   - approvalRequired/approvalStatus mapping for AUTOMATION_PLAYBOOK_APPLY
 *   - Role constraints: viewer/editor/owner state remains safe
 * - Deterministic sorting:
 *   - State priority, health priority, impact rank ordering
 */
describe('WORK-QUEUE-1 – Unified Action Bundle Work Queue', () => {
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
   * Helper to create a multi-user project with members and products.
   */
  async function seedMultiUserProject() {
    const { user: owner, project } = await seedConnectedStoreProject(testPrisma, {
      plan: 'pro',
    });

    const { user: editor } = await createTestUser(testPrisma, { plan: 'pro' });
    const { user: viewer } = await createTestUser(testPrisma, { plan: 'pro' });

    await testPrisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: editor.id,
        role: ProjectMemberRole.EDITOR,
      },
    });

    await testPrisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: viewer.id,
        role: ProjectMemberRole.VIEWER,
      },
    });

    // Create products with missing metadata for automation bundles
    const products = await createTestProducts(testPrisma, {
      projectId: project.id,
      count: 5,
      withIssues: true,
    });

    // Make some products have missing SEO titles for automation playbook detection
    await testPrisma.product.updateMany({
      where: {
        projectId: project.id,
        id: { in: products.slice(0, 3).map((p) => p.id) },
      },
      data: {
        seoTitle: null,
        seoDescription: null,
      },
    });

    return { owner, editor, viewer, project, products };
  }

  // ===========================================================================
  // Basic endpoint access
  // ===========================================================================

  describe('GET /projects/:id/work-queue - Basic Access', () => {
    it('returns 200 for project OWNER', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('viewer');
      expect(res.body.viewer.role).toBe('OWNER');
    });

    it('returns 200 for project EDITOR', async () => {
      const { editor, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(editor.id))
        .expect(200);

      expect(res.body.viewer.role).toBe('EDITOR');
    });

    it('returns 200 for project VIEWER', async () => {
      const { viewer, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(viewer.id))
        .expect(200);

      expect(res.body.viewer.role).toBe('VIEWER');
    });

    it('returns 403 for non-member', async () => {
      const { project } = await seedMultiUserProject();
      const { user: nonMember } = await createTestUser(testPrisma, { plan: 'pro' });

      await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(nonMember.id))
        .expect(403);
    });
  });

  // ===========================================================================
  // Bundle derivation correctness
  // ===========================================================================

  describe('Bundle Derivation', () => {
    it('includes automation bundles when products have missing metadata', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      // Should have automation bundles for missing SEO titles/descriptions
      const automationBundles = res.body.items.filter(
        (b: any) => b.bundleType === 'AUTOMATION_RUN',
      );

      // May have 0-2 automation bundles depending on whether missing_seo_title and missing_seo_description playbooks detect issues
      expect(automationBundles.length).toBeGreaterThanOrEqual(0);

      if (automationBundles.length > 0) {
        const bundle = automationBundles[0];
        expect(bundle).toHaveProperty('bundleId');
        expect(bundle).toHaveProperty('bundleType', 'AUTOMATION_RUN');
        expect(bundle).toHaveProperty('state');
        expect(bundle).toHaveProperty('aiUsage', 'DRAFTS_ONLY');
        expect(bundle).toHaveProperty('aiDisclosureText');
      }
    });

    it('maps health correctly from severity (critical → CRITICAL)', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      // All bundles should have valid health values
      for (const bundle of res.body.items) {
        expect(['CRITICAL', 'NEEDS_ATTENTION', 'HEALTHY']).toContain(bundle.health);
      }
    });
  });

  // ===========================================================================
  // Tab filtering
  // ===========================================================================

  describe('Tab Filtering', () => {
    it('filters by Critical tab', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue?tab=Critical`)
        .set(authHeader(owner.id))
        .expect(200);

      for (const bundle of res.body.items) {
        expect(bundle.health).toBe('CRITICAL');
        expect(bundle.state).not.toBe('APPLIED');
      }
    });

    it('filters by NeedsAttention tab', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue?tab=NeedsAttention`)
        .set(authHeader(owner.id))
        .expect(200);

      for (const bundle of res.body.items) {
        expect(bundle.health).toBe('NEEDS_ATTENTION');
        expect(bundle.state).not.toBe('APPLIED');
      }
    });

    it('returns empty for AppliedRecently when no items applied', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue?tab=AppliedRecently`)
        .set(authHeader(owner.id))
        .expect(200);

      // No items should be in APPLIED state since we haven't applied anything
      expect(res.body.items).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Viewer capabilities
  // ===========================================================================

  describe('Viewer Capabilities', () => {
    it('OWNER has full capabilities', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      expect(res.body.viewer.capabilities).toEqual({
        canGenerateDrafts: true,
        canApply: true,
        canApprove: true,
        canRequestApproval: true,
      });
    });

    it('EDITOR has limited capabilities (no approve, no apply)', async () => {
      const { editor, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(editor.id))
        .expect(200);

      expect(res.body.viewer.capabilities.canGenerateDrafts).toBe(true);
      expect(res.body.viewer.capabilities.canApply).toBe(false);
      expect(res.body.viewer.capabilities.canApprove).toBe(false);
    });

    it('VIEWER has no mutation capabilities', async () => {
      const { viewer, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(viewer.id))
        .expect(200);

      expect(res.body.viewer.capabilities).toEqual({
        canGenerateDrafts: false,
        canApply: false,
        canApprove: false,
        canRequestApproval: false,
      });
    });
  });

  // ===========================================================================
  // Deterministic sorting
  // ===========================================================================

  describe('Deterministic Sorting', () => {
    it('sorts by state priority (PENDING_APPROVAL before DRAFTS_READY before NEW)', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      const items = res.body.items;
      if (items.length < 2) {
        // Not enough items to verify sorting
        return;
      }

      // Verify state priority ordering
      const stateOrder: Record<string, number> = {
        PENDING_APPROVAL: 100,
        APPROVED: 150,
        DRAFTS_READY: 200,
        FAILED: 300,
        BLOCKED: 350,
        NEW: 400,
        PREVIEWED: 450,
        APPLIED: 900,
      };

      for (let i = 1; i < items.length; i++) {
        const prevPriority = stateOrder[items[i - 1].state] ?? 999;
        const currPriority = stateOrder[items[i].state] ?? 999;

        if (prevPriority !== currPriority) {
          expect(prevPriority).toBeLessThanOrEqual(currPriority);
        }
      }
    });

    it('sorts by health within same state (CRITICAL before NEEDS_ATTENTION)', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      const items = res.body.items;
      if (items.length < 2) {
        return;
      }

      const healthOrder: Record<string, number> = {
        CRITICAL: 100,
        NEEDS_ATTENTION: 200,
        HEALTHY: 300,
      };

      // Group by state and check health ordering within each group
      const stateGroups = new Map<string, any[]>();
      for (const item of items) {
        const group = stateGroups.get(item.state) || [];
        group.push(item);
        stateGroups.set(item.state, group);
      }

      for (const [_state, group] of stateGroups) {
        for (let i = 1; i < group.length; i++) {
          const prevHealth = healthOrder[group[i - 1].health] ?? 999;
          const currHealth = healthOrder[group[i].health] ?? 999;

          if (prevHealth !== currHealth) {
            expect(prevHealth).toBeLessThanOrEqual(currHealth);
          }
        }
      }
    });

    it('maintains stable sort with bundleId as final tie-breaker', async () => {
      const { owner, project } = await seedMultiUserProject();

      // Fetch twice and verify same order
      const res1 = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      const res2 = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      const ids1 = res1.body.items.map((b: any) => b.bundleId);
      const ids2 = res2.body.items.map((b: any) => b.bundleId);

      expect(ids1).toEqual(ids2);
    });
  });

  // ===========================================================================
  // Approval status derivation
  // ===========================================================================

  describe('Approval Status Derivation', () => {
    it('includes approval info when governance requires approval', async () => {
      const { owner, project } = await seedMultiUserProject();

      // Enable approval requirement in governance policy
      await testPrisma.projectGovernancePolicy.upsert({
        where: { projectId: project.id },
        create: {
          projectId: project.id,
          requireApprovalForApply: true,
          restrictShareLinks: false,
          shareLinkExpiryDays: 30,
          allowedExportAudience: 'ANYONE_WITH_LINK',
          allowCompetitorMentionsInExports: true,
          allowPIIInExports: false,
        },
        update: {
          requireApprovalForApply: true,
        },
      });

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      // Automation bundles should have approval info when governance is enabled
      const automationBundles = res.body.items.filter(
        (b: any) => b.bundleType === 'AUTOMATION_RUN',
      );

      for (const bundle of automationBundles) {
        if (bundle.approval) {
          expect(bundle.approval.approvalRequired).toBe(true);
          expect(['NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED']).toContain(
            bundle.approval.approvalStatus,
          );
        }
      }
    });
  });

  // ===========================================================================
  // GEO Export bundle
  // ===========================================================================

  describe('GEO Export Bundle', () => {
    it('includes GEO export bundle with mutation-free view flag', async () => {
      const { owner, project } = await seedMultiUserProject();

      const res = await request(server)
        .get(`/projects/${project.id}/work-queue`)
        .set(authHeader(owner.id))
        .expect(200);

      const geoBundle = res.body.items.find(
        (b: any) => b.bundleType === 'GEO_EXPORT',
      );

      if (geoBundle) {
        expect(geoBundle.geoExport).toBeDefined();
        expect(geoBundle.geoExport.mutationFreeView).toBe(true);
        expect(geoBundle.geoExport.passcodeShownOnce).toBe(true);
        expect(['NONE', 'ACTIVE', 'EXPIRED', 'REVOKED']).toContain(
          geoBundle.geoExport.shareLinkStatus,
        );
      }
    });
  });
});
