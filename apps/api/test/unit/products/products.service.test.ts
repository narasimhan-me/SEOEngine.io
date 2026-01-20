/**
 * Unit tests for ProductsService
 *
 * Tests:
 * - getProductsForProject() returns products with ownership validation
 * - getProductsForProject() throws NotFoundException when project not found
 * - getProductsForProject() throws ForbiddenException when user doesn't own project
 * - getProduct() returns single product with ownership validation
 * - getProduct() throws NotFoundException when product not found
 * - getProduct() throws ForbiddenException when user doesn't own product
 */
import { ProductsService } from '../../../src/products/products.service';
import { PrismaService } from '../../../src/prisma.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { DeoIssuesService } from '../../../src/projects/deo-issues.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  automationPlaybookDraft: {
    findMany: jest.fn().mockResolvedValue([]),
  },
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  assertOwnerRole: jest.fn().mockResolvedValue(undefined),
  hasProjectAccess: jest.fn().mockResolvedValue(true),
  isMultiUserProject: jest.fn().mockResolvedValue(false),
  canApply: jest.fn().mockResolvedValue(true),
});

const createDeoIssuesServiceMock = () => ({
  getIssuesForProjectReadOnly: jest.fn().mockResolvedValue({
    projectId: 'proj-1',
    generatedAt: new Date().toISOString(),
    issues: [],
  }),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let roleResolutionServiceMock: ReturnType<
    typeof createRoleResolutionServiceMock
  >;
  let deoIssuesServiceMock: ReturnType<typeof createDeoIssuesServiceMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();
    deoIssuesServiceMock = createDeoIssuesServiceMock();
    service = new ProductsService(
      prismaMock as unknown as PrismaService,
      roleResolutionServiceMock as unknown as RoleResolutionService,
      deoIssuesServiceMock as any
    );
  });

  describe('getProductsForProject', () => {
    it('should return products when project exists and user owns it', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          externalId: 'ext-1',
          title: 'Product 1',
          description: 'Description 1',
          seoTitle: 'SEO Title 1',
          seoDescription: 'SEO Desc 1',
          imageUrls: [],
          lastSyncedAt: new Date(),
        },
        {
          id: 'prod-2',
          externalId: 'ext-2',
          title: 'Product 2',
          description: 'Description 2',
          seoTitle: null,
          seoDescription: null,
          imageUrls: [],
          lastSyncedAt: new Date(),
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.automationPlaybookDraft.findMany.mockResolvedValue([]);
      roleResolutionServiceMock.canApply.mockResolvedValue(true);
      deoIssuesServiceMock.getIssuesForProjectReadOnly.mockResolvedValue({
        projectId: 'proj-1',
        generatedAt: new Date().toISOString(),
        issues: [],
      });

      const result = await service.getProductsForProject('proj-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'prod-1',
        externalId: 'ext-1',
        title: 'Product 1',
        hasDraftPendingApply: false,
        actionableNowCount: 0,
        detectedIssueCount: 0,
        blockedByApproval: false,
      });
      expect(
        roleResolutionServiceMock.assertProjectAccess
      ).toHaveBeenCalledWith('proj-1', 'user-1');
      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        orderBy: { lastSyncedAt: 'desc' },
        select: {
          id: true,
          externalId: true,
          title: true,
          description: true,
          handle: true,
          seoTitle: true,
          seoDescription: true,
          imageUrls: true,
          lastSyncedAt: true,
        },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);
      roleResolutionServiceMock.assertProjectAccess.mockRejectedValue(
        new NotFoundException('Project not found')
      );

      await expect(
        service.getProductsForProject('proj-1', 'user-1')
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'other-user',
        name: 'Test Project',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      roleResolutionServiceMock.assertProjectAccess.mockRejectedValue(
        new ForbiddenException('You do not have access to this project')
      );

      await expect(
        service.getProductsForProject('proj-1', 'user-1')
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getProduct', () => {
    it('should return product when it exists and user owns the project', async () => {
      const mockProduct = {
        id: 'prod-1',
        externalId: 'ext-1',
        title: 'Product 1',
        description: 'Description 1',
        project: {
          id: 'proj-1',
          userId: 'user-1',
          name: 'Test Project',
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProduct('prod-1', 'user-1');

      expect(result).toEqual(mockProduct);
      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: {
          project: true,
        },
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.getProduct('prod-1', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user does not own the project', async () => {
      const mockProduct = {
        id: 'prod-1',
        project: {
          id: 'proj-1',
          userId: 'other-user',
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      roleResolutionServiceMock.assertProjectAccess.mockRejectedValue(
        new ForbiddenException('You do not have access to this project')
      );

      await expect(service.getProduct('prod-1', 'user-1')).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});
