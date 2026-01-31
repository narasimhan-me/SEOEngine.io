/**
 * MEDIA-1-TESTS: Integration tests for Media & Accessibility pillar
 *
 * Tests:
 * - Per-product media stats computation
 * - Project-level scorecard aggregation
 * - Alt text classification (good, generic, missing)
 * - Issue generation for missing/generic alt text
 * - Fix draft lifecycle (create, apply)
 * - Access control (membership-aware)
 *
 * NOTE: These tests require a test database to be configured.
 * They exercise the service layer directly without mocking Prisma.
 */
import { MediaAccessibilityService } from '../../../src/projects/media-accessibility.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('MediaAccessibilityService (integration)', () => {
  let service: MediaAccessibilityService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string };
  let testProject: { id: string; name: string; domain: string };
  let testProduct: { id: string; title: string };

  beforeAll(async () => {
    roleResolutionService = new RoleResolutionService(testPrisma as any);
    service = new MediaAccessibilityService(
      testPrisma as any,
      roleResolutionService
    );
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();

    // Create test user and project
    testUser = await testPrisma.user.create({
      data: {
        email: `media-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Media Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'Media Test Project',
        domain: 'media-test.example.com',
        userId: testUser.id,
      },
    });

    // Create a test product
    testProduct = await testPrisma.product.create({
      data: {
        projectId: testProject.id,
        title: 'Burton Custom Snowboard',
        description: 'High-performance snowboard for all conditions',
      },
    });
  });

  describe('Product Media Stats', () => {
    it('should return zero stats for product with no images', async () => {
      const stats = await service.computeProductMediaStats(
        testProduct.id,
        testProduct.title
      );

      expect(stats.productId).toBe(testProduct.id);
      expect(stats.totalImages).toBe(0);
      expect(stats.imagesWithAnyAlt).toBe(0);
      expect(stats.imagesWithoutAlt).toBe(0);
      expect(stats.altTextCoveragePercent).toBe(0);
    });

    it('should compute correct stats for images with good alt text', async () => {
      // Add images with good alt text
      await testPrisma.productImage.createMany({
        data: [
          {
            productId: testProduct.id,
            externalId: 'img-1',
            src: 'https://example.com/img1.jpg',
            altText: 'Burton Custom Snowboard showing the top graphic design with mountain pattern',
            position: 1,
          },
          {
            productId: testProduct.id,
            externalId: 'img-2',
            src: 'https://example.com/img2.jpg',
            altText: 'Side view of Burton Custom Snowboard highlighting the camber profile',
            position: 2,
          },
        ],
      });

      const stats = await service.computeProductMediaStats(
        testProduct.id,
        testProduct.title
      );

      expect(stats.totalImages).toBe(2);
      expect(stats.imagesWithGoodAlt).toBe(2);
      expect(stats.imagesWithGenericAlt).toBe(0);
      expect(stats.imagesWithoutAlt).toBe(0);
      expect(stats.altTextCoveragePercent).toBe(100);
      expect(stats.goodAltTextCoveragePercent).toBe(100);
    });

    it('should detect generic alt text', async () => {
      await testPrisma.productImage.createMany({
        data: [
          {
            productId: testProduct.id,
            externalId: 'img-1',
            src: 'https://example.com/img1.jpg',
            altText: 'product image', // Generic
            position: 1,
          },
          {
            productId: testProduct.id,
            externalId: 'img-2',
            src: 'https://example.com/img2.jpg',
            altText: 'Burton Custom Snowboard', // Just product name - generic
            position: 2,
          },
        ],
      });

      const stats = await service.computeProductMediaStats(
        testProduct.id,
        testProduct.title
      );

      expect(stats.totalImages).toBe(2);
      expect(stats.imagesWithGenericAlt).toBe(2);
      expect(stats.imagesWithGoodAlt).toBe(0);
      expect(stats.altTextCoveragePercent).toBe(100);
      expect(stats.goodAltTextCoveragePercent).toBe(0);
    });

    it('should detect missing alt text', async () => {
      await testPrisma.productImage.createMany({
        data: [
          {
            productId: testProduct.id,
            externalId: 'img-1',
            src: 'https://example.com/img1.jpg',
            altText: null, // Missing
            position: 1,
          },
          {
            productId: testProduct.id,
            externalId: 'img-2',
            src: 'https://example.com/img2.jpg',
            altText: '', // Empty = missing
            position: 2,
          },
        ],
      });

      const stats = await service.computeProductMediaStats(
        testProduct.id,
        testProduct.title
      );

      expect(stats.totalImages).toBe(2);
      expect(stats.imagesWithoutAlt).toBe(2);
      expect(stats.imagesWithAnyAlt).toBe(0);
      expect(stats.altTextCoveragePercent).toBe(0);
    });

    it('should detect images with captions', async () => {
      await testPrisma.productImage.create({
        data: {
          productId: testProduct.id,
          externalId: 'img-1',
          src: 'https://example.com/img1.jpg',
          altText: 'Snowboard image',
          caption: 'Perfect for powder days in the backcountry',
          position: 1,
        },
      });

      const stats = await service.computeProductMediaStats(
        testProduct.id,
        testProduct.title
      );

      expect(stats.imagesWithCaptions).toBe(1);
      expect(stats.hasContextualMedia).toBe(true);
    });
  });

  describe('Project Media Data', () => {
    it('should return empty scorecard for project with no products', async () => {
      // Delete test product
      await testPrisma.product.delete({
        where: { id: testProduct.id },
      });

      const { scorecard, stats } = await service.getProjectMediaData(
        testProject.id,
        testUser.id
      );

      expect(scorecard.totalProducts).toBe(0);
      expect(scorecard.overallScore).toBe(0);
      expect(stats).toHaveLength(0);
    });

    it('should aggregate stats across multiple products', async () => {
      // Add images to first product
      await testPrisma.productImage.create({
        data: {
          productId: testProduct.id,
          externalId: 'img-1',
          src: 'https://example.com/img1.jpg',
          altText: 'Good descriptive alt text for first product image',
          position: 1,
        },
      });

      // Create second product with missing alt text
      const product2 = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Product Two',
          description: 'Second product',
        },
      });

      await testPrisma.productImage.create({
        data: {
          productId: product2.id,
          externalId: 'img-1',
          src: 'https://example.com/img2.jpg',
          altText: null, // Missing
          position: 1,
        },
      });

      const { scorecard, stats } = await service.getProjectMediaData(
        testProject.id,
        testUser.id
      );

      expect(stats).toHaveLength(2);
      expect(scorecard.totalProducts).toBe(2);
      expect(scorecard.productsWithIssues).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        service.getProjectMediaData('non-existent-id', testUser.id)
      ).rejects.toThrow('Project not found');
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      const otherUser = await testPrisma.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Other User',
        },
      });

      await expect(
        service.getProjectMediaData(testProject.id, otherUser.id)
      ).rejects.toThrow();
    });
  });

  describe('Product Media Data', () => {
    it('should return complete product media data', async () => {
      await testPrisma.productImage.create({
        data: {
          productId: testProduct.id,
          externalId: 'img-1',
          src: 'https://example.com/img1.jpg',
          altText: 'Descriptive alt text',
          position: 1,
        },
      });

      const data = await service.getProductMediaData(
        testProduct.id,
        testUser.id
      );

      expect(data.stats).toBeDefined();
      expect(data.images).toHaveLength(1);
      expect(data.images[0].id).toBe('img-1');
      expect(data.images[0].altTextQuality).toBeDefined();
      expect(Array.isArray(data.openDrafts)).toBe(true);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      await expect(
        service.getProductMediaData('non-existent-id', testUser.id)
      ).rejects.toThrow('Product not found');
    });

    it('should classify alt text quality for each image', async () => {
      await testPrisma.productImage.createMany({
        data: [
          {
            productId: testProduct.id,
            externalId: 'img-good',
            src: 'https://example.com/good.jpg',
            altText: 'Detailed description of the snowboard with mountain background and rider using it',
            position: 1,
          },
          {
            productId: testProduct.id,
            externalId: 'img-generic',
            src: 'https://example.com/generic.jpg',
            altText: 'product image',
            position: 2,
          },
          {
            productId: testProduct.id,
            externalId: 'img-missing',
            src: 'https://example.com/missing.jpg',
            altText: null,
            position: 3,
          },
        ],
      });

      const data = await service.getProductMediaData(
        testProduct.id,
        testUser.id
      );

      const goodImage = data.images.find((i) => i.id === 'img-good');
      const genericImage = data.images.find((i) => i.id === 'img-generic');
      const missingImage = data.images.find((i) => i.id === 'img-missing');

      expect(goodImage?.altTextQuality).toBe('good');
      expect(genericImage?.altTextQuality).toBe('generic');
      expect(missingImage?.altTextQuality).toBe('missing');
    });
  });

  describe('Issue Generation', () => {
    it('should generate issue for missing alt text', async () => {
      await testPrisma.productImage.createMany({
        data: [
          {
            productId: testProduct.id,
            externalId: 'img-1',
            src: 'https://example.com/img1.jpg',
            altText: null,
            position: 1,
          },
          {
            productId: testProduct.id,
            externalId: 'img-2',
            src: 'https://example.com/img2.jpg',
            altText: null,
            position: 2,
          },
        ],
      });

      const issues = await service.buildMediaIssuesForProject(testProject.id);

      const missingAltIssue = issues.find(
        (i) => i.type === 'missing_image_alt_text'
      );
      expect(missingAltIssue).toBeDefined();
      expect(missingAltIssue?.pillarId).toBe('media_accessibility');
      expect(missingAltIssue?.imageCountAffected).toBe(2);
    });

    it('should generate issue for generic alt text', async () => {
      await testPrisma.productImage.createMany({
        data: [
          {
            productId: testProduct.id,
            externalId: 'img-1',
            src: 'https://example.com/img1.jpg',
            altText: 'product image',
            position: 1,
          },
          {
            productId: testProduct.id,
            externalId: 'img-2',
            src: 'https://example.com/img2.jpg',
            altText: 'Burton Custom Snowboard', // Just product name
            position: 2,
          },
        ],
      });

      const issues = await service.buildMediaIssuesForProject(testProject.id);

      const genericAltIssue = issues.find(
        (i) => i.type === 'generic_image_alt_text'
      );
      expect(genericAltIssue).toBeDefined();
      expect(genericAltIssue?.severity).toBe('warning');
    });

    it('should return empty array for project with no products', async () => {
      await testPrisma.product.delete({
        where: { id: testProduct.id },
      });

      const issues = await service.buildMediaIssuesForProject(testProject.id);

      expect(issues).toHaveLength(0);
    });

    it('should generate issue for insufficient image coverage', async () => {
      // Create 3 products with only 1 image each
      await testPrisma.productImage.create({
        data: {
          productId: testProduct.id,
          externalId: 'img-1',
          src: 'https://example.com/img1.jpg',
          altText: 'Good alt text',
          position: 1,
        },
      });

      for (let i = 0; i < 2; i++) {
        const product = await testPrisma.product.create({
          data: {
            projectId: testProject.id,
            title: `Product ${i + 2}`,
            description: 'Description',
          },
        });

        await testPrisma.productImage.create({
          data: {
            productId: product.id,
            externalId: `img-${i + 2}`,
            src: `https://example.com/img${i + 2}.jpg`,
            altText: 'Good descriptive alt text for image',
            position: 1,
          },
        });
      }

      const issues = await service.buildMediaIssuesForProject(testProject.id);

      const insufficientCoverageIssue = issues.find(
        (i) => i.type === 'insufficient_image_coverage'
      );
      expect(insufficientCoverageIssue).toBeDefined();
      expect(insufficientCoverageIssue?.count).toBe(3);
    });

    it('should assign appropriate severity based on missing alt count', async () => {
      // Create 10+ images without alt text = critical
      for (let i = 0; i < 12; i++) {
        await testPrisma.productImage.create({
          data: {
            productId: testProduct.id,
            externalId: `img-${i}`,
            src: `https://example.com/img${i}.jpg`,
            altText: null,
            position: i,
          },
        });
      }

      const issues = await service.buildMediaIssuesForProject(testProject.id);

      const missingAltIssue = issues.find(
        (i) => i.type === 'missing_image_alt_text'
      );
      expect(missingAltIssue?.severity).toBe('critical');
    });
  });

  describe('Fix Draft Lifecycle', () => {
    it('should create and find draft by work key', async () => {
      await testPrisma.productImage.create({
        data: {
          productId: testProduct.id,
          externalId: 'img-1',
          src: 'https://example.com/img1.jpg',
          altText: null,
          position: 1,
        },
      });

      const draft = await service.createDraft({
        productId: testProduct.id,
        imageId: 'img-1',
        draftType: 'image_alt_text',
        draftPayload: {
          altText: 'Generated alt text for the snowboard image showing winter scene',
        },
        aiWorkKey: 'media_alt_testProduct_img-1',
        generatedWithAi: true,
      });

      expect(draft.id).toBeDefined();
      expect(draft.draftPayload.altText).toContain('Generated alt text');

      // Find by work key
      const found = await service.findDraftByWorkKey(
        'media_alt_testProduct_img-1'
      );
      expect(found).not.toBeNull();
      expect(found?.id).toBe(draft.id);
    });

    it('should apply draft and update image alt text', async () => {
      await testPrisma.productImage.create({
        data: {
          productId: testProduct.id,
          externalId: 'img-1',
          src: 'https://example.com/img1.jpg',
          altText: null,
          position: 1,
        },
      });

      const draft = await service.createDraft({
        productId: testProduct.id,
        imageId: 'img-1',
        draftType: 'image_alt_text',
        draftPayload: {
          altText: 'New descriptive alt text for the snowboard showing mountain terrain',
        },
        aiWorkKey: 'media_alt_testProduct_img-1',
        generatedWithAi: true,
      });

      const result = await service.applyDraft({
        productId: testProduct.id,
        draftId: draft.id,
        applyTarget: 'IMAGE_ALT',
        userId: testUser.id,
      });

      expect(result.success).toBe(true);
      expect(result.updatedStats.imagesWithoutAlt).toBe(0);
      expect(result.issuesResolved).toBe(true);

      // Verify image was updated
      const updatedImage = await testPrisma.productImage.findFirst({
        where: { productId: testProduct.id, externalId: 'img-1' },
      });
      expect(updatedImage?.altText).toBe(
        'New descriptive alt text for the snowboard showing mountain terrain'
      );
    });

    it('should throw NotFoundException for non-existent draft', async () => {
      await expect(
        service.applyDraft({
          productId: testProduct.id,
          draftId: 'non-existent-id',
          applyTarget: 'IMAGE_ALT',
          userId: testUser.id,
        })
      ).rejects.toThrow('Draft not found');
    });

    it('should record draft application', async () => {
      await testPrisma.productImage.create({
        data: {
          productId: testProduct.id,
          externalId: 'img-1',
          src: 'https://example.com/img1.jpg',
          altText: null,
          position: 1,
        },
      });

      const draft = await service.createDraft({
        productId: testProduct.id,
        imageId: 'img-1',
        draftType: 'image_alt_text',
        draftPayload: { altText: 'Applied alt text' },
        aiWorkKey: 'media_alt_testProduct_img-1',
        generatedWithAi: true,
      });

      await service.applyDraft({
        productId: testProduct.id,
        draftId: draft.id,
        applyTarget: 'IMAGE_ALT',
        userId: testUser.id,
      });

      // Verify application was recorded
      const applications = await testPrisma.productMediaFixApplication.findMany({
        where: { productId: testProduct.id },
      });
      expect(applications).toHaveLength(1);
      expect(applications[0].appliedByUserId).toBe(testUser.id);
    });
  });

  describe('Multi-user Access', () => {
    it('should allow project member to access media data', async () => {
      const memberUser = await testPrisma.user.create({
        data: {
          email: `member-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Member User',
        },
      });

      await testPrisma.projectMember.create({
        data: {
          projectId: testProject.id,
          userId: memberUser.id,
          role: 'VIEWER',
        },
      });

      const data = await service.getProductMediaData(
        testProduct.id,
        memberUser.id
      );

      expect(data.stats).toBeDefined();
    });
  });

  describe('Project Media Accessibility Response', () => {
    it('should return complete response with drafts', async () => {
      await testPrisma.productImage.create({
        data: {
          productId: testProduct.id,
          externalId: 'img-1',
          src: 'https://example.com/img1.jpg',
          altText: null,
          position: 1,
        },
      });

      // Create a draft
      await service.createDraft({
        productId: testProduct.id,
        imageId: 'img-1',
        draftType: 'image_alt_text',
        draftPayload: { altText: 'Pending alt text' },
        aiWorkKey: 'media_alt_test_img-1',
        generatedWithAi: true,
      });

      const response = await service.getProjectMediaAccessibility(
        testProject.id,
        testUser.id
      );

      expect(response.projectId).toBe(testProject.id);
      expect(response.scorecard).toBeDefined();
      expect(response.stats).toHaveLength(1);
      expect(response.openDrafts).toHaveLength(1);
    });
  });
});
