import { IntegrationType, PrismaClient } from '@prisma/client';

let counter = 0;

function nextTestSuffix(label: string): string {
  const ts = Date.now();
  const current = counter++;
  return `test_${label}_${ts}_${current}`;
}

export interface CreateTestUserOptions {
  email?: string;
  plan?: string; // e.g. "free", "starter", "pro", "business"
}

export async function createTestUser(
  prisma: PrismaClient,
  options: CreateTestUserOptions = {},
) {
  const email =
    options.email ?? `${nextTestSuffix('user')}@example.com`.toLowerCase();

  const user = await prisma.user.create({
    data: {
      email,
      password: 'hashed-password',
      name: 'Test User',
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
}

export async function createTestShopifyStoreConnection(
  prisma: PrismaClient,
  options: CreateTestShopifyStoreConnectionOptions,
) {
  const shopDomain =
    options.shopDomain ??
    `${nextTestSuffix('shop')}.myshopify.com`.toLowerCase();
  const accessToken = options.accessToken ?? 'test-token';

  const integration = await prisma.integration.create({
    data: {
      projectId: options.projectId,
      type: IntegrationType.SHOPIFY,
      externalId: shopDomain,
      accessToken,
      config: {
        scope: 'read_products,write_products',
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

