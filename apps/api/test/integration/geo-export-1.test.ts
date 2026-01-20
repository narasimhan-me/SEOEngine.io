import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { seedConnectedStoreProject } from '../../src/testkit';

describe('GEO-EXPORT-1 – GEO Report Export and Share Links', () => {
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

  describe('GET /projects/:id/geo-reports/assemble', () => {
    it('returns export-safe GEO report data', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });

      const product = await testPrisma.product.create({
        data: {
          projectId: project.id,
          externalId: 'geo-export-product-1',
          title: 'Export Test Product',
          description: 'Test product for export',
        },
      });

      await testPrisma.answerBlock.create({
        data: {
          productId: product.id,
          questionId: 'what_is_it',
          questionText: 'What is it?',
          answerText: 'A test product for GEO export validation.',
          confidenceScore: 0.8,
          sourceType: 'generated',
          sourceFieldsUsed: [],
          version: 'ae_v1',
        },
      });

      const res = await request(server)
        .get(`/projects/${project.id}/geo-reports/assemble`)
        .set(authHeader(user.id))
        .expect(200);

      // Verify export-safe shape
      expect(res.body).toHaveProperty('projectId', project.id);
      expect(res.body).toHaveProperty('projectName');
      expect(res.body).toHaveProperty('generatedAt');
      expect(res.body).toHaveProperty('overview');
      expect(res.body).toHaveProperty('coverage');
      expect(res.body).toHaveProperty('trustSignals');
      expect(res.body).toHaveProperty('opportunities');
      expect(res.body).toHaveProperty('disclaimer');

      // Verify no internal IDs or hrefs in opportunities
      for (const opp of res.body.opportunities) {
        expect(opp).not.toHaveProperty('href');
        expect(opp).not.toHaveProperty('id');
      }

      // Verify disclaimer text
      expect(res.body.disclaimer).toContain(
        'internal content readiness signals'
      );
    });

    it('returns 403 for unauthorized user', async () => {
      const { project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });
      const otherUser = await testPrisma.user.create({
        data: { email: 'other@test.com', password: 'hashed' },
      });

      await request(server)
        .get(`/projects/${project.id}/geo-reports/assemble`)
        .set(authHeader(otherUser.id))
        .expect(403);
    });
  });

  describe('Share Link Management', () => {
    it('POST /projects/:id/geo-reports/share-links creates a share link', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });

      const res = await request(server)
        .post(`/projects/${project.id}/geo-reports/share-links`)
        .set(authHeader(user.id))
        .send({ title: 'Test Share' })
        .expect(201);

      expect(res.body.shareLink).toHaveProperty('id');
      expect(res.body.shareLink).toHaveProperty('shareToken');
      expect(res.body.shareLink).toHaveProperty('shareUrl');
      expect(res.body.shareLink).toHaveProperty('status', 'ACTIVE');
      expect(res.body.shareLink).toHaveProperty('expiresAt');

      // Verify expiry is ~14 days from now
      const expiresAt = new Date(res.body.shareLink.expiresAt);
      const now = new Date();
      const daysDiff =
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(13);
      expect(daysDiff).toBeLessThan(15);
    });

    it('GET /projects/:id/geo-reports/share-links lists share links', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });

      // Create a share link
      await testPrisma.geoReportShareLink.create({
        data: {
          projectId: project.id,
          shareToken: 'test-token-123',
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          createdByUserId: user.id,
        },
      });

      const res = await request(server)
        .get(`/projects/${project.id}/geo-reports/share-links`)
        .set(authHeader(user.id))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toHaveProperty('shareToken', 'test-token-123');
    });

    it('DELETE /projects/:id/geo-reports/share-links/:linkId revokes a share link', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });

      const link = await testPrisma.geoReportShareLink.create({
        data: {
          projectId: project.id,
          shareToken: 'revoke-test-token',
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          createdByUserId: user.id,
        },
      });

      await request(server)
        .delete(`/projects/${project.id}/geo-reports/share-links/${link.id}`)
        .set(authHeader(user.id))
        .expect(200);

      // Verify link is revoked
      const updatedLink = await testPrisma.geoReportShareLink.findUnique({
        where: { id: link.id },
      });
      expect(updatedLink?.status).toBe('REVOKED');
    });
  });

  describe('Public Share View', () => {
    it('GET /public/geo-reports/:shareToken returns valid report for active link', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });

      await testPrisma.product.create({
        data: {
          projectId: project.id,
          externalId: 'public-view-product',
          title: 'Public View Test Product',
        },
      });

      const link = await testPrisma.geoReportShareLink.create({
        data: {
          projectId: project.id,
          shareToken: 'public-view-token',
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          createdByUserId: user.id,
        },
      });

      // No auth required for public endpoint
      const res = await request(server)
        .get(`/public/geo-reports/${link.shareToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('status', 'valid');
      expect(res.body).toHaveProperty('report');
      expect(res.body).toHaveProperty('expiresAt');
      expect(res.body).toHaveProperty('generatedAt');
      expect(res.body.report).toHaveProperty('projectName');
      expect(res.body.report).toHaveProperty('disclaimer');
    });

    it('GET /public/geo-reports/:shareToken returns revoked status for revoked link', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });

      const link = await testPrisma.geoReportShareLink.create({
        data: {
          projectId: project.id,
          shareToken: 'revoked-token',
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'REVOKED',
          revokedAt: new Date(),
          createdByUserId: user.id,
        },
      });

      const res = await request(server)
        .get(`/public/geo-reports/${link.shareToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('status', 'revoked');
      expect(res.body).not.toHaveProperty('report');
    });

    it('GET /public/geo-reports/:shareToken returns expired status for expired link', async () => {
      const { user, project } = await seedConnectedStoreProject(testPrisma, {
        plan: 'pro',
      });

      const link = await testPrisma.geoReportShareLink.create({
        data: {
          projectId: project.id,
          shareToken: 'expired-token',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
          createdByUserId: user.id,
        },
      });

      const res = await request(server)
        .get(`/public/geo-reports/${link.shareToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('status', 'expired');
      expect(res.body).not.toHaveProperty('report');
    });

    it('GET /public/geo-reports/:shareToken returns not_found for invalid token', async () => {
      const res = await request(server)
        .get('/public/geo-reports/invalid-token-xyz')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'not_found');
    });
  });
});
