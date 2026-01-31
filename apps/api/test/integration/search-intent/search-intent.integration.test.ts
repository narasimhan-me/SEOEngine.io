/**
 * SEARCH-INTENT-1-TESTS: Integration tests for Search & Intent pillar
 *
 * Tests:
 * - Per-product intent coverage analysis
 * - Project-level scorecard aggregation
 * - Query template generation
 * - Intent gap detection
 * - Issue generation for DEO Engine
 * - Coverage persistence to database
 * - Cache invalidation
 * - Access control (membership-aware)
 *
 * NOTE: These tests require a test database to be configured.
 * They exercise the service layer directly without mocking Prisma.
 */
import { SearchIntentService } from '../../../src/projects/search-intent.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import type { SearchIntentType } from '@engineo/shared';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('SearchIntentService (integration)', () => {
  let service: SearchIntentService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string };
  let testProject: { id: string; name: string; domain: string };
  let testProduct: { id: string; title: string };

  beforeAll(async () => {
    roleResolutionService = new RoleResolutionService(testPrisma as any);
    service = new SearchIntentService(
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
        email: `search-intent-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Search Intent Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'Search Intent Test Project',
        domain: 'search-intent-test.example.com',
        userId: testUser.id,
      },
    });

    // Create a test product
    testProduct = await testPrisma.product.create({
      data: {
        projectId: testProject.id,
        title: 'Burton Custom Snowboard',
        description: 'High-performance snowboard for all mountain conditions',
        seoTitle: 'Burton Custom Snowboard - Best All Mountain Board',
        seoDescription: 'Buy the Burton Custom Snowboard for your next adventure',
      },
    });
  });

  describe('Intent Coverage Analysis', () => {
    it('should analyze product intent coverage for all intent types', async () => {
      const coverages = await service.analyzeProductIntent(testProduct.id);

      expect(coverages).toBeDefined();
      expect(coverages.length).toBe(5); // All 5 intent types

      const intentTypes = coverages.map((c) => c.intentType);
      expect(intentTypes).toContain('informational');
      expect(intentTypes).toContain('comparative');
      expect(intentTypes).toContain('transactional');
      expect(intentTypes).toContain('problem_use_case');
      expect(intentTypes).toContain('trust_validation');
    });

    it('should persist coverage to database', async () => {
      await service.analyzeProductIntent(testProduct.id);

      const dbCoverages = await testPrisma.productIntentCoverage.findMany({
        where: { productId: testProduct.id },
      });

      expect(dbCoverages.length).toBe(5);
      for (const coverage of dbCoverages) {
        expect(coverage.productId).toBe(testProduct.id);
        expect(coverage.score).toBeDefined();
        expect(coverage.coverageStatus).toBeDefined();
        expect(coverage.expectedQueries).toBeDefined();
      }
    });

    it('should throw NotFoundException for non-existent product', async () => {
      await expect(
        service.analyzeProductIntent('non-existent-id')
      ).rejects.toThrow('Product not found');
    });

    it('should detect transactional intent from product content', async () => {
      // Create product with transactional keywords
      const transactionalProduct = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Premium Widget',
          description: 'Buy now at the best price with free shipping and order today',
        },
      });

      const coverages = await service.analyzeProductIntent(transactionalProduct.id);

      const transactionalCoverage = coverages.find(
        (c) => c.intentType === 'transactional'
      );

      expect(transactionalCoverage).toBeDefined();
      expect(transactionalCoverage!.score).toBeGreaterThan(0);
      expect(transactionalCoverage!.coveredQueries.length).toBeGreaterThan(0);
    });

    it('should detect comparative intent from product content', async () => {
      const comparativeProduct = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Widget Pro',
          description: 'Compare to alternatives and see the difference. Better than the competition.',
        },
      });

      const coverages = await service.analyzeProductIntent(comparativeProduct.id);

      const comparativeCoverage = coverages.find(
        (c) => c.intentType === 'comparative'
      );

      expect(comparativeCoverage).toBeDefined();
      expect(comparativeCoverage!.score).toBeGreaterThan(0);
    });

    it('should include expected, covered, weak, and missing queries', async () => {
      const coverages = await service.analyzeProductIntent(testProduct.id);

      for (const coverage of coverages) {
        expect(Array.isArray(coverage.expectedQueries)).toBe(true);
        expect(Array.isArray(coverage.coveredQueries)).toBe(true);
        expect(Array.isArray(coverage.weakQueries)).toBe(true);
        expect(Array.isArray(coverage.missingQueries)).toBe(true);

        // Sum should equal expected
        const totalQueries =
          coverage.coveredQueries.length +
          coverage.weakQueries.length +
          coverage.missingQueries.length;
        expect(totalQueries).toBe(coverage.expectedQueries.length);
      }
    });
  });

  describe('Answer Block Integration', () => {
    it('should detect coverage from answer blocks', async () => {
      // Create product with answer blocks
      const productWithBlocks = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Widget Deluxe',
          description: 'Basic product',
        },
      });

      // Add answer blocks targeting specific intents
      await testPrisma.answerBlock.createMany({
        data: [
          {
            productId: productWithBlocks.id,
            questionText: 'How do I buy this Widget Deluxe?',
            answerText:
              'You can buy the Widget Deluxe at our store with competitive pricing.',
          },
          {
            productId: productWithBlocks.id,
            questionText: 'How does Widget Deluxe compare to alternatives?',
            answerText:
              'Widget Deluxe is better than alternatives in many ways.',
          },
        ],
      });

      const coverages = await service.analyzeProductIntent(productWithBlocks.id);

      // Should detect transactional coverage from answer block
      const transactional = coverages.find((c) => c.intentType === 'transactional');
      expect(transactional!.coveredQueries.length).toBeGreaterThan(0);

      // Should detect comparative coverage from answer block
      const comparative = coverages.find((c) => c.intentType === 'comparative');
      expect(comparative!.coveredQueries.length).toBeGreaterThan(0);
    });
  });

  describe('Product Intent Data', () => {
    it('should return complete product intent data', async () => {
      // First analyze coverage
      await service.analyzeProductIntent(testProduct.id);

      const data = await service.getProductIntentData(
        testProduct.id,
        testUser.id
      );

      expect(data.productId).toBe(testProduct.id);
      expect(data.coverage).toBeDefined();
      expect(data.coverage.length).toBe(5);
      expect(data.scorecard).toBeDefined();
      expect(data.scorecard.overallScore).toBeDefined();
      expect(data.scorecard.status).toBeDefined();
      expect(Array.isArray(data.openDrafts)).toBe(true);
    });

    it('should compute coverage on first access if not exists', async () => {
      // Don't analyze first - getProductIntentData should compute
      const data = await service.getProductIntentData(
        testProduct.id,
        testUser.id
      );

      expect(data.coverage).toBeDefined();
      expect(data.coverage.length).toBe(5);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      await expect(
        service.getProductIntentData('non-existent-id', testUser.id)
      ).rejects.toThrow('Product not found');
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
        service.getProductIntentData(testProduct.id, otherUser.id)
      ).rejects.toThrow();
    });

    it('should include scorecard with correct status', async () => {
      const data = await service.getProductIntentData(
        testProduct.id,
        testUser.id
      );

      expect(data.scorecard.overallScore).toBeGreaterThanOrEqual(0);
      expect(data.scorecard.overallScore).toBeLessThanOrEqual(100);
      expect(['Good', 'Needs improvement']).toContain(data.scorecard.status);
      expect(typeof data.scorecard.missingHighValueIntents).toBe('number');
    });
  });

  describe('Project Intent Summary', () => {
    it('should return empty summary for project with no products', async () => {
      // Delete the test product
      await testPrisma.product.delete({
        where: { id: testProduct.id },
      });

      const summary = await service.getProjectIntentSummary(
        testProject.id,
        testUser.id
      );

      expect(summary.totalProducts).toBe(0);
      expect(summary.overallScore).toBe(0);
      expect(summary.status).toBe('Needs improvement');
      expect(summary.intentBreakdown).toHaveLength(5);
    });

    it('should aggregate metrics across multiple products', async () => {
      // Create additional products
      const product2 = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Product Two',
          description: 'Buy this product with comparison to alternatives',
        },
      });

      const product3 = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Product Three',
          description: 'Another product',
        },
      });

      // Analyze all products
      await service.analyzeProductIntent(testProduct.id);
      await service.analyzeProductIntent(product2.id);
      await service.analyzeProductIntent(product3.id);

      const summary = await service.getProjectIntentSummary(
        testProject.id,
        testUser.id
      );

      expect(summary.totalProducts).toBe(3);
      expect(summary.overallScore).toBeDefined();
      expect(summary.intentBreakdown).toHaveLength(5);

      // Verify breakdown structure
      for (const breakdown of summary.intentBreakdown) {
        expect(breakdown.intentType).toBeDefined();
        expect(breakdown.label).toBeDefined();
        expect(breakdown.score).toBeDefined();
        expect(breakdown.status).toBeDefined();
        expect(breakdown.productsWithGaps).toBeDefined();
      }
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        service.getProjectIntentSummary('non-existent-id', testUser.id)
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
        service.getProjectIntentSummary(testProject.id, otherUser.id)
      ).rejects.toThrow();
    });

    it('should track products with gaps per intent type', async () => {
      // Create products with varying coverage
      const product2 = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Minimal Product',
          description: 'Very basic',
        },
      });

      await service.analyzeProductIntent(testProduct.id);
      await service.analyzeProductIntent(product2.id);

      const summary = await service.getProjectIntentSummary(
        testProject.id,
        testUser.id
      );

      // At least some intent types should have gaps
      const totalGaps = summary.intentBreakdown.reduce(
        (sum, b) => sum + b.productsWithGaps,
        0
      );
      expect(totalGaps).toBeGreaterThan(0);
    });
  });

  describe('Issue Generation', () => {
    it('should build search intent issues for project', async () => {
      // Analyze products first
      await service.analyzeProductIntent(testProduct.id);

      const issues = await service.buildSearchIntentIssues(testProject.id);

      expect(Array.isArray(issues)).toBe(true);

      // Verify issue structure
      for (const issue of issues) {
        expect(issue.pillarId).toBe('search_intent_fit');
        expect(issue.id).toBeDefined();
        expect(issue.title).toBeDefined();
        expect(issue.description).toBeDefined();
        expect(issue.severity).toBeDefined();
        expect(issue.affectedProducts).toBeDefined();
        expect(issue.intentType).toBeDefined();
        expect(issue.coverageStatus).toBeDefined();
      }
    });

    it('should return empty array for project with no products', async () => {
      // Delete test product
      await testPrisma.product.delete({
        where: { id: testProduct.id },
      });

      const issues = await service.buildSearchIntentIssues(testProject.id);

      expect(issues).toHaveLength(0);
    });

    it('should generate issues for missing and weak coverage', async () => {
      // Create product with minimal content (should have gaps)
      const minimalProduct = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Minimal',
          description: 'Basic',
        },
      });

      await service.analyzeProductIntent(minimalProduct.id);

      const issues = await service.buildSearchIntentIssues(testProject.id);

      // Should have at least some issues for missing coverage
      const missingIssues = issues.filter((i) => i.coverageStatus === 'none');
      expect(missingIssues.length).toBeGreaterThan(0);
    });

    it('should assign appropriate severity for high-value intents', async () => {
      // Create minimal product to ensure gaps
      const minimalProduct = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Basic Item',
          description: 'Simple',
        },
      });

      await service.analyzeProductIntent(minimalProduct.id);

      const issues = await service.buildSearchIntentIssues(testProject.id);

      // High-value intents (transactional, comparative) should have critical severity when missing
      const transactionalMissing = issues.find(
        (i) => i.intentType === 'transactional' && i.coverageStatus === 'none'
      );
      const comparativeMissing = issues.find(
        (i) => i.intentType === 'comparative' && i.coverageStatus === 'none'
      );

      if (transactionalMissing) {
        expect(transactionalMissing.severity).toBe('critical');
      }
      if (comparativeMissing) {
        expect(comparativeMissing.severity).toBe('critical');
      }
    });

    it('should include example queries in issues', async () => {
      await service.analyzeProductIntent(testProduct.id);

      const issues = await service.buildSearchIntentIssues(testProject.id);

      for (const issue of issues) {
        if (issue.exampleQueries) {
          expect(Array.isArray(issue.exampleQueries)).toBe(true);
          expect(issue.exampleQueries.length).toBeLessThanOrEqual(5);
        }
      }
    });
  });

  describe('Coverage Invalidation', () => {
    it('should invalidate coverage for a product', async () => {
      // First analyze
      await service.analyzeProductIntent(testProduct.id);

      // Verify coverage exists
      let coverages = await testPrisma.productIntentCoverage.findMany({
        where: { productId: testProduct.id },
      });
      expect(coverages.length).toBe(5);

      // Invalidate
      await service.invalidateCoverage(testProduct.id);

      // Verify coverage is removed
      coverages = await testPrisma.productIntentCoverage.findMany({
        where: { productId: testProduct.id },
      });
      expect(coverages.length).toBe(0);
    });

    it('should recompute coverage after invalidation', async () => {
      // First analyze
      const initial = await service.analyzeProductIntent(testProduct.id);
      const initialTransactional = initial.find(
        (c) => c.intentType === 'transactional'
      );

      // Update product with more transactional keywords
      await testPrisma.product.update({
        where: { id: testProduct.id },
        data: {
          description:
            'Buy now at the best price! Order today with free shipping. Purchase now!',
        },
      });

      // Invalidate
      await service.invalidateCoverage(testProduct.id);

      // Recompute
      const updated = await service.analyzeProductIntent(testProduct.id);
      const updatedTransactional = updated.find(
        (c) => c.intentType === 'transactional'
      );

      // Score should be higher with more transactional keywords
      expect(updatedTransactional!.score).toBeGreaterThanOrEqual(
        initialTransactional!.score
      );
    });
  });

  describe('Multi-user Access', () => {
    it('should allow project member to access intent data', async () => {
      // Create another user and add as project member
      const memberUser = await testPrisma.user.create({
        data: {
          email: `member-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Member User',
        },
      });

      // Add as project member
      await testPrisma.projectMember.create({
        data: {
          projectId: testProject.id,
          userId: memberUser.id,
          role: 'VIEWER',
        },
      });

      // Should be able to access data
      const data = await service.getProductIntentData(
        testProduct.id,
        memberUser.id
      );

      expect(data.productId).toBe(testProduct.id);
    });
  });

  describe('Query Templates', () => {
    it('should generate expected queries based on product title', async () => {
      const coverages = await service.analyzeProductIntent(testProduct.id);

      for (const coverage of coverages) {
        expect(coverage.expectedQueries.length).toBeGreaterThan(0);

        // Queries should include product title or type
        const productWords = testProduct.title.toLowerCase().split(' ');
        const hasProductReference = coverage.expectedQueries.some((q) =>
          productWords.some((word) => word.length > 3 && q.toLowerCase().includes(word))
        );
        expect(hasProductReference).toBe(true);
      }
    });
  });

  describe('Coverage Status Calculation', () => {
    it('should calculate correct coverage status based on score', async () => {
      const coverages = await service.analyzeProductIntent(testProduct.id);

      for (const coverage of coverages) {
        // Verify coverage status matches score
        if (coverage.score === 0) {
          expect(coverage.coverageStatus).toBe('none');
        } else if (coverage.score < 40) {
          expect(coverage.coverageStatus).toBe('weak');
        } else if (coverage.score < 80) {
          expect(coverage.coverageStatus).toBe('partial');
        } else {
          expect(coverage.coverageStatus).toBe('covered');
        }
      }
    });
  });
});
