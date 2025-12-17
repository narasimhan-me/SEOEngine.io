import { INestApplication, HttpException, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { ProductIssueFixService } from '../../src/ai/product-issue-fix.service';
import { AiService } from '../../src/ai/ai.service';

class ProductIssueFixServiceStub {
  public mode:
    | 'success'
    | 'failOnSecond'
    | 'rateLimitOnSecond'
    | 'dailyLimitOnSecond' = 'success';
  public callCount = 0;

  async fixMissingSeoFieldFromIssue(input: {
    userId: string;
    productId: string;
    issueType: 'missing_seo_title' | 'missing_seo_description';
  }) {
    this.callCount += 1;
    const { productId, issueType } = input;

    if (this.mode === 'failOnSecond' && this.callCount === 2) {
      throw new Error('Synthetic failure for test');
    }

    if (this.mode === 'rateLimitOnSecond' && this.callCount === 2) {
      throw new HttpException(
        {
          message: 'Synthetic rate limit for test',
          error: 'RATE_LIMIT',
          code: 'RATE_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (this.mode === 'dailyLimitOnSecond' && this.callCount === 2) {
      throw new HttpException(
        {
          message: 'Synthetic daily AI limit for test',
          error: 'AI_DAILY_LIMIT_REACHED',
          code: 'AI_DAILY_LIMIT_REACHED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      productId,
      projectId: 'test-project',
      issueType,
      updated: true,
      field: issueType === 'missing_seo_title' ? 'seoTitle' : 'seoDescription',
    };
  }
}

const productIssueFixServiceStub = new ProductIssueFixServiceStub();

/**
 * Stub for AiService that tracks calls to generateMetadata.
 * Used for AUTO-PB-1.3 contract enforcement: Apply must NOT call AI.
 */
class AiServiceStub {
  public generateMetadataCallCount = 0;

  async generateMetadata(..._args: any[]) {
    this.generateMetadataCallCount += 1;
    return { title: 'Generated Title', description: 'Generated Desc' };
  }
}
const aiServiceStub = new AiServiceStub();

async function signupAndLogin(
  server: any,
  email: string,
  password: string,
): Promise<{ token: string; userId: string }> {
  await request(server)
    .post('/auth/signup')
    .send({
      email,
      password,
      name: 'Test User',
      captchaToken: 'test-token',
    })
    .expect(201);

  const loginRes = await request(server)
    .post('/auth/login')
    .send({
      email,
      password,
      captchaToken: 'test-token',
    })
    .expect(200);

  return {
    token: loginRes.body.accessToken as string,
    userId: loginRes.body.user.id as string,
  };
}

async function createProject(
  server: any,
  token: string,
  name: string,
  domain: string,
): Promise<string> {
  const res = await request(server)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, domain })
    .expect(201);
  return res.body.id as string;
}

async function createProduct(
  projectId: string,
  data: {
    title: string;
    externalId: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
  },
): Promise<string> {
  const product = await testPrisma.product.create({
    data: {
      projectId,
      title: data.title,
      externalId: data.externalId,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
    },
  });
  return product.id;
}

describe('Automation Playbooks (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(ProductIssueFixService)
        .useValue(productIssueFixServiceStub)
        .overrideProvider(AiService)
        .useValue(aiServiceStub),
    );
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    productIssueFixServiceStub.mode = 'success';
    productIssueFixServiceStub.callCount = 0;
    aiServiceStub.generateMetadataCallCount = 0;
  });

  describe('GET /projects/:id/automation-playbooks/estimate', () => {
    it('returns estimate for missing_seo_title playbook', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-estimate@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Playbook Test Project',
        'playbook-test.com',
      );

      // Create products: 2 without SEO title, 1 with SEO title
      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });
      await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: '',
        seoDescription: 'Has description',
      });
      await createProduct(projectId, {
        title: 'Product 3',
        externalId: 'ext-3',
        seoTitle: 'Has SEO Title',
        seoDescription: 'Has description',
      });

      const res = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('projectId', projectId);
      expect(res.body).toHaveProperty('playbookId', 'missing_seo_title');
      expect(res.body).toHaveProperty('totalAffectedProducts', 2);
      expect(res.body).toHaveProperty('estimatedTokens');
      expect(res.body).toHaveProperty('planId');
      expect(res.body).toHaveProperty('eligible');
      expect(res.body).toHaveProperty('canProceed');
      expect(res.body).toHaveProperty('reasons');
      expect(res.body).toHaveProperty('aiDailyLimit');
      // AUTO-PB-1.3: scopeId must be returned for binding preview → apply
      expect(res.body).toHaveProperty('scopeId');
      expect(typeof res.body.scopeId).toBe('string');
      expect(res.body.scopeId.length).toBeGreaterThan(0);
    });

    it('returns estimate for missing_seo_description playbook', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-estimate-desc@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Description Test Project',
        'desc-test.com',
      );

      // Create products: 1 without SEO description, 2 with SEO description
      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: 'Has title',
        seoDescription: null,
      });
      await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: 'Has title',
        seoDescription: 'Has description',
      });
      await createProduct(projectId, {
        title: 'Product 3',
        externalId: 'ext-3',
        seoTitle: 'Has title',
        seoDescription: 'Has description',
      });

      const res = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_description' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalAffectedProducts', 1);
      expect(res.body).toHaveProperty('playbookId', 'missing_seo_description');
    });

    it('returns 0 affected products when all products have required field', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-no-affected@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'All Complete Project',
        'all-complete.com',
      );

      // Create products with all SEO fields filled
      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: 'Has SEO Title',
        seoDescription: 'Has description',
      });

      const res = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalAffectedProducts', 0);
      expect(res.body.reasons).toContain('no_affected_products');
    });

    it('returns 400 when playbookId is missing', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-missing-id@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Missing ID Project',
        'missing-id.com',
      );

      const res = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('returns 403 when accessing another user project', async () => {
      const user1 = await signupAndLogin(
        server,
        'playbook-owner@example.com',
        'testpassword123',
      );
      const user2 = await signupAndLogin(
        server,
        'playbook-other@example.com',
        'testpassword123',
      );

      const projectId = await createProject(
        server,
        user1.token,
        'Owner Project',
        'owner.com',
      );

      const res = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${user2.token}`);

      expect(res.status).toBe(403);
    });

    it('indicates plan_not_eligible for free plan users', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-free-plan@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Free Plan Project',
        'free-plan.com',
      );

      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      const res = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Free plan users should not be eligible for bulk automations
      expect(res.body).toHaveProperty('planId', 'free');
      expect(res.body.reasons).toContain('plan_not_eligible');
      expect(res.body).toHaveProperty('eligible', false);
    });
  });

  describe('POST /projects/:id/automation-playbooks/apply', () => {
    it('returns 403 for free plan users attempting to apply', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-apply-free@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Free Project',
        'apply-free.com',
      );

      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title' });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('code', 'ENTITLEMENTS_LIMIT_REACHED');
    });

    it('returns 400 when playbookId is missing', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-apply-missing@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Missing ID Project',
        'apply-missing.com',
      );

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId: 'some-scope-id' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when scopeId is missing', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-apply-missing-scope@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Missing Scope Project',
        'apply-missing-scope.com',
      );

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title' });

      expect(res.status).toBe(400);
    });

    it('returns 403 when accessing another user project', async () => {
      const user1 = await signupAndLogin(
        server,
        'playbook-apply-owner@example.com',
        'testpassword123',
      );
      const user2 = await signupAndLogin(
        server,
        'playbook-apply-other@example.com',
        'testpassword123',
      );

      const projectId = await createProject(
        server,
        user1.token,
        'Apply Owner Project',
        'apply-owner.com',
      );

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ playbookId: 'missing_seo_title' });

      expect(res.status).toBe(403);
    });

    it('returns empty result when no products match playbook criteria', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-apply-empty@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Empty Project',
        'apply-empty.com',
      );

      // Upgrade user to pro plan for this test
      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_apply_empty',
          stripeSubscriptionId: 'sub_test_apply_empty',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create product with SEO title already filled
      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: 'Already has title',
        seoDescription: 'Has description',
      });

      // First get estimate to obtain scopeId
      const estimateRes = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);
      const { scopeId } = estimateRes.body;

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalAffectedProducts', 0);
      expect(res.body).toHaveProperty('attemptedCount', 0);
      expect(res.body).toHaveProperty('updatedCount', 0);
      expect(res.body).toHaveProperty('skippedCount', 0);
      expect(res.body).toHaveProperty('limitReached', false);
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results).toHaveLength(0);
    });

    it('returns per-item results with statuses for successful apply', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-apply-success@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Success Project',
        'apply-success.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_apply_success',
          stripeSubscriptionId: 'sub_test_apply_success',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });
      await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      productIssueFixServiceStub.mode = 'success';

      // First get estimate to obtain scopeId
      const estimateRes = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);
      const { scopeId } = estimateRes.body;

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalAffectedProducts', 2);
      expect(res.body).toHaveProperty('attemptedCount', 2);
      expect(res.body).toHaveProperty('updatedCount', 2);
      expect(res.body).toHaveProperty('skippedCount', 0);
      expect(res.body).toHaveProperty('limitReached', false);
      expect(res.body).toHaveProperty('stopped', false);
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results).toHaveLength(2);

      const statuses = (res.body.results as Array<{ status: string }>).map(
        (r) => r.status,
      );
      expect(statuses).toEqual(
        expect.arrayContaining(['UPDATED', 'UPDATED']),
      );
    });

    it('stops on first non-retryable failure and returns FAILED status', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-apply-fail@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Fail Project',
        'apply-fail.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_apply_fail',
          stripeSubscriptionId: 'sub_test_apply_fail',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });
      await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: null,
        seoDescription: 'Has description',
      });
      await createProduct(projectId, {
        title: 'Product 3',
        externalId: 'ext-3',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      productIssueFixServiceStub.mode = 'failOnSecond';

      // First get estimate to obtain scopeId
      const estimateRes = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);
      const { scopeId } = estimateRes.body;

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('attemptedCount', 2);
      expect(res.body).toHaveProperty('updatedCount', 1);
      expect(res.body).toHaveProperty('skippedCount', 0);
      expect(res.body).toHaveProperty('stopped', true);
      expect(res.body).toHaveProperty('failureReason', 'ERROR');
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results).toHaveLength(2);

      const lastResult = res.body.results[res.body.results.length - 1];
      expect(lastResult.status).toBe('FAILED');
      expect(res.body.stoppedAtProductId).toBe(lastResult.productId);
    });

    it('stops with RATE_LIMIT failure after bounded retries', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-apply-rate-limit@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Rate Limit Project',
        'apply-rate-limit.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_apply_rate_limit',
          stripeSubscriptionId: 'sub_test_apply_rate_limit',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });
      await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      productIssueFixServiceStub.mode = 'rateLimitOnSecond';

      // First get estimate to obtain scopeId
      const estimateRes = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);
      const { scopeId } = estimateRes.body;

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('stopped', true);
      expect(res.body).toHaveProperty('failureReason', 'RATE_LIMIT');
      expect(res.body).toHaveProperty('limitReached', false);

      const lastResult = res.body.results[res.body.results.length - 1];
      expect(lastResult.status).toBe('FAILED');
    });

    it('stops with LIMIT_REACHED when daily AI limit is hit mid-run', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-apply-daily-limit@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Daily Limit Project',
        'apply-daily-limit.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_apply_daily_limit',
          stripeSubscriptionId: 'sub_test_apply_daily_limit',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });
      await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      productIssueFixServiceStub.mode = 'dailyLimitOnSecond';

      // First get estimate to obtain scopeId
      const estimateRes = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);
      const { scopeId } = estimateRes.body;

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('stopped', true);
      expect(res.body).toHaveProperty('limitReached', true);
      expect(res.body).toHaveProperty('failureReason', 'LIMIT_REACHED');

      const lastResult = res.body.results[res.body.results.length - 1];
      expect(lastResult.status).toBe('LIMIT_REACHED');
    });

    it('returns 409 when scopeId does not match current scope (scope changed)', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-apply-scope-mismatch@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Scope Mismatch Project',
        'apply-scope-mismatch.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_apply_scope_mismatch',
          stripeSubscriptionId: 'sub_test_apply_scope_mismatch',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create initial product
      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Get estimate to obtain scopeId
      const estimateRes = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);
      const { scopeId } = estimateRes.body;

      // Add another product (this changes the scope)
      await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Try to apply with the old scopeId - should fail with 409
      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('code', 'PLAYBOOK_SCOPE_INVALID');
      expect(res.body).toHaveProperty('expectedScopeId');
      expect(res.body).toHaveProperty('providedScopeId', scopeId);
      expect(res.body.expectedScopeId).not.toBe(scopeId);
    });
  });

  describe('Playbook ownership and authorization', () => {
    it('estimate endpoint requires authentication', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-auth-test@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Auth Test Project',
        'auth-test.com',
      );

      const res = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' });

      expect(res.status).toBe(401);
    });

    it('apply endpoint requires authentication', async () => {
      const { token } = await signupAndLogin(
        server,
        'playbook-apply-auth@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Apply Auth Project',
        'apply-auth.com',
      );

      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .send({ playbookId: 'missing_seo_title' });

      expect(res.status).toBe(401);
    });
  });

  /**
   * AUTO-PB-1.3: Contract enforcement tests
   * Apply must reject requests when rulesHash changes, draft is not found,
   * or scope becomes invalid. These tests verify the 409 Conflict behavior.
   */
  describe('AUTO-PB-1.3 Contract enforcement', () => {
    it('returns 409 PLAYBOOK_RULES_CHANGED when rulesHash differs', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-rules-changed@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Rules Changed Project',
        'rules-changed.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_rules_changed',
          stripeSubscriptionId: 'sub_test_rules_changed',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const productId = await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Get estimate to obtain scopeId
      const estimateRes = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);
      const { scopeId } = estimateRes.body;

      // Create a draft with specific rules (establish baseline rulesHash)
      const previewRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Buy ' }, sampleSize: 1 });
      expect(previewRes.status).toBe(200);
      const { rulesHash } = previewRes.body;

      // Reset AI call counter so we only measure Apply
      aiServiceStub.generateMetadataCallCount = 0;

      // Contract: PLAYBOOK_RULES_CHANGED – Apply with mismatched rulesHash
      const wrongRulesHash = `${rulesHash}_modified`;
      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          scopeId,
          rulesHash: wrongRulesHash,
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('code', 'PLAYBOOK_RULES_CHANGED');
      // No AI calls during Apply
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);

      // DB should be unchanged for the affected product
      const product = await testPrisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.seoTitle).toBeNull();
    });

    it('returns 409 PLAYBOOK_DRAFT_NOT_FOUND when no draft exists', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-no-draft@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'No Draft Project',
        'no-draft.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_no_draft',
          stripeSubscriptionId: 'sub_test_no_draft',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const productId = await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Get estimate to obtain scopeId
      const estimateRes = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);
      const { scopeId } = estimateRes.body;

      // Reset AI call counter just in case
      aiServiceStub.generateMetadataCallCount = 0;

      // Contract: PLAYBOOK_DRAFT_NOT_FOUND – Apply with no draft for (projectId, playbookId, scopeId, rulesHash)
      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          scopeId,
          rulesHash: 'nonexistent_hash_12345',
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('code', 'PLAYBOOK_DRAFT_NOT_FOUND');
      // No AI calls during Apply
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);

      // DB should be unchanged – product still has no SEO title
      const product = await testPrisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.seoTitle).toBeNull();
    });

    it('returns 409 PLAYBOOK_SCOPE_INVALID when scope changes between preview and apply', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-scope-invalid@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Scope Invalid Project',
        'scope-invalid.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_scope_invalid',
          stripeSubscriptionId: 'sub_test_scope_invalid',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Get estimate and create preview
      const previewRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Shop ' }, sampleSize: 1 });
      expect(previewRes.status).toBe(200);
      const { scopeId, rulesHash } = previewRes.body;

      // Add another product - changes the scope
      await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Try to apply with old scopeId
      const res = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('code', 'PLAYBOOK_SCOPE_INVALID');
    });

    it('apply uses draft suggestions without calling AI (no-AI-at-Apply contract)', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-no-ai-apply@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'No AI Apply Project',
        'no-ai-apply.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_no_ai_apply',
          stripeSubscriptionId: 'sub_test_no_ai_apply',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const productId = await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Generate preview first (this creates the draft and uses AI)
      const previewRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Buy ' }, sampleSize: 1 });
      expect(previewRes.status).toBe(200);
      const { scopeId, rulesHash } = previewRes.body;

      // Generate full draft (uses AI as well)
      await request(server)
        .post(
          `/projects/${projectId}/automation-playbooks/missing_seo_title/draft/generate`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId, rulesHash });

      // Reset the AI call counter so we only measure Apply
      aiServiceStub.generateMetadataCallCount = 0;

      // Apply should use the stored draft, not call AI
      const applyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash });

      expect(applyRes.status).toBe(200);
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);

      // Product should now have a non-null SEO title from the draft
      const product = await testPrisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.seoTitle).not.toBeNull();
    });

    it('uses stored draft items for UPDATED vs SKIPPED without AI calls', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-draft-updated-vs-skipped@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Draft UPDATED vs SKIPPED Project',
        'draft-updated-vs-skipped.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_draft_updated_skipped',
          stripeSubscriptionId: 'sub_test_draft_updated_skipped',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const productId1 = await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });
      const productId2 = await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: null,
        seoDescription: 'Has description',
      });
      const productId3 = await createProduct(projectId, {
        title: 'Product 3',
        externalId: 'ext-3',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Get estimate to compute scopeId and base rulesHash
      const estimateRes = await request(server)
        .get(`/projects/${projectId}/automation-playbooks/estimate`)
        .query({ playbookId: 'missing_seo_title' })
        .set('Authorization', `Bearer ${token}`);
      expect(estimateRes.status).toBe(200);
      const { scopeId, rulesHash } = estimateRes.body as {
        scopeId: string;
        rulesHash: string;
      };

      // Manually seed a READY draft with mixed suggestions:
      // productId1: has suggestion → UPDATED
      // productId2: empty suggestion → SKIPPED
      // productId3: no draft item → SKIPPED
      await testPrisma.automationPlaybookDraft.create({
        data: {
          projectId,
          playbookId: 'missing_seo_title',
          scopeId,
          rulesHash,
          status: 'READY',
          sampleProductIds: [productId1, productId2],
          draftItems: [
            {
              productId: productId1,
              field: 'seoTitle',
              rawSuggestion: 'Draft Title 1',
              finalSuggestion: 'Draft Title 1',
              ruleWarnings: [],
            },
            {
              productId: productId2,
              field: 'seoTitle',
              rawSuggestion: 'Draft Title 2',
              finalSuggestion: '',
              ruleWarnings: [],
            },
          ],
          counts: {
            affectedTotal: 3,
            draftGenerated: 1,
            noSuggestionCount: 2,
          },
          rules: null,
          createdByUserId: userId,
        },
      });

      aiServiceStub.generateMetadataCallCount = 0;

      const applyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash });

      expect(applyRes.status).toBe(200);
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);

      const body = applyRes.body as {
        totalAffectedProducts: number;
        updatedCount: number;
        skippedCount: number;
        results: Array<{ productId: string; status: string }>;
      };

      expect(body.totalAffectedProducts).toBe(3);
      expect(body.updatedCount).toBe(1);
      expect(body.skippedCount).toBe(2);

      const statusesByProduct = new Map(
        body.results.map((r: any) => [r.productId, r.status]),
      );
      expect(statusesByProduct.get(productId1)).toBe('UPDATED');
      expect(statusesByProduct.get(productId2)).toBe('SKIPPED');
      expect(statusesByProduct.get(productId3)).toBe('SKIPPED');

      const p1 = await testPrisma.product.findUnique({ where: { id: productId1 } });
      const p2 = await testPrisma.product.findUnique({ where: { id: productId2 } });
      const p3 = await testPrisma.product.findUnique({ where: { id: productId3 } });

      expect(p1?.seoTitle).toBe('Draft Title 1');
      expect(p2?.seoTitle).toBeNull();
      expect(p3?.seoTitle).toBeNull();
    });

    it('supports resume/apply later with existing draft and no AI calls on replay', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'playbook-resume-apply@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Resume Apply Project',
        'resume-apply.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_resume_apply',
          stripeSubscriptionId: 'sub_test_resume_apply',
          status: 'active',
          plan: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const productId = await createProduct(projectId, {
        title: 'Product 1',
        externalId: 'ext-1',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Preview + full draft generation (acts as "initial session")
      const previewRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Buy ' }, sampleSize: 1 });
      expect(previewRes.status).toBe(200);
      const { scopeId, rulesHash } = previewRes.body as {
        scopeId: string;
        rulesHash: string;
      };

      await request(server)
        .post(
          `/projects/${projectId}/automation-playbooks/missing_seo_title/draft/generate`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId, rulesHash });

      // First apply: simulate initial run, ensure no AI calls (Apply-only)
      aiServiceStub.generateMetadataCallCount = 0;
      const firstApplyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash });

      expect(firstApplyRes.status).toBe(200);
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);

      const afterFirst = await testPrisma.product.findUnique({
        where: { id: productId },
      });
      const firstSeoTitle = afterFirst?.seoTitle;
      expect(firstSeoTitle).not.toBeNull();

      // Second apply: "resume" behavior – same draft, no AI calls, stable result
      aiServiceStub.generateMetadataCallCount = 0;
      const secondApplyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash });

      expect(secondApplyRes.status).toBe(200);
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);

      const afterSecond = await testPrisma.product.findUnique({
        where: { id: productId },
      });
      expect(afterSecond?.seoTitle).toBe(firstSeoTitle);
    });
  });
});
