import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../utils/test-app';
import { cleanupTestDb, disconnectTestDb, testPrisma } from '../utils/test-db';
import { seedConnectedStoreProject } from '../../src/testkit';

describe('TEST-1 – AEO-2 manual sync endpoint', () => {
  let app: INestApplication;
  let server: any;
  let jwtService: JwtService;
  let originalFetch: any;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    jwtService = app.get(JwtService);
    originalFetch = (global as any).fetch;
  });

  afterAll(async () => {
    (global as any).fetch = originalFetch;
    await cleanupTestDb();
    await disconnectTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    (global as any).fetch = originalFetch;
  });

  function authHeader(userId: string) {
    const token = jwtService.sign({ sub: userId });
    return { Authorization: `Bearer ${token}` };
  }

  it('syncs Answer Blocks to Shopify metafields for Pro plan with toggle enabled', async () => {
    const { user, project } = await seedConnectedStoreProject(testPrisma, {
      plan: 'pro',
    });

    const updatedProject = await testPrisma.project.update({
      where: { id: project.id },
      data: {
        aeoSyncToShopifyMetafields: true,
      },
    });

    const product = await testPrisma.product.create({
      data: {
        projectId: updatedProject.id,
        externalId: '1111111111',
        title: 'AEO2 Sync Product',
        description: 'Product with Answer Blocks to sync.',
        seoTitle: 'SEO Title',
        seoDescription: 'SEO Description',
      },
    });

    await testPrisma.answerBlock.create({
      data: {
        productId: product.id,
        questionId: 'what_is_it',
        questionText: 'What is it?',
        answerText: 'This is an AEO-2 sync test answer.',
        confidenceScore: 0.9,
        sourceType: 'generated',
        sourceFieldsUsed: [],
      },
    });

    const recordedMetafields: any[] = [];

    (global as any).fetch = jest.fn(
      async (_url: string, init: any): Promise<any> => {
        const body = JSON.parse((init?.body as string) ?? '{}');
        const operationName = body.operationName as string | undefined;

        if (operationName === 'GetEngineoMetafieldDefinitions') {
          return {
            ok: true,
            json: async () => ({
              data: {
                metafieldDefinitions: {
                  edges: [],
                },
              },
            }),
            text: async () => '',
          };
        }

        if (operationName === 'CreateEngineoMetafieldDefinition') {
          return {
            ok: true,
            json: async () => ({
              data: {
                metafieldDefinitionCreate: {
                  createdDefinition: {
                    id: 'gid://shopify/MetafieldDefinition/1',
                    key: body.variables.definition.key,
                    namespace: body.variables.definition.namespace,
                  },
                  userErrors: [],
                },
              },
            }),
            text: async () => '',
          };
        }

        if (operationName === 'SetEngineoMetafields') {
          const metafields = body.variables.metafields;
          recordedMetafields.push(...metafields);
          return {
            ok: true,
            json: async () => ({
              data: {
                metafieldsSet: {
                  metafields: [],
                  userErrors: [],
                },
              },
            }),
            text: async () => '',
          };
        }

        throw new Error(
          `Unexpected GraphQL operation in AEO-2 manual sync test: ${operationName}`
        );
      }
    );

    const res = await request(server)
      .post(`/products/${product.id}/answer-blocks/sync-to-shopify`)
      .set(authHeader(user.id))
      .send();

    expect(res.status).toBe(201);
    expect(res.body.productId).toBe(product.id);
    expect(res.body.projectId).toBe(project.id);
    expect(res.body.status).toBe('succeeded');
    expect(res.body.syncedCount).toBeGreaterThanOrEqual(1);

    expect((global as any).fetch).toHaveBeenCalled();
    expect(recordedMetafields.length).toBeGreaterThanOrEqual(1);
    expect(recordedMetafields[0].ownerId).toBe(
      `gid://shopify/Product/${product.externalId}`
    );

    const log = await testPrisma.answerBlockAutomationLog.findFirst({
      where: {
        projectId: project.id,
        productId: product.id,
        triggerType: 'manual_sync',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).not.toBeNull();
    expect(log?.status).toBe('succeeded');
    expect(log?.action).toBe('answer_blocks_synced_to_shopify');
  });

  it('skips sync for Free plan with reason plan_not_entitled and no Shopify calls', async () => {
    const { user, project } = await seedConnectedStoreProject(testPrisma, {
      plan: 'free',
    });

    const updatedProject = await testPrisma.project.update({
      where: { id: project.id },
      data: {
        aeoSyncToShopifyMetafields: true,
      },
    });

    const product = await testPrisma.product.create({
      data: {
        projectId: updatedProject.id,
        externalId: '2222222222',
        title: 'AEO2 Free Plan Product',
        description: 'Product with Answer Blocks on Free plan.',
        seoTitle: 'SEO Title',
        seoDescription: 'SEO Description',
      },
    });

    await testPrisma.answerBlock.create({
      data: {
        productId: product.id,
        questionId: 'what_is_it',
        questionText: 'What is it?',
        answerText: 'This is a Free-plan AEO-2 sync test answer.',
        confidenceScore: 0.9,
        sourceType: 'generated',
        sourceFieldsUsed: [],
      },
    });

    (global as any).fetch = jest.fn();

    const res = await request(server)
      .post(`/products/${product.id}/answer-blocks/sync-to-shopify`)
      .set(authHeader(user.id))
      .send();

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('skipped');
    expect(res.body.reason).toBe('plan_not_entitled');

    expect((global as any).fetch).not.toHaveBeenCalled();

    const log = await testPrisma.answerBlockAutomationLog.findFirst({
      where: {
        projectId: project.id,
        productId: product.id,
        triggerType: 'manual_sync',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).not.toBeNull();
    expect(log?.status).toBe('skipped');
    expect(log?.errorMessage).toContain('plan_not_entitled');
  });
});
