/**
 * Unit tests for IntegrationsService
 *
 * Tests:
 * - getProjectIntegrations() returns all integrations for a project
 * - getIntegration() returns specific integration by type
 * - getIntegrationById() returns integration by ID
 * - createIntegration() creates new integration
 * - createIntegration() throws when integration already exists
 * - updateIntegration() updates existing integration
 * - updateIntegration() throws when integration not found
 * - upsertIntegration() creates or updates integration
 * - deleteIntegration() deletes integration
 * - hasIntegration() checks if integration exists
 * - getIntegrationTypes() returns integration types for project
 */
import { IntegrationsService } from '../../../src/integrations/integrations.service';
import { PrismaService } from '../../../src/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IntegrationType } from '@prisma/client';

const createPrismaMock = () => ({
  integration: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
});

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new IntegrationsService(prismaMock as unknown as PrismaService);
  });

  describe('getProjectIntegrations', () => {
    it('should return all integrations for a project', async () => {
      const mockIntegrations = [
        {
          id: 'int-1',
          projectId: 'proj-1',
          type: IntegrationType.SHOPIFY,
          externalId: 'store.myshopify.com',
          createdAt: new Date(),
        },
        {
          id: 'int-2',
          projectId: 'proj-1',
          type: IntegrationType.WOOCOMMERCE,
          externalId: 'store.example.com',
          createdAt: new Date(),
        },
      ];

      prismaMock.integration.findMany.mockResolvedValue(mockIntegrations);

      const result = await service.getProjectIntegrations('proj-1');

      expect(result).toEqual(mockIntegrations);
      expect(prismaMock.integration.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getIntegration', () => {
    it('should return integration by project and type', async () => {
      const mockIntegration = {
        id: 'int-1',
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
        externalId: 'store.myshopify.com',
      };

      prismaMock.integration.findUnique.mockResolvedValue(mockIntegration);

      const result = await service.getIntegration(
        'proj-1',
        IntegrationType.SHOPIFY
      );

      expect(result).toEqual(mockIntegration);
      expect(prismaMock.integration.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_type: {
            projectId: 'proj-1',
            type: IntegrationType.SHOPIFY,
          },
        },
      });
    });
  });

  describe('getIntegrationById', () => {
    it('should return integration by ID', async () => {
      const mockIntegration = {
        id: 'int-1',
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
      };

      prismaMock.integration.findUnique.mockResolvedValue(mockIntegration);

      const result = await service.getIntegrationById('int-1');

      expect(result).toEqual(mockIntegration);
      expect(prismaMock.integration.findUnique).toHaveBeenCalledWith({
        where: { id: 'int-1' },
      });
    });
  });

  describe('createIntegration', () => {
    it('should create new integration', async () => {
      const mockIntegration = {
        id: 'int-1',
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
        externalId: 'store.myshopify.com',
        accessToken: 'token',
        config: { shop: 'store' },
      };

      prismaMock.integration.findUnique.mockResolvedValue(null);
      prismaMock.integration.create.mockResolvedValue(mockIntegration);

      const result = await service.createIntegration({
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
        externalId: 'store.myshopify.com',
        accessToken: 'token',
        config: { shop: 'store' },
      });

      expect(result).toEqual(mockIntegration);
      expect(prismaMock.integration.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          type: IntegrationType.SHOPIFY,
          externalId: 'store.myshopify.com',
          accessToken: 'token',
          config: { shop: 'store' },
        },
      });
    });

    it('should throw BadRequestException when integration already exists', async () => {
      const existingIntegration = {
        id: 'int-1',
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
      };

      prismaMock.integration.findUnique.mockResolvedValue(existingIntegration);

      await expect(
        service.createIntegration({
          projectId: 'proj-1',
          type: IntegrationType.SHOPIFY,
        })
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.integration.create).not.toHaveBeenCalled();
    });
  });

  describe('updateIntegration', () => {
    it('should update existing integration', async () => {
      const existingIntegration = {
        id: 'int-1',
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
        externalId: 'old-store.myshopify.com',
        accessToken: 'old-token',
        config: { shop: 'old-store' },
      };

      const updatedIntegration = {
        ...existingIntegration,
        externalId: 'new-store.myshopify.com',
      };

      prismaMock.integration.findUnique
        .mockResolvedValueOnce(existingIntegration)
        .mockResolvedValueOnce(existingIntegration);
      prismaMock.integration.update.mockResolvedValue(updatedIntegration);

      const result = await service.updateIntegration(
        'proj-1',
        IntegrationType.SHOPIFY,
        {
          externalId: 'new-store.myshopify.com',
        }
      );

      expect(result).toEqual(updatedIntegration);
      expect(prismaMock.integration.update).toHaveBeenCalledWith({
        where: {
          projectId_type: {
            projectId: 'proj-1',
            type: IntegrationType.SHOPIFY,
          },
        },
        data: {
          externalId: 'new-store.myshopify.com',
          accessToken: 'old-token',
          config: { shop: 'old-store' },
        },
      });
    });

    it('should throw NotFoundException when integration not found', async () => {
      prismaMock.integration.findUnique.mockResolvedValue(null);

      await expect(
        service.updateIntegration('proj-1', IntegrationType.SHOPIFY, {
          externalId: 'new-store.myshopify.com',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertIntegration', () => {
    it('should create integration when it does not exist', async () => {
      const mockIntegration = {
        id: 'int-1',
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
        externalId: 'store.myshopify.com',
      };

      prismaMock.integration.upsert.mockResolvedValue(mockIntegration);

      const result = await service.upsertIntegration({
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
        externalId: 'store.myshopify.com',
      });

      expect(result).toEqual(mockIntegration);
      expect(prismaMock.integration.upsert).toHaveBeenCalled();
    });

    it('should update integration when it exists', async () => {
      const mockIntegration = {
        id: 'int-1',
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
        externalId: 'new-store.myshopify.com',
      };

      prismaMock.integration.upsert.mockResolvedValue(mockIntegration);

      const result = await service.upsertIntegration({
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
        externalId: 'new-store.myshopify.com',
      });

      expect(result).toEqual(mockIntegration);
      expect(prismaMock.integration.upsert).toHaveBeenCalled();
    });
  });

  describe('deleteIntegration', () => {
    it('should delete integration', async () => {
      const existingIntegration = {
        id: 'int-1',
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
      };

      prismaMock.integration.findUnique.mockResolvedValue(existingIntegration);
      prismaMock.integration.delete.mockResolvedValue(existingIntegration);

      const result = await service.deleteIntegration(
        'proj-1',
        IntegrationType.SHOPIFY
      );

      expect(result).toEqual(existingIntegration);
      expect(prismaMock.integration.delete).toHaveBeenCalledWith({
        where: {
          projectId_type: {
            projectId: 'proj-1',
            type: IntegrationType.SHOPIFY,
          },
        },
      });
    });

    it('should throw NotFoundException when integration not found', async () => {
      prismaMock.integration.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteIntegration('proj-1', IntegrationType.SHOPIFY)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasIntegration', () => {
    it('should return true when integration exists', async () => {
      const mockIntegration = {
        id: 'int-1',
        projectId: 'proj-1',
        type: IntegrationType.SHOPIFY,
      };

      prismaMock.integration.findUnique.mockResolvedValue(mockIntegration);

      const result = await service.hasIntegration(
        'proj-1',
        IntegrationType.SHOPIFY
      );

      expect(result).toBe(true);
    });

    it('should return false when integration does not exist', async () => {
      prismaMock.integration.findUnique.mockResolvedValue(null);

      const result = await service.hasIntegration(
        'proj-1',
        IntegrationType.SHOPIFY
      );

      expect(result).toBe(false);
    });
  });

  describe('getIntegrationTypes', () => {
    it('should return integration types for project', async () => {
      const mockIntegrations = [
        { type: IntegrationType.SHOPIFY },
        { type: IntegrationType.WOOCOMMERCE },
      ];

      prismaMock.integration.findMany.mockResolvedValue(mockIntegrations);

      const result = await service.getIntegrationTypes('proj-1');

      expect(result).toEqual([
        IntegrationType.SHOPIFY,
        IntegrationType.WOOCOMMERCE,
      ]);
      expect(prismaMock.integration.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        select: { type: true },
      });
    });
  });
});
