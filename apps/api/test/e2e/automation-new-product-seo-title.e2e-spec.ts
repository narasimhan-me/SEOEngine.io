import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { AutomationService } from '../../src/projects/automation.service';
import { AutomationIssueType, AutomationTargetType } from '@prisma/client';

async function createUserAndProject(
  prisma: typeof testPrisma
): Promise<{ userId: string; projectId: string }> {
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      password: 'hashed-password',
      name: 'Test User',
    },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Automation Test Project',
      domain: 'automation-test.example.com',
      userId: user.id,
    },
  });

  return { userId: user.id, projectId: project.id };
}

describe('Automation New Product SEO Title (e2e)', () => {
  let app: INestApplication;
  let automationService: AutomationService;

  beforeAll(async () => {
    app = await createTestApp();
    automationService = app.get(AutomationService);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  describe('runNewProductSeoTitleAutomation', () => {
    it('creates AutomationSuggestion for new product with missing SEO fields', async () => {
      const { userId, projectId } = await createUserAndProject(testPrisma);

      // Create a product with missing SEO fields
      const product = await testPrisma.product.create({
        data: {
          projectId,
          externalId: 'shopify-123',
          title: 'Handcrafted Leather Wallet',
          description:
            'Premium leather wallet made from genuine Italian leather. Features multiple card slots and a coin pocket.',
          seoTitle: null,
          seoDescription: null,
        },
      });

      // Run the automation
      await automationService.runNewProductSeoTitleAutomation(
        projectId,
        product.id,
        userId
      );

      // Verify AutomationSuggestion was created
      const suggestion = await testPrisma.automationSuggestion.findFirst({
        where: {
          projectId,
          targetId: product.id,
          targetType: AutomationTargetType.PRODUCT,
          issueType: AutomationIssueType.MISSING_METADATA,
        },
      });

      expect(suggestion).not.toBeNull();
      expect(suggestion?.source).toBe('automation_new_product_v1');
      expect(suggestion?.suggestedTitle).toBeTruthy();
      expect(suggestion?.suggestedDescription).toBeTruthy();
    });

    it('skips automation when SEO fields are already populated', async () => {
      const { userId, projectId } = await createUserAndProject(testPrisma);

      // Create a product with populated SEO fields
      const product = await testPrisma.product.create({
        data: {
          projectId,
          externalId: 'shopify-456',
          title: 'Premium Watch',
          description: 'A beautiful timepiece',
          seoTitle: 'Premium Watch | Best Quality',
          seoDescription: 'Shop our premium watch collection.',
        },
      });

      // Run the automation
      await automationService.runNewProductSeoTitleAutomation(
        projectId,
        product.id,
        userId
      );

      // Verify no AutomationSuggestion was created
      const suggestion = await testPrisma.automationSuggestion.findFirst({
        where: {
          projectId,
          targetId: product.id,
          targetType: AutomationTargetType.PRODUCT,
          issueType: AutomationIssueType.MISSING_METADATA,
        },
      });

      expect(suggestion).toBeNull();
    });

    it('records AI usage after generating metadata', async () => {
      const { userId, projectId } = await createUserAndProject(testPrisma);

      // Create a product
      const product = await testPrisma.product.create({
        data: {
          projectId,
          externalId: 'shopify-789',
          title: 'Organic Green Tea',
          description: 'Imported directly from Japan. Hand-picked leaves.',
        },
      });

      // Run the automation
      await automationService.runNewProductSeoTitleAutomation(
        projectId,
        product.id,
        userId
      );

      // Verify AI usage was recorded
      const usageEvent = await testPrisma.aiUsageEvent.findFirst({
        where: {
          userId,
          projectId,
          feature: 'automation_new_product',
        },
      });

      expect(usageEvent).not.toBeNull();
    });

    it('auto-applies metadata for Pro plan users', async () => {
      const { userId, projectId } = await createUserAndProject(testPrisma);

      // Create a Pro subscription for the user
      await testPrisma.subscription.create({
        data: {
          userId,
          plan: 'pro',
          status: 'active',
          stripeCustomerId: 'cus_test_pro',
          stripeSubscriptionId: 'sub_test_pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create a product with missing SEO fields
      const product = await testPrisma.product.create({
        data: {
          projectId,
          externalId: 'shopify-pro-123',
          title: 'Premium Yoga Mat',
          description:
            'Eco-friendly yoga mat made from natural rubber. Non-slip surface, extra thick padding.',
        },
      });

      // Run the automation
      await automationService.runNewProductSeoTitleAutomation(
        projectId,
        product.id,
        userId
      );

      // Verify AutomationSuggestion was created AND applied
      const suggestion = await testPrisma.automationSuggestion.findFirst({
        where: {
          projectId,
          targetId: product.id,
          targetType: AutomationTargetType.PRODUCT,
          issueType: AutomationIssueType.MISSING_METADATA,
        },
      });

      expect(suggestion).not.toBeNull();
      expect(suggestion?.applied).toBe(true);
      expect(suggestion?.appliedAt).not.toBeNull();

      // Verify product was updated
      const updatedProduct = await testPrisma.product.findUnique({
        where: { id: product.id },
      });

      expect(updatedProduct?.seoTitle).toBeTruthy();
      expect(updatedProduct?.seoDescription).toBeTruthy();
    });

    it('does not auto-apply for Free plan users', async () => {
      const { userId, projectId } = await createUserAndProject(testPrisma);

      // No subscription = Free plan

      // Create a product with missing SEO fields
      const product = await testPrisma.product.create({
        data: {
          projectId,
          externalId: 'shopify-free-123',
          title: 'Basic Cotton T-Shirt',
          description:
            'Simple and comfortable cotton t-shirt. Available in multiple colors.',
        },
      });

      // Run the automation
      await automationService.runNewProductSeoTitleAutomation(
        projectId,
        product.id,
        userId
      );

      // Verify AutomationSuggestion was created but NOT applied
      const suggestion = await testPrisma.automationSuggestion.findFirst({
        where: {
          projectId,
          targetId: product.id,
          targetType: AutomationTargetType.PRODUCT,
          issueType: AutomationIssueType.MISSING_METADATA,
        },
      });

      expect(suggestion).not.toBeNull();
      expect(suggestion?.applied).toBe(false);
      expect(suggestion?.appliedAt).toBeNull();

      // Verify product was NOT updated
      const unchangedProduct = await testPrisma.product.findUnique({
        where: { id: product.id },
      });

      expect(unchangedProduct?.seoTitle).toBeNull();
      expect(unchangedProduct?.seoDescription).toBeNull();
    });

    it('handles non-existent product gracefully', async () => {
      const { userId, projectId } = await createUserAndProject(testPrisma);

      // Should not throw, just log and return
      await expect(
        automationService.runNewProductSeoTitleAutomation(
          projectId,
          'non-existent-product-id',
          userId
        )
      ).resolves.not.toThrow();

      // Verify no suggestion was created
      const suggestions = await testPrisma.automationSuggestion.findMany({
        where: { projectId },
      });

      expect(suggestions.length).toBe(0);
    });
  });
});
