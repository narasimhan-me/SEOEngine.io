import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { ProductIssueFixService } from '../../../src/ai/product-issue-fix.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import {
  shopifyProductMissingSeo,
} from '../../fixtures/shopify-product.fixtures';

describe('Issue Engine Lite – AI Fix integration', () => {
  let entitlementsService: EntitlementsService;
  let aiServiceStub: { generateMetadata: jest.Mock };
  let service: ProductIssueFixService;

  beforeAll(() => {
    const prisma = testPrisma as any;
    entitlementsService = new EntitlementsService(prisma);
    const roleResolutionService = new RoleResolutionService(prisma);
    aiServiceStub = {
      generateMetadata: jest.fn(async () => ({
        title: 'Generated SEO Title from Issue Fix',
        description: 'Generated SEO Description from Issue Fix',
      })),
    };
    service = new ProductIssueFixService(
      prisma,
      aiServiceStub as any,
      entitlementsService,
      roleResolutionService,
    );
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    aiServiceStub.generateMetadata.mockClear();
  });

  async function createUserProjectAndProduct(plan: 'free' | 'pro' | 'business') {
    const user = await testPrisma.user.create({
      data: {
        email: `issue-fix-int-${plan}-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Issue Fix Integration User',
      },
    });

    if (plan !== 'free') {
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan,
          status: 'active',
          stripeCustomerId: `cus_issue_fix_int_${plan}`,
          stripeSubscriptionId: `sub_issue_fix_int_${plan}`,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const project = await testPrisma.project.create({
      data: {
        name: `Issue Fix Integration Project (${plan})`,
        domain: `issue-fix-int-${plan}.example.com`,
        userId: user.id,
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

  it('fills missing SEO title for missing_seo_title issue on Pro plan', async () => {
    const { user, project, product } =
      await createUserProjectAndProduct('pro');

    // Ensure SEO title is initially missing
    const before = await testPrisma.product.findUnique({
      where: { id: product.id },
    });
    expect(before?.seoTitle).toBeNull();

    const result = await service.fixMissingSeoFieldFromIssue({
      userId: user.id,
      productId: product.id,
      issueType: 'missing_seo_title',
    });

    expect(result.updated).toBe(true);
    expect(result.field).toBe('seoTitle');
    expect(result.projectId).toBe(project.id);
    expect(result.productId).toBe(product.id);

    const after = await testPrisma.product.findUnique({
      where: { id: product.id },
    });
    expect(after?.seoTitle).toBe('Generated SEO Title from Issue Fix');
    expect(aiServiceStub.generateMetadata).toHaveBeenCalledTimes(1);
  });
});