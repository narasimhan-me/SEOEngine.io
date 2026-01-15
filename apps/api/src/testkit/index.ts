import { IntegrationType, PrismaClient, CustomerAccountRole, UserRole } from '@prisma/client';

let counter = 0;

function nextTestSuffix(label: string): string {
  const ts = Date.now();
  const current = counter++;
  return `test_${label}_${ts}_${current}`;
}

export interface CreateTestUserOptions {
  email?: string;
  plan?: string; // e.g. "free", "starter", "pro", "business"
  // [SELF-SERVICE-1] Account role support
  accountRole?: 'OWNER' | 'EDITOR' | 'VIEWER';
  // [SELF-SERVICE-1] Internal role support for tests
  role?: 'USER' | 'ADMIN';
}

export async function createTestUser(
  prisma: PrismaClient,
  options: CreateTestUserOptions = {},
) {
  const email =
    options.email ?? `${nextTestSuffix('user')}@example.com`.toLowerCase();

  // [SELF-SERVICE-1] Support accountRole and role options
  const accountRole = options.accountRole
    ? (options.accountRole as CustomerAccountRole)
    : CustomerAccountRole.OWNER;
  const role = options.role
    ? (options.role as UserRole)
    : UserRole.USER;

  const user = await prisma.user.create({
    data: {
      email,
      password: 'hashed-password',
      name: 'Test User',
      accountRole,
      role,
    },
  });

  const plan = options.plan ?? 'free';
  if (plan && plan !== 'free') {
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan,
        status: 'active',
      },
      update: {
        plan,
        status: 'active',
      },
    });
  }

  return { user, plan };
}

export interface CreateTestProjectOptions {
  userId: string;
  name?: string;
  domain?: string;
}

export async function createTestProject(
  prisma: PrismaClient,
  options: CreateTestProjectOptions,
) {
  const name = options.name ?? `Test Project ${nextTestSuffix('project')}`;
  const domain =
    options.domain ??
    `${nextTestSuffix('project')}.example.com`.toLowerCase();

  const project = await prisma.project.create({
    data: {
      userId: options.userId,
      name,
      domain,
    },
  });

  return project;
}

export interface CreateTestShopifyStoreConnectionOptions {
  projectId: string;
  shopDomain?: string;
  accessToken?: string;
  scope?: string;
}

export async function createTestShopifyStoreConnection(
  prisma: PrismaClient,
  options: CreateTestShopifyStoreConnectionOptions,
) {
  const shopDomain =
    options.shopDomain ??
    `${nextTestSuffix('shop')}.myshopify.com`.toLowerCase();
  const accessToken = options.accessToken ?? 'test-token';

  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Include read_content scope for Pages sync
  const integration = await prisma.integration.create({
    data: {
      projectId: options.projectId,
      type: IntegrationType.SHOPIFY,
      externalId: shopDomain,
      accessToken,
      config: {
        scope: options.scope ?? 'read_products,write_products,read_content',
        installedAt: new Date().toISOString(),
        source: 'testkit',
      } as any,
    },
  });

  return integration;
}

export interface CreateTestProductsOptions {
  projectId: string;
  count: number;
  withSeo?: boolean;
  withIssues?: boolean;
}

export async function createTestProducts(
  prisma: PrismaClient,
  options: CreateTestProductsOptions,
) {
  const products = [];
  for (let i = 0; i < options.count; i += 1) {
    const suffix = nextTestSuffix('product');
    const baseTitle = `Test Product ${i + 1}`;
    const baseDescription = `Test description for product ${i + 1}`;

    const hasSeo = options.withSeo ?? false;
    const hasIssues = options.withIssues ?? true;

    const seoTitle =
      hasSeo && !hasIssues ? `${baseTitle} – SEO` : hasIssues ? null : baseTitle;
    const seoDescription =
      hasSeo && !hasIssues
        ? `${baseDescription} (SEO)`
        : hasIssues
          ? null
          : baseDescription;

    const product = await prisma.product.create({
      data: {
        projectId: options.projectId,
        externalId: suffix,
        title: baseTitle,
        description: baseDescription,
        seoTitle,
        seoDescription,
      },
    });

    products.push(product);
  }

  return products;
}

export interface SetTestUserPlanOptions {
  userId: string;
  plan: string;
}

export async function setTestUserPlan(
  prisma: PrismaClient,
  options: SetTestUserPlanOptions,
) {
  await prisma.subscription.upsert({
    where: { userId: options.userId },
    create: {
      userId: options.userId,
      plan: options.plan,
      status: 'active',
    },
    update: {
      plan: options.plan,
      status: 'active',
    },
  });
}

export interface SeedFirstDeoWinProjectReadyOptions {
  userPlan: string;
}

export async function seedFirstDeoWinProjectReady(
  prisma: PrismaClient,
  options: SeedFirstDeoWinProjectReadyOptions,
) {
  const { user } = await createTestUser(prisma, {
    plan: options.userPlan,
  });

  const project = await createTestProject(prisma, {
    userId: user.id,
  });

  const shopifyIntegration = await createTestShopifyStoreConnection(prisma, {
    projectId: project.id,
  });

  const products = await createTestProducts(prisma, {
    projectId: project.id,
    count: 3,
    withSeo: false,
    withIssues: true,
  });

  return {
    user,
    project,
    shopifyIntegration,
    products,
  };
}

export interface SeedConnectedStoreProjectOptions {
  plan?: string;
}

/**
 * Seed: user + project + Shopify connection (stub token + domain).
 */
export async function seedConnectedStoreProject(
  prisma: PrismaClient,
  options: SeedConnectedStoreProjectOptions = {},
) {
  const { user } = await createTestUser(prisma, {
    plan: options.plan ?? 'free',
  });

  const project = await createTestProject(prisma, {
    userId: user.id,
  });

  const shopifyIntegration = await createTestShopifyStoreConnection(prisma, {
    projectId: project.id,
  });

  return {
    user,
    project,
    shopifyIntegration,
  };
}

export interface SeedCrawledProjectOptions {
  plan?: string;
}

/**
 * Seed: connected store project + minimal crawl record/state used by overview/checklist.
 */
export async function seedCrawledProject(
  prisma: PrismaClient,
  options: SeedCrawledProjectOptions = {},
) {
  const { user, project, shopifyIntegration } = await seedConnectedStoreProject(
    prisma,
    options,
  );

  const now = new Date();

  await prisma.project.update({
    where: { id: project.id },
    data: {
      lastCrawledAt: now,
    },
  });

  await prisma.crawlResult.create({
    data: {
      projectId: project.id,
      url: 'https://example.com/',
      statusCode: 200,
      title: 'Home',
      metaDescription: 'Home page',
      h1: 'Home',
      wordCount: 300,
      loadTimeMs: 800,
      issues: [] as any,
      scannedAt: now,
    },
  });

  return {
    user,
    project: await prisma.project.findUnique({ where: { id: project.id } }),
    shopifyIntegration,
  };
}

export interface SeedReviewedDeoProjectOptions {
  plan?: string;
  score?: number;
}

/**
 * Seed: crawled project + persisted DEO score snapshot.
 * Note: "reviewed" state is currently a frontend-only concept; backend exposes
 * "hasDeoScore" via the presence of a snapshot.
 */
export async function seedReviewedDeoProject(
  prisma: PrismaClient,
  options: SeedReviewedDeoProjectOptions = {},
) {
  const targetScore = typeof options.score === 'number' ? options.score : 82;
  const { user, project, shopifyIntegration } = await seedCrawledProject(
    prisma,
    options,
  );

  const now = new Date();

  await prisma.deoScoreSnapshot.create({
    data: {
      projectId: project!.id,
      overallScore: targetScore,
      contentScore: targetScore,
      entityScore: targetScore,
      technicalScore: targetScore,
      visibilityScore: targetScore,
      version: 'v1',
      metadata: {},
      computedAt: now,
    },
  });

  await prisma.project.update({
    where: { id: project!.id },
    data: {
      currentDeoScore: targetScore,
      currentDeoScoreComputedAt: now,
      lastDeoComputedAt: now,
    },
  });

  return {
    user,
    project: await prisma.project.findUnique({ where: { id: project!.id } }),
    shopifyIntegration,
  };
}

export interface SeedProductsNeedingSeoOptions {
  projectId: string;
  count: number;
}

/**
 * Seed: products with missing SEO fields (title and description) for Issue Engine Lite.
 */
export async function seedProductsNeedingSeo(
  prisma: PrismaClient,
  options: SeedProductsNeedingSeoOptions,
) {
  const products = [];
  for (let i = 0; i < options.count; i += 1) {
    const suffix = nextTestSuffix('needs_seo_product');
    const baseTitle = `Needs SEO Product ${i + 1}`;
    const baseDescription = `Product ${i + 1} missing SEO metadata.`;

    const product = await prisma.product.create({
      data: {
        projectId: options.projectId,
        externalId: suffix,
        title: baseTitle,
        description: baseDescription,
        seoTitle: null,
        seoDescription: null,
      },
    });

    products.push(product);
  }

  return products;
}

export interface SeedOptimizedProductsOptions {
  projectId: string;
  count?: number;
}

/**
 * Seed: products that already have SEO applied (both title and description).
 * Used to drive productsWithAppliedSeo >= N overview metrics.
 */
export async function seedOptimizedProducts(
  prisma: PrismaClient,
  options: SeedOptimizedProductsOptions,
) {
  const count = options.count ?? 3;
  const products = await createTestProducts(prisma, {
    projectId: options.projectId,
    count,
    withSeo: true,
    withIssues: false,
  });
  return products;
}

