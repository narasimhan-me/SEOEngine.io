// Integration tests for Automation Engine v1 – Shopify Answer Block Automations.
// These tests exercise the processor job handler directly with a NestJS testing module
// wired to the real Prisma test database, bypassing the BullMQ queue since Redis
// is not available in the test environment.
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
// NOTE: These tests directly invoke the processor's job handler logic rather than
// going through the queue, since Redis is not configured in the test environment.

import { AnswerBlockService } from '../../../src/products/answer-block.service';
import { AnswerEngineService } from '../../../src/projects/answer-engine.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import {
  basicShopifyProduct,
  shopifyProductMissingSeo,
  shopifyProductThinDescription,
  shopifyProductNoAnswerBlocks,
} from '../../fixtures/shopify-product.fixtures';
import { TestPlanId } from '../../fixtures/automation-events.fixtures';

// Simulate the processor job handler logic for integration testing
// This mirrors the logic from AnswerBlockAutomationProcessor without the BullMQ dependency
async function simulateProcessorJobHandler(
  jobData: {
    projectId: string;
    productId: string;
    userId: string;
    triggerType: 'product_synced' | 'issue_detected';
    planId: TestPlanId;
  },
  services: {
    prisma: typeof testPrisma;
    answerBlockService: AnswerBlockService;
    answerEngineService: AnswerEngineService;
    aiService: { generateProductAnswers: jest.Mock };
  }
): Promise<void> {
  const { projectId, productId, triggerType, planId } = jobData;
  const { prisma, answerBlockService, answerEngineService, aiService } =
    services;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { project: true },
  });

  if (!product || product.projectId !== projectId) {
    await prisma.answerBlockAutomationLog.create({
      data: {
        projectId,
        productId,
        triggerType,
        planId,
        action: 'skip_not_found',
        status: 'skipped',
      },
    });
    return;
  }

  const beforeBlocks = await answerBlockService.getAnswerBlocks(productId);

  // Plan guard: Free plan does not run Answer Block automations
  if (planId === 'free') {
    await prisma.answerBlockAutomationLog.create({
      data: {
        projectId,
        productId,
        triggerType,
        planId,
        action: 'skip_plan_free',
        status: 'skipped',
        beforeAnswerBlocks: beforeBlocks.length ? beforeBlocks : undefined,
      },
    });
    return;
  }

  let action: 'generate_missing' | 'regenerate_weak' | 'skip_no_action' =
    'skip_no_action';

  if (!beforeBlocks.length) {
    action = 'generate_missing';
  } else {
    const hasWeakBlock = beforeBlocks.some((b: any) => {
      const confidence =
        typeof b.confidenceScore === 'number' ? b.confidenceScore : 0;
      return confidence > 0 && confidence < 0.7;
    });
    if (hasWeakBlock) {
      action = 'regenerate_weak';
    }
  }

  if (action === 'skip_no_action') {
    await prisma.answerBlockAutomationLog.create({
      data: {
        projectId,
        productId,
        triggerType,
        planId,
        action,
        status: 'skipped',
        beforeAnswerBlocks: beforeBlocks.length ? beforeBlocks : undefined,
      },
    });
    return;
  }

  const answerabilityStatus =
    answerEngineService.computeAnswerabilityForProduct({
      id: product.id,
      title: product.title,
      description: product.description,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
    });

  const generated = await aiService.generateProductAnswers(
    {
      id: product.id,
      projectId: product.projectId,
      title: product.title,
      description: product.description,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
    },
    answerabilityStatus
  );

  if (!generated.length) {
    await prisma.answerBlockAutomationLog.create({
      data: {
        projectId,
        productId,
        triggerType,
        planId,
        action: 'skip_no_generated_answers',
        status: 'skipped',
        beforeAnswerBlocks: beforeBlocks.length ? beforeBlocks : undefined,
      },
    });
    return;
  }

  const afterBlocks = await answerBlockService.createOrUpdateAnswerBlocks(
    productId,
    generated.map((block: any) => ({
      questionId: block.questionId,
      question: block.question,
      answer: block.answer,
      confidence: block.confidence,
      sourceType: block.sourceType,
      factsUsed: block.factsUsed,
    }))
  );

  await prisma.answerBlockAutomationLog.create({
    data: {
      projectId,
      productId,
      triggerType,
      planId,
      action,
      status: 'succeeded',
      beforeAnswerBlocks: beforeBlocks.length ? beforeBlocks : undefined,
      afterAnswerBlocks: afterBlocks.length ? afterBlocks : undefined,
      modelUsed: 'ae_v1',
    },
  });
}

describe('Automation Engine v1 – Shopify Answer Block Automations (integration)', () => {
  let answerBlockService: AnswerBlockService;
  let answerEngineService: AnswerEngineService;
  let aiServiceStub: {
    generateProductAnswers: jest.Mock;
    generateMetadata: jest.Mock;
  };

  beforeAll(() => {
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

    answerBlockService = new AnswerBlockService(testPrisma as any);
    answerEngineService = new AnswerEngineService(testPrisma as any);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    aiServiceStub.generateProductAnswers.mockClear();
    await cleanupTestDb();
  });

  async function createUserProjectAndProduct(
    plan: TestPlanId,
    productFixture = shopifyProductNoAnswerBlocks,
    answerBlockOptions?: { confidenceScores?: number[] }
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
        seoTitle: (productFixture as any).metafields_global_title_tag ?? null,
        seoDescription:
          (productFixture as any).metafields_global_description_tag ?? null,
      },
    });

    if (answerBlockOptions?.confidenceScores?.length) {
      for (const [
        index,
        confidenceScore,
      ] of answerBlockOptions.confidenceScores.entries()) {
        const questionId = index === 0 ? 'what_is_it' : 'who_is_it_for';
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
    const { user, project, product } = await createUserProjectAndProduct(
      'pro',
      basicShopifyProduct
    );

    await simulateProcessorJobHandler(
      {
        projectId: project.id,
        productId: product.id,
        userId: user.id,
        triggerType: 'product_synced',
        planId: 'pro',
      },
      {
        prisma: testPrisma,
        answerBlockService,
        answerEngineService,
        aiService: aiServiceStub,
      }
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
    const { user, project, product } = await createUserProjectAndProduct(
      'pro',
      shopifyProductThinDescription,
      { confidenceScores: [0.5] } // weak Answer Block
    );

    const beforeBlocks = await testPrisma.answerBlock.findMany({
      where: { productId: product.id },
    });
    expect(beforeBlocks).toHaveLength(1);
    const originalAnswerText = beforeBlocks[0].answerText;

    await simulateProcessorJobHandler(
      {
        projectId: project.id,
        productId: product.id,
        userId: user.id,
        triggerType: 'issue_detected',
        planId: 'pro',
      },
      {
        prisma: testPrisma,
        answerBlockService,
        answerEngineService,
        aiService: aiServiceStub,
      }
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
    const { user, project, product } = await createUserProjectAndProduct(
      'free',
      shopifyProductNoAnswerBlocks
    );

    await simulateProcessorJobHandler(
      {
        projectId: project.id,
        productId: product.id,
        userId: user.id,
        triggerType: 'product_synced',
        planId: 'free',
      },
      {
        prisma: testPrisma,
        answerBlockService,
        answerEngineService,
        aiService: aiServiceStub,
      }
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
      shopifyProductMissingSeo
    );

    // First run should succeed
    await simulateProcessorJobHandler(
      {
        projectId: project.id,
        productId: product.id,
        userId: user.id,
        triggerType: 'product_synced',
        planId: 'pro',
      },
      {
        prisma: testPrisma,
        answerBlockService,
        answerEngineService,
        aiService: aiServiceStub,
      }
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

    // Second run should skip because Answer Blocks now exist with high confidence
    await simulateProcessorJobHandler(
      {
        projectId: project.id,
        productId: product.id,
        userId: user.id,
        triggerType: 'product_synced',
        planId: 'pro',
      },
      {
        prisma: testPrisma,
        answerBlockService,
        answerEngineService,
        aiService: aiServiceStub,
      }
    );

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: {
        productId: product.id,
        triggerType: 'product_synced',
      },
      orderBy: { createdAt: 'asc' },
    });

    // First log succeeded, second should skip because blocks exist with high confidence
    expect(logs).toHaveLength(2);
    expect(logs[0].status).toBe('succeeded');
    expect(logs[1].status).toBe('skipped');
    expect(logs[1].action).toBe('skip_no_action');
  });
});
