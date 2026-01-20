/**
 * LOCAL-1-TESTS: Integration tests for Local Discovery pillar
 *
 * Tests:
 * - Config persistence and applicability determination
 * - Signal management (create, retrieve)
 * - Coverage/scorecard computation persists to database
 * - Gap generation from real coverage data
 * - Issue building integrates with DEO issues
 * - Non-applicable projects receive no penalty
 * - Fix draft lifecycle (create, retrieve)
 *
 * NOTE: These tests require a test database to be configured.
 * They exercise the service layer directly without mocking Prisma.
 */
import { LocalDiscoveryService } from '../../../src/projects/local-discovery.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import type { LocalSignalType } from '@engineo/shared';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('LocalDiscoveryService (integration)', () => {
  let service: LocalDiscoveryService;
  let testUser: { id: string };
  let testProject: { id: string; name: string; domain: string };

  beforeAll(async () => {
    service = new LocalDiscoveryService(testPrisma as any);
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
        email: `local-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: 'Local Test User',
      },
    });

    testProject = await testPrisma.project.create({
      data: {
        name: 'Local Test Project',
        domain: 'local-test.example.com',
        userId: testUser.id,
      },
    });
  });

  describe('Local Configuration Management', () => {
    it('should return null config for new project', async () => {
      const config = await service.getProjectLocalConfig(testProject.id);

      expect(config).toBeNull();
    });

    it('should create and retrieve local config', async () => {
      const updated = await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        serviceAreaDescription: 'Denver metro area',
        enabled: true,
      });

      expect(updated.hasPhysicalLocation).toBe(true);
      expect(updated.serviceAreaDescription).toBe('Denver metro area');
      expect(updated.enabled).toBe(true);

      // Retrieve
      const config = await service.getProjectLocalConfig(testProject.id);

      expect(config?.hasPhysicalLocation).toBe(true);
      expect(config?.serviceAreaDescription).toBe('Denver metro area');
      expect(config?.enabled).toBe(true);
    });

    it('should update existing config', async () => {
      // Create initial config
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: false,
      });

      // Update config
      const updated = await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        serviceAreaDescription: 'Boulder and Denver',
        enabled: true,
      });

      expect(updated.serviceAreaDescription).toBe('Boulder and Denver');
      expect(updated.enabled).toBe(true);
    });
  });

  describe('Applicability Determination', () => {
    it('should return "unknown" for project with no config', async () => {
      const result = await service.determineApplicability(testProject.id);

      expect(result.status).toBe('unknown');
      expect(result.reasons).toContain('no_local_indicators');
    });

    it('should return "applicable" when hasPhysicalLocation is true', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: false,
      });

      const result = await service.determineApplicability(testProject.id);

      expect(result.status).toBe('applicable');
      expect(result.reasons).toContain('merchant_declared_physical_presence');
    });

    it('should return "applicable" when manual override enabled', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: false,
        enabled: true,
      });

      const result = await service.determineApplicability(testProject.id);

      expect(result.status).toBe('applicable');
      expect(result.reasons).toContain('manual_override_enabled');
    });

    it('should return "not_applicable" for global-only config', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: false,
        enabled: false,
      });

      const result = await service.determineApplicability(testProject.id);

      expect(result.status).toBe('not_applicable');
      expect(result.reasons).toContain('global_only_config');
    });
  });

  describe('Signal Management', () => {
    it('should create and retrieve signals', async () => {
      // Add a location presence signal
      const signal = await service.addSignal({
        projectId: testProject.id,
        signalType: 'location_presence',
        label: 'Store Address',
        description: '123 Main St, Denver, CO 80202',
        url: 'https://example.com/contact',
        evidence: 'Physical address displayed on contact page',
      });

      expect(signal.id).toBeDefined();
      expect(signal.signalType).toBe('location_presence');
      expect(signal.label).toBe('Store Address');

      // Retrieve signals
      const signals = await service.getProjectSignals(testProject.id);

      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe(signal.id);
    });

    it('should handle multiple signals of different types', async () => {
      // Add signals of each type
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'location_presence',
        label: 'Store Address',
        description: 'Physical location',
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'local_intent_coverage',
        label: 'Near Me Content',
        description: 'Targeting local searches',
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'local_trust_signals',
        label: 'Local Reviews',
        description: 'Community reviews',
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'local_schema_readiness',
        label: 'LocalBusiness Schema',
        description: 'Structured data present',
      });

      const signals = await service.getProjectSignals(testProject.id);

      expect(signals).toHaveLength(4);

      const signalTypes = signals.map((s) => s.signalType);
      expect(signalTypes).toContain('location_presence');
      expect(signalTypes).toContain('local_intent_coverage');
      expect(signalTypes).toContain('local_trust_signals');
      expect(signalTypes).toContain('local_schema_readiness');
    });
  });

  describe('Coverage/Scorecard Computation', () => {
    it('should compute and persist scorecard for applicable project with no signals', async () => {
      // Make project applicable
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      const scorecard = await service.computeProjectScorecard(testProject.id);

      expect(scorecard.projectId).toBe(testProject.id);
      expect(scorecard.applicabilityStatus).toBe('applicable');
      expect(scorecard.score).toBe(0);
      expect(scorecard.status).toBe('weak');
      expect(scorecard.missingLocalSignalsCount).toBe(2); // location_presence and local_intent_coverage

      // Verify persisted
      const dbCoverage = await testPrisma.projectLocalCoverage.findFirst({
        where: { projectId: testProject.id },
      });

      expect(dbCoverage).not.toBeNull();
      expect(dbCoverage?.score).toBe(0);
    });

    it('should return scorecard without score for non-applicable projects (no penalty)', async () => {
      // Make project non-applicable
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: false,
        enabled: false,
      });

      const scorecard = await service.computeProjectScorecard(testProject.id);

      expect(scorecard.applicabilityStatus).toBe('not_applicable');
      expect(scorecard.score).toBeUndefined();
      expect(scorecard.status).toBeUndefined();
      expect(scorecard.missingLocalSignalsCount).toBe(0); // No penalty
    });

    it('should compute correct score with single high-value signal', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'location_presence',
        label: 'Store Address',
        description: 'Physical location',
      });

      const scorecard = await service.computeProjectScorecard(testProject.id);

      // Location presence weight is 10/32 = ~31%
      expect(scorecard.score).toBe(31);
      expect(scorecard.status).toBe('weak');
      expect(scorecard.signalCounts.location_presence).toBe(1);
      expect(scorecard.missingLocalSignalsCount).toBe(1); // Still missing local_intent_coverage
    });

    it('should reach "strong" status with all signal types', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      const signalTypes: LocalSignalType[] = [
        'location_presence',
        'local_intent_coverage',
        'local_trust_signals',
        'local_schema_readiness',
      ];

      for (const type of signalTypes) {
        await service.addSignal({
          projectId: testProject.id,
          signalType: type,
          label: `${type} signal`,
          description: 'Present',
        });
      }

      const scorecard = await service.computeProjectScorecard(testProject.id);

      expect(scorecard.score).toBe(100);
      expect(scorecard.status).toBe('strong');
      expect(scorecard.missingLocalSignalsCount).toBe(0);
    });

    it('should apply diminishing returns for multiple signals of same type', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      // Add 3 location presence signals
      for (let i = 0; i < 3; i++) {
        await service.addSignal({
          projectId: testProject.id,
          signalType: 'location_presence',
          label: `Location ${i + 1}`,
          description: 'Physical location',
        });
      }

      const scorecard = await service.computeProjectScorecard(testProject.id);

      // Base 10 + bonus: min(3-1, 2) * 0.25 * 10 = 5
      // Total: 15/32 = ~47%
      expect(scorecard.score).toBe(47);
      expect(scorecard.signalCounts.location_presence).toBe(3);
    });
  });

  describe('Gap Analysis', () => {
    it('should generate gaps for missing signal types (applicable project)', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      // Add only local_intent_coverage
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'local_intent_coverage',
        label: 'Near Me Content',
        description: 'Present',
      });

      const scorecard = await service.computeProjectScorecard(testProject.id);
      const gaps = service.generateGaps(scorecard);

      // Should have gaps for: location_presence, local_trust_signals, local_schema_readiness
      expect(gaps.length).toBe(3);

      const gapTypes = gaps.map((g) => g.gapType);
      expect(gapTypes).toContain('missing_location_content');
      expect(gapTypes).toContain('missing_local_trust_signal');
      expect(gapTypes).toContain('unclear_service_area');
    });

    it('should return no gaps for non-applicable projects (no penalty)', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: false,
        enabled: false,
      });

      const scorecard = await service.computeProjectScorecard(testProject.id);
      const gaps = service.generateGaps(scorecard);

      expect(gaps).toHaveLength(0);
    });

    it('should return no gaps when all signals present', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      const signalTypes: LocalSignalType[] = [
        'location_presence',
        'local_intent_coverage',
        'local_trust_signals',
        'local_schema_readiness',
      ];

      for (const type of signalTypes) {
        await service.addSignal({
          projectId: testProject.id,
          signalType: type,
          label: `${type} source`,
          description: 'Present',
        });
      }

      const scorecard = await service.computeProjectScorecard(testProject.id);
      const gaps = service.generateGaps(scorecard);

      expect(gaps).toHaveLength(0);
    });
  });

  describe('DEO Issue Integration', () => {
    it('should build DEO issues from coverage gaps for applicable projects', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      const issues = await service.buildLocalIssuesForProject(testProject.id);

      expect(issues.length).toBeGreaterThan(0);

      // Verify all issues have correct pillarId
      for (const issue of issues) {
        expect(issue.pillarId).toBe('local_discovery');
        expect(issue.localSignalType).toBeDefined();
        expect(issue.localGapType).toBeDefined();
        expect(issue.recommendedAction).toBeDefined();
        expect(issue.whyItMatters).toBeDefined();
        expect(issue.localApplicabilityStatus).toBe('applicable');
      }
    });

    it('should return no issues for non-applicable projects (no penalty)', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: false,
        enabled: false,
      });

      const issues = await service.buildLocalIssuesForProject(testProject.id);

      expect(issues).toHaveLength(0);
    });

    it('should return no issues when all signals present', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      const signalTypes: LocalSignalType[] = [
        'location_presence',
        'local_intent_coverage',
        'local_trust_signals',
        'local_schema_readiness',
      ];

      for (const type of signalTypes) {
        await service.addSignal({
          projectId: testProject.id,
          signalType: type,
          label: `${type} source`,
          description: 'Present',
        });
      }

      const issues = await service.buildLocalIssuesForProject(testProject.id);

      expect(issues).toHaveLength(0);
    });

    it('should include critical severity for high-priority gaps', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      // Add only lower priority signals
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'local_trust_signals',
        label: 'Reviews',
        description: 'Present',
      });

      await service.addSignal({
        projectId: testProject.id,
        signalType: 'local_schema_readiness',
        label: 'Schema',
        description: 'Present',
      });

      const issues = await service.buildLocalIssuesForProject(testProject.id);

      // Should have critical issues for missing location_presence and local_intent_coverage
      const criticalIssues = issues.filter((i) => i.severity === 'critical');
      expect(criticalIssues.length).toBeGreaterThanOrEqual(2);

      const criticalTypes = criticalIssues.map((i) => i.localSignalType);
      expect(criticalTypes).toContain('location_presence');
      expect(criticalTypes).toContain('local_intent_coverage');
    });
  });

  describe('Coverage Cache', () => {
    it('should return cached scorecard on subsequent calls', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      // First call computes and caches
      await service.computeProjectScorecard(testProject.id);

      // Add a signal (but don't call computeProjectScorecard)
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'location_presence',
        label: 'Store Address',
        description: 'Present',
      });

      // Note: addSignal invalidates cache, so getProjectScorecard will recompute
      // This tests that cache invalidation works correctly
      const scorecard = await service.getProjectScorecard(testProject.id);
      expect(scorecard.score).toBe(31); // Should reflect new signal
    });

    it('should recompute after explicit cache invalidation', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      // First compute
      const initial = await service.computeProjectScorecard(testProject.id);
      expect(initial.score).toBe(0);

      // Manually add signal directly to DB (bypassing service)
      await testPrisma.projectLocalSignal.create({
        data: {
          projectId: testProject.id,
          signalType: 'LOCATION_PRESENCE',
          label: 'Test',
          description: 'Test',
        },
      });

      // Without invalidation, cache should still be used
      // But we need to call invalidate first
      await service.invalidateCoverage(testProject.id);

      // Should recompute with new signal
      const scorecard = await service.getProjectScorecard(testProject.id);
      expect(scorecard.score).toBe(31); // Now includes location_presence
    });
  });

  describe('Full Project Data', () => {
    it('should return complete local discovery data response', async () => {
      await service.updateProjectLocalConfig(testProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      // Add a signal
      await service.addSignal({
        projectId: testProject.id,
        signalType: 'location_presence',
        label: 'Store Address',
        description: 'Present',
      });

      const data = await service.getProjectLocalData(
        testProject.id,
        testUser.id
      );

      expect(data.projectId).toBe(testProject.id);
      expect(data.signals).toHaveLength(1);
      expect(data.scorecard).toBeDefined();
      expect(data.scorecard.score).toBeGreaterThan(0);
      expect(data.gaps).toBeDefined();
      expect(Array.isArray(data.openDrafts)).toBe(true);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        service.getProjectLocalData('non-existent-id', testUser.id)
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
        service.getProjectLocalData(testProject.id, otherUser.id)
      ).rejects.toThrow('You do not have access to this project');
    });
  });

  describe('Local vs Global Project Comparison', () => {
    it('should demonstrate no penalty principle: global stores have zero issues', async () => {
      // Create a global-only project
      const globalProject = await testPrisma.project.create({
        data: {
          name: 'Global Store',
          domain: 'global-store.example.com',
          userId: testUser.id,
        },
      });

      // Configure as global-only
      await service.updateProjectLocalConfig(globalProject.id, {
        hasPhysicalLocation: false,
        enabled: false,
      });

      // Get issues for global store
      const globalIssues = await service.buildLocalIssuesForProject(
        globalProject.id
      );
      expect(globalIssues).toHaveLength(0); // No penalty for global stores

      // Create a local project with same lack of signals
      const localProject = await testPrisma.project.create({
        data: {
          name: 'Local Store',
          domain: 'local-store.example.com',
          userId: testUser.id,
        },
      });

      // Configure as local
      await service.updateProjectLocalConfig(localProject.id, {
        hasPhysicalLocation: true,
        enabled: true,
      });

      // Get issues for local store
      const localIssues = await service.buildLocalIssuesForProject(
        localProject.id
      );
      expect(localIssues.length).toBeGreaterThan(0); // Issues for missing signals

      // Verify scorecards reflect this difference
      const globalScorecard = await service.getProjectScorecard(
        globalProject.id
      );
      expect(globalScorecard.applicabilityStatus).toBe('not_applicable');
      expect(globalScorecard.score).toBeUndefined();
      expect(globalScorecard.missingLocalSignalsCount).toBe(0);

      const localScorecard = await service.getProjectScorecard(localProject.id);
      expect(localScorecard.applicabilityStatus).toBe('applicable');
      expect(localScorecard.score).toBe(0);
      expect(localScorecard.missingLocalSignalsCount).toBeGreaterThan(0);
    });
  });
});
