/**
 * PROJECT-INSIGHTS-TESTS: Integration tests for Project Insights Service
 *
 * Tests:
 * - DEO score trends and component deltas
 * - Issue resolution tracking
 * - AI usage and quota summaries
 * - GEO insights computation
 * - Fix application tracking across pillars
 * - Access control (membership-aware)
 *
 * NOTE: These tests require a test database to be configured.
 */
import { ProjectInsightsService } from '../../../src/projects/project-insights.service';
import { DeoIssuesService } from '../../../src/projects/deo-issues.service';
import { DeoSignalsService } from '../../../src/projects/deo-score.service';
import { AiUsageLedgerService } from '../../../src/ai/ai-usage-ledger.service';
import { AiUsageQuotaService } from '../../../src/ai/ai-usage-quota.service';
import { AutomationService } from '../../../src/projects/automation.service';
import { SearchIntentService } from '../../../src/projects/search-intent.service';
import { CompetitorsService } from '../../../src/projects/competitors.service';
import { OffsiteSignalsService } from '../../../src/projects/offsite-signals.service';
import { LocalDiscoveryService } from '../../../src/projects/local-discovery.service';
import { MediaAccessibilityService } from '../../../src/projects/media-accessibility.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('ProjectInsightsService (integration)', () => {
  let projectInsightsService: ProjectInsightsService;
  let deoIssuesService: DeoIssuesService;
  let deoSignalsService: DeoSignalsService;
  let aiUsageLedgerService: AiUsageLedgerService;
  let aiUsageQuotaService: AiUsageQuotaService;
  let automationService: AutomationService;
  let searchIntentService: SearchIntentService;
  let competitorsService: CompetitorsService;
  let offsiteSignalsService: OffsiteSignalsService;
  let localDiscoveryService: LocalDiscoveryService;
  let mediaAccessibilityService: MediaAccessibilityService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string };
  let testProject: { id: string; name: string; domain: string };

  beforeAll(async () => {
    roleResolutionService = new RoleResolutionService(testPrisma as any);
    deoSignalsService = new DeoSignalsService(testPrisma as any);
    automationService = new AutomationService(
      testPrisma as any,
      null as any,
      null as any
    );
    searchIntentService = new SearchIntentService(
      testPrisma as any,
      roleResolutionService
    );
    competitorsService = new CompetitorsService(
      testPrisma as any,
      roleResolutionService
    );
    offsiteSignalsService = new OffsiteSignalsService(
      testPrisma as any,
      roleResolutionService
    );
    localDiscoveryService = new LocalDiscoveryService(
      testPrisma as any,
      roleResolutionService
    );
    mediaAccessibilityService = new MediaAccessibilityService(
      testPrisma as any,
      roleResolutionService
    );

    deoIssuesService = new DeoIssuesService(
      testPrisma as any,
      deoSignalsService,
      automationService,
      searchIntentService,
      competitorsService,
      offsiteSignalsService,
      localDiscoveryService,
      mediaAccessibilityService,
      roleResolutionService
    );

    // Create mock services for AI usage
    aiUsageLedgerService = {
      getProjectSummary: jest.fn().mockResolvedValue({
        totalRuns: 100,
        reusedRuns: 30,
        aiRunsAvoided: 30,
        applyAiRuns: 0,
      }),
    } as unknown as AiUsageLedgerService;

    aiUsageQuotaService = {
      evaluateQuotaForAction: jest.fn().mockResolvedValue({
        allowed: true,
        currentMonthAiRuns: 50,
        remainingAiRuns: 950,
        currentUsagePercent: 5,
        policy: { monthlyAiRunsLimit: 1000 },
      }),
    } as unknown as AiUsageQuotaService;

    projectInsightsService = new ProjectInsightsService(
      testPrisma as any,
      aiUsageLedgerService,
      aiUsageQuotaService,
      deoIssuesService,
      roleResolutionService
    );
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();

    testUser = await testPrisma.user.create({
      data: {
        email: `insights-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Insights Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'Insights Test Project',
        domain: 'insights-test.example.com',
        userId: testUser.id,
      },
    });
  });

  describe('Basic Insights Response', () => {
    it('should return valid insights structure for empty project', async () => {
      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.projectId).toBe(testProject.id);
      expect(insights.generatedAt).toBeDefined();
      expect(insights.window).toBeDefined();
      expect(insights.window.days).toBe(30);
      expect(insights.overview).toBeDefined();
      expect(insights.progress).toBeDefined();
      expect(insights.issueResolution).toBeDefined();
      expect(insights.opportunities).toBeDefined();
      expect(insights.geoInsights).toBeDefined();
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        projectInsightsService.getProjectInsights(
          'non-existent-id',
          testUser.id
        )
      ).rejects.toThrow('Project not found');
    });

    it('should throw for unauthorized user', async () => {
      const otherUser = await testPrisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Other User',
        },
      });

      await expect(
        projectInsightsService.getProjectInsights(testProject.id, otherUser.id)
      ).rejects.toThrow();
    });
  });

  describe('DEO Score Overview', () => {
    it('should return score trends from snapshots', async () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      // Create DEO score snapshots
      await testPrisma.deoScoreSnapshot.createMany({
        data: [
          {
            projectId: testProject.id,
            overallScore: 60,
            metadata: { v2: { components: { intentMatch: 50 } } },
            computedAt: fiveDaysAgo,
          },
          {
            projectId: testProject.id,
            overallScore: 75,
            metadata: { v2: { components: { intentMatch: 70 } } },
            computedAt: now,
          },
        ],
      });

      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.overview.improved.deoScore.current).toBe(75);
      expect(insights.overview.improved.deoScore.trend).toBe('up');
      expect(insights.progress.deoScoreTrend.length).toBeGreaterThan(0);
    });

    it('should compute component deltas', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      await testPrisma.deoScoreSnapshot.createMany({
        data: [
          {
            projectId: testProject.id,
            overallScore: 50,
            metadata: {
              v2: {
                components: {
                  intentMatch: 40,
                  aiVisibility: 50,
                  answerability: 60,
                  contentCompleteness: 45,
                  technicalQuality: 55,
                  entityStrength: 50,
                },
              },
            },
            computedAt: earlier,
          },
          {
            projectId: testProject.id,
            overallScore: 70,
            metadata: {
              v2: {
                components: {
                  intentMatch: 60,
                  aiVisibility: 70,
                  answerability: 80,
                  contentCompleteness: 65,
                  technicalQuality: 75,
                  entityStrength: 70,
                },
              },
            },
            computedAt: now,
          },
        ],
      });

      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.overview.improved.componentDeltas.length).toBe(6);

      const intentMatch = insights.overview.improved.componentDeltas.find(
        (c) => c.componentId === 'intentMatch'
      );
      expect(intentMatch?.current).toBe(60);
      expect(intentMatch?.previous).toBe(40);
      expect(intentMatch?.delta).toBe(20);
      expect(intentMatch?.trend).toBe('up');
    });
  });

  describe('AI Usage Tracking', () => {
    it('should include AI usage and quota info', async () => {
      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.overview.saved.aiRunsUsed).toBeDefined();
      expect(insights.overview.saved.reuseRatePercent).toBeDefined();
      expect(insights.overview.saved.quota).toBeDefined();
      expect(insights.overview.saved.quota.limit).toBeDefined();
      expect(insights.overview.saved.trust.invariantMessage).toContain(
        'Apply runs never use AI'
      );
    });
  });

  describe('Issue Resolution Tracking', () => {
    it('should track open issues by severity', async () => {
      // Create crawl results with issues
      await testPrisma.crawlResult.createMany({
        data: [
          {
            projectId: testProject.id,
            url: 'https://example.com/page1',
            statusCode: 404,
            title: null,
            metaDescription: null,
            h1: null,
            wordCount: 0,
            issues: ['HTTP_ERROR'],
            scannedAt: new Date(),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/page2',
            statusCode: 200,
            title: 'Title',
            metaDescription: null,
            h1: 'H1',
            wordCount: 100,
            issues: ['MISSING_META_DESCRIPTION'],
            scannedAt: new Date(),
          },
        ],
      });

      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.progress.openIssuesNow).toBeDefined();
      expect(typeof insights.progress.openIssuesNow.critical).toBe('number');
      expect(typeof insights.progress.openIssuesNow.warning).toBe('number');
      expect(typeof insights.progress.openIssuesNow.total).toBe('number');
    });

    it('should track issues by pillar', async () => {
      // Create crawl data that generates issues
      await testPrisma.crawlResult.create({
        data: {
          projectId: testProject.id,
          url: 'https://example.com/page',
          statusCode: 200,
          title: null,
          metaDescription: null,
          h1: null,
          wordCount: 50,
          issues: ['MISSING_TITLE', 'THIN_CONTENT'],
          scannedAt: new Date(),
        },
      });

      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.issueResolution.byPillar).toBeDefined();
      expect(Array.isArray(insights.issueResolution.byPillar)).toBe(true);
    });
  });

  describe('GEO Insights', () => {
    it('should compute GEO insights from products and answer blocks', async () => {
      // Create product with answer blocks
      const product = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Test Product',
          description: 'A comprehensive product description',
          lastSyncedAt: new Date(),
        },
      });

      await testPrisma.answerBlock.createMany({
        data: [
          {
            productId: product.id,
            questionId: 'what_is_it',
            questionText: 'What is it?',
            answerText: 'This is a test product for testing purposes.',
            sourceFieldsUsed: ['title', 'description'],
          },
          {
            productId: product.id,
            questionId: 'who_is_it_for',
            questionText: 'Who is it for?',
            answerText: 'This product is designed for developers.',
            sourceFieldsUsed: ['description'],
          },
        ],
      });

      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.geoInsights.overview.productsTotal).toBe(1);
      expect(insights.geoInsights.overview.answersTotal).toBe(2);
      expect(insights.geoInsights.coverage.byIntent).toBeDefined();
      expect(insights.geoInsights.reuse).toBeDefined();
      expect(insights.geoInsights.trustSignals).toBeDefined();
    });

    it('should identify coverage gaps by intent', async () => {
      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.geoInsights.coverage.gaps).toBeDefined();
      expect(Array.isArray(insights.geoInsights.coverage.gaps)).toBe(true);
    });

    it('should compute confidence distribution', async () => {
      const product = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Confidence Test Product',
          description: 'Product for testing confidence distribution',
          lastSyncedAt: new Date(),
        },
      });

      await testPrisma.answerBlock.create({
        data: {
          productId: product.id,
          questionId: 'what_is_it',
          questionText: 'What is it?',
          answerText: 'A detailed answer with multiple facts used.',
          sourceFieldsUsed: ['title', 'description', 'seoTitle'],
        },
      });

      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      const dist = insights.geoInsights.overview.confidenceDistribution;
      expect(typeof dist.high).toBe('number');
      expect(typeof dist.medium).toBe('number');
      expect(typeof dist.low).toBe('number');
    });
  });

  describe('Access Control', () => {
    it('should allow project member to view insights', async () => {
      const memberUser = await testPrisma.user.create({
        data: {
          email: `member-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Member User',
        },
      });

      await testPrisma.projectMember.create({
        data: {
          projectId: testProject.id,
          userId: memberUser.id,
          role: 'VIEWER',
        },
      });

      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        memberUser.id
      );

      expect(insights.projectId).toBe(testProject.id);
    });
  });

  describe('Opportunities', () => {
    it('should generate opportunities from open issues', async () => {
      // Create data that will generate issues
      await testPrisma.crawlResult.create({
        data: {
          projectId: testProject.id,
          url: 'https://example.com/issues-page',
          statusCode: 200,
          title: null,
          metaDescription: null,
          h1: null,
          wordCount: 50,
          issues: ['MISSING_TITLE', 'MISSING_META_DESCRIPTION', 'THIN_CONTENT'],
          scannedAt: new Date(),
        },
      });

      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.opportunities).toBeDefined();
      expect(Array.isArray(insights.opportunities)).toBe(true);

      for (const opp of insights.opportunities) {
        expect(opp.id).toBeDefined();
        expect(opp.title).toBeDefined();
        expect(opp.why).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(opp.estimatedImpact);
        expect(['automation', 'manual']).toContain(opp.fixType);
      }
    });

    it('should generate GEO opportunities', async () => {
      const product = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'GEO Opportunity Product',
          description: 'Short',
          lastSyncedAt: new Date(),
        },
      });

      await testPrisma.answerBlock.create({
        data: {
          productId: product.id,
          questionId: 'what_is_it',
          questionText: 'What is it?',
          answerText: 'Brief answer.',
          sourceFieldsUsed: ['title'],
        },
      });

      const insights = await projectInsightsService.getProjectInsights(
        testProject.id,
        testUser.id
      );

      expect(insights.geoInsights.opportunities).toBeDefined();
      expect(Array.isArray(insights.geoInsights.opportunities)).toBe(true);

      for (const opp of insights.geoInsights.opportunities) {
        expect(opp.id).toBeDefined();
        expect(opp.title).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(opp.estimatedImpact);
        expect(['coverage', 'reuse', 'trust']).toContain(opp.category);
      }
    });
  });
});
