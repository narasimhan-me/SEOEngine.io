/**
 * TEST-PB-RULES-1: Integration tests for draft + rulesHash contract
 *
 * These tests lock server behavior around rulesHash → draft validity,
 * and invalidation paths for PLAYBOOK_RULES_CHANGED and PLAYBOOK_SCOPE_INVALID.
 *
 * Dependencies:
 * - DOC-AUTO-PB-1.3 – Preview persistence & draft lifecycle
 * - AUTO-PB-1.3 backend (scopeId + rulesHash + draftKey enforcement)
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../utils/test-app';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import { ProductIssueFixService } from '../../../src/ai/product-issue-fix.service';
import { AiService } from '../../../src/ai/ai.service';

/**
 * Stub for ProductIssueFixService
 */
class ProductIssueFixServiceStub {
  public callCount = 0;

  async fixMissingSeoFieldFromIssue(
    _userId: string,
    _product: any,
    issueType: string,
    _opts?: any,
  ) {
    this.callCount += 1;
    return {
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
  await request(server).post('/auth/signup').send({
    email,
    password,
    name: 'Test User',
  });
  const loginRes = await request(server)
    .post('/auth/login')
    .send({ email, password });
  return { token: loginRes.body.access_token, userId: loginRes.body.user.id };
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
    .send({ name, domain });
  return res.body.id;
}

async function createProduct(
  projectId: string,
  data: {
    title: string;
    externalId: string;
    seoTitle: string | null;
    seoDescription: string | null;
  },
): Promise<string> {
  const product = await testPrisma.product.create({
    data: {
      projectId,
      title: data.title,
      externalId: data.externalId,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    },
  });
  return product.id;
}

describe('PB-RULES-1 – Draft + rulesHash Contract (integration)', () => {
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
    productIssueFixServiceStub.callCount = 0;
    aiServiceStub.generateMetadataCallCount = 0;
  });

  describe('rulesHash stability', () => {
    it('produces identical rulesHash for identical rules across preview calls', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'rules-hash-stable@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Rules Hash Stable Project',
        'rules-hash-stable.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_rules_hash_stable',
          stripeSubscriptionId: 'sub_test_rules_hash_stable',
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

      const rules = { enabled: true, prefix: 'EngineO | ' };

      // First preview call
      const preview1 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules, sampleSize: 1 });
      expect(preview1.status).toBe(200);

      // Second preview call with identical rules
      const preview2 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules, sampleSize: 1 });
      expect(preview2.status).toBe(200);

      // rulesHash should be identical
      expect(preview1.body.rulesHash).toBe(preview2.body.rulesHash);
      // scopeId should be identical (scope hasn't changed)
      expect(preview1.body.scopeId).toBe(preview2.body.scopeId);
    });

    it('produces different rulesHash when prefix changes', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'rules-hash-prefix@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Rules Hash Prefix Project',
        'rules-hash-prefix.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_rules_hash_prefix',
          stripeSubscriptionId: 'sub_test_rules_hash_prefix',
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

      // First preview with prefix A
      const preview1 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'EngineO | ' }, sampleSize: 1 });
      expect(preview1.status).toBe(200);

      // Second preview with prefix B
      const preview2 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'EngineO SEO | ' }, sampleSize: 1 });
      expect(preview2.status).toBe(200);

      // rulesHash should be different
      expect(preview1.body.rulesHash).not.toBe(preview2.body.rulesHash);
    });

    it('produces different rulesHash when forbidden phrases change', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'rules-hash-forbidden@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Rules Hash Forbidden Project',
        'rules-hash-forbidden.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_rules_hash_forbidden',
          stripeSubscriptionId: 'sub_test_rules_hash_forbidden',
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

      // First preview with one forbidden phrase
      const preview1 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, forbiddenPhrases: ['click here'] }, sampleSize: 1 });
      expect(preview1.status).toBe(200);

      // Second preview with additional forbidden phrase
      const preview2 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          rules: { enabled: true, forbiddenPhrases: ['click here', 'best ever'] },
          sampleSize: 1,
        });
      expect(preview2.status).toBe(200);

      // rulesHash should be different
      expect(preview1.body.rulesHash).not.toBe(preview2.body.rulesHash);
    });
  });

  describe('Draft validity vs rulesHash (PLAYBOOK_RULES_CHANGED)', () => {
    it('returns 409 PLAYBOOK_RULES_CHANGED when applying with mismatched rulesHash', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'rules-changed-409@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Rules Changed 409 Project',
        'rules-changed-409.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_rules_changed_409',
          stripeSubscriptionId: 'sub_test_rules_changed_409',
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

      // Create preview with rulesA
      const previewRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Original | ' }, sampleSize: 1 });
      expect(previewRes.status).toBe(200);
      const { scopeId, rulesHash: rulesHashA } = previewRes.body;

      // Generate full draft
      await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/draft/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId, rulesHash: rulesHashA });

      // Get rulesHashB from a new preview with different rules
      const preview2 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Changed | ' }, sampleSize: 1 });
      expect(preview2.status).toBe(200);
      const rulesHashB = preview2.body.rulesHash;

      // Reset AI counter
      aiServiceStub.generateMetadataCallCount = 0;

      // Attempt Apply with rulesHashB (different from the READY draft's rulesHashA)
      const applyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash: rulesHashB });

      expect(applyRes.status).toBe(409);
      expect(applyRes.body).toHaveProperty('code', 'PLAYBOOK_RULES_CHANGED');

      // No AI calls during Apply
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);

      // Product SEO fields unchanged
      const product = await testPrisma.product.findUnique({ where: { id: productId } });
      expect(product?.seoTitle).toBeNull();
    });

    it('does not call AI when Apply is blocked due to rules change', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'rules-changed-no-ai@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Rules Changed No AI Project',
        'rules-changed-no-ai.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_rules_changed_no_ai',
          stripeSubscriptionId: 'sub_test_rules_changed_no_ai',
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

      // Create preview and get scopeId
      const previewRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, maxLength: 60 }, sampleSize: 1 });
      expect(previewRes.status).toBe(200);
      const { scopeId, rulesHash } = previewRes.body;

      // Reset AI counter before Apply
      aiServiceStub.generateMetadataCallCount = 0;

      // Attempt Apply with wrong rulesHash
      const applyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          playbookId: 'missing_seo_title',
          scopeId,
          rulesHash: `${rulesHash}_wrong`,
        });

      expect(applyRes.status).toBe(409);
      expect(applyRes.body).toHaveProperty('code', 'PLAYBOOK_RULES_CHANGED');

      // AI should NOT have been called
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);
    });
  });

  describe('Draft validity vs scopeId (PLAYBOOK_SCOPE_INVALID)', () => {
    it('returns 409 PLAYBOOK_SCOPE_INVALID when scope changes after preview', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'scope-invalid-409@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Scope Invalid 409 Project',
        'scope-invalid-409.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_scope_invalid_409',
          stripeSubscriptionId: 'sub_test_scope_invalid_409',
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

      // Create preview + full draft
      const previewRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Shop | ' }, sampleSize: 1 });
      expect(previewRes.status).toBe(200);
      const { scopeId: scopeIdA, rulesHash } = previewRes.body;

      await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/draft/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId: scopeIdA, rulesHash });

      // Change scope by adding another product
      await createProduct(projectId, {
        title: 'Product 2',
        externalId: 'ext-2',
        seoTitle: null,
        seoDescription: 'Has description',
      });

      // Attempt Apply with old scopeId
      const applyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId: scopeIdA, rulesHash });

      expect(applyRes.status).toBe(409);
      expect(applyRes.body).toHaveProperty('code', 'PLAYBOOK_SCOPE_INVALID');
    });
  });

  describe('Failure modes – rules changes after draft creation', () => {
    it('returns 409 when forbidden phrase added after draft creation', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'forbidden-added@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Forbidden Added Project',
        'forbidden-added.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_forbidden_added',
          stripeSubscriptionId: 'sub_test_forbidden_added',
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

      // Preview + draft with no forbidden phrases
      const preview1 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Buy | ' }, sampleSize: 1 });
      expect(preview1.status).toBe(200);
      const { scopeId, rulesHash: rulesHash1 } = preview1.body;

      await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/draft/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId, rulesHash: rulesHash1 });

      // Get new rulesHash with forbidden phrase
      const preview2 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          rules: { enabled: true, prefix: 'Buy | ', forbiddenPhrases: ['click here'] },
          sampleSize: 1,
        });
      expect(preview2.status).toBe(200);
      const rulesHash2 = preview2.body.rulesHash;

      // Reset AI counter
      aiServiceStub.generateMetadataCallCount = 0;

      // Attempt Apply with new rulesHash (forbidden phrase added)
      const applyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash: rulesHash2 });

      expect(applyRes.status).toBe(409);
      expect(applyRes.body).toHaveProperty('code', 'PLAYBOOK_RULES_CHANGED');
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);
    });

    it('returns 409 when maxLength reduced after draft creation', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'maxlength-reduced@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'MaxLength Reduced Project',
        'maxlength-reduced.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_maxlength_reduced',
          stripeSubscriptionId: 'sub_test_maxlength_reduced',
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

      // Draft with no maxLength
      const preview1 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Buy | ' }, sampleSize: 1 });
      expect(preview1.status).toBe(200);
      const { scopeId, rulesHash: rulesHash1 } = preview1.body;

      await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/draft/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId, rulesHash: rulesHash1 });

      // Get new rulesHash with smaller maxLength
      const preview2 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Buy | ', maxLength: 30 }, sampleSize: 1 });
      expect(preview2.status).toBe(200);
      const rulesHash2 = preview2.body.rulesHash;

      // Reset AI counter
      aiServiceStub.generateMetadataCallCount = 0;

      // Attempt Apply with new rulesHash (maxLength added)
      const applyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash: rulesHash2 });

      expect(applyRes.status).toBe(409);
      expect(applyRes.body).toHaveProperty('code', 'PLAYBOOK_RULES_CHANGED');
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);
    });

    it('returns single 409 when multiple rules changed at once', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'multiple-rules-changed@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Multiple Rules Changed Project',
        'multiple-rules-changed.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_multiple_rules',
          stripeSubscriptionId: 'sub_test_multiple_rules',
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

      // Draft with basic rules
      const preview1 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'A | ' }, sampleSize: 1 });
      expect(preview1.status).toBe(200);
      const { scopeId, rulesHash: rulesHash1 } = preview1.body;

      await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/draft/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId, rulesHash: rulesHash1 });

      // Get new rulesHash with multiple changes
      const preview2 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          rules: {
            enabled: true,
            prefix: 'B | ',
            maxLength: 50,
            forbiddenPhrases: ['click here'],
          },
          sampleSize: 1,
        });
      expect(preview2.status).toBe(200);
      const rulesHash2 = preview2.body.rulesHash;

      // Reset AI counter
      aiServiceStub.generateMetadataCallCount = 0;

      // Attempt Apply with completely different rulesHash
      const applyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash: rulesHash2 });

      // Should get a single 409, not partial apply
      expect(applyRes.status).toBe(409);
      expect(applyRes.body).toHaveProperty('code', 'PLAYBOOK_RULES_CHANGED');
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);
    });
  });

  describe('AI usage guarantees', () => {
    it('Apply with valid draft does not call AI', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'valid-draft-no-ai@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Valid Draft No AI Project',
        'valid-draft-no-ai.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_valid_draft_no_ai',
          stripeSubscriptionId: 'sub_test_valid_draft_no_ai',
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

      // Create preview + full draft
      const previewRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Shop | ' }, sampleSize: 1 });
      expect(previewRes.status).toBe(200);
      const { scopeId, rulesHash } = previewRes.body;

      await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/draft/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId, rulesHash });

      // Reset AI counter before Apply
      aiServiceStub.generateMetadataCallCount = 0;

      // Apply with valid draft
      const applyRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash });

      expect(applyRes.status).toBe(200);
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);
    });

    it('Resume path (apply later) does not call AI', async () => {
      const { token, userId } = await signupAndLogin(
        server,
        'resume-no-ai@example.com',
        'testpassword123',
      );
      const projectId = await createProject(
        server,
        token,
        'Resume No AI Project',
        'resume-no-ai.com',
      );

      await testPrisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: 'cus_test_resume_no_ai',
          stripeSubscriptionId: 'sub_test_resume_no_ai',
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

      // Create preview + full draft
      const previewRes = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/preview`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: { enabled: true, prefix: 'Buy | ' }, sampleSize: 1 });
      expect(previewRes.status).toBe(200);
      const { scopeId, rulesHash } = previewRes.body;

      await request(server)
        .post(`/projects/${projectId}/automation-playbooks/missing_seo_title/draft/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ scopeId, rulesHash });

      // First Apply
      aiServiceStub.generateMetadataCallCount = 0;
      const apply1 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash });
      expect(apply1.status).toBe(200);
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);

      // Second Apply (resume)
      aiServiceStub.generateMetadataCallCount = 0;
      const apply2 = await request(server)
        .post(`/projects/${projectId}/automation-playbooks/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playbookId: 'missing_seo_title', scopeId, rulesHash });
      expect(apply2.status).toBe(200);
      expect(aiServiceStub.generateMetadataCallCount).toBe(0);
    });
  });
});
