/**
 * OFFSITE-1-TESTS: Unit tests for OffsiteSignalsService
 *
 * Tests:
 * - Coverage computation with weighted scoring
 * - Gap generation from coverage data
 * - Issue building for DEO integration
 * - Type mapping helpers
 * - Signal management
 */
import { OffsiteSignalsService } from '../../../src/projects/offsite-signals.service';
import type { ProjectOffsiteCoverage, OffsiteSignalType } from '@engineo/shared';

// Minimal mock factory for Prisma
const createPrismaMock = () => ({
  projectOffsiteSignal: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  projectOffsiteCoverage: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  projectOffsiteFixDraft: {
    findMany: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
});

describe('OffsiteSignalsService', () => {
  let service: OffsiteSignalsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new OffsiteSignalsService(prismaMock as any);
  });

  describe('computeProjectCoverage', () => {
    it('should return score 0 and status Low when no signals exist', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([]);
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      const result = await service.computeProjectCoverage('proj-1');

      expect(result.overallScore).toBe(0);
      expect(result.status).toBe('Low');
      expect(result.totalSignals).toBe(0);
      expect(result.highImpactGaps).toBe(2); // Missing trust_proof and authoritative_listing
    });

    it('should compute weighted score for single signal type', async () => {
      // Trust proof has weight 10 out of total 32 (10+9+7+6)
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([
        { id: '1', projectId: 'proj-1', signalType: 'TRUST_PROOF', sourceName: 'Trustpilot', evidence: 'test', merchantProvided: false, knownPlatform: true, createdAt: new Date(), updatedAt: new Date() },
      ]);
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      const result = await service.computeProjectCoverage('proj-1');

      // Trust proof weight is 10/32 = ~31%
      expect(result.overallScore).toBe(31);
      expect(result.status).toBe('Low');
      expect(result.totalSignals).toBe(1);
      expect(result.signalCounts.trust_proof).toBe(1);
      expect(result.signalCounts.authoritative_listing).toBe(0);
      expect(result.highImpactGaps).toBe(1); // Only missing authoritative_listing
    });

    it('should give diminishing returns for multiple signals of same type', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([
        { id: '1', projectId: 'proj-1', signalType: 'TRUST_PROOF', sourceName: 'Trustpilot', evidence: 'test', merchantProvided: false, knownPlatform: true, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', projectId: 'proj-1', signalType: 'TRUST_PROOF', sourceName: 'G2', evidence: 'test', merchantProvided: false, knownPlatform: true, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', projectId: 'proj-1', signalType: 'TRUST_PROOF', sourceName: 'BBB', evidence: 'test', merchantProvided: false, knownPlatform: true, createdAt: new Date(), updatedAt: new Date() },
      ]);
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      const result = await service.computeProjectCoverage('proj-1');

      // Base 10 + bonus: min(3-1, 2) * 0.25 * 10 = 2 * 2.5 = 5
      // Total earned: 15/32 = ~47%
      expect(result.overallScore).toBe(47);
      expect(result.status).toBe('Medium');
      expect(result.totalSignals).toBe(3);
      expect(result.signalCounts.trust_proof).toBe(3);
    });

    it('should return status Strong when all signal types present', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([
        { id: '1', projectId: 'proj-1', signalType: 'TRUST_PROOF', sourceName: 'Trustpilot', evidence: 'test', merchantProvided: false, knownPlatform: true, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', projectId: 'proj-1', signalType: 'AUTHORITATIVE_LISTING', sourceName: 'Google Business', evidence: 'test', merchantProvided: false, knownPlatform: true, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', projectId: 'proj-1', signalType: 'BRAND_MENTION', sourceName: 'Industry Blog', evidence: 'test', merchantProvided: false, knownPlatform: false, createdAt: new Date(), updatedAt: new Date() },
        { id: '4', projectId: 'proj-1', signalType: 'REFERENCE_CONTENT', sourceName: 'Comparison Site', evidence: 'test', merchantProvided: false, knownPlatform: false, createdAt: new Date(), updatedAt: new Date() },
      ]);
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      const result = await service.computeProjectCoverage('proj-1');

      // All types present: 32/32 = 100%
      expect(result.overallScore).toBe(100);
      expect(result.status).toBe('Strong');
      expect(result.totalSignals).toBe(4);
      expect(result.highImpactGaps).toBe(0);
    });

    it('should persist coverage to database', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([]);
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      await service.computeProjectCoverage('proj-1');

      expect(prismaMock.projectOffsiteCoverage.upsert).toHaveBeenCalled();
    });
  });

  describe('generateGaps', () => {
    it('should generate gaps for all missing signal types', () => {
      const coverage: ProjectOffsiteCoverage = {
        projectId: 'proj-1',
        overallScore: 0,
        status: 'Low',
        signalCounts: {
          trust_proof: 0,
          authoritative_listing: 0,
          brand_mention: 0,
          reference_content: 0,
        },
        highImpactGaps: 2,
        totalSignals: 0,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(coverage);

      // Should have 4 base gaps + 2 competitor gaps (for trust_proof and authoritative_listing)
      expect(gaps.length).toBe(6);

      const gapTypes = gaps.map(g => g.gapType);
      expect(gapTypes).toContain('missing_trust_proof');
      expect(gapTypes).toContain('missing_authoritative_listing');
      expect(gapTypes).toContain('missing_brand_mentions');
      expect(gapTypes.filter(t => t === 'competitor_has_offsite_signal')).toHaveLength(2);
    });

    it('should return empty gaps when all signal types present', () => {
      const coverage: ProjectOffsiteCoverage = {
        projectId: 'proj-1',
        overallScore: 100,
        status: 'Strong',
        signalCounts: {
          trust_proof: 2,
          authoritative_listing: 1,
          brand_mention: 3,
          reference_content: 1,
        },
        highImpactGaps: 0,
        totalSignals: 7,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(coverage);

      expect(gaps).toHaveLength(0);
    });

    it('should set critical severity for trust_proof gaps', () => {
      const coverage: ProjectOffsiteCoverage = {
        projectId: 'proj-1',
        overallScore: 28,
        status: 'Low',
        signalCounts: {
          trust_proof: 0,
          authoritative_listing: 1,
          brand_mention: 0,
          reference_content: 0,
        },
        highImpactGaps: 1,
        totalSignals: 1,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(coverage);

      const trustProofGap = gaps.find(g => g.signalType === 'trust_proof' && g.gapType === 'missing_trust_proof');
      expect(trustProofGap).toBeDefined();
      expect(trustProofGap?.severity).toBe('critical');
    });

    it('should set warning severity for brand_mention gaps', () => {
      const coverage: ProjectOffsiteCoverage = {
        projectId: 'proj-1',
        overallScore: 59,
        status: 'Medium',
        signalCounts: {
          trust_proof: 1,
          authoritative_listing: 1,
          brand_mention: 0,
          reference_content: 0,
        },
        highImpactGaps: 0,
        totalSignals: 2,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(coverage);

      const brandMentionGap = gaps.find(g => g.signalType === 'brand_mention');
      expect(brandMentionGap).toBeDefined();
      expect(brandMentionGap?.severity).toBe('warning');
    });

    it('should include competitor-based gaps with competitorCount', () => {
      const coverage: ProjectOffsiteCoverage = {
        projectId: 'proj-1',
        overallScore: 0,
        status: 'Low',
        signalCounts: {
          trust_proof: 0,
          authoritative_listing: 0,
          brand_mention: 1,
          reference_content: 0,
        },
        highImpactGaps: 2,
        totalSignals: 1,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(coverage);

      const competitorGaps = gaps.filter(g => g.gapType === 'competitor_has_offsite_signal');
      expect(competitorGaps).toHaveLength(2);
      expect(competitorGaps.every(g => g.competitorCount === 2)).toBe(true);
    });
  });

  describe('buildOffsiteIssuesForProject', () => {
    it('should generate DEO issues from coverage gaps', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([]);
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildOffsiteIssuesForProject('proj-1');

      expect(issues.length).toBeGreaterThan(0);

      // All issues should have pillarId = 'offsite_signals'
      expect(issues.every(i => i.pillarId === 'offsite_signals')).toBe(true);

      // All issues should have signalType and offsiteGapType
      expect(issues.every(i => i.signalType !== undefined)).toBe(true);
      expect(issues.every(i => i.offsiteGapType !== undefined)).toBe(true);
    });

    it('should return empty array when all signals present', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([
        { id: '1', projectId: 'proj-1', signalType: 'TRUST_PROOF', sourceName: 'Trustpilot', evidence: 'test', merchantProvided: false, knownPlatform: true, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', projectId: 'proj-1', signalType: 'AUTHORITATIVE_LISTING', sourceName: 'Google Business', evidence: 'test', merchantProvided: false, knownPlatform: true, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', projectId: 'proj-1', signalType: 'BRAND_MENTION', sourceName: 'Industry Blog', evidence: 'test', merchantProvided: false, knownPlatform: false, createdAt: new Date(), updatedAt: new Date() },
        { id: '4', projectId: 'proj-1', signalType: 'REFERENCE_CONTENT', sourceName: 'Comparison Site', evidence: 'test', merchantProvided: false, knownPlatform: false, createdAt: new Date(), updatedAt: new Date() },
      ]);
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildOffsiteIssuesForProject('proj-1');

      expect(issues).toHaveLength(0);
    });

    it('should include recommendedAction and whyItMatters for each issue', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([]);
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildOffsiteIssuesForProject('proj-1');

      for (const issue of issues) {
        expect(issue.recommendedAction).toBeDefined();
        expect(typeof issue.recommendedAction).toBe('string');
        expect(issue.whyItMatters).toBeDefined();
        expect(typeof issue.whyItMatters).toBe('string');
      }
    });

    it('should set actionability to "manual" for all issues', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([]);
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildOffsiteIssuesForProject('proj-1');

      expect(issues.every(i => i.actionability === 'manual')).toBe(true);
    });
  });

  describe('getProjectSignals', () => {
    it('should return mapped signals from database', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([
        {
          id: 'sig-1',
          projectId: 'proj-1',
          signalType: 'TRUST_PROOF',
          sourceName: 'Trustpilot',
          url: 'https://trustpilot.com/review/example.com',
          evidence: 'Customer reviews',
          merchantProvided: true,
          knownPlatform: true,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
        },
      ]);

      const signals = await service.getProjectSignals('proj-1');

      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe('sig-1');
      expect(signals[0].signalType).toBe('trust_proof');
      expect(signals[0].sourceName).toBe('Trustpilot');
      expect(signals[0].url).toBe('https://trustpilot.com/review/example.com');
      expect(signals[0].evidence).toBe('Customer reviews');
      expect(signals[0].merchantProvided).toBe(true);
      expect(signals[0].knownPlatform).toBe(true);
    });

    it('should return empty array when no signals exist', async () => {
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([]);

      const signals = await service.getProjectSignals('proj-1');

      expect(signals).toHaveLength(0);
    });
  });

  describe('addSignal', () => {
    it('should create a new signal with correct type mapping', async () => {
      const mockCreated = {
        id: 'sig-new',
        projectId: 'proj-1',
        signalType: 'BRAND_MENTION',
        sourceName: 'Tech Blog',
        url: 'https://techblog.com/article',
        evidence: 'Featured article',
        merchantProvided: false,
        knownPlatform: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.projectOffsiteSignal.create.mockResolvedValue(mockCreated);

      const signal = await service.addSignal({
        projectId: 'proj-1',
        signalType: 'brand_mention',
        sourceName: 'Tech Blog',
        url: 'https://techblog.com/article',
        evidence: 'Featured article',
      });

      expect(signal.signalType).toBe('brand_mention');
      expect(signal.sourceName).toBe('Tech Blog');
      expect(prismaMock.projectOffsiteSignal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          signalType: 'BRAND_MENTION',
          projectId: 'proj-1',
        }),
      });
    });
  });

  describe('invalidateCoverage', () => {
    it('should delete all coverage records for project', async () => {
      prismaMock.projectOffsiteCoverage.deleteMany.mockResolvedValue({ count: 1 });

      await service.invalidateCoverage('proj-1');

      expect(prismaMock.projectOffsiteCoverage.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
    });
  });

  describe('getProjectCoverage', () => {
    it('should return cached coverage if present', async () => {
      const cachedCoverage = {
        id: 'cov-1',
        projectId: 'proj-1',
        overallScore: 75,
        status: 'STRONG',
        coverageData: {
          signalCounts: { trust_proof: 2, authoritative_listing: 1, brand_mention: 1, reference_content: 1 },
          highImpactGaps: 0,
          totalSignals: 5,
        },
        computedAt: new Date('2025-01-15'),
      };

      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(cachedCoverage);

      const result = await service.getProjectCoverage('proj-1');

      expect(result.overallScore).toBe(75);
      expect(result.status).toBe('Strong');
      expect(prismaMock.projectOffsiteSignal.findMany).not.toHaveBeenCalled();
    });

    it('should compute coverage if no cache exists', async () => {
      prismaMock.projectOffsiteCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectOffsiteSignal.findMany.mockResolvedValue([]);
      prismaMock.projectOffsiteCoverage.upsert.mockResolvedValue({});

      const result = await service.getProjectCoverage('proj-1');

      expect(result.overallScore).toBe(0);
      expect(prismaMock.projectOffsiteSignal.findMany).toHaveBeenCalled();
    });
  });
});
