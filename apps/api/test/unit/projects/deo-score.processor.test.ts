/**
 * Unit tests for DeoScoreProcessor
 *
 * Tests:
 * - onModuleInit() skips worker initialization when Redis is not configured
 * - onModuleInit() skips worker initialization when ENABLE_QUEUE_PROCESSORS is false
 * - onModuleInit() initializes worker when Redis is configured
 * - Job processing computes and persists score
 * - Error handling in job processing
 * - onModuleDestroy() closes worker
 */
import { DeoScoreProcessor } from '../../../src/projects/deo-score.processor';
import { DeoScoreService, DeoSignalsService } from '../../../src/projects/deo-score.service';
import { redisConfig } from '../../../src/config/redis.config';
import { DeoScoreSignals } from '@engineo/shared';

// Mock BullMQ Worker
jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

const createDeoScoreServiceMock = () => ({
  computeAndPersistScoreFromSignals: jest.fn(),
});

const createDeoSignalsServiceMock = () => ({
  collectSignalsForProject: jest.fn(),
});

describe('DeoScoreProcessor', () => {
  let processor: DeoScoreProcessor;
  let deoScoreServiceMock: ReturnType<typeof createDeoScoreServiceMock>;
  let deoSignalsServiceMock: ReturnType<typeof createDeoSignalsServiceMock>;
  let originalRedisConfig: typeof redisConfig;
  let originalEnv: string | undefined;

  beforeEach(() => {
    deoScoreServiceMock = createDeoScoreServiceMock();
    deoSignalsServiceMock = createDeoSignalsServiceMock();
    processor = new DeoScoreProcessor(
      deoScoreServiceMock as unknown as DeoScoreService,
      deoSignalsServiceMock as unknown as DeoSignalsService,
    );

    // Save original config
    originalRedisConfig = { ...redisConfig };
    originalEnv = process.env.ENABLE_QUEUE_PROCESSORS;
  });

  afterEach(() => {
    // Restore original config
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
      // Mock Redis as disabled
      Object.assign(redisConfig, {
        isEnabled: false,
        connection: null,
      });

      const { Worker } = require('bullmq');
      await processor.onModuleInit();

      expect(Worker).not.toHaveBeenCalled();
    });

    it('should skip worker initialization when ENABLE_QUEUE_PROCESSORS is false', async () => {
      // Mock Redis as enabled but processors disabled
      Object.assign(redisConfig, {
        isEnabled: true,
        connection: { host: 'localhost', port: 6379 },
      });
      process.env.ENABLE_QUEUE_PROCESSORS = 'false';

      const { Worker } = require('bullmq');
      await processor.onModuleInit();

      expect(Worker).not.toHaveBeenCalled();
    });

    it('should initialize worker when Redis is configured and processors enabled', async () => {
      // Mock Redis as enabled
      Object.assign(redisConfig, {
        isEnabled: true,
        connection: { host: 'localhost', port: 6379 },
        prefix: 'test:',
      });
      process.env.ENABLE_QUEUE_PROCESSORS = 'true';

      const { Worker } = require('bullmq');
      await processor.onModuleInit();

      expect(Worker).toHaveBeenCalledWith(
        'deo_score_queue',
        expect.any(Function),
        {
          connection: redisConfig.connection,
          prefix: redisConfig.prefix,
        },
      );
    });
  });

  describe('job processing', () => {
    beforeEach(async () => {
      // Setup for job processing tests
      Object.assign(redisConfig, {
        isEnabled: true,
        connection: { host: 'localhost', port: 6379 },
        prefix: 'test:',
      });
      process.env.ENABLE_QUEUE_PROCESSORS = 'true';

      const { Worker } = require('bullmq');
      await processor.onModuleInit();

      // Get the job handler
      const workerCall = (Worker as jest.Mock).mock.calls[0];
      const jobHandler = workerCall[1];
      (processor as any).jobHandler = jobHandler;
    });

    it('should process job and compute score successfully', async () => {
      const mockSignals: DeoScoreSignals = {
        content: {
          totalPages: 10,
          pagesWithMetadata: 8,
          avgWordCount: 500,
          pagesWithThinContent: 2,
        },
        entities: {
          totalProducts: 20,
          productsWithAnswerBlocks: 15,
          answerabilityScore: 75,
        },
        technical: {
          crawlablePages: 10,
          indexablePages: 9,
          avgLoadTime: 1.5,
        },
        visibility: {
          offsitePresenceScore: 60,
          localDiscoveryScore: null,
        },
      };

      const mockSnapshot = {
        id: 'snapshot-1',
        projectId: 'proj-1',
        breakdown: {
          overall: 70,
          content: 75,
          entities: 70,
          technical: 80,
          visibility: 60,
        },
      };

      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue(mockSignals);
      deoScoreServiceMock.computeAndPersistScoreFromSignals.mockResolvedValue(mockSnapshot);

      const jobHandler = (processor as any).jobHandler;
      const mockJob = {
        data: { projectId: 'proj-1' },
      };

      const result = await jobHandler(mockJob);

      expect(result).toEqual({
        projectId: 'proj-1',
        snapshotId: 'snapshot-1',
      });
      expect(deoSignalsServiceMock.collectSignalsForProject).toHaveBeenCalledWith('proj-1');
      expect(deoScoreServiceMock.computeAndPersistScoreFromSignals).toHaveBeenCalledWith(
        'proj-1',
        mockSignals,
      );
    });

    it('should throw error when score computation fails', async () => {
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        content: { totalPages: 0, pagesWithMetadata: 0, avgWordCount: 0, pagesWithThinContent: 0 },
        entities: { totalProducts: 0, productsWithAnswerBlocks: 0, answerabilityScore: 0 },
        technical: { crawlablePages: 0, indexablePages: 0, avgLoadTime: 0 },
        visibility: { offsitePresenceScore: 0, localDiscoveryScore: null },
      });
      deoScoreServiceMock.computeAndPersistScoreFromSignals.mockRejectedValue(
        new Error('Computation failed'),
      );

      const jobHandler = (processor as any).jobHandler;
      const mockJob = {
        data: { projectId: 'proj-1' },
      };

      await expect(jobHandler(mockJob)).rejects.toThrow('Computation failed');
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

    it('should not throw when worker does not exist', async () => {
      // Worker not initialized (Redis disabled)
      Object.assign(redisConfig, {
        isEnabled: false,
        connection: null,
      });

      await expect(processor.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});

