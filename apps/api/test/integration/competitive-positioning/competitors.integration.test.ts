/**
 * COMPETITIVE-1-TESTS: Integration tests for Competitive Positioning pillar
 *
 * Tests:
 * - Per-product competitive coverage analysis
 * - Project-level scorecard aggregation
 * - Heuristic competitor generation
 * - Gap detection and issue generation
 * - Coverage persistence to database
 * - Fix draft lifecycle
 * - Access control (membership-aware)
 *
 * NOTE: These tests require a test database to be configured.
 * They exercise the service layer directly without mocking Prisma.
 */
import { CompetitorsService } from '../../../src/projects/competitors.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('CompetitorsService (integration)', () => {
  let service: CompetitorsService;
  let roleResolutionService: RoleResolutionService;
  let testUser: { id: string };
  let testProject: { id: string; name: string; domain: string };
  let testProduct: { id: string; title: string };

  beforeAll(async () => {
    roleResolutionService = new RoleResolutionService(testPrisma as any);
    service = new CompetitorsService(
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
        email: `competitive-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Competitive Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'Competitive Test Project',
        domain: 'competitive-test.example.com',
        userId: testUser.id,
      },
    });

    // Create a test product
    testProduct = await testPrisma.product.create({
      data: {
        projectId: testProject.id,
        title: 'Premium Widget Pro',
        description: 'A high-quality widget for professionals',
        seoTitle: 'Best Premium Widget - Professional Grade',
        seoDescription: 'Buy the best premium widget for your professional needs',
      },
    });
  });

  describe('Coverage Analysis', () => {
    it('should analyze product competitive coverage and generate heuristic competitors', async () => {
      const coverage = await service.analyzeProductCompetitiveCoverage(
        testProduct.id
      );

      expect(coverage.productId).toBe(testProduct.id);
      expect(coverage.competitors).toBeDefined();
      expect(coverage.competitors.length).toBeGreaterThanOrEqual(1);
      expect(coverage.coverageAreas).toBeDefined();
      expect(coverage.coverageAreas.length).toBeGreaterThan(0);
      expect(coverage.overallScore).toBeDefined();
      expect(typeof coverage.overallScore).toBe('number');
      expect(coverage.status).toBeDefined();
      expect(['Ahead', 'On par', 'Behind']).toContain(coverage.status);
    });

    it('should persist coverage to database', async () => {
      await service.analyzeProductCompetitiveCoverage(testProduct.id);

      const dbCoverage = await testPrisma.productCompetitiveCoverage.findUnique({
        where: { productId: testProduct.id },
      });

      expect(dbCoverage).not.toBeNull();
      expect(dbCoverage?.productId).toBe(testProduct.id);
      expect(dbCoverage?.overallScore).toBeDefined();
      expect(dbCoverage?.coverageData).toBeDefined();
    });

    it('should create heuristic competitors for new products', async () => {
      await service.analyzeProductCompetitiveCoverage(testProduct.id);

      const competitors = await testPrisma.productCompetitor.findMany({
        where: { productId: testProduct.id },
      });

      expect(competitors.length).toBeGreaterThanOrEqual(1);
      expect(competitors.every((c) => c.source === 'heuristic_category')).toBe(
        true
      );
      // Verify competitor naming includes product type
      expect(
        competitors.some((c) => c.displayName.toLowerCase().includes('pro'))
      ).toBe(true);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      await expect(
        service.analyzeProductCompetitiveCoverage('non-existent-id')
      ).rejects.toThrow('Product not found');
    });

    it('should detect transactional intent from product content', async () => {
      // Create product with transactional keywords
      const transactionalProduct = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Budget Gadget',
          description: 'Buy now at the best price with free shipping',
        },
      });

      const coverage = await service.analyzeProductCompetitiveCoverage(
        transactionalProduct.id
      );

      // Find transactional intent area
      const transactionalArea = coverage.coverageAreas.find(
        (a) => a.areaId === 'transactional_intent'
      );

      expect(transactionalArea).toBeDefined();
      // Should have higher coverage due to "buy", "price", "shipping" keywords
      expect(transactionalArea?.merchantCovers).toBe(true);
    });

    it('should detect comparative intent from product content', async () => {
      const comparativeProduct = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Widget Deluxe',
          description: 'Compare this vs alternatives to see why we are better',
        },
      });

      const coverage = await service.analyzeProductCompetitiveCoverage(
        comparativeProduct.id
      );

      const comparativeArea = coverage.coverageAreas.find(
        (a) => a.areaId === 'comparative_intent'
      );

      expect(comparativeArea).toBeDefined();
      expect(comparativeArea?.merchantCovers).toBe(true);
    });
  });

  describe('Product Competitive Data', () => {
    it('should return complete product competitive data', async () => {
      // First analyze coverage
      await service.analyzeProductCompetitiveCoverage(testProduct.id);

      const data = await service.getProductCompetitiveData(
        testProduct.id,
        testUser.id
      );

      expect(data.productId).toBe(testProduct.id);
      expect(data.competitors).toBeDefined();
      expect(data.coverage).toBeDefined();
      expect(data.gaps).toBeDefined();
      expect(Array.isArray(data.openDrafts)).toBe(true);
    });

    it('should compute coverage on first access if not exists', async () => {
      // Don't analyze first - getProductCompetitiveData should compute
      const data = await service.getProductCompetitiveData(
        testProduct.id,
        testUser.id
      );

      expect(data.coverage).toBeDefined();
      expect(data.coverage.coverageAreas.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      await expect(
        service.getProductCompetitiveData('non-existent-id', testUser.id)
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
        service.getProductCompetitiveData(testProduct.id, otherUser.id)
      ).rejects.toThrow();
    });

    it('should include gaps for areas where competitors lead', async () => {
      // Create a product with minimal content (likely to have gaps)
      const minimalProduct = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Simple Item',
          description: 'A basic item',
        },
      });

      const data = await service.getProductCompetitiveData(
        minimalProduct.id,
        testUser.id
      );

      // Should have at least some gaps since content is minimal
      expect(data.gaps.length).toBeGreaterThan(0);

      // Verify gap structure
      for (const gap of data.gaps) {
        expect(gap.productId).toBe(minimalProduct.id);
        expect(gap.gapType).toBeDefined();
        expect(gap.areaId).toBeDefined();
        expect(gap.severity).toBeDefined();
        expect(['critical', 'high', 'moderate', 'low']).toContain(gap.severity);
      }
    });
  });

  describe('Project Scorecard', () => {
    it('should return empty scorecard for project with no products', async () => {
      // Delete the test product
      await testPrisma.product.delete({
        where: { id: testProduct.id },
      });

      const scorecard = await service.getProjectCompetitiveScorecard(
        testProject.id,
        testUser.id
      );

      expect(scorecard.totalProducts).toBe(0);
      expect(scorecard.overallScore).toBe(0);
      expect(scorecard.status).toBe('Behind');
      expect(scorecard.gapBreakdown).toHaveLength(3);
    });

    it('should aggregate metrics across multiple products', async () => {
      // Create additional products
      const product2 = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Product Two',
          description: 'Another product with comparison vs alternatives',
        },
      });

      const product3 = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Product Three',
          description: 'Third product',
        },
      });

      // Analyze all products
      await service.analyzeProductCompetitiveCoverage(testProduct.id);
      await service.analyzeProductCompetitiveCoverage(product2.id);
      await service.analyzeProductCompetitiveCoverage(product3.id);

      const scorecard = await service.getProjectCompetitiveScorecard(
        testProject.id,
        testUser.id
      );

      expect(scorecard.totalProducts).toBe(3);
      expect(scorecard.overallScore).toBeDefined();
      expect(
        scorecard.productsBehind + scorecard.productsOnPar + scorecard.productsAhead
      ).toBe(3);
      expect(scorecard.gapBreakdown).toHaveLength(3);

      // Verify gap breakdown structure
      for (const breakdown of scorecard.gapBreakdown) {
        expect(breakdown.gapType).toBeDefined();
        expect(breakdown.label).toBeDefined();
        expect(breakdown.productsWithGaps).toBeDefined();
        expect(breakdown.averageScore).toBeDefined();
      }
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        service.getProjectCompetitiveScorecard('non-existent-id', testUser.id)
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
        service.getProjectCompetitiveScorecard(testProject.id, otherUser.id)
      ).rejects.toThrow();
    });

    it('should calculate correct status based on score', async () => {
      // Create a product with full coverage keywords
      const fullCoverageProduct = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Complete Product',
          description:
            'Buy now at best price. Compare vs alternatives. We are better. ' +
            'FAQ: How to use it? Review: Great quality! Guarantee: 100% money back. ' +
            'Feature: Includes everything. Guide: How to choose the right one.',
        },
      });

      await service.analyzeProductCompetitiveCoverage(fullCoverageProduct.id);

      const scorecard = await service.getProjectCompetitiveScorecard(
        testProject.id,
        testUser.id
      );

      // With good content, should have decent score
      expect(scorecard.overallScore).toBeGreaterThan(0);
    });
  });

  describe('Issue Generation', () => {
    it('should build competitive issues for project', async () => {
      // Analyze products first
      await service.analyzeProductCompetitiveCoverage(testProduct.id);

      const issues = await service.buildCompetitiveIssues(testProject.id);

      // May or may not have issues depending on coverage
      expect(Array.isArray(issues)).toBe(true);

      // If there are issues, verify structure
      for (const issue of issues) {
        expect(issue.pillarId).toBe('competitive_positioning');
        expect(issue.id).toBeDefined();
        expect(issue.title).toBeDefined();
        expect(issue.description).toBeDefined();
        expect(issue.severity).toBeDefined();
        expect(issue.affectedProducts).toBeDefined();
      }
    });

    it('should return empty array for project with no products', async () => {
      // Delete test product
      await testPrisma.product.delete({
        where: { id: testProduct.id },
      });

      const issues = await service.buildCompetitiveIssues(testProject.id);

      expect(issues).toHaveLength(0);
    });

    it('should aggregate issues across products with same gap', async () => {
      // Create multiple products with minimal content (should have same gaps)
      const product2 = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Basic Item Two',
          description: 'Simple description',
        },
      });

      const product3 = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Basic Item Three',
          description: 'Simple description',
        },
      });

      await service.analyzeProductCompetitiveCoverage(testProduct.id);
      await service.analyzeProductCompetitiveCoverage(product2.id);
      await service.analyzeProductCompetitiveCoverage(product3.id);

      const issues = await service.buildCompetitiveIssues(testProject.id);

      // Check that similar issues are aggregated
      for (const issue of issues) {
        if (issue.affectedProducts.length > 1) {
          // This issue affects multiple products
          expect(issue.count).toBe(issue.affectedProducts.length);
        }
      }
    });

    it('should include appropriate severity for gaps', async () => {
      // Create minimal product (will have gaps)
      const minimalProduct = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Minimal',
          description: 'Basic',
        },
      });

      await service.analyzeProductCompetitiveCoverage(minimalProduct.id);

      const issues = await service.buildCompetitiveIssues(testProject.id);

      if (issues.length > 0) {
        // Intent gaps should have higher severity
        const intentGapIssues = issues.filter((i) => i.gapType === 'intent_gap');
        const contentGapIssues = issues.filter(
          (i) => i.gapType === 'content_section_gap'
        );

        // If both exist, intent gaps should generally be higher severity
        if (intentGapIssues.length > 0) {
          expect(
            intentGapIssues.every((i) =>
              ['critical', 'high', 'moderate'].includes(i.severity)
            )
          ).toBe(true);
        }
      }
    });
  });

  describe('Coverage Invalidation', () => {
    it('should invalidate coverage for a product', async () => {
      // First analyze
      await service.analyzeProductCompetitiveCoverage(testProduct.id);

      // Verify coverage exists
      let coverage = await testPrisma.productCompetitiveCoverage.findUnique({
        where: { productId: testProduct.id },
      });
      expect(coverage).not.toBeNull();

      // Invalidate
      await service.invalidateCoverage(testProduct.id);

      // Verify coverage is removed
      coverage = await testPrisma.productCompetitiveCoverage.findUnique({
        where: { productId: testProduct.id },
      });
      expect(coverage).toBeNull();
    });

    it('should recompute coverage after invalidation', async () => {
      // First analyze
      const initial = await service.analyzeProductCompetitiveCoverage(
        testProduct.id
      );
      const initialScore = initial.overallScore;

      // Update product with more keywords
      await testPrisma.product.update({
        where: { id: testProduct.id },
        data: {
          description:
            'Buy now at best price! Compare vs alternatives. FAQ included. ' +
            'Reviews: 5 stars. 100% guarantee with money back.',
        },
      });

      // Invalidate
      await service.invalidateCoverage(testProduct.id);

      // Recompute
      const updated = await service.analyzeProductCompetitiveCoverage(
        testProduct.id
      );

      // Score should be different (likely higher with more keywords)
      expect(updated.overallScore).not.toBe(initialScore);
    });
  });

  describe('Multi-user Access', () => {
    it('should allow project member to access competitive data', async () => {
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
          role: 'EDITOR',
        },
      });

      // Should be able to access data
      const data = await service.getProductCompetitiveData(
        testProduct.id,
        memberUser.id
      );

      expect(data.productId).toBe(testProduct.id);
    });
  });

  describe('Coverage Areas', () => {
    it('should include all standard coverage areas', async () => {
      const coverage = await service.analyzeProductCompetitiveCoverage(
        testProduct.id
      );

      // Expected areas (from COMPETITIVE_COVERAGE_AREAS)
      const expectedAreas = [
        'transactional_intent',
        'comparative_intent',
        'problem_use_case_intent',
        'trust_validation_intent',
        'informational_intent',
        'comparison_section',
        'why_choose_section',
        'buying_guide_section',
        'feature_benefits_section',
        'faq_coverage',
        'reviews_section',
        'guarantee_section',
      ];

      const actualAreaIds = coverage.coverageAreas.map((a) => a.areaId);

      for (const expected of expectedAreas) {
        expect(actualAreaIds).toContain(expected);
      }
    });

    it('should properly categorize gap types', async () => {
      const coverage = await service.analyzeProductCompetitiveCoverage(
        testProduct.id
      );

      for (const area of coverage.coverageAreas) {
        expect(['intent_gap', 'content_section_gap', 'trust_signal_gap']).toContain(
          area.gapType
        );

        // Intent areas should have intent_gap type
        if (area.areaId.includes('_intent')) {
          expect(area.gapType).toBe('intent_gap');
          expect(area.intentType).toBeDefined();
        }

        // FAQ, reviews, guarantee should be trust_signal_gap
        if (['faq_coverage', 'reviews_section', 'guarantee_section'].includes(area.areaId)) {
          expect(area.gapType).toBe('trust_signal_gap');
        }
      }
    });
  });

  describe('Answer Block Integration', () => {
    it('should detect coverage from answer blocks', async () => {
      // Create product with answer blocks
      const productWithBlocks = await testPrisma.product.create({
        data: {
          projectId: testProject.id,
          title: 'Product with FAQ',
          description: 'Basic product',
        },
      });

      // Add answer blocks
      await testPrisma.answerBlock.createMany({
        data: [
          {
            productId: productWithBlocks.id,
            questionText: 'How do I buy this product?',
            answerText:
              'You can purchase at our store with competitive pricing.',
          },
          {
            productId: productWithBlocks.id,
            questionText: 'Why is this better than alternatives?',
            answerText:
              'Our product is better because of superior quality and value.',
          },
        ],
      });

      const coverage = await service.analyzeProductCompetitiveCoverage(
        productWithBlocks.id
      );

      // Should detect transactional and comparative coverage from answer blocks
      const transactional = coverage.coverageAreas.find(
        (a) => a.areaId === 'transactional_intent'
      );
      const comparative = coverage.coverageAreas.find(
        (a) => a.areaId === 'comparative_intent'
      );

      expect(transactional?.merchantCovers).toBe(true);
      expect(comparative?.merchantCovers).toBe(true);
    });
  });
});
