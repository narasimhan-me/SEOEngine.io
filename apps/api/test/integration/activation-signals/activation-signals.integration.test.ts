/**
 * ACTIVATION-SIGNALS-TESTS: Integration tests for Activation Signals Service
 *
 * Tests:
 * - User activation status computation
 * - Milestone tracking
 * - Project success metrics
 * - Activation funnel computation
 * - Stalled user detection
 *
 * NOTE: These tests require a test database to be configured.
 */
import { ActivationSignalsService } from '../../../src/activation/activation-signals.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('ActivationSignalsService (integration)', () => {
  let activationSignalsService: ActivationSignalsService;
  let testUser: { id: string; email: string; createdAt: Date };

  beforeAll(async () => {
    activationSignalsService = new ActivationSignalsService(testPrisma as any);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();

    testUser = await testPrisma.user.create({
      data: {
        email: `activation-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Activation Test User',
      },
    });
  });

  describe('User Activation Status', () => {
    it('should return null for non-existent user', async () => {
      const status = await activationSignalsService.getUserActivationStatus(
        'non-existent-id'
      );
      expect(status).toBeNull();
    });

    it('should return status for new user with no milestones', async () => {
      const status = await activationSignalsService.getUserActivationStatus(
        testUser.id
      );

      expect(status).not.toBeNull();
      expect(status?.userId).toBe(testUser.id);
      expect(status?.isActivated).toBe(false);
      expect(status?.activationTier).toBe('new');
      expect(status?.milestones).toHaveLength(8);
      expect(status?.completedMilestoneCount).toBe(0);
    });

    it('should track project_created milestone', async () => {
      await testPrisma.project.create({
        data: {
          name: 'Test Project',
          domain: 'test.example.com',
          userId: testUser.id,
        },
      });

      const status = await activationSignalsService.getUserActivationStatus(
        testUser.id
      );

      expect(status?.activationTier).toBe('exploring');
      const projectMilestone = status?.milestones.find(
        (m) => m.milestoneId === 'project_created'
      );
      expect(projectMilestone?.status).toBe('completed');
    });

    it('should track store_connected milestone', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Test Project',
          domain: 'test.example.com',
          userId: testUser.id,
        },
      });

      await testPrisma.integration.create({
        data: {
          projectId: project.id,
          type: 'SHOPIFY',
          accessToken: 'test-token',
        },
      });

      const status = await activationSignalsService.getUserActivationStatus(
        testUser.id
      );

      expect(status?.activationTier).toBe('connected');
      const storeMilestone = status?.milestones.find(
        (m) => m.milestoneId === 'store_connected'
      );
      expect(storeMilestone?.status).toBe('completed');
    });

    it('should track first_crawl_completed milestone', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Test Project',
          domain: 'test.example.com',
          userId: testUser.id,
        },
      });

      await testPrisma.crawlResult.create({
        data: {
          projectId: project.id,
          url: 'https://test.example.com',
          statusCode: 200,
          title: 'Test',
          metaDescription: 'Test',
          h1: 'Test',
          wordCount: 500,
          issues: [],
          scannedAt: new Date(),
        },
      });

      const status = await activationSignalsService.getUserActivationStatus(
        testUser.id
      );

      const crawlMilestone = status?.milestones.find(
        (m) => m.milestoneId === 'first_crawl_completed'
      );
      expect(crawlMilestone?.status).toBe('completed');
    });

    it('should track first_deo_score_computed milestone', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Test Project',
          domain: 'test.example.com',
          userId: testUser.id,
        },
      });

      await testPrisma.deoScoreSnapshot.create({
        data: {
          projectId: project.id,
          overallScore: 75,
          computedAt: new Date(),
        },
      });

      const status = await activationSignalsService.getUserActivationStatus(
        testUser.id
      );

      const scoreMilestone = status?.milestones.find(
        (m) => m.milestoneId === 'first_deo_score_computed'
      );
      expect(scoreMilestone?.status).toBe('completed');
    });

    it('should compute days to complete milestones', async () => {
      // Create user from 5 days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const oldUser = await testPrisma.user.create({
        data: {
          email: `old-user-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Old User',
          createdAt: fiveDaysAgo,
        },
      });

      // Create project today
      await testPrisma.project.create({
        data: {
          name: 'Project',
          domain: 'project.example.com',
          userId: oldUser.id,
          createdAt: new Date(),
        },
      });

      const status = await activationSignalsService.getUserActivationStatus(
        oldUser.id
      );

      expect(status?.daysSinceSignup).toBe(5);

      const projectMilestone = status?.milestones.find(
        (m) => m.milestoneId === 'project_created'
      );
      expect(projectMilestone?.daysToComplete).toBe(5);
    });
  });

  describe('Project Success Metrics', () => {
    it('should return null for non-existent project', async () => {
      const metrics = await activationSignalsService.getProjectSuccessMetrics(
        'non-existent-id'
      );
      expect(metrics).toBeNull();
    });

    it('should return metrics for project with no activity', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Empty Project',
          domain: 'empty.example.com',
          userId: testUser.id,
        },
      });

      const metrics = await activationSignalsService.getProjectSuccessMetrics(
        project.id
      );

      expect(metrics).not.toBeNull();
      expect(metrics?.projectId).toBe(project.id);
      expect(metrics?.healthStatus).toBe('at_risk');
      expect(metrics?.indicators).toHaveLength(4);
    });

    it('should compute products optimized count', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Products Project',
          domain: 'products.example.com',
          userId: testUser.id,
        },
      });

      // Create products with SEO
      await testPrisma.product.createMany({
        data: [
          {
            projectId: project.id,
            title: 'Product 1',
            seoTitle: 'SEO Title 1',
          },
          {
            projectId: project.id,
            title: 'Product 2',
            seoDescription: 'SEO Desc 2',
          },
          {
            projectId: project.id,
            title: 'Product 3', // No SEO
          },
        ],
      });

      const metrics = await activationSignalsService.getProjectSuccessMetrics(
        project.id
      );

      const productsIndicator = metrics?.indicators.find(
        (i) => i.indicatorId === 'products_optimized'
      );
      expect(productsIndicator?.value).toBe(2);
    });

    it('should determine health status based on activity', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Healthy Project',
          domain: 'healthy.example.com',
          userId: testUser.id,
        },
      });

      // Create some products with SEO (but no applied drafts)
      await testPrisma.product.create({
        data: {
          projectId: project.id,
          title: 'Product',
          seoTitle: 'SEO Title',
        },
      });

      const metrics = await activationSignalsService.getProjectSuccessMetrics(
        project.id
      );

      // Products optimized > 0 but no applied drafts = stalled
      expect(metrics?.healthStatus).toBe('stalled');
    });
  });

  describe('Activation Funnel', () => {
    it('should return empty funnel for period with no users', async () => {
      const farFuture = new Date('2030-01-01');
      const funnel = await activationSignalsService.getActivationFunnel(
        farFuture,
        farFuture
      );

      expect(funnel.totalUsers).toBe(0);
      expect(funnel.stages).toHaveLength(0);
      expect(funnel.biggestDropoff).toBeNull();
    });

    it('should compute funnel stages', async () => {
      // Create multiple users with different milestone completions
      const user1 = await testPrisma.user.create({
        data: {
          email: 'funnel1@example.com',
          password: 'pass',
          name: 'Funnel User 1',
        },
      });

      const user2 = await testPrisma.user.create({
        data: {
          email: 'funnel2@example.com',
          password: 'pass',
          name: 'Funnel User 2',
        },
      });

      // User 1: project only
      await testPrisma.project.create({
        data: {
          name: 'Project 1',
          domain: 'p1.example.com',
          userId: user1.id,
        },
      });

      // User 2: project + integration
      const project2 = await testPrisma.project.create({
        data: {
          name: 'Project 2',
          domain: 'p2.example.com',
          userId: user2.id,
        },
      });

      await testPrisma.integration.create({
        data: {
          projectId: project2.id,
          type: 'SHOPIFY',
          accessToken: 'token',
        },
      });

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const funnel = await activationSignalsService.getActivationFunnel(
        ninetyDaysAgo
      );

      expect(funnel.totalUsers).toBeGreaterThanOrEqual(2);
      expect(funnel.stages.length).toBe(8);

      // Both users have project_created
      const projectStage = funnel.stages.find(
        (s) => s.milestoneId === 'project_created'
      );
      expect(projectStage?.userCount).toBeGreaterThanOrEqual(2);
    });

    it('should identify biggest dropoff', async () => {
      // Create users with varying completion
      for (let i = 0; i < 5; i++) {
        const user = await testPrisma.user.create({
          data: {
            email: `dropoff${i}@example.com`,
            password: 'pass',
            name: `Dropoff User ${i}`,
          },
        });

        // All get projects
        await testPrisma.project.create({
          data: {
            name: `Project ${i}`,
            domain: `p${i}.example.com`,
            userId: user.id,
          },
        });
      }

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const funnel = await activationSignalsService.getActivationFunnel(
        ninetyDaysAgo
      );

      // Biggest dropoff should be after project_created (since none have stores)
      expect(funnel.biggestDropoff).toBeDefined();
    });
  });

  describe('Activation Overview', () => {
    it('should compute overview metrics', async () => {
      const overview = await activationSignalsService.getActivationOverview();

      expect(overview.totalUsers).toBeGreaterThanOrEqual(1); // At least testUser
      expect(typeof overview.activatedUsers).toBe('number');
      expect(typeof overview.activationRate).toBe('number');
      expect(overview.tierDistribution).toBeDefined();
      expect(overview.tierDistribution.new).toBeGreaterThanOrEqual(0);
    });
  });
});
