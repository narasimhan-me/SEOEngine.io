/**
 * OFFSITE-1-TESTS: Integration tests for Off-site Signals pillar
 *
 * Tests:
 * - Coverage computation persists to database
 * - Gap generation from real coverage data
 * - Issue building integrates with DEO issues
 * - Signal CRUD operations
 * - Fix draft lifecycle (create, retrieve, apply)
 *
 * NOTE: These tests require a test database to be configured.
 * They exercise the service layer directly without mocking Prisma.
 */
import { OffsiteSignalsService } from '../../../src/projects/offsite-signals.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import type { OffsiteSignalType, OffsiteGapType } from '@engineo/shared';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('OffsiteSignalsService (integration)', () => {
  let service: OffsiteSignalsService;
  let testUser: { id: string };
  let testProject: { id: string; name: string; domain: string };

  beforeAll(async () => {
    service = new OffsiteSignalsService(testPrisma as any);
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
        email: `offsite-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Offsite Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'Offsite Test Project',
        domain: 'offsite-test.example.com',
        userId: testUser.id,
      },
    });
  });

  describe('Signal Management', () => {
    it('should create and retrieve signals', async () => {
      // Add a trust proof signal
      const signal = await service.addSignal({
        projectId: testProject.id,
        signalType: 'trust_proof',
        sourceName: 'Trustpilot',
        url: 'https://trustpilot.com/review/example.com',
        evidence: 'Customer reviews showing 4.5/5 rating',
        merchantProvided: true,
        knownPlatform: true,
      });

      expect(signal.id).toBeDefined();
      expect(signal.signalType).toBe('trust_proof');
      expect(signal.sourceName).toBe('Trustpilot');
      expect(signal.merchantProvided).toBe(true);

      // Retrieve signals
      const signals = await service.getProjectSignals(testProject.id);
      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe(signal.id);
    });

    it('should handle multiple signals of different types', async () => {
      // Add signals of each type
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'trust_proof',
        sourceName: 'G2',
        evidence: 'G2 reviews',
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'authoritative_listing',
        sourceName: 'Google Business Profile',
        evidence: 'Verified GBP listing',
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'brand_mention',
        sourceName: 'TechCrunch',
        url: 'https://techcrunch.com/article',
        evidence: 'Featured in article',
      });

      const signals = await service.getProjectSignals(testProject.id);
      expect(signals).toHaveLength(3);

      const signalTypes = signals.map((s) => s.signalType);
      expect(signalTypes).toContain('trust_proof');
      expect(signalTypes).toContain('authoritative_listing');
      expect(signalTypes).toContain('brand_mention');
    });
  });

  describe('Coverage Computation', () => {
    it('should compute and persist coverage for project with no signals', async () => {
      const coverage = await service.computeProjectCoverage(testProject.id);

      expect(coverage.projectId).toBe(testProject.id);
      expect(coverage.overallScore).toBe(0);
      expect(coverage.status).toBe('Low');
      expect(coverage.totalSignals).toBe(0);
      expect(coverage.highImpactGaps).toBe(2); // Missing trust_proof and authoritative_listing

      // Verify persisted
      const dbCoverage = await testPrisma.projectOffsiteCoverage.findFirst({
        where: { projectId: testProject.id },
      });
      expect(dbCoverage).not.toBeNull();
      expect(dbCoverage?.overallScore).toBe(0);
    });

    it('should compute correct score with single high-value signal', async () => {
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'trust_proof',
        sourceName: 'Trustpilot',
        evidence: 'Reviews',
      });

      const coverage = await service.computeProjectCoverage(testProject.id);

      // Trust proof weight is 10/32 = ~31%
      expect(coverage.overallScore).toBe(31);
      expect(coverage.status).toBe('Low');
      expect(coverage.signalCounts.trust_proof).toBe(1);
      expect(coverage.highImpactGaps).toBe(1); // Still missing authoritative_listing
    });

    it('should reach Strong status with all signal types', async () => {
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'trust_proof',
        sourceName: 'Trustpilot',
        evidence: 'Reviews',
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'authoritative_listing',
        sourceName: 'Google Business',
        evidence: 'Verified listing',
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'brand_mention',
        sourceName: 'Industry Blog',
        evidence: 'Article mention',
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'reference_content',
        sourceName: 'Comparison Guide',
        evidence: 'Product comparison',
      });

      const coverage = await service.computeProjectCoverage(testProject.id);

      expect(coverage.overallScore).toBe(100);
      expect(coverage.status).toBe('Strong');
      expect(coverage.highImpactGaps).toBe(0);
    });

    it('should apply diminishing returns for multiple signals of same type', async () => {
      // Add 3 trust proof signals
      for (let i = 0; i < 3; i++) {
        await service.addSignal({
          projectId: testProject.id,
          signalType: 'trust_proof',
          sourceName: `Review Site ${i + 1}`,
          evidence: 'Reviews',
        });
      }

      const coverage = await service.computeProjectCoverage(testProject.id);

      // Base 10 + bonus: min(3-1, 2) * 0.25 * 10 = 5
      // Total: 15/32 = ~47%
      expect(coverage.overallScore).toBe(47);
      expect(coverage.signalCounts.trust_proof).toBe(3);
    });
  });

  describe('Gap Analysis', () => {
    it('should generate gaps for missing signal types', async () => {
      // Add only brand mention
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'brand_mention',
        sourceName: 'Blog',
        evidence: 'Mention',
      });

      const coverage = await service.computeProjectCoverage(testProject.id);
      const gaps = service.generateGaps(coverage);

      // Should have gaps for missing: trust_proof, authoritative_listing, reference_content
      // Plus competitor gaps for trust_proof and authoritative_listing
      expect(gaps.length).toBeGreaterThanOrEqual(3);

      const gapTypes = gaps.map((g) => g.gapType);
      expect(gapTypes).toContain('missing_trust_proof');
      expect(gapTypes).toContain('missing_authoritative_listing');
    });

    it('should return no gaps when all signals present', async () => {
      const signalTypes: OffsiteSignalType[] = [
        'trust_proof',
        'authoritative_listing',
        'brand_mention',
        'reference_content',
      ];

      for (const type of signalTypes) {
        await service.addSignal({
          projectId: testProject.id,
          signalType: type,
          sourceName: `${type} source`,
          evidence: 'Present',
        });
      }

      const coverage = await service.computeProjectCoverage(testProject.id);
      const gaps = service.generateGaps(coverage);

      expect(gaps).toHaveLength(0);
    });
  });

  describe('DEO Issue Integration', () => {
    it('should build DEO issues from coverage gaps', async () => {
      const issues = await service.buildOffsiteIssuesForProject(testProject.id);

      expect(issues.length).toBeGreaterThan(0);

      // Verify all issues have correct pillarId
      for (const issue of issues) {
        expect(issue.pillarId).toBe('offsite_signals');
        expect(issue.signalType).toBeDefined();
        expect(issue.offsiteGapType).toBeDefined();
        expect(issue.recommendedAction).toBeDefined();
        expect(issue.whyItMatters).toBeDefined();
      }
    });

    it('should include competitor-based issues when trust proof missing', async () => {
      // Add only brand mention (no trust proof)
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'brand_mention',
        sourceName: 'Blog',
        evidence: 'Mention',
      });

      const issues = await service.buildOffsiteIssuesForProject(testProject.id);

      const competitorIssue = issues.find(
        (i) =>
          i.offsiteGapType === 'competitor_has_offsite_signal' &&
          i.signalType === 'trust_proof'
      );

      expect(competitorIssue).toBeDefined();
      expect(competitorIssue?.severity).toBe('critical');
      expect(competitorIssue?.competitorCount).toBe(2);
    });

    it('should return no issues when all signals present', async () => {
      const signalTypes: OffsiteSignalType[] = [
        'trust_proof',
        'authoritative_listing',
        'brand_mention',
        'reference_content',
      ];

      for (const type of signalTypes) {
        await service.addSignal({
          projectId: testProject.id,
          signalType: type,
          sourceName: `${type} source`,
          evidence: 'Present',
        });
      }

      const issues = await service.buildOffsiteIssuesForProject(testProject.id);

      expect(issues).toHaveLength(0);
    });
  });

  describe('Coverage Cache', () => {
    it('should return cached coverage on subsequent calls', async () => {
      // First call computes and caches
      await service.computeProjectCoverage(testProject.id);

      // Add a signal (but don't invalidate cache)
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'trust_proof',
        sourceName: 'Trustpilot',
        evidence: 'Reviews',
      });

      // getProjectCoverage should return cached value
      const cached = await service.getProjectCoverage(testProject.id);
      expect(cached.overallScore).toBe(0); // Still cached old value
      expect(cached.totalSignals).toBe(0);
    });

    it('should recompute after cache invalidation', async () => {
      // First compute
      await service.computeProjectCoverage(testProject.id);

      // Add signal
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'trust_proof',
        sourceName: 'Trustpilot',
        evidence: 'Reviews',
      });

      // Invalidate cache
      await service.invalidateCoverage(testProject.id);

      // Should recompute with new signal
      const coverage = await service.getProjectCoverage(testProject.id);
      expect(coverage.overallScore).toBe(31); // Now includes trust_proof
      expect(coverage.totalSignals).toBe(1);
    });
  });

  describe('Full Project Data', () => {
    it('should return complete off-site data response', async () => {
      // Add some signals
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'trust_proof',
        sourceName: 'G2',
        evidence: 'Reviews',
      });

      const data = await service.getProjectOffsiteData(
        testProject.id,
        testUser.id
      );

      expect(data.projectId).toBe(testProject.id);
      expect(data.signals).toHaveLength(1);
      expect(data.coverage).toBeDefined();
      expect(data.coverage.overallScore).toBeGreaterThan(0);
      expect(data.gaps).toBeDefined();
      expect(Array.isArray(data.openDrafts)).toBe(true);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        service.getProjectOffsiteData('non-existent-id', testUser.id)
      ).rejects.toThrow('Project not found');
    });

    it('should throw ForbiddenException for wrong user', async () => {
      // Create another user
      const otherUser = await testPrisma.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          password: 'hashed-password',
          name: 'Other User',
        },
      });

      await expect(
        service.getProjectOffsiteData(testProject.id, otherUser.id)
      ).rejects.toThrow('You do not have access to this project');
    });
  });
});
