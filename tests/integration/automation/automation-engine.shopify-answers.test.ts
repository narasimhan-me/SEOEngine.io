// Integration tests for Automation Engine v1 – Shopify Answer Block Automations.
// These tests exercise the end-to-end backend pipeline for Shopify Answer Block
// automations (Section 8.7) using a NestJS testing module wired to the real
// Prisma test database and a test-only BullMQ stub.
//
// Specs referenced:
// - docs/AUTOMATION_ENGINE_SPEC.md (Section 8.7 – Shopify Answer Block Automations)
// - docs/ANSWER_ENGINE_SPEC.md (Phase AE-1.3 – Answer Block Persistence)
// - IMPLEMENTATION_PLAN.md (Phase AE-1.3 and v1 Shopify-Only Launch Scope)
// - docs/manual-testing/automation-engine-v1-shopify-answer-block-automations.md
//
// Fixtures referenced (from apps/api test helpers):
// - apps/api/test/fixtures/shopify-product.fixtures.ts
// - apps/api/test/fixtures/automation-events.fixtures.ts
//
// Scenarios covered:
// 1) product_synced (Pro plan, no existing Answer Blocks) → generate_missing → persistence + logging.
// 2) issue_detected (Pro plan, weak Answer Blocks) → regenerate_weak → updated persistence + before/after logging.
// 3) Free vs Pro entitlement behavior for the same triggers.
// 4) Idempotency when a successful automation already exists for a product/trigger.
//
// BullMQ is stubbed so that queue.add(...) synchronously invokes the captured
// worker processor, allowing tests to observe the complete job side effects
// without requiring a real Redis instance.

import { Test, TestingModule } from '@nestjs/testing';
import { AutomationService } from '../../../apps/api/src/projects/automation.service';
import { AnswerBlockAutomationProcessor } from '../../../apps/api/src/projects/answer-block-automation.processor';
import { AnswerBlockService } from '../../../apps/api/src/products/answer-block.service';
import { AnswerEngineService } from '../../../apps/api/src/projects/answer-engine.service';
import { EntitlementsService } from '../../../apps/api/src/billing/entitlements.service';
import { PrismaService } from '../../../apps/api/src/prisma.service';
import { AiService } from '../../../apps/api/src/ai/ai.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../../apps/api/test/utils/test-db';
import {
  basicShopifyProduct,
  shopifyProductMissingSeo,
  shopifyProductThinDescription,
  shopifyProductNoAnswerBlocks,
} from '../../../apps/api/test/fixtures/shopify-product.fixtures';
import { TestPlanId } from '../../../apps/api/test/fixtures/automation-events.fixtures';

// Capture the worker processor created by AnswerBlockAutomationProcessor so
// that the Queue stub can invoke it synchronously.
let capturedProcessor:
  | ((job: { data: any }) => Promise<void> | void)
  | null = null;

jest.mock('bullmq', () => {
  class Job<T = any> {
    data: T;
    constructor(data: T) {
      this.data = data;
    }
  }

  class Worker<T = any> {
    constructor(
      queueName: string,
      processor: (job: Job<T>) => Promise<void> | void,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      opts: any,
    ) {
      // Store the processor so tests can exercise the job handler via the Queue stub.
      capturedProcessor = processor as any;
    }

    async close(): Promise<void> {
      // no-op for tests
    }
  }

  class Queue<T = any> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(queueName: string, opts: any) {
      // no-op
    }

    async add(name: string, data: T, _opts?: any): Promise<void> {
      if (capturedProcessor) {
        const job = new Job<T>(data);
        await Promise.resolve(capturedProcessor(job));
      }
    }
  }

  return { Job, Worker, Queue };
});

describe('Automation Engine v1 – Shopify Answer Block Automations (integration)', () => {
  let moduleRef: TestingModule;
  let automationService: AutomationService;
  let answerBlockService: AnswerBlockService;
  let aiServiceStub: {
    generateProductAnswers: jest.Mock;
    generateMetadata: jest.Mock;
  };

  beforeAll(async () => {
    aiServiceStub = {
      generateProductAnswers: jest.fn(async (product: { id: string }) => [
        {
          questionId: 'what_is_it',
          question: 'What is this product?',
          answer: `Stubbed Answer Block for product ${product.id}`,
          confidence: 0.95,
          sourceType: 'test',
          factsUsed: ['title', 'description'],
        },
      ]),
      generateMetadata: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: testPrisma,
        },
        AnswerBlockService,
        AnswerEngineService,
        EntitlementsService,
        {
          provide: AiService,
          useValue: aiServiceStub,
        },
        AutomationService,
        AnswerBlockAutomationProcessor,
      ],
    }).compile();

    automationService = moduleRef.get(AutomationService);
    answerBlockService = moduleRef.get(AnswerBlockService);

    const processor = moduleRef.get(AnswerBlockAutomationProcessor);
    // Initialize the worker to capture the job processor callback.
    await (processor as any).onModuleInit?.();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
    await moduleRef.close();
  });

  beforeEach(async () => {
    aiServiceStub.generateProductAnswers.mockClear();
    await cleanupTestDb();
  });

  async function createUserProjectAndProduct(
    plan: TestPlanId,
    productFixture = shopifyProductNoAnswerBlocks,
    answerBlockOptions?: { confidenceScores?: number[] },
  ) {
    const user = await testPrisma.user.create({
      data: {
        email: `automation-int-${plan}-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Automation Integration Test User',
      },
    });

    if (plan !== 'free') {
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan,
          status: 'active',
          stripeCustomerId: `cus_int_${plan}`,
          stripeSubscriptionId: `sub_int_${plan}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const project = await testPrisma.project.create({
      data: {
        name: `Automation Integration Project (${plan})`,
        domain: `automation-int-${plan}.example.com`,
        userId: user.id,
      },
    });

    const product = await testPrisma.product.create({
      data: {
        projectId: project.id,
        externalId: String(productFixture.id),
        title: productFixture.title,
        description: productFixture.body_html,
        seoTitle:
          (productFixture as any).metafields_global_title_tag ?? null,
        seoDescription:
          (productFixture as any).metafields_global_description_tag ?? null,
      },
    });

    if (answerBlockOptions?.confidenceScores?.length) {
      for (const [index, confidenceScore] of answerBlockOptions.confidenceScores.entries()) {
        const questionId =
          index === 0 ? 'what_is_it' : 'who_is_it_for';
        await testPrisma.answerBlock.create({
          data: {
            productId: product.id,
            questionId,
            questionText: 'Existing Answer Block',
            answerText: `Existing answer with confidence ${confidenceScore}`,
            confidenceScore,
            sourceType: 'existing',
            sourceFieldsUsed: [],
          },
        });
      }
    }

    return { user, project, product };
  }

  it('runs generate_missing automation for Pro plan on product_synced when no Answer Blocks exist', async () => {
    const { user, product } = await createUserProjectAndProduct(
      'pro',
      basicShopifyProduct,
    );

    await automationService.triggerAnswerBlockAutomationForProduct(
      product.id,
      user.id,
      'product_synced',
    );

    const blocks = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].questionId).toBe('what_is_it');
    expect(blocks[0].answerText).toContain('Stubbed Answer Block');

    const log = await testPrisma.answerBlockAutomationLog.findFirst({
      where: {
        productId: product.id,
        triggerType: 'product_synced',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.status).toBe('succeeded');
    expect(log?.action).toBe('generate_missing');
  });

  it('runs regenerate_weak automation for Pro plan on issue_detected when weak Answer Blocks exist', async () => {
    const { user, product } = await createUserProjectAndProduct(
      'pro',
      shopifyProductThinDescription,
      { confidenceScores: [0.5] }, // weak Answer Block
    );

    const beforeBlocks = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(beforeBlocks).toHaveLength(1);
    const originalAnswerText = beforeBlocks[0].answerText;

    await automationService.triggerAnswerBlockAutomationForProduct(
      product.id,
      user.id,
      'issue_detected',
    );

    const afterBlocks = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(afterBlocks).toHaveLength(1);
    expect(afterBlocks[0].answerText).not.toBe(originalAnswerText);
    expect(afterBlocks[0].answerText).toContain('Stubbed Answer Block');

    const log = await testPrisma.answerBlockAutomationLog.findFirst({
      where: {
        productId: product.id,
        triggerType: 'issue_detected',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.status).toBe('succeeded');
    expect(log?.action).toBe('regenerate_weak');
    expect(log?.beforeAnswerBlocks).toBeTruthy();
    expect(log?.afterAnswerBlocks).toBeTruthy();
  });

  it('skips Answer Block automation on Free plan while persisting no Answer Blocks', async () => {
    const { user, product } = await createUserProjectAndProduct(
      'free',
      shopifyProductNoAnswerBlocks,
    );

    await automationService.triggerAnswerBlockAutomationForProduct(
      product.id,
      user.id,
      'product_synced',
    );

    const blocks = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(blocks.length).toBe(0);
    expect(aiServiceStub.generateProductAnswers).not.toHaveBeenCalled();

    const log = await testPrisma.answerBlockAutomationLog.findFirst({
      where: {
        productId: product.id,
        triggerType: 'product_synced',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
    expect(log?.status).toBe('skipped');
    expect(log?.action).toBe('skip_plan_free');
  });

  it('is idempotent when a successful automation already exists for a product/trigger', async () => {
    const { user, project, product } = await createUserProjectAndProduct(
      'pro',
      shopifyProductMissingSeo,
    );

    await automationService.triggerAnswerBlockAutomationForProduct(
      product.id,
      user.id,
      'product_synced',
    );

    const firstLog = await testPrisma.answerBlockAutomationLog.findFirst({
      where: {
        productId: product.id,
        triggerType: 'product_synced',
        status: 'succeeded',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(firstLog).not.toBeNull();

    aiServiceStub.generateProductAnswers.mockClear();

    await automationService.triggerAnswerBlockAutomationForProduct(
      product.id,
      user.id,
      'product_synced',
    );

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: {
        productId: product.id,
        triggerType: 'product_synced',
      },
      orderBy: { createdAt: 'asc' },
    });
    const succeededLogs = logs.filter((log) => log.status === 'succeeded');
    expect(succeededLogs).toHaveLength(1);
    expect(aiServiceStub.generateProductAnswers).not.toHaveBeenCalled();
  });
});
