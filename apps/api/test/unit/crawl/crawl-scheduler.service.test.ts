/**
 * Unit tests for CrawlSchedulerService
 *
 * Tests:
 * - isProjectDueForCrawl() returns true when due
 * - isProjectDueForCrawl() returns false when not due
 * - scheduleProjectCrawls() skips when ENABLE_CRON is false
 * - scheduleProjectCrawls() schedules crawls for due projects
 */
import { CrawlSchedulerService } from '../../../src/crawl/crawl-scheduler.service';
import { PrismaService } from '../../../src/prisma.service';
import { SeoScanService } from '../../../src/seo-scan/seo-scan.service';
import { DeoScoreService, DeoSignalsService } from '../../../src/projects/deo-score.service';
import { AutomationService } from '../../../src/projects/automation.service';
import { CrawlFrequency } from '@prisma/client';

// Mock queues
jest.mock('../../../src/queues/queues', () => ({
  crawlQueue: null,
}));

const createPrismaMock = () => ({
  project: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
});

const createSeoScanServiceMock = () => ({
  runFullProjectCrawl: jest.fn(),
});

const createDeoSignalsServiceMock = () => ({
  collectSignalsForProject: jest.fn(),
});

const createDeoScoreServiceMock = () => ({
  computeAndPersistScoreFromSignals: jest.fn(),
});

const createAutomationServiceMock = () => ({
  scheduleSuggestionsForProject: jest.fn(),
});

describe('CrawlSchedulerService', () => {
  let service: CrawlSchedulerService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let seoScanServiceMock: ReturnType<typeof createSeoScanServiceMock>;
  let deoSignalsServiceMock: ReturnType<typeof createDeoSignalsServiceMock>;
  let deoScoreServiceMock: ReturnType<typeof createDeoScoreServiceMock>;
  let automationServiceMock: ReturnType<typeof createAutomationServiceMock>;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    seoScanServiceMock = createSeoScanServiceMock();
    deoSignalsServiceMock = createDeoSignalsServiceMock();
    deoScoreServiceMock = createDeoScoreServiceMock();
    automationServiceMock = createAutomationServiceMock();

    service = new CrawlSchedulerService(
      prismaMock as unknown as PrismaService,
      seoScanServiceMock as unknown as SeoScanService,
      deoSignalsServiceMock as unknown as DeoSignalsService,
      deoScoreServiceMock as unknown as DeoScoreService,
      automationServiceMock as unknown as AutomationService,
    );

    originalEnv = {
      ENABLE_CRON: process.env.ENABLE_CRON,
      NODE_ENV: process.env.NODE_ENV,
      IS_LOCAL_DEV: process.env.IS_LOCAL_DEV,
    };

    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.keys(originalEnv).forEach((key) => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
    jest.clearAllMocks();
  });

  describe('isProjectDueForCrawl', () => {
    it('should return true when project has never been crawled', () => {
      const project = {
        lastCrawledAt: null,
        autoCrawlEnabled: true,
        crawlFrequency: CrawlFrequency.DAILY,
      };

      const result = (service as any).isProjectDueForCrawl(project, new Date());

      expect(result).toBe(true);
    });

    it('should return false when autoCrawlEnabled is false', () => {
      const project = {
        lastCrawledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        autoCrawlEnabled: false,
        crawlFrequency: CrawlFrequency.DAILY,
      };

      const result = (service as any).isProjectDueForCrawl(project, new Date());

      expect(result).toBe(false);
    });

    it('should return true when daily project is due', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const project = {
        lastCrawledAt: twoDaysAgo,
        autoCrawlEnabled: true,
        crawlFrequency: CrawlFrequency.DAILY,
      };

      const result = (service as any).isProjectDueForCrawl(project, new Date());

      expect(result).toBe(true);
    });

    it('should return false when daily project is not due', () => {
      const halfDayAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const project = {
        lastCrawledAt: halfDayAgo,
        autoCrawlEnabled: true,
        crawlFrequency: CrawlFrequency.DAILY,
      };

      const result = (service as any).isProjectDueForCrawl(project, new Date());

      expect(result).toBe(false);
    });

    it('should return true when weekly project is due', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const project = {
        lastCrawledAt: eightDaysAgo,
        autoCrawlEnabled: true,
        crawlFrequency: CrawlFrequency.WEEKLY,
      };

      const result = (service as any).isProjectDueForCrawl(project, new Date());

      expect(result).toBe(true);
    });
  });

  describe('scheduleProjectCrawls', () => {
    it('should skip when ENABLE_CRON is false', async () => {
      process.env.ENABLE_CRON = 'false';

      await service.scheduleProjectCrawls();

      expect(prismaMock.project.findMany).not.toHaveBeenCalled();
    });

    it('should process due projects in sync mode', async () => {
      process.env.ENABLE_CRON = 'true';
      process.env.NODE_ENV = 'development';
      process.env.IS_LOCAL_DEV = 'true';

      const mockProjects = [
        {
          id: 'proj-1',
          lastCrawledAt: null,
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.DAILY,
        },
      ];

      const mockSignals = {
        content: { totalPages: 1, pagesWithMetadata: 1, avgWordCount: 100, pagesWithThinContent: 0 },
        entities: { totalProducts: 0, productsWithAnswerBlocks: 0, answerabilityScore: 0 },
        technical: { crawlablePages: 1, indexablePages: 1, avgLoadTime: 1 },
        visibility: { offsitePresenceScore: 0, localDiscoveryScore: null },
      };

      const mockSnapshot = {
        id: 'snapshot-1',
        projectId: 'proj-1',
        breakdown: { overall: 70, content: 70, entities: 60, technical: 80, visibility: 60 },
      };

      prismaMock.project.findMany.mockResolvedValue(mockProjects);
      seoScanServiceMock.runFullProjectCrawl.mockResolvedValue(new Date());
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue(mockSignals);
      deoScoreServiceMock.computeAndPersistScoreFromSignals.mockResolvedValue(mockSnapshot);
      prismaMock.project.update.mockResolvedValue({});

      await service.scheduleProjectCrawls();

      expect(prismaMock.project.findMany).toHaveBeenCalled();
      expect(seoScanServiceMock.runFullProjectCrawl).toHaveBeenCalledWith('proj-1');
      expect(deoSignalsServiceMock.collectSignalsForProject).toHaveBeenCalledWith('proj-1');
      expect(deoScoreServiceMock.computeAndPersistScoreFromSignals).toHaveBeenCalledWith(
        'proj-1',
        mockSignals,
      );
      expect(automationServiceMock.scheduleSuggestionsForProject).toHaveBeenCalledWith('proj-1');
    });

    it('should skip projects that are not due', async () => {
      process.env.ENABLE_CRON = 'true';
      process.env.NODE_ENV = 'development';
      process.env.IS_LOCAL_DEV = 'true';

      const mockProjects = [
        {
          id: 'proj-1',
          lastCrawledAt: new Date(), // Just crawled
          autoCrawlEnabled: true,
          crawlFrequency: CrawlFrequency.DAILY,
        },
      ];

      prismaMock.project.findMany.mockResolvedValue(mockProjects);

      await service.scheduleProjectCrawls();

      expect(prismaMock.project.findMany).toHaveBeenCalled();
      expect(seoScanServiceMock.runFullProjectCrawl).not.toHaveBeenCalled();
    });
  });
});

