// Jest unit tests for Automation Engine v1 rule evaluation.
// These tests cover plan gating, trigger handling, and idempotency for
// Answer Block automations without exercising the full BullMQ queue/worker
// pipeline. Full pipeline behavior is covered by integration tests.
//
// Specs referenced:
// - docs/AUTOMATION_ENGINE_SPEC.md (Section 8.7 – Shopify Answer Block Automations)
// - docs/ANSWER_ENGINE_SPEC.md (Phase AE-1.3 – Answer Block Persistence)
//
// Fixtures referenced (from apps/api test helpers):
// - apps/api/test/fixtures/shopify-product.fixtures.ts
// - apps/api/test/fixtures/automation-events.fixtures.ts

import {
  basicShopifyProduct,
  shopifyProductMissingSeo,
  shopifyProductThinDescription,
  shopifyProductNoAnswerBlocks,
} from '../../fixtures/shopify-product.fixtures';
import {
  makeProductSyncedEvent,
  makeIssueDetectedEvent,
  TestPlanId,
} from '../../fixtures/automation-events.fixtures';
import { AutomationService } from '../../../src/projects/automation.service';
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

describe('AutomationService rule-level behavior for Answer Blocks', () => {
  let entitlementsService: EntitlementsService;
  let automationService: AutomationService;
  let shopifyServiceStub: { syncAnswerBlocksToShopify: jest.Mock };

  beforeAll(() => {
    const prisma = testPrisma as any;
    entitlementsService = new EntitlementsService(prisma);
    const aiServiceStub = {
      generateMetadata: jest.fn(),
      generateProductAnswers: jest.fn(),
    } as any;
    shopifyServiceStub = {
      syncAnswerBlocksToShopify: jest.fn(),
    };
    automationService = new AutomationService(
      prisma,
      aiServiceStub,
      entitlementsService,
      shopifyServiceStub as any,
    );
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    if (shopifyServiceStub) {
      shopifyServiceStub.syncAnswerBlocksToShopify.mockReset();
    }
  });

  async function createUserProjectAndProduct(
    plan: TestPlanId,
    productFixture = shopifyProductNoAnswerBlocks,
  ) {
    const user = await testPrisma.user.create({
      data: {
        email: `automation-rules-${plan}-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Automation Rules Test User',
      },
    });

    if (plan !== 'free') {
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan,
          status: 'active',
          stripeCustomerId: `cus_test_${plan}`,
          stripeSubscriptionId: `sub_test_${plan}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const project = await testPrisma.project.create({
      data: {
        name: `Automation Rules Project (${plan})`,
        domain: `automation-rules-${plan}.example.com`,
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

    return { user, project, product };
  }

  it('skips Answer Block automations on the Free plan', async () => {
    const plan: TestPlanId = 'free';
    const { user, product } = await createUserProjectAndProduct(
      plan,
      shopifyProductNoAnswerBlocks,
    );

    // Document the intended triggering event shape.
    const event = makeProductSyncedEvent(shopifyProductNoAnswerBlocks, plan);
    expect(event.type).toBe('product_synced');

    await automationService.triggerAnswerBlockAutomationForProduct(
      product.id,
      user.id,
      'product_synced',
    );

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: { productId: product.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('skip_plan_free');
    expect(logs[0].status).toBe('skipped');
    expect(logs[0].triggerType).toBe('product_synced');
  });

  it('throws when a user tries to trigger automation for a product they do not own', async () => {
    const { user: owner, product } = await createUserProjectAndProduct(
      'pro',
      basicShopifyProduct,
    );

    const otherUser = await testPrisma.user.create({
      data: {
        email: `automation-rules-other-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Other User',
      },
    });

    await expect(
      automationService.triggerAnswerBlockAutomationForProduct(
        product.id,
        otherUser.id,
        'product_synced',
      ),
    ).rejects.toThrow('You do not have access to this product');

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: { productId: product.id },
    });
    expect(logs.length).toBe(0);
  });

  it('is idempotent when a successful automation already exists', async () => {
    const { user, project, product } = await createUserProjectAndProduct(
      'pro',
      shopifyProductMissingSeo,
    );

    await testPrisma.answerBlockAutomationLog.create({
      data: {
        projectId: project.id,
        productId: product.id,
        triggerType: 'product_synced',
        planId: 'pro',
        action: 'generate_missing',
        status: 'succeeded',
      },
    });

    await automationService.triggerAnswerBlockAutomationForProduct(
      product.id,
      user.id,
      'product_synced',
    );

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: { productId: product.id, triggerType: 'product_synced' },
      orderBy: { createdAt: 'asc' },
    });
    const succeededLogs = logs.filter((log) => log.status === 'succeeded');
    expect(succeededLogs).toHaveLength(1);
  });

  it('returns silently when product does not exist', async () => {
    const user = await testPrisma.user.create({
      data: {
        email: `automation-rules-missing-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Missing Product User',
      },
    });

    const missingProductId = 'non-existent-product-id';

    await expect(
      automationService.triggerAnswerBlockAutomationForProduct(
        missingProductId,
        user.id,
        'issue_detected',
      ),
    ).resolves.not.toThrow();

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: { productId: missingProductId },
    });
    expect(logs.length).toBe(0);
  });

  it('skips manual Shopify sync on the Free plan', async () => {
    const plan: TestPlanId = 'free';
    const { user, project, product } = await createUserProjectAndProduct(
      plan,
      shopifyProductNoAnswerBlocks,
    );

    await testPrisma.answerBlock.create({
      data: {
        productId: product.id,
        questionId: 'what_is_it',
        questionText: 'What is it?',
        answerText: 'A canonical test answer',
        confidenceScore: 0.9,
        sourceType: 'generated',
        sourceFieldsUsed: [],
      },
    });

    const result = await automationService.syncAnswerBlocksToShopifyNow(
      product.id,
      user.id,
    );

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('plan_not_entitled');
    expect(result.productId).toBe(product.id);
    expect(result.projectId).toBe(project.id);

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: { productId: product.id, triggerType: 'manual_sync' },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('answer_blocks_synced_to_shopify');
    expect(logs[0].status).toBe('skipped');
    expect(logs[0].errorMessage).toContain('plan_not_entitled');

    expect(shopifyServiceStub.syncAnswerBlocksToShopify).not.toHaveBeenCalled();
  });

  it('skips manual Shopify sync when project toggle is off', async () => {
    const plan: TestPlanId = 'pro';
    const { user, project, product } = await createUserProjectAndProduct(
      plan,
      shopifyProductNoAnswerBlocks,
    );

    await testPrisma.project.update({
      where: { id: project.id },
      data: {
        aeoSyncToShopifyMetafields: false,
      },
    });

    await testPrisma.answerBlock.create({
      data: {
        productId: product.id,
        questionId: 'what_is_it',
        questionText: 'What is it?',
        answerText: 'A canonical test answer',
        confidenceScore: 0.9,
        sourceType: 'generated',
        sourceFieldsUsed: [],
      },
    });

    const result = await automationService.syncAnswerBlocksToShopifyNow(
      product.id,
      user.id,
    );

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('sync_toggle_off');

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: { productId: product.id, triggerType: 'manual_sync' },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('answer_blocks_synced_to_shopify');
    expect(logs[0].status).toBe('skipped');
    expect(logs[0].errorMessage).toContain('sync_toggle_off');

    expect(shopifyServiceStub.syncAnswerBlocksToShopify).not.toHaveBeenCalled();
  });

  it('manually syncs Answer Blocks to Shopify when toggle is on and plan is entitled', async () => {
    const plan: TestPlanId = 'pro';
    const { user, project, product } = await createUserProjectAndProduct(
      plan,
      shopifyProductNoAnswerBlocks,
    );

    await testPrisma.project.update({
      where: { id: project.id },
      data: {
        aeoSyncToShopifyMetafields: true,
      },
    });

    await testPrisma.answerBlock.create({
      data: {
        productId: product.id,
        questionId: 'what_is_it',
        questionText: 'What is it?',
        answerText: 'A canonical test answer',
        confidenceScore: 0.9,
        sourceType: 'generated',
        sourceFieldsUsed: [],
      },
    });

    shopifyServiceStub.syncAnswerBlocksToShopify.mockResolvedValue({
      productId: product.id,
      shopDomain: 'test-store.myshopify.com',
      syncedCount: 2,
      skippedUnknownQuestionIds: [],
      errors: [],
    });

    const result = await automationService.syncAnswerBlocksToShopifyNow(
      product.id,
      user.id,
    );

    expect(result.status).toBe('succeeded');
    expect(result.syncedCount).toBe(2);
    expect(result.errors).toEqual([]);

    expect(shopifyServiceStub.syncAnswerBlocksToShopify).toHaveBeenCalledTimes(1);
    expect(shopifyServiceStub.syncAnswerBlocksToShopify).toHaveBeenCalledWith(
      product.id,
    );

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: { productId: product.id, triggerType: 'manual_sync' },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('answer_blocks_synced_to_shopify');
    expect(logs[0].status).toBe('succeeded');
  });

  it('skips manual Shopify sync when the daily cap is reached', async () => {
    const plan: TestPlanId = 'pro';
    const { user, project, product } = await createUserProjectAndProduct(
      plan,
      shopifyProductNoAnswerBlocks,
    );

    await testPrisma.project.update({
      where: { id: project.id },
      data: {
        aeoSyncToShopifyMetafields: true,
      },
    });

    await testPrisma.answerBlock.create({
      data: {
        productId: product.id,
        questionId: 'what_is_it',
        questionText: 'What is it?',
        answerText: 'A canonical test answer',
        confidenceScore: 0.9,
        sourceType: 'generated',
        sourceFieldsUsed: [],
      },
    });

    const { limit } = await entitlementsService.getAiSuggestionLimit(user.id);
    const now = new Date();
    for (let i = 0; i < limit; i += 1) {
      await testPrisma.aiUsageEvent.create({
        data: {
          userId: user.id,
          projectId: project.id,
          feature: 'shopify_answer_block_sync',
          createdAt: now,
        },
      });
    }

    const result = await automationService.syncAnswerBlocksToShopifyNow(
      product.id,
      user.id,
    );

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('daily_cap_reached');

    expect(shopifyServiceStub.syncAnswerBlocksToShopify).not.toHaveBeenCalled();

    const logs = await testPrisma.answerBlockAutomationLog.findMany({
      where: { productId: product.id, triggerType: 'manual_sync' },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('skipped');
    expect(logs[0].action).toBe('answer_blocks_synced_to_shopify');
    expect(logs[0].errorMessage).toContain('daily_cap_reached');
  });
});
