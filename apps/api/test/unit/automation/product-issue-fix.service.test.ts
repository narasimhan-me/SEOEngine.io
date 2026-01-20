import { ForbiddenException, HttpException } from '@nestjs/common';
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { ProductIssueFixService } from '../../../src/ai/product-issue-fix.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import { shopifyProductMissingSeo } from '../../fixtures/shopify-product.fixtures';

describe('ProductIssueFixService – Issue Engine Lite AI fixes', () => {
  let entitlementsService: EntitlementsService;
  let aiServiceStub: { generateMetadata: jest.Mock };
  let roleResolutionService: RoleResolutionService;
  let service: ProductIssueFixService;

  beforeAll(() => {
    const prisma = testPrisma as any;
    entitlementsService = new EntitlementsService(prisma);
    roleResolutionService = new RoleResolutionService(prisma);
    aiServiceStub = {
      generateMetadata: jest.fn(),
    };
    service = new ProductIssueFixService(
      prisma,
      aiServiceStub as any,
      entitlementsService,
      roleResolutionService
    );
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    aiServiceStub.generateMetadata.mockReset();
  });

  async function createUserProjectAndProduct(
    plan: 'free' | 'pro' | 'business'
  ) {
    const user = await testPrisma.user.create({
      data: {
        email: `issue-fix-${plan}-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Issue Fix Test User',
      },
    });

    if (plan !== 'free') {
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan,
          status: 'active',
          stripeCustomerId: `cus_issue_fix_${plan}`,
          stripeSubscriptionId: `sub_issue_fix_${plan}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const project = await testPrisma.project.create({
      data: {
        name: `Issue Fix Project (${plan})`,
        domain: `issue-fix-${plan}.example.com`,
        userId: user.id,
      },
    });

    // [ROLES-3] Create ProjectMember record for the owner
    await testPrisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    const product = await testPrisma.product.create({
      data: {
        projectId: project.id,
        externalId: String(shopifyProductMissingSeo.id),
        title: shopifyProductMissingSeo.title,
        description: shopifyProductMissingSeo.body_html,
        seoTitle:
          (shopifyProductMissingSeo as any).metafields_global_title_tag ?? null,
        seoDescription:
          (shopifyProductMissingSeo as any).metafields_global_description_tag ??
          null,
      },
    });

    return { user, project, product };
  }

  it('throws when a user tries to fix a product they do not own', async () => {
    const { user: owner, product } = await createUserProjectAndProduct('pro');

    const otherUser = await testPrisma.user.create({
      data: {
        email: `issue-fix-other-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Other Issue Fix User',
      },
    });

    await testPrisma.subscription.create({
      data: {
        userId: otherUser.id,
        plan: 'pro',
        status: 'active',
        stripeCustomerId: `cus_issue_fix_other_pro`,
        stripeSubscriptionId: `sub_issue_fix_other_pro`,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await expect(
      service.fixMissingSeoFieldFromIssue({
        userId: otherUser.id,
        productId: product.id,
        issueType: 'missing_seo_title',
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(aiServiceStub.generateMetadata).not.toHaveBeenCalled();
  });

  it('enforces plan gating for Free vs Pro', async () => {
    const { user: freeUser, product: freeProduct } =
      await createUserProjectAndProduct('free');

    await expect(
      service.fixMissingSeoFieldFromIssue({
        userId: freeUser.id,
        productId: freeProduct.id,
        issueType: 'missing_seo_title',
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(aiServiceStub.generateMetadata).not.toHaveBeenCalled();
  });

  it('propagates AI daily limit errors from EntitlementsService', async () => {
    const { user, project, product } = await createUserProjectAndProduct('pro');

    const entitlementsStub = {
      getUserPlan: jest.fn().mockResolvedValue('pro'),
      ensureWithinDailyAiLimit: jest.fn().mockRejectedValue(
        new HttpException(
          {
            message:
              "Daily AI limit reached. You've used all 5 AI suggestions available on the Free plan. Your limit resets tomorrow, or upgrade to continue.",
            error: 'AI_DAILY_LIMIT_REACHED',
            code: 'AI_DAILY_LIMIT_REACHED',
            feature: 'product_optimize',
            plan: 'pro',
            allowed: 5,
            current: 5,
          },
          429
        )
      ),
      recordAiUsage: jest.fn(),
    };

    const roleResolutionStub = new RoleResolutionService(testPrisma as any);
    const serviceWithStub = new ProductIssueFixService(
      testPrisma as any,
      aiServiceStub as any,
      entitlementsStub as any,
      roleResolutionStub
    );

    await expect(
      serviceWithStub.fixMissingSeoFieldFromIssue({
        userId: user.id,
        productId: product.id,
        issueType: 'missing_seo_title',
      })
    ).rejects.toBeInstanceOf(HttpException);

    expect(entitlementsStub.ensureWithinDailyAiLimit).toHaveBeenCalledWith(
      user.id,
      project.id,
      'product_optimize'
    );
    expect(aiServiceStub.generateMetadata).not.toHaveBeenCalled();
  });
});
