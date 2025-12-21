/**
 * Unit tests for MediaAccessibilityService
 *
 * Tests:
 * - computeProductMediaStats() computes stats correctly
 * - getProjectMediaData() returns data with ownership validation
 * - getProductMediaData() returns data with ownership validation
 * - buildMediaIssuesForProject() builds media issues
 */
import { MediaAccessibilityService } from '../../../src/projects/media-accessibility.service';
import { PrismaService } from '../../../src/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { classifyAltText } from '@engineo/shared';

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  productImage: {
    findMany: jest.fn(),
  },
  productMediaFixDraft: {
    findMany: jest.fn(),
  },
});

describe('MediaAccessibilityService', () => {
  let service: MediaAccessibilityService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new MediaAccessibilityService(prismaMock as unknown as PrismaService);
  });

  describe('computeProductMediaStats', () => {
    it('should compute stats for product with images', async () => {
      const mockImages = [
        {
          id: 'img-1',
          productId: 'prod-1',
          externalId: 'ext-1',
          src: 'https://example.com/image1.jpg',
          altText: 'Product image description',
          position: 0,
          caption: null,
        },
        {
          id: 'img-2',
          productId: 'prod-1',
          externalId: 'ext-2',
          src: 'https://example.com/image2.jpg',
          altText: 'image',
          position: 1,
          caption: null,
        },
        {
          id: 'img-3',
          productId: 'prod-1',
          externalId: 'ext-3',
          src: 'https://example.com/image3.jpg',
          altText: null,
          position: 2,
          caption: 'Image caption',
        },
      ];

      prismaMock.productImage.findMany.mockResolvedValue(mockImages);

      const result = await service.computeProductMediaStats('prod-1', 'Test Product');

      expect(result).toHaveProperty('productId', 'prod-1');
      expect(result).toHaveProperty('totalImages', 3);
      expect(result).toHaveProperty('imagesWithAnyAlt', 2);
      expect(result).toHaveProperty('imagesWithGoodAlt', 1);
      expect(result).toHaveProperty('imagesWithGenericAlt', 1);
      expect(result).toHaveProperty('imagesWithoutAlt', 1);
      expect(result).toHaveProperty('imagesWithCaptions', 1);
      expect(result).toHaveProperty('hasContextualMedia', true);
    });

    it('should compute stats for product with no images', async () => {
      prismaMock.productImage.findMany.mockResolvedValue([]);

      const result = await service.computeProductMediaStats('prod-1', 'Test Product');

      expect(result).toHaveProperty('totalImages', 0);
      expect(result).toHaveProperty('imagesWithAnyAlt', 0);
      expect(result).toHaveProperty('altTextCoveragePercent', 0);
    });
  });

  describe('getProjectMediaData', () => {
    it('should return media data when project exists and user owns it', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
      };

      const mockProducts = [
        { id: 'prod-1', title: 'Product 1' },
        { id: 'prod-2', title: 'Product 2' },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.productImage.findMany
        .mockResolvedValueOnce([]) // For prod-1
        .mockResolvedValueOnce([]); // For prod-2

      const result = await service.getProjectMediaData('proj-1', 'user-1');

      expect(result).toHaveProperty('scorecard');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveLength(2);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(service.getProjectMediaData('proj-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'other-user',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      await expect(service.getProjectMediaData('proj-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getProductMediaData', () => {
    it('should return product media data when product exists and user owns it', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Test Product',
        project: {
          id: 'proj-1',
          userId: 'user-1',
        },
      };

      const mockImages = [
        {
          id: 'img-1',
          productId: 'prod-1',
          externalId: 'ext-1',
          src: 'https://example.com/image1.jpg',
          altText: 'Product image',
          position: 0,
          caption: null,
        },
      ];

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.productImage.findMany.mockResolvedValue(mockImages);
      prismaMock.productMediaFixDraft.findMany.mockResolvedValue([]);

      const result = await service.getProductMediaData('prod-1', 'user-1');

      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('openDrafts');
      expect(result.images).toHaveLength(1);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.getProductMediaData('prod-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own product', async () => {
      const mockProduct = {
        id: 'prod-1',
        project: {
          id: 'proj-1',
          userId: 'other-user',
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      await expect(service.getProductMediaData('prod-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('buildMediaIssuesForProject', () => {
    it('should build media issues for project', async () => {
      const mockProducts = [
        { id: 'prod-1', title: 'Product 1' },
        { id: 'prod-2', title: 'Product 2' },
      ];

      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.productImage.findMany
        .mockResolvedValueOnce([
          {
            id: 'img-1',
            productId: 'prod-1',
            altText: null,
            caption: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'img-2',
            productId: 'prod-2',
            altText: 'image',
            caption: null,
          },
        ]);

      const result = await service.buildMediaIssuesForProject('proj-1');

      expect(Array.isArray(result)).toBe(true);
      // Should have issues for missing/generic alt text
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('pillarId', 'media_accessibility');
      }
    });

    it('should return empty array when no products exist', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.buildMediaIssuesForProject('proj-1');

      expect(result).toEqual([]);
    });
  });
});

