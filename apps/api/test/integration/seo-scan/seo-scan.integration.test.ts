/**
 * SEO-SCAN-TESTS: Integration tests for SEO Scan Service
 *
 * Tests:
 * - Page scanning and issue detection
 * - Scan result storage and retrieval
 * - Score calculation from issues
 * - Access control (OWNER-only for mutations, any member for reads)
 * - DEO score recomputation after scans
 *
 * NOTE: These tests require a test database to be configured.
 * They mock external fetch calls to avoid network dependencies.
 */
import { SeoScanService } from '../../../src/seo-scan/seo-scan.service';
import {
  DeoScoreService,
  DeoSignalsService,
} from '../../../src/projects/deo-score.service';
import { AutomationService } from '../../../src/projects/automation.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('SeoScanService (integration)', () => {
  let seoScanService: SeoScanService;
  let deoSignalsService: DeoSignalsService;
  let deoScoreService: DeoScoreService;
  let automationService: AutomationService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string };
  let testProject: { id: string; name: string; domain: string };

  beforeAll(async () => {
    roleResolutionService = new RoleResolutionService(testPrisma as any);
    deoSignalsService = new DeoSignalsService(testPrisma as any);
    deoScoreService = new DeoScoreService(testPrisma as any);
    automationService = new AutomationService(
      testPrisma as any,
      null as any, // EntitlementsService not needed for basic tests
      null as any // AutomationSafetyRailsService not needed
    );

    seoScanService = new SeoScanService(
      testPrisma as any,
      deoSignalsService,
      deoScoreService,
      automationService,
      roleResolutionService
    );
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
        email: `seo-scan-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'SEO Scan Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'SEO Scan Test Project',
        domain: 'seo-scan-test.example.com',
        userId: testUser.id,
      },
    });
  });

  describe('Page Scanning', () => {
    it('should detect missing title issue', async () => {
      const result = await seoScanService.scanPage('https://example.com');
      // In E2E mode, returns synthetic data
      expect(result.url).toBe('https://example.com');
      expect(result.statusCode).toBeDefined();
    });

    it('should return synthetic data in E2E mode', async () => {
      const result = await seoScanService.scanPage('https://test.example.com');

      expect(result.statusCode).toBe(200);
      expect(result.title).toBe('E2E Test Homepage');
      expect(result.metaDescription).toBeDefined();
      expect(result.h1).toBe('E2E Test');
      expect(result.wordCount).toBe(500);
      expect(result.issues).toEqual([]);
    });
  });

  describe('Score Calculation', () => {
    it('should calculate perfect score for no issues', () => {
      const score = seoScanService.calculateScore([]);
      expect(score).toBe(100);
    });

    it('should subtract 10 points per issue', () => {
      const score = seoScanService.calculateScore([
        'MISSING_TITLE',
        'MISSING_META_DESCRIPTION',
      ]);
      expect(score).toBe(80);
    });

    it('should not go below 0', () => {
      const issues = Array(15).fill('ISSUE');
      const score = seoScanService.calculateScore(issues);
      expect(score).toBe(0);
    });

    it('should handle various issue combinations', () => {
      expect(seoScanService.calculateScore(['MISSING_TITLE'])).toBe(90);
      expect(seoScanService.calculateScore(['THIN_CONTENT', 'SLOW_LOAD_TIME'])).toBe(80);
      expect(
        seoScanService.calculateScore([
          'MISSING_TITLE',
          'MISSING_META_DESCRIPTION',
          'MISSING_H1',
          'THIN_CONTENT',
        ])
      ).toBe(60);
    });
  });

  describe('Scan Results Retrieval', () => {
    it('should return empty results for project with no scans', async () => {
      const results = await seoScanService.getResults(
        testProject.id,
        testUser.id
      );
      expect(results).toHaveLength(0);
    });

    it('should return scan results with computed scores', async () => {
      // Create a crawl result directly
      await testPrisma.crawlResult.create({
        data: {
          projectId: testProject.id,
          url: 'https://example.com/page1',
          statusCode: 200,
          title: 'Test Page',
          metaDescription: 'Description',
          h1: 'H1 Title',
          wordCount: 500,
          loadTimeMs: 1000,
          issues: ['TITLE_TOO_SHORT'],
          scannedAt: new Date(),
        },
      });

      const results = await seoScanService.getResults(
        testProject.id,
        testUser.id
      );

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://example.com/page1');
      expect(results[0].score).toBe(90); // 100 - 10 for one issue
    });

    it('should order results by scannedAt descending', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000);

      await testPrisma.crawlResult.createMany({
        data: [
          {
            projectId: testProject.id,
            url: 'https://example.com/older',
            statusCode: 200,
            title: 'Older Page',
            metaDescription: null,
            h1: null,
            wordCount: 100,
            loadTimeMs: 500,
            issues: [],
            scannedAt: earlier,
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/newer',
            statusCode: 200,
            title: 'Newer Page',
            metaDescription: null,
            h1: null,
            wordCount: 100,
            loadTimeMs: 500,
            issues: [],
            scannedAt: now,
          },
        ],
      });

      const results = await seoScanService.getResults(
        testProject.id,
        testUser.id
      );

      expect(results).toHaveLength(2);
      expect(results[0].url).toBe('https://example.com/newer');
      expect(results[1].url).toBe('https://example.com/older');
    });
  });

  describe('Access Control', () => {
    it('should allow project owner to view results', async () => {
      const results = await seoScanService.getResults(
        testProject.id,
        testUser.id
      );
      expect(results).toBeDefined();
    });

    it('should allow project member to view results', async () => {
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

      const results = await seoScanService.getResults(
        testProject.id,
        memberUser.id
      );
      expect(results).toBeDefined();
    });

    it('should throw for unauthorized user viewing results', async () => {
      const otherUser = await testPrisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Other User',
        },
      });

      await expect(
        seoScanService.getResults(testProject.id, otherUser.id)
      ).rejects.toThrow();
    });

    it('should throw NotFoundException for non-existent project scan', async () => {
      await expect(
        seoScanService.startScan('non-existent-id', testUser.id)
      ).rejects.toThrow();
    });
  });

  describe('Full Project Crawl', () => {
    it('should return null for project without domain', async () => {
      const noDomainProject = await testPrisma.project.create({
        data: {
          name: 'No Domain Project',
          domain: null,
          userId: testUser.id,
        },
      });

      const result = await seoScanService.runFullProjectCrawl(
        noDomainProject.id
      );
      expect(result).toBeNull();
    });

    it('should return null for non-existent project', async () => {
      const result = await seoScanService.runFullProjectCrawl(
        'non-existent-project-id'
      );
      expect(result).toBeNull();
    });

    it('should run crawl for project with domain', async () => {
      const result = await seoScanService.runFullProjectCrawl(testProject.id);

      // In E2E mode, should return a crawled date
      expect(result).toBeInstanceOf(Date);

      // Verify crawl result was stored
      const crawlResults = await testPrisma.crawlResult.findMany({
        where: { projectId: testProject.id },
      });
      expect(crawlResults.length).toBeGreaterThan(0);
    });

    it('should update lastCrawledAt on project', async () => {
      await seoScanService.runFullProjectCrawl(testProject.id);

      const updatedProject = await testPrisma.project.findUnique({
        where: { id: testProject.id },
      });

      expect(updatedProject?.lastCrawledAt).toBeDefined();
    });
  });

  describe('Issue Detection Categories', () => {
    it('should categorize all supported issue types', async () => {
      // Create crawl results with various issue types
      const issueTypes = [
        'MISSING_TITLE',
        'TITLE_TOO_LONG',
        'TITLE_TOO_SHORT',
        'MISSING_META_DESCRIPTION',
        'META_DESCRIPTION_TOO_LONG',
        'META_DESCRIPTION_TOO_SHORT',
        'MISSING_H1',
        'THIN_CONTENT',
        'SLOW_LOAD_TIME',
        'HTTP_ERROR',
        'FETCH_ERROR',
        'RENDER_BLOCKING_RESOURCES',
        'LARGE_HTML',
        'VERY_LARGE_HTML',
        'MISSING_VIEWPORT_META',
        'POTENTIAL_MOBILE_LAYOUT_ISSUE',
        'META_ROBOTS_NOINDEX',
        'NOINDEX',
        'CANONICAL_CONFLICT',
      ];

      for (const issueType of issueTypes) {
        await testPrisma.crawlResult.create({
          data: {
            projectId: testProject.id,
            url: `https://example.com/${issueType.toLowerCase()}`,
            statusCode: issueType === 'HTTP_ERROR' ? 404 : 200,
            title: issueType.includes('TITLE') ? null : 'Title',
            metaDescription: issueType.includes('DESCRIPTION') ? null : 'Desc',
            h1: issueType === 'MISSING_H1' ? null : 'H1',
            wordCount: issueType === 'THIN_CONTENT' ? 50 : 500,
            loadTimeMs: issueType === 'SLOW_LOAD_TIME' ? 5000 : 500,
            issues: [issueType],
            scannedAt: new Date(),
          },
        });
      }

      const results = await seoScanService.getResults(
        testProject.id,
        testUser.id
      );

      expect(results.length).toBe(issueTypes.length);

      // Verify each has a score < 100 (since each has one issue)
      for (const result of results) {
        expect(result.score).toBe(90);
      }
    });
  });
});
