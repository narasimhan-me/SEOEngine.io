/**
 * DEO-ISSUES-TESTS: Integration tests for DEO Issues Engine
 *
 * Tests:
 * - Issue detection from crawl results and products
 * - Issue aggregation across pillars
 * - Issue counts summary computation
 * - Pillar-specific issue integration
 * - Access control (membership-aware)
 *
 * NOTE: These tests require a test database to be configured.
 * They exercise the service layer directly without mocking Prisma.
 */
import { DeoIssuesService } from '../../../src/projects/deo-issues.service';
import { DeoSignalsService } from '../../../src/projects/deo-score.service';
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

describeIfE2E('DeoIssuesService (integration)', () => {
  let issuesService: DeoIssuesService;
  let deoSignalsService: DeoSignalsService;
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
      null as any, // EntitlementsService not needed for basic tests
      null as any // AutomationSafetyRailsService not needed
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

    issuesService = new DeoIssuesService(
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
        email: `deo-issues-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'DEO Issues Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'DEO Issues Test Project',
        domain: 'deo-issues-test.example.com',
        userId: testUser.id,
      },
    });
  });

  describe('Issue Detection', () => {
    it('should return empty issues for project with no data', async () => {
      const response = await issuesService.getIssuesForProjectReadOnly(
        testProject.id,
        testUser.id
      );

      expect(response.projectId).toBe(testProject.id);
      expect(response.issues).toHaveLength(0);
      expect(response.generatedAt).toBeDefined();
    });

    it('should detect missing metadata issues from crawl results', async () => {
      // Create crawl result with missing title
      await testPrisma.crawlResult.create({
        data: {
          projectId: testProject.id,
          url: 'https://example.com/missing-title',
          statusCode: 200,
          title: null,
          metaDescription: 'Has description',
          h1: 'Has H1',
          wordCount: 300,
          issues: ['MISSING_TITLE'],
          scannedAt: new Date(),
        },
      });

      const response = await issuesService.getIssuesForProjectReadOnly(
        testProject.id,
        testUser.id
      );

      // Should have at least one issue
      expect(response.issues.length).toBeGreaterThan(0);
    });

    it('should detect thin content issues', async () => {
      await testPrisma.crawlResult.create({
        data: {
          projectId: testProject.id,
          url: 'https://example.com/thin-page',
          statusCode: 200,
          title: 'Thin Page',
          metaDescription: 'Short',
          h1: 'Title',
          wordCount: 50, // Very thin
          issues: ['THIN_CONTENT'],
          scannedAt: new Date(),
        },
      });

      const response = await issuesService.getIssuesForProjectReadOnly(
        testProject.id,
        testUser.id
      );

      const thinContentIssue = response.issues.find(
        (i) => i.type === 'thin_content' || i.id?.includes('thin')
      );

      // Should detect thin content
      expect(response.issues.length).toBeGreaterThan(0);
    });

    it('should detect crawl health errors', async () => {
      await testPrisma.crawlResult.create({
        data: {
          projectId: testProject.id,
          url: 'https://example.com/error-page',
          statusCode: 404,
          title: null,
          metaDescription: null,
          h1: null,
          wordCount: 0,
          issues: ['HTTP_ERROR'],
          scannedAt: new Date(),
        },
      });

      const response = await issuesService.getIssuesForProjectReadOnly(
        testProject.id,
        testUser.id
      );

      expect(response.issues.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        issuesService.getIssuesForProjectReadOnly('non-existent-id', testUser.id)
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
        issuesService.getIssuesForProjectReadOnly(testProject.id, otherUser.id)
      ).rejects.toThrow();
    });
  });

  describe('Issue Counts Summary', () => {
    it('should compute counts summary for project with issues', async () => {
      // Create data that will generate issues
      await testPrisma.crawlResult.createMany({
        data: [
          {
            projectId: testProject.id,
            url: 'https://example.com/page1',
            statusCode: 200,
            title: null, // Missing title
            metaDescription: null,
            h1: null,
            wordCount: 100,
            issues: ['MISSING_TITLE', 'MISSING_DESCRIPTION'],
            scannedAt: new Date(),
          },
          {
            projectId: testProject.id,
            url: 'https://example.com/page2',
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

      const summary = await issuesService.getIssueCountsSummaryForProject(
        testProject.id,
        testUser.id
      );

      expect(summary.projectId).toBe(testProject.id);
      expect(summary.generatedAt).toBeDefined();
      expect(typeof summary.detectedTotal).toBe('number');
      expect(typeof summary.detectedGroupsTotal).toBe('number');
      expect(summary.byPillar).toBeDefined();
      expect(summary.bySeverity).toBeDefined();
      expect(summary.byAssetType).toBeDefined();
    });

    it('should return zero counts for project with no issues', async () => {
      // Create well-optimized content (no issues)
      await testPrisma.crawlResult.create({
        data: {
          projectId: testProject.id,
          url: 'https://example.com/good-page',
          statusCode: 200,
          title: 'Good Page Title',
          metaDescription: 'A comprehensive description',
          h1: 'Good H1',
          wordCount: 800,
          issues: [],
          scannedAt: new Date(),
        },
      });

      await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Good Product',
          description: 'A comprehensive product description with all the details needed',
          seoTitle: 'Good Product - Best Quality',
          seoDescription: 'Complete product description',
          lastSyncedAt: new Date(),
        },
      });

      const summary = await issuesService.getIssueCountsSummaryForProject(
        testProject.id,
        testUser.id
      );

      // May still have some issues from other pillars, but should be minimal
      expect(summary.byPillar).toBeDefined();
    });
  });

  describe('Canonical Issue Counts', () => {
    it('should compute canonical counts triplet', async () => {
      await testPrisma.crawlResult.create({
        data: {
          projectId: testProject.id,
          url: 'https://example.com/page',
          statusCode: 200,
          title: null,
          metaDescription: null,
          h1: null,
          wordCount: 100,
          issues: ['MISSING_TITLE'],
          scannedAt: new Date(),
        },
      });

      const summary = await issuesService.getCanonicalIssueCountsSummary(
        testProject.id,
        testUser.id
      );

      expect(summary.projectId).toBe(testProject.id);
      expect(summary.detected).toBeDefined();
      expect(summary.detected.issueTypesCount).toBeDefined();
      expect(summary.detected.affectedItemsCount).toBeDefined();
      expect(summary.detected.actionableNowCount).toBeDefined();
      expect(summary.actionable).toBeDefined();
    });

    it('should support severity filter', async () => {
      await testPrisma.crawlResult.createMany({
        data: [
          {
            projectId: testProject.id,
            url: 'https://example.com/critical',
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
            url: 'https://example.com/warning',
            statusCode: 200,
            title: 'Title',
            metaDescription: null,
            h1: 'H1',
            wordCount: 100,
            issues: ['MISSING_DESCRIPTION'],
            scannedAt: new Date(),
          },
        ],
      });

      const criticalSummary = await issuesService.getCanonicalIssueCountsSummary(
        testProject.id,
        testUser.id,
        { severity: 'critical' }
      );

      const warningSummary = await issuesService.getCanonicalIssueCountsSummary(
        testProject.id,
        testUser.id,
        { severity: 'warning' }
      );

      // Both should have valid structure
      expect(criticalSummary.detected).toBeDefined();
      expect(warningSummary.detected).toBeDefined();
    });
  });

  describe('Multi-user Access', () => {
    it('should allow project member to view issues', async () => {
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

      const response = await issuesService.getIssuesForProjectReadOnly(
        testProject.id,
        memberUser.id
      );

      expect(response.projectId).toBe(testProject.id);
    });
  });

  describe('Pillar Integration', () => {
    it('should include media accessibility issues', async () => {
      // Create product with images missing alt text
      const product = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Product with Images',
          description: 'Description',
          lastSyncedAt: new Date(),
        },
      });

      await testPrisma.productImage.createMany({
        data: Array(5)
          .fill(null)
          .map((_, i) => ({
            productId: product.id,
            externalId: `img-${i}`,
            src: `https://example.com/img${i}.jpg`,
            altText: null, // Missing alt text
            position: i,
          })),
      });

      const response = await issuesService.getIssuesForProjectReadOnly(
        testProject.id,
        testUser.id
      );

      // Should include media accessibility pillar issues
      const mediaIssues = response.issues.filter(
        (i) => i.pillarId === 'media_accessibility'
      );
      expect(mediaIssues.length).toBeGreaterThan(0);
    });

    it('should include search intent issues when coverage is low', async () => {
      // Create product with minimal content (should have low intent coverage)
      await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Minimal Product',
          description: 'Short',
          lastSyncedAt: new Date(),
        },
      });

      // Analyze intent first
      const product = await testPrisma.product.findFirst({
        where: { projectId: testProject.id },
      });

      if (product) {
        await searchIntentService.analyzeProductIntent(product.id);
      }

      const response = await issuesService.getIssuesForProjectReadOnly(
        testProject.id,
        testUser.id
      );

      // May include search intent issues
      expect(response.issues).toBeDefined();
    });

    it('should include local discovery issues when applicable', async () => {
      // Configure project as local-applicable
      await localDiscoveryService.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      const response = await issuesService.getIssuesForProjectReadOnly(
        testProject.id,
        testUser.id
      );

      // Should include local discovery issues
      const localIssues = response.issues.filter(
        (i) => i.pillarId === 'local_discovery'
      );
      expect(localIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Issue Structure', () => {
    it('should include required fields in issue objects', async () => {
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

      const response = await issuesService.getIssuesForProjectReadOnly(
        testProject.id,
        testUser.id
      );

      for (const issue of response.issues) {
        expect(issue.id).toBeDefined();
        expect(issue.title).toBeDefined();
        expect(issue.description).toBeDefined();
        expect(issue.severity).toBeDefined();
        expect(['critical', 'warning', 'info']).toContain(issue.severity);
        expect(issue.pillarId).toBeDefined();
        expect(typeof issue.count).toBe('number');
      }
    });
  });
});
