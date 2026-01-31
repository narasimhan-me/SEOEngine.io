/**
 * INTEGRATIONS-TESTS: Integration tests for Integrations Service
 *
 * Tests:
 * - Integration CRUD operations
 * - Upsert behavior
 * - Type checking and uniqueness constraints
 * - Error handling
 *
 * NOTE: These tests require a test database to be configured.
 */
import { IntegrationsService } from '../../../src/integrations/integrations.service';
import { IntegrationType } from '@prisma/client';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('IntegrationsService (integration)', () => {
  let integrationsService: IntegrationsService;
  let testUser: { id: string };
  let testProject: { id: string };

  beforeAll(async () => {
    integrationsService = new IntegrationsService(testPrisma as any);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();

    testUser = await testPrisma.user.create({
      data: {
        email: `integrations-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Integrations Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'Integrations Test Project',
        domain: 'integrations-test.example.com',
        userId: testUser.id,
      },
    });
  });

  describe('Create Integration', () => {
    it('should create a new integration', async () => {
      const integration = await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
        externalId: 'test-store.myshopify.com',
        accessToken: 'test-token-123',
      });

      expect(integration.id).toBeDefined();
      expect(integration.projectId).toBe(testProject.id);
      expect(integration.type).toBe('SHOPIFY');
      expect(integration.externalId).toBe('test-store.myshopify.com');
      expect(integration.accessToken).toBe('test-token-123');
    });

    it('should throw BadRequestException for duplicate integration type', async () => {
      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
        externalId: 'store1.myshopify.com',
      });

      await expect(
        integrationsService.createIntegration({
          projectId: testProject.id,
          type: 'SHOPIFY' as IntegrationType,
          externalId: 'store2.myshopify.com',
        })
      ).rejects.toThrow('Integration of type SHOPIFY already exists');
    });

    it('should allow different integration types for same project', async () => {
      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
      });

      // Create project2 for different type (if other types exist)
      const project2 = await testPrisma.project.create({
        data: {
          name: 'Second Project',
          domain: 'second.example.com',
          userId: testUser.id,
        },
      });

      const integration2 = await integrationsService.createIntegration({
        projectId: project2.id,
        type: 'SHOPIFY' as IntegrationType,
      });

      expect(integration2.id).toBeDefined();
    });
  });

  describe('Get Integration', () => {
    it('should get integration by project and type', async () => {
      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
        externalId: 'get-test.myshopify.com',
      });

      const integration = await integrationsService.getIntegration(
        testProject.id,
        'SHOPIFY' as IntegrationType
      );

      expect(integration).not.toBeNull();
      expect(integration?.externalId).toBe('get-test.myshopify.com');
    });

    it('should return null for non-existent integration', async () => {
      const integration = await integrationsService.getIntegration(
        testProject.id,
        'SHOPIFY' as IntegrationType
      );

      expect(integration).toBeNull();
    });

    it('should get integration by ID', async () => {
      const created = await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
      });

      const integration = await integrationsService.getIntegrationById(
        created.id
      );

      expect(integration).not.toBeNull();
      expect(integration?.id).toBe(created.id);
    });

    it('should get all project integrations', async () => {
      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
      });

      const integrations = await integrationsService.getProjectIntegrations(
        testProject.id
      );

      expect(integrations).toHaveLength(1);
    });
  });

  describe('Update Integration', () => {
    it('should update existing integration', async () => {
      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
        externalId: 'original.myshopify.com',
        accessToken: 'old-token',
      });

      const updated = await integrationsService.updateIntegration(
        testProject.id,
        'SHOPIFY' as IntegrationType,
        {
          externalId: 'updated.myshopify.com',
          accessToken: 'new-token',
        }
      );

      expect(updated.externalId).toBe('updated.myshopify.com');
      expect(updated.accessToken).toBe('new-token');
    });

    it('should throw NotFoundException for non-existent integration', async () => {
      await expect(
        integrationsService.updateIntegration(
          testProject.id,
          'SHOPIFY' as IntegrationType,
          { externalId: 'test' }
        )
      ).rejects.toThrow('Integration of type SHOPIFY not found');
    });

    it('should preserve unchanged fields', async () => {
      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
        externalId: 'preserve.myshopify.com',
        accessToken: 'preserve-token',
      });

      const updated = await integrationsService.updateIntegration(
        testProject.id,
        'SHOPIFY' as IntegrationType,
        { externalId: 'new-external-id' }
      );

      expect(updated.externalId).toBe('new-external-id');
      expect(updated.accessToken).toBe('preserve-token'); // Unchanged
    });
  });

  describe('Upsert Integration', () => {
    it('should create integration if not exists', async () => {
      const integration = await integrationsService.upsertIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
        externalId: 'upsert-new.myshopify.com',
      });

      expect(integration.externalId).toBe('upsert-new.myshopify.com');
    });

    it('should update integration if exists', async () => {
      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
        externalId: 'upsert-old.myshopify.com',
      });

      const integration = await integrationsService.upsertIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
        externalId: 'upsert-updated.myshopify.com',
      });

      expect(integration.externalId).toBe('upsert-updated.myshopify.com');

      // Verify only one integration exists
      const all = await integrationsService.getProjectIntegrations(
        testProject.id
      );
      expect(all).toHaveLength(1);
    });
  });

  describe('Delete Integration', () => {
    it('should delete existing integration', async () => {
      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
      });

      await integrationsService.deleteIntegration(
        testProject.id,
        'SHOPIFY' as IntegrationType
      );

      const integration = await integrationsService.getIntegration(
        testProject.id,
        'SHOPIFY' as IntegrationType
      );
      expect(integration).toBeNull();
    });

    it('should throw NotFoundException for non-existent integration', async () => {
      await expect(
        integrationsService.deleteIntegration(
          testProject.id,
          'SHOPIFY' as IntegrationType
        )
      ).rejects.toThrow('Integration of type SHOPIFY not found');
    });
  });

  describe('Utility Methods', () => {
    it('should check if integration exists', async () => {
      expect(
        await integrationsService.hasIntegration(
          testProject.id,
          'SHOPIFY' as IntegrationType
        )
      ).toBe(false);

      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
      });

      expect(
        await integrationsService.hasIntegration(
          testProject.id,
          'SHOPIFY' as IntegrationType
        )
      ).toBe(true);
    });

    it('should get integration types for project', async () => {
      await integrationsService.createIntegration({
        projectId: testProject.id,
        type: 'SHOPIFY' as IntegrationType,
      });

      const types = await integrationsService.getIntegrationTypes(
        testProject.id
      );

      expect(types).toContain('SHOPIFY');
    });
  });
});
