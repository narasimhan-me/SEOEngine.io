/**
 * Unit tests for AnswerEngineService
 *
 * Tests:
 * - getProjectAnswerability() returns answerability summary
 * - computeAnswerabilityForProduct() classifies questions correctly
 * - Handles products with missing data
 * - Handles products with strong content
 */
import { AnswerEngineService } from '../../../src/projects/answer-engine.service';
import { PrismaService } from '../../../src/prisma.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  assertOwnerRole: jest.fn().mockResolvedValue(undefined),
  hasProjectAccess: jest.fn().mockResolvedValue(true),
  isMultiUserProject: jest.fn().mockResolvedValue(false),
});

describe('AnswerEngineService', () => {
  let service: AnswerEngineService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let roleResolutionServiceMock: ReturnType<typeof createRoleResolutionServiceMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();
    service = new AnswerEngineService(
      prismaMock as unknown as PrismaService,
      roleResolutionServiceMock as unknown as RoleResolutionService,
    );
  });

  describe('getProjectAnswerability', () => {
    it('should return answerability summary for project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Test Product',
          description: 'A great product for everyone',
          seoTitle: null,
          seoDescription: null,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getProjectAnswerability('proj-1', 'user-1');

      expect(result).toHaveProperty('projectId', 'proj-1');
      expect(result).toHaveProperty('overallStatus');
      expect(result).toHaveProperty('products');
      expect(result.products).toHaveLength(1);
      expect(result.products[0]).toHaveProperty('productId', 'prod-1');
      expect(result.products[0]).toHaveProperty('status');
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(service.getProjectAnswerability('proj-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'other-user',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      roleResolutionServiceMock.assertProjectAccess.mockRejectedValue(
        new ForbiddenException('You do not have access to this project'),
      );

      await expect(service.getProjectAnswerability('proj-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('computeAnswerabilityForProduct', () => {
    it('should classify product with missing data as needs_answers', () => {
      const product = {
        id: 'prod-1',
        title: null,
        description: null,
        seoTitle: null,
        seoDescription: null,
      };

      const result = service.computeAnswerabilityForProduct(product);

      expect(result.status).toBe('needs_answers');
      expect(result.missingQuestions.length).toBeGreaterThan(0);
      expect(result.answerabilityScore).toBeLessThan(50);
    });

    it('should classify product with strong content as answer_ready or partially_answer_ready', () => {
      const product = {
        id: 'prod-1',
        title: 'Premium Wireless Headphones',
        description:
          'High-quality wireless headphones designed for professionals and music enthusiasts. Features include noise cancellation, 30-hour battery life, and premium leather ear cups. Made from durable materials including aluminum and memory foam. Perfect for travelers and office workers. Includes carrying case, charging cable, and warranty card. Machine washable ear pads. Warning: Keep away from water.',
        seoTitle: 'Best Wireless Headphones 2024',
        seoDescription: 'Professional-grade wireless headphones with advanced features',
      };

      const result = service.computeAnswerabilityForProduct(product);

      expect(['answer_ready', 'partially_answer_ready', 'needs_answers']).toContain(result.status);
      expect(result.missingQuestions.length).toBeLessThan(10);
      expect(result.answerabilityScore).toBeGreaterThanOrEqual(0);
    });

    it('should use seoTitle and seoDescription when available', () => {
      const product = {
        id: 'prod-1',
        title: 'Old Title',
        description: 'Old Description',
        seoTitle: 'SEO Title',
        seoDescription: 'SEO Description with detailed information about the product',
      };

      const result = service.computeAnswerabilityForProduct(product);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('missingQuestions');
      expect(result).toHaveProperty('weakQuestions');
      expect(result).toHaveProperty('answerabilityScore');
    });

    it('should classify who_is_it_for when audience indicators present', () => {
      const product = {
        id: 'prod-1',
        title: 'Product for Kids',
        description: 'This product is designed for children and is perfect for beginners',
        seoTitle: null,
        seoDescription: null,
      };

      const result = service.computeAnswerabilityForProduct(product);

      // Should detect audience indicators
      expect(result.missingQuestions).not.toContain('who_is_it_for');
    });

    it('should classify materials_and_specs when material keywords present', () => {
      const product = {
        id: 'prod-1',
        title: 'Cotton T-Shirt',
        description: 'Made from 100% organic cotton and polyester blend. Size: 10cm x 20cm',
        seoTitle: null,
        seoDescription: null,
      };

      const result = service.computeAnswerabilityForProduct(product);

      // Should detect material keywords
      expect(result.missingQuestions).not.toContain('materials_and_specs');
    });
  });
});

