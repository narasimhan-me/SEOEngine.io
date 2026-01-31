/**
 * DEO-SCORE-TESTS: Integration tests for DEO Score computation
 *
 * Tests:
 * - Signal collection from crawl results and products
 * - DEO score computation (v1 and v2)
 * - Snapshot persistence and retrieval
 * - Project-level score aggregation
 * - Access control (membership-aware)
 *
 * NOTE: These tests require a test database to be configured.
 * They exercise the service layer directly without mocking Prisma.
 */
import {
  DeoScoreService,
  DeoSignalsService,
} from '../../../src/projects/deo-score.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('DeoScoreService (integration)', () => {
  let scoreService: DeoScoreService;
  let signalsService: DeoSignalsService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string };
  let testProject: { id: string; name: string; domain: string };

  beforeAll(async () => {
    roleResolutionService = new RoleResolutionService(testPrisma as any);
    scoreService = new DeoScoreService(
      testPrisma as any,
      roleResolutionService
    );
    signalsService = new DeoSignalsService(testPrisma as any);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();

    // Create test user and project
    testUser = await testPrisma.user.create({
      data: {
        email: `deo-score-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'DEO Score Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'DEO Score Test Project',
        domain: 'deo-score-test.example.com',
        userId: testUser.id,
      },
    });
  });

  describe('DeoSignalsService - Signal Collection', () => {
    it('should return default signals for project with no data', async () => {
      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      expect(signals).toBeDefined();
      expect(signals.contentCoverage).toBe(0);
      expect(signals.contentDepth).toBe(0);
      expect(signals.crawlHealth).toBe(0);
      expect(signals.serpPresence).toBe(0);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        signalsService.collectSignalsForProject('non-existent-id')
      ).rejects.toThrow('Project not found');
    });

    it('should compute content signals from products', async () => {
      // Create products with varying content
      await testPrisma.product.createMany({
        data: [
          {
            projectId: testProject.id,
            title: 'Product One',
            description: 'This is a good description with enough words to be considered covered and meaningful content for search engines.',
            seoTitle: 'Product One - SEO Title',
            seoDescription: 'SEO description for product one',
            lastSyncedAt: new Date(),
          },
          {
            projectId: testProject.id,
            title: 'Product Two',
            description: 'Another description with sufficient content to be considered a well-covered product page.',
            lastSyncedAt: new Date(),
          },
          {
            projectId: testProject.id,
            title: 'Product Three',
            description: 'Short',
            lastSyncedAt: new Date(),
          },
        ],
      });

      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      expect(signals.contentCoverage).toBeGreaterThan(0);
      expect(signals.entityCoverage).toBeGreaterThan(0);
    });

    it('should compute technical signals from crawl results', async () => {
      // Create crawl results with varying quality
      await testPrisma.crawlResult.createMany({
        data: [
          {
            projectId: testProject.id,
            url: 'https://example.com/',
            statusCode: 200,
            title: 'Home Page',
            metaDescription: 'Welcome to our store',
            h1: 'Welcome',
            wordCount: 500,
            issues: [],
            scannedAt: new Date(),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/about',
            statusCode: 200,
            title: 'About Us',
            metaDescription: 'Learn about our company',
            h1: 'About Us',
            wordCount: 300,
            issues: [],
            scannedAt: new Date(),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/broken',
            statusCode: 404,
            title: null,
            metaDescription: null,
            h1: null,
            wordCount: 0,
            issues: ['HTTP_ERROR'],
            scannedAt: new Date(),
          },
        ],
      });

      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      // 2 out of 3 pages are healthy
      expect(signals.crawlHealth).toBeCloseTo(0.67, 1);
      expect(signals.serpPresence).toBeGreaterThan(0);
      expect(signals.htmlStructuralQuality).toBeGreaterThan(0);
    });

    it('should detect thin content', async () => {
      await testPrisma.crawlResult.createMany({
        data: [
          {
            projectId: testProject.id,
            url: 'https://example.com/thin1',
            statusCode: 200,
            title: 'Thin Page 1',
            metaDescription: 'Short',
            h1: 'Title',
            wordCount: 50, // Very thin
            issues: ['THIN_CONTENT'],
            scannedAt: new Date(),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/good',
            statusCode: 200,
            title: 'Good Page',
            metaDescription: 'Good description',
            h1: 'Good Title',
            wordCount: 800,
            issues: [],
            scannedAt: new Date(),
          },
        ],
      });

      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      // 1 out of 2 pages is thin
      expect(signals.thinContentQuality).toBe(0.5);
    });

    it('should compute visibility signals', async () => {
      // Create navigational pages
      await testPrisma.crawlResult.createMany({
        data: [
          {
            projectId: testProject.id,
            url: 'https://example.com/',
            statusCode: 200,
            title: 'Home',
            metaDescription: 'Home page',
            h1: 'Welcome',
            wordCount: 500,
            issues: [],
            scannedAt: new Date(),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/about',
            statusCode: 200,
            title: 'About',
            metaDescription: 'About us',
            h1: 'About',
            wordCount: 400,
            issues: [],
            scannedAt: new Date(),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/contact',
            statusCode: 200,
            title: 'Contact',
            metaDescription: 'Contact us',
            h1: 'Contact',
            wordCount: 300,
            issues: [],
            scannedAt: new Date(),
          },
        ],
      });

      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      expect(signals.serpPresence).toBe(1); // All have title + meta + h1
      expect(signals.brandNavigationalStrength).toBe(1); // 3+ nav pages
      expect(signals.answerSurfacePresence).toBeGreaterThan(0);
    });

    it('should compute content freshness', async () => {
      const recentDate = new Date();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 120); // 120 days ago

      await testPrisma.crawlResult.createMany({
        data: [
          {
            projectId: testProject.id,
            url: 'https://example.com/fresh',
            statusCode: 200,
            title: 'Fresh Page',
            metaDescription: 'Recently updated',
            h1: 'Fresh',
            wordCount: 300,
            issues: [],
            scannedAt: recentDate,
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/old',
            statusCode: 200,
            title: 'Old Page',
            metaDescription: 'Not updated recently',
            h1: 'Old',
            wordCount: 300,
            issues: [],
            scannedAt: oldDate,
          },
        ],
      });

      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      // Freshness should be between 0 and 1
      expect(signals.contentFreshness).toBeGreaterThan(0);
      expect(signals.contentFreshness).toBeLessThan(1);
    });
  });

  describe('DeoScoreService - Score Computation', () => {
    it('should return null score for project with no snapshots', async () => {
      const result = await scoreService.getLatestForProject(
        testProject.id,
        testUser.id
      );

      expect(result.projectId).toBe(testProject.id);
      expect(result.latestScore).toBeNull();
      expect(result.latestSnapshot).toBeNull();
    });

    it('should compute and persist score from signals', async () => {
      // Create some data first
      await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Test Product',
          description: 'A good description with enough words to be meaningful content',
          lastSyncedAt: new Date(),
        },
      });

      await testPrisma.crawlResult.create({
        data: {
          projectId: testProject.id,
          url: 'https://example.com/',
          statusCode: 200,
          title: 'Home Page',
          metaDescription: 'Description',
          h1: 'Welcome',
          wordCount: 500,
          issues: [],
          scannedAt: new Date(),
        },
      });

      // Collect signals
      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      // Compute and persist
      const snapshot = await scoreService.computeAndPersistScoreFromSignals(
        testProject.id,
        signals
      );

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBeDefined();
      expect(snapshot.projectId).toBe(testProject.id);
      expect(snapshot.breakdown).toBeDefined();
      expect(snapshot.breakdown.overall).toBeGreaterThanOrEqual(0);
      expect(snapshot.breakdown.overall).toBeLessThanOrEqual(100);
      expect(snapshot.metadata).toBeDefined();
    });

    it('should store v1 and v2 breakdown in metadata', async () => {
      await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Test Product',
          description: 'Description with good content for testing the score computation',
          lastSyncedAt: new Date(),
        },
      });

      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      const snapshot = await scoreService.computeAndPersistScoreFromSignals(
        testProject.id,
        signals
      );

      expect(snapshot.metadata).toBeDefined();
      expect((snapshot.metadata as any).v1).toBeDefined();
      expect((snapshot.metadata as any).v2).toBeDefined();
      expect((snapshot.metadata as any).v2.topOpportunities).toBeDefined();
      expect((snapshot.metadata as any).v2.topStrengths).toBeDefined();
    });

    it('should update project currentDeoScore', async () => {
      await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Test Product',
          description: 'Good description for score test',
          lastSyncedAt: new Date(),
        },
      });

      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      await scoreService.computeAndPersistScoreFromSignals(
        testProject.id,
        signals
      );

      // Verify project was updated
      const updatedProject = await testPrisma.project.findUnique({
        where: { id: testProject.id },
      });

      expect(updatedProject?.currentDeoScore).toBeDefined();
      expect(updatedProject?.currentDeoScoreComputedAt).toBeDefined();
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        scoreService.getLatestForProject('non-existent-id', testUser.id)
      ).rejects.toThrow('Project not found');
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      const otherUser = await testPrisma.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Other User',
        },
      });

      await expect(
        scoreService.getLatestForProject(testProject.id, otherUser.id)
      ).rejects.toThrow();
    });
  });

  describe('DeoScoreService - Snapshot Retrieval', () => {
    it('should return latest snapshot', async () => {
      // Create older snapshot
      await testPrisma.deoScoreSnapshot.create({
        data: {
          projectId: testProject.id,
          overallScore: 50,
          contentScore: 40,
          entityScore: 50,
          technicalScore: 60,
          visibilityScore: 50,
          version: '1.0',
          metadata: {},
          computedAt: new Date(Date.now() - 86400000), // 1 day ago
        },
      });

      // Create newer snapshot
      await testPrisma.deoScoreSnapshot.create({
        data: {
          projectId: testProject.id,
          overallScore: 75,
          contentScore: 70,
          entityScore: 80,
          technicalScore: 75,
          visibilityScore: 75,
          version: '1.0',
          metadata: {},
          computedAt: new Date(),
        },
      });

      const result = await scoreService.getLatestForProject(
        testProject.id,
        testUser.id
      );

      expect(result.latestScore).toBeDefined();
      expect(result.latestScore?.overall).toBe(75);
    });

    it('should include full breakdown in response', async () => {
      await testPrisma.deoScoreSnapshot.create({
        data: {
          projectId: testProject.id,
          overallScore: 65,
          contentScore: 60,
          entityScore: 70,
          technicalScore: 65,
          visibilityScore: 65,
          version: '1.0',
          metadata: { test: true },
          computedAt: new Date(),
        },
      });

      const result = await scoreService.getLatestForProject(
        testProject.id,
        testUser.id
      );

      expect(result.latestScore?.content).toBe(60);
      expect(result.latestScore?.entities).toBe(70);
      expect(result.latestScore?.technical).toBe(65);
      expect(result.latestScore?.visibility).toBe(65);
      expect(result.latestSnapshot?.metadata).toEqual({ test: true });
    });
  });

  describe('Multi-user Access', () => {
    it('should allow project member to view score', async () => {
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

      await testPrisma.deoScoreSnapshot.create({
        data: {
          projectId: testProject.id,
          overallScore: 80,
          contentScore: 80,
          entityScore: 80,
          technicalScore: 80,
          visibilityScore: 80,
          version: '1.0',
          metadata: {},
          computedAt: new Date(),
        },
      });

      const result = await scoreService.getLatestForProject(
        testProject.id,
        memberUser.id
      );

      expect(result.latestScore).toBeDefined();
      expect(result.latestScore?.overall).toBe(80);
    });
  });

  describe('Score Computation Quality', () => {
    it('should compute higher score for well-optimized content', async () => {
      // Create well-optimized products
      await testPrisma.product.createMany({
        data: Array(5)
          .fill(null)
          .map((_, i) => ({
            projectId: testProject.id,
            title: `Well Optimized Product ${i + 1}`,
            description:
              'This is a comprehensive product description with detailed information about features, benefits, and use cases. It contains enough content to be considered high-quality for search engine optimization.',
            seoTitle: `Product ${i + 1} - Best Quality`,
            seoDescription: `Complete guide to product ${i + 1} with all features`,
            lastSyncedAt: new Date(),
          })),
      });

      // Create well-optimized crawl results
      await testPrisma.crawlResult.createMany({
        data: [
          {
            projectId: testProject.id,
            url: 'https://example.com/',
            statusCode: 200,
            title: 'Home - Best Store',
            metaDescription: 'Welcome to the best store',
            h1: 'Welcome to Our Store',
            wordCount: 800,
            issues: [],
            scannedAt: new Date(),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/about',
            statusCode: 200,
            title: 'About Us',
            metaDescription: 'Learn about our company',
            h1: 'Our Story',
            wordCount: 600,
            issues: [],
            scannedAt: new Date(),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/contact',
            statusCode: 200,
            title: 'Contact Us',
            metaDescription: 'Get in touch',
            h1: 'Contact Us',
            wordCount: 400,
            issues: [],
            scannedAt: new Date(),
          },
        ],
      });

      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      const snapshot = await scoreService.computeAndPersistScoreFromSignals(
        testProject.id,
        signals
      );

      // Well-optimized content should have higher scores
      expect(snapshot.breakdown.overall).toBeGreaterThan(30);
      expect(signals.crawlHealth).toBe(1);
      expect(signals.serpPresence).toBe(1);
    });

    it('should compute lower score for poorly optimized content', async () => {
      // Create poorly optimized products
      await testPrisma.product.createMany({
        data: Array(3)
          .fill(null)
          .map((_, i) => ({
            projectId: testProject.id,
            title: `Product ${i}`,
            description: 'Short',
            seoTitle: null,
            seoDescription: null,
            lastSyncedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
          })),
      });

      // Create poor crawl results
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
            scannedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/page2',
            statusCode: 200,
            title: 'Page',
            metaDescription: null,
            h1: null,
            wordCount: 50,
            issues: ['THIN_CONTENT'],
            scannedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          },
        ],
      });

      const signals = await signalsService.collectSignalsForProject(
        testProject.id
      );

      const snapshot = await scoreService.computeAndPersistScoreFromSignals(
        testProject.id,
        signals
      );

      // Poor content should have lower scores
      expect(signals.crawlHealth).toBeLessThan(1);
      expect(signals.contentFreshness).toBeLessThan(0.5);
    });
  });
});
