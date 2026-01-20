/**
 * Unit tests for CrawlProcessor
 *
 * Tests:
 * - onModuleInit() skips worker initialization when Redis is not configured
 * - onModuleInit() initializes worker when Redis is configured
 * - Job processing runs full crawl pipeline
 * - Error handling in job processing
 * - onModuleDestroy() closes worker
 */
import { CrawlProcessor } from '../../../src/crawl/crawl.processor';
import { PrismaService } from '../../../src/prisma.service';
import { SeoScanService } from '../../../src/seo-scan/seo-scan.service';
import {
  DeoScoreService,
  DeoSignalsService,
} from '../../../src/projects/deo-score.service';
import { AutomationService } from '../../../src/projects/automation.service';
import { redisConfig } from '../../../src/config/redis.config';

// Mock BullMQ Worker
jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

const createPrismaMock = () => ({
  project: {
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

describe('CrawlProcessor', () => {
  let processor: CrawlProcessor;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let seoScanServiceMock: ReturnType<typeof createSeoScanServiceMock>;
  let deoSignalsServiceMock: ReturnType<typeof createDeoSignalsServiceMock>;
  let deoScoreServiceMock: ReturnType<typeof createDeoScoreServiceMock>;
  let automationServiceMock: ReturnType<typeof createAutomationServiceMock>;
  let originalRedisConfig: typeof redisConfig;
  let originalEnv: string | undefined;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    seoScanServiceMock = createSeoScanServiceMock();
    deoSignalsServiceMock = createDeoSignalsServiceMock();
    deoScoreServiceMock = createDeoScoreServiceMock();
    automationServiceMock = createAutomationServiceMock();

    processor = new CrawlProcessor(
      prismaMock as unknown as PrismaService,
      seoScanServiceMock as unknown as SeoScanService,
      deoSignalsServiceMock as unknown as DeoSignalsService,
      deoScoreServiceMock as unknown as DeoScoreService,
      automationServiceMock as unknown as AutomationService
    );

    originalRedisConfig = { ...redisConfig };
    originalEnv = process.env.ENABLE_QUEUE_PROCESSORS;
  });

  afterEach(() => {
    Object.assign(redisConfig, originalRedisConfig);
    if (originalEnv === undefined) {
      delete process.env.ENABLE_QUEUE_PROCESSORS;
    } else {
      process.env.ENABLE_QUEUE_PROCESSORS = originalEnv;
    }
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should skip worker initialization when Redis is not configured', async () => {
      Object.assign(redisConfig, {
        isEnabled: false,
        connection: null,
      });

      const { Worker } = require('bullmq');
      await processor.onModuleInit();

      expect(Worker).not.toHaveBeenCalled();
    });

    it('should initialize worker when Redis is configured', async () => {
      Object.assign(redisConfig, {
        isEnabled: true,
        connection: { host: 'localhost', port: 6379 },
        prefix: 'test:',
      });
      process.env.ENABLE_QUEUE_PROCESSORS = 'true';

      const { Worker } = require('bullmq');
      await processor.onModuleInit();

      expect(Worker).toHaveBeenCalledWith('crawl_queue', expect.any(Function), {
        connection: redisConfig.connection,
        prefix: redisConfig.prefix,
      });
    });
  });

  describe('job processing', () => {
    beforeEach(async () => {
      Object.assign(redisConfig, {
        isEnabled: true,
        connection: { host: 'localhost', port: 6379 },
        prefix: 'test:',
      });
      process.env.ENABLE_QUEUE_PROCESSORS = 'true';

      const { Worker } = require('bullmq');
      await processor.onModuleInit();

      const workerCall = (Worker as jest.Mock).mock.calls[0];
      const jobHandler = workerCall[1];
      (processor as any).jobHandler = jobHandler;
    });

    it('should process job and run full crawl pipeline', async () => {
      const mockSignals = {
        content: {
          totalPages: 1,
          pagesWithMetadata: 1,
          avgWordCount: 100,
          pagesWithThinContent: 0,
        },
        entities: {
          totalProducts: 0,
          productsWithAnswerBlocks: 0,
          answerabilityScore: 0,
        },
        technical: { crawlablePages: 1, indexablePages: 1, avgLoadTime: 1 },
        visibility: { offsitePresenceScore: 0, localDiscoveryScore: null },
      };

      const mockSnapshot = {
        id: 'snapshot-1',
        projectId: 'proj-1',
        breakdown: {
          overall: 70,
          content: 70,
          entities: 60,
          technical: 80,
          visibility: 60,
        },
      };

      const crawledAt = new Date();

      seoScanServiceMock.runFullProjectCrawl.mockResolvedValue(crawledAt);
      prismaMock.project.update.mockResolvedValue({});
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue(
        mockSignals
      );
      deoScoreServiceMock.computeAndPersistScoreFromSignals.mockResolvedValue(
        mockSnapshot
      );

      const jobHandler = (processor as any).jobHandler;
      const mockJob = {
        data: { projectId: 'proj-1' },
      };

      await jobHandler(mockJob);

      expect(seoScanServiceMock.runFullProjectCrawl).toHaveBeenCalledWith(
        'proj-1'
      );
      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { lastCrawledAt: crawledAt },
      });
      expect(
        deoSignalsServiceMock.collectSignalsForProject
      ).toHaveBeenCalledWith('proj-1');
      expect(
        deoScoreServiceMock.computeAndPersistScoreFromSignals
      ).toHaveBeenCalledWith('proj-1', mockSignals);
      expect(
        automationServiceMock.scheduleSuggestionsForProject
      ).toHaveBeenCalledWith('proj-1');
    });

    it('should skip when crawl returns null', async () => {
      seoScanServiceMock.runFullProjectCrawl.mockResolvedValue(null);

      const jobHandler = (processor as any).jobHandler;
      const mockJob = {
        data: { projectId: 'proj-1' },
      };

      jest.spyOn(console, 'warn').mockImplementation(() => {});

      await jobHandler(mockJob);

      expect(prismaMock.project.update).not.toHaveBeenCalled();
      expect(
        deoSignalsServiceMock.collectSignalsForProject
      ).not.toHaveBeenCalled();

      (console.warn as jest.Mock).mockRestore();
    });

    it('should throw error when crawl fails', async () => {
      seoScanServiceMock.runFullProjectCrawl.mockRejectedValue(
        new Error('Crawl failed')
      );

      const jobHandler = (processor as any).jobHandler;
      const mockJob = {
        data: { projectId: 'proj-1' },
      };

      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(jobHandler(mockJob)).rejects.toThrow('Crawl failed');

      (console.error as jest.Mock).mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close worker when it exists', async () => {
      Object.assign(redisConfig, {
        isEnabled: true,
        connection: { host: 'localhost', port: 6379 },
        prefix: 'test:',
      });
      process.env.ENABLE_QUEUE_PROCESSORS = 'true';

      const { Worker } = require('bullmq');
      await processor.onModuleInit();

      const mockWorker = (Worker as jest.Mock).mock.results[0].value;
      await processor.onModuleDestroy();

      expect(mockWorker.close).toHaveBeenCalled();
    });
  });
});
