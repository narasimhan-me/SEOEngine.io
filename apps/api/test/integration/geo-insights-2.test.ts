import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { seedConnectedStoreProject } from '../../src/testkit';

describe('GEO-INSIGHTS-2 – Insights contract + GEO read-only insights', () => {
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

  it('GET /projects/:id/insights returns INSIGHTS-1 shape plus geoInsights, and is read-only', async () => {
    const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

    const product = await testPrisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'geo-insights-2-product-1',
        title: 'Geo Insights Product 1',
        description: 'Test product',
        seoTitle: 'Test SEO Title',
        seoDescription: 'Test SEO Description',
      },
    });

    // Create DEO snapshots with v2 metadata components expected by insights
    const now = new Date();
    const older = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    await testPrisma.deoScoreSnapshot.create({
      data: {
        projectId: project.id,
        overallScore: 60,
        contentScore: 60,
        entityScore: 55,
        technicalScore: 70,
        visibilityScore: 50,
        version: 'v2',
        computedAt: older,
        metadata: { v2: { components: { entityStrength: 55, intentMatch: 58, answerability: 52, aiVisibility: 49, contentCompleteness: 60, technicalQuality: 70 } } },
      },
    });
    await testPrisma.deoScoreSnapshot.create({
      data: {
        projectId: project.id,
        overallScore: 72,
        contentScore: 72,
        entityScore: 68,
        technicalScore: 78,
        visibilityScore: 62,
        version: 'v2',
        computedAt: now,
        metadata: { v2: { components: { entityStrength: 68, intentMatch: 70, answerability: 65, aiVisibility: 60, contentCompleteness: 72, technicalQuality: 78 } } },
      },
    });

    // Create Answer Blocks (canonical question IDs for GEO)
    await testPrisma.answerBlock.create({
      data: {
        productId: product.id,
        questionId: 'why_choose_this',
        questionText: 'Why choose this?',
        answerText:
          'Choose this when you need a clear, comparable option for a specific use case.\n\n' +
          '- Works well for common scenarios\n' +
          '- Uses plain language and concrete details (e.g., 2-step setup)\n',
        confidenceScore: 0.8,
        sourceType: 'generated',
        sourceFieldsUsed: ['e.g.'],
        version: 'ae_v1',
      },
    });

    // Get insights
    const res = await request(server)
      .get(`/projects/${project.id}/insights`)
      .set(authHeader(user.id))
      .expect(200);

    const body = res.body;

    // INSIGHTS-1 shape checks
    expect(body.projectId).toBe(project.id);
    expect(body.generatedAt).toBeDefined();
    expect(body.window).toMatchObject({ days: 30 });
    expect(body.overview.improved.deoScore).toMatchObject({
      current: expect.any(Number),
      previous: expect.any(Number),
      delta: expect.any(Number),
      trend: expect.stringMatching(/^(up|down|flat)$/),
    });
    expect(body.overview.improved.componentDeltas).toBeInstanceOf(Array);
    expect(body.overview.improved.componentDeltas[0]).toMatchObject({
      componentId: expect.any(String),
      label: expect.any(String),
      current: expect.any(Number),
      previous: expect.any(Number),
      delta: expect.any(Number),
      trend: expect.stringMatching(/^(up|down|flat)$/),
    });
    expect(body.overview.saved.quota).toMatchObject({
      limit: expect.any(Number),
      used: expect.any(Number),
    });
    expect(body.overview.saved.trust).toMatchObject({
      applyAiRuns: expect.any(Number),
      invariantMessage: expect.any(String),
    });
    expect(body.progress.deoScoreTrend).toBeInstanceOf(Array);
    expect(body.progress.fixesAppliedTrend).toBeInstanceOf(Array);
    expect(body.progress.openIssuesNow).toMatchObject({
      critical: expect.any(Number),
      warning: expect.any(Number),
      info: expect.any(Number),
      total: expect.any(Number),
    });
    expect(body.issueResolution.byPillar).toBeInstanceOf(Array);
    expect(body.opportunities).toBeInstanceOf(Array);

    // GEO-INSIGHTS-2 geoInsights shape checks
    expect(body.geoInsights).toBeDefined();
    expect(body.geoInsights.overview).toMatchObject({
      productsAnswerReadyPercent: expect.any(Number),
      productsAnswerReadyCount: expect.any(Number),
      productsTotal: expect.any(Number),
      answersTotal: expect.any(Number),
      answersMultiIntentCount: expect.any(Number),
      reuseRatePercent: expect.any(Number),
      confidenceDistribution: {
        high: expect.any(Number),
        medium: expect.any(Number),
        low: expect.any(Number),
      },
      whyThisMatters: expect.any(String),
    });
    expect(body.geoInsights.coverage).toMatchObject({
      byIntent: expect.any(Array),
      gaps: expect.any(Array),
      whyThisMatters: expect.any(String),
    });
    expect(body.geoInsights.reuse).toMatchObject({
      topReusedAnswers: expect.any(Array),
      couldBeReusedButArent: expect.any(Array),
      whyThisMatters: expect.any(String),
    });
    expect(body.geoInsights.trustSignals).toMatchObject({
      topBlockers: expect.any(Array),
      avgTimeToImproveHours: expect.anything(),
      mostImproved: expect.any(Array),
      whyThisMatters: expect.any(String),
    });
    expect(body.geoInsights.opportunities).toBeInstanceOf(Array);
  });

  it('geoInsights.coverage.byIntent includes all 5 SearchIntentTypes', async () => {
    const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

    await testPrisma.deoScoreSnapshot.create({
      data: {
        projectId: project.id,
        overallScore: 50,
        contentScore: 50,
        entityScore: 50,
        technicalScore: 50,
        visibilityScore: 50,
        version: 'v2',
        computedAt: new Date(),
        metadata: { v2: { components: {} } },
      },
    });

    const res = await request(server)
      .get(`/projects/${project.id}/insights`)
      .set(authHeader(user.id))
      .expect(200);

    const intentTypes = res.body.geoInsights.coverage.byIntent.map((r: any) => r.intentType);
    expect(intentTypes).toContain('transactional');
    expect(intentTypes).toContain('comparative');
    expect(intentTypes).toContain('problem_use_case');
    expect(intentTypes).toContain('trust_validation');
    expect(intentTypes).toContain('informational');
    expect(intentTypes.length).toBe(5);
  });

  it('geoInsights trust trajectory reflects ProductGeoFixApplication improvements', async () => {
    const { user, project } = await seedConnectedStoreProject(testPrisma, { plan: 'pro' });

    const product = await testPrisma.product.create({
      data: {
        projectId: project.id,
        externalId: 'geo-insights-2-product-trajectory',
        title: 'Trajectory Test Product',
        description: 'Test product',
      },
    });

    await testPrisma.deoScoreSnapshot.create({
      data: {
        projectId: project.id,
        overallScore: 50,
        contentScore: 50,
        entityScore: 50,
        technicalScore: 50,
        visibilityScore: 50,
        version: 'v2',
        computedAt: new Date(),
        metadata: { v2: { components: {} } },
      },
    });

    // Create a draft
    const draft = await testPrisma.productGeoFixDraft.create({
      data: {
        productId: product.id,
        questionId: 'why_choose_this',
        issueType: 'POOR_ANSWER_STRUCTURE',
        draftPayload: { improvedAnswer: 'Better answer text' },
        aiWorkKey: `test:geo:${project.id}:${product.id}`,
        generatedWithAi: false,
      },
    });

    // Create application showing LOW -> HIGH improvement
    await testPrisma.productGeoFixApplication.create({
      data: {
        productId: product.id,
        draftId: draft.id,
        appliedByUserId: user.id,
        questionId: 'why_choose_this',
        issueType: 'POOR_ANSWER_STRUCTURE',
        beforeConfidence: 'LOW',
        afterConfidence: 'HIGH',
        beforeIssuesCount: 2,
        afterIssuesCount: 0,
        issuesResolvedCount: 2,
        resolvedIssueTypes: ['poor_answer_structure:why_choose_this'],
        appliedAt: new Date(),
      },
    });

    const res = await request(server)
      .get(`/projects/${project.id}/insights`)
      .set(authHeader(user.id))
      .expect(200);

    expect(res.body.geoInsights.overview.trustTrajectory.improvedProducts).toBe(1);
    expect(res.body.geoInsights.overview.trustTrajectory.improvedEvents).toBe(1);
  });
});
