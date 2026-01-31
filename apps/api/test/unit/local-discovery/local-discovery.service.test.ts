/**
 * LOCAL-1-TESTS: Unit tests for LocalDiscoveryService
 *
 * Tests:
 * - Applicability determination logic
 * - Coverage/scorecard computation with weighted scoring
 * - Gap generation from scorecard data
 * - Issue building for DEO integration (no penalty for non-local)
 * - Type mapping helpers
 * - Signal management
 * - Config management
 */
import { LocalDiscoveryService } from '../../../src/projects/local-discovery.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import type { LocalDiscoveryScorecard, LocalSignalType } from '@engineo/shared';

// Minimal mock factory for Prisma
const createPrismaMock = () => ({
  projectLocalConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  projectLocalSignal: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  projectLocalCoverage: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  projectLocalFixDraft: {
    findMany: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
});

const createRoleResolutionMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  assertOwnerRole: jest.fn().mockResolvedValue(undefined),
  hasProjectAccess: jest.fn().mockResolvedValue(true),
});

describe('LocalDiscoveryService', () => {
  let service: LocalDiscoveryService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let roleResolutionMock: ReturnType<typeof createRoleResolutionMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    roleResolutionMock = createRoleResolutionMock();
    service = new LocalDiscoveryService(
      prismaMock as any,
      roleResolutionMock as unknown as RoleResolutionService
    );
  });

  describe('determineApplicability', () => {
    it('should return "applicable" when hasPhysicalLocation is true', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: false,
        serviceAreaDescription: null,
      });

      const result = await service.determineApplicability('proj-1');

      expect(result.status).toBe('applicable');
      expect(result.reasons).toContain('merchant_declared_physical_presence');
    });

    it('should return "applicable" when manual override enabled', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: false,
        enabled: true,
        serviceAreaDescription: null,
      });

      const result = await service.determineApplicability('proj-1');

      expect(result.status).toBe('applicable');
      expect(result.reasons).toContain('manual_override_enabled');
    });

    it('should return "not_applicable" for global_only_config', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: false,
        enabled: false,
        serviceAreaDescription: null,
      });

      const result = await service.determineApplicability('proj-1');

      expect(result.status).toBe('not_applicable');
      expect(result.reasons).toContain('global_only_config');
    });

    it('should return "unknown" when no config exists', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue(null);

      const result = await service.determineApplicability('proj-1');

      expect(result.status).toBe('unknown');
      expect(result.reasons).toContain('no_local_indicators');
    });
  });

  describe('computeProjectScorecard', () => {
    it('should return score 0 and status "weak" for applicable project with no signals', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
        serviceAreaDescription: null,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const result = await service.computeProjectScorecard('proj-1');

      expect(result.score).toBe(0);
      expect(result.status).toBe('weak');
      expect(result.applicabilityStatus).toBe('applicable');
      expect(result.missingLocalSignalsCount).toBe(2); // location_presence and local_intent_coverage have weight >= 8
    });

    it('should return no score for non-applicable projects (no penalty)', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: false,
        enabled: false,
        serviceAreaDescription: null,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const result = await service.computeProjectScorecard('proj-1');

      expect(result.score).toBeUndefined();
      expect(result.status).toBeUndefined();
      expect(result.applicabilityStatus).toBe('not_applicable');
      expect(result.missingLocalSignalsCount).toBe(0); // No penalty for global stores
    });

    it('should compute weighted score for single signal type', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
      });
      // Location presence has weight 10 out of total 32 (10+9+7+6)
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([
        {
          id: '1',
          projectId: 'proj-1',
          signalType: 'LOCATION_PRESENCE',
          label: 'Store Address',
          description: 'Physical location',
          url: null,
          evidence: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const result = await service.computeProjectScorecard('proj-1');

      // Location presence weight is 10/32 = ~31%
      expect(result.score).toBe(31);
      expect(result.status).toBe('weak');
      expect(result.signalCounts.location_presence).toBe(1);
      expect(result.signalCounts.local_intent_coverage).toBe(0);
      expect(result.missingLocalSignalsCount).toBe(1); // Still missing local_intent_coverage
    });

    it('should give diminishing returns for multiple signals of same type', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([
        {
          id: '1',
          projectId: 'proj-1',
          signalType: 'LOCATION_PRESENCE',
          label: 'Store 1',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          projectId: 'proj-1',
          signalType: 'LOCATION_PRESENCE',
          label: 'Store 2',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          projectId: 'proj-1',
          signalType: 'LOCATION_PRESENCE',
          label: 'Store 3',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const result = await service.computeProjectScorecard('proj-1');

      // Base 10 + bonus: min(3-1, 2) * 0.25 * 10 = 2 * 2.5 = 5
      // Total earned: 15/32 = ~47%
      expect(result.score).toBe(47);
      expect(result.status).toBe('needs_improvement');
      expect(result.signalCounts.location_presence).toBe(3);
    });

    it('should return status "strong" when all signal types present', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([
        {
          id: '1',
          projectId: 'proj-1',
          signalType: 'LOCATION_PRESENCE',
          label: 'Address',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          projectId: 'proj-1',
          signalType: 'LOCAL_INTENT_COVERAGE',
          label: 'Near me',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          projectId: 'proj-1',
          signalType: 'LOCAL_TRUST_SIGNALS',
          label: 'Reviews',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '4',
          projectId: 'proj-1',
          signalType: 'LOCAL_SCHEMA_READINESS',
          label: 'Schema',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const result = await service.computeProjectScorecard('proj-1');

      // All types present: 32/32 = 100%
      expect(result.score).toBe(100);
      expect(result.status).toBe('strong');
      expect(result.missingLocalSignalsCount).toBe(0);
    });

    it('should persist coverage to database', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      await service.computeProjectScorecard('proj-1');

      expect(prismaMock.projectLocalCoverage.upsert).toHaveBeenCalled();
    });
  });

  describe('generateGaps', () => {
    it('should generate gaps for all missing signal types (applicable project)', () => {
      const scorecard: LocalDiscoveryScorecard = {
        projectId: 'proj-1',
        applicabilityStatus: 'applicable',
        applicabilityReasons: ['merchant_declared_physical_presence'],
        score: 0,
        status: 'weak',
        signalCounts: {
          location_presence: 0,
          local_intent_coverage: 0,
          local_trust_signals: 0,
          local_schema_readiness: 0,
        },
        missingLocalSignalsCount: 2,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(scorecard);

      expect(gaps).toHaveLength(4); // One gap per missing signal type

      const gapTypes = gaps.map((g) => g.gapType);
      expect(gapTypes).toContain('missing_location_content');
      expect(gapTypes).toContain('missing_local_intent_coverage');
      expect(gapTypes).toContain('missing_local_trust_signal');
      expect(gapTypes).toContain('unclear_service_area');
    });

    it('should return empty gaps for non-applicable projects (no penalty)', () => {
      const scorecard: LocalDiscoveryScorecard = {
        projectId: 'proj-1',
        applicabilityStatus: 'not_applicable',
        applicabilityReasons: ['global_only_config'],
        signalCounts: {
          location_presence: 0,
          local_intent_coverage: 0,
          local_trust_signals: 0,
          local_schema_readiness: 0,
        },
        missingLocalSignalsCount: 0,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(scorecard);

      expect(gaps).toHaveLength(0);
    });

    it('should return empty gaps when all signal types present', () => {
      const scorecard: LocalDiscoveryScorecard = {
        projectId: 'proj-1',
        applicabilityStatus: 'applicable',
        applicabilityReasons: ['merchant_declared_physical_presence'],
        score: 100,
        status: 'strong',
        signalCounts: {
          location_presence: 2,
          local_intent_coverage: 1,
          local_trust_signals: 3,
          local_schema_readiness: 1,
        },
        missingLocalSignalsCount: 0,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(scorecard);

      expect(gaps).toHaveLength(0);
    });

    it('should set critical severity for location_presence gaps', () => {
      const scorecard: LocalDiscoveryScorecard = {
        projectId: 'proj-1',
        applicabilityStatus: 'applicable',
        applicabilityReasons: ['merchant_declared_physical_presence'],
        score: 59,
        status: 'needs_improvement',
        signalCounts: {
          location_presence: 0,
          local_intent_coverage: 1,
          local_trust_signals: 1,
          local_schema_readiness: 1,
        },
        missingLocalSignalsCount: 1,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(scorecard);

      const locationGap = gaps.find(
        (g) => g.signalType === 'location_presence'
      );
      expect(locationGap).toBeDefined();
      expect(locationGap?.severity).toBe('critical');
    });

    it('should set critical severity for local_intent_coverage gaps', () => {
      const scorecard: LocalDiscoveryScorecard = {
        projectId: 'proj-1',
        applicabilityStatus: 'applicable',
        applicabilityReasons: ['merchant_declared_physical_presence'],
        score: 72,
        status: 'strong',
        signalCounts: {
          location_presence: 1,
          local_intent_coverage: 0,
          local_trust_signals: 1,
          local_schema_readiness: 1,
        },
        missingLocalSignalsCount: 1,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(scorecard);

      const intentGap = gaps.find(
        (g) => g.signalType === 'local_intent_coverage'
      );
      expect(intentGap).toBeDefined();
      expect(intentGap?.severity).toBe('critical');
    });

    it('should set warning severity for local_trust_signals gaps', () => {
      const scorecard: LocalDiscoveryScorecard = {
        projectId: 'proj-1',
        applicabilityStatus: 'applicable',
        applicabilityReasons: ['merchant_declared_physical_presence'],
        score: 78,
        status: 'strong',
        signalCounts: {
          location_presence: 1,
          local_intent_coverage: 1,
          local_trust_signals: 0,
          local_schema_readiness: 1,
        },
        missingLocalSignalsCount: 0,
        computedAt: new Date().toISOString(),
      };

      const gaps = service.generateGaps(scorecard);

      const trustGap = gaps.find((g) => g.signalType === 'local_trust_signals');
      expect(trustGap).toBeDefined();
      expect(trustGap?.severity).toBe('warning');
    });
  });

  describe('buildLocalIssuesForProject', () => {
    it('should generate DEO issues from coverage gaps for applicable projects', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildLocalIssuesForProject('proj-1');

      expect(issues.length).toBeGreaterThan(0);

      // All issues should have pillarId = 'local_discovery'
      expect(issues.every((i) => i.pillarId === 'local_discovery')).toBe(true);

      // All issues should have localSignalType and localGapType
      expect(issues.every((i) => i.localSignalType !== undefined)).toBe(true);
      expect(issues.every((i) => i.localGapType !== undefined)).toBe(true);
    });

    it('should return empty array for non-applicable projects (no penalty)', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: false,
        enabled: false,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildLocalIssuesForProject('proj-1');

      expect(issues).toHaveLength(0);
    });

    it('should return empty array when all signals present', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([
        {
          id: '1',
          signalType: 'LOCATION_PRESENCE',
          label: 'test',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          signalType: 'LOCAL_INTENT_COVERAGE',
          label: 'test',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          signalType: 'LOCAL_TRUST_SIGNALS',
          label: 'test',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '4',
          signalType: 'LOCAL_SCHEMA_READINESS',
          label: 'test',
          description: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildLocalIssuesForProject('proj-1');

      expect(issues).toHaveLength(0);
    });

    it('should include recommendedAction and whyItMatters for each issue', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildLocalIssuesForProject('proj-1');

      for (const issue of issues) {
        expect(issue.recommendedAction).toBeDefined();
        expect(typeof issue.recommendedAction).toBe('string');
        expect(issue.whyItMatters).toBeDefined();
        expect(typeof issue.whyItMatters).toBe('string');
      }
    });

    it('should set actionability to "manual" for all issues', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildLocalIssuesForProject('proj-1');

      expect(issues.every((i) => i.actionability === 'manual')).toBe(true);
    });

    it('should include localApplicabilityStatus and localApplicabilityReasons', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: false,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const issues = await service.buildLocalIssuesForProject('proj-1');

      for (const issue of issues) {
        expect(issue.localApplicabilityStatus).toBe('applicable');
        expect(issue.localApplicabilityReasons).toContain(
          'merchant_declared_physical_presence'
        );
      }
    });
  });

  describe('getProjectSignals', () => {
    it('should return mapped signals from database', async () => {
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([
        {
          id: 'sig-1',
          projectId: 'proj-1',
          signalType: 'LOCATION_PRESENCE',
          label: 'Store Address',
          description: '123 Main St, Denver, CO',
          url: 'https://example.com/contact',
          evidence: 'Address clearly displayed',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
        },
      ]);

      const signals = await service.getProjectSignals('proj-1');

      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe('sig-1');
      expect(signals[0].signalType).toBe('location_presence');
      expect(signals[0].label).toBe('Store Address');
      expect(signals[0].description).toBe('123 Main St, Denver, CO');
      expect(signals[0].url).toBe('https://example.com/contact');
      expect(signals[0].evidence).toBe('Address clearly displayed');
    });

    it('should return empty array when no signals exist', async () => {
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);

      const signals = await service.getProjectSignals('proj-1');

      expect(signals).toHaveLength(0);
    });
  });

  describe('addSignal', () => {
    it('should create a new signal with correct type mapping', async () => {
      const mockCreated = {
        id: 'sig-new',
        projectId: 'proj-1',
        signalType: 'LOCAL_INTENT_COVERAGE',
        label: 'Near Me Coverage',
        description: 'Targeting near me queries',
        url: 'https://example.com/local',
        evidence: 'Near me content detected',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.projectLocalSignal.create.mockResolvedValue(mockCreated);
      prismaMock.projectLocalCoverage.deleteMany.mockResolvedValue({
        count: 0,
      });

      const signal = await service.addSignal({
        projectId: 'proj-1',
        signalType: 'local_intent_coverage',
        label: 'Near Me Coverage',
        description: 'Targeting near me queries',
        url: 'https://example.com/local',
        evidence: 'Near me content detected',
      });

      expect(signal.signalType).toBe('local_intent_coverage');
      expect(signal.label).toBe('Near Me Coverage');
      expect(prismaMock.projectLocalSignal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          signalType: 'LOCAL_INTENT_COVERAGE',
          projectId: 'proj-1',
        }),
      });
    });

    it('should invalidate coverage cache after adding signal', async () => {
      prismaMock.projectLocalSignal.create.mockResolvedValue({
        id: 'sig-new',
        projectId: 'proj-1',
        signalType: 'LOCATION_PRESENCE',
        label: 'test',
        description: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.projectLocalCoverage.deleteMany.mockResolvedValue({
        count: 1,
      });

      await service.addSignal({
        projectId: 'proj-1',
        signalType: 'location_presence',
        label: 'test',
        description: 'test',
      });

      expect(prismaMock.projectLocalCoverage.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
    });
  });

  describe('updateProjectLocalConfig', () => {
    it('should update config and invalidate coverage', async () => {
      prismaMock.projectLocalConfig.upsert.mockResolvedValue({
        projectId: 'proj-1',
        hasPhysicalLocation: true,
        serviceAreaDescription: 'Denver metro area',
        enabled: true,
      });
      prismaMock.projectLocalCoverage.deleteMany.mockResolvedValue({
        count: 1,
      });

      const config = await service.updateProjectLocalConfig('proj-1', {
        hasPhysicalLocation: true,
        serviceAreaDescription: 'Denver metro area',
        enabled: true,
      });

      expect(config.hasPhysicalLocation).toBe(true);
      expect(config.serviceAreaDescription).toBe('Denver metro area');
      expect(config.enabled).toBe(true);

      expect(prismaMock.projectLocalCoverage.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
    });
  });

  describe('invalidateCoverage', () => {
    it('should delete all coverage records for project', async () => {
      prismaMock.projectLocalCoverage.deleteMany.mockResolvedValue({
        count: 1,
      });

      await service.invalidateCoverage('proj-1');

      expect(prismaMock.projectLocalCoverage.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
    });
  });

  describe('getProjectScorecard (cached)', () => {
    it('should return cached scorecard if present', async () => {
      const cachedCoverage = {
        id: 'cov-1',
        projectId: 'proj-1',
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasons: ['merchant_declared_physical_presence'],
        score: 75,
        status: 'STRONG',
        signalCounts: {
          location_presence: 2,
          local_intent_coverage: 1,
          local_trust_signals: 1,
          local_schema_readiness: 1,
        },
        missingLocalSignalsCount: 0,
        computedAt: new Date('2025-01-15'),
      };

      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(
        cachedCoverage
      );

      const result = await service.getProjectScorecard('proj-1');

      expect(result.score).toBe(75);
      expect(result.status).toBe('strong');
      expect(result.applicabilityStatus).toBe('applicable');
      expect(prismaMock.projectLocalSignal.findMany).not.toHaveBeenCalled();
    });

    it('should compute scorecard if no cache exists', async () => {
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        hasPhysicalLocation: true,
        enabled: true,
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalCoverage.upsert.mockResolvedValue({});

      const result = await service.getProjectScorecard('proj-1');

      expect(result.score).toBe(0);
      expect(prismaMock.projectLocalSignal.findMany).toHaveBeenCalled();
    });
  });

  describe('getProjectLocalData', () => {
    it('should return complete local data for project', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        userId: 'user-1',
      });
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue({
        id: 'cov-1',
        projectId: 'proj-1',
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasons: ['merchant_declared_physical_presence'],
        score: 50,
        status: 'NEEDS_IMPROVEMENT',
        signalCounts: {
          location_presence: 1,
          local_intent_coverage: 0,
          local_trust_signals: 0,
          local_schema_readiness: 0,
        },
        missingLocalSignalsCount: 1,
        computedAt: new Date(),
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([
        {
          id: 'sig-1',
          projectId: 'proj-1',
          signalType: 'LOCATION_PRESENCE',
          label: 'Store Address',
          description: 'Main store location',
          url: null,
          evidence: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.projectLocalFixDraft.findMany.mockResolvedValue([]);

      const result = await service.getProjectLocalData('proj-1', 'user-1');

      expect(result.projectId).toBe('proj-1');
      expect(result.scorecard).toBeDefined();
      expect(result.signals).toHaveLength(1);
      expect(result.gaps).toBeDefined();
      expect(result.openDrafts).toHaveLength(0);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        service.getProjectLocalData('proj-1', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks access', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        userId: 'other-user',
      });
      roleResolutionMock.assertProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied')
      );

      await expect(
        service.getProjectLocalData('proj-1', 'user-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should include open drafts that have not expired', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        userId: 'user-1',
      });
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue({
        id: 'cov-1',
        projectId: 'proj-1',
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasons: ['merchant_declared_physical_presence'],
        score: 50,
        status: 'NEEDS_IMPROVEMENT',
        signalCounts: {
          location_presence: 0,
          local_intent_coverage: 0,
          local_trust_signals: 0,
          local_schema_readiness: 0,
        },
        missingLocalSignalsCount: 2,
        computedAt: new Date(),
      });
      prismaMock.projectLocalSignal.findMany.mockResolvedValue([]);
      prismaMock.projectLocalFixDraft.findMany.mockResolvedValue([
        {
          id: 'draft-1',
          projectId: 'proj-1',
          productId: null,
          gapType: 'MISSING_LOCATION_CONTENT',
          signalType: 'LOCATION_PRESENCE',
          focusKey: 'address',
          draftType: 'CITY_SECTION',
          draftPayload: { text: 'Draft content' },
          aiWorkKey: 'work-123',
          reusedFromWorkKey: null,
          generatedWithAi: true,
          createdAt: new Date(),
          expiresAt: null,
        },
      ]);

      const result = await service.getProjectLocalData('proj-1', 'user-1');

      expect(result.openDrafts).toHaveLength(1);
      expect(result.openDrafts[0].id).toBe('draft-1');
      expect(result.openDrafts[0].draftType).toBe('city_section');
    });
  });

  describe('getCachedProjectScorecard', () => {
    it('should return null when no cache exists', async () => {
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);

      const result = await service.getCachedProjectScorecard('proj-1');

      expect(result).toBeNull();
    });

    it('should return cached scorecard without computing', async () => {
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue({
        id: 'cov-1',
        projectId: 'proj-1',
        applicabilityStatus: 'NOT_APPLICABLE',
        applicabilityReasons: ['global_only_config'],
        score: null,
        status: null,
        signalCounts: {
          location_presence: 0,
          local_intent_coverage: 0,
          local_trust_signals: 0,
          local_schema_readiness: 0,
        },
        missingLocalSignalsCount: 0,
        computedAt: new Date(),
      });

      const result = await service.getCachedProjectScorecard('proj-1');

      expect(result).not.toBeNull();
      expect(result?.applicabilityStatus).toBe('not_applicable');
      expect(result?.score).toBeUndefined();
      expect(prismaMock.projectLocalSignal.findMany).not.toHaveBeenCalled();
    });
  });

  describe('buildLocalIssuesForProjectReadOnly', () => {
    it('should return empty array when no cached scorecard exists', async () => {
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue(null);

      const result = await service.buildLocalIssuesForProjectReadOnly('proj-1');

      expect(result).toEqual([]);
    });

    it('should return empty array for non-applicable projects', async () => {
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue({
        id: 'cov-1',
        projectId: 'proj-1',
        applicabilityStatus: 'NOT_APPLICABLE',
        applicabilityReasons: ['global_only_config'],
        score: null,
        status: null,
        signalCounts: {
          location_presence: 0,
          local_intent_coverage: 0,
          local_trust_signals: 0,
          local_schema_readiness: 0,
        },
        missingLocalSignalsCount: 0,
        computedAt: new Date(),
      });

      const result = await service.buildLocalIssuesForProjectReadOnly('proj-1');

      expect(result).toEqual([]);
    });

    it('should generate issues for applicable projects with gaps', async () => {
      prismaMock.projectLocalCoverage.findFirst.mockResolvedValue({
        id: 'cov-1',
        projectId: 'proj-1',
        applicabilityStatus: 'APPLICABLE',
        applicabilityReasons: ['merchant_declared_physical_presence'],
        score: 0,
        status: 'WEAK',
        signalCounts: {
          location_presence: 0,
          local_intent_coverage: 0,
          local_trust_signals: 0,
          local_schema_readiness: 0,
        },
        missingLocalSignalsCount: 2,
        computedAt: new Date(),
      });

      const result = await service.buildLocalIssuesForProjectReadOnly('proj-1');

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((i) => i.pillarId === 'local_discovery')).toBe(true);
      expect(result.every((i) => i.actionability === 'manual')).toBe(true);
    });
  });

  describe('getProjectLocalConfig', () => {
    it('should return null when no config exists', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue(null);

      const result = await service.getProjectLocalConfig('proj-1');

      expect(result).toBeNull();
    });

    it('should return config with serviceAreaDescription', async () => {
      prismaMock.projectLocalConfig.findUnique.mockResolvedValue({
        projectId: 'proj-1',
        hasPhysicalLocation: true,
        serviceAreaDescription: 'Denver metro area',
        enabled: true,
      });

      const result = await service.getProjectLocalConfig('proj-1');

      expect(result).not.toBeNull();
      expect(result?.hasPhysicalLocation).toBe(true);
      expect(result?.serviceAreaDescription).toBe('Denver metro area');
      expect(result?.enabled).toBe(true);
    });
  });
});
