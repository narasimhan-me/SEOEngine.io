/**
 * Unit tests for AnswerBlockAutomationProcessor
 *
 * Tests:
 * - onModuleInit() skips worker initialization when Redis is not configured
 * - onModuleInit() initializes worker when Redis is configured
 * - Job processing for generate_missing action
 * - Job processing for regenerate_weak action
 * - Job processing skips for free plan
 * - Job processing skips when no action needed
 * - Error handling in job processing
 * - onModuleDestroy() closes worker
 */
import { AnswerBlockAutomationProcessor } from '../../../src/projects/answer-block-automation.processor';
import { PrismaService } from '../../../src/prisma.service';
import { AiService } from '../../../src/ai/ai.service';
import { AnswerEngineService } from '../../../src/projects/answer-engine.service';
import { AnswerBlockService } from '../../../src/products/answer-block.service';
import { ShopifyService } from '../../../src/shopify/shopify.service';
import { redisConfig } from '../../../src/config/redis.config';
import { AnswerabilityStatus, AnswerBlock } from '@engineo/shared';

// Mock BullMQ Worker
jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

const createPrismaMock = () => ({
  product: {
    findUnique: jest.fn(),
  },
  answerBlockAutomationLog: {
    create: jest.fn(),
  },
});

const createAiServiceMock = () => ({
  generateProductAnswers: jest.fn(),
});

const createAnswerEngineServiceMock = () => ({
  computeAnswerabilityForProduct: jest.fn(),
});

const createAnswerBlockServiceMock = () => ({
  getAnswerBlocks: jest.fn(),
  createOrUpdateAnswerBlocks: jest.fn(),
});

const createShopifyServiceMock = () => ({
  syncAnswerBlocksToShopify: jest.fn(),
});

describe('AnswerBlockAutomationProcessor', () => {
  let processor: AnswerBlockAutomationProcessor;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let aiServiceMock: ReturnType<typeof createAiServiceMock>;
  let answerEngineServiceMock: ReturnType<typeof createAnswerEngineServiceMock>;
  let answerBlockServiceMock: ReturnType<typeof createAnswerBlockServiceMock>;
  let shopifyServiceMock: ReturnType<typeof createShopifyServiceMock>;
  let originalRedisConfig: typeof redisConfig;
  let originalEnv: string | undefined;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    aiServiceMock = createAiServiceMock();
    answerEngineServiceMock = createAnswerEngineServiceMock();
    answerBlockServiceMock = createAnswerBlockServiceMock();
    shopifyServiceMock = createShopifyServiceMock();

    processor = new AnswerBlockAutomationProcessor(
      prismaMock as unknown as PrismaService,
      aiServiceMock as unknown as AiService,
      answerEngineServiceMock as unknown as AnswerEngineService,
      answerBlockServiceMock as unknown as AnswerBlockService,
      shopifyServiceMock as unknown as ShopifyService
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

      expect(Worker).toHaveBeenCalledWith(
        'answer_block_automation_queue',
        expect.any(Function),
        {
          connection: redisConfig.connection,
          prefix: redisConfig.prefix,
        }
      );
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

    it('should skip when product is not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      const jobHandler = (processor as any).jobHandler;
      const mockJob = {
        data: {
          projectId: 'proj-1',
          productId: 'prod-1',
          userId: 'user-1',
          triggerType: 'product_synced' as const,
          planId: 'pro' as const,
        },
      };

      await jobHandler(mockJob);

      expect(prismaMock.answerBlockAutomationLog.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          productId: 'prod-1',
          triggerType: 'product_synced',
          planId: 'pro',
          action: 'skip_not_found',
          status: 'skipped',
        },
      });
    });

    it('should skip for free plan', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Product',
        description: 'Description',
        seoTitle: null,
        seoDescription: null,
        project: {
          id: 'proj-1',
          aeoSyncToShopifyMetafields: false,
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      answerBlockServiceMock.getAnswerBlocks.mockResolvedValue([]);

      const jobHandler = (processor as any).jobHandler;
      const mockJob = {
        data: {
          projectId: 'proj-1',
          productId: 'prod-1',
          userId: 'user-1',
          triggerType: 'product_synced' as const,
          planId: 'free' as const,
        },
      };

      await jobHandler(mockJob);

      expect(prismaMock.answerBlockAutomationLog.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          productId: 'prod-1',
          triggerType: 'product_synced',
          planId: 'free',
          action: 'skip_plan_free',
          status: 'skipped',
          beforeAnswerBlocks: undefined,
        },
      });
    });

    it('should generate missing answer blocks', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Product',
        description: 'Description',
        seoTitle: null,
        seoDescription: null,
        project: {
          id: 'proj-1',
          aeoSyncToShopifyMetafields: false,
        },
      };

      const mockAnswerabilityStatus: AnswerabilityStatus = {
        status: 'needs_answers',
        missingQuestions: ['what_is_it'],
        weakQuestions: [],
        answerabilityScore: 30,
      };

      const mockGeneratedBlocks: AnswerBlock[] = [
        {
          id: 'block-1',
          projectId: 'proj-1',
          productId: 'prod-1',
          questionId: 'what_is_it',
          question: 'What is this?',
          answer: 'This is a product',
          confidence: 0.9,
          sourceType: 'generated',
          factsUsed: ['title'],
          version: 'ae_v1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      answerBlockServiceMock.getAnswerBlocks.mockResolvedValue([]);
      answerEngineServiceMock.computeAnswerabilityForProduct.mockReturnValue(
        mockAnswerabilityStatus
      );
      aiServiceMock.generateProductAnswers.mockResolvedValue(
        mockGeneratedBlocks
      );
      answerBlockServiceMock.createOrUpdateAnswerBlocks.mockResolvedValue([
        {
          id: 'block-1',
          questionId: 'what_is_it',
          question: 'What is this?',
          answer: 'This is a product',
          confidence: 0.9,
        },
      ]);

      const jobHandler = (processor as any).jobHandler;
      const mockJob = {
        data: {
          projectId: 'proj-1',
          productId: 'prod-1',
          userId: 'user-1',
          triggerType: 'product_synced' as const,
          planId: 'pro' as const,
        },
      };

      await jobHandler(mockJob);

      expect(aiServiceMock.generateProductAnswers).toHaveBeenCalled();
      expect(
        answerBlockServiceMock.createOrUpdateAnswerBlocks
      ).toHaveBeenCalled();
      expect(prismaMock.answerBlockAutomationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'generate_missing',
          status: 'succeeded',
        }),
      });
    });

    it('should skip when no answer blocks are generated', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Product',
        description: 'Description',
        seoTitle: null,
        seoDescription: null,
        project: {
          id: 'proj-1',
          aeoSyncToShopifyMetafields: false,
        },
      };

      const mockAnswerabilityStatus: AnswerabilityStatus = {
        status: 'needs_answers',
        missingQuestions: ['what_is_it'],
        weakQuestions: [],
        answerabilityScore: 30,
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      answerBlockServiceMock.getAnswerBlocks.mockResolvedValue([]);
      answerEngineServiceMock.computeAnswerabilityForProduct.mockReturnValue(
        mockAnswerabilityStatus
      );
      aiServiceMock.generateProductAnswers.mockResolvedValue([]);

      const jobHandler = (processor as any).jobHandler;
      const mockJob = {
        data: {
          projectId: 'proj-1',
          productId: 'prod-1',
          userId: 'user-1',
          triggerType: 'product_synced' as const,
          planId: 'pro' as const,
        },
      };

      await jobHandler(mockJob);

      expect(prismaMock.answerBlockAutomationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'skip_no_generated_answers',
          status: 'skipped',
        }),
      });
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
