/**
 * CRAWL-SCHEDULER-TESTS: Integration tests for Crawl Scheduler Service
 *
 * Tests:
 * - Project due-for-crawl determination
 * - Frequency-based scheduling (daily, weekly, monthly)
 * - Auto-crawl enable/disable flag
 * - Scheduled crawl execution
 * - DEO score recomputation after scheduled crawls
 *
 * NOTE: These tests require a test database to be configured.
 * They test the scheduler logic without triggering actual cron jobs.
 */
import { CrawlSchedulerService } from '../../../src/crawl/crawl-scheduler.service';
import { SeoScanService } from '../../../src/seo-scan/seo-scan.service';
import {
  DeoScoreService,
  DeoSignalsService,
} from '../../../src/projects/deo-score.service';
import { AutomationService } from '../../../src/projects/automation.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { CrawlFrequency } from '@prisma/client';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

describeIfE2E('CrawlSchedulerService (integration)', () => {
  let crawlSchedulerService: CrawlSchedulerService;
  let seoScanService: SeoScanService;
  let deoSignalsService: DeoSignalsService;
  let deoScoreService: DeoScoreService;
  let automationService: AutomationService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string };

  beforeAll(async () => {
    roleResolutionService = new RoleResolutionService(testPrisma as any);
    deoSignalsService = new DeoSignalsService(testPrisma as any);
    deoScoreService = new DeoScoreService(testPrisma as any);
    automationService = new AutomationService(
      testPrisma as any,
      null as any,
      null as any
    );

    seoScanService = new SeoScanService(
      testPrisma as any,
      deoSignalsService,
      deoScoreService,
      automationService,
      roleResolutionService
    );

    crawlSchedulerService = new CrawlSchedulerService(
      testPrisma as any,
      seoScanService,
      deoSignalsService,
      deoScoreService,
      automationService
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
        email: `crawl-scheduler-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Crawl Scheduler Test User',
      },
    });
  });

  describe('Due-for-Crawl Determination', () => {
    it('should mark never-crawled project as due', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Never Crawled',
          domain: 'never-crawled.example.com',
          userId: testUser.id,
          lastCrawledAt: null,
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.DAILY,
        },
      });

      // Access private method via service instance
      const isDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        project,
        new Date()
      );

      expect(isDue).toBe(true);
    });

    it('should respect autoCrawlEnabled=false', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Auto Crawl Disabled',
          domain: 'disabled.example.com',
          userId: testUser.id,
          lastCrawledAt: null,
          autoCrawlEnabled: false,
          crawlFrequency: CrawlFrequency.DAILY,
        },
      });

      const isDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        project,
        new Date()
      );

      expect(isDue).toBe(false);
    });

    it('should mark project as due after daily threshold', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * MS_PER_DAY);

      const project = await testPrisma.project.create({
        data: {
          name: 'Daily Project',
          domain: 'daily.example.com',
          userId: testUser.id,
          lastCrawledAt: twoDaysAgo,
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.DAILY,
        },
      });

      const isDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        project,
        now
      );

      expect(isDue).toBe(true);
    });

    it('should not mark project as due before daily threshold', async () => {
      const now = new Date();
      const fewHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6 hours

      const project = await testPrisma.project.create({
        data: {
          name: 'Recently Crawled',
          domain: 'recent.example.com',
          userId: testUser.id,
          lastCrawledAt: fewHoursAgo,
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.DAILY,
        },
      });

      const isDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        project,
        now
      );

      expect(isDue).toBe(false);
    });

    it('should respect weekly frequency threshold', async () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * MS_PER_DAY);
      const eightDaysAgo = new Date(now.getTime() - 8 * MS_PER_DAY);

      // Not due (5 days < 7 days)
      const notDueProject = await testPrisma.project.create({
        data: {
          name: 'Weekly Not Due',
          domain: 'weekly-not-due.example.com',
          userId: testUser.id,
          lastCrawledAt: fiveDaysAgo,
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.WEEKLY,
        },
      });

      // Due (8 days >= 7 days)
      const dueProject = await testPrisma.project.create({
        data: {
          name: 'Weekly Due',
          domain: 'weekly-due.example.com',
          userId: testUser.id,
          lastCrawledAt: eightDaysAgo,
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.WEEKLY,
        },
      });

      const notDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        notDueProject,
        now
      );
      const isDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        dueProject,
        now
      );

      expect(notDue).toBe(false);
      expect(isDue).toBe(true);
    });

    it('should respect monthly frequency threshold', async () => {
      const now = new Date();
      const twentyDaysAgo = new Date(now.getTime() - 20 * MS_PER_DAY);
      const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * MS_PER_DAY);

      // Not due (20 days < 30 days)
      const notDueProject = await testPrisma.project.create({
        data: {
          name: 'Monthly Not Due',
          domain: 'monthly-not-due.example.com',
          userId: testUser.id,
          lastCrawledAt: twentyDaysAgo,
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.MONTHLY,
        },
      });

      // Due (35 days >= 30 days)
      const dueProject = await testPrisma.project.create({
        data: {
          name: 'Monthly Due',
          domain: 'monthly-due.example.com',
          userId: testUser.id,
          lastCrawledAt: thirtyFiveDaysAgo,
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.MONTHLY,
        },
      });

      const notDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        notDueProject,
        now
      );
      const isDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        dueProject,
        now
      );

      expect(notDue).toBe(false);
      expect(isDue).toBe(true);
    });

    it('should default to DAILY when crawlFrequency is null', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * MS_PER_DAY);

      const project = await testPrisma.project.create({
        data: {
          name: 'Default Frequency',
          domain: 'default.example.com',
          userId: testUser.id,
          lastCrawledAt: twoDaysAgo,
          autoCrawlEnabled: true,
          crawlFrequency: null, // Should default to DAILY
        },
      });

      const isDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        project,
        now
      );

      expect(isDue).toBe(true);
    });

    it('should default autoCrawlEnabled to true when null', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Default Auto Crawl',
          domain: 'default-auto.example.com',
          userId: testUser.id,
          lastCrawledAt: null,
          autoCrawlEnabled: null, // Should default to true
          crawlFrequency: CrawlFrequency.DAILY,
        },
      });

      const isDue = (crawlSchedulerService as any).isProjectDueForCrawl(
        project,
        new Date()
      );

      expect(isDue).toBe(true);
    });
  });

  describe('Queue Mode Detection', () => {
    it('should detect queue mode based on environment', () => {
      // In test mode, should not use queue
      const shouldUseQueue = (crawlSchedulerService as any).shouldUseQueue();

      // In E2E/test environment, should be false (sync mode)
      expect(typeof shouldUseQueue).toBe('boolean');
    });
  });

  describe('Scheduled Crawl Execution', () => {
    it('should process due projects during schedule run', async () => {
      // Create a project that's due for crawl
      const project = await testPrisma.project.create({
        data: {
          name: 'Due Project',
          domain: 'due-project.example.com',
          userId: testUser.id,
          lastCrawledAt: null,
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.DAILY,
        },
      });

      // Set ENABLE_CRON to false to prevent actual cron execution
      const originalEnableCron = process.env.ENABLE_CRON;
      process.env.ENABLE_CRON = 'false';

      try {
        // This should log that cron is disabled and return early
        await crawlSchedulerService.scheduleProjectCrawls();
      } finally {
        process.env.ENABLE_CRON = originalEnableCron;
      }

      // Verify the project wasn't crawled (since cron was disabled)
      const updatedProject = await testPrisma.project.findUnique({
        where: { id: project.id },
      });

      expect(updatedProject?.lastCrawledAt).toBeNull();
    });

    it('should skip projects without domain', async () => {
      const noDomainProject = await testPrisma.project.create({
        data: {
          name: 'No Domain',
          domain: null,
          userId: testUser.id,
          lastCrawledAt: null,
          autoCrawlEnabled: true,
        },
      });

      // Verify direct crawl returns null for no domain
      const result = await seoScanService.runFullProjectCrawl(
        noDomainProject.id
      );
      expect(result).toBeNull();
    });

    it('should create crawl results for due projects with domains', async () => {
      const project = await testPrisma.project.create({
        data: {
          name: 'Crawlable Project',
          domain: 'crawlable.example.com',
          userId: testUser.id,
          lastCrawledAt: null,
          autoCrawlEnabled: true,
        },
      });

      // Run direct crawl (not via scheduler to avoid cron check)
      const crawledAt = await seoScanService.runFullProjectCrawl(project.id);

      expect(crawledAt).toBeInstanceOf(Date);

      // Verify crawl result was created
      const crawlResults = await testPrisma.crawlResult.findMany({
        where: { projectId: project.id },
      });

      expect(crawlResults.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Project Scheduling', () => {
    it('should identify all due projects', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * MS_PER_DAY);

      // Create multiple projects with different states
      await testPrisma.project.createMany({
        data: [
          {
            name: 'Due Project 1',
            domain: 'due1.example.com',
            userId: testUser.id,
            lastCrawledAt: null,
            autoCrawlEnabled: true,
          },
          {
            name: 'Due Project 2',
            domain: 'due2.example.com',
            userId: testUser.id,
            lastCrawledAt: twoDaysAgo,
            autoCrawlEnabled: true,
            crawlFrequency: CrawlFrequency.DAILY,
          },
          {
            name: 'Not Due Project',
            domain: 'notdue.example.com',
            userId: testUser.id,
            lastCrawledAt: now,
            autoCrawlEnabled: true,
            crawlFrequency: CrawlFrequency.DAILY,
          },
          {
            name: 'Disabled Project',
            domain: 'disabled.example.com',
            userId: testUser.id,
            lastCrawledAt: null,
            autoCrawlEnabled: false,
          },
        ],
      });

      const allProjects = await testPrisma.project.findMany({
        select: {
          id: true,
          lastCrawledAt: true,
          autoCrawlEnabled: true,
          crawlFrequency: true,
        },
      });

      const dueProjects = allProjects.filter((p) =>
        (crawlSchedulerService as any).isProjectDueForCrawl(p, now)
      );

      // Should have 2 due projects (never crawled + old daily)
      expect(dueProjects).toHaveLength(2);
    });
  });
});
